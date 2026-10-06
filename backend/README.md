# Backend — Pharmacy Management System

.NET 10 / ASP.NET Core Web API / EF Core 10 / SQLite / xUnit. M1 gồm toàn bộ mô hình dữ liệu và F001–F003; M2 hoàn thành danh mục sản phẩm, nhập lô, tồn kho và báo cáo F004–F009. Đơn thuốc, giỏ, đơn hàng, thanh toán và checkout thuộc M3–M4.

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
| `Database:Provider` | `Sqlite` (Postgres chưa triển khai) |
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

Kiểm thử dùng `WebApplicationFactory` + SQLite file riêng trong temp, clock giả D=2026-10-06 và storage riêng; không dùng EF InMemory. TC-06/55 tạo dữ liệu trực tiếp qua domain vì API nghiệp vụ M2–M4 chưa có. TC-55 đóng host rồi tạo host mới trên cùng DB, đổi D và so sánh toàn bộ bảng domain, bao gồm giá, tồn, đã cấp, reservation, payment, allocation, invoice và QR.

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

Test bổ sung: token thiếu/sai/cũ và tự cấp mới, OpenAPI/health, seed trống/một phần, đóng gói/đa hình, magic bytes/MIME/extension/size/path traversal, unique/partial index/FK/CHECK, concurrency token, cấp mã đồng thời/persist, ProblemDetails không lộ stack trace. Chưa tuyên bố TC-56 checkout pass: test đa hình ở M1 chỉ kiểm tra `Sale.Validate`; CheckoutService thuộc M4.

```powershell
dotnet test Pharmacy.sln --filter "FullyQualifiedName~TC55"
dotnet test Pharmacy.sln --filter "FullyQualifiedName~AuthTests"
```

Migration đầu tiên được commit cùng snapshot. Nếu cần tạo migration tiếp theo, cài `dotnet-ef` 10.0.11 rồi chạy:

```powershell
dotnet ef migrations add TenMigration --project backend/Pharmacy.Core --startup-project backend/Pharmacy.Api --output-dir Data/Migrations
```

Mã giao dịch dùng sequence SQLite atomic theo prefix/ngày, tồn tại qua restart, tối đa 9.999 mã/prefix/ngày; hết dải trả `INVALID_STATE`, không sinh mã sai định dạng. Mô hình một tiến trình SQLite là phạm vi đã chốt.

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
