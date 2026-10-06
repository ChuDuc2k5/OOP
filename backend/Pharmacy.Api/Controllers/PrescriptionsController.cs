using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/prescriptions"), Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class PrescriptionsController(PrescriptionService prescriptions) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string? OwnerScope => User.IsInRole("User") ? UserId : null;

    [HttpPost, Authorize(Policy = "User")]
    public async Task<IActionResult> Upload(
        [FromForm] string? patientId, [FromForm] string? patientName, IFormFile? image, CancellationToken ct)
    {
        await using var stream = image?.OpenReadStream();
        var file = stream is null ? null : new DrugImage(stream, image!.FileName, image.ContentType, image.Length);
        return StatusCode(201, await prescriptions.Upload(UserId, patientId, patientName, file, ct));
    }

    [HttpGet("mine"), Authorize(Policy = "User")]
    public Task<Paged<PrescriptionRow>> Mine(string? status, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => prescriptions.Query(UserId, status, null, page, pageSize, ct);

    [HttpGet("usable"), Authorize(Policy = "User")]
    public Task<IReadOnlyList<PrescriptionView>> Usable(CancellationToken ct) => prescriptions.Usable(UserId, ct);

    [HttpGet, Authorize(Policy = "Staff")]
    public Task<Paged<PrescriptionRow>> List(string? status, string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => prescriptions.Query(null, status, search, page, pageSize, ct);

    [HttpGet("{id}")]
    public Task<PrescriptionView> Get(string id, CancellationToken ct) => prescriptions.Get(id, OwnerScope, ct);

    [HttpGet("{id}/image")]
    public async Task<IActionResult> Image(string id, CancellationToken ct)
    {
        var image = await prescriptions.Image(id, OwnerScope, ct);
        return File(image.Content, image.ContentType);
    }

    [HttpPost("counter"), Authorize(Policy = "Staff")]
    public async Task<IActionResult> Counter(CounterPrescriptionInput input, CancellationToken ct)
        => StatusCode(201, await prescriptions.Counter(UserId, input, ct));

    [HttpPut("{id}/details"), Authorize(Policy = "Staff")]
    public Task<PrescriptionView> Details(string id, PrescriptionDetailsInput input, CancellationToken ct)
        => prescriptions.Details(id, input, ct);

    [HttpPost("{id}/approve"), Authorize(Policy = "Staff")]
    public Task<PrescriptionView> Approve(string id, CancellationToken ct)
        => prescriptions.Review(id, UserId, "approve", ct: ct);

    [HttpPost("{id}/reject"), Authorize(Policy = "Staff")]
    public Task<PrescriptionView> Reject(string id, ReasonInput input, CancellationToken ct)
        => prescriptions.Review(id, UserId, "reject", input.Reason, ct);

    [HttpPost("{id}/cancel"), Authorize(Policy = "Staff")]
    public Task<PrescriptionView> Cancel(string id, ReasonInput input, CancellationToken ct)
        => prescriptions.Review(id, UserId, "cancel", input.Reason, ct);
}
