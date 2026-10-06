using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;
namespace Pharmacy.Tests;

public sealed class FoundationTests
{
    [Fact]
    public void Domain_ProtectsStockQuotaReservationsAndReadOnlyCollections()
    {
        var d = new DateOnly(2026, 10, 6);
        var drug = new Drug("X", "Drug", "unit", 1000, 0);
        var batch = new DrugBatch("B1", "X", "01", d.AddDays(1), 5);
        drug.AddBatch(batch);
        Assert.Throws<BusinessException>(() => batch.Deduct(0, d));
        Assert.Throws<BusinessException>(() => batch.Deduct(6, d));
        Assert.Throws<BusinessException>(() => batch.Deduct(1, d.AddDays(1)));
        Assert.Equal(5, batch.Quantity);
        batch.Deduct(2, d);
        Assert.Equal(3, batch.Quantity);
        Assert.Throws<NotSupportedException>(() => ((ICollection<DrugBatch>)drug.Batches).Clear());
        var item = new PrescriptionItem("I", "P", "X", 5);
        item.RecordDispense(2);
        Assert.Equal(2, item.Remaining(1));
        Assert.Throws<BusinessException>(() => item.RecordDispense(4));
        var reservation = new StockReservation("R", "O", "X", 2);
        reservation.Consume();
        Assert.Throws<BusinessException>(() => reservation.Release());
        Assert.Throws<BusinessException>(() => new Drug("Y", "Controlled", "unit", 1000, 0, false, true));
    }
    [Fact]
    public void SaleValidation_DispatchesThroughAbstractBaseType()
    {
        var d = new DateOnly(2026, 10, 6);
        var now = new TestClock().Now;
        var drug = new Drug("RX", "Thuốc cần đơn", "viên", 1000, 0, true);
        var prescription = new Prescription("P", "U", "S", "PAT", "Bệnh nhân");
        prescription.SetDetails("Bác sĩ", d, d.AddDays(1), [new("I", "P", "RX", 5)]);
        prescription.Approve("S", now);
        Sale otc = new OTCSale("S1", "S", now);
        Sale rx = new PrescriptionSale("S2", "S", now, "P", "PAT");
        otc.ReplaceItems([new("SI1", "S1", "RX", "Thuốc cần đơn", "viên", 2, 1000)]);
        rx.ReplaceItems([new("SI2", "S2", "RX", "Thuốc cần đơn", "viên", 2, 1000)]);
        var context = new SaleContext(d, new Dictionary<string, Drug> { ["RX"] = drug }, prescription);
        Assert.False(otc.Validate(context).IsValid);
        Assert.True(rx.Validate(context).IsValid);
        Assert.False(rx.Validate(context with
        {
            ActivePrescriptionReservations = new Dictionary<string, int> { ["I"] = 4 }
        }).IsValid);
    }
    [Fact]
    public async Task Sqlite_EnforcesUniquePartialIndexesForeignKeysAndChecks()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-constraints-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            using var client = factory.Client();
            await factory.WithDb(PersistenceFixture.AddBusinessData);
            await factory.WithDb(async db =>
            {
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE DrugBatches SET Quantity = -1 WHERE BatchId = 'B00000002'"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE Drugs SET UnitPrice = '1.5' WHERE DrugId = 'PARA500'"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE DrugBatches SET DrugId = 'MISSING' WHERE BatchId = 'B00000002'"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE DrugBatches SET BatchNumber = 'LOT01' WHERE BatchId = 'B00000002'"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE UserAccounts SET Username = 'CHUDUC', NormalizedUsername = 'CHUDUC' WHERE UserId = 'U0000004'"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("INSERT INTO CartItems(UserId,DrugId,Quantity) VALUES ('U0000003','PARA500',1)"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE Payments SET OrderId = 'DH2610060001' WHERE PaymentId = 'TT2610060002'"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("INSERT INTO Invoices(InvoiceId,SaleId,IssuedAt) SELECT 'HD-DUP',SaleId,IssuedAt FROM Invoices"));
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("INSERT INTO StockReservations(ReservationId,OrderId,DrugId,PrescriptionItemId,Quantity,Status) SELECT 'R2',OrderId,DrugId,PrescriptionItemId,Quantity,'Active' FROM StockReservations"));
                await db.Database.ExecuteSqlRawAsync("INSERT INTO StockReservations(ReservationId,OrderId,DrugId,PrescriptionItemId,Quantity,Status) SELECT 'R2',OrderId,DrugId,PrescriptionItemId,Quantity,'Released' FROM StockReservations WHERE ReservationId = 'R1'");
                await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE Payments SET Status='Confirmed', ReceivedAmount=ExpectedAmount, BankReference='TEST-BANK-001', ApprovedByUserId='U0000002', ApprovedAt=CreatedAt WHERE PaymentId='TT2610060002'"));
                await db.Database.ExecuteSqlRawAsync("UPDATE Payments SET BankReference='TEST-BANK-001' WHERE PaymentId='TT2610060002'");
                var duplicateSale = await Assert.ThrowsAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync("UPDATE Sales SET OrderId='DH2610060001',Channel='Online',Status='Completed',CompletedAt=CreatedAt,PaymentMethod='ManualQR' WHERE SaleId='BH2610060002'"));
                Assert.Equal(2067, duplicateSale.SqliteExtendedErrorCode);
            });
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
    [Fact]
    public async Task Versions_RejectStaleWrites_FromSeparateContexts()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-concurrency-" + Guid.NewGuid() + ".db");
        try
        {
            using var factory = new ApiFactory(path);
            using var client = factory.Client();
            using var firstScope = factory.Services.CreateScope();
            using var secondScope = factory.Services.CreateScope();
            var first = firstScope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
            var second = secondScope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
            var a = await first.DrugBatches.FirstAsync(x => x.ExpiryDate > new TestClock().Today);
            var b = await second.DrugBatches.SingleAsync(x => x.BatchId == a.BatchId);
            a.Deduct(1, new TestClock().Today);
            b.Deduct(1, new TestClock().Today);
            await first.SaveChangesAsync();
            Assert.Equal(1, a.Version);
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => second.SaveChangesAsync());
            foreach (var type in new[] { typeof(Order), typeof(Payment), typeof(Sale), typeof(DrugBatch), typeof(PrescriptionItem) })
            {
                Assert.True(first.Model.FindEntityType(type)!.FindProperty("Version")!.IsConcurrencyToken);
            }
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
    [Fact]
    public async Task IdGenerator_IsAtomicPersistentAndUsesBusinessDate()
    {
        var path = Path.Combine(Path.GetTempPath(), "pharmacy-ids-" + Guid.NewGuid() + ".db");
        try
        {
            using (var factory = new ApiFactory(path))
            {
                using var client = factory.Client();
                var ids = await Task.WhenAll(Enumerable.Range(0, 20).Select(async _ =>
                {
                    using var scope = factory.Services.CreateScope();
                    return await scope.ServiceProvider.GetRequiredService<IdGenerator>().NextAsync("DH");
                }));
                Assert.Equal(20, ids.Distinct().Count());
                Assert.All(ids, id => Assert.Matches("^DH261006[0-9]{4}$", id));
            }
            using (var restarted = new ApiFactory(path))
            {
                using var client = restarted.Client();
                using var scope = restarted.Services.CreateScope();
                var ids = scope.ServiceProvider.GetRequiredService<IdGenerator>();
                Assert.Equal("DH2610060021", await ids.NextAsync("DH"));
                Assert.Matches("^U[A-F0-9]{8}$", ids.User());
                Assert.Matches("^B[A-F0-9]{8}$", ids.Batch());
            }
        }
        finally
        {
            ApiFactory.Cleanup(path);
        }
    }
    [Fact]
    public async Task FileStorage_ValidatesMagicSizeMimeExtensionAndTraversal()
    {
        var root = Path.Combine(Path.GetTempPath(), "pharmacy-storage-" + Guid.NewGuid());
        try
        {
            var storage = new LocalFileStorage(root);
            await using var png = typeof(DbSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data.Assets.drugs.PARA500.png")!;
            var path = await storage.SaveAsync("prescriptions", png, "../../original.png", "image/png");
            Assert.Matches("^prescriptions/[a-f0-9]{32}\\.png$", path);
            using var read = storage.OpenRead("prescriptions", Path.GetFileName(path));
            Assert.True(read.Length > 8);
            var jpeg = new byte[] { 255, 216, 255, 224, 0, 2, 255, 217 };
            using var jpg = new MemoryStream(jpeg);
            Assert.EndsWith(".jpg", await storage.SaveAsync("drugs", jpg, "original.jpeg", "image/jpeg"));
            foreach (var input in new[] { (new byte[] { 1, 2, 3 }, "fake.png", "image/png"), (jpeg, "wrong.png", "image/png"), (jpeg, "wrong.jpg", "text/plain"), (new byte[LocalFileStorage.MaxBytes + 1], "huge.jpg", "image/jpeg") })
            {
                using var stream = new MemoryStream(input.Item1);
                var error = await Assert.ThrowsAsync<BusinessException>(() => storage.SaveAsync("qr", stream, input.Item2, input.Item3));
                Assert.Equal("FILE_INVALID", error.Code);
            }
            Assert.Throws<BusinessException>(() => storage.OpenRead("prescriptions", "../secret.png"));
            Assert.Throws<BusinessException>(() => storage.OpenRead("qr", "C:\\secret.png"));
            Assert.Throws<ArgumentException>(() => storage.OpenRead("../", "secret.png"));
        }
        finally
        {
            if (!Path.GetFullPath(root).StartsWith(Path.GetFullPath(Path.GetTempPath()), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException();
            }

            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }
}
