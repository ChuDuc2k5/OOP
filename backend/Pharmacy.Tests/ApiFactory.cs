using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
namespace Pharmacy.Tests;

internal sealed class TestClock : IBusinessClock
{
    public DateOnly Today { get; init; } = new(2026, 10, 6);
    public DateTimeOffset Now => new(Today.ToDateTime(new TimeOnly(9, 30)), TimeSpan.FromHours(7));
}

internal sealed class ApiFactory(
    string databasePath,
    DateOnly? today = null,
    ILoggerProvider? logs = null) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureLogging(logging =>
        {
            logging.SetMinimumLevel(LogLevel.Error);
            if (logs is not null)
            {
                logging.AddProvider(logs);
            }
        });
        builder.ConfigureServices(services =>
        {
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            services.RemoveAll<StorageOptions>();
            services.AddSingleton(new StorageOptions(databasePath + "-storage"));
            services.RemoveAll<DbContextOptions<PharmacyDbContext>>();
            services.RemoveAll<PharmacyDbContext>();
            services.RemoveAll<PostgresPharmacyDbContext>();
            services.RemoveAll<DbContextOptions<PostgresPharmacyDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<PharmacyDbContext>>();
            services.AddDbContext<PharmacyDbContext>(o => o.UseSqlite($"Data Source={databasePath};Pooling=False"));
            services.RemoveAll<IBusinessClock>();
            services.AddSingleton<IBusinessClock>(new TestClock { Today = today ?? new DateOnly(2026, 10, 6) });
        });
    }
    public HttpClient Client() => CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    public async Task ConfigurePayments()
    {
        await WithDb(PaymentFixture.Configure);
        await PaymentFixture.WriteImage(databasePath + "-storage");
    }

    public async Task<T> WithDb<T>(Func<PharmacyDbContext, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<PharmacyDbContext>());
    }
    public async Task WithDb(Func<PharmacyDbContext, Task> action)
    {
        using var scope = Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<PharmacyDbContext>());
    }
    public static void Cleanup(string databasePath)
    {
        var storage = Path.GetFullPath(databasePath + "-storage");
        if (!storage.StartsWith(Path.GetFullPath(Path.GetTempPath()), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Test cleanup must stay in temp.");
        }

        if (File.Exists(databasePath))
        {
            File.Delete(databasePath);
        }

        if (Directory.Exists(storage))
        {
            Directory.Delete(storage, true);
        }
    }
}

internal static class ApiClient
{
    public static async Task<string> Csrf(this HttpClient client)
    {
        var response = await client.GetAsync("/api/auth/csrf");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var cookie = response.Headers.GetValues("Set-Cookie").Single(s => s.StartsWith("XSRF-TOKEN="));
        var token = cookie.Split(';')[0]["XSRF-TOKEN=".Length..];
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        return token;
    }
    public static async Task<HttpResponseMessage> Login(this HttpClient client, string username, string password)
    {
        await client.Csrf();
        return await client.PostAsJsonAsync("/api/auth/login", new
        {
            username,
            password
        });
    }
    public static async Task<JsonElement> Json(this HttpResponseMessage response) => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
    public static async Task Error(
        this HttpResponseMessage response,
        int status,
        string code,
        string? field = null)
    {
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var json = await response.Json();
        Assert.Equal(code, json.GetProperty("code").GetString());
        Assert.Equal(status, json.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(json.GetProperty("title").GetString()));
        if (field != null)
        {
            Assert.NotEmpty(json.GetProperty("errors").GetProperty(field).EnumerateArray());
        }

        Assert.Null(response.Headers.Location);
    }
}
