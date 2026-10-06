using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class PerformanceFactAttribute : FactAttribute
{
    public PerformanceFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("PHARMACY_TEST_PERFORMANCE") != "1")
        {
            Skip = "Set PHARMACY_TEST_PERFORMANCE=1 to measure the isolated large database.";
        }
    }
}

[CollectionDefinition("Performance", DisableParallelization = true)]
public sealed class PerformanceCollection;

[Collection("Performance")]
public sealed class PerformanceTests
{
    [PerformanceFact]
    [Trait("Category", "Performance")]
    public async Task NFR01_LargeIsolatedSqlite_TwentyReadsPerEndpoint_P95UnderTwoSeconds()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-performance-" + Guid.NewGuid() + ".db");
        try
        {
            var options = new DbContextOptionsBuilder<PharmacyDbContext>()
                .UseSqlite($"Data Source={path};Pooling=False").Options;
            await using (var db = new PharmacyDbContext(options))
            {
                await db.Database.MigrateAsync();
                await LargeDataset.Seed(db, new TestClock());
                Assert.Equal(500, await db.Drugs.CountAsync());
                Assert.Equal(2000, await db.DrugBatches.CountAsync());
                Assert.Equal(1000, await db.Orders.CountAsync());
                await Assert.ThrowsAsync<InvalidOperationException>(() => LargeDataset.Seed(db, new TestClock()));
            }
            using var factory = new ApiFactory(path);
            using var guest = factory.Client();
            using var user = factory.Client();
            using var staff = factory.Client();
            Assert.Equal(200, (int)(await user.Login("user", "User@12345")).StatusCode);
            Assert.Equal(200, (int)(await staff.Login("staff", "Staff@12345")).StatusCode);
            var requests = new (HttpClient Client, string Url, int ExpectedTotal)[]
            {
                (guest, "/api/products?page=1&pageSize=20", 500),
                (user, "/api/cart", 10),
                (user, "/api/orders/mine?page=1&pageSize=20", 500),
                (staff, "/api/staff/orders?page=1&pageSize=20", 1000),
                (staff, "/api/inventory?page=1&pageSize=20", 500)
            };
            var measurements = new List<object>();
            foreach (var request in requests)
            {
                var samples = new List<double>();
                for (var run = 0; run < 20; run++)
                {
                    var timer = Stopwatch.StartNew();
                    using var response = await request.Client.GetAsync(request.Url);
                    var body = await response.Content.ReadAsStringAsync();
                    timer.Stop();
                    Assert.True(response.IsSuccessStatusCode, body);
                    var json = JsonSerializer.Deserialize<JsonElement>(body);
                    Assert.Equal(request.ExpectedTotal, request.Url == "/api/cart"
                        ? json.GetProperty("items").GetArrayLength() : json.GetProperty("total").GetInt32());
                    samples.Add(timer.Elapsed.TotalMilliseconds);
                }
                var sorted = samples.Order().ToList();
                var p95 = sorted[(int)Math.Ceiling(0.95 * samples.Count) - 1];
                measurements.Add(new
                {
                    endpoint = request.Url,
                    count = samples.Count,
                    firstMs = samples[0],
                    p95Ms = p95,
                    maxMs = sorted[^1],
                    withinTwoSeconds = samples.Count(x => x <= 2000),
                    samplesMs = samples
                });
            }
            var report = new
            {
                measuredAt = DateTimeOffset.UtcNow,
                provider = "SQLite",
                transport = "ASP.NET Core TestServer HTTP pipeline, response body included; no TCP/browser",
                configuration = "Debug; 20 sequential reads per endpoint, no warm-up excluded, collection not parallel",
                os = RuntimeInformation.OSDescription,
                runtime = RuntimeInformation.FrameworkDescription,
                logicalProcessors = Environment.ProcessorCount,
                drugs = 500,
                batches = 2000,
                orders = 1000,
                cartLines = 10,
                reservations = 300,
                measurements
            };
            var output = Environment.GetEnvironmentVariable("PHARMACY_PERFORMANCE_OUTPUT")
                ?? Path.Combine(Path.GetTempPath(), "pharmacy-performance-results.json");
            await File.WriteAllTextAsync(output, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
            // Write all measurements even when one endpoint misses the target.
            foreach (var measurement in measurements)
            {
                var json = JsonSerializer.SerializeToElement(measurement);
                Assert.True(json.GetProperty("p95Ms").GetDouble() <= 2000, json.ToString());
            }
            Assert.Equal(1000, await factory.WithDb(db => db.Orders.CountAsync()));
            Assert.Equal(300, await factory.WithDb(db => db.StockReservations.CountAsync()));
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
}

internal static class LargeDataset
{
    public static async Task Seed(PharmacyDbContext db, IBusinessClock clock)
    {
        if (!db.Database.IsSqlite()
            || await db.UserAccounts.AnyAsync() || await db.Drugs.AnyAsync() || await db.Orders.AnyAsync()
            || await db.PaymentSettings.AnyAsync() || await db.Sales.AnyAsync() || await db.Prescriptions.AnyAsync())
        {
            throw new InvalidOperationException("Large seed requires a separate empty SQLite database.");
        }
        await using var transaction = await db.Database.BeginTransactionAsync();
        var hasher = new PasswordHasher<UserAccount>();
        db.UserAccounts.AddRange(
            new UserAccount("UDEMO0001", "admin", "Admin@12345", Role.Admin, hasher),
            new UserAccount("UDEMO0002", "staff", "Staff@12345", Role.Staff, hasher),
            new UserAccount("UDEMO0003", "user", "User@12345", Role.User, hasher),
            new UserAccount("UDEMO0004", "user2", "User@12345", Role.User, hasher));
        var drugs = new List<Drug>();
        for (var i = 0; i < 500; i++)
        {
            var drug = new Drug($"LOAD{i:D4}", $"Thuốc đo tải {i:D4}", "Viên", 1000 + i, 10);
            var days = new[] { -1, 0, 30, 31 };
            for (var batch = 0; batch < 4; batch++)
            {
                drug.AddBatch(new DrugBatch($"LB{i:D4}{batch}", drug.DrugId,
                    $"LOT{batch}", clock.Today.AddDays(days[batch]), 1000));
            }
            drugs.Add(drug);
        }
        db.Drugs.AddRange(drugs);
        for (var i = 0; i < 1000; i++)
        {
            var order = new Order($"DHLOAD{i:D4}", i % 2 == 0 ? "UDEMO0003" : "UDEMO0004",
                clock.Now.AddMinutes(-i), SaleKind.OTC, "Khách đo tải", "0900000000", ReceiveMethod.Pickup);
            for (var line = 0; line < 3; line++)
            {
                var drug = drugs[(i * 3 + line) % drugs.Count];
                order.AddItem(new OrderItem($"LI{i:D4}{line}", order.OrderId,
                    drug.DrugId, drug.Name, drug.SaleUnit, 2, drug.UnitPrice));
                if (i < 100)
                {
                    db.StockReservations.Add(new StockReservation($"LR{i:D4}{line}", order.OrderId, drug.DrugId, 2));
                }
            }
            db.Orders.Add(order);
        }
        db.CartItems.AddRange(drugs.Take(10).Select(x => new CartItem("UDEMO0003", x.DrugId, 2)));
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
