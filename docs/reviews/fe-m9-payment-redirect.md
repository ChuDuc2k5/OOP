# Review `fe/m9-payment-redirect` — APPROVED (PO tự sửa)

Reviewer: PO · 2026-10-06
- Phản hồi người dùng: sau khi staff xác nhận tiền, khách vẫn đứng ở trang QR
- Sửa: trang QR làm mới mỗi 10s; khi Payment khác PendingReview (Confirmed/Closed) → toast "Đã xác nhận thanh toán. Đang chuyển về chi tiết đơn hàng…" và `router.replace(/orders/{id})`; mở lại link QR của đơn đã xác nhận cũng tự về chi tiết đơn
- e2e cập nhật theo hành vi mới; bỏ ảnh `TC45-F017-qr-confirmed`
- E2E 28/28 pass (một lần chạy có test `TC32/TC33-F013` chập chờn do thứ tự chạy — chạy riêng pass, chạy lại toàn bộ pass; ghi nhận để làm cứng sau)
