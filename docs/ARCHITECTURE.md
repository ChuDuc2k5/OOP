# Kiến trúc & quyết định kỹ thuật (PO/PM chốt)

> Nguồn yêu cầu: [SRS_v2.0.md](SRS_v2.0.md) (bản gốc: `SRS_OOP.docx`). Hợp đồng API: [API_CONTRACT.md](API_CONTRACT.md).
> Mọi thay đổi so với tài liệu này phải được PO duyệt trước (ghi vào mục "Nhật ký quyết định").

## 1. Tổng quan

```
Browser (Edge/Chrome)
   │  http://localhost:3000   (Next.js – frontend/)
   │      └─ rewrites /api/*  ──►  http://localhost:5000/api/*  (ASP.NET Core Web API – backend/)
   │                                    └─ EF Core ──► SQLite file backend/data/pharmacy.db
   │                                    └─ File storage ──► backend/storage/{drugs,prescriptions,qr}
```

- Frontend gọi **cùng origin** `/api/...`; Next.js `rewrites` proxy sang backend ⇒ cookie xác thực là first-party, không cần CORS.
- Backend là **Web API thuần** (không MVC View). Mọi kiểm tra quyền/chủ sở hữu ở server.

## 2. Công nghệ

| Phần | Lựa chọn |
|---|---|
| Backend | .NET 10, ASP.NET Core Web API, EF Core 10, xUnit |
| DB | **SQLite** (mặc định, đúng NFR-04/06). Provider tách qua cấu hình `Database:Provider` = `Sqlite` \| `Postgres` để có thể trỏ Supabase (SRS 2.2) khi demo — không bắt buộc |
| Auth | Cookie authentication (`pharmacy.auth`, HttpOnly, SameSite=Lax) + `PasswordHasher<UserAccount>` |
| Anti-forgery | ASP.NET Antiforgery: cookie `XSRF-TOKEN` (đọc được bằng JS) + header `X-XSRF-TOKEN` cho mọi request POST/PUT/PATCH/DELETE |
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS. Được dùng shadcn/ui. Không dùng thư viện state nặng; TanStack Query được phép |
| Ngôn ngữ UI | Tiếng Việt; tiền VND dạng `120.000 ₫`; ngày `dd/MM/yyyy` |

## 3. Cấu trúc thư mục repo

```
/
├─ Pharmacy.sln                   # solution ở thư mục gốc (đã có từ khung khởi tạo)
├─ package.json, scripts/         # npm run dev = API + web (concurrently)
├─ backend/
│  ├─ Pharmacy.Core/              # Domain + Services + Data (OOP nằm ở đây)
│  │   ├─ Domain/                 # UserAccount, Drug, DrugBatch, Prescription, PrescriptionItem, CartItem,
│  │   │                          # Order, OrderItem, Payment, PaymentSetting, StockReservation,
│  │   │                          # Sale (abstract), OTCSale, PrescriptionSale, SaleItem, BatchAllocation, Invoice, enums
│  │   ├─ Services/               # AccountService, ProductService, InventoryService, InventoryReportService,
│  │   │                          # PrescriptionService, CartService, OrderService, SaleService,
│  │   │                          # ManualPaymentService, CheckoutService, InvoiceService
│  │   ├─ Common/                 # BusinessException(code,...), IBusinessClock, IdGenerator, IFileStorage
│  │   └─ Data/                   # PharmacyDbContext, configurations, migrations, DbSeeder
│  ├─ Pharmacy.Api/               # Program.cs, Controllers (mỏng), DTOs, ProblemDetails mapping, auth setup
│  └─ Pharmacy.Tests/             # xUnit: unit (domain/service) + integration (WebApplicationFactory + SQLite)
├─ frontend/                      # Next.js app (khung ban đầu là Vite → chuyển sang Next.js ở fe/m1)
├─ docs/                          # SRS, kiến trúc, API, task, review
└─ README.md
```

Tên lớp/phương thức theo Class Diagram `docs/diagrams/CL-01.png` (SRS 11.2). Được thêm lớp phụ, **không** đổi tên các lớp chính.

## 4. Quy tắc OOP bắt buộc (NFR-07, OOP-01..03)

1. `Sale` là **abstract** với `abstract ValidationResult Validate(SaleContext ctx)`; `OTCSale`, `PrescriptionSale` override. `CheckoutService.Checkout(Sale sale, ...)` chỉ gọi qua kiểu `Sale` (không `if (sale is OTCSale)`).
2. `DrugBatch.Quantity` có `private set`; chỉ đổi qua `Deduct(int quantity, DateOnly businessDate)`.
   `PrescriptionItem.DispensedQuantity` `private set`, đổi qua `RecordDispense(int)`. `StockReservation` đổi trạng thái qua `Consume()` / `Release()`.
   Collection navigation public dạng `IReadOnlyCollection<T>`.
3. Controller **không** chứa nghiệp vụ, không sửa trực tiếp tồn/hạn mức. `InventoryReportService` chỉ đọc. `ManualPaymentService` không xuất kho.
4. Lỗi nghiệp vụ ném `BusinessException(code, message, field?)` → middleware map thành ProblemDetails (xem API_CONTRACT §1.4).

