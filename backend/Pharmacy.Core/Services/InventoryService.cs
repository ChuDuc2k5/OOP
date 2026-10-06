using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class InventoryService(
    PharmacyDbContext db,
    InventoryReader reader,
    IBusinessClock clock,
    IdGenerator ids,
    IInventoryLock inventoryLock)
{
    public async Task<Paged<InventoryRow>> Query(
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var snapshot = await reader.Snapshot(ct);
        var matches = snapshot.Where(x => InventoryReader.Matches(x.Drug, search))
            .OrderBy(x => x.Drug.DrugId, StringComparer.Ordinal).ToList();
        var items = matches.Skip((page - 1) * pageSize).Take(pageSize).Select(x => x.Inventory).ToList();
        return new(items, page, pageSize, matches.Count);
    }

    public async Task<InventoryDetail> Get(string drugId, CancellationToken ct = default)
    {
        var snapshot = await reader.Snapshot(ct);
        var stock = snapshot.SingleOrDefault(x => x.Drug.DrugId == drugId)
            ?? throw InputValidation.NotFound();
        var row = stock.Inventory;
        var batches = stock.Drug.Batches.OrderBy(x => x.ExpiryDate)
            .ThenBy(x => x.BatchNumber, StringComparer.Ordinal).Select(x => ToBatch(x, clock.Today)).ToList();
        return new(row.DrugId, row.Name, row.SaleUnit, row.LowStockThreshold,
            row.TotalQuantity, row.UnexpiredQuantity, row.ReservedQuantity, row.AvailableQuantity, batches);
    }

    public async Task<BatchView> AddBatch(string drugId, BatchInput input, CancellationToken ct = default)
    {
        using var lease = await inventoryLock.AcquireAsync(ct);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (!await db.Drugs.AnyAsync(x => x.DrugId == drugId, ct))
        {
            throw InputValidation.NotFound();
        }
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.BatchNumber))
        {
            errors["batchNumber"] = ["Số lô không được để trống."];
        }
        if (input.ExpiryDate is null || input.ExpiryDate <= clock.Today)
        {
            errors["expiryDate"] = ["Hạn sử dụng phải sau ngày nghiệp vụ."];
        }
        if (input.Quantity is null or <= 0)
        {
            errors["quantity"] = ["Số lượng phải là số nguyên dương."];
        }
        InputValidation.ThrowIfAny(errors);
        var number = input.BatchNumber!.Trim();
        if (await db.DrugBatches.AnyAsync(x => x.DrugId == drugId && x.BatchNumber == number, ct))
        {
            throw DuplicateBatch();
        }
        var batch = new DrugBatch(ids.Batch(), drugId, number, input.ExpiryDate!.Value, input.Quantity!.Value);
        db.DrugBatches.Add(batch);
        try
        {
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException e) when (DatabaseErrors.IsUniqueViolation(e))
        {
            db.Entry(batch).State = EntityState.Detached;
            throw DuplicateBatch();
        }
        return ToBatch(batch, clock.Today);
    }

    public Task<IReadOnlyList<StockReservation>> Reserve(string orderId, CancellationToken ct = default)
        => Execute(session => session.Reserve(orderId, ct), ct);

    public Task<int> Release(string orderId, CancellationToken ct = default)
        => Execute(session => session.Release(orderId, ct), ct);

    public Task<IReadOnlyList<StockAllocation>> AllocateFEFO(
        IReadOnlyList<StockLine> lines,
        string? orderId = null,
        CancellationToken ct = default)
        => Execute(session => session.AllocateFEFO(lines, orderId, ct), ct);

    public Task<IReadOnlyList<StockAllocation>> Deduct(
        IReadOnlyList<StockLine> lines,
        string? orderId = null,
        CancellationToken ct = default)
        => Execute(session => session.Deduct(lines, orderId, ct), ct);

    // Future checkout/payment workflows can persist their changes inside this same transaction.
    // The session avoids nesting transactions or acquiring the singleton lock twice.
    public async Task<T> Execute<T>(Func<InventoryTransaction, Task<T>> action, CancellationToken ct = default)
    {
        if (db.Database.CurrentTransaction is not null)
        {
            throw new InvalidOperationException("Use one inventory transaction for the entire workflow.");
        }
        using var lease = await inventoryLock.AcquireAsync(ct);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var session = new InventoryTransaction(db, clock, ids);
        try
        {
            var result = await action(session);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            db.ChangeTracker.Clear();
            throw;
        }
        finally
        {
            session.Close();
        }
    }

    internal static BatchView ToBatch(DrugBatch batch, DateOnly date)
        => new(batch.BatchId, batch.BatchNumber, batch.ExpiryDate,
            batch.InitialQuantity, batch.Quantity, batch.ExpiryDate <= date);

    private static BusinessException DuplicateBatch()
        => new("DUPLICATE", "Số lô đã tồn tại cho thuốc này.", "batchNumber");
}

