using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/orders"), Authorize(Policy = "User")]
public sealed class OrdersController(OrderService orders) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost]
    public async Task<IActionResult> Place(PlaceOrderInput input, CancellationToken ct)
        => StatusCode(201, await orders.Place(UserId, input, ct));

    [HttpGet("mine")]
    public Task<Paged<OrderRow>> Mine(string? status, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => orders.Query(UserId, status, null, page, pageSize, ct);

    [HttpGet("{orderId}")]
    public Task<OrderView> Get(string orderId, CancellationToken ct) => orders.Get(orderId, UserId, ct);

    [HttpPost("{orderId}/cancel")]
    public Task<OrderView> Cancel(string orderId, CancellationToken ct)
        => orders.Cancel(orderId, UserId, null, null, ct: ct);
}
