using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Services;

namespace Pharmacy.Tests;

public sealed class OrderingTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), "pharmacy-ordering-" + Guid.NewGuid() + ".db");
    private readonly ApiFactory factory;

    public OrderingTests() => factory = new(path);

    public void Dispose()
    {
        factory.Dispose();
        ApiFactory.Cleanup(path);
    }

    private async Task<HttpClient> Login(string role = "user")
    {
        var client = factory.Client();
        var password = role == "staff" ? "Staff@12345" : role == "admin" ? "Admin@12345" : "User@12345";
        Assert.Equal(200, (int)(await client.Login(role, password)).StatusCode);
        await client.Csrf();
        return client;
    }

    private static async Task<JsonElement> Ok(HttpResponseMessage response, int status = 200)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True((int)response.StatusCode == status, text);
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    private static object Place(decimal total, string kind = "OTC", string? prescription = null, string receive = "Pickup")
        => new
        {
            saleKind = kind,
            receiverName = "Người nhận",
            phone = "0901234567",
            receiveMethod = receive,
            address = receive == "Delivery" ? "Địa chỉ giao" : null,
            prescriptionId = prescription,
            expectedTotal = total,
            userId = "UDEMO0004",
            unitPrice = 1
        };

    private static object Details(string patient = "BN001", int quantity = 10, string date = "2026-10-06")
        => new
        {
            patientId = patient,
            patientName = "Khách demo",
            prescriberName = "Bác sĩ thử",
            issueDate = date,
            validUntil = "2026-10-20",
            items = new[] { new { drugId = "DEMO07", quantity } }
        };

    private async Task Add(HttpClient client, string drugId = "PARA500", int quantity = 2)
        => await Ok(await client.PostAsJsonAsync("/api/cart/items", new
        {
            drugId,
            quantity
        }));

    private async Task<string> Order(HttpClient client, string receive = "Pickup")
    {
        await Add(client);
        var cart = await Ok(await client.GetAsync("/api/cart"));
        var order = await Ok(await client.PostAsJsonAsync("/api/orders", Place(cart.GetProperty("subtotal").GetDecimal(), receive: receive)), 201);
        return order.GetProperty("orderId").GetString()!;
    }

    private static byte[] Png()
    {
        using var stream = typeof(DbSeeder).Assembly.GetManifestResourceStream("Pharmacy.Core.Data.Assets.demo-qr.png")!;
        using var bytes = new MemoryStream();
        stream.CopyTo(bytes);
        return bytes.ToArray();
    }

    private async Task<HttpResponseMessage> Upload(HttpClient client, byte[]? bytes = null, string name = "image.png", string mime = "image/png")
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("BN001"), "patientId");
        form.Add(new StringContent("Khách demo"), "patientName");
        var image = new ByteArrayContent(bytes ?? Png());
        image.Headers.ContentType = new(mime);
        form.Add(image, "image", name);
        return await client.PostAsync("/api/prescriptions", form);
    }

    [Fact]
    public async Task TC13_OrderSnapshotsPrice_ChangedCartRequiresConfirmation()
    {
        using var user = await Login();
        await Add(user);
        var total = (await Ok(await user.GetAsync("/api/cart"))).GetProperty("subtotal").GetDecimal();
        await factory.WithDb(async db =>
        {
            var drug = await db.Drugs.SingleAsync(x => x.DrugId == "PARA500");
            drug.Update(drug.Name, drug.SaleUnit, 3000, drug.LowStockThreshold, false, false, true);
            await db.SaveChangesAsync();
        });
        var response = await user.PostAsJsonAsync("/api/orders", Place(total));
        await response.Error(409, "PRICE_CHANGED");
        Assert.Equal(6000, (await response.Json()).GetProperty("data").GetProperty("subtotal").GetDecimal());
        Assert.Equal(0, await factory.WithDb(db => db.Orders.CountAsync()));
        var order = await Ok(await user.PostAsJsonAsync("/api/orders", Place(6000)), 201);
        await factory.WithDb(async db =>
        {
            var drug = await db.Drugs.SingleAsync(x => x.DrugId == "PARA500");
            drug.Update(drug.Name, drug.SaleUnit, 4000, drug.LowStockThreshold, false, false, true);
            await db.SaveChangesAsync();
        });
        var detail = await Ok(await user.GetAsync("/api/orders/" + order.GetProperty("orderId").GetString()));
        Assert.Equal(6000, detail.GetProperty("totalAmount").GetDecimal());
        Assert.Equal(3000, detail.GetProperty("items")[0].GetProperty("unitPrice").GetDecimal());
        await Add(user);
        Assert.Equal(8000, (await Ok(await user.GetAsync("/api/cart"))).GetProperty("subtotal").GetDecimal());
    }

    [Fact]
    public async Task TC21_CancelPrescriptionOrder_ReleasesStockQuotaAndClosesPaymentAtomically()
    {
        using var user = await Login();
        await factory.WithDb(PersistenceFixture.AddBusinessData);
        var before = await factory.WithDb(async db => new
        {
            physical = await db.DrugBatches.SumAsync(x => x.Quantity),
            dispensed = await db.PrescriptionItems.SumAsync(x => x.DispensedQuantity)
        });
        var response = await Ok(await user.PostAsync("/api/orders/DH2610060002/cancel", null));
        Assert.Equal("Cancelled", response.GetProperty("status").GetString());
        Assert.Equal("Closed", response.GetProperty("payment").GetProperty("status").GetString());
        Assert.False(response.GetProperty("canCancel").GetBoolean());
        Assert.False(response.GetProperty("canPay").GetBoolean());
        await factory.WithDb(async db =>
        {
            Assert.Equal(before.physical, await db.DrugBatches.SumAsync(x => x.Quantity));
            Assert.Equal(before.dispensed, await db.PrescriptionItems.SumAsync(x => x.DispensedQuantity));
            Assert.Equal(ReservationStatus.Released, (await db.StockReservations.SingleAsync()).Status);
        });
        var rx = await Ok(await user.GetAsync("/api/prescriptions/DT2610060001"));
        Assert.Equal(0, rx.GetProperty("items")[0].GetProperty("reservedQuantity").GetInt32());
        Assert.Equal(29, rx.GetProperty("items")[0].GetProperty("remainingQuantity").GetInt32());
        await (await user.PostAsync("/api/orders/DH2610060002/cancel", null)).Error(409, "INVALID_STATE");
    }

    [Fact]
    public async Task TC24_OnlineAndCounterPrescriptions_PersistOwnerCreatorTimeAndNoStockChange()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var quantity = await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity));
        var online = await Ok(await Upload(user), 201);
        Assert.Equal("UDEMO0003", online.GetProperty("ownerUserId").GetString());
        Assert.Equal("user", online.GetProperty("createdByUsername").GetString());
        Assert.Equal("PendingReview", online.GetProperty("status").GetString());
        Assert.Empty(online.GetProperty("items").EnumerateArray());
        Assert.Equal(new TestClock().Now, online.GetProperty("createdAt").GetDateTimeOffset());
        var counter = await Ok(await staff.PostAsJsonAsync("/api/prescriptions/counter", new
        {
            prescriptionId = "PAPER001",
            patientId = "BN001",
            patientName = "Khách demo",
            prescriberName = "Bác sĩ",
            issueDate = "2026-10-06",
            validUntil = "2026-10-20",
            items = new[] { new { drugId = "DEMO07", quantity = 10 } }
        }), 201);
        Assert.Equal(JsonValueKind.Null, counter.GetProperty("ownerUserId").ValueKind);
        Assert.Equal("staff", counter.GetProperty("createdByUsername").GetString());
        Assert.Equal(10, counter.GetProperty("items")[0].GetProperty("prescribedQuantity").GetInt32());
        Assert.Equal(quantity, await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity)));
        var mine = await Ok(await user.GetAsync("/api/prescriptions/mine?status=PendingReview&pageSize=1"));
        Assert.Equal(2, mine.GetProperty("total").GetInt32());
        var list = await Ok(await staff.GetAsync("/api/prescriptions?search=paper001"));
        Assert.Equal(1, list.GetProperty("total").GetInt32());
        Assert.Equal(200, (int)(await user.GetAsync(online.GetProperty("imageUrl").GetString())).StatusCode);
        var usable = await Ok(await user.GetAsync("/api/prescriptions/usable"));
        Assert.Equal(3, usable.GetArrayLength());
    }

    [Fact]
    public async Task TC21_CancellationFailure_RollsBackOrderReservationAndPayment()
    {
        using var user = await Login();
        await factory.WithDb(PersistenceFixture.AddBusinessData);
        await factory.WithDb(async db =>
        {
            await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER FailPaymentClose BEFORE UPDATE ON Payments WHEN NEW.Status = 'Closed' BEGIN SELECT RAISE(ABORT, 'Simulated failure'); END;");
        });
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await user.PostAsync("/api/orders/DH2610060002/cancel", null)).Error(500, "INTERNAL_ERROR");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC24_MigrationFromM1_PreservesExistingPrescriptionAndDoesNotReseed()
    {
        var migrationPath = Path.Combine(Path.GetTempPath(), "pharmacy-m3-migration-" + Guid.NewGuid() + ".db");
        try
        {
            await using (var db = new PharmacyDbContext(new DbContextOptionsBuilder<PharmacyDbContext>()
                .UseSqlite($"Data Source={migrationPath};Pooling=False").Options))
            {
                var first = db.Database.GetMigrations().First();
                await db.GetService<IMigrator>().MigrateAsync(first);
                await db.Database.ExecuteSqlRawAsync("INSERT INTO UserAccounts (UserId, Username, NormalizedUsername, PasswordHash, Role) VALUES ('EXISTING','existing','EXISTING','hash','User');");
                await db.Database.ExecuteSqlRawAsync("INSERT INTO Prescriptions (PrescriptionId, OwnerUserId, CreatedByUserId, PatientId, PatientName, Status) VALUES ('OLDPAPER','EXISTING','EXISTING','OLDPATIENT','Tên cũ','PendingReview');");
            }
            using (var migrated = new ApiFactory(migrationPath))
            {
                using var client = migrated.Client();
                Assert.Equal(200, (int)(await client.GetAsync("/api/health")).StatusCode);
                await migrated.WithDb(async db =>
                {
                    var rx = await db.Prescriptions.SingleAsync();
                    Assert.Equal("OLDPAPER", rx.PrescriptionId);
                    Assert.Equal("OLDPATIENT", rx.PatientId);
                    Assert.Equal("Tên cũ", rx.PatientName);
                    Assert.Equal(DateTimeOffset.UnixEpoch, rx.CreatedAt);
                    Assert.Equal(1, await db.UserAccounts.CountAsync());
                    Assert.Equal(0, await db.Drugs.CountAsync());
                    Assert.False(db.Database.HasPendingModelChanges());
                });
            }
        }
        finally
        {
            ApiFactory.Cleanup(migrationPath);
        }
    }

    [Fact]
    public async Task TC24_CounterDuplicateAndInvalidDetails_ReturnFieldErrorsWithoutWriting()
    {
        using var staff = await Login("staff");
        var input = new
        {
            prescriptionId = "PAPER001",
            patientId = "BN001",
            patientName = "Khách",
            prescriberName = "Bác sĩ",
            issueDate = "2026-10-06",
            validUntil = "2026-10-20",
            items = new[] { new { drugId = "DEMO07", quantity = 10 } }
        };
        await Ok(await staff.PostAsJsonAsync("/api/prescriptions/counter", input), 201);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/prescriptions/counter", input)).Error(409, "DUPLICATE", "prescriptionId");
        await (await staff.PutAsJsonAsync("/api/prescriptions/PAPER001/details", new
        {
            patientId = "BN001",
            patientName = "Khách",
            prescriberName = "Bác sĩ",
            issueDate = "2026-10-06",
            validUntil = "2026-10-20",
            items = new[] { new { drugId = "MISSING", quantity = 1 } }
        })).Error(400, "VALIDATION_FAILED", "items");
        await (await staff.GetAsync("/api/prescriptions?status=Unknown")).Error(400, "VALIDATION_FAILED", "status");
        await (await staff.GetAsync("/api/prescriptions?pageSize=101")).Error(400, "VALIDATION_FAILED", "pageSize");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC28_UserCannotCallStaffMutations_CompletedQuotaCannotBeCancelled()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        await (await user.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details())).Error(403, "FORBIDDEN");
        foreach (var action in new[] { "approve", "reject", "cancel" })
        {
            await (await user.PostAsJsonAsync("/api/prescriptions/DT2610060003/" + action, new
            {
                reason = "Lý do"
            })).Error(403, "FORBIDDEN");
        }
        await factory.WithDb(async db =>
        {
            (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).RecordDispense(30);
            await db.SaveChangesAsync();
        });
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/prescriptions/DT2610060001/cancel", new
        {
            reason = "Lý do"
        })).Error(409, "INVALID_STATE");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC32_ConcurrentPlacement_OnlyOneOrderConsumesSameCart()
    {
        using var user = await Login();
        await Add(user);
        var responses = await Task.WhenAll(
            user.PostAsJsonAsync("/api/orders", Place(2000)),
            user.PostAsJsonAsync("/api/orders", Place(2000)));
        Assert.Single(responses, x => (int)x.StatusCode == 201);
        await responses.Single(x => (int)x.StatusCode != 201).Error(400, "VALIDATION_FAILED", "items");
        Assert.Equal(1, await factory.WithDb(db => db.Orders.CountAsync()));
        Assert.Equal(0, await factory.WithDb(db => db.CartItems.CountAsync()));
    }

    [Fact]
    public async Task TC36_UserCannotManageStaffOrdersOrDashboard()
    {
        using var user = await Login();
        var id = await Order(user);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await user.GetAsync("/api/staff/orders")).Error(403, "FORBIDDEN");
        await (await user.GetAsync("/api/staff/orders/" + id)).Error(403, "FORBIDDEN");
        foreach (var action in new[] { "claim", "ship", "complete", "fulfill", "reject", "cancel" })
        {
            await (await user.PostAsJsonAsync("/api/staff/orders/" + id + "/" + action, new
            {
                reason = "Lý do"
            })).Error(403, "FORBIDDEN");
        }
        await (await user.GetAsync("/api/dashboard/summary")).Error(403, "FORBIDDEN");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC25_PrescriptionImages_RejectInvalidFilesAndHideOtherOwners()
    {
        using var user = await Login();
        using var other = await Login("user2");
        using var staff = await Login("staff");
        using var guest = factory.Client();
        var online = await Ok(await Upload(user), 201);
        var id = online.GetProperty("prescriptionId").GetString();
        var url = online.GetProperty("imageUrl").GetString()!;
        Assert.Equal(Png(), await user.GetByteArrayAsync(url));
        Assert.Equal(Png(), await staff.GetByteArrayAsync(url));
        await (await other.GetAsync(url)).Error(404, "NOT_FOUND");
        await (await other.GetAsync("/api/prescriptions/" + id)).Error(404, "NOT_FOUND");
        await (await guest.GetAsync(url)).Error(401, "UNAUTHENTICATED");
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await Upload(user, [1, 2, 3])).Error(400, "FILE_INVALID", "image");
        await (await Upload(user, Png(), "x.txt", "text/plain")).Error(400, "FILE_INVALID", "image");
        await (await Upload(user, new byte[LocalFileStorage.MaxBytes + 1])).Error(400, "FILE_INVALID", "image");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        await (await staff.PostAsync("/api/prescriptions", null)).Error(403, "FORBIDDEN");
    }

    [Fact]
    public async Task TC26_DetailsMergeDuplicates_ApproveTransitionsEligibleLinkedOrders()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        await Add(user, "DEMO07", 2);
        var order = await Ok(await user.PostAsJsonAsync("/api/orders", Place(14000, "Prescription", "DT2610060003")), 201);
        var id = order.GetProperty("orderId").GetString();
        await Ok(await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details()));
        var details = await Ok(await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", new
        {
            patientId = "BN001",
            patientName = "Tên mới",
            prescriberName = "Bác sĩ",
            issueDate = "2026-10-06",
            validUntil = "2026-10-20",
            items = new[] { new { drugId = "DEMO07", quantity = 3 }, new { drugId = "DEMO07", quantity = 4 } }
        }));
        Assert.Single(details.GetProperty("items").EnumerateArray());
        Assert.Equal(7, details.GetProperty("items")[0].GetProperty("prescribedQuantity").GetInt32());
        var approved = await Ok(await staff.PostAsync("/api/prescriptions/DT2610060003/approve", null));
        Assert.Equal("Approved", approved.GetProperty("status").GetString());
        Assert.Equal("staff", approved.GetProperty("reviewedByUsername").GetString());
        Assert.Equal(new TestClock().Now, approved.GetProperty("reviewedAt").GetDateTimeOffset());
        Assert.Equal("AwaitingPayment", (await Ok(await user.GetAsync("/api/orders/" + id))).GetProperty("status").GetString());
        await (await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details())).Error(409, "INVALID_STATE");
        await (await staff.PostAsync("/api/prescriptions/DT2610060003/approve", null)).Error(409, "INVALID_STATE");
    }

    [Fact]
    public async Task TC26_InvalidReviewAndDetails_DoNotPartiallyWrite()
    {
        using var staff = await Login("staff");
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsync("/api/prescriptions/DT2610060003/approve", null)).Error(400, "VALIDATION_FAILED");
        await (await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details(date: "2026-10-21"))).Error(400, "VALIDATION_FAILED", "validUntil");
        await (await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details(quantity: 0))).Error(400, "VALIDATION_FAILED", "items");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        await Ok(await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details(date: "2026-10-07")));
        before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsync("/api/prescriptions/DT2610060003/approve", null)).Error(400, "VALIDATION_FAILED", "issueDate");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Theory]
    [InlineData("reject", "Rejected")]
    [InlineData("cancel", "Cancelled")]
    public async Task TC26_RejectOrCancelPrescription_RejectsWaitingOrdersWithReason(string action, string status)
    {
        using var user = await Login();
        using var staff = await Login("staff");
        await Add(user, "DEMO07", 2);
        var order = await Ok(await user.PostAsJsonAsync("/api/orders", Place(14000, "Prescription", "DT2610060003")), 201);
        if (action == "cancel")
        {
            await Ok(await staff.PutAsJsonAsync("/api/prescriptions/DT2610060003/details", Details(quantity: 1)));
            await Ok(await staff.PostAsync("/api/prescriptions/DT2610060003/approve", null));
            var waiting = await Ok(await user.GetAsync("/api/orders/" + order.GetProperty("orderId").GetString()));
            Assert.Equal("WaitingReview", waiting.GetProperty("status").GetString());
            Assert.False(string.IsNullOrEmpty(waiting.GetProperty("note").GetString()));
        }
        var url = "/api/prescriptions/DT2610060003/" + action;
        await (await staff.PostAsJsonAsync(url, new
        {
            reason = " "
        })).Error(400, "VALIDATION_FAILED", "reason");
        var reviewed = await Ok(await staff.PostAsJsonAsync(url, new
        {
            reason = "Không hợp lệ"
        }));
        Assert.Equal(status, reviewed.GetProperty("status").GetString());
        var result = await Ok(await user.GetAsync("/api/orders/" + order.GetProperty("orderId").GetString()));
        Assert.Equal("Rejected", result.GetProperty("status").GetString());
        Assert.Equal("Không hợp lệ", result.GetProperty("note").GetString());
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("future")]
    [InlineData("patient")]
    [InlineData("outside")]
    [InlineData("quota")]
    public async Task TC27_ValidateQuota_RejectsInvalidPrescriptionCases(string scenario)
    {
        using var user = await Login();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
        var rx = new Prescription("QUOTA", "UDEMO0003", "UDEMO0002", "PATIENT", "Tên", createdAt: new TestClock().Now);
        var date = new TestClock().Today;
        rx.SetDetails("Bác sĩ", date.AddDays(scenario == "future" ? 1 : -2),
            date.AddDays(scenario == "expired" ? -1 : 10), [new("QI", rx.PrescriptionId, "DEMO07", 3)]);
        rx.Approve("UDEMO0002", new TestClock().Now);
        db.Prescriptions.Add(rx);
        await db.SaveChangesAsync();
        var service = scope.ServiceProvider.GetRequiredService<PrescriptionService>();
        var error = await Assert.ThrowsAsync<BusinessException>(() => service.ValidateQuota(rx,
            scenario == "patient" ? "OTHER" : "PATIENT",
            [new(scenario == "outside" ? "PARA500" : "DEMO07", scenario == "quota" ? 4 : 1)]));
        Assert.Equal("PRESCRIPTION_INVALID", error.Code);
    }

    [Fact]
    public async Task TC28_UserCannotReview_ConcurrentReservationsRespectLastQuota()
    {
        using var user = await Login();
        await (await user.PostAsync("/api/prescriptions/DT2610060003/approve", null)).Error(403, "FORBIDDEN");
        await factory.WithDb(async db =>
        {
            foreach (var id in new[] { "DH2610069001", "DH2610069002" })
            {
                var order = new Order(id, "UDEMO0003", new TestClock().Now, SaleKind.Prescription,
                    "Tên", "0900000000", ReceiveMethod.Pickup, prescriptionId: "DT2610060001", patientId: "BN001");
                order.AddItem(new(id + "L", id, "DEMO07", "Thuốc", "Viên", 20, 7000));
                db.Orders.Add(order);
            }
            await db.SaveChangesAsync();
        });
        async Task<string> Reserve(string id)
        {
            using var scope = factory.Services.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<InventoryService>().Reserve(id);
                return "OK";
            }
            catch (BusinessException e)
            {
                return e.Code;
            }
        }
        var results = await Task.WhenAll(Task.Run(() => Reserve("DH2610069001")), Task.Run(() => Reserve("DH2610069002")));
        Assert.Single(results, x => x == "OK");
        Assert.Single(results, x => x == "PRESCRIPTION_INVALID");
        Assert.Equal(20, await factory.WithDb(db => db.StockReservations.Where(x => x.Status == ReservationStatus.Active).SumAsync(x => x.Quantity)));
    }

    [Fact]
    public async Task TC29_CartAccumulatesUpdatesDeletes_WithoutReservationOrDeduction()
    {
        using var user = await Login();
        var quantity = await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity));
        await Add(user);
        await Add(user, quantity: 3);
        var cart = await Ok(await user.GetAsync("/api/cart"));
        Assert.Single(cart.GetProperty("items").EnumerateArray());
        Assert.Equal(5, cart.GetProperty("items")[0].GetProperty("quantity").GetInt32());
        Assert.Equal(5000, cart.GetProperty("subtotal").GetDecimal());
        cart = await Ok(await user.PutAsJsonAsync("/api/cart/items/PARA500", new
        {
            quantity = 4
        }));
        Assert.Equal(4000, cart.GetProperty("subtotal").GetDecimal());
        cart = await Ok(await user.DeleteAsync("/api/cart/items/PARA500"));
        Assert.Empty(cart.GetProperty("items").EnumerateArray());
        Assert.Equal(quantity, await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity)));
        Assert.Equal(0, await factory.WithDb(db => db.StockReservations.CountAsync()));
    }

    [Theory]
    [InlineData("guest", 401, "UNAUTHENTICATED")]
    [InlineData("staff", 403, "FORBIDDEN")]
    [InlineData("admin", 403, "FORBIDDEN")]
    public async Task TC30_CartIsUserOnly_AllRoutesBlocked(string role, int status, string code)
    {
        using var client = role == "guest" ? factory.Client() : await Login(role);
        await client.Csrf();
        await (await client.GetAsync("/api/cart")).Error(status, code);
        await (await client.PostAsJsonAsync("/api/cart/items", new
        {
            drugId = "PARA500",
            quantity = 1
        })).Error(status, code);
        await (await client.PutAsJsonAsync("/api/cart/items/PARA500", new
        {
            quantity = 1
        })).Error(status, code);
        await (await client.DeleteAsync("/api/cart/items/PARA500")).Error(status, code);
        Assert.Equal(0, await factory.WithDb(db => db.CartItems.CountAsync()));
    }

    [Theory]
    [InlineData("DEMO12", "NOT_FOR_SALE")]
    [InlineData("DEMO02", "INSUFFICIENT_STOCK")]
    public async Task TC31_CartIssues_BlockInvalidOrder_KeepCartUnchanged(string drugId, string code)
    {
        using var user = await Login();
        await Add(user, drugId, 1);
        var cart = await Ok(await user.GetAsync("/api/cart"));
        Assert.Equal(code, cart.GetProperty("items")[0].GetProperty("issue").GetString());
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await user.PostAsJsonAsync("/api/orders", Place(cart.GetProperty("subtotal").GetDecimal()))).Error(409, code);
        await (await user.PutAsJsonAsync("/api/cart/items/" + drugId, new
        {
            quantity = 0
        })).Error(400, "VALIDATION_FAILED", "quantity");
        await (await user.PostAsJsonAsync("/api/cart/items", new
        {
            drugId,
            quantity = 1.5
        })).Error(400, "VALIDATION_FAILED", "quantity");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Theory]
    [InlineData("Pickup")]
    [InlineData("Delivery")]
    public async Task TC32_PlaceOtc_SetsOwnerUniqueCodeAndTotal_ClearsCartWithoutReserving(string receive)
    {
        using var user = await Login();
        var id = await Order(user, receive);
        Assert.Matches("^DH261006[0-9]{4}$", id);
        var detail = await Ok(await user.GetAsync("/api/orders/" + id));
        Assert.Equal("AwaitingPayment", detail.GetProperty("status").GetString());
        Assert.Equal(2000, detail.GetProperty("totalAmount").GetDecimal());
        Assert.True(detail.GetProperty("canPay").GetBoolean());
        Assert.True(detail.GetProperty("canCancel").GetBoolean());
        Assert.Empty((await Ok(await user.GetAsync("/api/cart"))).GetProperty("items").EnumerateArray());
        Assert.Equal(0, await factory.WithDb(db => db.StockReservations.CountAsync()));
        Assert.Equal("UDEMO0003", await factory.WithDb(async db => (await db.Orders.SingleAsync()).UserId));
        Assert.NotEqual(id, await Order(user, receive));
        Assert.Equal(2, (await Ok(await user.GetAsync("/api/orders/mine?status=AwaitingPayment&pageSize=1"))).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task TC32_OrderValidation_BlocksMissingAddressAndPrescriptionRequired()
    {
        using var user = await Login();
        await Add(user, "DEMO07", 1);
        await (await user.PostAsJsonAsync("/api/orders", Place(7000))).Error(409, "PRESCRIPTION_REQUIRED");
        await (await user.PostAsJsonAsync("/api/orders", new
        {
            saleKind = "OTC",
            receiverName = "Tên",
            phone = "0900",
            receiveMethod = "Delivery",
            expectedTotal = 7000
        })).Error(400, "VALIDATION_FAILED", "address");
        Assert.Equal(0, await factory.WithDb(db => db.Orders.CountAsync()));
    }

    [Fact]
    public async Task TC33_PendingPrescriptionOrder_WaitsWithoutReservation_ApprovedOrderChecksQuota()
    {
        using var user = await Login();
        await Add(user, "DEMO07", 2);
        var waiting = await Ok(await user.PostAsJsonAsync("/api/orders", Place(14000, "Prescription", "DT2610060003")), 201);
        Assert.Equal("WaitingReview", waiting.GetProperty("status").GetString());
        Assert.False(waiting.GetProperty("canPay").GetBoolean());
        Assert.Equal(0, await factory.WithDb(db => db.StockReservations.CountAsync()));
        await Add(user, "DEMO07", 2);
        var ready = await Ok(await user.PostAsJsonAsync("/api/orders", Place(14000, "Prescription", "DT2610060001")), 201);
        Assert.Equal("AwaitingPayment", ready.GetProperty("status").GetString());
        using (var scope = factory.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<InventoryService>().Reserve(ready.GetProperty("orderId").GetString()!);
        }
        await Add(user, "DEMO07", 29);
        await (await user.PostAsJsonAsync("/api/orders", Place(203000, "Prescription", "DT2610060001"))).Error(409, "PRESCRIPTION_INVALID");
        Assert.Equal(2, await factory.WithDb(db => db.Orders.CountAsync()));
    }

    [Fact]
    public async Task TC34_GuestOrOtherOwner_CannotPlaceReadCancelOrUsePrescription()
    {
        using var user = await Login();
        using var other = await Login("user2");
        using var guest = factory.Client();
        await guest.Csrf();
        var id = await Order(user);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await guest.PostAsJsonAsync("/api/orders", Place(2000))).Error(401, "UNAUTHENTICATED");
        await (await other.GetAsync("/api/orders/" + id)).Error(404, "NOT_FOUND");
        await (await other.PostAsync("/api/orders/" + id + "/cancel", null)).Error(404, "NOT_FOUND");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        await Add(other, "DEMO07", 1);
        await (await other.PostAsJsonAsync("/api/orders", Place(7000, "Prescription", "DT2610060001"))).Error(409, "PRESCRIPTION_INVALID");
    }

    [Fact]
    public async Task TC36_StaffCannotShipCompleteOrFulfillBeforePaymentAndInvoice()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var id = await Order(user, "Delivery");
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        foreach (var action in new[] { "ship", "complete", "fulfill" })
        {
            await (await staff.PostAsync("/api/staff/orders/" + id + "/" + action, null)).Error(409, "INVALID_STATE");
        }
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        await Confirm(id, false);
        before = await factory.WithDb(PersistenceFixture.Snapshot);
        foreach (var action in new[] { "ship", "complete", "fulfill", "reject", "cancel" })
        {
            var response = action is "reject" or "cancel"
                ? await staff.PostAsJsonAsync("/api/staff/orders/" + id + "/" + action, new
                {
                    reason = "Lý do"
                })
                : await staff.PostAsync("/api/staff/orders/" + id + "/" + action, null);
            await response.Error(409, "INVALID_STATE");
        }
        await (await user.PostAsync("/api/orders/" + id + "/cancel", null)).Error(409, "INVALID_STATE");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    private async Task Confirm(string id, bool invoice)
    {
        await factory.WithDb(async db =>
        {
            var now = new TestClock().Now;
            var order = await db.Orders.Include(x => x.Items).SingleAsync(x => x.OrderId == id);
            var settings = await db.PaymentSettings.SingleAsync();
            var payment = new Payment(id + "P", id, order.TotalAmount, settings.CreateSnapshot(), now);
            payment.Confirm(id + "REF", order.TotalAmount, now, "UDEMO0002", now);
            db.Payments.Add(payment);
            order.MarkPreparing();
            if (invoice)
            {
                var sale = new OTCSale(id + "S", "UDEMO0002", now, SaleChannel.Online, order.UserId, order.OrderId);
                var batch = await db.DrugBatches.FirstAsync(x => x.DrugId == "PARA500" && x.ExpiryDate > new TestClock().Today);
                var item = order.Items.Single();
                var line = new SaleItem(id + "SL", sale.SaleId, item.DrugId, item.DrugName, item.Unit, item.Quantity, item.UnitPrice);
                line.AddAllocation(new(id + "A", line.SaleItemId, batch.BatchId, item.Quantity));
                batch.Deduct(item.Quantity, new TestClock().Today);
                sale.ReplaceItems([line]);
                sale.Complete(now, PaymentMethod.ManualQR);
                db.Sales.Add(sale);
                db.Invoices.Add(new(id + "I", sale, now));
            }
            await db.SaveChangesAsync();
        });
    }

    [Theory]
    [InlineData("Delivery")]
    [InlineData("Pickup")]
    public async Task TC37_StaffDeliveryLifecycle_RequiresInvoice_NeverDeductsAgain(string receive)
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var id = await Order(user, receive);
        await Confirm(id, true);
        var physical = await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity));
        var claimed = await Ok(await staff.PostAsync("/api/staff/orders/" + id + "/claim", null));
        Assert.Equal("staff", claimed.GetProperty("handledByUsername").GetString());
        Assert.Equal("user", claimed.GetProperty("customerUsername").GetString());
        Assert.False(claimed.GetProperty("canCancel").GetBoolean());
        if (receive == "Delivery")
        {
            await (await staff.PostAsync("/api/staff/orders/" + id + "/complete", null)).Error(409, "INVALID_STATE");
            var shipping = await Ok(await staff.PostAsync("/api/staff/orders/" + id + "/ship", null));
            Assert.Equal("Delivering", shipping.GetProperty("status").GetString());
        }
        else
        {
            await (await staff.PostAsync("/api/staff/orders/" + id + "/ship", null)).Error(409, "INVALID_STATE");
        }
        var completed = await Ok(await staff.PostAsync("/api/staff/orders/" + id + "/complete", null));
        Assert.Equal("Completed", completed.GetProperty("status").GetString());
        await (await staff.PostAsync("/api/staff/orders/" + id + "/complete", null)).Error(409, "INVALID_STATE");
        Assert.Equal(physical, await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity)));
        Assert.Equal(1, await factory.WithDb(db => db.Invoices.CountAsync()));
        var summary = await Ok(await staff.GetAsync("/api/dashboard/summary"));
        Assert.Equal(0, summary.GetProperty("preparingOrders").GetInt32());
        await (await user.GetAsync("/api/dashboard/summary")).Error(403, "FORBIDDEN");
        var list = await Ok(await staff.GetAsync("/api/staff/orders?search=user&status=Completed"));
        Assert.Equal(1, list.GetProperty("total").GetInt32());
    }

    [Theory]
    [InlineData("reject", "Rejected")]
    [InlineData("cancel", "Cancelled")]
    public async Task TC37_StaffRejectCancel_RequiresReason_ReleasesPendingPayment(string action, string status)
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var id = await Order(user);
        using (var scope = factory.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<InventoryService>().Reserve(id);
        }
        await factory.WithDb(async db =>
        {
            var settings = await db.PaymentSettings.SingleAsync();
            db.Payments.Add(new(id + "P", id, 2000, settings.CreateSnapshot(), new TestClock().Now));
            await db.SaveChangesAsync();
        });
        await (await staff.PostAsJsonAsync("/api/staff/orders/" + id + "/" + action, new
        {
            reason = " "
        })).Error(400, "VALIDATION_FAILED", "reason");
        var result = await Ok(await staff.PostAsJsonAsync("/api/staff/orders/" + id + "/" + action, new
        {
            reason = "Khách yêu cầu"
        }));
        Assert.Equal(status, result.GetProperty("status").GetString());
        Assert.Equal("Khách yêu cầu", result.GetProperty("note").GetString());
        Assert.Equal("Closed", result.GetProperty("payment").GetProperty("status").GetString());
        Assert.Equal("staff", result.GetProperty("handledByUsername").GetString());
        Assert.Equal(ReservationStatus.Released, await factory.WithDb(async db => (await db.StockReservations.SingleAsync()).Status));
    }
}
