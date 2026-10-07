using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

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
    public async Task EmptySeed_Has20RealProductsImagesReportingStockAndPrescriptions()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-empty-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path, productionSeed: true);
            using var guest = factory.Client();
            var catalog = Catalog();
            Assert.Equal(20, typeof(DbSeeder).Assembly.GetManifestResourceNames()
                .Count(x => x.StartsWith("Pharmacy.Core.Data.Assets.drugs.") && x.EndsWith(".png")));
            await factory.WithDb(async db =>
            {
                var drugs = await db.Drugs.Include(x => x.Batches).ToListAsync();
                var today = new TestClock().Today;
                Assert.Equal(20, drugs.Count);
                Assert.Equal(47, drugs.Sum(x => x.Batches.Count));
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
                    Assert.Equal("drugs/" + drug.DrugId + ".png", drug.ImagePath);
                    Assert.InRange(drug.Batches.Count, 2, 3);
                    Assert.All(drug.Batches, batch =>
                    {
                        Assert.InRange(batch.InitialQuantity, 20, 200);
                        Assert.InRange(batch.Quantity, 0, batch.InitialQuantity);
                        var offset = batch.ExpiryDate.DayNumber - today.DayNumber;
                        Assert.True(offset == -5 || offset is >= 1 and <= 30 || offset is >= 60 and <= 540);
                        Assert.Matches("^L26[0-9]{3}$", batch.BatchNumber);
                    });
                }
                Assert.Equal(new[] { "ATILENE", "PRUZENA" },
                    drugs.Where(x => x.RequiresPrescription).Select(x => x.DrugId).Order().ToArray());
                Assert.Equal(2, drugs.Count(x => x.GetAvailableQuantity(today) > 0
                    && x.GetAvailableQuantity(today) <= x.LowStockThreshold));
                Assert.Single(drugs, x => x.GetAvailableQuantity(today) == 0);
                Assert.Single(drugs.SelectMany(x => x.Batches), x => x.ExpiryDate == today.AddDays(-5));
                Assert.Contains(drugs.SelectMany(x => x.Batches),
                    x => x.Quantity > 0 && x.ExpiryDate > today && x.ExpiryDate <= today.AddDays(30));
                Assert.Equal(new[] { "admin", "chuduc", "nguyenvana", "staff" },
                    (await db.UserAccounts.Select(x => x.Username).ToListAsync()).Order().ToArray());
                Assert.Empty(await db.PaymentSettings.ToListAsync());
                var prescriptions = await db.Prescriptions.Include(x => x.Items).ToListAsync();
                Assert.Equal(3, prescriptions.Count);
                var approved = Assert.Single(prescriptions, x => x.Validate("BN001", today));
                Assert.Equal("U0000003", approved.OwnerUserId);
                Assert.Equal("Chu Đức", approved.PatientName);
                Assert.Equal("BS. Nguyễn Văn Minh", approved.PrescriberName);
                Assert.Equal(3, approved.Items.Single(x => x.DrugId == "PRUZENA").PrescribedQuantity);
                Assert.Equal(2, approved.Items.Single(x => x.DrugId == "ATILENE").PrescribedQuantity);
                Assert.Contains(prescriptions, x => x.ValidUntil < today);
                Assert.Contains(prescriptions, x => x.Status == PrescriptionStatus.PendingReview);
            });
            var files = Directory.GetFiles(Path.Combine(path + "-storage", "drugs"), "*.png");
            Assert.Equal(20, files.Length);
            foreach (var file in files)
            {
                using var source = typeof(DbSeeder).Assembly.GetManifestResourceStream(
                    "Pharmacy.Core.Data.Assets.drugs." + Path.GetFileName(file))!;
                using var expected = new MemoryStream();
                await source.CopyToAsync(expected);
                Assert.Equal(expected.ToArray(), await File.ReadAllBytesAsync(file));
            }
            var list = await (await guest.GetAsync("/api/products?pageSize=100")).Json();
            Assert.Equal(20, list.GetProperty("total").GetInt32());
            foreach (var item in list.GetProperty("items").EnumerateArray())
            {
                var url = item.GetProperty("imageUrl").GetString();
                Assert.Equal("/api/files/drugs/" + item.GetProperty("drugId").GetString() + ".png", url);
                Assert.Equal(200, (int)(await guest.GetAsync(url)).StatusCode);
            }
            Assert.Contains(list.GetProperty("items").EnumerateArray(),
                x => !x.GetProperty("inStock").GetBoolean());
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }

    [Fact]
    public async Task ExistingDatabase_ImportOnlyAddsMissingDrugsBatchesAndImages_ThenIsIdempotent()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-existing-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            await factory.WithDb(async db =>
            {
                await PersistenceFixture.AddBusinessData(db);
                var drug = new Drug("DECUMAR", "Thuốc người dùng đã sửa", "Hộp", 9999, 77,
                    true, false, false, "Mô tả riêng");
                db.Drugs.Add(drug);
                await db.SaveChangesAsync();
            });
            var customFile = Path.Combine(path + "-storage", "drugs", "DECUMAR.png");
            await File.WriteAllBytesAsync(customFile, TestImage.Bytes);
            var image = await File.ReadAllBytesAsync(customFile);
            var before = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(
                await factory.WithDb(PersistenceFixture.Snapshot))!;
            var result = await factory.WithDb(db => new CatalogSeeder(db, new TestClock(),
                new(path + "-storage")).SeedAsync());
            Assert.Equal(new CatalogSeedResult(19, 47, 20, 19), result);
            var after = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(
                await factory.WithDb(PersistenceFixture.Snapshot))!;
            foreach (var table in before.Keys.Where(x => x is not ("Drugs" or "DrugBatches")))
            {
                Assert.Equal(before[table], after[table]);
            }
            Assert.All(before["DrugBatches"], row => Assert.Contains(row, after["DrugBatches"]));
            Assert.All(before["Drugs"].Where(row => !row.Contains("DECUMAR")),
                row => Assert.Contains(row, after["Drugs"]));
            await factory.WithDb(async db =>
            {
                var drug = await db.Drugs.SingleAsync(x => x.DrugId == "DECUMAR");
                Assert.Equal("Thuốc người dùng đã sửa", drug.Name);
                Assert.Equal("Hộp", drug.SaleUnit);
                Assert.Equal(9999, drug.UnitPrice);
                Assert.Equal(77, drug.LowStockThreshold);
                Assert.True(drug.RequiresPrescription);
                Assert.False(drug.IsForSale);
                Assert.Equal("Mô tả riêng", drug.Description);
                Assert.Equal("drugs/DECUMAR.png", drug.ImagePath);
            });
            Assert.Equal(image, await File.ReadAllBytesAsync(customFile));
            var snapshot = await factory.WithDb(PersistenceFixture.Snapshot);
            Assert.Equal(new CatalogSeedResult(0, 0, 0, 0), await factory.WithDb(db =>
                new CatalogSeeder(db, new TestClock { Today = new(2027, 1, 1) },
                    new(path + "-storage")).SeedAsync()));
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
            using var factory = new ApiFactory(path, productionSeed: true);
            await factory.WithDb(async db =>
            {
                db.DrugBatches.RemoveRange(await db.DrugBatches.Where(x => x.DrugId == "DECUMAR").ToListAsync());
                db.Drugs.Remove(await db.Drugs.SingleAsync(x => x.DrugId == "DECUMAR"));
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
    public async Task FreshSeeds_AreDeterministic_ReportsIncludeLowStockAndExpiringProducts()
    {
        var firstPath = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-first-" + Guid.NewGuid() + ".db");
        var secondPath = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-second-" + Guid.NewGuid() + ".db");
        try
        {
            using var first = new ApiFactory(firstPath, productionSeed: true);
            using var second = new ApiFactory(secondPath, productionSeed: true);
            async Task<string> Snapshot(ApiFactory factory)
                => await factory.WithDb(async db => JsonSerializer.Serialize(
                    (await db.DrugBatches.AsNoTracking().ToListAsync()).OrderBy(x => x.BatchId)));
            Assert.Equal(await Snapshot(first), await Snapshot(second));
            using var staff = first.Client();
            Assert.Equal(200, (int)(await staff.Login("staff", "Staff@12345")).StatusCode);
            var low = await (await staff.GetAsync("/api/reports/low-stock")).Json();
            var expiring = await (await staff.GetAsync("/api/reports/expiring?days=30")).Json();
            Assert.Equal(3, low.GetArrayLength());
            Assert.Equal(4, expiring.GetArrayLength());
        }
        finally
        {
            ApiFactory.Cleanup(firstPath);
            ApiFactory.Cleanup(secondPath);
        }
    }
}
