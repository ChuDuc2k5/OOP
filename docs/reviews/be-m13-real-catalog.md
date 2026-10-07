# Review `be/m13-real-catalog` — APPROVED

Reviewer: PO · 2026-10-07
- Danh mục thật 33 sản phẩm + 33 ảnh do người dùng cung cấp (PO chuẩn hóa PNG vuông nền trắng; ghi chú bản quyền thuộc nhà sản xuất trong catalog.json). 10 thuốc kê đơn; chưa có thuốc kiểm soát (chờ người dùng gửi)
- Seed DB trống: 33 sản phẩm, 77 lô tất định; DECUMAR/BLACKMEN tồn thấp, GIAOCOLAM hết hàng, DUONGHUYET có lô hết hạn D−5, nhiều lô sắp hết hạn; đơn thuốc chuduc kê PRUZENA ×3, ATILENE ×2
- Bộ thuốc biên cho test (PARA500, VITC500, AMOX500, DIAZ5, HYDRO1…) chuyển sang `TestCatalogSeeder` trong Pharmacy.Tests — không còn xuất hiện trên web
- `--seed-catalog` idempotent, chỉ thêm
- `dotnet test` 203 pass, 2 skip có chủ đích (PO chạy)
