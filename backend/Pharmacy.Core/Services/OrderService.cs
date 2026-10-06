using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class OrderService(
    PharmacyDbContext db,
    CartService carts,
    PrescriptionQuota quota,
    InventoryReader inventory,
    InventoryService transactions,
    IdGenerator ids,
    IBusinessClock clock)
{
    public Task<OrderView> Place(string userId, PlaceOrderInput input, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            ValidateInput(input);
            var cart = await carts.Get(userId, ct);
            if (cart.Items.Count == 0)
            {
                throw new BusinessException("VALIDATION_FAILED", "Giỏ hàng đang trống.", "items");
            }
            if (cart.Subtotal != input.ExpectedTotal)
            {
                throw new BusinessException("PRICE_CHANGED", "Giá đã thay đổi. Vui lòng xác nhận tổng mới.", data: cart);
            }
            ValidateCart(cart);
            Prescription? prescription = null;
            if (input.SaleKind == SaleKind.OTC)
            {
                if (cart.Items.Any(x => x.RequiresPrescription || x.IsControlled))
                {
                    throw new BusinessException("PRESCRIPTION_REQUIRED", "Các thuốc này cần đơn thuốc.");
                }
            }
            else
            {
                prescription = await db.Prescriptions.AsNoTracking().Include(x => x.Items)
                    .SingleOrDefaultAsync(x => x.PrescriptionId == input.PrescriptionId && x.OwnerUserId == userId, ct);
                if (prescription is null || prescription.Status is not (PrescriptionStatus.PendingReview or PrescriptionStatus.Approved))
                {
                    throw PrescriptionQuota.Invalid();
                }
                if (prescription.Status == PrescriptionStatus.Approved)
                {
                    await quota.ValidateQuota(prescription, prescription.PatientId,
                        cart.Items.Select(x => new StockLine(x.DrugId, x.Quantity)).ToList(), ct: ct);
                }
            }
            var order = new Order(await ids.NextAsync("DH", ct), userId, clock.Now, input.SaleKind!.Value,
                input.ReceiverName!, input.Phone!, input.ReceiveMethod!.Value, input.Address,
                prescription?.PrescriptionId, prescription?.PatientId,
                prescription?.Status == PrescriptionStatus.PendingReview);
            foreach (var line in cart.Items)
            {
                order.AddItem(new(ids.Item(), order.OrderId, line.DrugId, line.Name,
                    line.SaleUnit, line.Quantity, line.UnitPrice));
            }
            db.Orders.Add(order);
            var placedIds = cart.Items.Select(x => x.DrugId).ToList();
            var placedItems = await db.CartItems.Where(x => x.UserId == userId && placedIds.Contains(x.DrugId)).ToListAsync(ct);
            db.CartItems.RemoveRange(placedItems);
            await db.SaveChangesAsync(ct);
            return await ToView(order, false, ct);
        }, ct);

    public async Task<Paged<OrderRow>> Query(
        string? ownerId, string? status, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var filter = ParseStatus(status);
        var query = db.Orders.AsNoTracking().AsQueryable();
        if (ownerId is not null)
        {
            query = query.Where(x => x.UserId == ownerId);
        }
        if (filter is not null)
        {
            query = query.Where(x => x.Status == filter);
        }
        var orders = await query.ToListAsync(ct);
        var users = await db.UserAccounts.AsNoTracking().ToDictionaryAsync(x => x.UserId, x => x.Username, ct);
        var payments = await db.Payments.AsNoTracking().ToDictionaryAsync(x => x.OrderId, ct);
        var term = search?.Trim();
        var matches = orders.Where(x => string.IsNullOrEmpty(term)
            || x.OrderId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || users[x.UserId].Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.ReceiverName.Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.Phone.Contains(term, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.OrderId, StringComparer.Ordinal).ToList();
        var items = matches.Skip((page - 1) * pageSize).Take(pageSize).Select(x => new OrderRow(
            x.OrderId, x.CreatedAt, x.SaleKind, x.Status, x.TotalAmount, x.ReceiveMethod,
            payments.GetValueOrDefault(x.OrderId)?.Status, ownerId is null ? users[x.UserId] : null,
            x.HandledByUserId is null ? null : users[x.HandledByUserId])).ToList();
        return new(items, page, pageSize, matches.Count);
    }

    public async Task<OrderView> Get(string orderId, string? ownerId, CancellationToken ct = default)
        => await ToView(await Find(orderId, ownerId, ct), ownerId is null, ct);

    public Task<OrderView> Cancel(string orderId, string? ownerId, string? staffId, string? reason, bool reject = false, CancellationToken ct = default)
        => transactions.Execute(async session =>
        {
            var order = await Find(orderId, ownerId, ct);
            var payment = await db.Payments.SingleOrDefaultAsync(x => x.OrderId == orderId, ct);
            if (staffId is not null && string.IsNullOrWhiteSpace(reason))
            {
                throw new BusinessException("VALIDATION_FAILED", "Lý do là bắt buộc.", "reason");
            }
            if (reject)
            {
                order.Reject(reason!, payment?.Status == PaymentStatus.Confirmed);
            }
            else
            {
                order.Cancel(payment?.Status == PaymentStatus.Confirmed, reason?.Trim());
            }
            if (staffId is not null)
            {
                order.Claim(staffId);
            }
            await session.Release(orderId, ct);
            if (payment?.Status == PaymentStatus.PendingReview)
            {
                payment.Close();
            }
            await db.SaveChangesAsync(ct);
            return await ToView(order, ownerId is null, ct);
        }, ct);

    public Task<OrderView> StaffAction(string orderId, string staffId, string action, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            var order = await Find(orderId, null, ct);
            if (action == "fulfill")
            {
                throw new BusinessException("INVALID_STATE", "Chức năng xuất hóa đơn chưa được triển khai.");
            }
            if (action == "claim")
            {
                Guard.State(order.Status is OrderStatus.WaitingReview or OrderStatus.AwaitingPayment or OrderStatus.Preparing or OrderStatus.Delivering);
            }
            else
            {
                var paid = await db.Payments.AnyAsync(x => x.OrderId == orderId && x.Status == PaymentStatus.Confirmed, ct);
                var issued = await db.Invoices.AnyAsync(x => x.Sale.OrderId == orderId && x.Sale.Status == SaleStatus.Completed, ct);
                Guard.State(paid && issued);
                if (action == "ship")
                {
                    order.MarkDelivering(issued);
                }
                else if (action == "complete")
                {
                    Guard.State(order.ReceiveMethod == ReceiveMethod.Delivery
                        ? order.Status == OrderStatus.Delivering : order.Status == OrderStatus.Preparing);
                    order.MarkDelivered(issued);
                }
                else
                {
                    throw new ArgumentException("Unknown order action", nameof(action));
                }
            }
            order.Claim(staffId);
            await db.SaveChangesAsync(ct);
            return await ToView(order, true, ct);
        }, ct);

    public async Task RecheckWaiting(Prescription prescription, CancellationToken ct)
    {
        var orders = await db.Orders.Include(x => x.Items)
            .Where(x => x.PrescriptionId == prescription.PrescriptionId && x.Status == OrderStatus.WaitingReview).ToListAsync(ct);
        var stock = await inventory.Snapshot(ct);
        foreach (var order in orders)
        {
            try
            {
                if (prescription.OwnerUserId != order.UserId)
                {
                    throw PrescriptionQuota.Invalid();
                }
                await quota.ValidateQuota(prescription, order.PatientId!,
                    order.Items.Select(x => new StockLine(x.DrugId, x.Quantity)).ToList(), order.OrderId, ct);
                foreach (var item in order.Items)
                {
                    var entry = stock.Single(x => x.Drug.DrugId == item.DrugId);
                    if (!entry.Drug.IsForSale)
                    {
                        throw new BusinessException("NOT_FOR_SALE", "Thuốc đã tắt bán.");
                    }
                    if (entry.Inventory.AvailableQuantity < item.Quantity)
                    {
                        throw new BusinessException("INSUFFICIENT_STOCK", "Không đủ tồn khả dụng.");
                    }
                }
                order.AwaitPayment();
                order.SetNote("");
            }
            catch (BusinessException e) when (e.Code is "PRESCRIPTION_INVALID" or "NOT_FOR_SALE" or "INSUFFICIENT_STOCK")
            {
                order.SetNote(e.Message);
            }
        }
    }

    public async Task RejectWaiting(string prescriptionId, string reason, string reviewer, CancellationToken ct)
    {
        var orders = await db.Orders.Where(x => x.PrescriptionId == prescriptionId && x.Status == OrderStatus.WaitingReview).ToListAsync(ct);
        foreach (var order in orders)
        {
            order.Reject(reason);
            order.Claim(reviewer);
        }
    }

    private async Task<Order> Find(string id, string? ownerId, CancellationToken ct)
        => await db.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.OrderId == id
            && (ownerId == null || x.UserId == ownerId), ct) ?? throw InputValidation.NotFound();

    private async Task<OrderView> ToView(Order order, bool staff, CancellationToken ct)
    {
        var payment = await db.Payments.AsNoTracking().SingleOrDefaultAsync(x => x.OrderId == order.OrderId, ct);
        var invoiceId = await db.Invoices.Where(x => x.Sale.OrderId == order.OrderId).Select(x => x.InvoiceId).SingleOrDefaultAsync(ct);
        var users = await db.UserAccounts.AsNoTracking().ToDictionaryAsync(x => x.UserId, x => x.Username, ct);
        var canCancel = order.Status is OrderStatus.WaitingReview or OrderStatus.AwaitingPayment
            && payment?.Status != PaymentStatus.Confirmed;
        var canPay = order.Status == OrderStatus.AwaitingPayment
            && payment?.Status is not (PaymentStatus.Confirmed or PaymentStatus.Closed);
        return new(order.OrderId, order.CreatedAt, order.SaleKind, order.Status, order.ReceiverName,
            order.Phone, order.ReceiveMethod, order.Address, order.PrescriptionId, order.PatientId,
            order.TotalAmount, order.Note, order.Items.Select(x => new OrderItemView(
                x.DrugId, x.DrugName, x.Unit, x.Quantity, x.UnitPrice, x.LineTotal)).ToList(),
            payment is null ? null : new(payment.PaymentId, payment.Status, payment.ExpectedAmount,
                payment.ReceivedAmount, payment.ReviewNote, payment.ApprovedAt), invoiceId,
            order.HandledByUserId is null ? null : users[order.HandledByUserId], canCancel, canPay,
            staff ? users[order.UserId] : null);
    }

    private static OrderStatus? ParseStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }
        if (!Enum.TryParse<OrderStatus>(value, false, out var status) || !Enum.IsDefined(status))
        {
            throw new BusinessException("VALIDATION_FAILED", "Trạng thái không hợp lệ.", "status");
        }
        return status;
    }

    private static void ValidateCart(CartView cart)
    {
        if (cart.Items.Any(x => x.Issue == "NOT_FOR_SALE"))
        {
            throw new BusinessException("NOT_FOR_SALE", "Giỏ có thuốc đã tắt bán.");
        }
        var shortages = cart.Items.Where(x => x.Issue == "INSUFFICIENT_STOCK")
            .Select(x => new StockShortage(x.DrugId, x.Quantity, x.AvailableQuantity)).ToList();
        if (shortages.Count > 0)
        {
            throw new BusinessException("INSUFFICIENT_STOCK", "Không đủ tồn khả dụng.", data: shortages);
        }
    }

    private static void ValidateInput(PlaceOrderInput input)
    {
        var errors = new Dictionary<string, string[]>();
        if (input.SaleKind is null || !Enum.IsDefined(input.SaleKind.Value))
        {
            errors["saleKind"] = ["Loại đơn là bắt buộc."];
        }
        if (input.ReceiveMethod is null || !Enum.IsDefined(input.ReceiveMethod.Value))
        {
            errors["receiveMethod"] = ["Hình thức nhận là bắt buộc."];
        }
        if (string.IsNullOrWhiteSpace(input.ReceiverName))
        {
            errors["receiverName"] = ["Tên người nhận là bắt buộc."];
        }
        if (string.IsNullOrWhiteSpace(input.Phone))
        {
            errors["phone"] = ["Số điện thoại là bắt buộc."];
        }
        if (input.ReceiveMethod == ReceiveMethod.Delivery && string.IsNullOrWhiteSpace(input.Address))
        {
            errors["address"] = ["Địa chỉ giao hàng là bắt buộc."];
        }
        if (input.ExpectedTotal is null or < 0 || decimal.Truncate(input.ExpectedTotal.Value) != input.ExpectedTotal)
        {
            errors["expectedTotal"] = ["Tổng tiền phải là số nguyên VND không âm."];
        }
        if (input.SaleKind == SaleKind.Prescription && string.IsNullOrWhiteSpace(input.PrescriptionId))
        {
            errors["prescriptionId"] = ["Mã đơn thuốc là bắt buộc."];
        }
        InputValidation.ThrowIfAny(errors);
    }
}
