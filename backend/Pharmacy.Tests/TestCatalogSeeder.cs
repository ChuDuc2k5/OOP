using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Data;

namespace Pharmacy.Tests;

internal sealed class TestCatalogSeeder(
    PharmacyDbContext db,
    IBusinessClock clock,
    IPasswordHasher<UserAccount> hasher,
    IdGenerator ids,
    StorageOptions storage) : IDbSeeder
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Existing or partially populated domain database is never overwritten.
        if (await db.UserAccounts.AnyAsync(ct) || await db.Drugs.AnyAsync(ct) || await db.Prescriptions.AnyAsync(ct) || await db.PaymentSettings.AnyAsync(ct) || await db.Orders.AnyAsync(ct) || await db.Sales.AnyAsync(ct))
        {
            return;
        }

        db.UserAccounts.AddRange(
            new UserAccount("U0000001", "admin", "Admin@12345", Role.Admin, hasher),
            new UserAccount("U0000002", "staff", "Staff@12345", Role.Staff, hasher),
            new UserAccount("U0000003", "chuduc", "User@12345", Role.User, hasher),
            new UserAccount("U0000004", "nguyenvana", "User@12345", Role.User, hasher));
        var names = new[]
        {
            "Paracetamol 500mg", "Vitamin C 500mg", "Nước muối sinh lý 0,9%", "Oresol 245",
            "Cetirizine 10mg", "Kẽm gluconat 10mg", "Amoxicillin 500mg", "Cefixime 200mg",
            "Metformin 500mg", "Amlodipine 5mg", "Diazepam 5mg", "Kem Hydrocortison 1%"
        };
        var products = new (string Id, string Unit, string Description)[]
        {
            ("PARA500", "Viên", "Thuốc giảm đau, hạ sốt dạng viên."),
            ("VITC500", "Hộp", "Vitamin C đóng hộp, bổ sung vitamin."),
            ("NACL09", "Chai", "Dung dịch natri clorid 0,9% đóng chai."),
            ("ORESOL", "Gói", "Bột pha dung dịch bù nước và điện giải."),
            ("CETI10", "Vỉ", "Thuốc kháng dị ứng dạng viên đóng vỉ."),
            ("ZINC10", "Hộp", "Viên bổ sung kẽm đóng hộp."),
            ("AMOX500", "Viên", "Kháng sinh amoxicillin, cần đơn thuốc."),
            ("CEFI200", "Vỉ", "Kháng sinh cefixime đóng vỉ, cần đơn thuốc."),
            ("METF500", "Hộp", "Thuốc điều trị đái tháo đường, cần đơn thuốc."),
            ("AMLO5", "Viên", "Thuốc điều trị tăng huyết áp, cần đơn thuốc."),
            ("DIAZ5", "Viên", "Thuốc kiểm soát đặc biệt, chỉ cấp theo đơn hợp lệ."),
            ("HYDRO1", "Tuýp", "Sản phẩm đã ngừng kinh doanh.")
        };
        var days = new[] { -5, 0, 1, 20, 30, 31 };
        for (var i = 0; i < products.Length; i++)
        {
            var product = products[i];
            var id = product.Id;
            var drug = new Drug(
                id,
                names[i],
                product.Unit,
                1000 * (i + 1),
                i == 9 ? 8 : 10,
                i >= 6,
                i == 10,
                i != 11,
                product.Description);
            // Vitamin C remains for sale with zero stock to exercise stock guards.
            if (i < 10 && i != 1)
            {
                for (var j = 0; j < days.Length; j++)
                {
                    drug.AddBatch(new DrugBatch($"B{i:D4}{j:D4}", id, $"LOT{j + 1:D2}", clock.Today.AddDays(days[j]), i == 9 ? 2 : 20));
                }
            }

            Directory.CreateDirectory(Path.Combine(storage.Root, "drugs"));
            await File.WriteAllBytesAsync(Path.Combine(storage.Root, "drugs", id + ".png"), TestImage.Bytes, ct);
            drug.SetImage("drugs/" + id + ".png");
            db.Drugs.Add(drug);
        }
        for (var i = 0; i < 3; i++)
        {
            var prescription = new Prescription(await ids.NextAsync("DT", ct), "U0000003", "U0000003", "BN001", "Chu Đức", createdAt: clock.Now);
            if (i < 2)
            {
                prescription.SetDetails("BS. Nguyễn Văn Minh", clock.Today.AddDays(-10), clock.Today.AddDays(i == 0 ? 20 : -1), [new PrescriptionItem($"PITEM{i}", prescription.PrescriptionId, "AMOX500", 30)]);
                prescription.Approve("U0000002", clock.Now);
            }
            db.Prescriptions.Add(prescription);
        }
        await db.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);
    }
}
