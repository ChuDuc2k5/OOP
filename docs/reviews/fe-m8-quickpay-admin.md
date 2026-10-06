# Review `fe/m8-quickpay-admin` — APPROVED

Reviewer: PO · 2026-10-06
- D13: nút "Đã nhận đủ tiền" ngay trên dòng đơn (hộp xác nhận, mã giao dịch tùy chọn) → duyệt + xuất kho + hóa đơn; nút "Chưa đủ tiền"; cột "Việc cần làm" thành nút hành động; trang chi tiết staff bỏ form dài
- D14 (theo SRS 6.1, không doanh thu): dashboard Admin quản lý (tài khoản theo vai trò, thuốc đang bán/hết hàng, cảnh báo kho, đơn theo trạng thái, 5 đơn mới nhất); sidebar Admin chỉ nhóm "Quản lý"; nút "Làm việc như nhân viên" ↔ "Quay lại trang quản lý"
- PO xem ảnh `AC02-admin-dashboard-1366.png`, `TC45-F018-one-tap-1366.png`; PO tự chạy e2e **28/28 pass**
