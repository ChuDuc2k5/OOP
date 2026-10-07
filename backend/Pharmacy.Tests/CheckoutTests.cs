using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pharmacy.Core.Common;
using Pharmacy.Core.Data;
using Pharmacy.Core.Domain;
using Pharmacy.Core.Services;

namespace Pharmacy.Tests;

public sealed class CheckoutTests : IDisposable
{
    private readonly string path = Path.Combine(Path.GetTempPath(), "pharmacy-checkout-" + Guid.NewGuid() + ".db");
    private ApiFactory factory;

    public CheckoutTests() => factory = new(path);

    public void Dispose()
    {
        factory.Dispose();
        ApiFactory.Cleanup(path);
    }

    private async Task<HttpClient> Login(string name = "chuduc")
    {
        await factory.ConfigurePayments();
        var client = factory.Client();
        var password = name == "admin" ? "Admin@12345" : name.StartsWith("staff") ? "Staff@12345" : "User@12345";
        Assert.Equal(200, (int)(await client.Login(name, password)).StatusCode);
        await client.Csrf();
        return client;
    }

    private static async Task<JsonElement> Ok(HttpResponseMessage response, int status = 200)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True((int)response.StatusCode == status, text);
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    private async Task<string> Order(HttpClient user, string drug = "PARA500", int quantity = 2, string? rx = null)
    {
        await Ok(await user.PostAsJsonAsync("/api/cart/items", new
        {
            drugId = drug,
            quantity
        }));
        var cart = await Ok(await user.GetAsync("/api/cart"));
        var result = await Ok(await user.PostAsJsonAsync("/api/orders", new
        {
            saleKind = rx is null ? "OTC" : "Prescription",
            receiverName = "Khách",
            phone = "0900000000",
            receiveMethod = "Pickup",
            prescriptionId = rx,
            expectedTotal = cart.GetProperty("subtotal").GetDecimal()
        }), 201);
        return result.GetProperty("orderId").GetString()!;
    }

    private async Task<JsonElement> Open(HttpClient user, string id, int status = 201)
        => await Ok(await user.PostAsync("/api/orders/" + id + "/payment", null), status);

    private static object ReviewBody(string reference = "BANK-001", decimal amount = 2000)
        => new
        {
            bankReference = reference,
            receivedAmount = amount,
            receivedAt = "2026-10-06T09:30:00+07:00",
            note = "Đã đối chiếu"
        };

    private static async Task<JsonElement> Review(HttpClient staff, string id, string reference = "BANK-001", decimal amount = 2000)
        => await Ok(await staff.PostAsJsonAsync("/api/staff/payments/" + id + "/review", ReviewBody(reference, amount)));

    private async Task<string> Draft(HttpClient staff, string drug = "PARA500", int quantity = 2, string? rx = null)
    {
        var created = await Ok(await staff.PostAsJsonAsync("/api/staff/sales", new
        {
            kind = rx is null ? "OTC" : "Prescription",
            prescriptionId = rx,
            patientId = rx is null ? null : "BN001"
        }), 201);
        var id = created.GetProperty("saleId").GetString()!;
        await Ok(await staff.PutAsJsonAsync("/api/staff/sales/" + id, new
        {
            prescriptionId = rx,
            patientId = rx is null ? null : "BN001",
            items = new[] { new { drugId = drug, quantity } }
        }));
        return id;
    }

    private static async Task<JsonElement> CounterCheckout(HttpClient staff, string id)
        => await Ok(await staff.PostAsJsonAsync("/api/staff/sales/" + id + "/checkout", new
        {
            cashReceived = true
        }));

    private async Task<JsonElement> Fulfill(HttpClient staff, string orderId)
        => await Ok(await staff.PostAsync("/api/staff/orders/" + orderId + "/fulfill", null));

    private async Task ChangePrice(decimal price)
    {
        await factory.WithDb(async db =>
        {
            var drug = await db.Drugs.SingleAsync(x => x.DrugId == "PARA500");
            drug.Update("Tên thuốc mới", drug.SaleUnit, price, drug.LowStockThreshold, false, false, true);
            await db.SaveChangesAsync();
        });
    }

