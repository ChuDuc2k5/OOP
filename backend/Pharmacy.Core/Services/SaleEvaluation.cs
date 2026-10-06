using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed record SaleEvaluationResult(ValidationResult Validation, SaleContext Context, IReadOnlyList<StockShortage> Shortages);

public sealed class SaleEvaluation(
    PharmacyDbContext db,
    InventoryReader inventory,
    IBusinessClock clock)
{
    public async Task<SaleEvaluationResult> Evaluate(Sale sale, CancellationToken ct = default)
    {
        var stocks = await inventory.Snapshot(ct);
        var drugs = stocks.ToDictionary(x => x.Drug.DrugId, x => x.Drug);
        Prescription? prescription = null;
        if (sale.PrescriptionId is not null)
        {
            prescription = await db.Prescriptions.AsNoTracking().Include(x => x.Items)
                .SingleOrDefaultAsync(x => x.PrescriptionId == sale.PrescriptionId, ct);
        }
        var reserved = await db.StockReservations.AsNoTracking()
            .Where(x => x.Status == ReservationStatus.Active && x.PrescriptionItemId != null
                && (sale.OrderId == null || x.OrderId != sale.OrderId))
            .GroupBy(x => x.PrescriptionItemId!)
            .Select(g => new { Id = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.Id, x => x.Quantity, ct);
        var context = new SaleContext(clock.Today, drugs, prescription, reserved);
        var validation = sale.Validate(context);
        var ownReserved = sale.OrderId is null ? new Dictionary<string, int>()
            : await db.StockReservations.AsNoTracking().Where(x => x.OrderId == sale.OrderId && x.Status == ReservationStatus.Active)
                .ToDictionaryAsync(x => x.DrugId, x => x.Quantity, ct);
        var shortages = new List<StockShortage>();
        foreach (var item in sale.Items)
        {
            var stock = stocks.SingleOrDefault(x => x.Drug.DrugId == item.DrugId);
            if (stock is null)
            {
                continue;
            }
            var otherReserved = stock.Inventory.ReservedQuantity - ownReserved.GetValueOrDefault(item.DrugId);
            var available = stock.Drug.GetAvailableQuantity(clock.Today, otherReserved);
            if (item.Quantity > available)
            {
                shortages.Add(new(item.DrugId, item.Quantity, available));
            }
        }
        return new(validation, context, shortages);
    }
}
