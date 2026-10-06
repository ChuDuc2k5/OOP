using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class CatalogTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), "pharmacy-catalog-" + Guid.NewGuid() + ".db");
    private readonly ApiFactory factory;

    public CatalogTests() => factory = new(path);

    public void Dispose()
    {
        factory.Dispose();
        ApiFactory.Cleanup(path);
    }

    private static object Input(string drugId = "NEWDRUG", bool controlled = false, bool requiresPrescription = false)
        => new
        {
            drugId,
            name = "Thuốc mới",
            description = "Mô tả tiếng Việt",
            saleUnit = "Chai",
            unitPrice = 12000,
            lowStockThreshold = 4,
            requiresPrescription,
            isControlled = controlled,
            isForSale = true
        };

    private async Task<HttpClient> Admin()
    {
        var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.Login("admin", "Admin@12345")).StatusCode);
        await client.Csrf();
        return client;
    }

    [Fact]
    public async Task TC09_GuestProducts_OmitPriceAndInternalData_ExcludeDisabledDrugs()
    {
        using var client = factory.Client();
        var json = await (await client.GetAsync("/api/products")).Json();
        Assert.Equal(55, json.GetProperty("total").GetInt32());
        foreach (var product in json.GetProperty("items").EnumerateArray())
        {
            Assert.False(product.TryGetProperty("unitPrice", out _));
            Assert.False(product.TryGetProperty("batches", out _));
            Assert.False(product.TryGetProperty("lowStockThreshold", out _));
            Assert.False(product.TryGetProperty("isForSale", out _));
            Assert.False(product.TryGetProperty("userId", out _));
        }
        var detail = await (await client.GetAsync("/api/products/PARA500")).Json();
        Assert.False(detail.TryGetProperty("unitPrice", out _));
        await (await client.GetAsync("/api/products/HYDRO1")).Error(404, "NOT_FOUND");
        await (await client.GetAsync("/api/products/MISSING")).Error(404, "NOT_FOUND");
        Assert.False((await (await client.GetAsync("/api/products/VITC500")).Json()).GetProperty("inStock").GetBoolean());
    }

    [Fact]
    public async Task TC09_InStock_UsesUnexpiredStockMinusActiveReservations()
    {
        using var client = factory.Client();
        await factory.WithDb(async db =>
        {
            await CatalogInventoryFixture.Seed(db);
            var order = CatalogInventoryFixture.Order("DH2610069001", ("M2STOCK", 23));
            db.Orders.Add(order);
            db.StockReservations.Add(new("M2RES", order.OrderId, "M2STOCK", 23));
            await db.SaveChangesAsync();
        });
        Assert.False((await (await client.GetAsync("/api/products/M2STOCK")).Json()).GetProperty("inStock").GetBoolean());
        await factory.WithDb(async db =>
        {
            (await db.StockReservations.SingleAsync(x => x.ReservationId == "M2RES")).Release();
            await db.SaveChangesAsync();
        });
        Assert.True((await (await client.GetAsync("/api/products/M2STOCK")).Json()).GetProperty("inStock").GetBoolean());
    }

    [Theory]
    [InlineData("chuduc", "User@12345")]
    [InlineData("staff", "Staff@12345")]
    [InlineData("admin", "Admin@12345")]
    public async Task TC10_AuthenticatedProducts_IncludePrice_UnicodeSearchAndPaginationWork(string username, string password)
    {
        using var client = factory.Client();
        await factory.WithDb(CatalogInventoryFixture.Seed);
        Assert.Equal(HttpStatusCode.OK, (await client.Login(username, password)).StatusCode);
        foreach (var term in new[] { "m2stock", "THUỐC THỬ" })
        {
            var json = await (await client.GetAsync("/api/products?search=" + Uri.EscapeDataString(term))).Json();
            Assert.Equal(1, json.GetProperty("total").GetInt32());
            Assert.Equal(2000, json.GetProperty("items")[0].GetProperty("unitPrice").GetDecimal());
        }
        Assert.Equal(0, (await (await client.GetAsync("/api/products?search=absent-name")).Json()).GetProperty("total").GetInt32());
        var page = await (await client.GetAsync("/api/products?page=2&pageSize=2")).Json();
        Assert.Equal(2, page.GetProperty("page").GetInt32());
        Assert.Equal(2, page.GetProperty("items").GetArrayLength());
        await (await client.GetAsync("/api/products?pageSize=101")).Error(400, "VALIDATION_FAILED", "pageSize");
    }

    [Fact]
    public async Task TC11_AdminCreatesUpdatesAndTogglesDrug_ValidatesFieldsAndDuplicates()
    {
        using var client = await Admin();
        var created = await client.PostAsJsonAsync("/api/admin/drugs", Input());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal("NEWDRUG", (await created.Json()).GetProperty("drugId").GetString());
        await (await client.PostAsJsonAsync("/api/admin/drugs", Input())).Error(409, "DUPLICATE", "drugId");
        await (await client.PostAsJsonAsync("/api/admin/drugs", Input("BADRX", true, false))).Error(400, "VALIDATION_FAILED", "requiresPrescription");
        var update = await client.PutAsJsonAsync("/api/admin/drugs/NEWDRUG", Input("IGNORED", true, true));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal("NEWDRUG", (await update.Json()).GetProperty("drugId").GetString());
        Assert.True((await update.Json()).GetProperty("isControlled").GetBoolean());
        var patch = await client.PatchAsJsonAsync("/api/admin/drugs/NEWDRUG/sale-status", new
        {
            isForSale = false
        });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        Assert.False((await patch.Json()).GetProperty("isForSale").GetBoolean());
        await (await client.GetAsync("/api/products/NEWDRUG")).Error(404, "NOT_FOUND");
        var adminView = await (await client.GetAsync("/api/admin/drugs/NEWDRUG")).Json();
        Assert.Equal("Mô tả tiếng Việt", adminView.GetProperty("description").GetString());
        var list = await (await client.GetAsync("/api/admin/drugs?search=newdrug")).Json();
        Assert.Equal(1, list.GetProperty("total").GetInt32());
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.DeleteAsync("/api/admin/drugs/NEWDRUG")).StatusCode);
        Assert.False(await factory.WithDb(db => db.Drugs.AnyAsync(x => x.DrugId == "BADRX")));
    }

    [Theory]
    [InlineData("name", "\" \"")]
    [InlineData("saleUnit", "\"\"")]
    [InlineData("unitPrice", "0")]
    [InlineData("unitPrice", "1.5")]
    [InlineData("lowStockThreshold", "-1")]
    [InlineData("lowStockThreshold", "1.5")]
    [InlineData("isForSale", "null")]
    public async Task TC11_InvalidDrugInput_ReturnsFieldErrors_WithoutWriting(string field, string value)
    {
        using var client = await Admin();
        var fields = new Dictionary<string, object?>
        {
            ["drugId"] = "INVALID",
            ["name"] = "Thuốc mới",
            ["saleUnit"] = "Viên",
            ["unitPrice"] = 1000,
            ["lowStockThreshold"] = 0,
            ["requiresPrescription"] = false,
            ["isControlled"] = false,
            ["isForSale"] = true
        };
        fields[field] = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(value);
        await (await client.PostAsJsonAsync("/api/admin/drugs", fields)).Error(400, "VALIDATION_FAILED", field);
        Assert.False(await factory.WithDb(db => db.Drugs.AnyAsync(x => x.DrugId == "INVALID")));
    }

    [Fact]
    public async Task TC11_DrugImage_UploadsAndServesPublicly_RejectsInvalidFiles()
    {
        using var admin = await Admin();
        await using var source = typeof(Pharmacy.Core.Data.DbSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data.Assets.drugs.PARA500.png")!;
        using var buffer = new MemoryStream();
        await source.CopyToAsync(buffer);
        var bytes = buffer.ToArray();
        using var valid = Multipart(bytes, "../../image.png", "image/png");
        var upload = await admin.PostAsync("/api/admin/drugs/PARA500/image", valid);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        var imageUrl = (await upload.Json()).GetProperty("imageUrl").GetString()!;
        Assert.Matches("^/api/files/drugs/[a-f0-9]{32}\\.png$", imageUrl);
        using var guest = factory.Client();
        var image = await guest.GetAsync(imageUrl);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/png", image.Content.Headers.ContentType?.MediaType);
        Assert.Equal(bytes, await image.Content.ReadAsByteArrayAsync());
        foreach (var sample in new[]
        {
            (Encoding.UTF8.GetBytes("fake image"), "fake.png", "image/png"),
            (bytes, "fake.jpg", "image/jpeg"),
            (bytes, "image.png", "text/plain"),
            (new byte[LocalFileStorage.MaxBytes + 1], "huge.png", "image/png")
        })
        {
            using var form = Multipart(sample.Item1, sample.Item2, sample.Item3);
            await (await admin.PostAsync("/api/admin/drugs/PARA500/image", form)).Error(400, "FILE_INVALID");
        }
        using var missing = new MultipartFormDataContent();
        missing.Add(new StringContent("Không có ảnh"), "description");
        await (await admin.PostAsync("/api/admin/drugs/PARA500/image", missing)).Error(400, "FILE_INVALID");
        Assert.Equal(imageUrl, (await (await admin.GetAsync("/api/admin/drugs/PARA500")).Json()).GetProperty("imageUrl").GetString());
        await (await guest.GetAsync("/api/files/drugs/absent.png")).Error(404, "NOT_FOUND");
    }

    [Theory]
    [InlineData("staff", "Staff@12345", 403)]
    [InlineData("chuduc", "User@12345", 403)]
    [InlineData(null, null, 401)]
    public async Task TC12_NonAdmin_CannotReadOrChangeCatalog(string? username, string? password, int status)
    {
        using var client = factory.Client();
        if (username is not null)
        {
            Assert.Equal(HttpStatusCode.OK, (await client.Login(username, password!)).StatusCode);
        }
        await client.Csrf();
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var code = status == 401 ? "UNAUTHENTICATED" : "FORBIDDEN";
        await (await client.GetAsync("/api/admin/drugs")).Error(status, code);
        await (await client.GetAsync("/api/admin/drugs/PARA500")).Error(status, code);
        await (await client.PostAsJsonAsync("/api/admin/drugs", Input())).Error(status, code);
        await (await client.PutAsJsonAsync("/api/admin/drugs/PARA500", Input())).Error(status, code);
        await (await client.PatchAsJsonAsync("/api/admin/drugs/PARA500/sale-status", new
        {
            isForSale = false
        })).Error(status, code);
        using var file = Multipart([1, 2, 3], "fake.png", "image/png");
        await (await client.PostAsync("/api/admin/drugs/PARA500/image", file)).Error(status, code);
        await (await client.PostAsJsonAsync("/api/admin/drugs/PARA500/batches", new
        {
            batchNumber = "NO",
            expiryDate = "2026-11-01",
            quantity = 1
        })).Error(status, code);
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    private static MultipartFormDataContent Multipart(byte[] bytes, string fileName, string contentType)
    {
        var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new(contentType);
        form.Add(content, "file", fileName);
        return form;
    }
}
