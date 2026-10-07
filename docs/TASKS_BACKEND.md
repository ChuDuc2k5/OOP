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

- M6 (`be/m6-demo-catalog`, 2026-10-06): nhúng catalog.json và wildcard 56 PNG vào Core. DbSeeder giữ nguyên 12 thuốc/lô cũ, chỉ gắn ảnh; thêm đúng 44 thuốc catalog đang bán, 103 lô tất định và ảnh. 6 thuốc có lô gần hết hạn; 4 thuốc có lượng nhập 20–200 và tồn còn lại thấp qua DrugBatch.Deduct để đạt ngưỡng catalog 5–30.
- Lệnh --seed-demo-catalog dùng cấu hình provider/storage hiện có, migrate và nạp thêm DrugId chưa có cùng lô; chỉ gắn ảnh còn thiếu, không sửa thuốc/lô/đơn/hóa đơn/tài khoản đã tồn tại, không ghi đè file ảnh. Chạy xong in số thuốc/lô/ảnh/file mới bằng UTF-8 và thoát không mở server. Thay đổi DB dùng transaction; file copy tạm rồi đổi tên không ghi đè. Không đổi schema/migration.
- Thêm 4 DemoCatalogTests: đủ 56 thuốc/ảnh và thuộc tính catalog/lô legacy; bảo toàn bảng nghiệp vụ và ảnh/thuốc đã sửa; import idempotent kể cả đổi ngày; process CLI thoát và báo 0 lần hai; dữ liệu tất định cùng báo cáo tồn thấp/gần hạn. Điều chỉnh test tổng 12/11 thành 56/55, giữ kiểm tra đơn vị legacy; bổ sung seed catalog idempotent trong smoke PostgreSQL opt-in. README có lệnh, số đếm, lưu ý DB/files và bảng test.
- Kiểm chứng M6: build cuối 0 warning/0 error. Suite trước bước chuẩn hóa BatchId mới sang B + 8 ký tự đạt 179 pass/0 fail/1 skip PostgreSQL (bật performance opt-in); suite sau bước đó bị Windows Application Control chặn Pharmacy.Tests.dll với 0x800711C7, retry bản build không đổi vẫn bị chặn, chưa chốt DoD test của mã cuối. Không thay/tắt cơ chế bảo vệ máy.
- Smoke đúng lệnh dotnet run --project backend/Pharmacy.Api --launch-profile http --no-build -- --seed-demo-catalog trên SQLite temp pass: thêm thuốc thiếu, giữ giá/trạng thái/ảnh custom, chạy lại 0, exit 0 không server. DB/storage/key temp đã xóa. Chưa kiểm chứng catalog M6 trên PostgreSQL thật do thiếu PHARMACY_TEST_POSTGRES. Không git add/commit/push/merge/đổi nhánh.

- M7 (`be/m7-stock-guard`, 2026-10-06): theo D9, POST thêm/cộng dồn và PUT tăng số lượng kiểm tra lượng mới của dòng với tồn khả dụng trong InventoryService.Execute trước khi ghi giỏ. Thiếu hàng trả 409 INSUFFICIENT_STOCK với title tiếng Việt theo số lượng/đơn vị; không đổi giỏ hoặc giữ hàng. PUT giảm/giữ nguyên và DELETE vẫn được phép khi hết hàng; GET giỏ giữ issue cho dòng cũ, sản phẩm hết hàng vẫn hiển thị với inStock=false. Không sửa docs/API_CONTRACT.md §7.1; PO sẽ cập nhật contract theo D9.
- Rà D8: ManualPaymentService.Review, CheckoutService.Fulfill, OrderService.StaffAction và Cancel đã tự gọi Order.Claim, chỉ gán HandledBy khi chưa có, không yêu cầu endpoint claim trước. Test HTTP TC37_D8_ReviewFulfillAndComplete_WithoutClaim_PreservesFirstHandler chạy Pickup và Delivery từ mở thanh toán → review approved → fulfill → complete (Delivery có ship), kiểm tra review chưa trừ kho, fulfill trừ đúng một lần và staff khác không ghi đè người xử lý đầu. Test trạng thái TC37 hiện có thêm kiểm tra ship/complete tự gán khi HandledBy chưa có; reject/cancel vẫn kiểm tra tự gán.
- Test D9: TC29_D9_CartStockGuard_RejectsWithoutWriting (6 trường hợp thêm/cộng dồn/tăng dòng, hết/thiếu hàng, snapshot DB không đổi); TC29_D9_OutOfStockOldLine_CanDecreaseKeepOrDelete_StillShowsIssue; TC29_D9_CartStockGuard_UsesAvailableAfterReservations_AllowsExactBoundary. TC31 tạo fixture dòng giỏ cũ trực tiếp để tiếp tục kiểm tra issue/đặt hàng bị chặn sau D9. Không đổi schema/migration, không git add/commit/đổi nhánh.

