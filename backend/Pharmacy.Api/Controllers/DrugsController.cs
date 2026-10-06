using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

public sealed record SaleStatusInput(bool? IsForSale);

[ApiController, Route("api/admin/drugs"), Authorize(Policy = "Admin")]
public sealed class DrugsController(ProductService products, InventoryService inventory) : ControllerBase
{
    [HttpGet]
    public Task<Paged<DrugAdmin>> List(string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => products.QueryDrugs(search, page, pageSize, ct);

    [HttpGet("{drugId}")]
    public Task<DrugAdmin> Get(string drugId, CancellationToken ct) => products.GetDrug(drugId, ct);

    [HttpPost]
    public async Task<IActionResult> Create(DrugCreate input, CancellationToken ct)
        => StatusCode(201, await products.CreateDrug(input, ct));

    [HttpPut("{drugId}")]
    public Task<DrugAdmin> Update(string drugId, DrugInput input, CancellationToken ct)
        => products.UpdateDrug(drugId, input, ct);

    [HttpPatch("{drugId}/sale-status")]
    public Task<DrugAdmin> SaleStatus(string drugId, SaleStatusInput input, CancellationToken ct)
        => products.SetSaleStatus(drugId, input.IsForSale, ct);

    [HttpPost("{drugId}/image")]
    public async Task<DrugAdmin> Image(string drugId, IFormFile? file, CancellationToken ct)
    {
        await using var stream = file?.OpenReadStream();
        var image = stream is null ? null : new DrugImage(stream, file!.FileName, file.ContentType, file.Length);
        return await products.UploadImage(drugId, image, ct);
    }

    [HttpPost("{drugId}/batches")]
    public async Task<IActionResult> AddBatch(string drugId, BatchInput input, CancellationToken ct)
        => StatusCode(201, await inventory.AddBatch(drugId, input, ct));
}
