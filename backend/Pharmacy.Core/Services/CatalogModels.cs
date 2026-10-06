using System.Text.Json.Serialization;

namespace Pharmacy.Core.Services;

public sealed record Product(
    string DrugId,
    string Name,
    string? Description,
    string? ImageUrl,
    string SaleUnit,
    bool RequiresPrescription,
    bool IsControlled,
    bool InStock,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? UnitPrice);

public sealed record DrugAdmin(
    string DrugId,
    string Name,
    string? Description,
    string? ImageUrl,
    string SaleUnit,
    decimal UnitPrice,
    int LowStockThreshold,
    bool RequiresPrescription,
    bool IsControlled,
    bool IsForSale);

public record DrugInput(
    string? Name,
    string? Description,
    string? SaleUnit,
    decimal? UnitPrice,
    int? LowStockThreshold,
    bool? RequiresPrescription,
    bool? IsControlled,
    bool? IsForSale);

public sealed record DrugCreate(
    string? DrugId,
    string? Name,
    string? Description,
    string? SaleUnit,
    decimal? UnitPrice,
    int? LowStockThreshold,
    bool? RequiresPrescription,
    bool? IsControlled,
    bool? IsForSale)
    : DrugInput(Name, Description, SaleUnit, UnitPrice, LowStockThreshold,
        RequiresPrescription, IsControlled, IsForSale);

public sealed record DrugImage(Stream Content, string FileName, string ContentType, long Length);
public sealed record StoredDrugImage(Stream Content, string ContentType);
