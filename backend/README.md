# Backend — Pharmacy Management System

.NET 10 / ASP.NET Core Web API / EF Core 10 / SQLite / xUnit. M1 gồm toàn bộ mô hình dữ liệu và F001–F003; M2 hoàn thành danh mục sản phẩm, nhập lô, tồn kho và báo cáo F004–F009. M3 hoàn thành đơn thuốc, giỏ và quản lý đơn hàng F010–F015. M4 hoàn thành bán tại quầy, QR thủ công, duyệt tiền, checkout và hóa đơn F016–F020; hỗ trợ SQLite/PostgreSQL.

Chạy từ gốc repository:

```powershell
dotnet build Pharmacy.sln
dotnet test Pharmacy.sln
dotnet run --project backend/Pharmacy.Api --launch-profile http
```

API tại `http://localhost:5000`; `GET /api/health` trả `{ "status": "ok", "service": "Pharmacy.Api" }`. Development có `/openapi/v1.json`. `npm run dev:api` vẫn dùng script có sẵn của repository. Dừng bằng Ctrl+C.

Ứng dụng tự migrate rồi seed **chỉ khi các bảng domain chưa có dữ liệu**. Không xóa/nạp lại khi mở ứng dụng; DB đã có một phần dữ liệu cũng được giữ nguyên. Không tự bổ sung tài khoản demo vào DB đang dùng.

| Cấu hình | Mặc định, tương đối với `backend/Pharmacy.Api` |
|---|---|
| `Database:Provider` | `Sqlite` (mặc định) hoặc `Postgres` |
| `ConnectionStrings:Default` | `Data Source=../data/pharmacy.db` |
| `Storage:Root` | `../storage` |
| `DataProtection:KeyPath` | `../data/keys` |
| `BusinessDate:Override` | Không đặt; `yyyy-MM-dd`, chỉ Development/Test |

Biến môi trường dùng dấu `__`, ví dụ `$env:BusinessDate__Override = "2026-10-06"`. Ngày nghiệp vụ mặc định theo múi giờ Việt Nam (+07:00); thời điểm xử lý vẫn là thời gian hiện tại. Override bị bỏ qua ở Production.

DB, key ring xác thực và file upload là dữ liệu runtime, không commit. Giữ thư mục `backend/data/keys` qua lần chạy để cookie vẫn giải mã được. Key ring mặc định lưu trên filesystem; khi triển khai ngoài localhost cần bảo vệ quyền đọc thư mục này và cấu hình mã hóa khóa phù hợp môi trường.

Tài khoản demo:

| Username | Password | Role |
|---|---|---|
| admin | Admin@12345 | Admin |
| staff | Staff@12345 | Staff |
| user | User@12345 | User |
| user2 | User@12345 | User |

Seed có 12 thuốc, các biên lô D−5/D/D+1/D+20/D+30/D+31, thuốc tồn bằng ngưỡng/tồn bằng 0, thuốc kiểm soát/tắt bán và ba đơn thuốc. QR demo được sao chép từ resource nguồn vào `backend/storage/qr/demo-qr.png` khi seed; nội dung chỉ là chuỗi demo, **không dùng để chuyển tiền thật**. Không ghi đè file đã tồn tại. File runtime được ignore; resource nguồn nằm trong `Pharmacy.Core/Data/Assets`.

Luồng gọi API:

1. Gọi `GET /api/auth/csrf` với cookie được giữ; nhận cookie JS-readable `XSRF-TOKEN` và cookie secret `pharmacy.antiforgery`.
2. Với mọi POST/PUT/PATCH/DELETE, gửi `X-XSRF-TOKEN` bằng giá trị cookie `XSRF-TOKEN` cùng các cookie.
3. Đăng ký: `POST /api/auth/register` body `{ "username": "demo-new", "password": "Password1", "confirmPassword": "Password1" }` trả `201 Me`, luôn User, không tự đăng nhập.
4. Đăng nhập: `POST /api/auth/login` body `{ "username": "user", "password": "User@12345" }`; cookie `pharmacy.auth` HttpOnly/SameSite=Lax. Role quyết định `homePath`.
5. Sau login/logout gọi lại `/api/auth/csrf` để đọc token hiện tại. Server cũng tự cấp cookie request token phù hợp identity mới trong response login/logout.
6. `GET /api/auth/me`; `POST /api/auth/logout`. Admin dùng `GET /api/admin/accounts?search=&role=&page=&pageSize=` và `POST /api/admin/accounts/staff` với body giống đăng ký.

