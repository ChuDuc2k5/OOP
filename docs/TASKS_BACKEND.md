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
- Cách chạy, cấu hình, demo account và bảng TC ↔ tên test có trong `backend/README.md`. Không push/merge/đổi nhánh. Chưa stage/commit được: `git add` và `git commit` bị chặn khi tạo `OOP/.git/worktrees/OOP-be/index.lock` (Permission denied; ACL Deny Write trên metadata). Phiên không cho nâng quyền; toàn bộ thay đổi vẫn nằm trong worktree.

## Câu hỏi cho PO
- ARCHITECTURE §1/§3 và `.gitignore` đặt DB ở `backend/data`, nhưng §9 ghi `Data Source=data/pharmacy.db` tương đối với `backend/Pharmacy.Api` (thành `backend/Pharmacy.Api/data`). M1 chọn `Data Source=../data/pharmacy.db` để khớp sơ đồ và ignore; PO vui lòng thống nhất đường dẫn trong tài liệu. API contract không thay đổi.
- Antiforgery ASP.NET cần cookie secret riêng với request token. M1 dùng `pharmacy.antiforgery` HttpOnly cho secret và `XSRF-TOKEN` JS-readable cho request token/header, đúng luồng FE của contract. Ghi nhận để PO/FE biết có thêm cookie hạ tầng.
- Dải mã 4 số giới hạn 9.999 mã/prefix/ngày. M1 dùng sequence bền vững và trả `409 INVALID_STATE` khi hết dải; không đổi định dạng. Nếu cần mở rộng sau này, PO cần quyết định định dạng.
- Cần quyền ghi Git metadata của worktree để hoàn tất commit. Dự kiến chia: `feat(be): add M1 domain SQLite foundation and empty-database seed`; `feat(be): F001-F003 add cookie authentication and antiforgery API`; `test(be): cover TC01-TC08 and TC55 and document M1`. Hiện chưa có commit mới do ACL; không tự sửa ACL hoặc dùng cách vượt sandbox.
