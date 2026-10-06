using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/orders/{orderId}/payment"), Authorize]
public sealed class PaymentsController(ManualPaymentService payments) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost, Authorize(Policy = "User")]
    public async Task<IActionResult> Open(string orderId, CancellationToken ct)
    {
        var result = await payments.Open(orderId, UserId, ct);
        return StatusCode(result.Created ? 201 : 200, result.Payment);
    }

    [HttpGet]
    public Task<PaymentView> Get(string orderId, CancellationToken ct)
        => payments.Get(orderId, User.IsInRole("User") ? UserId : null, ct);
}
