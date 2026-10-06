using Pharmacy.Core.Common;

namespace Pharmacy.Core.Domain;

public sealed class Drug
{
    private readonly List<DrugBatch> batches = [];
    private Drug() { }
    public Drug(string id, string name, string unit, decimal price, int threshold, bool requiresPrescription = false, bool controlled = false, bool forSale = true)
    {
        DrugId = Guard.Required(id); Update(name, unit, price, threshold, requiresPrescription, controlled, forSale);
    }
    public string DrugId { get; private set; } = "";
    public string Name { get; private set; } = "";
    public string? Description { get; private set; }
    public string? ImagePath { get; private set; }
    public string SaleUnit { get; private set; } = "";
    public decimal UnitPrice { get; private set; }
    public int LowStockThreshold { get; private set; }
    public bool RequiresPrescription { get; private set; }
    public bool IsControlled { get; private set; }
    public bool IsForSale { get; private set; }
    public IReadOnlyCollection<DrugBatch> Batches => batches.AsReadOnly();
    public void Update(string name, string unit, decimal price, int threshold, bool requiresPrescription, bool controlled, bool forSale, string? description = null)
    {
        if (threshold < 0 || controlled && !requiresPrescription) throw new BusinessException("VALIDATION_FAILED", "Phân loại hoặc ngưỡng tồn không hợp lệ.");
        Name = Guard.Required(name); SaleUnit = Guard.Required(unit); UnitPrice = Guard.Money(price);
        LowStockThreshold = threshold; RequiresPrescription = requiresPrescription; IsControlled = controlled; IsForSale = forSale; Description = description;
    }
    public void SetImage(string path) => ImagePath = Guard.Required(path);
    public void AddBatch(DrugBatch batch) { Guard.State(batch.DrugId == DrugId); batches.Add(batch); }
    public int GetAvailableQuantity(DateOnly date, int activeReservations = 0) => Math.Max(0, batches.Where(b => b.ExpiryDate > date).Sum(b => b.Quantity) - activeReservations);
    public IReadOnlyList<BatchPlan> PlanFEFO(int quantity, DateOnly date)
    {
        Guard.Positive(quantity);
        var remaining = quantity; var plan = new List<BatchPlan>();
        foreach (var batch in batches.Where(b => b.ExpiryDate > date && b.Quantity > 0).OrderBy(b => b.ExpiryDate).ThenBy(b => b.BatchNumber, StringComparer.Ordinal))
        {
            var take = Math.Min(remaining, batch.Quantity); plan.Add(new(batch, take)); remaining -= take;
            if (remaining == 0) break;
        }
        if (remaining > 0) throw new BusinessException("INSUFFICIENT_STOCK", "Không đủ tồn còn hạn.");
        return plan;
    }
}
public sealed record BatchPlan(DrugBatch Batch, int Quantity);

public sealed class DrugBatch : VersionedEntity
{
    private DrugBatch() { }
    // Historical/seed batches may already be expired; import service must check D.
    public DrugBatch(string id, string drugId, string number, DateOnly expiry, int quantity)
    {
        BatchId = Guard.Required(id); DrugId = Guard.Required(drugId); BatchNumber = Guard.Required(number);
        ExpiryDate = expiry; InitialQuantity = Quantity = Guard.Positive(quantity);
    }
    public string BatchId { get; private set; } = "";
    public string DrugId { get; private set; } = "";
    public string BatchNumber { get; private set; } = "";
    public DateOnly ExpiryDate { get; private set; }
    public int InitialQuantity { get; private set; }
    public int Quantity { get; private set; }
    public void Deduct(int quantity, DateOnly businessDate)
    {
        Guard.Positive(quantity);
        if (ExpiryDate <= businessDate || quantity > Quantity) throw new BusinessException("INSUFFICIENT_STOCK", "Lô hết hạn hoặc không đủ tồn.");
        Quantity -= quantity;
    }
}
