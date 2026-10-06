using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PHARMACY_TEST_POSTGRES")))
        {
            Skip = "PHARMACY_TEST_POSTGRES is not configured.";
        }
    }
}

public sealed class PostgresSmokeTests
{
    private static PostgresPharmacyDbContext Context()
        => new(new DbContextOptionsBuilder<PostgresPharmacyDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("PHARMACY_TEST_POSTGRES"),
                postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", "pharmacy")).Options);

    [PostgresFact]
    [Trait("Category", "Postgres")]
    public async Task Postgres_MigrateSeedUtcUniqueConcurrencyAndAtomicSequence_Smoke()
    {
        var storage = Path.Combine(Path.GetTempPath(), "pharmacy-postgres-" + Guid.NewGuid());
        try
        {
            await using var db = Context();
            await db.Database.MigrateAsync();
            var clock = new TestClock();
            var ids = new IdGenerator(db, clock);
            await new DbSeeder(db, clock, new PasswordHasher<UserAccount>(), ids, new StorageOptions(storage)).SeedAsync();
            Assert.True(await db.Drugs.AnyAsync());
            var count = await db.UserAccounts.CountAsync();
            await new DbSeeder(db, clock, new PasswordHasher<UserAccount>(), ids, new StorageOptions(storage)).SeedAsync();
            Assert.Equal(count, await db.UserAccounts.CountAsync());
            var catalogSeeder = new DemoCatalogSeeder(db, clock, new StorageOptions(storage));
            await catalogSeeder.SeedAsync();
            var catalogCount = await db.Drugs.CountAsync();
            Assert.Equal(new DemoCatalogSeedResult(0, 0, 0, 0), await catalogSeeder.SeedAsync());
            Assert.Equal(catalogCount, await db.Drugs.CountAsync());
            Assert.Equal(count, await db.UserAccounts.CountAsync());
            var suffix = Guid.NewGuid().ToString("N");
            var drugId = "PG" + suffix;
            var batchId = "PB" + suffix;
            var rxId = "PR" + suffix;
            var account = await db.UserAccounts.FirstAsync();
            db.Drugs.Add(new(drugId, "Thuốc thử", "Viên", 1000, 0));
            db.DrugBatches.Add(new(batchId, drugId, "BATCH", clock.Today.AddDays(1), 4));
            db.Prescriptions.Add(new(rxId, account.UserId, account.UserId, "PATIENT", "Tên", createdAt: clock.Now));
            await db.SaveChangesAsync();
            try
            {
                await using var other = Context();
                var first = await db.DrugBatches.SingleAsync(x => x.BatchId == batchId);
                var second = await other.DrugBatches.SingleAsync(x => x.BatchId == batchId);
                first.Deduct(1, clock.Today);
                await db.SaveChangesAsync();
                second.Deduct(1, clock.Today);
                await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => other.SaveChangesAsync());
                var rx = await other.Prescriptions.AsNoTracking().SingleAsync(x => x.PrescriptionId == rxId);
                Assert.Equal(TimeSpan.Zero, rx.CreatedAt.Offset);
                Assert.Equal(clock.Now.UtcDateTime, rx.CreatedAt.UtcDateTime);
                other.ChangeTracker.Clear();
                other.DrugBatches.Add(new("DUP" + suffix, drugId, "BATCH", clock.Today.AddDays(2), 1));
                var duplicate = await Assert.ThrowsAsync<DbUpdateException>(() => other.SaveChangesAsync());
                Assert.True(DatabaseErrors.IsUniqueViolation(duplicate));
                var generated = await Task.WhenAll(Enumerable.Range(0, 8).Select(async _ =>
                {
                    await using var context = Context();
                    return await new IdGenerator(context, clock).NextAsync("DH");
                }));
                Assert.Equal(8, generated.Distinct().Count());
                Assert.All(generated, x => Assert.Matches("^DH261006[0-9]{4}$", x));
                await using var transaction = await db.Database.BeginTransactionAsync();
                var rolledBack = await ids.NextAsync("TT");
                await transaction.RollbackAsync();
                Assert.Equal(rolledBack, await ids.NextAsync("TT"));
            }
            finally
            {
                db.ChangeTracker.Clear();
                await db.Prescriptions.Where(x => x.PrescriptionId == rxId).ExecuteDeleteAsync();
                await db.DrugBatches.Where(x => x.DrugId == drugId).ExecuteDeleteAsync();
                await db.Drugs.Where(x => x.DrugId == drugId).ExecuteDeleteAsync();
            }
        }
        finally
        {
            var fullPath = Path.GetFullPath(storage);
            if (Directory.Exists(fullPath) && fullPath.StartsWith(Path.GetFullPath(Path.GetTempPath()), StringComparison.OrdinalIgnoreCase))
            {
                Directory.Delete(fullPath, true);
            }
        }
    }
}
