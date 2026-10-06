using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;

namespace Pharmacy.Tests;

public sealed class CatalogSeedTests
{
    [Fact]
    public async Task TC42_FreshSeed_HasNoPaymentSettings_OpeningQrRequiresAdminConfiguration()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-unconfigured-payment-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            using var client = factory.Client();
            Assert.Equal(0, await factory.WithDb(db => db.PaymentSettings.CountAsync()));
            Assert.False(Directory.Exists(Path.Combine(path + "-storage", "qr")));
            Assert.Equal(200, (int)(await client.Login("chuduc", "User@12345")).StatusCode);
            await client.Csrf();
            Assert.Equal(200, (int)(await client.PostAsJsonAsync("/api/cart/items", new
            {
                drugId = "PARA500",
                quantity = 1
            })).StatusCode);
            var order = await client.PostAsJsonAsync("/api/orders", new
            {
                saleKind = "OTC",
                receiverName = "Chu Đức",
                phone = "0900000000",
                receiveMethod = "Pickup",
                expectedTotal = 1000
            });
            Assert.Equal(201, (int)order.StatusCode);
            var id = (await order.Json()).GetProperty("orderId").GetString();
            var before = await factory.WithDb(PersistenceFixture.Snapshot);
            await (await client.PostAsync("/api/orders/" + id + "/payment", null)).Error(409, "PAYMENT_NOT_CONFIGURED");
            Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    private static JsonElement Catalog()
    {
        using var stream = typeof(DbSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data.Seed.catalog.json")!;
        return JsonSerializer.Deserialize<JsonElement>(stream);
    }

    [Fact]
    public async Task EmptySeed_Has56EmbeddedImages_ExactCatalogFields_AndPreservesLegacyBatches()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-empty-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            using var guest = factory.Client();
            var catalog = Catalog();
            var resources = typeof(DbSeeder).Assembly.GetManifestResourceNames();
            Assert.Equal(56, resources.Count(x => x.StartsWith("Pharmacy.Core.Data.Assets.drugs.") && x.EndsWith(".png")));
            await factory.WithDb(async db =>
            {
                var drugs = await db.Drugs.Include(x => x.Batches).ToListAsync();
                Assert.Equal(56, drugs.Count);
                Assert.Equal(56, drugs.Count(x => x.ImagePath == "drugs/" + x.DrugId + ".png"));
                foreach (var entry in catalog.GetProperty("drugs").EnumerateArray())
                {
                    var drug = drugs.Single(x => x.DrugId == entry.GetProperty("id").GetString());
                    Assert.Equal(entry.GetProperty("name").GetString(), drug.Name);
                    Assert.Equal(entry.GetProperty("unit").GetString(), drug.SaleUnit);
                    Assert.Equal(entry.GetProperty("price").GetDecimal(), drug.UnitPrice);
                    Assert.Equal(entry.GetProperty("threshold").GetInt32(), drug.LowStockThreshold);
                    Assert.Equal(entry.GetProperty("rx").GetBoolean(), drug.RequiresPrescription);
                    Assert.Equal(entry.GetProperty("controlled").GetBoolean(), drug.IsControlled);
                    Assert.Equal(entry.GetProperty("description").GetString(), drug.Description);
                    Assert.True(drug.IsForSale);
                    Assert.InRange(drug.Batches.Count, 2, 3);
                    foreach (var batch in drug.Batches)
                    {
                        Assert.InRange(batch.ExpiryDate.DayNumber - new TestClock().Today.DayNumber, 1, 540);
                        Assert.InRange(batch.InitialQuantity, 20, 200);
                        Assert.InRange(batch.Quantity, 1, batch.InitialQuantity);
                        Assert.Matches("^L26[0-9]{3}$", batch.BatchNumber);
                        Assert.Matches("^B[A-Z0-9]{8}$", batch.BatchId);
                    }
                }
                var legacyUnits = new[] { "Viên", "Hộp", "Chai", "Gói", "Vỉ", "Hộp", "Viên", "Vỉ", "Hộp", "Viên", "Viên", "Tuýp" };
                var legacyIds = new[] { "PARA500", "VITC500", "NACL09", "ORESOL", "CETI10", "ZINC10", "AMOX500", "CEFI200", "METF500", "AMLO5", "DIAZ5", "HYDRO1" };
                for (var index = 0; index < 12; index++)
                {
                    var id = legacyIds[index];
                    var drug = drugs.Single(x => x.DrugId == id);
                    Assert.Equal(catalog.GetProperty("legacyImages").GetProperty(id).GetProperty("name").GetString(), drug.Name);
                    Assert.Equal(legacyUnits[index], drug.SaleUnit);
                    Assert.Equal(1000 * (index + 1), drug.UnitPrice);
                    Assert.Equal(index == 9 ? 8 : 10, drug.LowStockThreshold);
                    Assert.Equal(index >= 6, drug.RequiresPrescription);
                    Assert.Equal(index == 10, drug.IsControlled);
                    Assert.Equal(index != 11, drug.IsForSale);
                    var days = new[] { -5, 0, 1, 20, 30, 31 };
                    var hasBatches = index < 10 && index != 1;
                    Assert.Equal(hasBatches ? 6 : 0, drug.Batches.Count);
                    if (hasBatches)
                    {
                        for (var j = 0; j < days.Length; j++)
                        {
                            var batch = drug.Batches.Single(x => x.BatchNumber == $"LOT{j + 1:D2}");
                            Assert.Equal($"B{index:D4}{j:D4}", batch.BatchId);
                            Assert.Equal(new TestClock().Today.AddDays(days[j]), batch.ExpiryDate);
                            Assert.Equal(index == 9 ? 2 : 20, batch.Quantity);
                            Assert.Equal(batch.Quantity, batch.InitialQuantity);
                        }
                    }
                }
            });
            var imageDirectory = Path.Combine(path + "-storage", "drugs");
            Assert.Equal(56, Directory.GetFiles(imageDirectory, "*.png").Length);
            foreach (var file in Directory.GetFiles(imageDirectory, "*.png"))
            {
                using var source = typeof(DbSeeder).Assembly.GetManifestResourceStream(
                    "Pharmacy.Core.Data.Assets.drugs." + Path.GetFileName(file))!;
                using var expected = new MemoryStream();
                await source.CopyToAsync(expected);
                Assert.Equal(expected.ToArray(), await File.ReadAllBytesAsync(file));
            }
            var list = await (await guest.GetAsync("/api/products?pageSize=100")).Json();
            Assert.Equal(55, list.GetProperty("total").GetInt32());
            foreach (var item in list.GetProperty("items").EnumerateArray())
            {
                var url = item.GetProperty("imageUrl").GetString();
                Assert.Equal("/api/files/drugs/" + item.GetProperty("drugId").GetString() + ".png", url);
                Assert.Equal(200, (int)(await guest.GetAsync(url)).StatusCode);
            }
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    [Fact]
    public async Task ExistingDatabase_ImportOnlyAddsMissingDrugsAndImages_ThenIsIdempotent()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-existing-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            await factory.WithDb(async db =>
            {
                await PersistenceFixture.AddBusinessData(db);
                var ids = Catalog().GetProperty("drugs").EnumerateArray()
                    .Select(x => x.GetProperty("id").GetString()!).Where(x => x != "IBU400").ToList();
                db.DrugBatches.RemoveRange(await db.DrugBatches.Where(x => ids.Contains(x.DrugId)).ToListAsync());
                db.Drugs.RemoveRange(await db.Drugs.Where(x => ids.Contains(x.DrugId)).ToListAsync());
                var existing = await db.Drugs.SingleAsync(x => x.DrugId == "IBU400");
                existing.Update("Thuốc người dùng đã sửa", "Hộp", 9999, 77, true, false, false, "Mô tả riêng");
                existing.SetImage("drugs/custom.png");
                db.Entry(await db.Drugs.SingleAsync(x => x.DrugId == "PARA500")).Property(x => x.ImagePath).CurrentValue = null;
                await db.SaveChangesAsync();
            });
            var customFile = Path.Combine(path + "-storage", "drugs", "PARA500.png");
            await File.AppendAllTextAsync(customFile, "PRESERVE CUSTOM IMAGE");
            var image = await File.ReadAllBytesAsync(customFile);
            var before = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(await factory.WithDb(PersistenceFixture.Snapshot))!;
            var existingBatchRows = before["DrugBatches"].ToList();
            var result = await factory.WithDb(db => new CatalogSeeder(db, new TestClock(), new(path + "-storage")).SeedAsync());
            Assert.Equal(new CatalogSeedResult(43, 100, 44, 0), result);
            var after = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(await factory.WithDb(PersistenceFixture.Snapshot))!;
            foreach (var table in before.Keys.Where(x => x is not ("Drugs" or "DrugBatches")))
            {
                Assert.Equal(before[table], after[table]);
            }
            Assert.All(existingBatchRows, row => Assert.Contains(row, after["DrugBatches"]));
            await factory.WithDb(async db =>
            {
                var existing = await db.Drugs.SingleAsync(x => x.DrugId == "IBU400");
                Assert.Equal("Thuốc người dùng đã sửa", existing.Name);
                Assert.Equal("Hộp", existing.SaleUnit);
                Assert.Equal(9999, existing.UnitPrice);
                Assert.Equal(77, existing.LowStockThreshold);
                Assert.True(existing.RequiresPrescription);
                Assert.False(existing.IsForSale);
                Assert.Equal("Mô tả riêng", existing.Description);
                Assert.Equal("drugs/custom.png", existing.ImagePath);
                Assert.Equal("drugs/PARA500.png", (await db.Drugs.SingleAsync(x => x.DrugId == "PARA500")).ImagePath);
            });
            Assert.Equal(image, await File.ReadAllBytesAsync(customFile));
            var snapshot = await factory.WithDb(PersistenceFixture.Snapshot);
            var repeated = await factory.WithDb(db => new CatalogSeeder(db,
                new TestClock { Today = new(2027, 1, 1) }, new(path + "-storage")).SeedAsync());
            Assert.Equal(new CatalogSeedResult(0, 0, 0, 0), repeated);
            Assert.Equal(snapshot, await factory.WithDb(PersistenceFixture.Snapshot));
            Assert.Equal(image, await File.ReadAllBytesAsync(customFile));
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    [Fact]
    public async Task Command_ImportsAndExitsWithoutServer_SecondRunReportsZero()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-command-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            await factory.WithDb(async db =>
            {
                db.DrugBatches.RemoveRange(await db.DrugBatches.Where(x => x.DrugId == "IBU400").ToListAsync());
                db.Drugs.Remove(await db.Drugs.SingleAsync(x => x.DrugId == "IBU400"));
                await db.SaveChangesAsync();
            });
            async Task<string> Run()
            {
                var start = new ProcessStartInfo("dotnet")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = System.Text.Encoding.UTF8,
                    StandardErrorEncoding = System.Text.Encoding.UTF8,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = Path.GetTempPath()
                };
                start.ArgumentList.Add(typeof(Program).Assembly.Location);
                start.ArgumentList.Add("--seed-catalog");
                start.ArgumentList.Add("--contentRoot");
                start.ArgumentList.Add(Path.GetTempPath());
                start.Environment["Database__Provider"] = "Sqlite";
                start.Environment["ConnectionStrings__Default"] = "Data Source=" + path + ";Pooling=False";
                start.Environment["Storage__Root"] = path + "-storage";
                start.Environment["DataProtection__KeyPath"] = path + "-keys";
                start.Environment["BusinessDate__Override"] = "2026-10-06";
                start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
                using var process = Process.Start(start)!;
                var output = process.StandardOutput.ReadToEndAsync();
                var error = process.StandardError.ReadToEndAsync();
                try
                {
                    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                    await process.WaitForExitAsync(timeout.Token);
                    Assert.True(process.ExitCode == 0, await error);
                    var text = await output;
                    Assert.DoesNotContain("Now listening", text);
                    return text;
                }
                finally
                {
                    if (!process.HasExited)
                    {
                        process.Kill(entireProcessTree: true);
                    }
                }
            }
            Assert.Contains("thêm 1 thuốc, 3 lô, gắn 1 ảnh", await Run());
            var snapshot = await factory.WithDb(PersistenceFixture.Snapshot);
            Assert.Contains("thêm 0 thuốc, 0 lô, gắn 0 ảnh", await Run());
            Assert.Equal(snapshot, await factory.WithDb(PersistenceFixture.Snapshot));
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    [Fact]
    public async Task FreshSeeds_AreDeterministic_ReportsIncludeNewLowStockAndExpiringDrugs()
    {
        var firstPath = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-first-" + Guid.NewGuid() + ".db");
        var secondPath = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-second-" + Guid.NewGuid() + ".db");
        try
        {
            using var first = new ApiFactory(firstPath);
            using var second = new ApiFactory(secondPath);
            async Task<string> Snapshot(ApiFactory factory)
                => await factory.WithDb(async db => JsonSerializer.Serialize(
                    (await db.DrugBatches.AsNoTracking().ToListAsync()).OrderBy(x => x.BatchId)));
            Assert.Equal(await Snapshot(first), await Snapshot(second));
            using var staff = first.Client();
            Assert.Equal(200, (int)(await staff.Login("staff", "Staff@12345")).StatusCode);
            var ids = Catalog().GetProperty("drugs").EnumerateArray()
                .Select(x => x.GetProperty("id").GetString()!).ToHashSet();
            var low = await (await staff.GetAsync("/api/reports/low-stock")).Json();
            var expiring = await (await staff.GetAsync("/api/reports/expiring?days=30")).Json();
            Assert.Equal(4, low.EnumerateArray().Count(x => ids.Contains(x.GetProperty("drugId").GetString()!)));
            Assert.Equal(6, expiring.EnumerateArray().Count(x => ids.Contains(x.GetProperty("drugId").GetString()!)));
        }
        finally
        {
            ApiFactory.Cleanup(firstPath);
            ApiFactory.Cleanup(secondPath);
        }
    }
}
