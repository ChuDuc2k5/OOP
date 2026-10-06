using Pharmacy.Core.Common;
namespace Pharmacy.Core.Domain;

public sealed class Prescription
{
    private readonly List<PrescriptionItem> items = [];
    private Prescription()
    {
    }
    public Prescription(
        string id,
        string? owner,
        string createdBy,
        string patientId,
        string patientName,
        string? imagePath = null)
    {
        PrescriptionId = Guard.Required(id);
        OwnerUserId = owner;
        CreatedByUserId = Guard.Required(createdBy);
        PatientId = Guard.Required(patientId);
        PatientName = Guard.Required(patientName);
        ImagePath = imagePath;
    }
    public string PrescriptionId { get; private set; } = "";
    public string? OwnerUserId
    {
        get; private set;
    }
    public string CreatedByUserId { get; private set; } = "";
    public string PatientId { get; private set; } = "";
    public string PatientName { get; private set; } = "";
    public string? PrescriberName
    {
        get; private set;
    }
    public string? ImagePath
    {
        get; private set;
    }
    public DateOnly? IssueDate
    {
        get; private set;
    }
    public DateOnly? ValidUntil
    {
        get; private set;
    }
    public PrescriptionStatus Status
    {
        get; private set;
    }
    public string? ReviewedByUserId
    {
        get; private set;
    }
    public DateTimeOffset? ReviewedAt
    {
        get; private set;
    }
    public string? ReviewNote
    {
        get; private set;
    }
    public IReadOnlyCollection<PrescriptionItem> Items => items.AsReadOnly();
    public void SetDetails(
        string prescriber,
        DateOnly issued,
        DateOnly until,
        IEnumerable<PrescriptionItem> lines)
    {
        Guard.State(Status == PrescriptionStatus.PendingReview);
        Guard.State(issued <= until);
        var list = lines.ToList();
        Guard.State(list.Count > 0 && list.All(i => i.PrescriptionId == PrescriptionId) && list.Select(i => i.DrugId).Distinct().Count() == list.Count);
        PrescriberName = Guard.Required(prescriber);
        IssueDate = issued;
        ValidUntil = until;
        items.Clear();
        items.AddRange(list);
    }
    public void Approve(string reviewer, DateTimeOffset now)
    {
        Guard.State(Status == PrescriptionStatus.PendingReview && IssueDate != null && ValidUntil != null && !string.IsNullOrWhiteSpace(PrescriberName) && items.Count > 0);
        Status = PrescriptionStatus.Approved;
        ReviewedByUserId = Guard.Required(reviewer);
        ReviewedAt = now;
    }
    public void Reject(string reason, string reviewer, DateTimeOffset now)
    {
        Guard.State(Status == PrescriptionStatus.PendingReview);
        ReviewNote = Guard.Required(reason);
        Status = PrescriptionStatus.Rejected;
        ReviewedByUserId = Guard.Required(reviewer);
        ReviewedAt = now;
    }
    public void CancelValidity(string reason, string reviewer, DateTimeOffset now)
    {
        Guard.State(Status == PrescriptionStatus.Approved && items.Any(i => i.DispensedQuantity < i.PrescribedQuantity));
        ReviewNote = Guard.Required(reason);
        Status = PrescriptionStatus.Cancelled;
        ReviewedByUserId = Guard.Required(reviewer);
        ReviewedAt = now;
    }
    public bool Validate(string patientId, DateOnly date) => Status == PrescriptionStatus.Approved && PatientId == patientId && IssueDate <= date && ValidUntil >= date;
}

public sealed class PrescriptionItem : VersionedEntity
{
    private PrescriptionItem()
    {
    }
    public PrescriptionItem(
        string id,
        string prescriptionId,
        string drugId,
        int quantity)
    {
        ItemId = Guard.Required(id);
        PrescriptionId = Guard.Required(prescriptionId);
        DrugId = Guard.Required(drugId);
        PrescribedQuantity = Guard.Positive(quantity);
    }
    public string ItemId { get; private set; } = "";
    public string PrescriptionId { get; private set; } = "";
    public string DrugId { get; private set; } = "";
    public int PrescribedQuantity
    {
        get; private set;
    }
    public int DispensedQuantity
    {
        get; private set;
    }
    public int Remaining(int activeReservations) => PrescribedQuantity - DispensedQuantity - activeReservations;
    public void RecordDispense(int quantity)
    {
        Guard.Positive(quantity);
        if (quantity > Remaining(0))
        {
            throw new BusinessException("PRESCRIPTION_INVALID", "Vượt lượng được kê.");
        }

        DispensedQuantity += quantity;
    }
}