public sealed class InventoryTransaction
{
    private readonly PharmacyDbContext db;
    private readonly IBusinessClock clock;
    private readonly IdGenerator ids;
    private bool closed;

    internal InventoryTransaction(PharmacyDbContext db, IBusinessClock clock, IdGenerator ids)
    {
        this.db = db;
        this.clock = clock;
        this.ids = ids;
    }

    internal void Close() => closed = true;

    public async Task<IReadOnlyList<StockReservation>> Reserve(string orderId, CancellationToken ct = default)
    {
        EnsureOpen();
        var order = await LoadOrder(orderId, ct);
        Guard.State(order.Status == OrderStatus.AwaitingPayment);
        var lines = Merge(order.Items.Select(x => new StockLine(x.DrugId, x.Quantity)).ToList());
        var active = await ActiveForOrder(orderId, ct);
        if (active.Count > 0)
        {
            Guard.State(MatchesReservations(active, lines));
            return active.AsReadOnly();
        }
        await Plan(lines, null, ct);
        var prescriptionItems = new Dictionary<string, PrescriptionItem>();
        if (order.SaleKind == SaleKind.Prescription)
        {
            var prescription = await db.Prescriptions.AsNoTracking().Include(x => x.Items)
                .SingleOrDefaultAsync(x => x.PrescriptionId == order.PrescriptionId, ct);
            if (prescription is null || prescription.OwnerUserId != order.UserId
                || !prescription.Validate(order.PatientId ?? "", clock.Today))
            {
                throw PrescriptionInvalid();
            }
            prescriptionItems = prescription.Items.ToDictionary(x => x.DrugId);
            foreach (var line in lines)
            {
                if (!prescriptionItems.TryGetValue(line.DrugId, out var item))
                {
                    throw PrescriptionInvalid();
                }
                var reserved = await db.StockReservations.Where(x => x.Status == ReservationStatus.Active
                    && x.PrescriptionItemId == item.ItemId).SumAsync(x => x.Quantity, ct);
                if (item.Remaining(reserved) < line.Quantity)
                {
                    throw PrescriptionInvalid();
                }
            }
        }
        var result = lines.Select(line => new StockReservation(
            ids.Item(), orderId, line.DrugId, line.Quantity,
            prescriptionItems.GetValueOrDefault(line.DrugId)?.ItemId)).ToList();
        db.StockReservations.AddRange(result);
        await db.SaveChangesAsync(ct);
        return result.AsReadOnly();
    }

    public async Task<int> Release(string orderId, CancellationToken ct = default)
    {
        EnsureOpen();
        var order = await LoadOrder(orderId, ct);
        Guard.State(order.Status is OrderStatus.WaitingReview or OrderStatus.AwaitingPayment
            or OrderStatus.Cancelled or OrderStatus.Rejected);
        Guard.State(!await db.Payments.AnyAsync(x => x.OrderId == orderId && x.Status == PaymentStatus.Confirmed, ct));
        var reservations = await ActiveForOrder(orderId, ct);
        foreach (var reservation in reservations)
        {
            reservation.Release();
        }
        await db.SaveChangesAsync(ct);
        return reservations.Count;
    }

    public async Task<IReadOnlyList<StockAllocation>> AllocateFEFO(
        IReadOnlyList<StockLine> lines,
        string? orderId = null,
        CancellationToken ct = default)
    {
        EnsureOpen();
        var plan = await Plan(Merge(lines), orderId, ct);
        return plan.Select(x => new StockAllocation(x.Batch.DrugId, x.Batch.BatchId,
            x.Batch.BatchNumber, x.Batch.ExpiryDate, x.Quantity)).ToList();
    }