FE gọi cùng origin qua Next.js rewrites, `credentials: "include"`; không cần CORS. Không có redirect HTML khi bị chặn: 401/403 trả ProblemDetails JSON. Lỗi theo contract có `status`, `code`, `title` tiếng Việt và `errors` camelCase khi cần. Storage không được phục vụ bằng static files; ảnh thuốc được đọc qua `/api/files/drugs/{fileName}` khi có thuốc tham chiếu đến file đó.

Kiểm thử dùng `WebApplicationFactory` + SQLite file riêng trong temp, clock giả D=2026-10-06 và storage riêng; không dùng EF InMemory. TC-06/55 dựng fixture domain, gồm dữ liệu thanh toán/xuất kho thuộc M4. TC-55 đóng host rồi tạo host mới trên cùng DB, đổi D và so sánh toàn bộ bảng domain, bao gồm giá, tồn, đã cấp, reservation, payment, allocation, invoice và QR.

| TC | Test method |
|---|---|
| TC-01 | `TC01_RegisterUser_HashesPassword_ThenCanLogin` |
| TC-02 | `TC02_DuplicateUsername_IgnoresCaseAndTrim_NoPartialWrite`, `TC02_InvalidRegistration_ReturnsFieldErrors`, `TC02_LengthBoundaries_AndPasswordWhitespaceArePreserved`, `TC02_ConcurrentDuplicateRegistration_OnlyOneAccountIsCreated` |
| TC-03 | `TC03_InjectedRole_IsIgnored_AccountRemainsUser` |
| TC-04 | `TC04_Login_ReturnsRoleHomePath_AndSecureCookieAttributes` |
| TC-05 | `TC05_InvalidLogin_UsesSameMessage_LeavesClientUnauthenticated` |
| TC-06 | `TC06_Logout_BlocksProtectedApi_ReLoginPreservesBusinessData` |
| TC-07 | `TC07_AdminCreatesStaff_ListsSearchesPages_WithoutSecrets` |
| TC-08 | `TC08_NonAdmin_CannotListOrCreateAccounts`, `TC08_Guest_CannotListOrCreateAccounts` |
| TC-55 | `TC55_Restart_PreservesAllDomainData_AndDoesNotReseed` |

Test bổ sung: token thiếu/sai/cũ và tự cấp mới, OpenAPI/health, seed trống/một phần, đóng gói/đa hình, magic bytes/MIME/extension/size/path traversal, unique/partial index/FK/CHECK, concurrency token, cấp mã đồng thời/persist, ProblemDetails không lộ stack trace. TC-56 được kiểm chứng qua CheckoutService trong bộ test M4 bên dưới.

```powershell
dotnet test Pharmacy.sln --filter "FullyQualifiedName~TC55"
dotnet test Pharmacy.sln --filter "FullyQualifiedName~AuthTests"
```

Migration đầu tiên được commit cùng snapshot. Nếu cần tạo migration tiếp theo, cài `dotnet-ef` 10.0.11 rồi chạy:

```powershell
dotnet ef migrations add TenMigration --context PharmacyDbContext --project backend/Pharmacy.Core --startup-project backend/Pharmacy.Core --output-dir Data/Migrations
```

Mã giao dịch dùng sequence atomic theo prefix/ngày trên cả SQLite và PostgreSQL, tồn tại qua restart, tối đa 9.999 mã/prefix/ngày; hết dải trả `INVALID_STATE`, không sinh mã sai định dạng. IInventoryLock vẫn có phạm vi một tiến trình ứng dụng; chưa hỗ trợ chạy nhiều instance đồng thời.

API M2 theo contract §4–§5:

| Quyền | Endpoint |
|---|---|
| Guest và người đăng nhập | `GET /api/products`, `GET /api/products/{drugId}`, `GET /api/files/drugs/{fileName}` |
| Admin | `GET/POST /api/admin/drugs`, `GET/PUT /api/admin/drugs/{drugId}`, `PATCH /api/admin/drugs/{drugId}/sale-status` |
| Admin | `POST /api/admin/drugs/{drugId}/image` (multipart trường `file`), `POST /api/admin/drugs/{drugId}/batches` |
| Staff/Admin | `GET /api/inventory`, `GET /api/inventory/{drugId}`, `GET /api/reports/low-stock`, `GET /api/reports/expiring?days=30` |

