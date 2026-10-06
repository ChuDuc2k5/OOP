using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed record PrescriptionLineInput(string? DrugId, int? Quantity);
public record PrescriptionDetailsInput(
    string? PatientId,
    string? PatientName,
    string? PrescriberName,
    DateOnly? IssueDate,
    DateOnly? ValidUntil,
    IReadOnlyList<PrescriptionLineInput>? Items);
public sealed record CounterPrescriptionInput(
    string? PrescriptionId,
    string? PatientId,
    string? PatientName,
    string? PrescriberName,
    DateOnly? IssueDate,
    DateOnly? ValidUntil,
    IReadOnlyList<PrescriptionLineInput>? Items)
    : PrescriptionDetailsInput(PatientId, PatientName, PrescriberName, IssueDate, ValidUntil, Items);
public sealed record PrescriptionItemView(
    string ItemId, string DrugId, string DrugName, string SaleUnit,
    int PrescribedQuantity, int ReservedQuantity, int DispensedQuantity, int RemainingQuantity);
public sealed record PrescriptionRow(
    string PrescriptionId, PrescriptionStatus Status, string PatientId, string PatientName,
    string? OwnerUsername, DateTimeOffset CreatedAt, DateOnly? ValidUntil);
public sealed record PrescriptionView(
    string PrescriptionId, PrescriptionStatus Status, string? OwnerUserId, string? OwnerUsername,
    string CreatedByUsername, string PatientId, string PatientName, string? PrescriberName,
    DateOnly? IssueDate, DateOnly? ValidUntil, bool HasImage, string? ImageUrl,
    string? ReviewedByUsername, DateTimeOffset? ReviewedAt, string? ReviewNote,
    DateTimeOffset CreatedAt, IReadOnlyList<PrescriptionItemView> Items);
public sealed record CartLine(
    string DrugId, string Name, string SaleUnit, string? ImageUrl, decimal UnitPrice,
    int Quantity, decimal LineTotal, bool RequiresPrescription, bool IsControlled,
    string? Issue, int AvailableQuantity);
public sealed record CartView(IReadOnlyList<CartLine> Items, decimal Subtotal);
public sealed record CartAddInput(string? DrugId, int? Quantity);
public sealed record QuantityInput(int? Quantity);
public sealed record ReasonInput(string? Reason);
public sealed record PlaceOrderInput(
    SaleKind? SaleKind, string? ReceiverName, string? Phone, ReceiveMethod? ReceiveMethod,
    string? Address, string? PrescriptionId, decimal? ExpectedTotal);
public sealed record OrderItemView(
    string DrugId, string DrugName, string Unit, int Quantity, decimal UnitPrice, decimal LineTotal);
public sealed record PaymentSummary(
    string PaymentId, PaymentStatus Status, decimal ExpectedAmount, decimal? ReceivedAmount,
    string? ReviewNote, DateTimeOffset? ApprovedAt);
public sealed record OrderRow(
    string OrderId, DateTimeOffset CreatedAt, SaleKind SaleKind, OrderStatus Status,
    decimal TotalAmount, ReceiveMethod ReceiveMethod, PaymentStatus? PaymentStatus,
    string? CustomerUsername, string? HandledByUsername);
public sealed record OrderView(
    string OrderId, DateTimeOffset CreatedAt, SaleKind SaleKind, OrderStatus Status,
    string ReceiverName, string Phone, ReceiveMethod ReceiveMethod, string? Address,
    string? PrescriptionId, string? PatientId, decimal TotalAmount, string? Note,
    IReadOnlyList<OrderItemView> Items, PaymentSummary? Payment, string? InvoiceId,
    string? HandledByUsername, bool CanCancel, bool CanPay, string? CustomerUsername);
public sealed record DashboardSummary(
    int PendingPrescriptions, int AwaitingPaymentOrders, int PendingPayments,
    int PreparingOrders, int LowStockCount, int ExpiringCount);
