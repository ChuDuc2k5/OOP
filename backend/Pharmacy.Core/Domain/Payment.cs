using Pharmacy.Core.Common;
namespace Pharmacy.Core.Domain;

public sealed record PaymentSnapshot(
    string BankName,
    string AccountNumber,
    string AccountName,
    string QrImagePath);
public sealed class PaymentSetting
{
    public int Id { get; private set; } = 1;
    public string BankName { get; private set; } = "";
    public string AccountNumber { get; private set; } = "";
    public string AccountName { get; private set; } = "";
    public string? QrImagePath
    {
        get; private set;
    }
    public void Update(string bank, string number, string name)
    {
        BankName = Guard.Required(bank);
        AccountNumber = Guard.Required(number);
        AccountName = Guard.Required(name);
    }
    public void SetQrImage(string path) => QrImagePath = Guard.Required(path);
    public PaymentSnapshot CreateSnapshot()
    {
        if (string.IsNullOrWhiteSpace(BankName) || string.IsNullOrWhiteSpace(AccountNumber) || string.IsNullOrWhiteSpace(AccountName) || string.IsNullOrWhiteSpace(QrImagePath))
        {
            throw new BusinessException("PAYMENT_NOT_CONFIGURED", "Chưa cấu hình thanh toán.");
        }

        return new(BankName, AccountNumber, AccountName, QrImagePath);
    }
}

public sealed class Payment : VersionedEntity
{
    private Payment()
    {
    }
    public Payment(
        string id,
        string orderId,
        decimal expected,
        PaymentSnapshot snapshot,
        DateTimeOffset now)
    {
        PaymentId = Guard.Required(id);
        OrderId = Guard.Required(orderId);
        ExpectedAmount = Guard.Money(expected);
        BankName = snapshot.BankName;
        AccountNumber = snapshot.AccountNumber;
        AccountName = snapshot.AccountName;
        QrImagePath = snapshot.QrImagePath;
        CreatedAt = now;
    }
    public string PaymentId { get; private set; } = "";
    public string OrderId { get; private set; } = "";
    public PaymentStatus Status
    {
        get; private set;
    }
    public decimal ExpectedAmount
    {
        get; private set;
    }
    public decimal? ReceivedAmount
    {
        get; private set;
    }
    public string? BankReference
    {
        get; private set;
    }
    public string BankName { get; private set; } = "";
    public string AccountNumber { get; private set; } = "";
    public string AccountName { get; private set; } = "";
    public string QrImagePath { get; private set; } = "";
    public DateTimeOffset CreatedAt
    {
        get; private set;
    }
    public DateTimeOffset? ReceivedAt
    {
        get; private set;
    }
    public string? ApprovedByUserId
    {
        get; private set;
    }
    public DateTimeOffset? ApprovedAt
    {
        get; private set;
    }
    public string? ReviewNote
    {
        get; private set;
    }
    public void Confirm(
        string? reference,
        decimal amount,
        DateTimeOffset receivedAt,
        string approver,
        DateTimeOffset now,
        string? note = null)
    {
        Guard.State(Status == PaymentStatus.PendingReview && amount >= ExpectedAmount);
        BankReference = string.IsNullOrWhiteSpace(reference) ? null : reference.Trim();
        ReceivedAmount = Guard.Money(amount);
        ReceivedAt = receivedAt;
        ApprovedByUserId = Guard.Required(approver);
        ApprovedAt = now;
        ReviewNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        Status = PaymentStatus.Confirmed;
    }
    public void RecordUnderpayment(
        decimal amount,
        string? reference,
        DateTimeOffset receivedAt,
        string note)
    {
        Guard.State(Status == PaymentStatus.PendingReview && amount >= 0 && amount < ExpectedAmount && decimal.Truncate(amount) == amount);
        ReceivedAmount = amount;
        BankReference = string.IsNullOrWhiteSpace(reference) ? null : reference.Trim();
        ReceivedAt = receivedAt;
        ReviewNote = Guard.Required(note);
    }
    public void SetNote(string note)
    {
        Guard.State(Status == PaymentStatus.PendingReview);
        ReviewNote = Guard.Required(note);
    }
    public void Close()
    {
        Guard.State(Status == PaymentStatus.PendingReview);
        Status = PaymentStatus.Closed;
    }
}
