using Pharmacy.Core.Common;

namespace Pharmacy.Core.Domain;

public sealed class CartItem
{
    private CartItem() { }
    public CartItem(string userId, string drugId, int quantity) { UserId = Guard.Required(userId); DrugId = Guard.Required(drugId); ChangeQuantity(quantity); }
    public string UserId { get; private set; } = "";
    public string DrugId { get; private set; } = "";
    public int Quantity { get; private set; }
    public void ChangeQuantity(int quantity) => Quantity = Guard.Positive(quantity);
}

public sealed class Order : VersionedEntity
{
    private readonly List<OrderItem> items = [];
    private Order() { }
    public Order(string id, string userId, DateTimeOffset now, SaleKind kind, string receiver, string phone, ReceiveMethod method, string? address = null, string? prescriptionId = null, string? patientId = null, bool waitingReview = false)
    {
        OrderId = Guard.Required(id); UserId = Guard.Required(userId); CreatedAt = now; SaleKind = kind;
        ReceiverName = Guard.Required(receiver); Phone = Guard.Required(phone); ReceiveMethod = method;
        Address = method == ReceiveMethod.Delivery ? Guard.Required(address ?? "") : null;
        PrescriptionId = prescriptionId; PatientId = patientId;
        Guard.State(kind == SaleKind.OTC || !string.IsNullOrWhiteSpace(prescriptionId) && !string.IsNullOrWhiteSpace(patientId));
        Status = waitingReview ? OrderStatus.WaitingReview : OrderStatus.AwaitingPayment;
    }
    public string OrderId { get; private set; } = "";
    public string UserId { get; private set; } = "";
    public DateTimeOffset CreatedAt { get; private set; }
    public SaleKind SaleKind { get; private set; }
    public string ReceiverName { get; private set; } = "";
    public string Phone { get; private set; } = "";
    public ReceiveMethod ReceiveMethod { get; private set; }
    public string? Address { get; private set; }
    public string? PrescriptionId { get; private set; }
    public string? PatientId { get; private set; }
    public string? HandledByUserId { get; private set; }
    public OrderStatus Status { get; private set; }
    public decimal TotalAmount { get; private set; }
    public string? Note { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => items.AsReadOnly();
    public void AddItem(OrderItem item) { Guard.State(item.OrderId == OrderId && Status is OrderStatus.AwaitingPayment or OrderStatus.WaitingReview); items.Add(item); TotalAmount = items.Sum(i => i.LineTotal); }
    public void Claim(string userId) => HandledByUserId ??= Guard.Required(userId);
    public void AwaitPayment() { Guard.State(Status == OrderStatus.WaitingReview); Status = OrderStatus.AwaitingPayment; }
    public void Cancel(bool paymentConfirmed = false, string? reason = null) { Guard.State(!paymentConfirmed && Status is OrderStatus.WaitingReview or OrderStatus.AwaitingPayment); Status = OrderStatus.Cancelled; Note = reason; }
    public void Reject(string reason, bool paymentConfirmed = false) { Guard.State(!paymentConfirmed && Status is OrderStatus.WaitingReview or OrderStatus.AwaitingPayment); Note = Guard.Required(reason); Status = OrderStatus.Rejected; }
    public void MarkPreparing() { Guard.State(Status == OrderStatus.AwaitingPayment); Status = OrderStatus.Preparing; }
    public void MarkDelivering(bool hasInvoice) { Guard.State(Status == OrderStatus.Preparing && ReceiveMethod == ReceiveMethod.Delivery && hasInvoice); Status = OrderStatus.Delivering; }
    public void MarkDelivered(bool hasInvoice) { Guard.State(hasInvoice && (Status == OrderStatus.Delivering || Status == OrderStatus.Preparing && ReceiveMethod == ReceiveMethod.Pickup)); Status = OrderStatus.Completed; }
    public void SetNote(string note) => Note = note;
}

public sealed class OrderItem
{
    private OrderItem() { }
    public OrderItem(string id, string orderId, string drugId, string name, string unit, int quantity, decimal price)
    { OrderItemId = Guard.Required(id); OrderId = Guard.Required(orderId); DrugId = Guard.Required(drugId); DrugName = Guard.Required(name); Unit = Guard.Required(unit); Quantity = Guard.Positive(quantity); UnitPrice = Guard.Money(price); LineTotal = CalculateLineTotal(); }
    public string OrderItemId { get; private set; } = "";
    public string OrderId { get; private set; } = "";
    public string DrugId { get; private set; } = "";
    public string DrugName { get; private set; } = "";
    public string Unit { get; private set; } = "";
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal LineTotal { get; private set; }
    public decimal CalculateLineTotal() => Quantity * UnitPrice;
}

public sealed class StockReservation
{
    private StockReservation() { }
    public StockReservation(string id, string orderId, string drugId, int quantity, string? prescriptionItemId = null)
    { ReservationId = Guard.Required(id); OrderId = Guard.Required(orderId); DrugId = Guard.Required(drugId); Quantity = Guard.Positive(quantity); PrescriptionItemId = prescriptionItemId; }
    public string ReservationId { get; private set; } = "";
    public string OrderId { get; private set; } = "";
    public string DrugId { get; private set; } = "";
    public string? PrescriptionItemId { get; private set; }
    public int Quantity { get; private set; }
    public ReservationStatus Status { get; private set; }
    public void Consume() { Guard.State(Status == ReservationStatus.Active); Status = ReservationStatus.Consumed; }
    public void Release() { Guard.State(Status == ReservationStatus.Active); Status = ReservationStatus.Released; }
}
