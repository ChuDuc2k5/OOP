using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/reports"), Authorize(Policy = "Staff")]
public sealed class InventoryReportsController(InventoryReportService reports) : ControllerBase
{
    [HttpGet("low-stock")]
    public Task<IReadOnlyList<LowStockRow>> LowStock(CancellationToken ct) => reports.LowStock(ct);

    [HttpGet("expiring")]
    public Task<IReadOnlyList<ExpiringRow>> Expiring(int days = 30, CancellationToken ct = default)
        => reports.NearExpiry(days, ct);
}