- Kiểm chứng M7: dotnet build Pharmacy.sln cuối 0 warning/0 error. Lượt test đầu (5 trường hợp guard và trước bổ sung assert ship/complete tự gán) đạt 187 pass/0 fail/2 skip (PostgreSQL/performance opt-in). Sau bổ sung trường hợp POST cộng dồn khi hết hàng và kiểm tra ship/complete từ HandledBy null, dotnet test Pharmacy.sln bị Windows Application Control chặn Pharmacy.Tests.dll, FileLoadException 0x800711C7 trước discovery; retry --no-build --no-restore cùng binary vẫn bị chặn. Mã cuối đã build thành công nhưng cần PO chạy lại toàn bộ test ở worktree khác; không thay/tắt bảo vệ máy.

- M8 (`be/m8-register-login`, 2026-10-06): theo D10 và contract §3, đăng ký User thành công tự đăng nhập, vẫn trả 201 Me và cấp lại XSRF-TOKEN theo principal mới. Register/Login dùng chung helper cấp cookie; validate/trùng tên không cấp phiên đăng nhập, role gửi lên vẫn bị bỏ qua. Không đổi schema hoặc contract.
- Cập nhật TC-01..TC-03 cho đăng nhập tự động: /me trả 200 ngay, logout trước khi thử login/validation tiếp; đăng ký lỗi vẫn Guest, role Admin/Staff không nâng quyền. Thêm TC01_Register_AutomaticallySignsIn_AndIssuesUsableUserCsrfToken kiểm tra cookie như login, token Guest cũ bị từ chối, token mới logout được và đăng ký tiếp khi đã login trả 403. README cập nhật bảng TC-01. Không git add/commit/đổi nhánh.

- Kiểm chứng M8: dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 189 pass/0 fail/2 skip (PostgreSQL và performance opt-in chưa bật). Windows Application Control không chặn binary trong lượt này.

- M9 (`be/m9-presentation-data`, 2026-10-06): áp dụng D11, 12 thuốc nền dùng mã có nghĩa và tên từ legacyImages.name; HYDRO1 giữ tắt bán với mô tả ngừng kinh doanh. Giữ nguyên giá/ngưỡng/cờ/đơn vị/lô/biên ngày. Tài khoản admin/staff/chuduc/nguyenvana dùng U0000001..U0000004; đơn thuốc thuộc chuduc, bệnh nhân Chu Đức/BN001 và người kê BS. Nguyễn Văn Minh cho các đơn đã có chi tiết.
- Seed không tạo PaymentSetting hoặc QR; Admin cấu hình qua F017, chưa cấu hình trả PAYMENT_NOT_CONFIGURED. Xóa resource QR cũ; test ảnh dùng PNG thuốc có sẵn, PaymentFixture tạo cấu hình/ảnh kiểm thử riêng khi cần. Test TC42 mới kiểm tra DB mới không có QR, mở thanh toán không ghi Payment/reservation hay đổi đơn. CatalogSeedTests kiểm tra đủ 56 ảnh/thuốc, tên mới và mọi thuộc tính/lô nền giữ nguyên.
- Đổi class/file thành CatalogSeeder và CatalogSeedTests, lệnh --seed-catalog; giữ alias cũ chỉ trong Program.cs, không giới thiệu trong README. Catalog chỉ giữ dữ liệu thuốc/ảnh đang dùng, bỏ bảng ánh xạ mã cũ không còn được đọc sau khi áp dụng tên mới. Rà chuỗi nguồn backend chỉ còn alias tương thích; cập nhật README/tài khoản, hướng dẫn cấu hình QR và TEST_REPORT_BE.md. Không đổi schema/migration, không sửa dữ liệu DB đang có, không git add/commit/đổi nhánh.

