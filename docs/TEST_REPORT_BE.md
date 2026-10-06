# Báo cáo kiểm thử Backend M5

Nguồn đối chiếu: SRS_v2.0.md §8/§11, API_CONTRACT.md và review be-m4-sale-payment-checkout.md. Phạm vi là API/domain/persistence backend; không tuyên bố giao diện frontend đã được kiểm chứng.

Thời điểm chạy toàn bộ suite: **2026-10-06T13:34:22.3872365+07:00 → 2026-10-06T13:35:05.9741804+07:00** (UTC+07:00). Build trước suite: 0 warning/0 error. .NET 10.0.11, Debug, Windows 10.0.26200, 16 logical processors.

Tổng kết xUnit: **175 pass, 0 fail, 1 skip, 176 trường hợp**. Skip: PostgresSmokeTests vì không có PHARMACY_TEST_POSTGRES; phép đo tải opt-in đã bật và pass. Không có TC backend bị skip. Kết quả của từng dòng bên dưới được đối chiếu UnitTestResult trong TRX, bao gồm mọi bộ tham số của theory.

## Lệnh tái hiện

Chạy từ gốc repository. Lần đầu cần dotnet restore. Với máy không gặp lỗi mạng NuGet, không cần RestoreSources. Lần kiểm chứng này dùng cache gói chính thức do lỗi TLS NuGet của máy, không sửa nguồn repository:

```powershell
# Chỉ khi cache backend/.packages đã có đủ gói và NuGet TLS bị lỗi:
$env:RestoreSources = (Resolve-Path backend/.packages).Path
dotnet build Pharmacy.sln
$env:PHARMACY_TEST_PERFORMANCE = '1'
$env:PHARMACY_PERFORMANCE_OUTPUT = Join-Path $env:TEMP 'pharmacy-m5-performance-final.json'
dotnet test Pharmacy.sln --logger 'console;verbosity=quiet' --logger 'trx;LogFileName=m5.trx' --results-directory (Join-Path $env:TEMP 'pharmacy-m5-results')
# Chỉ seed lớn và đo tải:
dotnet test Pharmacy.sln --filter Category=Performance
# Bỏ opt-in khi muốn suite thường:
Remove-Item Env:PHARMACY_TEST_PERFORMANCE
Remove-Item Env:PHARMACY_PERFORMANCE_OUTPUT
```

TRX/JSON được lưu trong temp, không commit và không chứa dữ liệu nhận tiền thật. Test tạo DB SQLite/storage riêng, không dùng EF InMemory, không đụng DB vận hành. Seed/migration của DB vận hành vẫn theo cơ chế DB trống.

## Đối chiếu 56 TC

Pass dưới đây là kết quả phần backend. TC-04 kiểm homePath, TC-10 kiểm JSON danh mục và trường hợp rỗng; không xác nhận điều hướng/thông báo trên màn hình. Phần cảnh báo giao diện trong TC-42/47: **Không áp dụng cho backend** vì contract §8.1 giao FE hiển thị; API/test kiểm số tiền, nội dung, bản chụp QR và xử lý thiếu/thừa. NFR-05/06 và giao diện responsive cần báo cáo frontend riêng.

