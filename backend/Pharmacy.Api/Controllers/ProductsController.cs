using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/products"), AllowAnonymous]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ProductsController(ProductService products) : ControllerBase
{
    [HttpGet]
    public Task<Paged<Product>> List(string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => products.QueryProducts(User.Identity?.IsAuthenticated == true, search, page, pageSize, ct);

    [HttpGet("{drugId}")]
    public Task<Product> Get(string drugId, CancellationToken ct)
        => products.GetProduct(drugId, User.Identity?.IsAuthenticated == true, ct);
}
