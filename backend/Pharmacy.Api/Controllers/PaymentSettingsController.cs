using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/admin/payment-settings"), Authorize(Policy = "Admin")]
public sealed class PaymentSettingsController(ManualPaymentService payments) : ControllerBase
{
    [HttpGet]
    public Task<PaymentSettingView> Get(CancellationToken ct) => payments.Settings(ct);

    [HttpPut]
    public Task<PaymentSettingView> Update(PaymentSettingInput input, CancellationToken ct) => payments.UpdateSettings(input, ct);

    [HttpPost("qr-image")]
    public async Task<PaymentSettingView> Image(IFormFile? file, CancellationToken ct)
    {
        await using var stream = file?.OpenReadStream();
        return await payments.UploadQr(stream is null ? null : new(stream, file!.FileName, file.ContentType, file.Length), ct);
    }
}
