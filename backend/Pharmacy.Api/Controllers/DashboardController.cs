using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pharmacy.Core.Services;

namespace Pharmacy.Api.Controllers;

[ApiController, Route("api/dashboard"), Authorize(Policy = "Staff")]
public sealed class DashboardController(DashboardService dashboard) : ControllerBase
{
    [HttpGet("summary")]
    public Task<DashboardSummary> Summary(CancellationToken ct) => dashboard.Get(ct);
}
