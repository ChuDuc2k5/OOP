using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Pharmacy.Api.Infrastructure;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Services;
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<ApiBehaviorOptions>(o => o.InvalidModelStateResponseFactory = context =>
{
    var errors = context.ModelState.Where(p => p.Value?.Errors.Count > 0).ToDictionary(
        p => JsonNamingPolicy.CamelCase.ConvertName(p.Key.Split('.').Last().TrimStart('$')),
        p => p.Value!.Errors.Select(_ => "Dữ liệu không hợp lệ.").ToArray());
    var details = new ProblemDetails { Status = 400, Title = "Dữ liệu không hợp lệ." };
    details.Extensions["code"] = "VALIDATION_FAILED";
    details.Extensions["errors"] = errors;
    return new BadRequestObjectResult(details);
});
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "pharmacy.auth";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Lax;
    o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    o.Events.OnRedirectToLogin = c => ApiErrors.Write(c.HttpContext, 401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
    o.Events.OnRedirectToAccessDenied = c => ApiErrors.Write(c.HttpContext, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
});
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("Admin", p => p.RequireRole("Admin"));
    o.AddPolicy("Staff", p => p.RequireRole("Staff", "Admin"));
    o.AddPolicy("User", p => p.RequireRole("User"));
});
// Framework secret cookie is separate from the JS-readable request token cookie.
builder.Services.AddAntiforgery(o =>
{
    o.HeaderName = "X-XSRF-TOKEN";
    o.Cookie.Name = "pharmacy.antiforgery";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Lax;
});
if ((builder.Configuration["Database:Provider"] ?? "Sqlite") != "Sqlite")
{
    throw new InvalidOperationException("M1 supports Database:Provider=Sqlite only.");
}

var connection = new SqliteConnectionStringBuilder(builder.Configuration.GetConnectionString("Default") ?? "Data Source=../data/pharmacy.db");
if (connection.DataSource != ":memory:")
{
    connection.DataSource = Path.GetFullPath(connection.DataSource, builder.Environment.ContentRootPath);
    Directory.CreateDirectory(Path.GetDirectoryName(connection.DataSource)!);
}
builder.Services.AddDbContext<PharmacyDbContext>(o => o.UseSqlite(connection.ToString()));
builder.Services.AddDataProtection().SetApplicationName("Pharmacy")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.GetFullPath(builder.Configuration["DataProtection:KeyPath"] ?? "../data/keys", builder.Environment.ContentRootPath)));
builder.Services.AddSingleton<IBusinessClock>(_ => new BusinessClock(
    builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Test") ? builder.Configuration["BusinessDate:Override"] : null));
builder.Services.AddSingleton<IInventoryLock, InventoryLock>();
builder.Services.AddSingleton(new StorageOptions(Path.GetFullPath(builder.Configuration["Storage:Root"] ?? "../storage", builder.Environment.ContentRootPath)));
builder.Services.AddSingleton<IFileStorage>(sp => new LocalFileStorage(sp.GetRequiredService<StorageOptions>().Root));
builder.Services.AddScoped<IPasswordHasher<UserAccount>, PasswordHasher<UserAccount>>();
builder.Services.AddScoped<IdGenerator>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<DbSeeder>();
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<PharmacyDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseAuthentication();
app.UseMiddleware<CsrfMiddleware>();
app.UseAuthorization();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", service = "Pharmacy.Api" })).WithName("GetHealth");
app.Run();
public partial class Program
{
}
