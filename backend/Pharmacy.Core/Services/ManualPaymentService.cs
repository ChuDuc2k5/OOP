using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class ManualPaymentService(
    PharmacyDbContext db,
    InventoryService inventory,
    IFileStorage files,
    IdGenerator ids,
    IBusinessClock clock)
{
    public Task<PaymentOpenResult> Open(string orderId, string ownerId, CancellationToken ct = default)
        => inventory.Execute(async session =>
        {
            var order = await FindOrder(orderId, ownerId, ct);
            await db.Entry(order).ReloadAsync(ct);
            Guard.State(order.Status == OrderStatus.AwaitingPayment);
            var existing = await db.Payments.SingleOrDefaultAsync(x => x.OrderId == orderId, ct);
            if (existing is not null)
            {
                await db.Entry(existing).ReloadAsync(ct);
                Guard.State(existing.Status == PaymentStatus.PendingReview);
                return new PaymentOpenResult(false, View(existing));
            }
            var setting = await db.PaymentSettings.AsNoTracking().SingleOrDefaultAsync(ct)
                ?? throw NotConfigured();
            var snapshot = setting.CreateSnapshot();
            try
            {
                using var image = files.OpenRead("qr", Path.GetFileName(snapshot.QrImagePath));
            }
            catch (BusinessException e) when (e.Code == "NOT_FOUND")
            {
                throw NotConfigured();
            }
            var drugs = await db.Drugs.AsNoTracking().Where(x => order.Items.Select(i => i.DrugId).Contains(x.DrugId)).ToListAsync(ct);
            if (drugs.Any(x => !x.IsForSale))
            {
                throw new BusinessException("NOT_FOR_SALE", "Có thuốc đã tắt bán.");
            }
            if (order.SaleKind == SaleKind.OTC && drugs.Any(x => x.RequiresPrescription || x.IsControlled))
            {
                throw new BusinessException("PRESCRIPTION_REQUIRED", "Các thuốc này cần đơn thuốc.");
            }
            await session.Reserve(orderId, ct);
            var payment = new Payment(await ids.NextAsync("TT", ct), orderId, order.TotalAmount, snapshot, clock.Now);
            db.Payments.Add(payment);
            await db.SaveChangesAsync(ct);
            return new PaymentOpenResult(true, View(payment));
        }, ct);

    public async Task<PaymentView> Get(string orderId, string? ownerId, CancellationToken ct = default)
    {
        await FindOrder(orderId, ownerId, ct);
        return View(await db.Payments.AsNoTracking().SingleOrDefaultAsync(x => x.OrderId == orderId, ct)
            ?? throw InputValidation.NotFound());
    }

    public async Task<Paged<PaymentRow>> Query(string? status, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var query = db.Payments.AsNoTracking().AsQueryable();
        if (status is null)
        {
            status = "PendingReview";
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<PaymentStatus>(status, out var parsed) || !Enum.IsDefined(parsed))
            {
                throw new BusinessException("VALIDATION_FAILED", "Trạng thái không hợp lệ.", "status");
            }
            query = query.Where(x => x.Status == parsed);
        }
        var payments = await query.ToListAsync(ct);
        var customers = await (from order in db.Orders.AsNoTracking()
                               join user in db.UserAccounts.AsNoTracking() on order.UserId equals user.UserId
                               select new
                               {
                                   order.OrderId,
                                   user.Username
                               }).ToDictionaryAsync(x => x.OrderId, x => x.Username, ct);
        var term = search?.Trim();
        var matches = payments.Where(x => string.IsNullOrEmpty(term)
            || x.PaymentId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.OrderId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || customers[x.OrderId].Contains(term, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.PaymentId).ToList();
        var items = matches.Skip((page - 1) * pageSize).Take(pageSize).Select(x => new PaymentRow(
            x.PaymentId, x.OrderId, customers[x.OrderId], x.ExpectedAmount, x.Status, x.CreatedAt, x.ReviewNote, x.ReceivedAmount)).ToList();
        return new(items, page, pageSize, matches.Count);
    }

    public Task<PaymentReviewResult> Review(string paymentId, string reviewerId, PaymentReviewInput input, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            var payment = await FindPayment(paymentId, ct);
            await db.Entry(payment).ReloadAsync(ct);
            var order = await FindOrder(payment.OrderId, null, ct);
            await db.Entry(order).ReloadAsync(ct);
            Guard.State(payment.Status == PaymentStatus.PendingReview && order.Status == OrderStatus.AwaitingPayment);
            ValidateReview(input);
            var reference = input.BankReference!.Trim();
            var approved = input.ReceivedAmount >= payment.ExpectedAmount;
            if (approved)
            {
                if (await db.Payments.AnyAsync(x => x.Status == PaymentStatus.Confirmed && x.BankReference == reference, ct))
                {
                    throw DuplicateReference();
                }
                payment.Confirm(reference, input.ReceivedAmount!.Value, input.ReceivedAt!.Value, reviewerId, clock.Now, input.Note);
                order.MarkPreparing();
                order.Claim(reviewerId);
            }
            else
            {
                payment.RecordUnderpayment(input.ReceivedAmount!.Value, reference, input.ReceivedAt!.Value,
                    $"Chuyển thiếu {payment.ExpectedAmount - input.ReceivedAmount.Value:0} VND." +
                    (string.IsNullOrWhiteSpace(input.Note) ? "" : " " + input.Note.Trim()));
                order.Claim(reviewerId);
            }
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException e) when (DatabaseErrors.IsUniqueViolation(e))
            {
                throw DuplicateReference();
            }
            return new PaymentReviewResult(approved, View(payment), order.Status);
        }, ct);

    public Task<PaymentView> Note(string paymentId, string? note, string reviewerId, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            var payment = await FindPayment(paymentId, ct);
            await db.Entry(payment).ReloadAsync(ct);
            var order = await FindOrder(payment.OrderId, null, ct);
            await db.Entry(order).ReloadAsync(ct);
            Guard.State(order.Status == OrderStatus.AwaitingPayment);
            if (string.IsNullOrWhiteSpace(note))
            {
                throw new BusinessException("VALIDATION_FAILED", "Ghi chú là bắt buộc.", "note");
            }
            payment.SetNote(note);
            order.Claim(reviewerId);
            await db.SaveChangesAsync(ct);
            return View(payment);
        }, ct);

    public async Task<PaymentSettingView> Settings(CancellationToken ct = default)
        => SettingView(await db.PaymentSettings.AsNoTracking().SingleOrDefaultAsync(ct) ?? new PaymentSetting());

    public Task<PaymentSettingView> UpdateSettings(PaymentSettingInput input, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(input.BankName))
            {
                errors["bankName"] = ["Tên ngân hàng là bắt buộc."];
            }
            if (string.IsNullOrWhiteSpace(input.AccountNumber))
            {
                errors["accountNumber"] = ["Số tài khoản là bắt buộc."];
            }
            if (string.IsNullOrWhiteSpace(input.AccountName))
            {
                errors["accountName"] = ["Tên chủ tài khoản là bắt buộc."];
            }
            InputValidation.ThrowIfAny(errors);
            var setting = await Setting(ct);
            setting.Update(input.BankName!, input.AccountNumber!, input.AccountName!);
            await db.SaveChangesAsync(ct);
            return SettingView(setting);
        }, ct);

    public Task<PaymentSettingView> UploadQr(DrugImage? image, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            if (image is null || image.Length > LocalFileStorage.MaxBytes)
            {
                throw new BusinessException("FILE_INVALID", "Ảnh phải là PNG/JPEG và không quá 5 MB.", "file");
            }
            var setting = await Setting(ct);
            try
            {
                setting.SetQrImage(await files.SaveAsync("qr", image.Content, image.FileName, image.ContentType, ct));
            }
            catch (BusinessException e) when (e.Code == "FILE_INVALID")
            {
                throw new BusinessException(e.Code, e.Message, "file");
            }
            await db.SaveChangesAsync(ct);
            return SettingView(setting);
        }, ct);

    public async Task<StoredDrugImage> Qr(string fileName, CancellationToken ct = default)
    {
        var path = "qr/" + fileName;
        if (!await db.PaymentSettings.AnyAsync(x => x.QrImagePath == path, ct)
            && !await db.Payments.AnyAsync(x => x.QrImagePath == path, ct))
        {
            throw InputValidation.NotFound();
        }
        return new(files.OpenRead("qr", fileName), Path.GetExtension(fileName) == ".png" ? "image/png" : "image/jpeg");
    }

    private async Task<PaymentSetting> Setting(CancellationToken ct)
    {
        var setting = await db.PaymentSettings.SingleOrDefaultAsync(ct);
        if (setting is null)
        {
            setting = new();
            db.PaymentSettings.Add(setting);
        }
        return setting;
    }

    private async Task<Order> FindOrder(string id, string? ownerId, CancellationToken ct)
        => await db.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.OrderId == id
            && (ownerId == null || x.UserId == ownerId), ct) ?? throw InputValidation.NotFound();

    private async Task<Payment> FindPayment(string id, CancellationToken ct)
        => await db.Payments.SingleOrDefaultAsync(x => x.PaymentId == id, ct) ?? throw InputValidation.NotFound();

    private static PaymentView View(Payment payment)
        => new(payment.PaymentId, payment.OrderId, payment.Status, payment.ExpectedAmount, payment.OrderId,
            payment.BankName, payment.AccountNumber, payment.AccountName, "/api/files/qr/" + Path.GetFileName(payment.QrImagePath),
            payment.ReceivedAmount, payment.ReviewNote, payment.CreatedAt, payment.ApprovedAt);

    private static PaymentSettingView SettingView(PaymentSetting setting)
        => new(setting.BankName, setting.AccountNumber, setting.AccountName,
            setting.QrImagePath is null ? null : "/api/files/qr/" + Path.GetFileName(setting.QrImagePath),
            !string.IsNullOrWhiteSpace(setting.BankName) && !string.IsNullOrWhiteSpace(setting.AccountNumber)
            && !string.IsNullOrWhiteSpace(setting.AccountName) && setting.QrImagePath is not null);

    private static void ValidateReview(PaymentReviewInput input)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.BankReference))
        {
            errors["bankReference"] = ["Mã giao dịch là bắt buộc."];
        }
        if (input.ReceivedAmount is null or < 0 || decimal.Truncate(input.ReceivedAmount.Value) != input.ReceivedAmount)
        {
            errors["receivedAmount"] = ["Số tiền nhận phải là VND nguyên không âm."];
        }
        if (input.ReceivedAt is null)
        {
            errors["receivedAt"] = ["Thời điểm nhận là bắt buộc."];
        }
        InputValidation.ThrowIfAny(errors);
    }

    private static BusinessException NotConfigured() => new("PAYMENT_NOT_CONFIGURED", "Chưa cấu hình tài khoản/QR nhận tiền.");
    private static BusinessException DuplicateReference() => new("DUPLICATE_BANK_REFERENCE", "Mã giao dịch đã dùng cho đơn khác.", "bankReference");
}
