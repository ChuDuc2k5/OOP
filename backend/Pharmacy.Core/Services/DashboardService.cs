using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class DashboardService(PharmacyDbContext db, InventoryReportService reports)
{
    public async Task<DashboardSummary> Get(CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginReadSnapshotAsync(ct);
        var summary = new DashboardSummary(
            await db.Prescriptions.CountAsync(x => x.Status == PrescriptionStatus.PendingReview, ct),
            await db.Orders.CountAsync(x => x.Status == OrderStatus.AwaitingPayment, ct),
            await db.Payments.CountAsync(x => x.Status == PaymentStatus.PendingReview, ct),
            await db.Orders.CountAsync(x => x.Status == OrderStatus.Preparing, ct),
            (await reports.LowStock(ct)).Count,
            (await reports.NearExpiry(30, ct)).Count);
        await transaction.CommitAsync(ct);
        return summary;
    }
}
