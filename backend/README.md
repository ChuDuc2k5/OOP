# Backend — Pharmacy Management System

.NET 10 / ASP.NET Core Web API / EF Core 10 / SQLite / xUnit. M1 gồm toàn bộ mô hình dữ liệu và F001–F003; các API sản phẩm, kho, đơn thuốc, giỏ, đơn hàng, thanh toán và checkout được triển khai ở M2–M4.

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

FE gọi cùng origin qua Next.js rewrites, `credentials: "include"`; không cần CORS. Không có redirect HTML khi bị chặn: 401/403 trả ProblemDetails JSON. Lỗi theo contract có `status`, `code`, `title` tiếng Việt và `errors` camelCase khi cần. Không phục vụ storage bằng static files; các endpoint ảnh có kiểm tra quyền sẽ được làm ở milestone tương ứng.

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

Mã giao dịch dùng sequence SQLite atomic theo prefix/ngày, tồn tại qua restart, tối đa 9.999 mã/prefix/ngày; hết dải trả `INVALID_STATE`, không sinh mã sai định dạng. Các quy trình reserve/release/checkout sẽ dùng singleton `IInventoryLock` và transaction trong M2–M4; mô hình một tiến trình SQLite là phạm vi đã chốt.
