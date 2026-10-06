using Pharmacy.Core.Common;

namespace Pharmacy.Core.Services;

public sealed class InventoryReportService(InventoryReader inventory, IBusinessClock clock)
{
    public async Task<IReadOnlyList<LowStockRow>> LowStock(CancellationToken ct = default)
    {
        var snapshot = await inventory.Snapshot(ct);
        return snapshot.Select(x => x.Inventory).Where(x => x.AvailableQuantity <= x.LowStockThreshold)
            .OrderBy(x => x.AvailableQuantity).ThenBy(x => x.DrugId, StringComparer.Ordinal)
            .Select(x => new LowStockRow(x.DrugId, x.Name, x.AvailableQuantity, x.LowStockThreshold)).ToList();
    }

    public async Task<IReadOnlyList<ExpiringRow>> NearExpiry(int days = 30, CancellationToken ct = default)
    {
        if (days <= 0)
        {
            throw new BusinessException("VALIDATION_FAILED", "Số ngày phải là số nguyên dương.", "days");
        }
        var snapshot = await inventory.Snapshot(ct);
        var date = clock.Today;
        return snapshot.SelectMany(stock => stock.Drug.Batches.Select(batch => new ExpiringRow(
            stock.Drug.DrugId, stock.Drug.Name, batch.BatchId, batch.BatchNumber, batch.Quantity,
            batch.ExpiryDate, batch.ExpiryDate.DayNumber - date.DayNumber)))
            .Where(x => x.Quantity > 0 && x.DaysRemaining > 0 && x.DaysRemaining <= days)
            .OrderBy(x => x.ExpiryDate).ThenBy(x => x.DrugId, StringComparer.Ordinal)
            .ThenBy(x => x.BatchNumber, StringComparer.Ordinal).ToList();
    }
}
