using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class PrescriptionQuota(PharmacyDbContext db, IBusinessClock clock)
{
    public async Task ValidateQuota(
        Prescription prescription,
        string patientId,
        IReadOnlyList<StockLine> lines,
        string? exceptOrderId = null,
        CancellationToken ct = default)
    {
        if (!prescription.Validate(patientId, clock.Today) || lines.Count == 0)
        {
            throw Invalid();
        }
        var reserved = await db.StockReservations.AsNoTracking()
            .Where(x => x.Status == ReservationStatus.Active && x.PrescriptionItemId != null
                && (exceptOrderId == null || x.OrderId != exceptOrderId))
            .GroupBy(x => x.PrescriptionItemId!)
            .Select(g => new { ItemId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Quantity, ct);
        foreach (var group in lines.GroupBy(x => x.DrugId))
        {
            var item = prescription.Items.SingleOrDefault(x => x.DrugId == group.Key);
            var requested = group.Sum(x => (long)x.Quantity);
            if (item is null || requested <= 0 || group.Any(x => x.Quantity <= 0)
                || requested > item.Remaining(reserved.GetValueOrDefault(item.ItemId)))
            {
                throw Invalid();
            }
        }
    }

    public static BusinessException Invalid()
        => new("PRESCRIPTION_INVALID", "Đơn thuốc không hợp lệ hoặc không đủ hạn mức.");
}
