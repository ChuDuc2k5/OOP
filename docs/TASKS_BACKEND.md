# Backlog Backend — ChatGPT Codex (.NET 10 / C#)

Đọc trước: `docs/SRS_v2.0.md` (bắt buộc mục 2.4, 3, 4, 7, 8, 11), `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/WORKFLOW.md`, class diagram `docs/diagrams/CL-01.png`.
Chỉ sửa trong `backend/` và `Pharmacy.sln`.

---

## M1 — `be/m1-foundation` (Nền tảng + F001–F003)

1. Khung đã có: `Pharmacy.sln` (gốc) + `backend/Pharmacy.Api` (cổng 5000, `/api/health`, OpenAPI). Thêm `backend/Pharmacy.Core` (classlib) và `backend/Pharmacy.Tests` (xUnit) vào `Pharmacy.sln`, tham chiếu đúng chiều. Giữ `/api/health`, `scripts/run-api.mjs`.
2. **Toàn bộ** entity theo SRS 7.4 + class diagram (kể cả entity dùng ở milestone sau) với đóng gói (private set, phương thức nghiệp vụ). `Sale` abstract + `OTCSale`/`PrescriptionSale` (TPH, discriminator `Kind`).
3. `PharmacyDbContext`, cấu hình khóa ngoại, unique/partial index (`ARCHITECTURE.md §6`), concurrency token `Version`. Migration đầu tiên. Auto `Database.Migrate()` lúc khởi động.
4. `IBusinessClock`, `IdGenerator`, `IFileStorage` (lưu `backend/storage/...`, tên file mới, kiểm tra magic bytes PNG/JPEG, ≤ 5 MB), `BusinessException` + middleware ProblemDetails theo contract §1.4 (không lộ stack trace; log lỗi).
5. Auth: cookie, PasswordHasher, antiforgery (`XSRF-TOKEN`/`X-XSRF-TOKEN`), 401/403 trả JSON (không redirect). Policy theo role.
6. `DbSeeder` theo `ARCHITECTURE.md §8` — chỉ seed khi trống (TC-55).
7. Endpoint F001–F003 + `GET /api/auth/csrf`, `/me`.
8. OpenAPI (`/openapi/v1.json`) ở Development (đã có). `backend/README.md`.
9. Test: TC-01..TC-08, TC-55 (khởi động lại không seed đè) — integration bằng `WebApplicationFactory` + SQLite file tạm/in-memory connection.

## M2 — `be/m2-catalog-inventory` (F004–F009)

1. `ProductService` (F004, F005): Guest không có `unitPrice` trong JSON (dùng DTO riêng hoặc `JsonIgnore(WhenWritingNull)`), upload ảnh thuốc.
2. `InventoryService` (F006–F008): `AddBatch`, tính tồn thực tế/còn hạn/giữ/khả dụng (BR-01, BR-02), `Reserve`/`Release`, `AllocateFEFO`/`Deduct` (BR-03) — **logic FEFO nằm trong Drug/DrugBatch** (`Drug.PlanFEFO(quantity, D)`, `DrugBatch.Deduct`).
3. `InventoryReportService` (F009) — chỉ đọc.
4. Endpoint contract §4, §5.
5. Test: TC-09..TC-12, TC-14..TC-19, TC-22, TC-23 (unit domain cho FEFO + biên ngày).

## M3 — `be/m3-prescription-cart-order` (F010–F015)

1. `PrescriptionService` (F010, F011): upload ảnh, tiếp nhận tại quầy, nhập chi tiết, approve/reject/cancel, `ValidateQuota` (BR-06, BR-07 — trừ cả lượng đang giữ cho đơn khác). Approve → tự chuyển Order `WaitingReview` (ARCHITECTURE D4).
2. `CartService` (F012), `OrderService` (F013–F015 trừ fulfill): `PRICE_CHANGED`, chặn OTC thuốc cần đơn, cancel giải phóng giữ trong transaction, luồng trạng thái staff (claim/ship/complete/reject/cancel). `fulfill` để stub trả `409 INVALID_STATE` cho tới M4.
3. Endpoint contract §6, §7.1–7.3, `GET /api/dashboard/summary`.
4. Test: TC-13 (phần đặt hàng), TC-21, TC-24..TC-34, TC-36, TC-37 (phần trạng thái).

## M3.5 — `be/m3b-postgres` (Supabase, ưu tiên sau M3)

