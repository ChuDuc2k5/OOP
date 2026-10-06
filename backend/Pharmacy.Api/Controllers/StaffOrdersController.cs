using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/staff/orders"), Authorize(Policy = "Staff")]
public sealed class StaffOrdersController(OrderService orders, CheckoutService checkout) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public Task<Paged<OrderRow>> List(string? status, string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => orders.Query(null, status, search, page, pageSize, ct);

    [HttpGet("{orderId}")]
    public Task<OrderView> Get(string orderId, CancellationToken ct) => orders.Get(orderId, null, ct);

    [HttpPost("{orderId}/claim")]
    public Task<OrderView> Claim(string orderId, CancellationToken ct) => orders.StaffAction(orderId, UserId, "claim", ct);

    [HttpPost("{orderId}/fulfill")]
    public Task<CheckoutResult> Fulfill(string orderId, CancellationToken ct) => checkout.Fulfill(orderId, UserId, ct);

    [HttpPost("{orderId}/ship")]
    public Task<OrderView> Ship(string orderId, CancellationToken ct) => orders.StaffAction(orderId, UserId, "ship", ct);

    [HttpPost("{orderId}/complete")]
    public Task<OrderView> Complete(string orderId, CancellationToken ct) => orders.StaffAction(orderId, UserId, "complete", ct);

    [HttpPost("{orderId}/reject")]
    public Task<OrderView> Reject(string orderId, ReasonInput input, CancellationToken ct)
        => orders.Cancel(orderId, null, UserId, input.Reason, true, ct);

    [HttpPost("{orderId}/cancel")]
    public Task<OrderView> Cancel(string orderId, ReasonInput input, CancellationToken ct)
        => orders.Cancel(orderId, null, UserId, input.Reason, ct: ct);
}
