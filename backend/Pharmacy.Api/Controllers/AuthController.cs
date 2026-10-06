using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Api.Infrastructure;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Services;
namespace Pharmacy.Api.Controllers;

public sealed record RegisterRequest(string? Username, string? Password, string? ConfirmPassword);
public sealed record LoginRequest(string? Username, string? Password);
[ApiController, Route("api/auth")]
public sealed class AuthController(AccountService accounts, IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet("csrf"), AllowAnonymous]
    public IActionResult Csrf()
    {
        CsrfTokens.Issue(HttpContext, antiforgery);
        return NoContent();
    }
    [HttpPost("register"), AllowAnonymous]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        GuestOnly();
        var account = await accounts.RegisterUser(request.Username, request.Password, request.ConfirmPassword, ct);
        await SignIn(account);
        return StatusCode(201, AccountService.ToMe(account));
    }
    [HttpPost("login"), AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        GuestOnly();
        var account = await accounts.Login(request.Username, request.Password, ct);
        await SignIn(account);
        return Ok(AccountService.ToMe(account));
    }
    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        CsrfTokens.Issue(HttpContext, antiforgery);
        return NoContent();
    }
    [HttpGet("me"), Authorize]
    public Task<Me> Me(CancellationToken ct) => accounts.GetMe(User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct);
    private async Task SignIn(UserAccount account)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, account.UserId),
                new Claim(ClaimTypes.Name, account.Username),
                new Claim(ClaimTypes.Role, account.Role.ToString())
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
        HttpContext.User = principal;
        CsrfTokens.Issue(HttpContext, antiforgery);
    }

    private void GuestOnly()
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            throw new BusinessException("FORBIDDEN", "Chức năng chỉ dành cho khách chưa đăng nhập.");
        }
    }
}