- Kiểm chứng M9 lúc 17:23 +07:00 ngày 2026-10-06: dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 190 pass/0 fail/2 skip (PostgreSQL/performance opt-in). Rà *.cs/*.md/*.json backend ngoài bin/obj chỉ còn alias lệnh cũ trong Program.cs. Windows không chặn binary trong lượt này.

- M10 (`be/m10-linked-orders`, 2026-10-06): theo D12 và contract §6, PrescriptionView thêm linkedOrders {orderId, status, items[{drugId, drugName, unit, quantity}]}. Staff/Admin nhận mọi đơn liên kết đúng PrescriptionId, mọi trạng thái, sắp createdAt tăng dần rồi OrderId; dòng thuốc lấy bản chụp OrderItem, không dùng tên/đơn vị/giá hiện tại. User nhận [] ở Get/Upload/Usable và không truy vấn đơn liên kết. Counter/Details/Review trả qua mapper chung có linkedOrders; controller giữ mỏng. Không thay schema/migration/contract.
- Test TC25_D12_LinkedOrders_StaffSeesSnapshotsAllStatusesInCreatedOrder_UserSeesEmpty có hai trường hợp Staff/Admin: WaitingReview đúng hai dòng/số lượng, tên/đơn vị bản chụp dù thuốc đã sửa, không lộ giá/trường thừa, có đơn Cancelled trước đó theo createdAt, loại đơn của đơn thuốc khác; User Get/Usable nhận []; Details/Reject trả liên kết và trạng thái mới. TC24_D12_CounterPrescriptionWithoutOrders_ReturnsEmptyLinkedOrders kiểm tra Counter tạo/Get đều []. README cập nhật bảng TC. Không git add/commit/đổi nhánh.

- Kiểm chứng M10: dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 193 pass/0 fail/2 skip (PostgreSQL/performance opt-in). Windows không chặn binary trong lượt này.

- Migration OptionalPaymentReference tạo bằng EF CLI cho cả SQLite và PostgreSQL: BankReference đã nullable, chỉ bỏ điều kiện bắt buộc mã khỏi CHECK CK_Payment_PaymentRules; giữ unique index và các điều kiện còn lại. Có test nâng cấp DB cũ, bảo toàn dữ liệu nghiệp vụ/payment và xác nhận không mã sau nâng cấp. SQLite rebuild bảng Payments có thể đổi thứ tự cột vật lý nên test so sánh Payment theo thuộc tính. Script PostgreSQL idempotent đã sinh offline trong temp; không sửa migration cũ.

- Kiểm chứng M11: build cuối 0 warning/0 error. Lượt trước đạt 205 pass/1 fail/2 skip; fail duy nhất ở assertion migration so snapshot theo thứ tự cột Payments sau rebuild SQLite. Assertion đã sửa để so sánh thuộc tính Payment và giữ kiểm tra tất cả bảng khác, nhưng dotnet test Pharmacy.sln cuối bị Windows Application Control chặn Pharmacy.Tests.dll (FileLoadException 0x800711C7) trước discovery. Retry --no-build --no-restore cùng binary vẫn bị chặn; PO cần chạy lại test ở worktree khác. Các test doanh thu/duyệt nhanh và hồi quy đã pass trong lượt trước. PostgreSQL mới kiểm model/migration/script offline, chưa có PHARMACY_TEST_POSTGRES để kiểm chứng runtime; performance opt-in chưa bật. Không thay/tắt bảo vệ máy.

- M12 (`be/m12-order-ready`, 2026-10-06): theo D15, Order.ReadyAt nullable/private set và MarkReady(now, hasInvoice) kiểm Pickup + Preparing + đã có hóa đơn, giữ timestamp đầu khi gọi lại. POST /api/staff/orders/{orderId}/ready dùng InventoryService.Execute, trả OrderView, tự gán HandledBy nếu chưa có; tải lại Order trước thao tác để tránh context cũ ghi đè thời điểm. OrderView/OrderRow trả readyAt trong các route khách/staff. Không thêm trạng thái, không yêu cầu ready trước complete Pickup, không đổi hành vi ship/complete.
- Migration OrderReadyAt tạo bằng EF CLI cho cả SQLite (TEXT nullable) và PostgreSQL (timestamp with time zone nullable, converter UTC hiện có). Không sửa migration cũ; script PostgreSQL idempotent đã sinh offline trong temp. Test nâng cấp cũ dùng context tương thích chưa có ReadyAt, xác nhận bảo toàn Order/Payment/bảng nghiệp vụ và ReadyAt của đơn cũ là null; giữ kiểm chứng D13 khi thêm migration mới. Test model của hai provider không có pending changes.
- Test TC37_D15_ReadyPickup_IsIdempotent_SetsHandler_VisibleInCustomerDetailAndLists có Staff/Admin: ready thành công, lặp không đổi DB, timestamp ở chi tiết/danh sách khách và staff, User 403, complete giữ readyAt và gọi ready sau complete 409. TC37_D15_ReadyRejectsDeliveryOrMissingInvoice_WithoutWriting kiểm Delivery/chưa hóa đơn 409, ReadyAt ban đầu null; TC37_D15_DomainReady_PreservesFirstTime_RequiresPickupPreparingAndInvoice kiểm idempotent với thời điểm khác và guard domain. Test complete chưa ready hiện có giữ nguyên. Không git add/commit/đổi nhánh.

- Kiểm chứng M12: dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 203 pass/0 fail/2 skip (PostgreSQL/performance opt-in). Windows không chặn binary trong lượt này. PostgreSQL đã kiểm model/migration/script offline, chưa chạy runtime do chưa có PHARMACY_TEST_POSTGRES.

- M13 (be/m13-real-catalog, 2026-10-07): DbSeeder trên DB trống chỉ tạo 20 sản phẩm/20 ảnh thật từ catalog mới, tất cả đang bán, 47 lô tất định (2 tồn thấp, 1 hết hàng, 4 lô sắp hết hạn và 1 D−5). Giữ bốn tài khoản; đơn Approved của chuduc kê PRUZENA ×3 / ATILENE ×2, một đơn hết hiệu lực và một PendingReview; không PaymentSetting. CatalogSeeder bỏ legacyImages, chỉ thêm thuốc/lô/ảnh thiếu, BatchId riêng ổn định, không ghi đè thuốc/lô/file hoặc xóa danh mục DB hiện có; phục hồi file ảnh chuẩn bị mất.
- Tách IDbSeeder và TestCatalogSeeder qua DI ApiFactory sau migrate: 12 thuốc biên/đơn thuốc hồi quy độc lập với catalog sản xuất; TestImage cấp PNG kiểm thử riêng. Cập nhật count fixture, test ảnh và test catalog sản xuất/CLI/add-only/idempotent/report. README và TEST_REPORT_BE cập nhật danh mục/lệnh và giới hạn kiểm chứng.
- Kiểm chứng M13: dotnet build Pharmacy.sln 0 warning/0 error. Windows Application Control chặn Pharmacy.Tests.dll (0x800711C7) trước discovery, retry cùng binary --no-build --no-restore vẫn bị chặn; PO cần chạy suite ở worktree khác. Smoke HTTP/CLI trên SQLite/storage tạm riêng pass: 20 sản phẩm/ảnh, inventory, báo cáo 3 dòng tồn thấp/4 lô sắp hết hạn, login và đơn thuốc đúng PRUZENA ×3 / ATILENE ×2; nạp lại 0, phục hồi file ảnh thiếu rồi chạy lại 0. PostgreSQL runtime chưa chạy trong lượt này. Không git add/commit/đổi nhánh.
- Bổ sung M13 (2026-10-07 09:23:25 +07:00): catalog 33 sản phẩm/33 ảnh, seeder hiện có tự sinh 77 lô và giữ các ca báo cáo (2 tồn thấp, 1 hết hàng, 8 lô sắp hết hạn, 1 D−5), cờ cần đơn đúng catalog (10 thuốc). CatalogSeedTests bỏ tổng số/danh sách rx viết cứng, đối chiếu catalog và lô gần hết hạn từ DB; README/TEST_REPORT_BE cập nhật. dotnet build Pharmacy.sln 0 warning/0 error; dotnet test Pharmacy.sln 203 pass/0 fail/2 skip (PostgreSQL/performance opt-in), Windows không chặn binary. Không sửa dữ liệu/ảnh PO cung cấp, không đổi logic seeder/migration, không git add/commit/đổi nhánh.

## Câu hỏi cho PO
- M3.5 không đổi API contract. Phạm vi IInventoryLock vẫn một tiến trình ứng dụng; dùng schema pharmacy không exposed qua Supabase Data API. Chưa có connection PostgreSQL để chạy smoke thật; cần chạy nhóm opt-in trên DB test riêng trước demo Supabase.
- M3: DB M1 không có thời điểm tạo đơn thuốc. Migration giữ bản ghi cũ và dùng CreatedAt = UnixEpoch làm giá trị chưa biết; bản ghi mới lưu thời điểm thật. Không đổi API contract; README đã nêu giới hạn dữ liệu cũ.
- M2 không phát sinh câu hỏi mới; giữ URL/DTO/mã lỗi theo API contract §4–§5, không thêm endpoint xóa thuốc hoặc endpoint reserve/release/checkout.
- **Đã trả lời:** PO chốt DB ở `backend/data`, dùng `Data Source=../data/pharmacy.db`; giữ nguyên cấu hình hiện tại.
- **Đã trả lời:** PO chấp nhận cookie secret `pharmacy.antiforgery` HttpOnly, đi cùng request token `XSRF-TOKEN` JS-readable/header theo contract.
- **Đã trả lời:** PO chấp nhận giới hạn 9.999 mã/prefix/ngày; giữ sequence bền vững và trả `409 INVALID_STATE` khi hết dải.
