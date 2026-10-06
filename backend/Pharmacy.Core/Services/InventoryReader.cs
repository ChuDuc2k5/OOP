using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed record DrugStock(Drug Drug, InventoryRow Inventory);

public sealed class InventoryReader(PharmacyDbContext db, IBusinessClock clock)
{
    public async Task<IReadOnlyList<DrugStock>> Snapshot(CancellationToken ct = default)
    {
        // Both queries read the same database snapshot without changing inventory.
        await using var transaction = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(ct)
            : null;
        var drugs = await db.Drugs.AsNoTracking().Include(x => x.Batches).ToListAsync(ct);
        var reservations = await db.StockReservations.AsNoTracking()
            .Where(x => x.Status == ReservationStatus.Active)
            .GroupBy(x => x.DrugId)
            .Select(g => new { DrugId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.DrugId, x => x.Quantity, ct);
        var date = clock.Today;
        var result = drugs.Select(drug =>
        {
            var reserved = reservations.GetValueOrDefault(drug.DrugId);
            var row = new InventoryRow(
                drug.DrugId,
                drug.Name,
                drug.SaleUnit,
                drug.LowStockThreshold,
                drug.Batches.Sum(x => x.Quantity),
                drug.Batches.Where(x => x.ExpiryDate > date).Sum(x => x.Quantity),
                reserved,
                drug.GetAvailableQuantity(date, reserved));
            return new DrugStock(drug, row);
        }).ToList();
        if (transaction is not null)
        {
            await transaction.CommitAsync(ct);
        }
        return result;
    }

    public static bool Matches(Drug drug, string? search)
    {
        var term = search?.Trim();
        return string.IsNullOrEmpty(term)
            || drug.DrugId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || drug.Name.Contains(term, StringComparison.OrdinalIgnoreCase);
    }
}
