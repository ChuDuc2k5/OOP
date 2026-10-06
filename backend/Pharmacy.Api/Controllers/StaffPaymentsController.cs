using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/staff/payments"), Authorize(Policy = "Staff")]
public sealed class StaffPaymentsController(ManualPaymentService payments) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public Task<Paged<PaymentRow>> List(string? status, string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => payments.Query(status, search, page, pageSize, ct);

    [HttpPost("{paymentId}/review")]
    public Task<PaymentReviewResult> Review(string paymentId, PaymentReviewInput input, CancellationToken ct)
        => payments.Review(paymentId, UserId, input, ct);

    [HttpPost("{paymentId}/note")]
    public Task<PaymentView> Note(string paymentId, NoteInput input, CancellationToken ct)
        => payments.Note(paymentId, input.Note, UserId, ct);
}
