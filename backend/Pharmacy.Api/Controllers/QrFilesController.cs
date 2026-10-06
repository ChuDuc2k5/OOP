using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/files/qr"), Authorize]
public sealed class QrFilesController(ManualPaymentService payments) : ControllerBase
{
    [HttpGet("{fileName}")]
    public async Task<IActionResult> Get(string fileName, CancellationToken ct)
    {
        var image = await payments.Qr(fileName, ct);
        return File(image.Content, image.ContentType);
    }
}
