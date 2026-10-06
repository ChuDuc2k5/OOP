using Microsoft.Data.Sqlite;
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
        Assert.Equal(2, sqlite.Database.GetMigrations().Count());
        Assert.Single(postgres.Database.GetMigrations());
        Assert.DoesNotContain(postgres.Database.GetMigrations().Single(), sqlite.Database.GetMigrations());
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