| TC | Function | Test method | Kết quả |
|---|---|---|---|
| TC-01 | F001 | `AuthTests.TC01_RegisterUser_HashesPassword_ThenCanLogin` | Pass (1/1 trường hợp) |
| TC-02 | F001 | `AuthTests.TC02_DuplicateUsername_IgnoresCaseAndTrim_NoPartialWrite`<br>`AuthTests.TC02_InvalidRegistration_ReturnsFieldErrors`<br>`AuthTests.TC02_LengthBoundaries_AndPasswordWhitespaceArePreserved`<br>`AuthTests.TC02_ConcurrentDuplicateRegistration_OnlyOneAccountIsCreated` | Pass (9/9 trường hợp) |
| TC-03 | F001, F003 | `AuthTests.TC03_InjectedRole_IsIgnored_AccountRemainsUser` | Pass (2/2 trường hợp) |
| TC-04 | F002 | `AuthTests.TC04_Login_ReturnsRoleHomePath_AndSecureCookieAttributes` | Pass (3/3 trường hợp) |
| TC-05 | F002 | `AuthTests.TC05_InvalidLogin_UsesSameMessage_LeavesClientUnauthenticated` | Pass (1/1 trường hợp) |
| TC-06 | F002, F012, F014, F016 | `AuthTests.TC06_Logout_BlocksProtectedApi_ReLoginPreservesBusinessData` | Pass (1/1 trường hợp) |
| TC-07 | F003 | `AuthTests.TC07_AdminCreatesStaff_ListsSearchesPages_WithoutSecrets` | Pass (1/1 trường hợp) |
| TC-08 | F003 | `AuthTests.TC08_NonAdmin_CannotListOrCreateAccounts`<br>`AuthTests.TC08_Guest_CannotListOrCreateAccounts` | Pass (3/3 trường hợp) |
| TC-09 | F004 | `CatalogTests.TC09_GuestProducts_OmitPriceAndInternalData_ExcludeDisabledDrugs`<br>`CatalogTests.TC09_InStock_UsesUnexpiredStockMinusActiveReservations` | Pass (2/2 trường hợp) |
| TC-10 | F004 | `CatalogTests.TC10_AuthenticatedProducts_IncludePrice_UnicodeSearchAndPaginationWork` | Pass (3/3 trường hợp) |
| TC-11 | F005 | `CatalogTests.TC11_AdminCreatesUpdatesAndTogglesDrug_ValidatesFieldsAndDuplicates`<br>`CatalogTests.TC11_InvalidDrugInput_ReturnsFieldErrors_WithoutWriting`<br>`CatalogTests.TC11_DrugImage_UploadsAndServesPublicly_RejectsInvalidFiles` | Pass (9/9 trường hợp) |
| TC-12 | F005 | `CatalogTests.TC12_NonAdmin_CannotReadOrChangeCatalog` | Pass (3/3 trường hợp) |
| TC-13 | F005, F013, F017, F020 | `CheckoutTests.TC13_OnlinePaymentAndInvoice_KeepOrderPrice_CounterUsesCheckoutPrice`<br>`OrderingTests.TC13_OrderSnapshotsPrice_ChangedCartRequiresConfirmation` | Pass (2/2 trường hợp) |
| TC-14 | F006 | `InventoryTests.TC14_AddValidBatch_IncreasesStock_AndReturnsContractDto` | Pass (1/1 trường hợp) |
| TC-15 | F006 | `InventoryTests.TC15_DuplicateBatch_IsRejected_AndUniquenessIsPerDrug`<br>`InventoryTests.TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock` | Pass (7/7 trường hợp) |
| TC-16 | F007, F008 | `InventoryTests.TC16_InventoryCountsExpiryAndReservations_ReleaseDoesNotDeductStock`<br>`InventoryTests.TC16_PrescriptionReservations_ProtectQuota_AndReleaseBothLimits`<br>`InventoryTests.TC16_ConcurrentReserve_LastStockIsNotOverbooked` | Pass (3/3 trường hợp) |
| TC-17 | F007, F009 | `InventoryTests.TC17_GuestAndUser_CannotReadInventoryOrReports` | Pass (2/2 trường hợp) |
| TC-18 | F008, F019 | `FefoDomainTests.TC18_DomainFefo_SplitsBatches_AndBreaksTiesByBatchNumber`<br>`InventoryTests.TC18_ServiceDeduct_UsesFefo_MergesLines_AndRollsBackOnFailure`<br>`InventoryTests.TC18_ReservedStock_IsProtectedAndConsumedOnlyByItsOrder`<br>`InventoryTests.TC18_ConcurrentDeduct_RefreshesStaleContexts_AndNeverOverdraws` | Pass (4/4 trường hợp) |
| TC-19 | F008, F019 | `FefoDomainTests.TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted`<br>`InventoryTests.TC19_ServiceDeduct_ExcludesD_UsesDPlusOne` | Pass (5/5 trường hợp) |
| TC-20 | F008, F017 | `CheckoutTests.TC20_TwoUsersOpenQr_OnlyLastAvailableStockIsReserved` | Pass (1/1 trường hợp) |
| TC-21 | F008, F011, F014 | `OrderingTests.TC21_CancelPrescriptionOrder_ReleasesStockQuotaAndClosesPaymentAtomically`<br>`OrderingTests.TC21_CancellationFailure_RollsBackOrderReservationAndPayment` | Pass (2/2 trường hợp) |
| TC-22 | F009 | `InventoryTests.TC22_ExpiringReport_UsesOpenClosedDayWindow_AndDoesNotWrite` | Pass (1/1 trường hợp) |
| TC-23 | F009 | `InventoryTests.TC23_LowStockReport_IncludesEqualityAndZero_ExcludesAboveThreshold` | Pass (1/1 trường hợp) |
| TC-24 | F010 | `OrderingTests.TC24_OnlineAndCounterPrescriptions_PersistOwnerCreatorTimeAndNoStockChange`<br>`OrderingTests.TC24_MigrationFromM1_PreservesExistingPrescriptionAndDoesNotReseed`<br>`OrderingTests.TC24_CounterDuplicateAndInvalidDetails_ReturnFieldErrorsWithoutWriting` | Pass (3/3 trường hợp) |
| TC-25 | F010 | `OrderingTests.TC25_PrescriptionImages_RejectInvalidFilesAndHideOtherOwners` | Pass (1/1 trường hợp) |
| TC-26 | F010, F011 | `OrderingTests.TC26_DetailsMergeDuplicates_ApproveTransitionsEligibleLinkedOrders`<br>`OrderingTests.TC26_InvalidReviewAndDetails_DoNotPartiallyWrite`<br>`OrderingTests.TC26_RejectOrCancelPrescription_RejectsWaitingOrdersWithReason` | Pass (4/4 trường hợp) |
| TC-27 | F011, F016 | `OrderingTests.TC27_ValidateQuota_RejectsInvalidPrescriptionCases` | Pass (5/5 trường hợp) |
| TC-28 | F011 | `OrderingTests.TC28_UserCannotCallStaffMutations_CompletedQuotaCannotBeCancelled`<br>`OrderingTests.TC28_UserCannotReview_ConcurrentReservationsRespectLastQuota` | Pass (2/2 trường hợp) |
| TC-29 | F012 | `OrderingTests.TC29_CartAccumulatesUpdatesDeletes_WithoutReservationOrDeduction` | Pass (1/1 trường hợp) |
| TC-30 | F012 | `OrderingTests.TC30_CartIsUserOnly_AllRoutesBlocked` | Pass (3/3 trường hợp) |
| TC-31 | F012, F013 | `OrderingTests.TC31_CartIssues_BlockInvalidOrder_KeepCartUnchanged` | Pass (2/2 trường hợp) |
| TC-32 | F013 | `OrderingTests.TC32_ConcurrentPlacement_OnlyOneOrderConsumesSameCart`<br>`OrderingTests.TC32_PlaceOtc_SetsOwnerUniqueCodeAndTotal_ClearsCartWithoutReserving`<br>`OrderingTests.TC32_OrderValidation_BlocksMissingAddressAndPrescriptionRequired` | Pass (4/4 trường hợp) |
| TC-33 | F013, F017 | `OrderingTests.TC33_PendingPrescriptionOrder_WaitsWithoutReservation_ApprovedOrderChecksQuota` | Pass (1/1 trường hợp) |
| TC-34 | F013, F014 | `OrderingTests.TC34_GuestOrOtherOwner_CannotPlaceReadCancelOrUsePrescription` | Pass (1/1 trường hợp) |
| TC-35 | F014, F017, F018 | `CheckoutTests.TC35_CancelVersusReview_OneValidTransition_ClosedOrderCannotPayOrReview` | Pass (1/1 trường hợp) |
| TC-36 | F015, F019 | `OrderingTests.TC36_UserCannotManageStaffOrdersOrDashboard`<br>`OrderingTests.TC36_StaffCannotShipCompleteOrFulfillBeforePaymentAndInvoice` | Pass (2/2 trường hợp) |
| TC-37 | F015 | `OrderingTests.TC37_StaffDeliveryLifecycle_RequiresInvoice_NeverDeductsAgain`<br>`OrderingTests.TC37_StaffRejectCancel_RequiresReason_ReleasesPendingPayment` | Pass (4/4 trường hợp) |
| TC-38 | F016, F019 | `CheckoutTests.TC38_CounterOtcCheckout_DeductsFefo_CreatesInvoice_AndCannotRepeat`<br>`CheckoutTests.TC38_DraftCancelAndCashValidation_DoNotDeductOrCreateInvoice`<br>`CheckoutTests.TC38_CheckoutWithPreviouslyLoadedDraft_UsesLatestSavedLines` | Pass (3/3 trường hợp) |
| TC-39 | F016 | `CheckoutTests.TC39_OtcPrescriptionOrControlledDrug_IsBlocked_KindCannotChange` | Pass (2/2 trường hợp) |
| TC-40 | F016, F011, F019 | `CheckoutTests.TC40_PartialPrescriptionDispense_ThenRemaining_CannotExceedQuota`<br>`CheckoutTests.TC40_OnlinePrescriptionReservation_ProtectsCounterQuota_ThenDispensesOnFulfill` | Pass (2/2 trường hợp) |
| TC-41 | F016, F019 | `CheckoutTests.TC41_OtherDraftOwner_IsHiddenForGetUpdateCancelAndCheckout` | Pass (2/2 trường hợp) |
| TC-42 | F017 | `CheckoutTests.TC42_OpenQr_ReturnsExpectedAmountOrderContentAndPrivateImage`<br>`CheckoutTests.TC42_MissingPaymentConfigurationOrQrFile_DoesNotReserve`<br>`CheckoutTests.TC42_PaymentGetAndOpen_HideOtherOwners_RequireExistingPayment`<br>`CheckoutTests.TC42_QrUpload_InvalidContentOrOversize_DoesNotChangeConfiguration` | Pass (6/6 trường hợp) |
| TC-43 | F017, F018 | `CheckoutTests.TC43_OpeningQrOrWritingNote_DoesNotConfirmOrDeductStock` | Pass (1/1 trường hợp) |
| TC-44 | F017, F008 | `CheckoutTests.TC44_RepeatedQrOpening_KeepsSnapshotAndReservation_AfterSettingsChange`<br>`CheckoutTests.TC44_ConcurrentOpeningWithTwoScopes_CreatesOnePaymentAndReservation` | Pass (2/2 trường hợp) |
| TC-45 | F018 | `CheckoutTests.TC45_StaffAndAdminReviewEnoughMoney_RecordAuditAndPrepareWithoutDeduction`<br>`CheckoutTests.TC45_InvalidReviewFields_DoNotWritePaymentOrOrder` | Pass (3/3 trường hợp) |
| TC-46 | F018 | `CheckoutTests.TC46_Underpayment_Returns200PendingAndShortfallNote` | Pass (1/1 trường hợp) |
| TC-47 | F017, F018 | `CheckoutTests.TC47_Overpayment_ConfirmsExpectedTotal_PreservesReceivedAmount` | Pass (1/1 trường hợp) |
| TC-48 | F018 | `CheckoutTests.TC48_ConcurrentReview_WithTwoScopes_OnlyOneConfirmation`<br>`CheckoutTests.TC48_ConcurrentFulfillWithTwoScopes_CreatesOneInvoiceAndConsumesOnce` | Pass (2/2 trường hợp) |
| TC-49 | F018 | `CheckoutTests.TC49_DuplicateConfirmedBankReference_IsRejectedWithoutPartialWrite` | Pass (1/1 trường hợp) |
| TC-50 | F018 | `CheckoutTests.TC50_GuestAndUserCannotReviewOrConfigurePayments` | Pass (2/2 trường hợp) |
| TC-51 | F019 | `CheckoutTests.TC51_InvoiceWriteFailure_RollsBackStockQuotaSaleAndReservations_KeepsConfirmedPayment`<br>`CheckoutTests.TC51_MultiLineShortage_DoesNotDeductAnyLineOrCompleteDraft` | Pass (2/2 trường hợp) |
| TC-52 | F008, F019 | `CheckoutTests.TC52_ReservedStockExpires_ReallocatesOrStopsWithoutLosingPayment` | Pass (2/2 trường hợp) |
| TC-53 | F020 | `CheckoutTests.TC53_OnlineAndCounterInvoices_KeepAllocationsAndPricesImmutable` | Pass (1/1 trường hợp) |
| TC-54 | F020 | `CheckoutTests.TC54_Invoices_RespectUserStaffCreatorHandlerAndAdminScopes` | Pass (1/1 trường hợp) |
| TC-55 | F003, F008, F010, F013, F018, F020 | `PersistenceTests.TC55_Restart_PreservesAllDomainData_AndDoesNotReseed` | Pass (1/1 trường hợp) |
| TC-56 | F016, F019 | `CheckoutTests.TC56_SameCheckoutServiceCall_WithSaleTypedSubtypes_ValidatesPolymorphically`<br>`HardeningTests.TC56_PrescriptionSubtype_ValidatesOnlineOwner_AndAppliesCompletionEffects` | Pass (4/4 trường hợp) |