Guest chỉ thấy thuốc đang bán và JSON không có thuộc tính `unitPrice`; người đăng nhập thấy giá. Danh sách hỗ trợ `search`, `page=1`, `pageSize=20` (tối đa 100), tìm mã/tên không phân biệt hoa thường, kể cả tiếng Việt có dấu. Không có endpoint xóa thuốc trong contract; tắt bán bằng `sale-status`.

Nhập lô yêu cầu hạn dùng sau D, số lượng nguyên dương, số lô duy nhất trong cùng thuốc. Tồn khả dụng bằng `max(0, tồn còn hạn - giữ đang hoạt động)`; hết hạn khi hạn dùng ≤ D. Báo cáo gần hết hạn chỉ gồm lô còn hàng với `0 < daysRemaining ≤ days`; tồn thấp gồm cả bằng ngưỡng và bằng 0. Báo cáo chỉ đọc dữ liệu.

`InventoryService.Reserve/Release/AllocateFEFO/Deduct` là API nội bộ, chưa có endpoint. Mỗi thao tác dùng singleton `IInventoryLock` và transaction; FEFO ở `Drug.PlanFEFO`, trừ lô ở `DrugBatch.Deduct`. Giữ hàng bảo vệ cả tồn khả dụng và hạn mức đơn thuốc, có tính idempotent; trừ kho online chỉ tiêu thụ reservation của chính đơn đó. Khi M3–M4 cần cập nhật thêm order/payment/invoice, gọi `InventoryService.Execute` và thực hiện toàn bộ thay đổi trong callback cùng transaction, không lồng transaction/khóa. Lỗi rollback cả dữ liệu và trạng thái tracking.

| TC | Test method M2 |
|---|---|
| TC-09 | `TC09_GuestProducts_OmitPriceAndInternalData_ExcludeDisabledDrugs`, `TC09_InStock_UsesUnexpiredStockMinusActiveReservations` |
| TC-10 | `TC10_AuthenticatedProducts_IncludePrice_UnicodeSearchAndPaginationWork` |
| TC-11 | `TC11_AdminCreatesUpdatesAndTogglesDrug_ValidatesFieldsAndDuplicates`, `TC11_InvalidDrugInput_ReturnsFieldErrors_WithoutWriting`, `TC11_DrugImage_UploadsAndServesPublicly_RejectsInvalidFiles` |
| TC-12 | `TC12_NonAdmin_CannotReadOrChangeCatalog` |
| TC-14 | `TC14_AddValidBatch_IncreasesStock_AndReturnsContractDto` |
| TC-15 | `TC15_DuplicateBatch_IsRejected_AndUniquenessIsPerDrug`, `TC15_InvalidBatch_ReturnsFieldError_WithoutChangingStock` |
| TC-16 | `TC16_InventoryCountsExpiryAndReservations_ReleaseDoesNotDeductStock`, `TC16_ConcurrentReserve_LastStockIsNotOverbooked`, `TC16_PrescriptionReservations_ProtectQuota_AndReleaseBothLimits` |
| TC-17 | `TC17_GuestAndUser_CannotReadInventoryOrReports` |
| TC-18 | `TC18_ServiceDeduct_UsesFefo_MergesLines_AndRollsBackOnFailure`, `TC18_ReservedStock_IsProtectedAndConsumedOnlyByItsOrder`, `TC18_ConcurrentDeduct_RefreshesStaleContexts_AndNeverOverdraws`, `TC18_DomainFefo_SplitsBatches_AndBreaksTiesByBatchNumber` |
| TC-19 | `TC19_ServiceDeduct_ExcludesD_UsesDPlusOne`, `TC19_DomainExpiryBoundary_OnlyDatesAfterDCanBeDeducted` (D, D+1, D+30, D+31) |
| TC-22 | `TC22_ExpiringReport_UsesOpenClosedDayWindow_AndDoesNotWrite` |
| TC-23 | `TC23_LowStockReport_IncludesEqualityAndZero_ExcludesAboveThreshold` |

