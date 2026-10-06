using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

internal static class CatalogInventoryFixture
{
    public static readonly DateOnly Date = new(2026, 10, 6);

    public static async Task Seed(PharmacyDbContext db)
    {
        var drug = new Drug("M2STOCK", "Thuốc Thử M2", "Viên", 2000, 5);
        drug.AddBatch(new("M2-OLD", drug.DrugId, "OLD", Date.AddDays(-5), 7));
        drug.AddBatch(new("M2-D", drug.DrugId, "TODAY", Date, 3));
        drug.AddBatch(new("M2-NEXT", drug.DrugId, "NEXT", Date.AddDays(1), 4));
        drug.AddBatch(new("M2-Z", drug.DrugId, "Z", Date.AddDays(20), 2));
        drug.AddBatch(new("M2-A", drug.DrugId, "A", Date.AddDays(20), 3));
        drug.AddBatch(new("M2-30", drug.DrugId, "DAY30", Date.AddDays(30), 6));
        drug.AddBatch(new("M2-31", drug.DrugId, "DAY31", Date.AddDays(31), 8));
        var empty = new DrugBatch("M2-EMPTY", drug.DrugId, "EMPTY", Date.AddDays(1), 1);
        empty.Deduct(1, Date);
        drug.AddBatch(empty);
        db.Drugs.Add(drug);
        var low = new Drug("M2LOW", "Tồn bằng ngưỡng", "Hộp", 1000, 5);
        low.AddBatch(new("M2-LOW", low.DrugId, "LOW", Date.AddDays(31), 5));
        db.Drugs.Add(low);
        db.Drugs.Add(new("M2ZERO", "Hết hàng đang bán", "Chai", 1000, 0));
        var high = new Drug("M2HIGH", "Tồn trên ngưỡng", "Gói", 1000, 5);
        high.AddBatch(new("M2-HIGH", high.DrugId, "HIGH", Date.AddDays(31), 6));
        db.Drugs.Add(high);
        await db.SaveChangesAsync();
    }

    public static Order Order(string id, params (string DrugId, int Quantity)[] lines)
    {
        var order = new Order(id, "U0000003", new TestClock().Now, SaleKind.OTC,
            "Chu Đức", "0900000000", ReceiveMethod.Pickup);
        foreach (var line in lines)
        {
            order.AddItem(new(id + line.DrugId, id, line.DrugId, "Thuốc kiểm thử", "Viên", line.Quantity, 1000));
        }
        return order;
    }
}
