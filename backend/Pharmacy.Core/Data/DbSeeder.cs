using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Domain;
namespace Pharmacy.Core.Data;

public sealed class DbSeeder(PharmacyDbContext db, IBusinessClock clock, IPasswordHasher<UserAccount> hasher, IdGenerator ids, StorageOptions storage)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Existing or partially populated domain database is never overwritten.
        if (await db.UserAccounts.AnyAsync(ct) || await db.Drugs.AnyAsync(ct) || await db.Prescriptions.AnyAsync(ct) || await db.PaymentSettings.AnyAsync(ct) || await db.Orders.AnyAsync(ct) || await db.Sales.AnyAsync(ct)) return;
        db.UserAccounts.AddRange(
            new UserAccount("UDEMO0001", "admin", "Admin@12345", Role.Admin, hasher),
            new UserAccount("UDEMO0002", "staff", "Staff@12345", Role.Staff, hasher),
            new UserAccount("UDEMO0003", "user", "User@12345", Role.User, hasher),
            new UserAccount("UDEMO0004", "user2", "User@12345", Role.User, hasher));
        var names = new[] { "Paracetamol 500mg", "Vitamin C", "NÆ°á»›c muá»‘i sinh lÃ½", "Oresol", "Cetirizine", "Káº½m", "Amoxicillin", "Cefixime", "Metformin", "Amlodipine", "Diazepam", "Thuá»‘c ngá»«ng bÃ¡n" };
        var days = new[] { -5, 0, 1, 20, 30, 31 };
        for (var i = 0; i < names.Length; i++)
        {
            var id = i == 0 ? "PARA500" : $"DEMO{i + 1:D2}";
            var drug = new Drug(id, names[i], "viÃªn", 1000 * (i + 1), i == 9 ? 8 : 10, i >= 6, i == 10, i != 11);
            if (i < 10) for (var j = 0; j < days.Length; j++)
                drug.AddBatch(new DrugBatch($"B{i:D4}{j:D4}", id, $"LOT{j + 1:D2}", clock.Today.AddDays(days[j]), i == 9 ? 2 : 20));
            db.Drugs.Add(drug);
        }
        for (var i = 0; i < 3; i++)
        {
            var prescription = new Prescription(await ids.NextAsync("DT", ct), "UDEMO0003", "UDEMO0003", "BN001", "KhÃ¡ch demo");
            if (i < 2)
            {
                prescription.SetDetails("BÃ¡c sÄ© demo", clock.Today.AddDays(-10), clock.Today.AddDays(i == 0 ? 20 : -1), [new PrescriptionItem($"PITEM{i}", prescription.PrescriptionId, "DEMO07", 30)]);
                prescription.Approve("UDEMO0002", clock.Now);
            }
            db.Prescriptions.Add(prescription);
        }
        var setting = new PaymentSetting(); setting.Update("NgÃ¢n hÃ ng Demo", "0000000000", "NHA THUOC DEMO"); setting.SetQrImage("qr/demo-qr.png"); db.PaymentSettings.Add(setting);
        var qrPath = Path.Combine(storage.Root, "qr", "demo-qr.png");
        if (!File.Exists(qrPath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(qrPath)!);
            await using var source = typeof(DbSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data.Assets.demo-qr.png")!;
            await using var destination = new FileStream(qrPath, FileMode.CreateNew, FileAccess.Write);
            await source.CopyToAsync(destination, ct);
        }
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
    }
}
