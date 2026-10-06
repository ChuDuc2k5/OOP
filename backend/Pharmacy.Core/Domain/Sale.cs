using Pharmacy.Core.Common;

namespace Pharmacy.Core.Domain;

public sealed record ValidationResult(IReadOnlyList<string> Issues)
{
    public bool IsValid => Issues.Count == 0;
}
public sealed record SaleContext(DateOnly BusinessDate, IReadOnlyDictionary<string, Drug> Drugs,
    Prescription? Prescription = null, IReadOnlyDictionary<string, int>? ActivePrescriptionReservations = null);

public abstract class Sale : VersionedEntity
{
    private readonly List<SaleItem> items = [];
    protected Sale() { }
    protected Sale(string id, string creator, DateTimeOffset now, SaleChannel channel, string? buyer = null, string? orderId = null, string? prescriptionId = null, string? patientId = null)
    { SaleId = Guard.Required(id); CreatedByUserId = Guard.Required(creator); CreatedAt = now; Channel = channel; BuyerUserId = buyer; OrderId = orderId; PrescriptionId = prescriptionId; PatientId = patientId; }
    public string SaleId { get; private set; } = "";
    public SaleChannel Channel { get; private set; }
    public SaleKind Kind { get; protected set; }
    public SaleStatus Status { get; private set; }
    public string CreatedByUserId { get; private set; } = "";
    public DateTimeOffset CreatedAt { get; private set; }
    public string? BuyerUserId { get; private set; }
    public string? OrderId { get; private set; }
    public string? PrescriptionId { get; private set; }
    public string? PatientId { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public decimal TotalAmount { get; private set; }
    public PaymentMethod? PaymentMethod { get; private set; }
    public IReadOnlyCollection<SaleItem> Items => items.AsReadOnly();
    public abstract ValidationResult Validate(SaleContext ctx);
    protected List<string> ValidateCommon(SaleContext ctx)
    {
        var issues = new List<string>();
        if (Status != SaleStatus.Draft || items.Count == 0) issues.Add("Giao dịch không phải nháp hoặc chưa có dòng thuốc.");
        foreach (var item in items)
        {
            if (!ctx.Drugs.TryGetValue(item.DrugId, out var drug)) issues.Add("Không tìm thấy thuốc.");
            else if (!drug.IsForSale) issues.Add("Thuốc đã tắt bán.");
        }
        return issues;
    }
    public void ReplaceItems(IEnumerable<SaleItem> lines)
    {
        Guard.State(Status == SaleStatus.Draft);
        var list = lines.ToList(); Guard.State(list.All(i => i.SaleId == SaleId) && list.Select(i => i.DrugId).Distinct().Count() == list.Count);
        items.Clear(); items.AddRange(list); TotalAmount = items.Sum(i => i.LineTotal);
    }
    public void SetPrescription(string prescriptionId, string patientId) { Guard.State(Status == SaleStatus.Draft && Kind == SaleKind.Prescription); PrescriptionId = Guard.Required(prescriptionId); PatientId = Guard.Required(patientId); }
    public void Complete(DateTimeOffset now, PaymentMethod method)
    {
        Guard.State(Status == SaleStatus.Draft && items.Count > 0 && items.All(i => i.Allocations.Sum(a => a.Quantity) == i.Quantity));
        Guard.State(Channel == SaleChannel.Counter ? method == Domain.PaymentMethod.Cash : method == Domain.PaymentMethod.ManualQR);
        TotalAmount = items.Sum(i => i.LineTotal); foreach (var item in items) item.Seal();
        Status = SaleStatus.Completed; CompletedAt = now; PaymentMethod = method;
    }
    public void CancelDraft() { Guard.State(Status == SaleStatus.Draft); Status = SaleStatus.Cancelled; foreach (var item in items) item.Seal(); }
}

public sealed class OTCSale : Sale
{
    private OTCSale() { Kind = SaleKind.OTC; }
    public OTCSale(string id, string creator, DateTimeOffset now, SaleChannel channel = SaleChannel.Counter, string? buyer = null, string? orderId = null)
        : base(id, creator, now, channel, buyer, orderId) { Kind = SaleKind.OTC; }
    public override ValidationResult Validate(SaleContext ctx)
    {
        var issues = ValidateCommon(ctx);
        if (Items.Any(i => ctx.Drugs.TryGetValue(i.DrugId, out var d) && (d.RequiresPrescription || d.IsControlled))) issues.Add("Bán OTC không được chứa thuốc cần đơn hoặc kiểm soát.");
        return new(issues);
    }
}

public sealed class PrescriptionSale : Sale
{
    private PrescriptionSale() { Kind = SaleKind.Prescription; }
    public PrescriptionSale(string id, string creator, DateTimeOffset now, string prescriptionId, string patientId, SaleChannel channel = SaleChannel.Counter, string? buyer = null, string? orderId = null)
        : base(id, creator, now, channel, buyer, orderId, prescriptionId, patientId) { Kind = SaleKind.Prescription; }
    public override ValidationResult Validate(SaleContext ctx)
    {
        var issues = ValidateCommon(ctx);
        var prescription = ctx.Prescription;
        if (prescription is null || prescription.PrescriptionId != PrescriptionId || !prescription.Validate(PatientId ?? "", ctx.BusinessDate)) issues.Add("Đơn thuốc không hợp lệ.");
        else foreach (var line in Items)
        {
            var prescribed = prescription.Items.SingleOrDefault(i => i.DrugId == line.DrugId);
            if (prescribed is null || line.Quantity > prescribed.Remaining(ctx.ActivePrescriptionReservations?.GetValueOrDefault(prescribed.ItemId) ?? 0)) issues.Add("Thuốc ngoài đơn hoặc vượt hạn mức.");
        }
        return new(issues);
    }
}

public sealed class SaleItem
{
    private readonly List<BatchAllocation> allocations = [];
    private SaleItem() { }
    public SaleItem(string id, string saleId, string drugId, string name, string unit, int quantity, decimal price)
    { SaleItemId = Guard.Required(id); SaleId = Guard.Required(saleId); DrugId = Guard.Required(drugId); DrugName = Guard.Required(name); Unit = Guard.Required(unit); Quantity = Guard.Positive(quantity); UnitPrice = Guard.Money(price); LineTotal = quantity * price; }
    public string SaleItemId { get; private set; } = "";
    public string SaleId { get; private set; } = "";
    public string DrugId { get; private set; } = "";
    public string DrugName { get; private set; } = "";
    public string Unit { get; private set; } = "";
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal LineTotal { get; private set; }
    public bool IsSealed { get; private set; }
    public IReadOnlyCollection<BatchAllocation> Allocations => allocations.AsReadOnly();
    public void SetPrice(decimal price) { Guard.State(!IsSealed); UnitPrice = Guard.Money(price); LineTotal = Quantity * price; }
    public void AddAllocation(BatchAllocation allocation) { Guard.State(!IsSealed && allocation.SaleItemId == SaleItemId && allocations.Sum(a => a.Quantity) + allocation.Quantity <= Quantity); allocations.Add(allocation); }
    internal void Seal() => IsSealed = true;
}

public sealed class BatchAllocation
{
    private BatchAllocation() { }
    public BatchAllocation(string id, string itemId, string batchId, int quantity)
    { AllocationId = Guard.Required(id); SaleItemId = Guard.Required(itemId); BatchId = Guard.Required(batchId); Quantity = Guard.Positive(quantity); }
    public string AllocationId { get; private set; } = "";
    public string SaleItemId { get; private set; } = "";
    public string BatchId { get; private set; } = "";
    public int Quantity { get; private set; }
}

public sealed class Invoice
{
    private Invoice() { }
    public Invoice(string id, Sale sale, DateTimeOffset issuedAt)
    { Guard.State(sale.Status == SaleStatus.Completed); InvoiceId = Guard.Required(id); SaleId = sale.SaleId; IssuedAt = issuedAt; Sale = sale; }
    public string InvoiceId { get; private set; } = "";
    public string SaleId { get; private set; } = "";
    public DateTimeOffset IssuedAt { get; private set; }
    public Sale Sale { get; private set; } = null!;
    public IReadOnlyCollection<SaleItem> ReadDetails() => Sale.Items;
}
