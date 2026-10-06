using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class PrescriptionService(
    PharmacyDbContext db,
    IFileStorage files,
    InventoryService transactions,
    OrderService orders,
    PrescriptionQuota quota,
    IdGenerator ids,
    IBusinessClock clock)
{
    public Task<PrescriptionView> Upload(
        string userId, string? patientId, string? patientName, DrugImage? image, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            ValidatePatient(patientId, patientName);
            if (image is null || image.Length > LocalFileStorage.MaxBytes)
            {
                throw new BusinessException("FILE_INVALID", "Ảnh phải là PNG/JPEG và không quá 5 MB.", "image");
            }
            string path;
            try
            {
                path = await files.SaveAsync("prescriptions", image.Content, image.FileName, image.ContentType, ct);
            }
            catch (BusinessException e) when (e.Code == "FILE_INVALID")
            {
                throw new BusinessException("FILE_INVALID", e.Message, "image");
            }
            var prescription = new Prescription(await ids.NextAsync("DT", ct), userId, userId,
                patientId!, patientName!, path, clock.Now);
            db.Prescriptions.Add(prescription);
            await db.SaveChangesAsync(ct);
            return await ToView(prescription, false, ct);
        }, ct);

    public Task<PrescriptionView> Counter(string staffId, CounterPrescriptionInput input, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            if (string.IsNullOrWhiteSpace(input.PrescriptionId))
            {
                throw new BusinessException("VALIDATION_FAILED", "Mã đơn giấy là bắt buộc.", "prescriptionId");
            }
            var id = input.PrescriptionId.Trim();
            if (await db.Prescriptions.AnyAsync(x => x.PrescriptionId == id, ct))
            {
                throw new BusinessException("DUPLICATE", "Mã đơn thuốc đã tồn tại.", "prescriptionId");
            }
            var lines = await ValidateDetails(input, ct);
            var prescription = new Prescription(id, null, staffId, input.PatientId!, input.PatientName!, createdAt: clock.Now);
            prescription.SetDetails(input.PrescriberName!, input.IssueDate!.Value, input.ValidUntil!.Value,
                lines.Select(x => new PrescriptionItem(ids.Item(), id, x.DrugId, x.Quantity)));
            db.Prescriptions.Add(prescription);
            await db.SaveChangesAsync(ct);
            return await ToView(prescription, true, ct);
        }, ct);

    public Task<PrescriptionView> Details(string id, PrescriptionDetailsInput input, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            var prescription = await Find(id, null, ct);
            Guard.State(prescription.Status == PrescriptionStatus.PendingReview);
            var lines = await ValidateDetails(input, ct);
            db.PrescriptionItems.RemoveRange(prescription.Items);
            await db.SaveChangesAsync(ct);
            prescription.SetPatient(input.PatientId!, input.PatientName!);
            prescription.SetDetails(input.PrescriberName!, input.IssueDate!.Value, input.ValidUntil!.Value,
                lines.Select(x => new PrescriptionItem(ids.Item(), id, x.DrugId, x.Quantity)));
            await db.SaveChangesAsync(ct);
            return await ToView(prescription, true, ct);
        }, ct);

    public Task<PrescriptionView> Review(string id, string reviewer, string action, string? reason = null, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            var prescription = await Find(id, null, ct);
            if (action == "approve")
            {
                Guard.State(prescription.Status == PrescriptionStatus.PendingReview);
                if (prescription.IssueDate is null || prescription.ValidUntil is null || prescription.IssueDate > clock.Today
                    || prescription.ValidUntil < prescription.IssueDate
                    || string.IsNullOrWhiteSpace(prescription.PrescriberName) || prescription.Items.Count == 0)
                {
                    throw new BusinessException("VALIDATION_FAILED", "Cần đầy đủ thông tin và ngày kê không sau ngày nghiệp vụ.", "issueDate");
                }
                prescription.Approve(reviewer, clock.Now);
                await db.SaveChangesAsync(ct);
                await orders.RecheckWaiting(prescription, ct);
            }
            else
            {
                if (string.IsNullOrWhiteSpace(reason))
                {
                    throw new BusinessException("VALIDATION_FAILED", "Lý do là bắt buộc.", "reason");
                }
                if (action == "reject")
                {
                    prescription.Reject(reason, reviewer, clock.Now);
                }
                else if (action == "cancel")
                {
                    prescription.CancelValidity(reason, reviewer, clock.Now);
                }
                else
                {
                    throw new ArgumentException("Unknown prescription action", nameof(action));
                }
                await orders.RejectWaiting(id, reason.Trim(), reviewer, ct);
            }
            await db.SaveChangesAsync(ct);
            return await ToView(prescription, true, ct);
        }, ct);

    public Task ValidateQuota(Prescription prescription, string patientId, IReadOnlyList<StockLine> lines,
        string? exceptOrderId = null, CancellationToken ct = default)
        => quota.ValidateQuota(prescription, patientId, lines, exceptOrderId, ct);

    public async Task<PrescriptionView> Get(string id, string? ownerId, CancellationToken ct = default)
        => await ToView(await Find(id, ownerId, ct), ownerId is null, ct);

    public async Task<StoredDrugImage> Image(string id, string? ownerId, CancellationToken ct = default)
    {
        var prescription = await Find(id, ownerId, ct);
        if (prescription.ImagePath is null)
        {
            throw InputValidation.NotFound();
        }
        var name = Path.GetFileName(prescription.ImagePath);
        return new(files.OpenRead("prescriptions", name), Path.GetExtension(name) == ".png" ? "image/png" : "image/jpeg");
    }

    public async Task<Paged<PrescriptionRow>> Query(
        string? ownerId, string? status, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var query = db.Prescriptions.AsNoTracking().AsQueryable();
        if (ownerId is not null)
        {
            query = query.Where(x => x.OwnerUserId == ownerId);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<PrescriptionStatus>(status, false, out var parsed) || !Enum.IsDefined(parsed))
            {
                throw new BusinessException("VALIDATION_FAILED", "Trạng thái không hợp lệ.", "status");
            }
            query = query.Where(x => x.Status == parsed);
        }
        var prescriptions = await query.ToListAsync(ct);
        var users = await db.UserAccounts.AsNoTracking().ToDictionaryAsync(x => x.UserId, x => x.Username, ct);
        var term = search?.Trim();
        var matches = prescriptions.Where(x => string.IsNullOrEmpty(term)
            || x.PrescriptionId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.PatientId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.PatientName.Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.OwnerUserId is not null && users[x.OwnerUserId].Contains(term, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.PrescriptionId, StringComparer.Ordinal).ToList();
        var items = matches.Skip((page - 1) * pageSize).Take(pageSize).Select(x => new PrescriptionRow(
            x.PrescriptionId, x.Status, x.PatientId, x.PatientName,
            x.OwnerUserId is null ? null : users[x.OwnerUserId], x.CreatedAt, x.ValidUntil)).ToList();
        return new(items, page, pageSize, matches.Count);
    }

    public async Task<IReadOnlyList<PrescriptionView>> Usable(string userId, CancellationToken ct = default)
    {
        var date = clock.Today;
        var prescriptions = await db.Prescriptions.AsNoTracking().Include(x => x.Items)
            .Where(x => x.OwnerUserId == userId && (x.Status == PrescriptionStatus.PendingReview
                || x.Status == PrescriptionStatus.Approved && x.IssueDate <= date && x.ValidUntil >= date)).ToListAsync(ct);
        var result = new List<PrescriptionView>();
        foreach (var prescription in prescriptions.OrderByDescending(x => x.CreatedAt))
        {
            result.Add(await ToView(prescription, false, ct));
        }
        return result;
    }

    private async Task<Prescription> Find(string id, string? ownerId, CancellationToken ct)
        => await db.Prescriptions.Include(x => x.Items).SingleOrDefaultAsync(x => x.PrescriptionId == id
            && (ownerId == null || x.OwnerUserId == ownerId), ct) ?? throw InputValidation.NotFound();

    private async Task<PrescriptionView> ToView(Prescription prescription, bool includeLinkedOrders, CancellationToken ct)
    {
        var users = await db.UserAccounts.AsNoTracking().ToDictionaryAsync(x => x.UserId, x => x.Username, ct);
        var drugs = await db.Drugs.AsNoTracking().ToDictionaryAsync(x => x.DrugId, ct);
        var itemIds = prescription.Items.Select(x => x.ItemId).ToList();
        var reserved = await db.StockReservations.AsNoTracking()
            .Where(x => x.Status == ReservationStatus.Active && itemIds.Contains(x.PrescriptionItemId!))
            .GroupBy(x => x.PrescriptionItemId!)
            .Select(g => new { ItemId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Quantity, ct);
        var items = prescription.Items.OrderBy(x => x.DrugId, StringComparer.Ordinal).Select(x => new PrescriptionItemView(
            x.ItemId, x.DrugId, drugs[x.DrugId].Name, drugs[x.DrugId].SaleUnit,
            x.PrescribedQuantity, reserved.GetValueOrDefault(x.ItemId), x.DispensedQuantity,
            x.Remaining(reserved.GetValueOrDefault(x.ItemId)))).ToList();
        var linkedOrders = new List<LinkedPrescriptionOrderView>();
        if (includeLinkedOrders)
        {
            var linked = await db.Orders.AsNoTracking().Include(x => x.Items)
                .Where(x => x.PrescriptionId == prescription.PrescriptionId).ToListAsync(ct);
            linkedOrders = linked.OrderBy(x => x.CreatedAt).ThenBy(x => x.OrderId, StringComparer.Ordinal)
                .Select(x => new LinkedPrescriptionOrderView(x.OrderId, x.Status,
                    x.Items.OrderBy(item => item.DrugId, StringComparer.Ordinal)
                        .Select(item => new LinkedPrescriptionOrderItemView(
                            item.DrugId, item.DrugName, item.Unit, item.Quantity)).ToList())).ToList();
        }
        return new(prescription.PrescriptionId, prescription.Status, prescription.OwnerUserId,
            prescription.OwnerUserId is null ? null : users[prescription.OwnerUserId], users[prescription.CreatedByUserId],
            prescription.PatientId, prescription.PatientName, prescription.PrescriberName,
            prescription.IssueDate, prescription.ValidUntil, prescription.ImagePath is not null,
            prescription.ImagePath is null ? null : "/api/prescriptions/" + Uri.EscapeDataString(prescription.PrescriptionId) + "/image",
            prescription.ReviewedByUserId is null ? null : users[prescription.ReviewedByUserId],
            prescription.ReviewedAt, prescription.ReviewNote, prescription.CreatedAt, items, linkedOrders);
    }

    private async Task<IReadOnlyList<StockLine>> ValidateDetails(PrescriptionDetailsInput input, CancellationToken ct)
    {
        ValidatePatient(input.PatientId, input.PatientName);
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.PrescriberName))
        {
            errors["prescriberName"] = ["Người kê đơn là bắt buộc."];
        }
        if (input.IssueDate is null)
        {
            errors["issueDate"] = ["Ngày kê là bắt buộc."];
        }
        if (input.ValidUntil is null || input.ValidUntil < input.IssueDate)
        {
            errors["validUntil"] = ["Ngày hết hiệu lực phải từ ngày kê trở đi."];
        }
        if (input.Items is null || input.Items.Count == 0
            || input.Items.Any(x => x is null || string.IsNullOrWhiteSpace(x.DrugId) || x.Quantity is null or <= 0))
        {
            errors["items"] = ["Cần ít nhất một dòng thuốc với số lượng nguyên dương."];
        }
        InputValidation.ThrowIfAny(errors);
        var grouped = input.Items!.GroupBy(x => x.DrugId!.Trim()).ToList();
        if (grouped.Any(g => g.Sum(x => (long)x.Quantity!.Value) > int.MaxValue))
        {
            throw new BusinessException("VALIDATION_FAILED", "Tổng lượng kê vượt giới hạn.", "items");
        }
        var lines = grouped.Select(g => new StockLine(g.Key, g.Sum(x => x.Quantity!.Value))).ToList();
        var drugIds = lines.Select(x => x.DrugId).ToList();
        if (await db.Drugs.CountAsync(x => drugIds.Contains(x.DrugId), ct) != drugIds.Count)
        {
            throw new BusinessException("VALIDATION_FAILED", "Có mã thuốc không tồn tại.", "items");
        }
        return lines;
    }

    private static void ValidatePatient(string? id, string? name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(id))
        {
            errors["patientId"] = ["Mã người bệnh là bắt buộc."];
        }
        if (string.IsNullOrWhiteSpace(name))
        {
            errors["patientName"] = ["Tên người bệnh là bắt buộc."];
        }
        InputValidation.ThrowIfAny(errors);
    }
}
