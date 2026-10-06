using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class ProductService(
    PharmacyDbContext db,
    InventoryReader inventory,
    IFileStorage files)
{
    public async Task<Paged<Product>> QueryProducts(
        bool authenticated,
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var snapshot = await inventory.Snapshot(ct);
        var matches = snapshot.Where(x => x.Drug.IsForSale && InventoryReader.Matches(x.Drug, search))
            .OrderBy(x => x.Drug.DrugId, StringComparer.Ordinal).ToList();
        var items = matches.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => ToProduct(x, authenticated)).ToList();
        return new(items, page, pageSize, matches.Count);
    }

    public async Task<Product> GetProduct(string drugId, bool authenticated, CancellationToken ct = default)
    {
        var snapshot = await inventory.Snapshot(ct);
        var stock = snapshot.SingleOrDefault(x => x.Drug.DrugId == drugId && x.Drug.IsForSale)
            ?? throw InputValidation.NotFound();
        return ToProduct(stock, authenticated);
    }

    public async Task<Paged<DrugAdmin>> QueryDrugs(
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var drugs = await db.Drugs.AsNoTracking().ToListAsync(ct);
        var matches = drugs.Where(x => InventoryReader.Matches(x, search))
            .OrderBy(x => x.DrugId, StringComparer.Ordinal).ToList();
        var items = matches.Skip((page - 1) * pageSize).Take(pageSize).Select(ToAdmin).ToList();
        return new(items, page, pageSize, matches.Count);
    }

    public async Task<DrugAdmin> GetDrug(string drugId, CancellationToken ct = default)
        => ToAdmin(await FindDrug(drugId, ct));

    public async Task<DrugAdmin> CreateDrug(DrugCreate input, CancellationToken ct = default)
    {
        Validate(input);
        if (string.IsNullOrWhiteSpace(input.DrugId))
        {
            throw new BusinessException("VALIDATION_FAILED", "Mã thuốc không được để trống.", "drugId");
        }
        var drugId = input.DrugId.Trim();
        if (await db.Drugs.AnyAsync(x => x.DrugId == drugId, ct))
        {
            throw Duplicate();
        }
        var drug = new Drug(
            drugId,
            input.Name!,
            input.SaleUnit!,
            input.UnitPrice!.Value,
            input.LowStockThreshold!.Value,
            input.RequiresPrescription!.Value,
            input.IsControlled!.Value,
            input.IsForSale!.Value,
            input.Description);
        db.Drugs.Add(drug);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e) when (DatabaseErrors.IsUniqueViolation(e))
        {
            db.Entry(drug).State = EntityState.Detached;
            throw Duplicate();
        }
        return ToAdmin(drug);
    }

    public async Task<DrugAdmin> UpdateDrug(string drugId, DrugInput input, CancellationToken ct = default)
    {
        var drug = await FindDrug(drugId, ct);
        Validate(input);
        drug.Update(
            input.Name!,
            input.SaleUnit!,
            input.UnitPrice!.Value,
            input.LowStockThreshold!.Value,
            input.RequiresPrescription!.Value,
            input.IsControlled!.Value,
            input.IsForSale!.Value,
            input.Description);
        await db.SaveChangesAsync(ct);
        return ToAdmin(drug);
    }

    public async Task<DrugAdmin> SetSaleStatus(string drugId, bool? isForSale, CancellationToken ct = default)
    {
        var drug = await FindDrug(drugId, ct);
        if (isForSale is null)
        {
            throw new BusinessException("VALIDATION_FAILED", "Trạng thái bán là bắt buộc.", "isForSale");
        }
        drug.SetForSale(isForSale.Value);
        await db.SaveChangesAsync(ct);
        return ToAdmin(drug);
    }

    public async Task<DrugAdmin> UploadImage(string drugId, DrugImage? image, CancellationToken ct = default)
    {
        var drug = await FindDrug(drugId, ct);
        if (image is null || image.Length > LocalFileStorage.MaxBytes)
        {
            throw new BusinessException("FILE_INVALID", "Ảnh phải là PNG/JPEG và không quá 5 MB.", "file");
        }
        var path = await files.SaveAsync("drugs", image.Content, image.FileName, image.ContentType, ct);
        drug.SetImage(path);
        await db.SaveChangesAsync(ct);
        return ToAdmin(drug);
    }

    public async Task<StoredDrugImage> GetImage(string fileName, CancellationToken ct = default)
    {
        if (!await db.Drugs.AsNoTracking().AnyAsync(x => x.ImagePath == "drugs/" + fileName, ct))
        {
            throw InputValidation.NotFound();
        }
        var content = files.OpenRead("drugs", fileName);
        return new(content, Path.GetExtension(fileName) == ".png" ? "image/png" : "image/jpeg");
    }

    private async Task<Drug> FindDrug(string drugId, CancellationToken ct)
        => await db.Drugs.SingleOrDefaultAsync(x => x.DrugId == drugId, ct)
            ?? throw InputValidation.NotFound();

    private static void Validate(DrugInput input)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            errors["name"] = ["Tên thuốc không được để trống."];
        }
        if (string.IsNullOrWhiteSpace(input.SaleUnit))
        {
            errors["saleUnit"] = ["Đơn vị bán không được để trống."];
        }
        if (input.UnitPrice is null || input.UnitPrice <= 0 || decimal.Truncate(input.UnitPrice.Value) != input.UnitPrice)
        {
            errors["unitPrice"] = ["Giá phải là số nguyên VND dương."];
        }
        if (input.LowStockThreshold is null or < 0)
        {
            errors["lowStockThreshold"] = ["Ngưỡng tồn phải là số nguyên không âm."];
        }
        if (input.RequiresPrescription is null || input.IsControlled == true && input.RequiresPrescription != true)
        {
            errors["requiresPrescription"] = ["Thuốc kiểm soát bắt buộc cần đơn thuốc."];
        }
        if (input.IsControlled is null)
        {
            errors["isControlled"] = ["Phân loại kiểm soát là bắt buộc."];
        }
        if (input.IsForSale is null)
        {
            errors["isForSale"] = ["Trạng thái bán là bắt buộc."];
        }
        InputValidation.ThrowIfAny(errors);
    }

    private static Product ToProduct(DrugStock stock, bool authenticated)
        => new(stock.Drug.DrugId, stock.Drug.Name, stock.Drug.Description, ImageUrl(stock.Drug),
            stock.Drug.SaleUnit, stock.Drug.RequiresPrescription, stock.Drug.IsControlled,
            stock.Inventory.AvailableQuantity > 0, authenticated ? stock.Drug.UnitPrice : null);

    private static DrugAdmin ToAdmin(Drug drug)
        => new(drug.DrugId, drug.Name, drug.Description, ImageUrl(drug), drug.SaleUnit,
            drug.UnitPrice, drug.LowStockThreshold, drug.RequiresPrescription, drug.IsControlled, drug.IsForSale);

    private static string? ImageUrl(Drug drug)
        => drug.ImagePath is null ? null : "/api/files/drugs/" + Path.GetFileName(drug.ImagePath);

    private static BusinessException Duplicate() => new("DUPLICATE", "Mã thuốc đã tồn tại.", "drugId");
}