```powershell
dotnet test Pharmacy.sln --filter "FullyQualifiedName~CatalogTests|FullyQualifiedName~InventoryTests|FullyQualifiedName~FefoDomainTests"
```

M2 chưa thay đổi schema nên dùng migration M1. Các truy vấn danh mục/kho hiện đọc snapshot rồi lọc bằng .NET để bảo đảm tìm tiếng Việt không phân biệt hoa thường; đo và tối ưu dữ liệu lớn thuộc M5.

API M3 theo contract §6, §7.1–7.3 và §9:

| Quyền | Endpoint |
|---|---|
| User | `POST /api/prescriptions` (multipart `image`, `patientId`, `patientName`), `GET /api/prescriptions/mine`, `GET /api/prescriptions/usable` |
| Chủ đơn thuốc hoặc Staff/Admin | `GET /api/prescriptions/{id}`, `GET /api/prescriptions/{id}/image` |
| Staff/Admin | `GET /api/prescriptions`, `POST /api/prescriptions/counter`, `PUT /api/prescriptions/{id}/details`, `POST /api/prescriptions/{id}/approve`, `/reject`, `/cancel` |
| User | `GET /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/{drugId}` |
| User | `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/{orderId}`, `POST /api/orders/{orderId}/cancel` |
| Staff/Admin | `GET /api/staff/orders`, `GET /api/staff/orders/{orderId}`, `POST /api/staff/orders/{orderId}/claim`, `/ship`, `/complete`, `/reject`, `/cancel`, `/fulfill` |
| Staff/Admin | `GET /api/dashboard/summary` |

Ảnh đơn thuốc kiểm tra quyền trước khi đọc file, không có URL public; người khác nhận 404. Tiếp nhận/duyệt đơn thuốc không xuất kho. Nhập chi tiết gộp thuốc trùng, chỉ sửa PendingReview; `ValidateQuota` kiểm tra trạng thái, người bệnh, ngày hiệu lực, thuốc trong đơn và lượng đã cấp + đang giữ cho đơn khác. Approve kiểm tra lại Order WaitingReview liên kết: đủ điều kiện sang AwaitingPayment, thiếu điều kiện giữ trạng thái và ghi note. Reject/Cancel đơn thuốc chuyển Order WaitingReview liên kết sang Rejected kèm lý do.

Giỏ chỉ dành cho role User, cộng dồn cùng thuốc và báo issue khi tắt bán/thiếu khả dụng, không giữ kho. Đặt hàng chốt giá hiện tại, so `expectedTotal`, trả `PRICE_CHANGED` với CartView mới nếu khác; không dùng userId/giá từ client. Đặt thành công xóa dòng đã đặt trong cùng transaction. Đơn PendingReview chưa được thanh toán/giữ hàng; mở thanh toán và giữ hàng thuộc M4.

Hủy/từ chối đơn dùng `InventoryService.Execute`: đổi trạng thái, giải phóng tồn/hạn mức và đóng Payment PendingReview trong một transaction. Không hủy đơn đã xác nhận thanh toán. Staff giao/hoàn tất cần Payment Confirmed và hóa đơn từ Sale Completed; cập nhật giao hàng không trừ kho. `canCancel`/`canPay` được tính trên server. `/fulfill` đã nối CheckoutService ở M4; chỉ xuất khi Preparing, Payment Confirmed và chưa có hóa đơn.

Migration `PrescriptionCreatedAt` bổ sung thời điểm tạo đơn thuốc. Bản ghi mới/seed dùng IBusinessClock.Now; bản ghi từ DB M1 dùng `1970-01-01T00:00:00+00:00` để biểu thị thời điểm cũ chưa được lưu, không suy đoán ngày tạo. Test nâng cấp từ migration M1 xác nhận bảo toàn dữ liệu và không seed đè.

Kiểm chứng M3: build 0 warning/0 error; toàn bộ 120 test pass (84 test M1–M2 và 36 trường hợp M3). Smoke HTTP tất cả route M3 đã pass, gồm ảnh riêng tư, luồng duyệt đơn liên kết, giỏ/đặt/hủy đơn, staff và dashboard. Ship/complete thành công được kiểm chứng bằng fixture Payment Confirmed + hóa đơn trong integration test, vì API thanh toán/xuất hóa đơn thuộc M4.