Tổng TC backend: **56 Pass / 0 Fail / 0 Không áp dụng toàn TC**. Các phần giao diện không thuộc phạm vi được nêu rõ ở trên.

## NFR-01: dữ liệu lớn và 20 lượt đo

`PerformanceTests.NFR01_LargeIsolatedSqlite_TwentyReadsPerEndpoint_P95UnderTwoSeconds` tạo file SQLite mới có tên ngẫu nhiên trong temp, migrate rồi LargeDataset.Seed. Dataset đúng 500 thuốc/2.000 lô (D−1, D, D+30, D+31)/1.000 đơn OTC (500 mỗi User), 3.000 dòng đơn, giỏ User 10 dòng và 300 reservation Active. Seed từ chối DB có dữ liệu hoặc provider khác; không có endpoint seed lớn trên DB vận hành. Sau đo, test kiểm số đơn/reservation giữ nguyên và finally xóa DB/storage; JSON số đo giữ lại.

Mỗi endpoint 20 GET tuần tự, không loại lượt đầu, page=1/pageSize=20 cho danh sách. Products đo Guest; cart/orders mine đo User; staff orders/inventory đo Staff. Tính thời gian bằng Stopwatch từ trước GetAsync tới sau đọc response body; kiểm HTTP 200 và số lượng dữ liệu. Dùng HTTP pipeline ASP.NET Core TestServer trong cùng process, gồm cookie auth, controller, EF SQLite, JSON và đọc body; **không gồm TCP, proxy Next.js, trình duyệt hoặc mạng Supabase**. Collection Performance tắt parallel. Build Debug; chạy trong suite đầy đủ nên JIT/cache model có thể đã nóng từ các test trước; lượt đầu mỗi endpoint vẫn được tính. p95 dùng nearest-rank: sort 20 mẫu, lấy mẫu thứ ceil(0,95×20)=19.

