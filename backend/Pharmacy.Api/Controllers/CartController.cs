using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/cart"), Authorize(Policy = "User")]
public sealed class CartController(CartService carts) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public Task<CartView> Get(CancellationToken ct) => carts.Get(UserId, ct);

    [HttpPost("items")]
    public Task<CartView> Add(CartAddInput input, CancellationToken ct) => carts.Add(UserId, input, ct);

    [HttpPut("items/{drugId}")]
    public Task<CartView> Update(string drugId, QuantityInput input, CancellationToken ct)
        => carts.Update(UserId, drugId, input.Quantity, ct);

    [HttpDelete("items/{drugId}")]
    public Task<CartView> Delete(string drugId, CancellationToken ct) => carts.Delete(UserId, drugId, ct);
}
