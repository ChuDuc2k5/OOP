using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/invoices"), Authorize]
public sealed class InvoicesController(InvoiceService invoices) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public Task<Paged<InvoiceRow>> List(string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => invoices.Query(UserId, Role, search, page, pageSize, ct);

    [HttpGet("{invoiceId}")]
    public Task<InvoiceView> Get(string invoiceId, CancellationToken ct) => invoices.Get(invoiceId, UserId, Role, ct);
}
