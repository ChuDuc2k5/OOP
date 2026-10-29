using Pharmacy.Core.Domain;

namespace Pharmacy.Week4Demo;

public static class SaleValidationRunner
{
    public static ValidationResult Evaluate(Sale sale, SaleContext context)
        => sale.Validate(context);
}
