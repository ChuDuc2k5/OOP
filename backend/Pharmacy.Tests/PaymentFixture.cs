using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;

namespace Pharmacy.Tests;

internal static class PaymentFixture
{
    public static async Task Configure(PharmacyDbContext db)
    {
        if (await db.PaymentSettings.AnyAsync())
        {
            return;
        }
        var setting = new PaymentSetting();
        setting.Update("Ngân hàng kiểm thử", "0000000000", "TEST PHARMACY");
        setting.SetQrImage("qr/test-qr.png");
        db.PaymentSettings.Add(setting);
        await db.SaveChangesAsync();
    }

    public static async Task WriteImage(string storageRoot)
    {
        var path = Path.Combine(storageRoot, "qr", "test-qr.png");
        if (File.Exists(path))
        {
            return;
        }
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var source = TestImage.Open();
        await using var destination = new FileStream(path, FileMode.CreateNew, FileAccess.Write);
        await source.CopyToAsync(destination);
    }
}
