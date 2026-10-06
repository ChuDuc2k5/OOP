using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class SaleService(
    PharmacyDbContext db,
    InventoryService inventory,
    SaleEvaluation evaluation,
    CheckoutService checkout,
    IdGenerator ids,
    IBusinessClock clock)
{
    public Task<SaleView> Create(string actorId, SaleCreateInput input, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            if (input.Kind is null || !Enum.IsDefined(input.Kind.Value))
            {
                throw new BusinessException("VALIDATION_FAILED", "Loại bán là bắt buộc.", "kind");
            }
            if (input.Kind == SaleKind.Prescription)
            {
                await ValidatePrescriptionFields(input.PrescriptionId, input.PatientId, ct);
            }
            var sale = CheckoutService.CreateSale(await ids.NextAsync("BH", ct), actorId, clock.Now, input.Kind.Value,
                input.PrescriptionId, input.PatientId);
            db.Sales.Add(sale);
            await db.SaveChangesAsync(ct);
            return await View(sale, ct);
        }, ct);

    public async Task<SaleView> Get(string id, string actorId, CancellationToken ct = default)
        => await View(await Find(id, actorId, ct), ct);

    public async Task<Paged<SaleView>> Query(string actorId, string? status, int page, int pageSize, CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var query = db.Sales.AsNoTracking().Include(x => x.Items).ThenInclude(x => x.Allocations)
            .Where(x => x.CreatedByUserId == actorId && x.Channel == SaleChannel.Counter);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<SaleStatus>(status, out var parsed) || !Enum.IsDefined(parsed))
            {
                throw new BusinessException("VALIDATION_FAILED", "Trạng thái không hợp lệ.", "status");
            }
            query = query.Where(x => x.Status == parsed);
        }
        var matches = (await query.ToListAsync(ct)).OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.SaleId).ToList();
        var views = new List<SaleView>();
        foreach (var sale in matches.Skip((page - 1) * pageSize).Take(pageSize))
        {
            views.Add(await View(sale, ct));
        }
        return new(views, page, pageSize, matches.Count);
    }

    public Task<SaleView> Update(string id, string actorId, SaleUpdateInput input, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            var sale = await Find(id, actorId, ct);
            await db.Entry(sale).ReloadAsync(ct);
            Guard.State(sale.Status == SaleStatus.Draft);
            if (input.Items is null || input.Items.Any(x => x is null || string.IsNullOrWhiteSpace(x.DrugId) || x.Quantity is null or <= 0))
            {
                throw new BusinessException("VALIDATION_FAILED", "Các dòng cần mã thuốc và lượng nguyên dương.", "items");
            }
            var groups = input.Items.GroupBy(x => x.DrugId!.Trim()).ToList();
            if (groups.Any(x => x.Sum(line => (long)line.Quantity!.Value) > int.MaxValue))
            {
                throw new BusinessException("VALIDATION_FAILED", "Lượng vượt giới hạn.", "items");
            }
            var drugIds = groups.Select(x => x.Key).ToList();
            var drugs = await db.Drugs.AsNoTracking().Where(x => drugIds.Contains(x.DrugId)).ToDictionaryAsync(x => x.DrugId, ct);
            if (drugs.Count != drugIds.Count)
            {
                throw new BusinessException("VALIDATION_FAILED", "Có thuốc không tồn tại.", "items");
            }
            if (sale.Kind == SaleKind.Prescription)
            {
                await ValidatePrescriptionFields(input.PrescriptionId, input.PatientId, ct);
                sale.SetPrescription(input.PrescriptionId!, input.PatientId!);
            }
            db.SaleItems.RemoveRange(sale.Items);
            await db.SaveChangesAsync(ct);
            sale.ReplaceItems(groups.Select(g => new SaleItem(ids.Item(), id, g.Key, drugs[g.Key].Name,
                drugs[g.Key].SaleUnit, g.Sum(x => x.Quantity!.Value), drugs[g.Key].UnitPrice)));
            await db.SaveChangesAsync(ct);
            return await View(sale, ct);
        }, ct);

    public Task<SaleView> Cancel(string id, string actorId, CancellationToken ct = default)
        => inventory.Execute(async _ =>
        {
            var sale = await Find(id, actorId, ct);
            await db.Entry(sale).ReloadAsync(ct);
            sale.CancelDraft();
            await db.SaveChangesAsync(ct);
            return await View(sale, ct);
        }, ct);

    public async Task<SaleView> Checkout(string id, string actorId, bool? cashReceived, CancellationToken ct = default)
    {
        var sale = await Find(id, actorId, ct);
        await checkout.Checkout(sale, actorId, cashReceived == true, ct);
        return await Get(id, actorId, ct);
    }

    private async Task<Sale> Find(string id, string actorId, CancellationToken ct)
        => await db.Sales.Include(x => x.Items).ThenInclude(x => x.Allocations).SingleOrDefaultAsync(
            x => x.SaleId == id && x.CreatedByUserId == actorId && x.Channel == SaleChannel.Counter, ct)
            ?? throw InputValidation.NotFound();

    private async Task ValidatePrescriptionFields(string? id, string? patient, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(id))
        {
            errors["prescriptionId"] = ["Mã đơn thuốc là bắt buộc."];
        }
        if (string.IsNullOrWhiteSpace(patient))
        {
            errors["patientId"] = ["Mã người bệnh là bắt buộc."];
        }
        InputValidation.ThrowIfAny(errors);
        if (!await db.Prescriptions.AnyAsync(x => x.PrescriptionId == id, ct))
        {
            throw PrescriptionQuota.Invalid();
        }
    }

    private async Task<SaleView> View(Sale sale, CancellationToken ct)
    {
        var evaluated = await evaluation.Evaluate(sale, ct);
        var issues = sale.Status == SaleStatus.Draft
            ? evaluated.Validation.Issues.Concat(evaluated.Shortages.Select(x => "Không đủ tồn khả dụng: " + x.DrugId)).ToList()
            : new List<string>();
        var lines = await SaleLines(sale, evaluated.Context.Drugs, ct);
        var username = await db.UserAccounts.Where(x => x.UserId == sale.CreatedByUserId).Select(x => x.Username).SingleAsync(ct);
        var invoice = await db.Invoices.Where(x => x.SaleId == sale.SaleId).Select(x => x.InvoiceId).SingleOrDefaultAsync(ct);
        return new(sale.SaleId, sale.Channel, sale.Kind, sale.Status, username, sale.CreatedAt, sale.CompletedAt,
            sale.PrescriptionId, sale.PatientId, sale.OrderId, lines, lines.Sum(x => x.LineTotal),
            sale.Status == SaleStatus.Draft && issues.Count == 0, issues, sale.PaymentMethod, invoice);
    }

    internal async Task<IReadOnlyList<SaleLineView>> SaleLines(Sale sale, IReadOnlyDictionary<string, Drug>? drugs, CancellationToken ct)
    {
        var batchIds = sale.Items.SelectMany(x => x.Allocations).Select(x => x.BatchId).ToList();
        var batches = await db.DrugBatches.AsNoTracking().Where(x => batchIds.Contains(x.BatchId)).ToDictionaryAsync(x => x.BatchId, ct);
        return sale.Items.OrderBy(x => x.DrugId).Select(x =>
        {
            var price = sale.Status == SaleStatus.Draft && sale.Channel == SaleChannel.Counter && drugs is not null
                ? drugs[x.DrugId].UnitPrice : x.UnitPrice;
            return new SaleLineView(x.DrugId, x.DrugName, x.Unit, x.Quantity, price, price * x.Quantity,
                sale.Status == SaleStatus.Completed ? x.Allocations.Select(a => new AllocationView(
                    batches[a.BatchId].BatchNumber, batches[a.BatchId].ExpiryDate, a.Quantity)).ToList() : null);
        }).ToList();
    }
}
