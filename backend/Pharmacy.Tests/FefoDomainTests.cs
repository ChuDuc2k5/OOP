using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

public sealed class FefoDomainTests
{
    [Fact]
    public void TC18_DomainFefo_SplitsBatches_AndBreaksTiesByBatchNumber()
    {
        var d = CatalogInventoryFixture.Date;
        var drug = new Drug("FEFO", "Thuốc thử", "Viên", 1000, 0);
        drug.AddBatch(new("LATER", drug.DrugId, "LATER", d.AddDays(31), 10));
        drug.AddBatch(new("Z", drug.DrugId, "Z", d.AddDays(1), 2));
        drug.AddBatch(new("A", drug.DrugId, "A", d.AddDays(1), 3));
        drug.AddBatch(new("D", drug.DrugId, "D", d, 20));
        var plan = drug.PlanFEFO(6, d);
        Assert.Equal(new[] { "A", "Z", "LATER" }, plan.Select(x => x.Batch.BatchNumber));
        Assert.Equal(new[] { 3, 2, 1 }, plan.Select(x => x.Quantity));
        Assert.Equal(35, drug.Batches.Sum(x => x.Quantity));
        Assert.Throws<BusinessException>(() => drug.PlanFEFO(16, d));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(30, true)]
    [InlineData(31, true)]
    public void TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted(int days, bool allowed)
    {
        var d = CatalogInventoryFixture.Date;
        var batch = new DrugBatch("B", "D", "LOT", d.AddDays(days), 1);
        if (allowed)
        {
            batch.Deduct(1, d);
            Assert.Equal(0, batch.Quantity);
        }
        else
        {
            Assert.Throws<BusinessException>(() => batch.Deduct(1, d));
            Assert.Equal(1, batch.Quantity);
        }
    }
}
