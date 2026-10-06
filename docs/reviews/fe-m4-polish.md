# Review `fe/m4-polish` — APPROVED (PO sửa nhỏ trước khi merge)

Reviewer: PO · 2026-10-06

- `npm run lint` sạch (ESLint CLI), `npm run build` pass
- PO tự chạy `npm run test:e2e --workspace frontend`: **8/8 pass** (Chromium, 1366 + 390 px, backend SQLite thật + seed, không mock)
- Rà 49 route ở 1366/390 px (`docs/screenshots/M4-route-audit-*.json`); bảng cuộn riêng, sidebar mobile, trạng thái loading/rỗng/lỗi thống nhất
- 41 ảnh bằng chứng trong `docs/screenshots/` (danh mục: `docs/screenshots/README.md`)

## PO đã sửa trực tiếp
- Đổi mã TC trong tên ảnh/tên test cho khớp SRS mục 8: QR → TC42, duyệt đủ/thiếu → TC45/TC46, xuất kho đơn online → TC37, hóa đơn khách → TC53, bán OTC tại quầy → TC38, lỗi field tạo Staff → TC07, User bị chặn khu nhân viên → TC17; ảnh/sổ route không phải TC → tiền tố `M4-`
- Trang QR: "Hệ thống đối soát tự động & Dược sĩ kiểm tra" → "Admin hoặc nhân viên đối chiếu thủ công" (SRS: đối chiếu thủ công, không tự động)

Còn lại (không chặn): chưa thử Firefox/WebKit (NFR-06 chỉ yêu cầu Edge/Chrome).
