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
_(Dev cập nhật sau mỗi milestone)_

## Câu hỏi cho PO
_(Dev ghi câu hỏi ở đây)_
