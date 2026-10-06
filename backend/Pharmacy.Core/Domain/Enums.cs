namespace Pharmacy.Core.Domain;

public enum Role
{
    User, Staff, Admin
}
public enum SaleKind
{
    OTC, Prescription
}
public enum SaleChannel
{
    Counter, Online
}
public enum SaleStatus
{
    Draft, Completed, Cancelled
}
public enum ReceiveMethod
{
    Pickup, Delivery
}
public enum OrderStatus
{
    WaitingReview, AwaitingPayment, Preparing, Delivering, Completed, Cancelled, Rejected
}
public enum PaymentStatus
{
    PendingReview, Confirmed, Closed
}
public enum PrescriptionStatus
{
    PendingReview, Approved, Rejected, Cancelled
}
public enum PaymentMethod
{
    Cash, ManualQR
}
public enum ReservationStatus
{
    Active, Consumed, Released
}

public abstract class VersionedEntity
{
    public int Version
    {
        get; private set;
    }
}