Thời điểm ghi phép đo: **2026-10-06T13:35:05.834444+07:00**.

| GET | p95 (ms) | Max (ms) | Lượt ≤2.000 ms | Kết quả |
|---|---:|---:|---:|---|
| `/api/products?page=1&pageSize=20` | 23.29 | 53.22 | 20/20 | Pass |
| `/api/cart` | 22.44 | 27.48 | 20/20 | Pass |
| `/api/orders/mine?page=1&pageSize=20` | 9.72 | 23.02 | 20/20 | Pass |
| `/api/staff/orders?page=1&pageSize=20` | 14.19 | 16.79 | 20/20 | Pass |
| `/api/inventory?page=1&pageSize=20` | 43.73 | 52.07 | 20/20 | Pass |

100/100 lượt dưới 2 giây, đạt ≥95% theo SRS NFR-01 ở cấu hình đo này. Lần chạy riêng trước suite cũng pass (p95 products/cart/orders mine/staff orders/inventory lần lượt 89,78/85,60/27,39/35,69/60,81 ms). Không có endpoint vượt ngưỡng nên không đổi thuật toán InventoryReader.Snapshot; hiện vẫn nạp toàn bộ, cần đo lại nếu dữ liệu vượt cỡ SRS hoặc triển khai nhiều người dùng/qua mạng.

