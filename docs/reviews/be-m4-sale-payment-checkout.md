# Review `be/m4-sale-payment-checkout` — APPROVED

Reviewer: PO · 2026-10-06

- `dotnet build` 0 warning; `dotnet test` 170 pass, 1 skip (Postgres opt-in) — TC-13, 20, 35, 38..54, 56
- Smoke end-to-end (SQLite): user đặt OTC giao hàng 2.000 ₫ → mở QR (Payment `PendingReview`, bản chụp cấu hình, giữ 2) → mở lại cùng `paymentId`, không giữ lặp → staff duyệt 1.500 ₫: `approved=false`, ghi "Chuyển thiếu 500 VND." → duyệt 2.500 ₫: `Confirmed`, đơn `Preparing` → `fulfill` tạo `BH…`/`HD…` → `ship` → `complete` → hóa đơn có lô xuất FEFO (LOT03 — lô hết hạn D−5, D bị bỏ qua), giữ hàng về 0 → `user2` xem hóa đơn → 404
- OOP-01: `SaleEvaluation` gọi `sale.Validate(context)` qua kiểu `Sale`; TC-56 chứng minh hai subtype cho kết quả khác qua cùng `CheckoutService`

## Cải thiện ở M5 (MINOR, không chặn)
- `CheckoutService.cs:94` rẽ nhánh `if (sale.Kind == SaleKind.Prescription)` để `RecordDispense`; `SaleEvaluation.cs:33` kiểm tra chủ đơn thuốc theo `Kind`. Nên chuyển thành hành vi đa hình của subtype (vd `virtual Task OnCompletingAsync(...)`/đưa `BuyerUserId` vào `SaleContext` cho `PrescriptionSale.Validate`) để thuyết phục hơn khi bảo vệ OOP.
- Smoke M4 trên PostgreSQL thật.
