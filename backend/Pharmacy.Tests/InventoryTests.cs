using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Services;

namespace Pharmacy.Tests;

public sealed class InventoryTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), "pharmacy-inventory-" + Guid.NewGuid() + ".db");
    private readonly ApiFactory factory;

    public InventoryTests() => factory = new(path);

    public void Dispose()
    {
        factory.Dispose();
        ApiFactory.Cleanup(path);
    }

    private async Task<HttpClient> Staff(bool admin = false)
    {
        var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.Login(admin ? "admin" : "staff", admin ? "Admin@12345" : "Staff@12345")).StatusCode);
        await client.Csrf();
        return client;
    }

    private async Task<T> Inventory<T>(Func<InventoryService, Task<T>> action)
    {
        using var scope = factory.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<InventoryService>());
    }

    [Fact]
    public async Task TC14_AddValidBatch_IncreasesStock_AndReturnsContractDto()
    {
        using var client = await Staff(true);
        var before = await (await client.GetAsync("/api/inventory/DEMO02")).Json();
        var added = await client.PostAsJsonAsync("/api/admin/drugs/DEMO02/batches", new
        {
            batchNumber = "  FRESH  ",
            expiryDate = "2026-10-07",
            quantity = 9
        });
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        var batch = await added.Json();
        Assert.Matches("^B[A-F0-9]{8}$", batch.GetProperty("batchId").GetString()!);
        Assert.Equal("FRESH", batch.GetProperty("batchNumber").GetString());
        Assert.Equal(9, batch.GetProperty("initialQuantity").GetInt32());
        Assert.False(batch.GetProperty("isExpired").GetBoolean());
        var after = await (await client.GetAsync("/api/inventory/DEMO02")).Json();
        Assert.Equal(before.GetProperty("totalQuantity").GetInt32() + 9, after.GetProperty("totalQuantity").GetInt32());
        Assert.Equal(9, after.GetProperty("availableQuantity").GetInt32());
    }

    [Fact]
    public async Task TC15_DuplicateBatch_IsRejected_AndUniquenessIsPerDrug()
    {
        using var client = await Staff(true);
        var body = new
        {
            batchNumber = "FRESH",
            expiryDate = "2026-11-01",
            quantity = 2
        };
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/admin/drugs/DEMO02/batches", body)).StatusCode);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await client.PostAsJsonAsync("/api/admin/drugs/DEMO02/batches", body)).Error(409, "DUPLICATE", "batchNumber");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/admin/drugs/DEMO11/batches", body)).StatusCode);
        await (await client.PostAsJsonAsync("/api/admin/drugs/MISSING/batches", body)).Error(404, "NOT_FOUND");
    }

    [Theory]
    [InlineData("2026-10-06", "1", "expiryDate")]
    [InlineData("2026-10-05", "1", "expiryDate")]
    [InlineData("bad-date", "1", "expiryDate")]
    [InlineData("2026-11-01", "0", "quantity")]
    [InlineData("2026-11-01", "-1", "quantity")]
    [InlineData("2026-11-01", "1.5", "quantity")]
    public async Task TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock(string expiryDate, string quantity, string field)
    {
        using var client = await Staff(true);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var input = new Dictionary<string, object>
        {
            ["batchNumber"] = "INVALID",
            ["expiryDate"] = expiryDate,
            ["quantity"] = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(quantity)
        };
        await (await client.PostAsJsonAsync("/api/admin/drugs/PARA500/batches", input)).Error(400, "VALIDATION_FAILED", field);
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC16_InventoryCountsExpiryAndReservations_ReleaseDoesNotDeductStock()
    {
        using var client = await Staff();
        await factory.WithDb(async db =>
        {
            await CatalogInventoryFixture.Seed(db);
            db.Orders.Add(CatalogInventoryFixture.Order("DH2610069001", ("M2STOCK", 3)));
            await db.SaveChangesAsync();
        });
        var first = await Inventory(s => s.Reserve("DH2610069001"));
        var repeated = await Inventory(s => s.Reserve("DH2610069001"));
        Assert.Equal(first[0].ReservationId, repeated[0].ReservationId);
        var detail = await (await client.GetAsync("/api/inventory/M2STOCK")).Json();
        Assert.Equal(33, detail.GetProperty("totalQuantity").GetInt32());
        Assert.Equal(23, detail.GetProperty("unexpiredQuantity").GetInt32());
        Assert.Equal(3, detail.GetProperty("reservedQuantity").GetInt32());
        Assert.Equal(20, detail.GetProperty("availableQuantity").GetInt32());
        var ordered = detail.GetProperty("batches").EnumerateArray().Select(x => (
            x.GetProperty("expiryDate").GetString(), x.GetProperty("batchNumber").GetString())).ToList();
        Assert.Equal(ordered.OrderBy(x => x.Item1).ThenBy(x => x.Item2, StringComparer.Ordinal), ordered);
        Assert.Equal(2, detail.GetProperty("batches").EnumerateArray().Count(x => x.GetProperty("isExpired").GetBoolean()));
        Assert.Equal(1, await Inventory(s => s.Release("DH2610069001")));
        Assert.Equal(0, await Inventory(s => s.Release("DH2610069001")));
        detail = await (await client.GetAsync("/api/inventory/M2STOCK")).Json();
        Assert.Equal(33, detail.GetProperty("totalQuantity").GetInt32());
        Assert.Equal(23, detail.GetProperty("availableQuantity").GetInt32());
        var list = await (await client.GetAsync("/api/inventory?search=m2stock&pageSize=1")).Json();
        Assert.Equal(1, list.GetProperty("total").GetInt32());
        Assert.Single(list.GetProperty("items").EnumerateArray());
    }

    [Theory]
    [InlineData(false, 401, "UNAUTHENTICATED")]
    [InlineData(true, 403, "FORBIDDEN")]
    public async Task TC17_GuestAndUser_CannotReadInventoryOrReports(bool login, int status, string code)
    {
        using var client = factory.Client();
        if (login)
        {
            Assert.Equal(HttpStatusCode.OK, (await client.Login("user", "User@12345")).StatusCode);
        }
        foreach (var url in new[] { "/api/inventory", "/api/inventory/PARA500", "/api/reports/low-stock", "/api/reports/expiring" })
        {
            await (await client.GetAsync(url)).Error(status, code);
        }
    }

    [Fact]
    public async Task TC18_ServiceDeduct_UsesFefo_MergesLines_AndRollsBackOnFailure()
    {
        using var client = factory.Client();
        await factory.WithDb(CatalogInventoryFixture.Seed);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var plan = await Inventory(s => s.AllocateFEFO([new("M2STOCK", 9)]));
        Assert.Equal(new[] { "NEXT", "A", "Z" }, plan.Select(x => x.BatchNumber));
        Assert.Equal(new[] { 4, 3, 2 }, plan.Select(x => x.Quantity));
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        var error = await Assert.ThrowsAsync<BusinessException>(() => Inventory(s => s.Deduct([new("M2STOCK", 1), new("M2ZERO", 1)])));
        Assert.Equal("INSUFFICIENT_STOCK", error.Code);
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        await Assert.ThrowsAsync<InvalidOperationException>(() => Inventory<int>(s => s.Execute<int>(async session =>
        {
            await session.Deduct([new("M2STOCK", 1)]);
            throw new InvalidOperationException("Failure after stock write");
        })));
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        var allocations = await Inventory(s => s.Deduct([new("M2STOCK", 4), new("M2STOCK", 5)]));
        Assert.Equal(9, allocations.Sum(x => x.Quantity));
        Assert.Equal(new[] { "NEXT", "A", "Z" }, allocations.Select(x => x.BatchNumber));
        Assert.Equal(24, await factory.WithDb(db => db.DrugBatches.Where(x => x.DrugId == "M2STOCK").SumAsync(x => x.Quantity)));
    }

    [Fact]
    public async Task TC18_ReservedStock_IsProtectedAndConsumedOnlyByItsOrder()
    {
        using var client = factory.Client();
        await factory.WithDb(async db =>
        {
            await CatalogInventoryFixture.Seed(db);
            db.Orders.Add(CatalogInventoryFixture.Order("DH2610069001", ("M2LOW", 5)));
            await db.SaveChangesAsync();
        });
        await Inventory(s => s.Reserve("DH2610069001"));
        await Assert.ThrowsAsync<BusinessException>(() => Inventory(s => s.Deduct([new("M2LOW", 1)])));
        await factory.WithDb(async db =>
        {
            (await db.Orders.SingleAsync(x => x.OrderId == "DH2610069001")).MarkPreparing();
            await db.SaveChangesAsync();
        });
        await Inventory(s => s.Deduct([new("M2LOW", 5)], "DH2610069001"));
        Assert.Equal(ReservationStatus.Consumed, await factory.WithDb(async db => (await db.StockReservations.SingleAsync(x => x.OrderId == "DH2610069001")).Status));
        Assert.Equal(0, await factory.WithDb(db => db.DrugBatches.Where(x => x.DrugId == "M2LOW").SumAsync(x => x.Quantity)));
        await Assert.ThrowsAsync<BusinessException>(() => Inventory(s => s.Deduct([new("M2LOW", 5)], "DH2610069001")));
    }

    [Fact]
    public async Task TC19_ServiceDeduct_ExcludesD_UsesDPlusOne()
    {
        using var client = factory.Client();
        await factory.WithDb(CatalogInventoryFixture.Seed);
        var allocations = await Inventory(s => s.Deduct([new("M2STOCK", 4)]));
        Assert.Single(allocations);
        Assert.Equal("M2-NEXT", allocations[0].BatchId);
        Assert.Equal(3, await factory.WithDb(async db => (await db.DrugBatches.SingleAsync(x => x.BatchId == "M2-D")).Quantity));
    }

    [Fact]
    public async Task TC22_ExpiringReport_UsesOpenClosedDayWindow_AndDoesNotWrite()
    {
        using var client = await Staff();
        await factory.WithDb(CatalogInventoryFixture.Seed);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var rows = (await (await client.GetAsync("/api/reports/expiring")).Json()).EnumerateArray().ToList();
        var fixtureRows = rows.Where(x => x.GetProperty("drugId").GetString() == "M2STOCK").ToList();
        Assert.Equal(new[] { "M2-NEXT", "M2-A", "M2-Z", "M2-30" }, fixtureRows.Select(x => x.GetProperty("batchId").GetString()));
        Assert.All(rows, row => Assert.InRange(row.GetProperty("daysRemaining").GetInt32(), 1, 30));
        var tomorrow = (await (await client.GetAsync("/api/reports/expiring?days=1")).Json()).EnumerateArray();
        Assert.All(tomorrow, row => Assert.Equal(1, row.GetProperty("daysRemaining").GetInt32()));
        foreach (var value in new[] { "0", "-1", "1.5", "bad" })
        {
            await (await client.GetAsync("/api/reports/expiring?days=" + value)).Error(400, "VALIDATION_FAILED", "days");
        }
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC23_LowStockReport_IncludesEqualityAndZero_ExcludesAboveThreshold()
    {
        using var client = await Staff(true);
        await factory.WithDb(CatalogInventoryFixture.Seed);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var rows = (await (await client.GetAsync("/api/reports/low-stock")).Json()).EnumerateArray().ToList();
        var ids = rows.Select(x => x.GetProperty("drugId").GetString()).ToList();
        Assert.Contains("M2LOW", ids);
        Assert.Contains("M2ZERO", ids);
        Assert.DoesNotContain("M2HIGH", ids);
        var order = rows.Select(x => (x.GetProperty("availableQuantity").GetInt32(), x.GetProperty("drugId").GetString())).ToList();
        Assert.Equal(order.OrderBy(x => x.Item1).ThenBy(x => x.Item2, StringComparer.Ordinal), order);
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC16_PrescriptionReservations_ProtectQuota_AndReleaseBothLimits()
    {
        using var client = factory.Client();
        await factory.WithDb(async db =>
        {
            foreach (var entry in new[] { ("DH2610069001", 25), ("DH2610069002", 7) })
            {
                var order = new Order(entry.Item1, "UDEMO0003", new TestClock().Now,
                    SaleKind.Prescription, "Khách demo", "0900000000", ReceiveMethod.Pickup,
                    prescriptionId: "DT2610060001", patientId: "BN001");
                order.AddItem(new(entry.Item1 + "LINE", order.OrderId, "DEMO07", "Amoxicillin", "Viên", entry.Item2, 7000));
                db.Orders.Add(order);
            }
            await db.SaveChangesAsync();
        });
        await Inventory(s => s.Reserve("DH2610069001"));
        var error = await Assert.ThrowsAsync<BusinessException>(() => Inventory(s => s.Reserve("DH2610069002")));
        Assert.Equal("PRESCRIPTION_INVALID", error.Code);
        Assert.Equal(1, await Inventory(s => s.Release("DH2610069001")));
        var second = await Inventory(s => s.Reserve("DH2610069002"));
        Assert.Equal("PITEM0", second[0].PrescriptionItemId);
        Assert.Equal(0, await factory.WithDb(async db => (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).DispensedQuantity));
    }

    [Fact]
    public async Task TC18_ConcurrentDeduct_RefreshesStaleContexts_AndNeverOverdraws()
    {
        using var client = factory.Client();
        await factory.WithDb(CatalogInventoryFixture.Seed);
        using var first = factory.Services.CreateScope();
        using var second = factory.Services.CreateScope();
        foreach (var scope in new[] { first, second })
        {
            await scope.ServiceProvider.GetRequiredService<Pharmacy.Core.Data.PharmacyDbContext>()
                .DrugBatches.SingleAsync(x => x.BatchId == "M2-LOW");
        }
        var results = await Task.WhenAll(new[] { first, second }.Select(scope => Task.Run(async () =>
        {
            try
            {
                await scope.ServiceProvider.GetRequiredService<InventoryService>().Deduct([new("M2LOW", 5)]);
                return "SUCCESS";
            }
            catch (BusinessException error)
            {
                return error.Code;
            }
        })));
        Assert.Single(results, x => x == "SUCCESS");
        Assert.Single(results, x => x == "INSUFFICIENT_STOCK");
        Assert.Equal(0, await factory.WithDb(async db => (await db.DrugBatches.SingleAsync(x => x.BatchId == "M2-LOW")).Quantity));
    }

    [Fact]
    public async Task TC16_ConcurrentReserve_LastStockIsNotOverbooked()
    {
        using var client = factory.Client();
        await factory.WithDb(async db =>
        {
            await CatalogInventoryFixture.Seed(db);
            db.Orders.Add(CatalogInventoryFixture.Order("DH2610069001", ("M2LOW", 5)));
            db.Orders.Add(CatalogInventoryFixture.Order("DH2610069002", ("M2LOW", 5)));
            await db.SaveChangesAsync();
        });
        var attempts = await Task.WhenAll(new[] { "DH2610069001", "DH2610069002" }.Select(async id =>
        {
            try
            {
                await Inventory(s => s.Reserve(id));
                return "SUCCESS";
            }
            catch (BusinessException e)
            {
                return e.Code;
            }
        }));
        Assert.Single(attempts, x => x == "SUCCESS");
        Assert.Single(attempts, x => x == "INSUFFICIENT_STOCK");
        Assert.Equal(5, await factory.WithDb(db => db.StockReservations.Where(x => x.DrugId == "M2LOW" && x.Status == ReservationStatus.Active).SumAsync(x => x.Quantity)));
    }
}