## 5. Ngày nghiệp vụ D

- Interface `IBusinessClock { DateOnly Today { get; } DateTimeOffset Now { get; } }`.
- Mặc định: ngày hiện tại theo múi giờ `SE Asia Standard Time` / `Asia/Ho_Chi_Minh`.
- Cấu hình `BusinessDate:Override` (yyyy-MM-dd) chỉ dùng ở Development/Test. Test truyền clock giả.
- Hết hạn: `ExpiryDate <= D` (BR-01).

## 6. Nhất quán & đồng thời (NFR-03)

- Mọi thao tác giữ hàng (mở QR), hủy đơn, duyệt thanh toán, checkout chạy trong **một transaction** EF.
- Thêm `IInventoryLock` (singleton `SemaphoreSlim(1,1)`) bao các đoạn: reserve, release, checkout — vì SQLite và app chạy một tiến trình. Kiểm tra lại số liệu **bên trong** khóa.
- Cột `Version` (int, concurrency token) trên `Order`, `Payment`, `Sale`, `DrugBatch`, `PrescriptionItem`; xung đột ⇒ 409 `CONCURRENCY_CONFLICT`.
- Ràng buộc unique: `NormalizedUsername`; `(DrugId, BatchNumber)`; `Order.OrderId`; `Payment.OrderId`; `Payment.BankReference` (partial index khi `Status = Confirmed`); `Invoice.SaleId`; `Sale.OrderId` (partial, khi `Status = Completed`); `(UserId, DrugId)` của CartItem; StockReservation active duy nhất theo `(OrderId, DrugId)` (partial khi `Status = Active`).

## 7. Mã định danh

Do server sinh, dạng chuỗi dễ đọc, unique:
- User `U` + 8 ký tự; Drug: Admin nhập (vd `PARA500`); Batch `B` + 8 ký tự
- Order `DH{yyMMdd}{4 số}`; Prescription online `DT{yyMMdd}{4 số}` (tại quầy: Staff nhập mã đơn giấy)
- Sale `BH{yyMMdd}{4 số}`; Invoice `HD{yyMMdd}{4 số}`; Payment `TT{yyMMdd}{4 số}`

## 8. Seed dữ liệu (chỉ khi DB trống — không ghi đè)

- Tài khoản demo: `admin` / `Admin@12345` (Admin), `staff` / `Staff@12345` (Staff), `user` / `User@12345` (User), `user2` / `User@12345` (User). Mật khẩu hash lúc seed.
- ≥ 12 thuốc: OTC, RequiresPrescription, IsControlled, 1 thuốc `IsForSale=false`.
- Nhiều lô/thuốc: có lô hết hạn (D−5), lô hết hạn đúng D, lô D+1, lô D+20, lô D+30, D+31; có thuốc tồn = ngưỡng, tồn = 0.
- 1 đơn thuốc Approved còn hiệu lực cho `user`, 1 đơn hết hiệu lực, 1 đơn PendingReview.
- PaymentSetting demo: ngân hàng "Ngân hàng Demo", STK `0000000000`, chủ TK `NHA THUOC DEMO`, ảnh QR mẫu `storage/qr/demo-qr.png` (không dùng thông tin thật).

## 9. Cổng & biến môi trường

| Biến | Giá trị mặc định |
|---|---|
| Backend URL | `http://localhost:5000` (`launchSettings.json`, profile `http`) |
| Frontend URL | `http://localhost:3000` |
| `frontend/.env.local` | `BACKEND_URL=http://localhost:5000` |
| `ConnectionStrings:Default` | `Data Source=data/pharmacy.db` (tương đối với `backend/Pharmacy.Api`) |
| Health | `GET /api/health` (giữ endpoint có sẵn) |

## 10. Nhật ký quyết định

| # | Ngày | Quyết định | Lý do |
|---|---|---|---|
| D1 | 2026-10-06 | SQLite là DB mặc định; Supabase/Postgres là tùy chọn qua provider | SRS 2.2 ghi Supabase nhưng NFR-04/06, 6.3, 7 đều ghi SQLite; test & chạy local cần SQLite |
| D2 | 2026-10-06 | BE là Web API, FE Next.js gọi qua rewrites cùng origin | SRS 2.2 (FE React/Next, BE API); kế hoạch tuần 1 ghi "MVC" là lỗi cũ |
| D3 | 2026-10-06 | Xác nhận giá mới khi đặt hàng bằng `expectedTotal` + lỗi 409 `PRICE_CHANGED` | FR-013 yêu cầu hiển thị giá mới và khách xác nhận |
| D5 | 2026-10-06 | Merge khung `chuduc`: giữ .NET + script npm; **bỏ NestJS gateway**; frontend chuyển Vite → Next.js | SRS 2.2 và yêu cầu nhóm là Next.js; Next rewrites đã làm vai trò gateway, cookie auth không cần CORS; gateway không có trong SRS và không ai phụ trách |
| D4 | 2026-10-06 | Đơn theo đơn thuốc ở `WaitingReview` tự chuyển `AwaitingPayment` khi đơn thuốc được Approve và đủ hạn mức | FR-013/FR-015/UC-03 |
