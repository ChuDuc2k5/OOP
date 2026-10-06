using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;
namespace Pharmacy.Core.Services;

public sealed record AccountRow(string UserId, string Username, Role Role);
public sealed record Me(
    string UserId,
    string Username,
    Role Role,
    string HomePath);
public sealed record Paged<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int Total);
public sealed class AccountValidationException(Dictionary<string, string[]> errors) : Exception("Dữ liệu không hợp lệ.")
{
    public Dictionary<string, string[]> Errors { get; } = errors;
}

public sealed class AccountService(PharmacyDbContext db, IdGenerator ids, IPasswordHasher<UserAccount> hasher)
{
    public Task<UserAccount> RegisterUser(
        string? username,
        string? password,
        string? confirmation,
        CancellationToken ct = default) => Create(username, password, confirmation, Role.User, ct);
    public Task<UserAccount> CreateStaff(
        string? username,
        string? password,
        string? confirmation,
        CancellationToken ct = default) => Create(username, password, confirmation, Role.Staff, ct);
    private async Task<UserAccount> Create(
        string? username,
        string? password,
        string? confirmation,
        Role role,
        CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        username = username?.Trim();
        if (username is null || !Regex.IsMatch(username, "\\A[A-Za-z0-9._-]{3,30}\\z"))
        {
            errors["username"] = ["Tên đăng nhập phải có 3–30 ký tự Latin, số, chấm, gạch dưới hoặc gạch ngang."];
        }

        if (password is null || password.Length is < 8 or > 128)
        {
            errors["password"] = ["Mật khẩu phải dài 8–128 ký tự."];
        }

        if (confirmation is null || confirmation != password)
        {
            errors["confirmPassword"] = ["Xác nhận mật khẩu không khớp."];
        }

        if (errors.Count > 0)
        {
            throw new AccountValidationException(errors);
        }

        var normalized = username!.ToUpperInvariant();
        if (await db.UserAccounts.AnyAsync(x => x.NormalizedUsername == normalized, ct))
        {
            throw Duplicate();
        }

        var account = new UserAccount(ids.User(), username, password!, role, hasher);
        db.UserAccounts.Add(account);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e) when (DatabaseErrors.IsUniqueViolation(e))
        {
            db.Entry(account).State = EntityState.Detached;
            throw Duplicate();
        }
        return account;
    }
    public async Task<UserAccount> Login(string? username, string? password, CancellationToken ct = default)
    {
        var normalized = (username ?? "").Trim().ToUpperInvariant();
        var account = await db.UserAccounts.SingleOrDefaultAsync(x => x.NormalizedUsername == normalized, ct);
        if (password is null || password.Length > 128 || account is null || !account.VerifyPassword(password, hasher))
        {
            throw new BusinessException("INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng.");
        }

        return account;
    }
    public async Task<Me> GetMe(string userId, CancellationToken ct = default)
    {
        var account = await db.UserAccounts.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId, ct) ?? throw new BusinessException("UNAUTHENTICATED", "Vui lòng đăng nhập.");
        return ToMe(account);
    }
    public async Task<Paged<AccountRow>> List(
        string? search,
        Role? role,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        if (page < 1 || pageSize is < 1 or > 100 || (long)(page - 1) * pageSize > int.MaxValue || role.HasValue && !Enum.IsDefined(role.Value))
        {
            throw new AccountValidationException(new()
            {
                ["page"] = ["Phân trang hoặc role không hợp lệ."]
            });
        }

        var query = db.UserAccounts.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            query = query.Where(x => x.NormalizedUsername.Contains(term));
        }
        if (role.HasValue)
        {
            query = query.Where(x => x.Role == role);
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderBy(x => x.NormalizedUsername).Skip((page - 1) * pageSize).Take(pageSize).Select(x => new AccountRow(x.UserId, x.Username, x.Role)).ToListAsync(ct);
        return new(rows, page, pageSize, total);
    }
    public static Me ToMe(UserAccount account) => new(account.UserId, account.Username, account.Role, account.Role switch { Role.Admin => "/admin", Role.Staff => "/staff", _ => "/" });
    public static AccountRow ToRow(UserAccount account) => new(account.UserId, account.Username, account.Role);
    private static BusinessException Duplicate() => new("DUPLICATE", "Tên đăng nhập đã tồn tại.", "username");
}