1. Thêm provider Npgsql; `Database:Provider` = `Sqlite` (mặc định) | `Postgres`; chuỗi kết nối `ConnectionStrings:Default` từ `.env` (không commit bí mật).
2. Migration tách theo provider (2 migrations assembly hoặc 2 thư mục), auto migrate + seed khi DB trống trên cả hai.
3. Xử lý unique violation độc lập provider (SQLite 2067 / Postgres 23505); partial index tương thích Postgres; `DateOnly`/`DateTimeOffset` map đúng (timestamptz).
4. Test tự động vẫn dùng SQLite; thêm hướng dẫn Supabase (Session pooler, Npgsql connection string, SSL) vào `backend/README.md`.
5. Không seed thông tin ngân hàng/QR thật; Admin cấu hình qua F017.

## M4 — `be/m4-sale-payment-checkout` (F016–F020)

1. `SaleService` (F016): nháp của mình, loại không đổi, `issues`/`canCheckout` từ `Sale.Validate` chạy thử.
2. `ManualPaymentService` (F017, F018): mở QR lần đầu giữ hàng + hạn mức (idempotent, trong khóa + transaction), bản chụp PaymentSetting, review thiếu/đủ/thừa, `DUPLICATE_BANK_REFERENCE`, duyệt đồng thời chỉ 1 thành công.
3. `CheckoutService.Checkout(Sale, ...)` (F019): validate đa hình → FEFO → trừ kho, consume reservation, `RecordDispense`, Sale Completed, Invoice — **một transaction**, lỗi rollback toàn bộ, Payment giữ nguyên. Lô giữ đã hết hạn → phân bổ lại lô hợp lệ.
4. `InvoiceService` (F020) phạm vi theo role.
5. Hoàn thiện `/fulfill`, `/checkout`, contract §7.4, §8.
6. Test: TC-13 (đầy đủ), TC-20, TC-35, TC-38..TC-54, TC-56. Test đồng thời dùng `Task.WhenAll` với 2 scope/DbContext riêng.

## M5 — `be/m5-hardening`

1. Rà toàn bộ 56 TC → bảng kết quả `docs/TEST_REPORT_BE.md` (TC, test method, Pass/Fail).
2. NFR-01: seed lớn tùy chọn (`--seed-large`: 500 thuốc/2.000 lô/1.000 đơn) + đo thời gian 20 lượt các API tra cứu.
3. Rà log không chứa mật khẩu; rà README.
4. (Tùy chọn) provider Postgres cho Supabase qua cấu hình.

---

## Đã làm
- M1 (`be/m1-foundation`, 2026-10-06): thêm Pharmacy.Core/Pharmacy.Tests vào solution; toàn bộ entity theo SRS 7.4/CL-01, Sale TPH và Validate đa hình, collection chỉ đọc, phương thức bảo vệ tồn/đã cấp/trạng thái.
- DbContext + migration InitialFoundation: FK Restrict, unique/partial index, CHECK số lượng/giá/role/trạng thái, Version concurrency token tự tăng trên năm entity yêu cầu. Auto migrate lúc khởi động.
- IBusinessClock theo múi giờ Việt Nam (override chỉ Development/Test), IdGenerator có sequence SQLite atomic/persist, IInventoryLock, IFileStorage kiểm tra magic/MIME/extension/5 MB/path traversal; BusinessException và ProblemDetails tiếng Việt, log lỗi nội bộ, không trả stack trace.
- F001–F003, csrf/me, cookie HttpOnly/SameSite=Lax, policy role, PasswordHasher; 401/403 JSON; đăng ký bỏ qua trường ngoài DTO và không tự login; token được cấp lại sau login/logout.
- Seed chỉ khi domain DB trống; không sửa DB có dữ liệu một phần. Bốn account demo, 12 thuốc, các biên hạn/tồn, ba đơn thuốc, cấu hình ngân hàng và QR demo từ resource nguồn. DB/storage/key runtime được ignore.
- TC-01..TC-08, TC-55 có integration test WebApplicationFactory + SQLite file tạm/clock giả. TC-06/55 dùng fixture domain gồm giỏ/đơn/nháp/kho/đã cấp/giữ/thanh toán/phân bổ/hóa đơn; TC-55 restart host trên cùng DB với ngày khác và kiểm tra QR không bị ghi đè. Thêm test nền tảng cho ràng buộc, concurrency, cấp mã đồng thời, file storage và lỗi.
- Kiểm chứng: `dotnet build Pharmacy.sln` 0 warning/0 error; `dotnet test Pharmacy.sln` 43 pass/0 fail. Smoke HTTP: health 200, csrf 204, register 201, login/me 200, logout 204 và me sau logout 401, demo Admin/accounts/OpenAPI 200; đã tắt API.
- Cách chạy, cấu hình, demo account và bảng TC ↔ tên test có trong `backend/README.md`. PO đã commit code M1 trên `be/m1-foundation`; phần sửa review do PO commit. Không push/merge/đổi nhánh.
- Sửa review M1: khôi phục tiếng Việt và lưu UTF-8; tách câu lệnh, khối điều khiển và constructor dài để dễ đọc; seed có mô tả/đơn vị thực tế cho từng thuốc và Vitamin C đang bán nhưng tồn bằng 0. Bổ sung kiểm tra các dữ liệu seed này vào test hiện có.

