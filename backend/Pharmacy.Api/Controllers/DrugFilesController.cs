using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/files/drugs"), AllowAnonymous]
public sealed class DrugFilesController(ProductService products) : ControllerBase
{
    [HttpGet("{fileName}")]
    public async Task<IActionResult> Get(string fileName, CancellationToken ct)
    {
        var image = await products.GetImage(fileName, ct);
        return File(image.Content, image.ContentType);
    }
}