    public async Task<IReadOnlyList<StockAllocation>> Deduct(
        IReadOnlyList<StockLine> lines,
        string? orderId = null,
        CancellationToken ct = default)
    {
        EnsureOpen();
        var merged = Merge(lines);
        var reservations = new List<StockReservation>();
        if (orderId is not null)
        {
            var order = await LoadOrder(orderId, ct);
            Guard.State(order.Status == OrderStatus.Preparing);
            reservations = await ActiveForOrder(orderId, ct);
            Guard.State(MatchesReservations(reservations, merged));
        }
        var plan = await Plan(merged, orderId, ct);
        foreach (var allocation in plan)
        {
            allocation.Batch.Deduct(allocation.Quantity, clock.Today);
        }
        foreach (var reservation in reservations)
        {
            reservation.Consume();
        }
        await db.SaveChangesAsync(ct);
        return plan.Select(x => new StockAllocation(x.Batch.DrugId, x.Batch.BatchId,
            x.Batch.BatchNumber, x.Batch.ExpiryDate, x.Quantity)).ToList();
    }

    private async Task<List<BatchPlan>> Plan(IReadOnlyList<StockLine> lines, string? orderId, CancellationToken ct)
    {
        var drugIds = lines.Select(x => x.DrugId).ToList();
        var drugs = await db.Drugs.Include(x => x.Batches).Where(x => drugIds.Contains(x.DrugId)).ToListAsync(ct);
        // Refresh previously tracked batches after acquiring the lock, so stale scopes cannot overdraw.
        foreach (var drug in drugs)
        {
            foreach (var batch in drug.Batches)
            {
                await db.Entry(batch).ReloadAsync(ct);
            }
        }
        var reserved = await db.StockReservations.AsNoTracking()
            .Where(x => x.Status == ReservationStatus.Active && drugIds.Contains(x.DrugId)
                && (orderId == null || x.OrderId != orderId))
            .GroupBy(x => x.DrugId)
            .Select(g => new { DrugId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.DrugId, x => x.Quantity, ct);
        var shortages = new List<StockShortage>();
        foreach (var line in lines)
        {
            var drug = drugs.SingleOrDefault(x => x.DrugId == line.DrugId) ?? throw InputValidation.NotFound();
            var available = drug.GetAvailableQuantity(clock.Today, reserved.GetValueOrDefault(line.DrugId));
            if (available < line.Quantity)
            {
                shortages.Add(new(line.DrugId, line.Quantity, available));
            }
        }
        if (shortages.Count > 0)
        {
            throw new BusinessException("INSUFFICIENT_STOCK", "Không đủ tồn khả dụng.", data: shortages);
        }
        return lines.SelectMany(line => drugs.Single(x => x.DrugId == line.DrugId)
            .PlanFEFO(line.Quantity, clock.Today)).ToList();
    }

    private async Task<Order> LoadOrder(string orderId, CancellationToken ct)
    {
        var order = await db.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.OrderId == orderId, ct)
            ?? throw InputValidation.NotFound();
        db.ChangeTracker.DetectChanges();
        if (db.Entry(order).State == EntityState.Unchanged)
        {
            await db.Entry(order).ReloadAsync(ct);
        }
        return order;
    }

    private async Task<List<StockReservation>> ActiveForOrder(string orderId, CancellationToken ct)
    {
        var reservations = await db.StockReservations.Where(x => x.OrderId == orderId
            && x.Status == ReservationStatus.Active).ToListAsync(ct);
        foreach (var reservation in reservations)
        {
            await db.Entry(reservation).ReloadAsync(ct);
        }
        return reservations.Where(x => x.Status == ReservationStatus.Active).ToList();
    }

    private static bool MatchesReservations(IReadOnlyList<StockReservation> reservations, IReadOnlyList<StockLine> lines)
        => reservations.Count == lines.Count && lines.All(line => reservations.Any(x =>
            x.DrugId == line.DrugId && x.Quantity == line.Quantity));

    private static IReadOnlyList<StockLine> Merge(IReadOnlyList<StockLine> lines)
    {
        if (lines.Count == 0 || lines.Any(x => string.IsNullOrWhiteSpace(x.DrugId) || x.Quantity <= 0))
        {
            throw new BusinessException("VALIDATION_FAILED", "Các dòng thuốc phải có mã và số lượng dương.", "quantity");
        }
        try
        {
            return lines.GroupBy(x => x.DrugId).Select(g => new StockLine(g.Key, g.Sum(x => x.Quantity))).ToList();
        }
        catch (OverflowException)
        {
            throw new BusinessException("VALIDATION_FAILED", "Tổng số lượng vượt giới hạn.", "quantity");
        }
    }

    private void EnsureOpen()
    {
        if (closed || db.Database.CurrentTransaction is null)
        {
            throw new InvalidOperationException("Inventory session is no longer active.");
        }
    }

    private static BusinessException PrescriptionInvalid()
        => new("PRESCRIPTION_INVALID", "Đơn thuốc hoặc hạn mức không hợp lệ.");
}
