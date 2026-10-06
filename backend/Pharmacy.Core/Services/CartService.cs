using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class CartService(
    PharmacyDbContext db,
    InventoryReader inventory,
    InventoryService transactions)
{
    public async Task<CartView> Get(string userId, CancellationToken ct = default)
    {
        await using var transaction = db.Database.CurrentTransaction is null
            ? await db.Database.BeginReadSnapshotAsync(ct) : null;
        var cart = await db.CartItems.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(ct);
        var stock = await inventory.Snapshot(ct);
        var items = cart.OrderBy(x => x.DrugId, StringComparer.Ordinal).Select(item =>
        {
            var entry = stock.Single(x => x.Drug.DrugId == item.DrugId);
            var drug = entry.Drug;
            var available = entry.Inventory.AvailableQuantity;
            var issue = !drug.IsForSale ? "NOT_FOR_SALE"
                : item.Quantity > available ? "INSUFFICIENT_STOCK" : null;
            return new CartLine(drug.DrugId, drug.Name, drug.SaleUnit,
                drug.ImagePath is null ? null : "/api/files/drugs/" + Path.GetFileName(drug.ImagePath),
                drug.UnitPrice, item.Quantity, drug.UnitPrice * item.Quantity,
                drug.RequiresPrescription, drug.IsControlled, issue, available);
        }).ToList();
        if (transaction is not null)
        {
            await transaction.CommitAsync(ct);
        }
        return new(items, items.Sum(x => x.LineTotal));
    }

    public Task<CartView> Add(string userId, CartAddInput input, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            ValidateQuantity(input.Quantity);
            if (string.IsNullOrWhiteSpace(input.DrugId))
            {
                throw new BusinessException("VALIDATION_FAILED", "Mã thuốc là bắt buộc.", "drugId");
            }
            var drugId = input.DrugId.Trim();
            if (!await db.Drugs.AnyAsync(x => x.DrugId == drugId, ct))
            {
                throw InputValidation.NotFound();
            }
            var item = await db.CartItems.SingleOrDefaultAsync(x => x.UserId == userId && x.DrugId == drugId, ct);
            if (item is null)
            {
                db.CartItems.Add(new(userId, drugId, input.Quantity!.Value));
            }
            else
            {
                var sum = (long)item.Quantity + input.Quantity!.Value;
                if (sum > int.MaxValue)
                {
                    throw new BusinessException("VALIDATION_FAILED", "Số lượng vượt giới hạn.", "quantity");
                }
                item.ChangeQuantity((int)sum);
            }
            await db.SaveChangesAsync(ct);
            return await Get(userId, ct);
        }, ct);

    public Task<CartView> Update(string userId, string drugId, int? quantity, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            ValidateQuantity(quantity);
            var item = await Find(userId, drugId, ct);
            item.ChangeQuantity(quantity!.Value);
            await db.SaveChangesAsync(ct);
            return await Get(userId, ct);
        }, ct);

    public Task<CartView> Delete(string userId, string drugId, CancellationToken ct = default)
        => transactions.Execute(async _ =>
        {
            db.CartItems.Remove(await Find(userId, drugId, ct));
            await db.SaveChangesAsync(ct);
            return await Get(userId, ct);
        }, ct);

    private async Task<CartItem> Find(string userId, string drugId, CancellationToken ct)
        => await db.CartItems.SingleOrDefaultAsync(x => x.UserId == userId && x.DrugId == drugId, ct)
            ?? throw InputValidation.NotFound();

    private static void ValidateQuantity(int? quantity)
    {
        if (quantity is null or <= 0)
        {
            throw new BusinessException("VALIDATION_FAILED", "Số lượng phải là số nguyên dương.", "quantity");
        }
    }
}
