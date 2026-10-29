using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;

namespace Pharmacy.Week4Demo;

/// <summary>
/// A domain-only extension for a counter sale with a per-drug purchase limit.
/// The production API factory and EF mapping are deliberately not extended.
/// </summary>
public sealed class QuantityLimitedOTCSale : Sale
{
    public QuantityLimitedOTCSale(string id, string creator, DateTimeOffset now, int maxUnitsPerDrug)
        : base(id, creator, now, SaleChannel.Counter)
    {
        if (maxUnitsPerDrug <= 0)
        {
            throw new BusinessException("VALIDATION_FAILED", "Purchase limit must be positive.");
        }

        Kind = SaleKind.OTC;
        MaxUnitsPerDrug = maxUnitsPerDrug;
    }

    public int MaxUnitsPerDrug { get; }

    public override ValidationResult Validate(SaleContext ctx)
    {
        var common = ValidateCommon(ctx);
        if (common.Count != 0)
        {
            return new(common, CommonError(ctx));
        }

        // Compose the existing OTC policy so new limits cannot bypass its rules.
        var otcPolicy = new OTCSale(SaleId, CreatedByUserId, CreatedAt);
        otcPolicy.ReplaceItems(Items);
        var otcResult = otcPolicy.Validate(ctx);
        var issues = otcResult.Issues.ToList();
        var code = otcResult.Code;
        if (Items.Any(item => item.Quantity > MaxUnitsPerDrug))
        {
            issues.Add($"Each drug is limited to {MaxUnitsPerDrug} units in this sale.");
            code ??= "PURCHASE_LIMIT_EXCEEDED";
        }

        return new(issues, code);
    }
}