- M2 (`be/m2-catalog-inventory`, 2026-10-06): hoàn thành F004–F009 với ProductService, InventoryService, InventoryReportService và controller mỏng theo contract §4–§5. Guest không có thuộc tính unitPrice, chỉ thấy thuốc đang bán; tìm mã/tên không phân biệt hoa thường cả tiếng Việt, inStock theo tồn khả dụng. Admin tạo/sửa/tắt bán, upload ảnh qua IFileStorage; ảnh đọc qua endpoint riêng.
- Nhập lô kiểm tra expiryDate > D, số lượng nguyên dương, tuple thuốc/số lô duy nhất và lỗi 409 DUPLICATE. Tồn thực tế/còn hạn/giữ/khả dụng theo BR-02; lô sắp hạn rồi số lô. Báo cáo chỉ đọc, tồn thấp gồm bằng ngưỡng/bằng 0, gần hết hạn đúng biên 0 < daysRemaining ≤ days.
- API nội bộ Reserve/Release/AllocateFEFO/Deduct dùng IInventoryLock và transaction, FEFO nằm ở Drug.PlanFEFO/DrugBatch.Deduct. Giữ hàng idempotent và bảo vệ hạn mức đơn thuốc; trừ kho bảo vệ reservation đơn khác, consume của chính đơn; Execute cho phép workflow M3–M4 lưu thay đổi trong cùng transaction và rollback toàn bộ khi lỗi. Test đồng thời với hai scope riêng kiểm tra không giữ/trừ vượt tồn, kể cả context đã tải dữ liệu cũ.
- M2 có test TC-09..TC-12, TC-14..TC-19, TC-22, TC-23 và unit domain FEFO/biên D, D+1, D+30, D+31. README đã cập nhật endpoint, API nội bộ, cách chạy và bảng TC ↔ tên test. Không thay đổi schema/migration M1.
- Kiểm chứng M2: `dotnet build Pharmacy.sln` 0 warning/0 error; `dotnet test Pharmacy.sln` 84 pass/0 fail/0 skip. Smoke HTTP tất cả endpoint M2: sản phẩm Guest/người đăng nhập, Admin tạo/sửa/tắt bán/ảnh, nhập lô và lỗi trùng/hạn dùng, kho, báo cáo, phân quyền Guest/User/Staff. API đã tắt, DB/storage/key smoke trong temp đã xóa. Không git add/commit/push/merge/đổi nhánh.

- M3 (`be/m3-prescription-cart-order`, 2026-10-06) đã hoàn thành trong worktree, chưa git add/commit: PrescriptionService, CartService, OrderService, DashboardService và controller mỏng theo contract §6, §7.1–7.3, §9. Ảnh đơn thuốc private theo chủ/Staff/Admin; tiếp nhận, gộp dòng, approve/reject/cancel, BR-06/BR-07 và chuyển Order WaitingReview liên kết theo D4.
- Giỏ chỉ role User, cộng dồn và issue theo tồn khả dụng, không giữ kho. Đặt hàng kiểm tra expectedTotal/PRICE_CHANGED, OTC cần đơn, chủ/hiệu lực/hạn mức đơn thuốc; giá dòng được chốt trên server và xóa giỏ trong transaction. Hủy/từ chối đơn dùng InventoryService.Execute để Release hàng/hạn mức và đóng Payment PendingReview atomically; staff claim/ship/complete theo trạng thái, không xuất kho lặp. Fulfill là stub 409 INVALID_STATE theo phạm vi M3.
- Migration PrescriptionCreatedAt tạo bằng dotnet ef, giữ dữ liệu DB M1; thời điểm tạo cũ chưa được lưu dùng UnixEpoch, bản ghi mới/seed dùng IBusinessClock.Now. Có test nâng cấp DB M1 và không seed đè.
- Kiểm chứng M3: build 0 warning/0 error, toàn bộ 120 test pass/0 fail/0 skip (36 trường hợp M3); TC-13 phần giá chốt, TC-21, TC-24..TC-34, TC-36/37 phần trạng thái. Có test lỗi đóng Payment rollback cả Order/reservation/Payment, hai scope giữ hạn mức cuối, đặt cùng giỏ đồng thời, ảnh sai loại/quá lớn và quyền dữ liệu. README có bảng TC ↔ tên test đầy đủ.
- Smoke HTTP tất cả route M3 pass; ship/complete/fulfill chặn khi chưa thanh toán/xuất, luồng thành công ship/complete kiểm chứng bằng fixture domain trong integration test. API đã tắt và DB/storage/key smoke tạm đã xóa. Không git add/commit/push/merge/đổi nhánh.