    [Fact]
    public async Task TC13_OnlinePaymentAndInvoice_KeepOrderPrice_CounterUsesCheckoutPrice()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var orderId = await Order(user);
        var draft = await Draft(staff);
        await ChangePrice(3000);
        var payment = await Open(user, orderId);
        Assert.Equal(2000, payment.GetProperty("expectedAmount").GetDecimal());
        await Review(staff, payment.GetProperty("paymentId").GetString()!);
        var result = await Fulfill(staff, orderId);
        var invoice = await Ok(await user.GetAsync("/api/invoices/" + result.GetProperty("invoiceId").GetString()));
        Assert.Equal(2000, invoice.GetProperty("totalAmount").GetDecimal());
        Assert.Equal(1000, invoice.GetProperty("items")[0].GetProperty("unitPrice").GetDecimal());
        var counter = await CounterCheckout(staff, draft);
        Assert.Equal(6000, counter.GetProperty("totalAmount").GetDecimal());
    }

    [Fact]
    public async Task TC20_TwoUsersOpenQr_OnlyLastAvailableStockIsReserved()
    {
        using var first = await Login();
        using var second = await Login("nguyenvana");
        await factory.WithDb(async db =>
        {
            db.Drugs.Add(new("LAST", "Thuốc cuối", "Viên", 1000, 0));
            db.DrugBatches.Add(new("LASTB", "LAST", "LAST", new TestClock().Today.AddDays(1), 1));
            await db.SaveChangesAsync();
        });
        var a = await Order(first, "LAST", 1);
        var b = await Order(second, "LAST", 1);
        async Task<string> Execute(string id, string owner)
        {
            using var scope = factory.Services.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<ManualPaymentService>().Open(id, owner);
                return "OK";
            }
            catch (BusinessException e)
            {
                return e.Code;
            }
        }
        var results = await Task.WhenAll(Task.Run(() => Execute(a, "U0000003")), Task.Run(() => Execute(b, "U0000004")));
        Assert.Single(results, x => x == "OK");
        Assert.Single(results, x => x == "INSUFFICIENT_STOCK");
        Assert.Equal(1, await factory.WithDb(db => db.Payments.CountAsync()));
        Assert.Equal(1, await factory.WithDb(db => db.StockReservations.SumAsync(x => x.Quantity)));
        Assert.Equal(1, await factory.WithDb(async db => (await db.DrugBatches.SingleAsync(x => x.BatchId == "LASTB")).Quantity));
    }

    [Fact]
    public async Task TC35_CancelVersusReview_OneValidTransition_ClosedOrderCannotPayOrReview()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var id = await Order(user);
        var payment = await Open(user, id);
        var paymentId = payment.GetProperty("paymentId").GetString()!;
        var responses = await Task.WhenAll(user.PostAsync("/api/orders/" + id + "/cancel", null),
            staff.PostAsJsonAsync("/api/staff/payments/" + paymentId + "/review", ReviewBody()));
        Assert.Single(responses, x => (int)x.StatusCode == 200);
        await responses.Single(x => (int)x.StatusCode != 200).Error(409, "INVALID_STATE");
        var order = await Ok(await user.GetAsync("/api/orders/" + id));
        var state = order.GetProperty("status").GetString();
        Assert.Contains(state, new[] { "Cancelled", "Preparing" });
        var updated = await Ok(await user.GetAsync("/api/orders/" + id + "/payment"));
        Assert.Equal(state == "Cancelled" ? "Closed" : "Confirmed", updated.GetProperty("status").GetString());
        await (await user.PostAsync("/api/orders/" + id + "/payment", null)).Error(409, "INVALID_STATE");
        await (await staff.PostAsJsonAsync("/api/staff/payments/" + paymentId + "/review", ReviewBody())).Error(409, "INVALID_STATE");
    }

    [Fact]
    public async Task TC38_CounterOtcCheckout_DeductsFefo_CreatesInvoice_AndCannotRepeat()
    {
        using var staff = await Login("staff");
        var quantity = await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity));
        var id = await Draft(staff);
        var draft = await Ok(await staff.GetAsync("/api/staff/sales/" + id));
        Assert.True(draft.GetProperty("canCheckout").GetBoolean());
        var sale = await CounterCheckout(staff, id);
        Assert.Equal("Completed", sale.GetProperty("status").GetString());
        Assert.Equal("Cash", sale.GetProperty("paymentMethod").GetString());
        Assert.False(sale.GetProperty("canCheckout").GetBoolean());
        Assert.Equal(quantity - 2, await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity)));
        var invoice = await Ok(await staff.GetAsync("/api/invoices/" + sale.GetProperty("invoiceId").GetString()));
        Assert.Equal(2, invoice.GetProperty("items")[0].GetProperty("allocations")[0].GetProperty("quantity").GetInt32());
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + id + "/checkout", new
        {
            cashReceived = true
        })).Error(409, "INVALID_STATE");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Theory]
    [InlineData("AMOX500")]
    [InlineData("DIAZ5")]
    public async Task TC39_OtcPrescriptionOrControlledDrug_IsBlocked_KindCannotChange(string drug)
    {
        using var staff = await Login("staff");
        var id = await Draft(staff, drug, 1);
        var sale = await Ok(await staff.PutAsJsonAsync("/api/staff/sales/" + id, new
        {
            kind = "Prescription",
            prescriptionId = "DT2610060001",
            patientId = "BN001",
            items = new[] { new { drugId = drug, quantity = 1 } }
        }));
        Assert.Equal("OTC", sale.GetProperty("kind").GetString());
        Assert.False(sale.GetProperty("canCheckout").GetBoolean());
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + id + "/checkout", new
        {
            cashReceived = true
        })).Error(409, "PRESCRIPTION_REQUIRED");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC40_PartialPrescriptionDispense_ThenRemaining_CannotExceedQuota()
    {
        using var staff = await Login("staff");
        var first = await Draft(staff, "AMOX500", 10, "DT2610060001");
        await CounterCheckout(staff, first);
        Assert.Equal(10, await factory.WithDb(async db => (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).DispensedQuantity));
        var second = await Draft(staff, "AMOX500", 20, "DT2610060001");
        await CounterCheckout(staff, second);
        var last = await Draft(staff, "AMOX500", 1, "DT2610060001");
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + last + "/checkout", new
        {
            cashReceived = true
        })).Error(409, "PRESCRIPTION_INVALID");
        Assert.Equal(30, await factory.WithDb(async db => (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).DispensedQuantity));
        Assert.Equal(2, await factory.WithDb(db => db.Invoices.CountAsync()));
    }

    [Theory]
    [InlineData("staff")]
    [InlineData("admin")]
    public async Task TC41_OtherDraftOwner_IsHiddenForGetUpdateCancelAndCheckout(string owner)
    {
        using var creator = await Login(owner);
        using var other = await Login(owner == "staff" ? "admin" : "staff");
        var id = await Draft(creator);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await other.GetAsync("/api/staff/sales/" + id)).Error(404, "NOT_FOUND");
        await (await other.PutAsJsonAsync("/api/staff/sales/" + id, new
        {
            items = Array.Empty<object>()
        })).Error(404, "NOT_FOUND");
        await (await other.PostAsync("/api/staff/sales/" + id + "/cancel", null)).Error(404, "NOT_FOUND");
        await (await other.PostAsJsonAsync("/api/staff/sales/" + id + "/checkout", new
        {
            cashReceived = true
        })).Error(404, "NOT_FOUND");
        Assert.Equal(0, (await Ok(await other.GetAsync("/api/staff/sales"))).GetProperty("total").GetInt32());
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC42_OpenQr_ReturnsExpectedAmountOrderContentAndPrivateImage()
    {
        using var user = await Login();
        using var guest = factory.Client();
        var id = await Order(user);
        var payment = await Open(user, id);
        Assert.Equal(id, payment.GetProperty("transferContent").GetString());
        Assert.Equal(2000, payment.GetProperty("expectedAmount").GetDecimal());
        Assert.Matches("^TT261006[0-9]{4}$", payment.GetProperty("paymentId").GetString());
        var url = payment.GetProperty("qrImageUrl").GetString()!;
        Assert.Equal(200, (int)(await user.GetAsync(url)).StatusCode);
        await (await guest.GetAsync(url)).Error(401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task TC43_OpeningQrOrWritingNote_DoesNotConfirmOrDeductStock()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var physical = await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity));
        var id = await Order(user);
        var payment = await Open(user, id);
        var pending = await Ok(await staff.PostAsJsonAsync("/api/staff/payments/" + payment.GetProperty("paymentId").GetString() + "/note", new
        {
            note = "Chưa thấy tiền"
        }));
        Assert.Equal("PendingReview", pending.GetProperty("status").GetString());
        Assert.Equal("Chưa thấy tiền", pending.GetProperty("reviewNote").GetString());
        Assert.Equal("AwaitingPayment", (await Ok(await user.GetAsync("/api/orders/" + id))).GetProperty("status").GetString());
        Assert.Equal(physical, await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity)));
        Assert.Equal(2, await factory.WithDb(db => db.StockReservations.SumAsync(x => x.Quantity)));
        Assert.Equal(1, (await Ok(await staff.GetAsync("/api/staff/payments?search=chuduc"))).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task TC44_RepeatedQrOpening_KeepsSnapshotAndReservation_AfterSettingsChange()
    {
        using var user = await Login();
        using var admin = await Login("admin");
        var id = await Order(user);
        var first = await Open(user, id);
        await Ok(await admin.PutAsJsonAsync("/api/admin/payment-settings", new
        {
            bankName = "Ngân hàng khác",
            accountNumber = "11111",
            accountName = "TEN KIEM THU"
        }));
        using var stream = TestImage.Open();
        using var form = new MultipartFormDataContent();
        var file = new StreamContent(stream);
        file.Headers.ContentType = new("image/png");
        form.Add(file, "file", "new-qr.png");
        var settings = await Ok(await admin.PostAsync("/api/admin/payment-settings/qr-image", form));
        Assert.NotEqual(first.GetProperty("qrImageUrl").GetString(), settings.GetProperty("qrImageUrl").GetString());
        var repeated = await Open(user, id, 200);
        Assert.Equal(first.GetRawText(), repeated.GetRawText());
        Assert.Equal(200, (int)(await user.GetAsync(first.GetProperty("qrImageUrl").GetString())).StatusCode);
        Assert.Equal(1, await factory.WithDb(db => db.Payments.CountAsync()));
        Assert.Equal(1, await factory.WithDb(db => db.StockReservations.CountAsync()));
    }

    [Theory]
    [InlineData("staff")]
    [InlineData("admin")]
    public async Task TC45_StaffAndAdminReviewEnoughMoney_RecordAuditAndPrepareWithoutDeduction(string role)
    {
        using var user = await Login();
        using var reviewer = await Login(role);
        var id = await Order(user);
        var payment = await Open(user, id);
        var physical = await factory.WithDb(db => db.DrugBatches.SumAsync(x => x.Quantity));
        var result = await Review(reviewer, payment.GetProperty("paymentId").GetString()!);
        Assert.True(result.GetProperty("approved").GetBoolean());
        Assert.Equal("Preparing", result.GetProperty("orderStatus").GetString());
        Assert.Equal("Confirmed", result.GetProperty("payment").GetProperty("status").GetString());
        await factory.WithDb(async db =>
        {
            var saved = await db.Payments.SingleAsync();
            Assert.Equal(role == "admin" ? "U0000001" : "U0000002", saved.ApprovedByUserId);
            Assert.Equal(new TestClock().Now, saved.ApprovedAt);
            Assert.Equal("BANK-001", saved.BankReference);
            Assert.Equal(physical, await db.DrugBatches.SumAsync(x => x.Quantity));
        });
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task TC45_D13_QuickReview_DefaultsAmountsAndTime_TwoPaymentsWithoutReferencesConfirm(string? reference)
    {
        using var user = await Login();
        using var staff = await Login("staff");
        for (var index = 0; index < 2; index++)
        {
            var payment = await Open(user, await Order(user));
            var id = payment.GetProperty("paymentId").GetString()!;
            var result = await Ok(await staff.PostAsJsonAsync("/api/staff/payments/" + id + "/review",
                index == 0 ? (object)new { } : new { bankReference = reference, receivedAmount = (decimal?)null, receivedAt = (DateTimeOffset?)null }));
            Assert.True(result.GetProperty("approved").GetBoolean());
            Assert.Equal("Preparing", result.GetProperty("orderStatus").GetString());
            await factory.WithDb(async db =>
            {
                var saved = await db.Payments.SingleAsync(x => x.PaymentId == id);
                Assert.Equal(PaymentStatus.Confirmed, saved.Status);
                Assert.Null(saved.BankReference);
                Assert.Equal(saved.ExpectedAmount, saved.ReceivedAmount);
                Assert.Equal(new TestClock().Now, saved.ReceivedAt);
                Assert.Equal(new TestClock().Now, saved.ApprovedAt);
            });
        }
        Assert.Equal(2, await factory.WithDb(db => db.Payments.CountAsync(x => x.Status == PaymentStatus.Confirmed)));
    }

    [Fact]
    public async Task TC46_D13_UnderpaymentWithoutReference_RemainsPending_QuickReviewCanConfirmLater()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var payment = await Open(user, await Order(user));
        var id = payment.GetProperty("paymentId").GetString();
        var result = await Ok(await staff.PostAsJsonAsync("/api/staff/payments/" + id + "/review",
            new { receivedAmount = 1500 }));
        Assert.False(result.GetProperty("approved").GetBoolean());
        Assert.Equal("PendingReview", result.GetProperty("payment").GetProperty("status").GetString());
        Assert.Contains("Chuyển thiếu 500", result.GetProperty("payment").GetProperty("reviewNote").GetString());
        await factory.WithDb(async db =>
        {
            var saved = await db.Payments.SingleAsync();
            Assert.Null(saved.BankReference);
            Assert.Equal(new TestClock().Now, saved.ReceivedAt);
        });
        var confirmed = await Ok(await staff.PostAsJsonAsync("/api/staff/payments/" + id + "/review", new { }));
        Assert.True(confirmed.GetProperty("approved").GetBoolean());
        Assert.Equal(2000, confirmed.GetProperty("payment").GetProperty("receivedAmount").GetDecimal());
    }

    [Fact]
    public async Task TC46_Underpayment_Returns200PendingAndShortfallNote()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var payment = await Open(user, await Order(user));
        var result = await Review(staff, payment.GetProperty("paymentId").GetString()!, amount: 1500);
        Assert.False(result.GetProperty("approved").GetBoolean());
        Assert.Equal("AwaitingPayment", result.GetProperty("orderStatus").GetString());
        Assert.Equal("PendingReview", result.GetProperty("payment").GetProperty("status").GetString());
        Assert.Contains("Chuyển thiếu 500", result.GetProperty("payment").GetProperty("reviewNote").GetString());
        Assert.Equal(0, await factory.WithDb(db => db.Invoices.CountAsync()));
    }

    [Fact]
    public async Task TC47_Overpayment_ConfirmsExpectedTotal_PreservesReceivedAmount()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var id = await Order(user);
        var payment = await Open(user, id);
        var result = await Review(staff, payment.GetProperty("paymentId").GetString()!, amount: 3000);
        Assert.True(result.GetProperty("approved").GetBoolean());
        Assert.Equal(3000, result.GetProperty("payment").GetProperty("receivedAmount").GetDecimal());
        var issued = await Fulfill(staff, id);
        Assert.Equal(2000, (await Ok(await user.GetAsync("/api/invoices/" + issued.GetProperty("invoiceId").GetString()))).GetProperty("totalAmount").GetDecimal());
    }

    [Fact]
    public async Task TC48_ConcurrentReview_WithTwoScopes_OnlyOneConfirmation()
    {
        using var user = await Login();
        var payment = await Open(user, await Order(user));
        var id = payment.GetProperty("paymentId").GetString()!;
        async Task<string> Execute(string reviewer)
        {
            using var scope = factory.Services.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<ManualPaymentService>().Review(id, reviewer,
                    new("CONCURRENT", 2000, new TestClock().Now, null));
                return "OK";
            }
            catch (BusinessException e)
            {
                return e.Code;
            }
        }
        var results = await Task.WhenAll(Task.Run(() => Execute("U0000001")), Task.Run(() => Execute("U0000002")));
        Assert.Single(results, x => x == "OK");
        Assert.Single(results, x => x == "INVALID_STATE");
        Assert.Equal(1, await factory.WithDb(db => db.Payments.CountAsync(x => x.Status == PaymentStatus.Confirmed)));
    }

    [Fact]
    public async Task TC49_DuplicateConfirmedBankReference_IsRejectedWithoutPartialWrite()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var first = await Open(user, await Order(user));
        await Review(staff, first.GetProperty("paymentId").GetString()!);
        var second = await Open(user, await Order(user));
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/staff/payments/" + second.GetProperty("paymentId").GetString() + "/review", ReviewBody())).Error(409, "DUPLICATE_BANK_REFERENCE");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TC50_GuestAndUserCannotReviewOrConfigurePayments(bool authenticated)
    {
        using var user = await Login();
        var payment = await Open(user, await Order(user));
        using var caller = authenticated ? await Login("nguyenvana") : factory.Client();
        await caller.Csrf();
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var status = authenticated ? 403 : 401;
        var code = authenticated ? "FORBIDDEN" : "UNAUTHENTICATED";
        await (await caller.PostAsJsonAsync("/api/staff/payments/" + payment.GetProperty("paymentId").GetString() + "/review", ReviewBody())).Error(status, code);
        await (await caller.PostAsJsonAsync("/api/staff/payments/" + payment.GetProperty("paymentId").GetString() + "/note", new
        {
            note = "Thử"
        })).Error(status, code);
        await (await caller.GetAsync("/api/staff/payments")).Error(status, code);
        await (await caller.GetAsync("/api/admin/payment-settings")).Error(status, code);
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC51_InvoiceWriteFailure_RollsBackStockQuotaSaleAndReservations_KeepsConfirmedPayment()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var id = await Order(user, "AMOX500", 2, "DT2610060001");
        var payment = await Open(user, id);
        await Review(staff, payment.GetProperty("paymentId").GetString()!, amount: 14000);
        await factory.WithDb(db => db.Database.ExecuteSqlRawAsync("CREATE TRIGGER FailInvoice BEFORE INSERT ON Invoices BEGIN SELECT RAISE(ABORT, 'Simulated failure'); END;"));
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsync("/api/staff/orders/" + id + "/fulfill", null)).Error(500, "INTERNAL_ERROR");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC51_MultiLineShortage_DoesNotDeductAnyLineOrCompleteDraft()
    {
        using var staff = await Login("staff");
        var id = await Draft(staff);
        await Ok(await staff.PutAsJsonAsync("/api/staff/sales/" + id, new
        {
            items = new[] { new { drugId = "PARA500", quantity = 2 }, new { drugId = "VITC500", quantity = 1 } }
        }));
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + id + "/checkout", new
        {
            cashReceived = true
        })).Error(409, "INSUFFICIENT_STOCK");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task TC52_ReservedStockExpires_ReallocatesOrStopsWithoutLosingPayment(bool replacement)
    {
        string orderId;
        using (var user = await Login())
        using (var staff = await Login("staff"))
        {
            await factory.WithDb(async db =>
            {
                db.Drugs.Add(new("EXP", "Thuốc biên", "Viên", 1000, 0));
                db.DrugBatches.Add(new("EXP1", "EXP", "SOON", new TestClock().Today.AddDays(1), 2));
                if (replacement)
                {
                    db.DrugBatches.Add(new("EXP2", "EXP", "LATER", new TestClock().Today.AddDays(30), 2));
                }
                await db.SaveChangesAsync();
            });
            orderId = await Order(user, "EXP");
            var payment = await Open(user, orderId);
            await Review(staff, payment.GetProperty("paymentId").GetString()!);
        }
        factory.Dispose();
        factory = new(path, new TestClock().Today.AddDays(2));
        using var restartedStaff = await Login("staff");
        if (replacement)
        {
            var result = await Fulfill(restartedStaff, orderId);
            var invoice = await Ok(await restartedStaff.GetAsync("/api/invoices/" + result.GetProperty("invoiceId").GetString()));
            Assert.Equal("LATER", invoice.GetProperty("items")[0].GetProperty("allocations")[0].GetProperty("batchNumber").GetString());
            Assert.Equal(ReservationStatus.Consumed, await factory.WithDb(async db => (await db.StockReservations.SingleAsync()).Status));
        }
        else
        {
            await (await restartedStaff.PostAsync("/api/staff/orders/" + orderId + "/fulfill", null)).Error(409, "INSUFFICIENT_STOCK");
            Assert.Equal(0, await factory.WithDb(db => db.Invoices.CountAsync()));
            Assert.Equal(ReservationStatus.Active, await factory.WithDb(async db => (await db.StockReservations.SingleAsync()).Status));
        }
        Assert.Equal(PaymentStatus.Confirmed, await factory.WithDb(async db => (await db.Payments.SingleAsync()).Status));
        Assert.Equal(2, await factory.WithDb(async db => (await db.DrugBatches.SingleAsync(x => x.BatchId == "EXP1")).Quantity));
    }

    [Fact]
    public async Task TC53_OnlineAndCounterInvoices_KeepAllocationsAndPricesImmutable()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var orderId = await Order(user);
        var payment = await Open(user, orderId);
        await Review(staff, payment.GetProperty("paymentId").GetString()!);
        var result = await Fulfill(staff, orderId);
        var onlineId = result.GetProperty("invoiceId").GetString();
        var counter = await CounterCheckout(staff, await Draft(staff));
        var counterId = counter.GetProperty("invoiceId").GetString();
        var online = await Ok(await user.GetAsync("/api/invoices/" + onlineId));
        var atCounter = await Ok(await staff.GetAsync("/api/invoices/" + counterId));
        Assert.Equal("ManualQR", online.GetProperty("paymentMethod").GetString());
        Assert.Equal("Cash", atCounter.GetProperty("paymentMethod").GetString());
        Assert.NotEmpty(online.GetProperty("items")[0].GetProperty("allocations").EnumerateArray());
        await ChangePrice(5000);
        Assert.Equal(online.GetRawText(), (await Ok(await user.GetAsync("/api/invoices/" + onlineId))).GetRawText());
        Assert.Equal(atCounter.GetRawText(), (await Ok(await staff.GetAsync("/api/invoices/" + counterId))).GetRawText());
    }

    [Fact]
    public async Task TC54_Invoices_RespectUserStaffCreatorHandlerAndAdminScopes()
    {
        using var user = await Login();
        using var otherUser = await Login("nguyenvana");
        using var staff = await Login("staff");
        using var admin = await Login("admin");
        var orderId = await Order(user);
        await Ok(await staff.PostAsync("/api/staff/orders/" + orderId + "/claim", null));
        var payment = await Open(user, orderId);
        await Review(admin, payment.GetProperty("paymentId").GetString()!);
        var issued = await Fulfill(admin, orderId);
        var onlineId = issued.GetProperty("invoiceId").GetString();
        Assert.Equal(200, (int)(await staff.GetAsync("/api/invoices/" + onlineId)).StatusCode);
        await (await otherUser.GetAsync("/api/invoices/" + onlineId)).Error(404, "NOT_FOUND");
        var counter = await CounterCheckout(admin, await Draft(admin));
        var counterId = counter.GetProperty("invoiceId").GetString();
        await (await staff.GetAsync("/api/invoices/" + counterId)).Error(404, "NOT_FOUND");
        await (await user.GetAsync("/api/invoices/" + counterId)).Error(404, "NOT_FOUND");
        Assert.Equal(2, (await Ok(await admin.GetAsync("/api/invoices"))).GetProperty("total").GetInt32());
        Assert.Equal(1, (await Ok(await staff.GetAsync("/api/invoices"))).GetProperty("total").GetInt32());
        Assert.Equal(0, (await Ok(await otherUser.GetAsync("/api/invoices"))).GetProperty("total").GetInt32());
        await (await admin.GetAsync("/api/invoices/MISSING")).Error(404, "NOT_FOUND");
    }

    [Fact]
    public async Task TC56_SameCheckoutServiceCall_WithSaleTypedSubtypes_ValidatesPolymorphically()
    {
        using var staff = await Login("staff");
        var otcId = await Draft(staff, "AMOX500", 1);
        var prescriptionId = await Draft(staff, "AMOX500", 1, "DT2610060001");
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
        var checkout = scope.ServiceProvider.GetRequiredService<CheckoutService>();
        Sale otc = await db.Sales.SingleAsync(x => x.SaleId == otcId);
        Sale prescription = await db.Sales.SingleAsync(x => x.SaleId == prescriptionId);
        Assert.IsType<OTCSale>(otc);
        Assert.IsType<PrescriptionSale>(prescription);
        var error = await Assert.ThrowsAsync<BusinessException>(() => checkout.Checkout(otc, "U0000002", true));
        Assert.Equal("PRESCRIPTION_REQUIRED", error.Code);
        var completed = await checkout.Checkout(prescription, "U0000002", true);
        Assert.NotEmpty(completed.InvoiceId);
        Assert.Equal(1, await db.Invoices.CountAsync());
        Assert.Equal(1, (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).DispensedQuantity);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TC42_MissingPaymentConfigurationOrQrFile_DoesNotReserve(bool missingFile)
    {
        using var user = await Login();
        var orderId = await Order(user);
        await factory.WithDb(async db =>
        {
            var setting = await db.PaymentSettings.SingleAsync();
            if (missingFile)
            {
                setting.SetQrImage("qr/missing.png");
            }
            else
            {
                db.PaymentSettings.Remove(setting);
            }
            await db.SaveChangesAsync();
        });
        await (await user.PostAsync("/api/orders/" + orderId + "/payment", null)).Error(409, "PAYMENT_NOT_CONFIGURED");
        Assert.Equal(0, await factory.WithDb(db => db.Payments.CountAsync()));
        Assert.Equal(0, await factory.WithDb(db => db.StockReservations.CountAsync()));
    }

    [Fact]
    public async Task TC44_ConcurrentOpeningWithTwoScopes_CreatesOnePaymentAndReservation()
    {
        using var user = await Login();
        var orderId = await Order(user);
        async Task<PaymentOpenResult> Execute()
        {
            using var scope = factory.Services.CreateScope();
            return await scope.ServiceProvider.GetRequiredService<ManualPaymentService>().Open(orderId, "U0000003");
        }
        var results = await Task.WhenAll(Task.Run(Execute), Task.Run(Execute));
        Assert.Single(results, x => x.Created);
        Assert.Equal(results[0].Payment.PaymentId, results[1].Payment.PaymentId);
        Assert.Equal(1, await factory.WithDb(db => db.Payments.CountAsync()));
        Assert.Equal(1, await factory.WithDb(db => db.StockReservations.CountAsync()));
    }

    [Fact]
    public async Task TC48_ConcurrentFulfillWithTwoScopes_CreatesOneInvoiceAndConsumesOnce()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var orderId = await Order(user);
        var payment = await Open(user, orderId);
        await Review(staff, payment.GetProperty("paymentId").GetString()!);
        var before = await factory.WithDb(db => db.DrugBatches.Where(x => x.DrugId == "PARA500").SumAsync(x => x.Quantity));
        async Task<string> Execute()
        {
            using var scope = factory.Services.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<CheckoutService>().Fulfill(orderId, "U0000002");
                return "OK";
            }
            catch (BusinessException e)
            {
                return e.Code;
            }
        }
        var results = await Task.WhenAll(Task.Run(Execute), Task.Run(Execute));
        Assert.Single(results, x => x == "OK");
        Assert.Single(results, x => x == "INVALID_STATE");
        Assert.Equal(1, await factory.WithDb(db => db.Invoices.CountAsync()));
        Assert.Equal(before - 2, await factory.WithDb(db => db.DrugBatches.Where(x => x.DrugId == "PARA500").SumAsync(x => x.Quantity)));
        Assert.Equal(ReservationStatus.Consumed, await factory.WithDb(async db => (await db.StockReservations.SingleAsync()).Status));
    }

    [Fact]
    public async Task TC40_OnlinePrescriptionReservation_ProtectsCounterQuota_ThenDispensesOnFulfill()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var orderId = await Order(user, "AMOX500", 20, "DT2610060001");
        var payment = await Open(user, orderId);
        var draft = await Draft(staff, "AMOX500", 11, "DT2610060001");
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + draft + "/checkout", new
        {
            cashReceived = true
        })).Error(409, "PRESCRIPTION_INVALID");
        Assert.Equal(0, await factory.WithDb(async db => (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).DispensedQuantity));
        await Review(staff, payment.GetProperty("paymentId").GetString()!, amount: 140000);
        await Fulfill(staff, orderId);
        Assert.Equal(20, await factory.WithDb(async db => (await db.PrescriptionItems.SingleAsync(x => x.ItemId == "PITEM0")).DispensedQuantity));
        Assert.Equal(ReservationStatus.Consumed, await factory.WithDb(async db => (await db.StockReservations.SingleAsync(x => x.PrescriptionItemId == "PITEM0")).Status));
    }

    [Fact]
    public async Task TC38_DraftCancelAndCashValidation_DoNotDeductOrCreateInvoice()
    {
        using var staff = await Login("staff");
        var draft = await Draft(staff);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + draft + "/checkout", new
        {
            cashReceived = false
        })).Error(400, "VALIDATION_FAILED", "cashReceived");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
        var cancelled = await Ok(await staff.PostAsync("/api/staff/sales/" + draft + "/cancel", null));
        Assert.Equal("Cancelled", cancelled.GetProperty("status").GetString());
        Assert.False(cancelled.GetProperty("canCheckout").GetBoolean());
        await (await staff.PostAsJsonAsync("/api/staff/sales/" + draft + "/checkout", new
        {
            cashReceived = true
        })).Error(409, "INVALID_STATE");
        Assert.Equal(0, await factory.WithDb(db => db.Invoices.CountAsync()));
    }

    [Fact]
    public async Task TC42_PaymentGetAndOpen_HideOtherOwners_RequireExistingPayment()
    {
        using var user = await Login();
        using var other = await Login("nguyenvana");
        using var staff = await Login("staff");
        var orderId = await Order(user);
        await (await user.GetAsync("/api/orders/" + orderId + "/payment")).Error(404, "NOT_FOUND");
        await Open(user, orderId);
        await (await other.GetAsync("/api/orders/" + orderId + "/payment")).Error(404, "NOT_FOUND");
        await (await other.PostAsync("/api/orders/" + orderId + "/payment", null)).Error(404, "NOT_FOUND");
        await Ok(await staff.GetAsync("/api/orders/" + orderId + "/payment"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TC42_QrUpload_InvalidContentOrOversize_DoesNotChangeConfiguration(bool oversize)
    {
        using var admin = await Login("admin");
        var before = await Ok(await admin.GetAsync("/api/admin/payment-settings"));
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(oversize ? new byte[LocalFileStorage.MaxBytes + 1] : [1, 2, 3]);
        content.Headers.ContentType = new("image/png");
        form.Add(content, "file", "qr.png");
        await (await admin.PostAsync("/api/admin/payment-settings/qr-image", form)).Error(400, "FILE_INVALID", "file");
        Assert.Equal(before.GetRawText(), (await Ok(await admin.GetAsync("/api/admin/payment-settings"))).GetRawText());
    }

    [Fact]
    public async Task TC45_InvalidReviewFields_DoNotWritePaymentOrOrder()
    {
        using var user = await Login();
        using var staff = await Login("staff");
        var orderId = await Order(user);
        var payment = await Open(user, orderId);
        var before = await factory.WithDb(PersistenceFixture.Snapshot);
        var response = await staff.PostAsJsonAsync("/api/staff/payments/" + payment.GetProperty("paymentId").GetString() + "/review", new
        {
            bankReference = " ",
            receivedAmount = -1.5m
        });
        await response.Error(400, "VALIDATION_FAILED", "receivedAmount");
        Assert.Equal(before, await factory.WithDb(PersistenceFixture.Snapshot));
    }

    [Fact]
    public async Task TC38_CheckoutWithPreviouslyLoadedDraft_UsesLatestSavedLines()
    {
        using var staff = await Login("staff");
        var id = await Draft(staff, quantity: 1);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PharmacyDbContext>();
        Sale stale = await db.Sales.Include(x => x.Items).SingleAsync(x => x.SaleId == id);
        await Ok(await staff.PutAsJsonAsync("/api/staff/sales/" + id, new
        {
            items = new[] { new { drugId = "PARA500", quantity = 3 } }
        }));
        var checkout = scope.ServiceProvider.GetRequiredService<CheckoutService>();
        var result = await checkout.Checkout(stale, "U0000002", true);
        var invoice = await Ok(await staff.GetAsync("/api/invoices/" + result.InvoiceId));
        Assert.Equal(3, invoice.GetProperty("items")[0].GetProperty("quantity").GetInt32());
        Assert.Equal(3000, invoice.GetProperty("totalAmount").GetDecimal());
    }
}
