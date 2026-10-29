using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;
using Pharmacy.Week4Demo;

namespace Pharmacy.Week4DemoTests;

public sealed class ExtensionTests
{
    private static readonly DateOnly Date = new(2026, 10, 29);
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 9, 0, 0, TimeSpan.FromHours(7));

    private static SaleContext Context(bool requiresPrescription = false, bool controlled = false)
        => new(Date, new Dictionary<string, Drug>
        {
            ["D"] = new("D", "Test drug", "unit", 1000, 0, requiresPrescription, controlled)
        });

    private static Sale WithLine(Sale sale, int quantity)
    {
        sale.ReplaceItems([new("ITEM", sale.SaleId, "D", "Test drug", "unit", quantity, 1000)]);
        return sale;
    }

    [Theory]
    [InlineData(1, true)]
    [InlineData(2, true)]
    [InlineData(3, false)]
    public void ExistingCallerAcceptsNewSubtypeAndLimitBoundary(int quantity, bool expected)
    {
        Sale sale = WithLine(new QuantityLimitedOTCSale("LIMIT", "STAFF", Now, 2), quantity);
        var result = SaleValidationRunner.Evaluate(sale, Context());
        Assert.Equal(expected, result.IsValid);
        Assert.Equal(expected ? null : "PURCHASE_LIMIT_EXCEEDED", result.Code);
        Assert.True(SaleValidationRunner.Evaluate(WithLine(new OTCSale("OTC", "STAFF", Now), quantity), Context()).IsValid);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public void ExtensionPreservesExistingOtcRestrictions(bool requiresPrescription, bool controlled)
    {
        Sale sale = WithLine(new QuantityLimitedOTCSale("LIMIT", "STAFF", Now, 2), 1);
        var result = SaleValidationRunner.Evaluate(sale, Context(requiresPrescription, controlled));
        Assert.False(result.IsValid);
        Assert.Equal("PRESCRIPTION_REQUIRED", result.Code);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void LimitMustBePositive(int limit)
        => Assert.Throws<BusinessException>(() => new QuantityLimitedOTCSale("LIMIT", "STAFF", Now, limit));

    [Fact]
    public void CompletedSaleCannotBeRevalidatedAsDraft()
    {
        Sale sale = WithLine(new QuantityLimitedOTCSale("LIMIT", "STAFF", Now, 2), 1);
        sale.Items.Single().AddAllocation(new("A", "ITEM", "BATCH", 1));
        sale.Complete(Now, PaymentMethod.Cash);
        Assert.Equal("INVALID_STATE", SaleValidationRunner.Evaluate(sale, Context()).Code);
    }

    [Fact]
    public void ExistingPrescriptionSubtypeUsesSameCaller()
    {
        var prescription = new Prescription("RX", null, "STAFF", "PATIENT", "Patient");
        prescription.SetDetails("Prescriber", Date, Date.AddDays(1), [new("RX-ITEM", "RX", "D", 2)]);
        prescription.Approve("STAFF", Now);
        Sale sale = WithLine(new PrescriptionSale("SALE", "STAFF", Now, "RX", "PATIENT"), 1);
        Assert.True(SaleValidationRunner.Evaluate(sale, Context(true) with { Prescription = prescription }).IsValid);
    }

    [Fact]
    public void LimitedOtcDoesNotConsumePrescriptionQuota()
    {
        var item = new PrescriptionItem("RX-ITEM", "RX", "D", 2);
        Sale sale = WithLine(new QuantityLimitedOTCSale("LIMIT", "STAFF", Now, 2), 1);
        sale.ApplyCompletionEffects(new Dictionary<string, PrescriptionItem> { ["D"] = item });
        Assert.Equal(0, item.DispensedQuantity);
    }
}