- M3.5 (`be/m3b-postgres`, 2026-10-06): thêm Npgsql.EntityFrameworkCore.PostgreSQL 10.0.2, chọn Sqlite/Postgres qua cấu hình hoặc .env. API nạp backend/Pharmacy.Api/.env khi chạy npm run dev:api; môi trường/command line ưu tiên hơn .env. Template không chứa bí mật; README có hướng dẫn Session pooler/Npgsql/SSL và cách chuyển về SQLite.
- PostgreSQL dùng PostgresPharmacyDbContext và bộ migration/snapshot riêng trong Data/Migrations/Postgres; giữ nguyên hai migration SQLite và snapshot hiện có, không có pending model changes ở cả hai. Auto migrate/seed dùng chung, seed chỉ khi DB domain trống, ảnh local và ngân hàng/QR demo. Schema pharmacy riêng cho dữ liệu và migration history; factory design-time ở Core sinh script không khởi động API hoặc đọc connection string thật.
- CHECK tương thích PostgreSQL (quoted identifiers, boolean, regex username, numeric/trunc), unique/partial index và Version concurrency token. DateOnly map date, DateTimeOffset map timestamptz qua UTC converter. IdGenerator dùng INSERT ON CONFLICT RETURNING atomic có transaction trên hai provider. Helper độc lập provider xử lý SQLite 2067/1555 và Postgres 23505. Đọc tồn/giỏ/dashboard dùng RepeatableRead trên PostgreSQL.
- Kiểm chứng M3.5: build 0 warning/0 error; test 132 pass/0 fail/1 skip. Test SQLite không cần mạng; thêm test model/migration/SQL/UTC/error helper/DI/.env và smoke opt-in PHARMACY_TEST_POSTGRES (thiếu biến thì skip). Script idempotent PostgreSQL đã sinh bằng dotnet ef trong Data/Migrations/Postgres/InitialPostgres.sql; chưa có PostgreSQL thật để kiểm chứng SSL, migration/seed và thao tác runtime trên Supabase. Lần kiểm chứng dùng RestoreSources cache local do TLS NuGet của máy lỗi; không sửa nguồn repository. Không git add/commit/push/merge/đổi nhánh.

- M4 (`be/m4-sale-payment-checkout`, 2026-10-06): hoàn thành F016–F020 theo contract §7.3–§8. SaleService quản lý nháp Counter của mình, không đổi loại; Sale.Validate đa hình tính issues/canCheckout. ManualPaymentService mở QR idempotent, giữ hàng/hạn mức cùng transaction và chụp PaymentSetting; review đủ/thừa/thiếu, note, mã ngân hàng duy nhất, phân quyền cấu hình/ảnh QR.
- CheckoutService dùng chung Validate qua Sale → FEFO → trừ kho → Consume reservation → RecordDispense → Sale Completed → Invoice trong InventoryService.Execute; lỗi rollback toàn bộ, giữ Payment Confirmed. Online lấy giá OrderItem, tại quầy chốt giá hiện tại/Cash; phân bổ lại khi lô hết hạn, chặn fulfill/checkout lặp. InvoiceService trả allocations bất biến và phạm vi User/Staff/Admin. Controller mỏng; giữ nguyên dòng nạp .env, không merge main.
- M4 có test TC-13 đầy đủ, TC-20, TC-35, TC-38..TC-54, TC-56; đồng thời mở QR/review/fulfill dùng hai scope/DbContext riêng. Có rollback do trigger lỗi Invoice, bảo vệ quota đang giữ, nháp tải cũ, QR sai nội dung/quá 5 MB/thiếu cấu hình, quyền chủ nháp và hóa đơn. README có bảng TC ↔ test, endpoint và giới hạn một tiến trình của khóa. Không thay schema; kiểm tra model/migration của cả hai provider trong bộ test.
- Smoke HTTP M4 pass: user đặt OTC → mở QR → staff duyệt đủ tiền → fulfill → complete → xem hóa đơn; bán OTC tại quầy → checkout → hóa đơn. API đã tắt và dữ liệu SQLite/storage/key smoke temp đã xóa. Chưa smoke M4 trên PostgreSQL thật; M3.5 đã được PO kiểm chứng Supabase theo review. Không git add/commit/push/merge/đổi nhánh.

