using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class Week4IntegrationTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), "pharmacy-week4-" + Guid.NewGuid() + ".db");
    private ApiFactory factory;

    public Week4IntegrationTests() => factory = new(path);

    public void Dispose()
    {
        factory.Dispose();
        ApiFactory.Cleanup(path);
    }

    private async Task<HttpClient> Login(string name)
    {
        var client = factory.Client();
        var response = await client.Login(name, name == "admin" ? "Admin@12345" : "Staff@12345");
        Assert.Equal(200, (int)response.StatusCode);
        await client.Csrf();
        return client;
    }

    private static async Task<JsonElement> Ok(HttpResponseMessage response, int status = 200)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True((int)response.StatusCode == status, body);
        return JsonSerializer.Deserialize<JsonElement>(body);
    }

    private static async Task AddDrug(HttpClient admin, string id, bool controlled = false)
        => await Ok(await admin.PostAsJsonAsync("/api/admin/drugs", new
        {
            drugId = id,
            name = "Week 4 integration drug",
            saleUnit = "unit",
            unitPrice = 2500,
            lowStockThreshold = 4,
            requiresPrescription = controlled,
            isControlled = controlled,
            isForSale = true
        }), 201);

    private static async Task AddBatch(HttpClient admin, string id, string number, DateOnly expiry, int quantity)
        => await Ok(await admin.PostAsJsonAsync($"/api/admin/drugs/{id}/batches", new
        {
            batchNumber = number,
            expiryDate = expiry,
            quantity
        }), 201);

    private static async Task<string> Draft(HttpClient staff, string drugId, int quantity)
    {
        var created = await Ok(await staff.PostAsJsonAsync("/api/staff/sales", new { kind = "OTC" }), 201);
        var id = created.GetProperty("saleId").GetString()!;
        await Ok(await staff.PutAsJsonAsync($"/api/staff/sales/{id}", new
        {
            items = new[] { new { drugId, quantity } }
        }));
        return id;
    }

    [Fact]
    public async Task W4_01_CreateDrugAndBatches_Checkout_StockPriceReportsAndInvoiceAgree()
    {
        using var admin = await Login("admin");
        using var staff = await Login("staff");
        var date = new TestClock().Today;
        await AddDrug(admin, "W4OTC");
        await AddBatch(admin, "W4OTC", "FIRST", date.AddDays(1), 3);
        await AddBatch(admin, "W4OTC", "SECOND", date.AddDays(10), 5);
        var id = await Draft(staff, "W4OTC", 4);
        var checkout = await Ok(await staff.PostAsJsonAsync($"/api/staff/sales/{id}/checkout", new { cashReceived = true }));
        Assert.Equal("Completed", checkout.GetProperty("status").GetString());
        Assert.Equal(10000, checkout.GetProperty("totalAmount").GetDecimal());
        var invoiceId = checkout.GetProperty("invoiceId").GetString();
        var invoice = await Ok(await staff.GetAsync("/api/invoices/" + invoiceId));
        var line = Assert.Single(invoice.GetProperty("items").EnumerateArray());
        Assert.Equal(4, line.GetProperty("quantity").GetInt32());
        Assert.Equal(2500, line.GetProperty("unitPrice").GetDecimal());
        Assert.Equal(new[] { 3, 1 }, line.GetProperty("allocations").EnumerateArray().Select(x => x.GetProperty("quantity").GetInt32()));
        await factory.WithDb(async db =>
        {
            Assert.Equal(new[] { 0, 4 }, await db.DrugBatches.Where(x => x.DrugId == "W4OTC")
                .OrderBy(x => x.BatchNumber).Select(x => x.Quantity).ToArrayAsync());
            Assert.Equal(1, await db.Invoices.CountAsync());
        });
        var low = (await Ok(await staff.GetAsync("/api/reports/low-stock"))).EnumerateArray();
        Assert.Contains(low, x => x.GetProperty("drugId").GetString() == "W4OTC" && x.GetProperty("availableQuantity").GetInt32() == 4);
        var near = (await Ok(await staff.GetAsync("/api/reports/expiring?days=30"))).EnumerateArray();
        var batch = Assert.Single(near.Where(x => x.GetProperty("drugId").GetString() == "W4OTC"));
        Assert.Equal("SECOND", batch.GetProperty("batchNumber").GetString());
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync($"/api/staff/sales/{id}/checkout", new { cashReceived = true })).Error(409, "INVALID_STATE");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task W4_02_NewControlledDrugCannotBeSoldOtc_LeavesStockAndInvoicesUnchanged()
    {
        using var admin = await Login("admin");
        using var staff = await Login("staff");
        await AddDrug(admin, "W4CTRL", controlled: true);
        await AddBatch(admin, "W4CTRL", "VALID", new TestClock().Today.AddDays(10), 5);
        var id = await Draft(staff, "W4CTRL", 1);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync($"/api/staff/sales/{id}/checkout", new { cashReceived = true })).Error(409, "PRESCRIPTION_REQUIRED");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task W4_03_BatchExpiresAfterDraft_CheckoutRejectsAndPreservesDraftStockAndInvoiceState()
    {
        var date = new TestClock().Today;
        string id;
        using (var admin = await Login("admin"))
        using (var staff = await Login("staff"))
        {
            await AddDrug(admin, "W4EXP");
            await AddBatch(admin, "W4EXP", "TOMORROW", date.AddDays(1), 5);
            id = await Draft(staff, "W4EXP", 2);
        }
        factory.Dispose();
        factory = new(path, date.AddDays(2));
        using var restarted = await Login("staff");
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await restarted.PostAsJsonAsync($"/api/staff/sales/{id}/checkout", new { cashReceived = true })).Error(409, "INSUFFICIENT_STOCK");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
        Assert.Equal(SaleStatus.Draft, (await db.Sales.SingleAsync()).Status);
        Assert.Equal(5, await db.DrugBatches.Where(x => x.DrugId == "W4EXP").SumAsync(x => x.Quantity));
        Assert.Equal(0, await db.Invoices.CountAsync());
    }
}
