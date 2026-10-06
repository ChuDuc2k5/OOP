using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Identity;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class DatabaseProviderTests
{
    [Fact]
    public async Task D13_OptionalReferenceMigration_PreservesExistingData_AndAllowsConfirmationWithoutReference()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-payment-upgrade-" + Guid.NewGuid() + ".db");
        try
        {
            await using var db = new PharmacyDbContext(new DbContextOptionsBuilder<PharmacyDbContext>()
                .UseSqlite("Data Source=" + path + ";Pooling=False").Options);
            var previous = db.Database.GetMigrations().TakeWhile(x => !x.EndsWith("OptionalPaymentReference")).Last();
            await db.GetService<IMigrator>().MigrateAsync(previous);
            await using var legacy = new LegacyOrderContext(new DbContextOptionsBuilder<LegacyOrderContext>()
                .UseSqlite("Data Source=" + path + ";Pooling=False").Options);
            var clock = new TestClock();
            await new DbSeeder(legacy, clock, new PasswordHasher<UserAccount>(), new IdGenerator(legacy, clock), new(path + "-storage")).SeedAsync();
            await PersistenceFixture.AddBusinessData(legacy);
            var before = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(await PersistenceFixture.Snapshot(legacy))!;
            var paymentsBefore = JsonSerializer.Serialize(await legacy.Payments.AsNoTracking().OrderBy(x => x.PaymentId).ToListAsync());
            var ordersBefore = JsonSerializer.Serialize(await legacy.Orders.AsNoTracking().Include(x => x.Items).OrderBy(x => x.OrderId).ToListAsync());
            await db.Database.MigrateAsync();
            var after = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(await PersistenceFixture.Snapshot(db))!;
            foreach (var table in before.Keys.Where(x => x is not ("Payments" or "Orders")))
            {
                Assert.Equal(before[table], after[table]);
            }
            // SQLite rebuilds Payments and can reorder physical columns; compare mapped values.
            Assert.Equal(paymentsBefore, JsonSerializer.Serialize(await db.Payments.AsNoTracking().OrderBy(x => x.PaymentId).ToListAsync()));
            Assert.Equal(ordersBefore, JsonSerializer.Serialize(await db.Orders.AsNoTracking().Include(x => x.Items).OrderBy(x => x.OrderId).ToListAsync()));
            Assert.All(await db.Orders.AsNoTracking().ToListAsync(), order => Assert.Null(order.ReadyAt));
            var order = new Order("UPORDER", "U0000003", clock.Now, SaleKind.OTC,
                "Chu Đức", "0900000000", ReceiveMethod.Pickup);
            order.AddItem(new("UPITEM", order.OrderId, "PARA500", "Paracetamol 500mg", "Viên", 1, 1000));
            db.Orders.Add(order);
            var setting = await db.PaymentSettings.SingleAsync();
            var payment = new Payment("UPPAY", order.OrderId, 1000, setting.CreateSnapshot(), clock.Now);
            payment.Confirm(null, 1000, clock.Now, "U0000002", clock.Now);
            db.Payments.Add(payment);
            await db.SaveChangesAsync();
            Assert.Null((await db.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == "UPPAY")).BankReference);
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    private sealed class LegacyOrderContext(DbContextOptions<LegacyOrderContext> options) : PharmacyDbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Order>().Ignore(x => x.ReadyAt);
        }
    }

    [Theory]
    [InlineData(2067, true)]
    [InlineData(1555, true)]
    [InlineData(787, false)]
    [InlineData(275, false)]
    public void UniqueViolation_RecognizesSqliteConstraintTypes(int code, bool expected)
        => Assert.Equal(expected, DatabaseErrors.IsUniqueViolation(new DbUpdateException("Database error",
            new SqliteException("Constraint error", 19, code))));

    [Theory]
    [InlineData("23505", true)]
    [InlineData("23503", false)]
    [InlineData("23514", false)]
    public void UniqueViolation_RecognizesPostgresSqlState(string state, bool expected)
        => Assert.Equal(expected, DatabaseErrors.IsUniqueViolation(new DbUpdateException("Database error",
            new PostgresException("Constraint error", "ERROR", "ERROR", state))));

    [Fact]
    public void Providers_HaveIndependentMigrations_AndNoPendingModelChanges()
    {
        using var sqlite = new SqliteMigrationFactory().CreateDbContext([]);
        using var postgres = new PostgresMigrationFactory().CreateDbContext([]);
        Assert.Equal(4, sqlite.Database.GetMigrations().Count());
        Assert.Equal(3, postgres.Database.GetMigrations().Count());
        Assert.All(postgres.Database.GetMigrations(), migration => Assert.DoesNotContain(migration, sqlite.Database.GetMigrations()));
        Assert.False(sqlite.Database.HasPendingModelChanges());
        Assert.False(postgres.Database.HasPendingModelChanges());
        var script = postgres.GetService<IMigrator>().GenerateScript(options: MigrationsSqlGenerationOptions.Idempotent);
        Assert.Contains("CREATE TABLE pharmacy.\"Drugs\"", script);
        Assert.Contains("timestamp with time zone", script);
        Assert.Contains("date NOT NULL", script);
        Assert.Contains("WHERE \"Status\" = 'Active'", script);
        Assert.Contains("WHERE \"Status\" = 'Confirmed'", script);
        Assert.DoesNotContain("GLOB", script);
        Assert.DoesNotContain(" AS REAL", script);
        Assert.Contains("trunc(\"UnitPrice\")", script);
    }

    [Fact]
    public void Postgres_ModelConvertsAllTimestampsToUtc_AndKeepsVersionTokens()
    {
        using var db = new PostgresMigrationFactory().CreateDbContext([]);
        var model = db.GetService<IDesignTimeModel>().Model;
        var value = new DateTimeOffset(2026, 10, 6, 9, 30, 0, TimeSpan.FromHours(7));
        var timestamps = model.GetEntityTypes().SelectMany(x => x.GetProperties())
            .Where(x => (Nullable.GetUnderlyingType(x.ClrType) ?? x.ClrType) == typeof(DateTimeOffset)).ToList();
        Assert.NotEmpty(timestamps);
        foreach (var property in timestamps)
        {
            Assert.Equal("timestamp with time zone", property.GetColumnType());
            var stored = (DateTimeOffset)property.GetValueConverter()!.ConvertToProvider(value)!;
            Assert.Equal(TimeSpan.Zero, stored.Offset);
            Assert.Equal(value.UtcDateTime, stored.UtcDateTime);
        }
        foreach (var type in new[] { typeof(Order), typeof(Payment), typeof(Sale), typeof(DrugBatch), typeof(PrescriptionItem) })
        {
            Assert.True(model.FindEntityType(type)!.FindProperty("Version")!.IsConcurrencyToken);
        }
        var query = db.Prescriptions.Where(x => x.IssueDate <= new DateOnly(2026, 10, 6)).ToQueryString();
        Assert.Contains("pharmacy.\"Prescriptions\"", query);
    }
}
