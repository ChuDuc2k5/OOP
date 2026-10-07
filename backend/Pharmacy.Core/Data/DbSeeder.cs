using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Data;

public sealed class DbSeeder(
    PharmacyDbContext db,
    IBusinessClock clock,
    IPasswordHasher<UserAccount> hasher,
    IdGenerator ids,
    StorageOptions storage) : IDbSeeder
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Existing or partially populated domain database is never overwritten.
        if (await db.UserAccounts.AnyAsync(ct)
            || await db.Drugs.AnyAsync(ct)
            || await db.Prescriptions.AnyAsync(ct)
            || await db.PaymentSettings.AnyAsync(ct)
            || await db.Orders.AnyAsync(ct)
            || await db.Sales.AnyAsync(ct))
        {
            return;
        }

        db.UserAccounts.AddRange(
            new UserAccount("U0000001", "admin", "Admin@12345", Role.Admin, hasher),
            new UserAccount("U0000002", "staff", "Staff@12345", Role.Staff, hasher),
            new UserAccount("U0000003", "chuduc", "User@12345", Role.User, hasher),
            new UserAccount("U0000004", "nguyenvana", "User@12345", Role.User, hasher));
        await db.SaveChangesAsync(ct);
        await new CatalogSeeder(db, clock, storage).SeedAsync(ct);
        for (var i = 0; i < 3; i++)
        {
            var prescription = new Prescription(
                await ids.NextAsync("DT", ct), "U0000003", "U0000003", "BN001", "Chu Đức",
                createdAt: clock.Now);
            if (i < 2)
            {
                prescription.SetDetails(
                    "BS. Nguyễn Văn Minh", clock.Today.AddDays(-10), clock.Today.AddDays(i == 0 ? 20 : -1),
                    [
                        new PrescriptionItem($"PITEM{i}A", prescription.PrescriptionId, "PRUZENA", 3),
                        new PrescriptionItem($"PITEM{i}B", prescription.PrescriptionId, "ATILENE", 2)
                    ]);
                prescription.Approve("U0000002", clock.Now);
            }
            db.Prescriptions.Add(prescription);
        }
        await db.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);
    }
}
