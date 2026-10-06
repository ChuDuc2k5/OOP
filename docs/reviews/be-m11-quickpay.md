# Review `be/m11-revenue-quickpay` — APPROVED (đã gỡ báo cáo doanh thu)

Reviewer: PO · 2026-10-06
- D13: `bankReference` tùy chọn (có thì vẫn unique giữa payment Confirmed), `receivedAmount` mặc định = expected, `receivedAt` mặc định = hiện tại; logic thiếu/đủ/thừa giữ nguyên. Migration `OptionalPaymentReference` cho SQLite + Postgres (bỏ CHECK bắt buộc mã)
- D14 đã HỦY theo quyết định chủ dự án: PO gỡ `RevenueReportService`, controller, test và mô tả README trước khi merge
- `dotnet test` 198 pass, 2 skip có chủ đích
