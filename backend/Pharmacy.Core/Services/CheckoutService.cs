using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class CheckoutService(
    PharmacyDbContext db,
    InventoryService inventory,
    SaleEvaluation evaluation,
    IdGenerator ids,
    IBusinessClock clock)
{
    public Task<CheckoutResult> Checkout(Sale sale, string actorId, bool cashReceived, CancellationToken ct = default)
        => inventory.Execute(async session =>
        {
            // Reload the saved draft and its lines under the lock, including edits from another scope.
            db.ChangeTracker.Clear();
            var stored = await db.Sales.Include(x => x.Items).ThenInclude(x => x.Allocations)
                .SingleOrDefaultAsync(x => x.SaleId == sale.SaleId && x.CreatedByUserId == actorId && x.Channel == SaleChannel.Counter, ct)
                ?? throw InputValidation.NotFound();
            await db.Entry(stored).ReloadAsync(ct);
            Guard.State(stored.Status == SaleStatus.Draft);
            if (!cashReceived)
            {
                throw new BusinessException("VALIDATION_FAILED", "Cần xác nhận đã nhận tiền mặt.", "cashReceived");
            }
            return await CheckoutWithin(stored, session, ct);
        }, ct);

    public async Task<CheckoutResult> Fulfill(string orderId, string actorId, CancellationToken ct = default)
    {
        try
        {
            return await inventory.Execute(async session =>
            {
                var order = await db.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.OrderId == orderId, ct)
                    ?? throw InputValidation.NotFound();
                await db.Entry(order).ReloadAsync(ct);
                Guard.State(order.Status == OrderStatus.Preparing);
                Guard.State(await db.Payments.AnyAsync(x => x.OrderId == orderId && x.Status == PaymentStatus.Confirmed, ct));
                Guard.State(!await db.Invoices.AnyAsync(x => x.Sale.OrderId == orderId, ct));
                var sale = CreateSale(await ids.NextAsync("BH", ct), actorId, clock.Now, order.SaleKind,
                    order.PrescriptionId, order.PatientId, SaleChannel.Online, order.UserId, orderId);
                sale.ReplaceItems(order.Items.Select(x => new SaleItem(ids.Item(), sale.SaleId,
                    x.DrugId, x.DrugName, x.Unit, x.Quantity, x.UnitPrice)));
                db.Sales.Add(sale);
                order.Claim(actorId);
                return await CheckoutWithin(sale, session, ct);
            }, ct);
        }
        catch (BusinessException e) when (e.Code is "INSUFFICIENT_STOCK" or "PRESCRIPTION_INVALID" or "PRESCRIPTION_REQUIRED" or "NOT_FOR_SALE")
        {
            await inventory.Execute(async _ =>
            {
                var order = await db.Orders.SingleAsync(x => x.OrderId == orderId, ct);
                if (order.Status == OrderStatus.Preparing)
                {
                    order.SetNote(e.Message);
                }
                return true;
            }, ct);
            throw;
        }
    }

    private async Task<CheckoutResult> CheckoutWithin(Sale sale, InventoryTransaction session, CancellationToken ct)
    {
        var result = await evaluation.Evaluate(sale, ct);
        if (!result.Validation.IsValid)
        {
            throw new BusinessException(result.Validation.Code ?? "INVALID_STATE", string.Join(" ", result.Validation.Issues));
        }
        if (result.Shortages.Count > 0)
        {
            throw new BusinessException("INSUFFICIENT_STOCK", "Không đủ tồn khả dụng.", data: result.Shortages);
        }
        if (sale.Channel == SaleChannel.Counter)
        {
            foreach (var item in sale.Items)
            {
                item.SetPrice(result.Context.Drugs[item.DrugId].UnitPrice);
            }
        }
        var allocations = await session.Deduct(sale.Items.Select(x => new StockLine(x.DrugId, x.Quantity)).ToList(), sale.OrderId, ct);
        foreach (var item in sale.Items)
        {
            foreach (var allocation in allocations.Where(x => x.DrugId == item.DrugId))
            {
                item.AddAllocation(new(ids.Item(), item.SaleItemId, allocation.BatchId, allocation.Quantity));
            }
        }
        if (sale.Kind == SaleKind.Prescription)
        {
            var prescribed = await db.PrescriptionItems.Where(x => x.PrescriptionId == sale.PrescriptionId).ToListAsync(ct);
            foreach (var item in sale.Items)
            {
                var line = prescribed.Single(x => x.DrugId == item.DrugId);
                await db.Entry(line).ReloadAsync(ct);
                line.RecordDispense(item.Quantity);
            }
        }
        sale.Complete(clock.Now, sale.Channel == SaleChannel.Counter ? PaymentMethod.Cash : PaymentMethod.ManualQR);
        var invoice = new Invoice(await ids.NextAsync("HD", ct), sale, clock.Now);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(ct);
        return new(sale.SaleId, invoice.InvoiceId);
    }

    internal static Sale CreateSale(string id, string actor, DateTimeOffset now, SaleKind kind,
        string? prescriptionId, string? patientId, SaleChannel channel = SaleChannel.Counter, string? buyer = null, string? orderId = null)
        => kind switch
        {
            SaleKind.OTC => new OTCSale(id, actor, now, channel, buyer, orderId),
            SaleKind.Prescription => new PrescriptionSale(id, actor, now, prescriptionId!, patientId!, channel, buyer, orderId),
            _ => throw new BusinessException("VALIDATION_FAILED", "Loại bán không hợp lệ.", "kind")
        };
}
