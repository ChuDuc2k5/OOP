using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;
namespace Pharmacy.Tests;

internal static class PersistenceFixture
{
    public static async Task AddBusinessData(PharmacyDbContext db)
    {
        await PaymentFixture.Configure(db);
        var now = new TestClock().Now;
        db.CartItems.Add(new("U0000003", "PARA500", 3));
        var batch = await db.DrugBatches.SingleAsync(x => x.DrugId == "PARA500" && x.BatchNumber == "LOT03");
        batch.Deduct(2, new TestClock().Today);
        var order = new Order("DH2610060001", "U0000003", now, SaleKind.OTC, "Chu Đức", "0900000000", ReceiveMethod.Pickup);
        order.AddItem(new("OI1", order.OrderId, "PARA500", "Paracetamol 500mg", "viên", 2, 1000));
        order.Claim("U0000002");
        order.MarkPreparing();
        db.Orders.Add(order);
        var settings = await db.PaymentSettings.SingleAsync();
        var payment = new Payment("TT2610060001", order.OrderId, 2000, settings.CreateSnapshot(), now);
        payment.Confirm("TEST-BANK-001", 2000, now, "U0000002", now);
        db.Payments.Add(payment);
        var sale = new OTCSale("BH2610060001", "U0000002", now, SaleChannel.Online, "U0000003", order.OrderId);
        var line = new SaleItem("SI1", sale.SaleId, "PARA500", "Paracetamol 500mg", "viên", 2, 1000);
        line.AddAllocation(new("BA1", line.SaleItemId, batch.BatchId, 2));
        sale.ReplaceItems([line]);
        sale.Complete(now, PaymentMethod.ManualQR);
        db.Sales.Add(sale);
        db.Invoices.Add(new("HD2610060001", sale, now));
        order.MarkDelivered(true);
        var active = new Order("DH2610060002", "U0000003", now, SaleKind.Prescription, "Chu Đức", "0900000000", ReceiveMethod.Delivery, "Địa chỉ nhận thuốc", "DT2610060001", "BN001");
        active.AddItem(new("OI2", active.OrderId, "AMOX500", "Amoxicillin", "viên", 3, 7000));
        db.Orders.Add(active);
        db.StockReservations.Add(new("R1", active.OrderId, "AMOX500", 3, "PITEM0"));
        db.Payments.Add(new("TT2610060002", active.OrderId, 21000, settings.CreateSnapshot(), now));
        var prescriptionLine = await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0");
        prescriptionLine.RecordDispense(1);
        var draft = new PrescriptionSale("BH2610060002", "U0000002", now, "DT2610060001", "BN001");
        draft.ReplaceItems([new("SI2", draft.SaleId, "AMOX500", "Amoxicillin", "viên", 1, 7000)]);
        db.Sales.Add(draft);
        var drug = await db.Drugs.SingleAsync(x => x.DrugId == "PARA500");
        drug.Update("Tên đã sửa", "viên", 1500, 7, false, false, true);
        settings.Update("Ngân hàng đã sửa", "1111111111", "TEST UPDATED");
        await db.SaveChangesAsync();
    }
    public static async Task<string> Snapshot(PharmacyDbContext db)
    {
        var result = new SortedDictionary<string, List<string>>();
        await db.Database.OpenConnectionAsync();
        try
        {
            var names = db.Model.GetEntityTypes().Select(x => x.GetTableName()!).Distinct().OrderBy(x => x);
            foreach (var name in names)
            {
                await using var cmd = db.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = "SELECT * FROM \"" + name + "\"";
                await using var reader = await cmd.ExecuteReaderAsync();
                var rows = new List<string>();
                while (await reader.ReadAsync())
                {
                    rows.Add(JsonSerializer.Serialize(Enumerable.Range(0, reader.FieldCount).Select(i => reader.IsDBNull(i) ? null : reader.GetValue(i).ToString()).ToArray()));
                }

                rows.Sort(StringComparer.Ordinal);
                result[name] = rows;
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
        return JsonSerializer.Serialize(result);
    }
}

public sealed class PersistenceTests
{
    [Fact]
    public async Task TC55_Restart_PreservesAllDomainData_AndDoesNotReseed()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-restart-" + Guid.NewGuid() + ".db");
        try
        {
            string before;
            byte[] qrBefore;
            using (var first = new ApiFactory(path))
            {
                using var client = first.Client();
                await first.ConfigurePayments();
                await first.WithDb(PersistenceFixture.AddBusinessData);
                await client.Csrf();
                var response = await client.PostAsJsonAsync("/api/auth/register", new
                {
                    username = "persisted",
                    password = "Password1",
                    confirmPassword = "Password1"
                });
                Assert.Equal(201, (int)response.StatusCode);
                before = await first.WithDb(PersistenceFixture.Snapshot);
                var qrPath = Path.Combine(path + "-storage", "qr", "test-qr.png");
                Assert.True(File.Exists(qrPath));
                await File.AppendAllTextAsync(qrPath, "CUSTOM IMAGE MARKER");
                qrBefore = await File.ReadAllBytesAsync(qrPath);
            }
            using (var restarted = new ApiFactory(path, new DateOnly(2027, 1, 1)))
            {
                using var client = restarted.Client();
                Assert.Equal(before, await restarted.WithDb(PersistenceFixture.Snapshot));
                Assert.Equal(qrBefore, await File.ReadAllBytesAsync(Path.Combine(path + "-storage", "qr", "test-qr.png")));
                Assert.Equal(200, (int)(await client.Login("persisted", "Password1")).StatusCode);
                await restarted.WithDb(async db =>
                {
                    Assert.Equal(5, await db.UserAccounts.CountAsync());
                    Assert.Equal(56, await db.Drugs.CountAsync());
                    Assert.Equal(2, await db.Orders.CountAsync());
                    Assert.Equal(2, await db.Payments.CountAsync());
                    Assert.Single(await db.Invoices.ToListAsync());
                    Assert.Single(await db.StockReservations.ToListAsync());
                    Assert.IsType<PrescriptionSale>(await db.Sales.SingleAsync(x => x.SaleId == "BH2610060002"));
                });
            }
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
    [Fact]
    public async Task Seeder_PartiallyPopulatedDatabase_IsLeftUntouched()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-partial-" + Guid.NewGuid() + ".db");
        try
        {
            await using (var db = new PharmacyDbContext(new DbContextOptionsBuilder<PharmacyDbContext>().UseSqlite($"Data Source={path};Pooling=False").Options))
            {
                await db.Database.MigrateAsync();
                db.Drugs.Add(new("CUSTOM", "Thuốc riêng", "viên", 1000, 0));
                await db.SaveChangesAsync();
            }
            using var factory = new ApiFactory(path);
            using var client = factory.Client();
            await factory.WithDb(async db =>
            {
                Assert.Equal(0, await db.UserAccounts.CountAsync());
                Assert.Equal("CUSTOM", (await db.Drugs.SingleAsync()).DrugId);
                Assert.Equal(0, await db.PaymentSettings.CountAsync());
            });
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
    [Fact]
    public async Task InitialSeed_HasRequiredRolesStockBoundariesAndPrescriptions()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-seed-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            using var client = factory.Client();
            await factory.WithDb(async db =>
            {
                var drugs = await db.Drugs.Include(x => x.Batches).ToListAsync();
                var d = new TestClock().Today;
                Assert.Equal(56, drugs.Count);
                Assert.Contains(drugs, x => x.IsControlled && x.RequiresPrescription);
                Assert.Contains(drugs, x => !x.IsForSale);
                Assert.Contains(drugs, x => x.IsForSale && !x.RequiresPrescription && x.GetAvailableQuantity(d) == 0);
                Assert.All(drugs, x => Assert.False(string.IsNullOrWhiteSpace(x.Description)));
                var legacyIds = new[] { "PARA500", "VITC500", "NACL09", "ORESOL", "CETI10", "ZINC10", "AMOX500", "CEFI200", "METF500", "AMLO5", "DIAZ5", "HYDRO1" };
                Assert.All(drugs.Where(x => legacyIds.Contains(x.DrugId)),
                    x => Assert.Contains(x.SaleUnit, new[] { "Hộp", "Vỉ", "Chai", "Tuýp", "Gói", "Viên" }));
                Assert.Equal("Nước muối sinh lý 0,9%", drugs.Single(x => x.DrugId == "NACL09").Name);
                Assert.Equal("Sản phẩm đã ngừng kinh doanh.", drugs.Single(x => x.DrugId == "HYDRO1").Description);
                Assert.Contains(drugs, x => x.GetAvailableQuantity(d) == x.LowStockThreshold);
                foreach (var offset in new[] { -5, 0, 1, 20, 30, 31 })
                {
                    Assert.Contains(drugs.SelectMany(x => x.Batches), x => x.ExpiryDate == d.AddDays(offset));
                }

                var prescriptions = await db.Prescriptions.ToListAsync();
                Assert.Contains(prescriptions, x => x.Validate("BN001", d));
                Assert.Contains(prescriptions, x => x.ValidUntil < d);
                Assert.Contains(prescriptions, x => x.Status == PrescriptionStatus.PendingReview);
                Assert.Empty(await db.PaymentSettings.ToListAsync());
                Assert.All(prescriptions, x =>
                {
                    Assert.Equal("U0000003", x.OwnerUserId);
                    Assert.Equal("Chu Đức", x.PatientName);
                });
                Assert.All(prescriptions.Where(x => x.Status == PrescriptionStatus.Approved),
                    x => Assert.Equal("BS. Nguyễn Văn Minh", x.PrescriberName));
            });
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
}