20 mẫu gốc, đơn vị ms, theo thứ tự chạy (làm tròn 2 số thập phân; p95 tính từ giá trị đầy đủ trong JSON):

- `/api/products?page=1&pageSize=20`: 23.29, 21.79, 16.77, 16.77, 17.48, 53.22, 15.82, 16.13, 16.34, 18.80, 17.32, 19.94, 21.08, 18.28, 19.91, 21.76, 22.53, 18.53, 18.11, 18.57.
- `/api/cart`: 27.48, 18.23, 20.00, 16.48, 16.39, 16.82, 16.06, 17.03, 17.80, 17.90, 17.72, 22.44, 22.40, 19.19, 18.60, 19.77, 18.39, 19.02, 17.95, 20.27.
- `/api/orders/mine?page=1&pageSize=20`: 23.02, 8.73, 9.72, 8.01, 8.06, 8.43, 8.69, 8.30, 7.27, 7.49, 9.01, 8.35, 8.20, 7.91, 7.22, 7.38, 7.16, 9.04, 7.46, 7.28.
- `/api/staff/orders?page=1&pageSize=20`: 16.79, 9.91, 11.66, 8.63, 8.40, 8.44, 8.32, 9.92, 11.21, 14.19, 11.27, 9.48, 10.04, 12.10, 11.65, 11.72, 12.29, 12.80, 12.25, 12.89.
- `/api/inventory?page=1&pageSize=20`: 23.39, 16.33, 17.89, 25.99, 21.15, 16.15, 16.22, 18.08, 23.46, 24.44, 23.49, 19.73, 17.44, 18.58, 19.87, 26.85, 27.30, 52.07, 43.73, 33.39.

