using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Domain;
namespace Pharmacy.Tests;

public sealed class AuthTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), "pharmacy-tests-" + Guid.NewGuid() + ".db");
    private readonly ApiFactory factory;
    public AuthTests()
    {
        factory = new(path);
    }
    public void Dispose()
    {
        factory.Dispose();
        ApiFactory.Cleanup(path);
    }

    [Fact]
    public async Task TC01_RegisterUser_HashesPassword_ThenCanLogin()
    {
        using var client = factory.Client();
        await client.Csrf();
        const string password = "  PaSs word  ";
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "  Test.user  ",
            password,
            confirmPassword = password
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var me = await response.Json();
        Assert.Equal("User", me.GetProperty("role").GetString());
        Assert.Equal("Test.user", me.GetProperty("username").GetString());
        Assert.Matches("^U[A-F0-9]{8}$", me.GetProperty("userId").GetString()!);
        await (await client.GetAsync("/api/auth/me")).Error(401, "UNAUTHENTICATED");
        var stored = await factory.WithDb(db => db.UserAccounts.SingleAsync(x => x.NormalizedUsername == "TEST.USER"));
        Assert.NotEqual(password, stored.PasswordHash);
        Assert.Equal(HttpStatusCode.OK, (await client.Login(" test.USER ", password)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task TC02_DuplicateUsername_IgnoresCaseAndTrim_NoPartialWrite()
    {
        using var client = factory.Client();
        await client.Csrf();
        await (await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "  UsEr ",
            password = "Password1",
            confirmPassword = "Password1"
        })).Error(409, "DUPLICATE", "username");
        Assert.Equal(4, await factory.WithDb(db => db.UserAccounts.CountAsync()));
    }
    [Theory]
    [InlineData("ab", "Password1", "Password1", "username")]
    [InlineData("bad name", "Password1", "Password1", "username")]
    [InlineData("tên", "Password1", "Password1", "username")]
    [InlineData("newuser", "short", "short", "password")]
    [InlineData("newuser", "Password1", "different", "confirmPassword")]
    [InlineData(null, null, null, "username")]
    public async Task TC02_InvalidRegistration_ReturnsFieldErrors(
        string? username,
        string? password,
        string? confirmPassword,
        string field)
    {
        using var client = factory.Client();
        await client.Csrf();
        await (await client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            password,
            confirmPassword
        })).Error(400, "VALIDATION_FAILED", field);
        Assert.Equal(4, await factory.WithDb(db => db.UserAccounts.CountAsync()));
    }
    [Fact]
    public async Task TC02_LengthBoundaries_AndPasswordWhitespaceArePreserved()
    {
        using var client = factory.Client();
        await client.Csrf();
        var username = new string('a', 30);
        var password = new string(' ', 128);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            password,
            confirmPassword = password
        })).StatusCode);
        await (await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = new string('b', 31),
            password,
            confirmPassword = password
        })).Error(400, "VALIDATION_FAILED", "username");
        await (await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "overlong",
            password = new string('p', 129),
            confirmPassword = new string('p', 129)
        })).Error(400, "VALIDATION_FAILED", "password");
        Assert.Equal(HttpStatusCode.OK, (await client.Login(username, password)).StatusCode);
    }
    [Theory]
    [InlineData("Admin")]
    [InlineData("Staff")]
    public async Task TC03_InjectedRole_IsIgnored_AccountRemainsUser(string role)
    {
        using var client = factory.Client();
        await client.Csrf();
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "injected",
            password = "Password1",
            confirmPassword = "Password1",
            role,
            userId = "UADMIN01",
            passwordHash = "fake"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("User", (await response.Json()).GetProperty("role").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.Login("injected", "Password1")).StatusCode);
        await (await client.GetAsync("/api/admin/accounts")).Error(403, "FORBIDDEN");
    }
    [Theory]
    [InlineData("user", "User@12345", "User", "/")]
    [InlineData("staff", "Staff@12345", "Staff", "/staff")]
    [InlineData("admin", "Admin@12345", "Admin", "/admin")]
    public async Task TC04_Login_ReturnsRoleHomePath_AndSecureCookieAttributes(
        string username,
        string password,
        string role,
        string homePath)
    {
        using var client = factory.Client();
        var response = await client.Login(username, password);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.Json();
        Assert.Equal(role, me.GetProperty("role").GetString());
        Assert.Equal(homePath, me.GetProperty("homePath").GetString());
        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("pharmacy.auth="));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(me.ToString(), (await (await client.GetAsync("/api/auth/me")).Json()).ToString());
        await client.Csrf();
        await (await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "blocked",
            password = "Password1",
            confirmPassword = "Password1"
        })).Error(403, "FORBIDDEN");
    }
    [Fact]
    public async Task TC05_InvalidLogin_UsesSameMessage_LeavesClientUnauthenticated()
    {
        using var client = factory.Client();
        var wrong = await client.Login("user", "wrongPassword");
        await wrong.Error(401, "INVALID_CREDENTIALS");
        var missing = await client.Login("unknown", "wrongPassword");
        await missing.Error(401, "INVALID_CREDENTIALS");
        Assert.Equal((await wrong.Json()).GetProperty("title").GetString(), (await missing.Json()).GetProperty("title").GetString());
        await (await client.GetAsync("/api/auth/me")).Error(401, "UNAUTHENTICATED");
        Assert.Equal(HttpStatusCode.OK, (await client.Login("user", "User@12345")).StatusCode);
    }
    [Fact]
    public async Task TC06_Logout_BlocksProtectedApi_ReLoginPreservesBusinessData()
    {
        using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.Login("user", "User@12345")).StatusCode);
        await factory.WithDb(PersistenceFixture.AddBusinessData);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await client.Csrf();
        var response = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("pharmacy.auth=;") && c.Contains("expires="));
        await (await client.GetAsync("/api/auth/me")).Error(401, "UNAUTHENTICATED");
        await (await client.GetAsync("/api/admin/accounts")).Error(401, "UNAUTHENTICATED");
        Assert.Equal(HttpStatusCode.OK, (await client.Login("user", "User@12345")).StatusCode);
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }
    [Fact]
    public async Task TC07_AdminCreatesStaff_ListsSearchesPages_WithoutSecrets()
    {
        using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.Login("admin", "Admin@12345")).StatusCode);
        await client.Csrf();
        var response = await client.PostAsJsonAsync("/api/admin/accounts/staff", new
        {
            username = "  New.Staff  ",
            password = "StaffPass1",
            confirmPassword = "StaffPass1",
            role = "Admin"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var row = await response.Json();
        Assert.Equal(3, row.EnumerateObject().Count());
        Assert.Equal("Staff", row.GetProperty("role").GetString());
        await (await client.PostAsJsonAsync("/api/admin/accounts/staff", new
        {
            username = "NEW.STAFF",
            password = "StaffPass1",
            confirmPassword = "StaffPass1"
        })).Error(409, "DUPLICATE", "username");
        await (await client.PostAsJsonAsync("/api/admin/accounts/staff", new
        {
            username = "a",
            password = "x",
            confirmPassword = "y"
        })).Error(400, "VALIDATION_FAILED", "username");
        var list = await (await client.GetAsync("/api/admin/accounts?search=STAFF&role=Staff&page=1&pageSize=1")).Json();
        Assert.Equal(2, list.GetProperty("total").GetInt32());
        Assert.Single(list.GetProperty("items").EnumerateArray());
        Assert.DoesNotContain("password", list.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("hash", list.ToString(), StringComparison.OrdinalIgnoreCase);
        await (await client.GetAsync("/api/admin/accounts?pageSize=101")).Error(400, "VALIDATION_FAILED");
        await (await client.GetAsync("/api/admin/accounts?role=not-a-role")).Error(400, "VALIDATION_FAILED", "role");
        using var staff = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await staff.Login("new.staff", "StaffPass1")).StatusCode);
    }
    [Theory]
    [InlineData("user", "User@12345")]
    [InlineData("staff", "Staff@12345")]
    public async Task TC08_NonAdmin_CannotListOrCreateAccounts(string username, string password)
    {
        using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.Login(username, password)).StatusCode);
        await client.Csrf();
        await (await client.GetAsync("/api/admin/accounts")).Error(403, "FORBIDDEN");
        await (await client.PostAsJsonAsync("/api/admin/accounts/staff", new
        {
            username = "forbidden",
            password = "Password1",
            confirmPassword = "Password1"
        })).Error(403, "FORBIDDEN");
        Assert.Equal(4, await factory.WithDb(db => db.UserAccounts.CountAsync()));
    }
    [Fact]
    public async Task TC08_Guest_CannotListOrCreateAccounts()
    {
        using var client = factory.Client();
        await client.Csrf();
        await (await client.GetAsync("/api/admin/accounts")).Error(401, "UNAUTHENTICATED");
        await (await client.PostAsJsonAsync("/api/admin/accounts/staff", new
        {
            username = "forbidden",
            password = "Password1",
            confirmPassword = "Password1"
        })).Error(401, "UNAUTHENTICATED");
        Assert.Equal(4, await factory.WithDb(db => db.UserAccounts.CountAsync()));
    }
    [Fact]
    public async Task Antiforgery_MissingInvalidAndStaleTokens_AreRejected()
    {
        using var client = factory.Client();
        var input = new
        {
            username = "user",
            password = "User@12345"
        };
        await (await client.PostAsJsonAsync("/api/auth/login", input)).Error(400, "ANTIFORGERY_INVALID");
        var guestToken = await client.Csrf();
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", "invalid");
        await (await client.PostAsJsonAsync("/api/auth/login", input)).Error(400, "ANTIFORGERY_INVALID");
        Assert.Equal(HttpStatusCode.OK, (await client.Login("user", "User@12345")).StatusCode);
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", guestToken);
        await (await client.PostAsync("/api/auth/logout", null)).Error(400, "ANTIFORGERY_INVALID");
        var userToken = await client.Csrf();
        Assert.NotEqual(guestToken, userToken);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", userToken);
        await (await client.PostAsJsonAsync("/api/auth/login", input)).Error(400, "ANTIFORGERY_INVALID");
    }
    [Fact]
    public async Task TC02_ConcurrentDuplicateRegistration_OnlyOneAccountIsCreated()
    {
        using var first = factory.Client();
        using var second = factory.Client();
        await first.Csrf();
        await second.Csrf();
        var input = new
        {
            username = "concurrent",
            password = "Password1",
            confirmPassword = "Password1"
        };
        var results = await Task.WhenAll(first.PostAsJsonAsync("/api/auth/register", input), second.PostAsJsonAsync("/api/auth/register", input));
        Assert.Single(results, r => r.StatusCode == HttpStatusCode.Created);
        await results.Single(r => r.StatusCode != HttpStatusCode.Created).Error(409, "DUPLICATE", "username");
        Assert.Equal(1, await factory.WithDb(db => db.UserAccounts.CountAsync(x => x.NormalizedUsername == "CONCURRENT")));
    }
    [Fact]
    public async Task Antiforgery_LoginAndLogoutAutomaticallyIssueUsableTokens()
    {
        using var client = factory.Client();
        var login = await client.Login("user", "User@12345");
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var token = login.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("XSRF-TOKEN=")).Split(';')[0]["XSRF-TOKEN=".Length..];
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        token = logout.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("XSRF-TOKEN=")).Split(';')[0]["XSRF-TOKEN=".Length..];
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "user",
            password = "User@12345"
        })).StatusCode);
    }
    [Fact]
    public async Task HealthAndDevelopmentOpenApi_AreAvailable()
    {
        using var client = factory.Client();
        Assert.Equal("ok", (await (await client.GetAsync("/api/health")).Json()).GetProperty("status").GetString());
        var openApi = await client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, openApi.StatusCode);
        Assert.Contains("/api/auth/login", await openApi.Content.ReadAsStringAsync());
    }
}
