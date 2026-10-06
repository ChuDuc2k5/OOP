# Review `be/m3-prescription-cart-order` — APPROVED

Reviewer: PO · 2026-10-06

- `dotnet build` 0 warning; `dotnet test` 120/120 pass (TC-13, 21, 24..34, 36, 37 phần M3)
- Smoke HTTP: User thêm giỏ (cộng dồn, không giữ kho); đặt hàng sai `expectedTotal` → 409 `PRICE_CHANGED` kèm CartView; đúng tổng → `AwaitingPayment`, `canPay/canCancel` true, giá chốt trong OrderItem; `/api/prescriptions/usable` trả đơn Approved còn hiệu lực (kèm `remainingQuantity`) + đơn PendingReview; Staff thấy đơn trong `/api/staff/orders`; dashboard đếm đúng; Staff gọi `/api/cart` → 403
- Migration mới `PrescriptionCreatedAt` giữ dữ liệu cũ (có test)

Còn lại cho M4: `/fulfill` đang trả 409 theo phạm vi.