## OOP-01 và NFR-02/NFR-08

- CheckoutService không phân nhánh Kind cho RecordDispense; gọi Sale.ApplyCompletionEffects. PrescriptionSale override, chỉ subtype này tác động PrescriptionItem. Kiểm tra chủ đơn online nằm trong PrescriptionSale.Validate; SaleEvaluation chỉ gọi Sale.Validate. Factory tạo subtype giữ nguyên theo SaleKind. TC-56 cũ và ba trường hợp chủ đúng/sai/null đều Pass; test còn kiểm OTC không cập nhật lượng đã cấp và Prescription cập nhật qua cùng lời gọi.
- M4 rollback/FEFO/quota/đồng thời vẫn pass trong suite. Các test provider xác nhận không có pending model changes trên SQLite/Postgres, không tạo migration mới.
- Rà nguồn logging: chỉ middleware ghi loại exception và trace ID cho lỗi/concurrency, không log request body, mật khẩu, cấu hình, exception message/inner exception. EF Core provider logging bị tắt để tránh exception có giá trị dữ liệu; không bật EnableSensitiveDataLogging hay LogTo. Đánh đổi: log không còn stack trace/SQL; dùng trace ID, loại lỗi và tái hiện trên DB test để điều tra.
- `HardeningTests.NFR02_NFR08_LoginAndDatabaseFailure_DoNotLeakSecretsInLogsOr500Response`: đăng nhập sai bằng mật khẩu đánh dấu, trigger DB phát sinh lỗi chứa chuỗi kết nối/mật khẩu giả, thu toàn bộ ILogger và kiểm không có bí mật. Response 500 INTERNAL_ERROR không có Exception/stack/trigger/bí mật; Sale rollback không lưu. Test Pass.
- API giữ cookie/antiforgery, server kiểm role/chủ và Guest không nhận unitPrice, các TC quyền tương ứng đều Pass. Không bổ sung dữ liệu ngân hàng/QR thật.

## Giới hạn kiểm chứng

Chưa chạy M4/M5 trên PostgreSQL/Supabase thật trong phiên này vì thiếu PHARMACY_TEST_POSTGRES; M3.5 đã được PO kiểm chứng trên Supabase theo review. PostgreSQL opt-in còn skip, không được tính thành Pass. Phép đo NFR-01 chỉ SQLite/TestServer trên máy này; chưa đo trình duyệt, TCP, tải đồng thời hoặc Supabase. Khóa tồn vẫn một tiến trình theo kiến trúc. Không có chức năng M1–M4 còn stub; kiểm thử giao diện/phần cảnh báo thuộc frontend.

Smoke HTTP bổ sung trên cổng tạm riêng với SQLite/storage/key temp: user OTC → QR → review đủ tiền → fulfill → complete → hóa đơn; bán OTC tại quầy → checkout → hóa đơn. Cả hai pass. API smoke đã tắt, dữ liệu temp đã xóa; không dừng ứng dụng khác đang dùng cổng 5000.


Kiểm chứng M9 (D11), 2026-10-06 17:23 +07:00: chạy "dotnet build Pharmacy.sln" đạt 0 warning/0 error; "dotnet test Pharmacy.sln" đạt 190 Pass/0 Fail/2 Skip (PostgreSQL và performance opt-in chưa bật). Tài khoản khởi tạo hiện tại: admin, staff, chuduc, nguyenvana; mã thuốc nền và tên lấy theo catalog mới. Các TC dùng thanh toán tự cấu hình PaymentFixture; seed vận hành không tạo PaymentSetting/QR. Test mới CatalogSeedTests.TC42_FreshSeed_HasNoPaymentSettings_OpeningQrRequiresAdminConfiguration: Pass, xác nhận PAYMENT_NOT_CONFIGURED và snapshot DB không đổi. Các số đo hiệu năng/bảng TC phía trên là kết quả lịch sử M5, chưa đo lại hiệu năng trong lượt M9.
