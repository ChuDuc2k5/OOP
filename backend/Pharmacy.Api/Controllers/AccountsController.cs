using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Services;
namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/admin/accounts"), Authorize(Policy = "Admin")]
public sealed class AccountsController(AccountService accounts) : ControllerBase
{
    [HttpGet]
    public Task<Paged<AccountRow>> List(string? search, Role? role, int page = 1, int pageSize = 20, CancellationToken ct = default) => accounts.List(search, role, page, pageSize, ct);
    [HttpPost("staff")]
    public async Task<IActionResult> CreateStaff(RegisterRequest request, CancellationToken ct) => StatusCode(201, AccountService.ToRow(await accounts.CreateStaff(request.Username, request.Password, request.ConfirmPassword, ct)));
}
