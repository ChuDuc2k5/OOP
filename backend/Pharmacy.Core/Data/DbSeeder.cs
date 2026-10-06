using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;
namespace Pharmacy.Core.Data;

public sealed class DbSeeder(
    PharmacyDbContext db,
    IBusinessClock clock,
    IPasswordHasher<UserAccount> hasher,
    IdGenerator ids,
    StorageOptions storage)
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
            new UserAccount("UDEMO0001", "admin", "Admin@12345", Role.Admin, hasher),
            new UserAccount("UDEMO0002", "staff", "Staff@12345", Role.Staff, hasher),
            new UserAccount("UDEMO0003", "user", "User@12345", Role.User, hasher),
            new UserAccount("UDEMO0004", "user2", "User@12345", Role.User, hasher));
        var products = new (string Name, string Unit, string Description)[]
        {
            ("Paracetamol 500mg", "Viên", "Thuốc giảm đau, hạ sốt dạng viên."),
            ("Vitamin C", "Hộp", "Vitamin C đóng hộp, bổ sung vitamin."),
            ("Nước muối sinh lý", "Chai", "Dung dịch natri clorid 0,9% đóng chai."),
            ("Oresol", "Gói", "Bột pha dung dịch bù nước và điện giải."),
            ("Cetirizine", "Vỉ", "Thuốc kháng dị ứng dạng viên đóng vỉ."),
            ("Kẽm", "Hộp", "Viên bổ sung kẽm đóng hộp."),
            ("Amoxicillin", "Viên", "Kháng sinh amoxicillin, cần đơn thuốc."),
            ("Cefixime", "Vỉ", "Kháng sinh cefixime đóng vỉ, cần đơn thuốc."),
            ("Metformin", "Hộp", "Thuốc điều trị đái tháo đường, cần đơn thuốc."),
            ("Amlodipine", "Viên", "Thuốc điều trị tăng huyết áp, cần đơn thuốc."),
            ("Diazepam", "Viên", "Thuốc kiểm soát đặc biệt, chỉ cấp theo đơn hợp lệ."),
            ("Thuốc ngừng bán", "Tuýp", "Sản phẩm dạng kem dùng cho dữ liệu demo đã tắt bán.")
        };
        var days = new[] { -5, 0, 1, 20, 30, 31 };
        for (var i = 0; i < products.Length; i++)
        {
            var id = i == 0 ? "PARA500" : $"DEMO{i + 1:D2}";
            var product = products[i];
            var drug = new Drug(
                id,
                product.Name,
                product.Unit,
                1000 * (i + 1),
                i == 9 ? 8 : 10,
                i >= 6,
                i == 10,
                i != 11,
                product.Description);
            // Vitamin C is an OTC product still for sale with zero stock for the demo.
            if (i < 10 && i != 1)
            {
                for (var j = 0; j < days.Length; j++)
                {
                    drug.AddBatch(new DrugBatch($"B{i:D4}{j:D4}", id, $"LOT{j + 1:D2}", clock.Today.AddDays(days[j]), i == 9 ? 2 : 20));
                }
            }

            db.Drugs.Add(drug);
        }
        for (var i = 0; i < 3; i++)
        {
            var prescription = new Prescription(await ids.NextAsync("DT", ct), "UDEMO0003", "UDEMO0003", "BN001", "Khách demo");
            if (i < 2)
            {
                prescription.SetDetails("Bác sĩ demo", clock.Today.AddDays(-10), clock.Today.AddDays(i == 0 ? 20 : -1), [new PrescriptionItem($"PITEM{i}", prescription.PrescriptionId, "DEMO07", 30)]);
                prescription.Approve("UDEMO0002", clock.Now);
            }
            db.Prescriptions.Add(prescription);
        }
        var setting = new PaymentSetting();
        setting.Update("Ngân hàng Demo", "0000000000", "NHA THUOC DEMO");
        setting.SetQrImage("qr/demo-qr.png");
        db.PaymentSettings.Add(setting);
        var qrPath = Path.Combine(storage.Root, "qr", "demo-qr.png");
        if (!File.Exists(qrPath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(qrPath)!);
            await using var source = typeof(DbSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data.Assets.demo-qr.png")!;
            await using var destination = new FileStream(qrPath, FileMode.CreateNew, FileAccess.Write);
            await source.CopyToAsync(destination, ct);
        }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
