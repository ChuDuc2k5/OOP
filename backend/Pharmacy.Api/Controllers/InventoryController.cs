using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/inventory"), Authorize(Policy = "Staff")]
public sealed class InventoryController(InventoryService inventory) : ControllerBase
{
    [HttpGet]
    public Task<Paged<InventoryRow>> List(string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => inventory.Query(search, page, pageSize, ct);

    [HttpGet("{drugId}")]
    public Task<InventoryDetail> Get(string drugId, CancellationToken ct) => inventory.Get(drugId, ct);
}
