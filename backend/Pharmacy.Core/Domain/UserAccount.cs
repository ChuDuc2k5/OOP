using Microsoft.AspNetCore.Identity;
using System.Text.RegularExpressions;
using Pharmacy.Core.Common;
namespace Pharmacy.Core.Domain;

public sealed class UserAccount
{
    private UserAccount()
    {
    }
    public UserAccount(
        string id,
        string username,
        string password,
        Role role,
        IPasswordHasher<UserAccount> hasher)
    {
        UserId = Guard.Required(id);
        Username = Guard.Required(username);
        if (!Regex.IsMatch(Username, "\\A[A-Za-z0-9._-]{3,30}\\z") || password.Length is < 8 or > 128 || !Enum.IsDefined(role))
        {
            throw new BusinessException("VALIDATION_FAILED", "Thông tin tài khoản không hợp lệ.");
        }

        NormalizedUsername = Username.ToUpperInvariant();
        Role = role;
        PasswordHash = hasher.HashPassword(this, password);
    }
    public string UserId { get; private set; } = "";
    public string Username { get; private set; } = "";
    public string NormalizedUsername { get; private set; } = "";
    public string PasswordHash { get; private set; } = "";
    public Role Role
    {
        get; private set;
    }
    public bool VerifyPassword(string password, IPasswordHasher<UserAccount> hasher) =>
        hasher.VerifyHashedPassword(this, PasswordHash, password) != PasswordVerificationResult.Failed;
}
