namespace Pharmacy.Core.Services;

public record InventoryRow(
    string DrugId,
    string Name,
    string SaleUnit,
    int LowStockThreshold,
    int TotalQuantity,
    int UnexpiredQuantity,
    int ReservedQuantity,
    int AvailableQuantity);

public sealed record BatchView(
    string BatchId,
    string BatchNumber,
    DateOnly ExpiryDate,
    int InitialQuantity,
    int Quantity,
    bool IsExpired);

public sealed record InventoryDetail(
    string DrugId,
    string Name,
    string SaleUnit,
    int LowStockThreshold,
    int TotalQuantity,
    int UnexpiredQuantity,
    int ReservedQuantity,
    int AvailableQuantity,
    IReadOnlyList<BatchView> Batches)
    : InventoryRow(DrugId, Name, SaleUnit, LowStockThreshold, TotalQuantity,
        UnexpiredQuantity, ReservedQuantity, AvailableQuantity);

public sealed record BatchInput(string? BatchNumber, DateOnly? ExpiryDate, int? Quantity);
public sealed record LowStockRow(string DrugId, string Name, int AvailableQuantity, int LowStockThreshold);
public sealed record ExpiringRow(
    string DrugId,
    string DrugName,
    string BatchId,
    string BatchNumber,
    int Quantity,
    DateOnly ExpiryDate,
    int DaysRemaining);

public sealed record StockLine(string DrugId, int Quantity);
public sealed record StockAllocation(
    string DrugId,
    string BatchId,
    string BatchNumber,
    DateOnly ExpiryDate,
    int Quantity);
public sealed record StockShortage(string DrugId, int Requested, int Available);