- Kiểm chứng M4 cuối cùng: dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 170 pass/0 fail/1 skip (smoke PostgreSQL opt-in). CheckoutTests có 38 trường hợp qua 31 method, phủ đủ 21 mã TC của M4. Không còn chức năng M4 để stub.

- M5 (`be/m5-hardening`, 2026-10-06): chuyển kiểm tra chủ đơn online và ApplyCompletionEffects/RecordDispense về PrescriptionSale; CheckoutService/SaleEvaluation gọi qua Sale, bỏ phân nhánh Kind ngoài factory. TC-56 và regression M4 xanh, model/migration cả hai provider không đổi.
- Báo cáo docs/TEST_REPORT_BE.md đối chiếu TRX cho đủ 56 TC backend: 56 Pass/0 Fail, nêu rõ phần giao diện không áp dụng backend. Chạy 2026-10-06 13:34:22–13:35:05 +07:00: build 0 warning/0 error; suite 175 pass/0 fail/1 skip PostgreSQL opt-in.
- NFR-01: test tải opt-in PHARMACY_TEST_PERFORMANCE tạo SQLite temp riêng, 500 thuốc/2.000 lô/1.000 đơn, đo 20 GET mỗi endpoint, p95 products/cart/orders mine/staff orders/inventory = 23,29/22,44/9,72/14,19/43,73 ms; 100/100 dưới 2 giây. TestServer gồm đọc body, không gồm TCP/trình duyệt/Supabase; không sửa InventoryReader vì đạt ngưỡng. Seed từ chối DB đã có dữ liệu, cleanup DB/storage, số đo xuất JSON temp.
- NFR-02/08: log chỉ loại exception + trace ID, không log nội dung exception/inner exception hoặc provider EF chứa dữ liệu; test login sai và lỗi DB chứa bí mật giả chứng minh log/500 không lộ mật khẩu/connection/stack trace và rollback. README bổ sung SDK/Node, restore/chạy SQLite, cấu hình Supabase .env/appsettings.Local.json, lưu ý npm nâng .env thành biến môi trường, test opt-in/tài khoản demo/giới hạn đo. Không git add/commit/push/merge/đổi nhánh.

- Smoke HTTP hồi quy M5 pass hai luồng online OTC và tại quầy trên cổng tạm riêng với DB/storage/key temp; API smoke đã tắt, dữ liệu temp đã xóa, không dừng ứng dụng khác. Không phát sinh thay đổi contract.

## Câu hỏi cho PO
- M3.5 không đổi API contract. Phạm vi IInventoryLock vẫn một tiến trình ứng dụng; dùng schema pharmacy không exposed qua Supabase Data API. Chưa có connection PostgreSQL để chạy smoke thật; cần chạy nhóm opt-in trên DB test riêng trước demo Supabase.
- M3: DB M1 không có thời điểm tạo đơn thuốc. Migration giữ bản ghi cũ và dùng CreatedAt = UnixEpoch làm giá trị chưa biết; bản ghi mới lưu thời điểm thật. Không đổi API contract; README đã nêu giới hạn dữ liệu cũ.
- M2 không phát sinh câu hỏi mới; giữ URL/DTO/mã lỗi theo API contract §4–§5, không thêm endpoint xóa thuốc hoặc endpoint reserve/release/checkout.
- **Đã trả lời:** PO chốt DB ở `backend/data`, dùng `Data Source=../data/pharmacy.db`; giữ nguyên cấu hình hiện tại.
- **Đã trả lời:** PO chấp nhận cookie secret `pharmacy.antiforgery` HttpOnly, đi cùng request token `XSRF-TOKEN` JS-readable/header theo contract.
- **Đã trả lời:** PO chấp nhận giới hạn 9.999 mã/prefix/ngày; giữ sequence bền vững và trả `409 INVALID_STATE` khi hết dải.
