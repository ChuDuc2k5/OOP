# Review `be/m7-stock-guard` — APPROVED

Reviewer: PO · 2026-10-06

- D9: thêm/tăng dòng giỏ vượt tồn khả dụng → `409 INSUFFICIENT_STOCK` ("Thuốc tạm hết hàng." / "Không đủ hàng, chỉ còn N {đơn vị}."), giỏ không đổi; giảm/xóa luôn được
- D8: mọi thao tác staff tự ghi `HandledBy`; test review → fulfill → complete (Pickup) và review → fulfill → ship → complete (Delivery) không cần claim
- `dotnet test` 188 pass, 2 skip có chủ đích (chạy ở worktree chính)
- Ghi chú: `ValidateStock` dùng `InventoryReader.Snapshot` (nạp toàn bộ kho) mỗi lần thêm giỏ — chấp nhận với quy mô NFR-01 đã đo; tối ưu nếu dữ liệu lớn hơn
