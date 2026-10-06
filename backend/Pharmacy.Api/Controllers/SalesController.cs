using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/staff/sales"), Authorize(Policy = "Staff")]
public sealed class SalesController(SaleService sales) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost]
    public async Task<IActionResult> Create(SaleCreateInput input, CancellationToken ct)
        => StatusCode(201, await sales.Create(UserId, input, ct));

    [HttpGet]
    public Task<Paged<SaleView>> List(string? status, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => sales.Query(UserId, status, page, pageSize, ct);

    [HttpGet("{saleId}")]
    public Task<SaleView> Get(string saleId, CancellationToken ct) => sales.Get(saleId, UserId, ct);

    [HttpPut("{saleId}")]
    public Task<SaleView> Update(string saleId, SaleUpdateInput input, CancellationToken ct) => sales.Update(saleId, UserId, input, ct);

    [HttpPost("{saleId}/cancel")]
    public Task<SaleView> Cancel(string saleId, CancellationToken ct) => sales.Cancel(saleId, UserId, ct);

    [HttpPost("{saleId}/checkout")]
    public Task<SaleView> Checkout(string saleId, CashInput input, CancellationToken ct)
        => sales.Checkout(saleId, UserId, input.CashReceived, ct);
}
