using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Core.Services;

public sealed class InvoiceService(PharmacyDbContext db, SaleService sales)
{
    public async Task<Paged<InvoiceRow>> Query(string userId, string role, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        InputValidation.Pagination(page, pageSize);
        var invoices = await Scope(userId, role).Include(x => x.Sale).ToListAsync(ct);
        var users = await db.UserAccounts.AsNoTracking().ToDictionaryAsync(x => x.UserId, x => x.Username, ct);
        var term = search?.Trim();
        var matches = invoices.Where(x => string.IsNullOrEmpty(term)
            || x.InvoiceId.Contains(term, StringComparison.OrdinalIgnoreCase)
            || x.Sale.OrderId?.Contains(term, StringComparison.OrdinalIgnoreCase) == true
            || x.Sale.BuyerUserId is not null && users[x.Sale.BuyerUserId].Contains(term, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.IssuedAt).ThenByDescending(x => x.InvoiceId).ToList();
        var rows = matches.Skip((page - 1) * pageSize).Take(pageSize).Select(x => new InvoiceRow(
            x.InvoiceId, x.IssuedAt, x.Sale.Kind, x.Sale.Channel, x.Sale.TotalAmount,
            x.Sale.BuyerUserId is null ? null : users[x.Sale.BuyerUserId], users[x.Sale.CreatedByUserId], x.Sale.OrderId)).ToList();
        return new(rows, page, pageSize, matches.Count);
    }

    public async Task<InvoiceView> Get(string id, string userId, string role, CancellationToken ct = default)
    {
        var invoice = await Scope(userId, role).Include(x => x.Sale).ThenInclude(x => x.Items).ThenInclude(x => x.Allocations)
            .SingleOrDefaultAsync(x => x.InvoiceId == id, ct) ?? throw InputValidation.NotFound();
        var sale = invoice.Sale;
        var users = await db.UserAccounts.AsNoTracking().ToDictionaryAsync(x => x.UserId, x => x.Username, ct);
        var receiver = sale.OrderId is null ? null
            : await db.Orders.Where(x => x.OrderId == sale.OrderId).Select(x => x.ReceiverName).SingleAsync(ct);
        return new(invoice.InvoiceId, invoice.IssuedAt, sale.SaleId, sale.Kind, sale.Channel, sale.PaymentMethod!.Value,
            sale.BuyerUserId is null ? null : users[sale.BuyerUserId], receiver, users[sale.CreatedByUserId],
            sale.OrderId, sale.PrescriptionId, sale.PatientId, await sales.SaleLines(sale, null, ct), sale.TotalAmount);
    }

    private IQueryable<Invoice> Scope(string userId, string role)
    {
        var query = db.Invoices.AsNoTracking().Where(x => x.Sale.Status == SaleStatus.Completed);
        return role switch
        {
            "Admin" => query,
            "User" => query.Where(x => x.Sale.BuyerUserId == userId),
            "Staff" => query.Where(x => x.Sale.CreatedByUserId == userId
                || db.Orders.Any(o => o.OrderId == x.Sale.OrderId && o.HandledByUserId == userId)),
            _ => throw new BusinessException("FORBIDDEN", "Không có quyền xem hóa đơn.")
        };
    }
}
