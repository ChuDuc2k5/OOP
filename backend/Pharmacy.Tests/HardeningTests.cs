using System.Collections.Concurrent;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class HardeningTests
{
    [Theory]
    [InlineData("U0000003", true)]
    [InlineData("U0000004", false)]
    [InlineData(null, false)]
    public async Task TC56_PrescriptionSubtype_ValidatesOnlineOwner_AndAppliesCompletionEffects(string? buyer, bool valid)
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-polymorphic-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            await factory.WithDb(async db =>
            {
                var prescription = await db.Prescriptions.Include(x => x.Items)
                    .SingleAsync(x => x.PrescriptionId == "DT2610060001");
                var drug = await db.Drugs.SingleAsync(x => x.DrugId == "AMOX500");
                var context = new SaleContext(new TestClock().Today,
                    new Dictionary<string, Drug> { [drug.DrugId] = drug }, prescription);
                Sale sale = new PrescriptionSale("CHECK", "U0000002", new TestClock().Now,
                    prescription.PrescriptionId, "BN001", SaleChannel.Online, buyer, "ORDER");
                sale.ReplaceItems([new SaleItem("LINE", sale.SaleId, drug.DrugId, drug.Name, drug.SaleUnit, 2, drug.UnitPrice)]);
                Assert.Equal(valid, sale.Validate(context).IsValid);
                if (!valid)
                {
                    Assert.Equal("PRESCRIPTION_INVALID", sale.Validate(context).Code);
                    Assert.Contains("Đơn thuốc không thuộc người mua.", sale.Validate(context).Issues);
                }
                Sale counter = new PrescriptionSale("COUNTER", "U0000002", new TestClock().Now,
                    prescription.PrescriptionId, "BN001");
                counter.ReplaceItems([new SaleItem("COUNTER-LINE", counter.SaleId, drug.DrugId, drug.Name, drug.SaleUnit, 2, drug.UnitPrice)]);
                Assert.True(counter.Validate(context).IsValid);
                var prescribed = prescription.Items.ToDictionary(x => x.DrugId);
                Sale otc = new OTCSale("OTC", "U0000002", new TestClock().Now);
                otc.ApplyCompletionEffects(prescribed);
                Assert.Equal(0, prescription.Items.Single().DispensedQuantity);
                counter.ApplyCompletionEffects(prescribed);
                Assert.Equal(2, prescription.Items.Single().DispensedQuantity);
            });
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    [Fact]
    public async Task NFR02_NFR08_LoginAndDatabaseFailure_DoNotLeakSecretsInLogsOr500Response()
    {
        const string secret = "PRIVATE-PASSWORD-92817";
        const string connection = "Host=private.invalid;Username=private-user;Password=PRIVATE-PASSWORD-92817";
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-safe-log-" + Guid.NewGuid() + ".db");
        var logs = new CapturedLogs();
        try
        {
            using var factory = new ApiFactory(path, logs: logs);
            using var client = factory.Client();
            await (await client.Login("chuduc", secret)).Error(401, "INVALID_CREDENTIALS");
            Assert.Equal(200, (int)(await client.Login("staff", "Staff@12345")).StatusCode);
            await client.Csrf();
            await factory.WithDb(db => db.Database.ExecuteSqlRawAsync(
                "CREATE TRIGGER FailSale BEFORE INSERT ON Sales BEGIN SELECT RAISE(ABORT, '" + connection + "'); END;"));
            var response = await client.PostAsJsonAsync("/api/staff/sales", new
            {
                kind = "OTC"
            });
            await response.Error(500, "INTERNAL_ERROR");
            var body = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("Exception", body);
            Assert.DoesNotContain("stack", body, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("FailSale", body);
            Assert.DoesNotContain(secret, body);
            Assert.DoesNotContain(connection, body);
            var log = string.Join("\n", logs.Entries);
            Assert.Contains("Unhandled API error (DbUpdateException); trace", log);
            Assert.DoesNotContain(secret, log);
            Assert.DoesNotContain(connection, log);
            Assert.DoesNotContain("Staff@12345", log);
            Assert.Equal(0, await factory.WithDb(db => db.Sales.CountAsync()));
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    private sealed class CapturedLogs : ILoggerProvider
    {
        public ConcurrentQueue<string> Entries { get; } = new();
        public ILogger CreateLogger(string categoryName) => new Capture(Entries);
        public void Dispose()
        {
        }

        private sealed class Capture(ConcurrentQueue<string> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel logLevel) => true;
            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
                Exception? exception, Func<TState, Exception?, string> formatter)
            {
                entries.Enqueue(formatter(state, exception) + (exception is null ? "" : "\n" + exception));
            }
        }
    }
}