```powershell
dotnet test Pharmacy.sln --filter "FullyQualifiedName~OrderingTests"
```

| TC | Test method M3 |
|---|---|
| TC-13 | `TC13_OrderSnapshotsPrice_ChangedCartRequiresConfirmation` |
| TC-21 | `TC21_CancelPrescriptionOrder_ReleasesStockQuotaAndClosesPaymentAtomically`, `TC21_CancellationFailure_RollsBackOrderReservationAndPayment` |
| TC-24 | `TC24_OnlineAndCounterPrescriptions_PersistOwnerCreatorTimeAndNoStockChange`, `TC24_CounterDuplicateAndInvalidDetails_ReturnFieldErrorsWithoutWriting`, `TC24_MigrationFromM1_PreservesExistingPrescriptionAndDoesNotReseed` |
| TC-25 | `TC25_PrescriptionImages_RejectInvalidFilesAndHideOtherOwners` |
| TC-26 | `TC26_DetailsMergeDuplicates_ApproveTransitionsEligibleLinkedOrders`, `TC26_InvalidReviewAndDetails_DoNotPartiallyWrite`, `TC26_RejectOrCancelPrescription_RejectsWaitingOrdersWithReason` |
| TC-27 | `TC27_ValidateQuota_RejectsInvalidPrescriptionCases` |
| TC-28 | `TC28_UserCannotReview_ConcurrentReservationsRespectLastQuota`, `TC28_UserCannotCallStaffMutations_CompletedQuotaCannotBeCancelled` |
| TC-29 | `TC29_CartAccumulatesUpdatesDeletes_WithoutReservationOrDeduction` |
| TC-30 | `TC30_CartIsUserOnly_AllRoutesBlocked` |
| TC-31 | `TC31_CartIssues_BlockInvalidOrder_KeepCartUnchanged` |
| TC-32 | `TC32_PlaceOtc_SetsOwnerUniqueCodeAndTotal_ClearsCartWithoutReserving`, `TC32_OrderValidation_BlocksMissingAddressAndPrescriptionRequired`, `TC32_ConcurrentPlacement_OnlyOneOrderConsumesSameCart` |
| TC-33 | `TC33_PendingPrescriptionOrder_WaitsWithoutReservation_ApprovedOrderChecksQuota` |
| TC-34 | `TC34_GuestOrOtherOwner_CannotPlaceReadCancelOrUsePrescription` |
| TC-36 | `TC36_StaffCannotShipCompleteOrFulfillBeforePaymentAndInvoice`, `TC36_UserCannotManageStaffOrdersOrDashboard` |
| TC-37 | `TC37_StaffDeliveryLifecycle_RequiresInvoice_NeverDeductsAgain`, `TC37_StaffRejectCancel_RequiresReason_ReleasesPendingPayment` |

M3.5 hỗ trợ PostgreSQL/Supabase qua Npgsql 10.0.2, song song SQLite. Cấu hình Supabase:

