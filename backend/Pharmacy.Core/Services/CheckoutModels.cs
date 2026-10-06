using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed record SaleCreateInput(SaleKind? Kind, string? PrescriptionId, string? PatientId);
public sealed record SaleUpdateInput(string? PrescriptionId, string? PatientId, IReadOnlyList<PrescriptionLineInput>? Items);
public sealed record CashInput(bool? CashReceived);
public sealed record AllocationView(string BatchNumber, DateOnly ExpiryDate, int Quantity);
public sealed record SaleLineView(string DrugId, string DrugName, string Unit, int Quantity, decimal UnitPrice,
    decimal LineTotal, IReadOnlyList<AllocationView>? Allocations);
public sealed record SaleView(string SaleId, SaleChannel Channel, SaleKind Kind, SaleStatus Status,
    string CreatedByUsername, DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt,
    string? PrescriptionId, string? PatientId, string? OrderId, IReadOnlyList<SaleLineView> Items,
    decimal TotalAmount, bool CanCheckout, IReadOnlyList<string> Issues, PaymentMethod? PaymentMethod, string? InvoiceId);
public sealed record CheckoutResult(string SaleId, string InvoiceId);
public sealed record PaymentSettingInput(string? BankName, string? AccountNumber, string? AccountName);
public sealed record PaymentSettingView(string BankName, string AccountNumber, string AccountName, string? QrImageUrl, bool IsConfigured);
public sealed record PaymentView(string PaymentId, string OrderId, PaymentStatus Status, decimal ExpectedAmount,
    string TransferContent, string BankName, string AccountNumber, string AccountName, string QrImageUrl,
    decimal? ReceivedAmount, string? ReviewNote, DateTimeOffset CreatedAt, DateTimeOffset? ApprovedAt);
public sealed record PaymentRow(string PaymentId, string OrderId, string CustomerUsername, decimal ExpectedAmount,
    PaymentStatus Status, DateTimeOffset CreatedAt, string? ReviewNote, decimal? ReceivedAmount);
public sealed record PaymentReviewInput(string? BankReference, decimal? ReceivedAmount, DateTimeOffset? ReceivedAt, string? Note);
public sealed record PaymentReviewResult(bool Approved, PaymentView Payment, OrderStatus OrderStatus);
public sealed record NoteInput(string? Note);
public sealed record PaymentOpenResult(bool Created, PaymentView Payment);
public sealed record InvoiceRow(string InvoiceId, DateTimeOffset IssuedAt, SaleKind Kind,
    SaleChannel Channel, decimal TotalAmount, string? CustomerUsername, string CreatedByUsername, string? OrderId);
public sealed record InvoiceView(string InvoiceId, DateTimeOffset IssuedAt, string SaleId, SaleKind Kind,
    SaleChannel Channel, PaymentMethod PaymentMethod, string? CustomerUsername, string? ReceiverName,
    string CreatedByUsername, string? OrderId, string? PrescriptionId, string? PatientId,
    IReadOnlyList<SaleLineView> Items, decimal TotalAmount);