1. Trong project, mở **Project Settings → Database → Connection string → Session pooler**; giao diện hiện tại cũng có nút **Connect → Session pooler**. Sao chép đúng host và username của project, cổng Session pooler là 5432. Xem [hướng dẫn kết nối chính thức](https://supabase.com/docs/guides/database/connecting-to-postgres).
2. Sao chép `backend/Pharmacy.Api/.env.example` thành `.env`, đặt giá trị trên máy của mình:

```dotenv
Database__Provider=Postgres
ConnectionStrings__Default=Host=<pooler-host>;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<database-password>;SSL Mode=Require
```

3. Từ gốc repository chạy `npm run dev:api`. API nạp `.env` trong content root; biến môi trường hệ điều hành và command line được ưu tiên hơn `.env`. `dotnet run --project backend/Pharmacy.Api --launch-profile http` cũng dùng cùng cấu hình.

Đây là chuỗi Npgsql dạng key/value, không phải URI hoặc API key Supabase. Dùng mật khẩu database; không percent-encode như URI. Nếu mật khẩu có dấu chấm phẩy, đặt giá trị Password trong dấu ngoặc kép theo cú pháp Npgsql. Không ghi connection string thật vào Git, log hoặc frontend. File `.env` đã được ignore; template để trống connection string.

Ứng dụng tự migrate rồi seed khi DB domain trống. PostgreSQL dùng schema riêng `pharmacy` cho toàn bộ bảng và migration history; không thêm schema này vào danh sách exposed schemas của Data API. FE tiếp tục qua Web API với cookie và phân quyền server. Seed chỉ chứa ngân hàng/QR demo; không dùng dữ liệu nhận tiền thật. Ảnh thuốc/đơn thuốc/QR vẫn ở `backend/storage`, không dùng Supabase Storage. Muốn quay về SQLite: `Database__Provider=Sqlite`, bỏ connection string PostgreSQL hoặc đặt `Data Source=../data/pharmacy.db`. Chuyển provider không tự sao chép dữ liệu giữa hai DB.

Migration SQLite hiện có giữ nguyên file và ID ở `Data/Migrations`, gắn với `PharmacyDbContext`; migration PostgreSQL ở `Data/Migrations/Postgres`, gắn với `PostgresPharmacyDbContext`. Hai context có snapshot riêng trong cùng assembly. Factory design-time nằm trong Core, dùng connection mẫu để sinh model/script, không đọc bí mật hoặc khởi động API. Để thêm migration PostgreSQL và sinh SQL offline:

```powershell
dotnet ef migrations add TenMigration --context PostgresPharmacyDbContext --project backend/Pharmacy.Core --startup-project backend/Pharmacy.Core --output-dir Data/Migrations/Postgres
dotnet ef migrations script --idempotent --context PostgresPharmacyDbContext --project backend/Pharmacy.Core --startup-project backend/Pharmacy.Core --output backend/Pharmacy.Core/Data/Migrations/Postgres/InitialPostgres.sql
```

Script PostgreSQL đã sinh bằng EF CLI và kiểm tra tự động, gồm schema, CHECK, unique/partial index, DateOnly `date`, DateTimeOffset `timestamp with time zone`. Tất cả thời điểm PostgreSQL chuyển sang UTC; ngày nghiệp vụ vẫn tính theo múi giờ Việt Nam. Lỗi unique dùng helper chung SQLite 2067/1555 và PostgreSQL 23505; Version concurrency token giữ nguyên. Các truy vấn tồn/giỏ/dashboard nhiều bước dùng snapshot RepeatableRead trên PostgreSQL. Sequence dùng INSERT ON CONFLICT RETURNING atomic và tham gia transaction hiện tại.

Test mặc định hoàn toàn dùng SQLite temp, không cần mạng và không dùng connection string của ứng dụng. Test mới:

- `DatabaseProviderTests`: helper lỗi trùng khóa, hai bộ migration độc lập, SQL PostgreSQL, ngày/UTC/concurrency token.
- `DatabaseConfigurationTests`: nạp `.env`, giữ dấu `=`/`;` trong connection string, DI đúng provider.
- `PostgresSmokeTests.Postgres_MigrateSeedUtcUniqueConcurrencyAndAtomicSequence_Smoke`: tự skip nếu thiếu `PHARMACY_TEST_POSTGRES`; khi có sẽ migrate/seed, kiểm tra UTC, unique, stale write, sequence đồng thời và rollback.

Dùng **database PostgreSQL dành riêng cho test**. Smoke test giữ migration/seed và sequence trong DB, xóa các bản ghi thử riêng của nó; không xóa database/schema và không dùng DB vận hành. Chuỗi test lấy trực tiếp từ biến môi trường, không lưu vào file nguồn:

```powershell
# Đặt PHARMACY_TEST_POSTGRES bằng cơ chế quản lý bí mật của máy/CI trước khi chạy.
dotnet test Pharmacy.sln --filter "Category=Postgres"
dotnet test Pharmacy.sln
```

Môi trường hiện tại chưa có PostgreSQL thật: kiểm chứng offline 132 pass, 1 skip (smoke PostgreSQL), build 0 warning/0 error. SQL script đã sinh; chưa kiểm chứng kết nối SSL/Session pooler, apply migration, seed và thao tác thực tế trên Supabase. Máy phát triển gặp lỗi TLS NuGet; lần kiểm chứng dùng `RestoreSources` trỏ cache gói cục bộ đã tải từ NuGet chính thức, không thay đổi cấu hình nguồn của repository.


M4: bán tại quầy, thanh toán thủ công và hóa đơn (F016–F020)

| Quyền | Endpoint |
|---|---|
| Staff/Admin, chỉ giao dịch tại quầy của mình | `POST/GET /api/staff/sales`, `GET/PUT /api/staff/sales/{id}`, `POST .../{id}/cancel`, `POST .../{id}/checkout` |
| User chủ đơn | `POST /api/orders/{id}/payment` (lần đầu 201, mở lại 200 cùng Payment) |
| User chủ đơn hoặc Staff/Admin | `GET /api/orders/{id}/payment` |
| User/Staff/Admin | `GET /api/files/qr/{fileName}` |
| Admin | `GET/PUT /api/admin/payment-settings`, `POST /api/admin/payment-settings/qr-image` (multipart `file`) |
| Staff/Admin | `GET /api/staff/payments`, `POST .../{id}/review`, `POST .../{id}/note`, `POST /api/staff/orders/{id}/fulfill` |
| User/Staff/Admin theo phạm vi hóa đơn | `GET /api/invoices`, `GET /api/invoices/{id}` |

Nháp tại quầy không giữ hàng/hạn mức. `Sale.Validate` được gọi qua kiểu Sale để tính issues/canCheckout và kiểm tra lại trong checkout; OTC không được đổi loại qua payload. Nháp người khác trả 404 kể cả Admin. Khi checkout tại quầy, chốt giá hiện tại và bắt buộc `cashReceived: true`; hóa đơn ghi Cash. Online dùng subtype theo Order.SaleKind, giá/tên/đơn vị đã chốt trên OrderItem và ManualQR.

Mở QR lần đầu dùng InventoryService.Execute để kiểm tra, giữ tồn/hạn mức và tạo Payment PendingReview trong cùng transaction; lưu bản chụp ngân hàng/ảnh QR. Mở lại không giữ lặp. Thiếu cấu hình hoặc file QR trả PAYMENT_NOT_CONFIGURED. Thay cấu hình không thay Payment đã mở; ảnh cũ vẫn đọc được khi Payment tham chiếu. Ảnh dùng IFileStorage, kiểm tra PNG/JPG qua nội dung/MIME/đuôi và tối đa 5 MB. Không seed ngân hàng/QR thật. Cảnh báo thiếu/thừa theo contract §8.1 thuộc giao diện; API trả đúng số tiền và nội dung chuyển khoản.

Review đủ/thừa tiền ghi Confirmed và Order Preparing, không trừ kho; thiếu tiền trả HTTP 200 với approved:false và ghi Chuyển thiếu, giữ PendingReview. Mã ngân hàng đã xác nhận không dùng lại. Các thao tác mở QR, hủy, review và checkout được khóa + transaction; hai scope/DbContext duyệt cùng Payment chỉ một thành công. Đơn hủy không duyệt được.

Checkout dùng chung Validate đa hình → FEFO → DrugBatch.Deduct → Consume reservation → PrescriptionItem.RecordDispense → Sale Completed → Invoice trong một transaction; lỗi ghi hóa đơn rollback cả kho/hạn mức/reservation/Sale/sequence, Payment Confirmed giữ nguyên. Khi lô hết hạn, phân bổ lại lô còn hạn; thiếu hàng thì dừng, đơn online vẫn Preparing và có note. Fulfill lặp bị chặn. Hóa đơn lưu allocations và giá bất biến; User xem của mình, Staff xem mình lập hoặc đơn mình xử lý, Admin xem tất cả, ngoài phạm vi trả 404.

Không thay đổi schema M4: test xác nhận không có pending model changes ở cả SQLite và PostgreSQL, giữ nguyên các migration. Khóa tồn vẫn dành cho một tiến trình ứng dụng theo kiến trúc; triển khai nhiều instance cần cơ chế khóa liên tiến trình.

```powershell
dotnet build Pharmacy.sln
dotnet test Pharmacy.sln
dotnet test Pharmacy.sln --filter FullyQualifiedName~CheckoutTests
```

| TC | Test method M4 (CheckoutTests) |
|---|---|
| TC-13 | `TC13_OnlinePaymentAndInvoice_KeepOrderPrice_CounterUsesCheckoutPrice` |
| TC-20 | `TC20_TwoUsersOpenQr_OnlyLastAvailableStockIsReserved` |
| TC-35 | `TC35_CancelVersusReview_OneValidTransition_ClosedOrderCannotPayOrReview` |
| TC-38 | `TC38_CounterOtcCheckout_DeductsFefo_CreatesInvoice_AndCannotRepeat`, `TC38_DraftCancelAndCashValidation_DoNotDeductOrCreateInvoice`, `TC38_CheckoutWithPreviouslyLoadedDraft_UsesLatestSavedLines` |
| TC-39 | `TC39_OtcPrescriptionOrControlledDrug_IsBlocked_KindCannotChange` |
| TC-40 | `TC40_PartialPrescriptionDispense_ThenRemaining_CannotExceedQuota`, `TC40_OnlinePrescriptionReservation_ProtectsCounterQuota_ThenDispensesOnFulfill` |
| TC-41 | `TC41_OtherDraftOwner_IsHiddenForGetUpdateCancelAndCheckout` |
| TC-42 | `TC42_OpenQr_ReturnsExpectedAmountOrderContentAndPrivateImage`, `TC42_MissingPaymentConfigurationOrQrFile_DoesNotReserve`, `TC42_PaymentGetAndOpen_HideOtherOwners_RequireExistingPayment`, `TC42_QrUpload_InvalidContentOrOversize_DoesNotChangeConfiguration` |
| TC-43 | `TC43_OpeningQrOrWritingNote_DoesNotConfirmOrDeductStock` |
| TC-44 | `TC44_RepeatedQrOpening_KeepsSnapshotAndReservation_AfterSettingsChange`, `TC44_ConcurrentOpeningWithTwoScopes_CreatesOnePaymentAndReservation` |
| TC-45 | `TC45_StaffAndAdminReviewEnoughMoney_RecordAuditAndPrepareWithoutDeduction`, `TC45_InvalidReviewFields_DoNotWritePaymentOrOrder` |
| TC-46 | `TC46_Underpayment_Returns200PendingAndShortfallNote` |
| TC-47 | `TC47_Overpayment_ConfirmsExpectedTotal_PreservesReceivedAmount` |
| TC-48 | `TC48_ConcurrentReview_WithTwoScopes_OnlyOneConfirmation`, `TC48_ConcurrentFulfillWithTwoScopes_CreatesOneInvoiceAndConsumesOnce` |
| TC-49 | `TC49_DuplicateConfirmedBankReference_IsRejectedWithoutPartialWrite` |
| TC-50 | `TC50_GuestAndUserCannotReviewOrConfigurePayments` |
| TC-51 | `TC51_InvoiceWriteFailure_RollsBackStockQuotaSaleAndReservations_KeepsConfirmedPayment`, `TC51_MultiLineShortage_DoesNotDeductAnyLineOrCompleteDraft` |
| TC-52 | `TC52_ReservedStockExpires_ReallocatesOrStopsWithoutLosingPayment` |
| TC-53 | `TC53_OnlineAndCounterInvoices_KeepAllocationsAndPricesImmutable` |
| TC-54 | `TC54_Invoices_RespectUserStaffCreatorHandlerAndAdminScopes` |
| TC-56 | `TC56_SameCheckoutServiceCall_WithSaleTypedSubtypes_ValidatesPolymorphically` |

Smoke HTTP dùng SQLite/storage/key riêng trong temp: user đặt OTC → mở QR → staff review đủ tiền → fulfill → complete → xem hóa đơn; staff lập nháp OTC tại quầy → checkout → xem hóa đơn. Cả hai luồng pass, API đã tắt và dữ liệu smoke đã xóa. Chưa chạy luồng M4 trên PostgreSQL thật trong lần kiểm chứng này; bộ opt-in PostgreSQL chỉ chạy khi có PHARMACY_TEST_POSTGRES. Báo cáo 132 pass/1 skip ở phần M3.5 phía trên là kết quả lịch sử; PO đã kiểm chứng M3.5 trên Supabase thật.

Kiểm chứng M4: dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 170 pass/0 fail/1 skip (PostgreSQL opt-in). CheckoutTests có 38 trường hợp, 31 method, phủ 21 mã TC yêu cầu. Các test SQLite chạy không cần mạng.
