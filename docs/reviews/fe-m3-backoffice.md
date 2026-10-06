# Review `fe/m3-backoffice` — APPROVED

Reviewer: PO · 2026-10-06

- `npm run lint` sạch, `npm run build` pass; dev báo 46 kiểm tra curl qua `localhost:3000/api` pass (chuyển thiếu/đủ → fulfill, OTC tại quầy → checkout, cấu hình/tải QR, phân quyền)
- PO kiểm tra trình duyệt với backend thật (Admin): 14 trang `/admin`, `/admin/accounts`, `/admin/drugs`, `/admin/drugs/PARA500`, `/admin/settings/payment`, `/staff/prescriptions|orders|payments|sales|inventory|inventory/PARA500|reports|invoices` render dữ liệu thật, không lỗi, không tràn ngang ở 1366 px; kiểm tra 390 px 4 trang — không tràn ngang
- Đăng nhập `user` mở `/staff`, `/admin/accounts` → chuyển về `/`
- Đã bỏ tài khoản demo ở footer; "In hóa đơn" chỉ `window.print()`

Còn cho M4 (polish): thử tương tác từng form trên trình duyệt (đã kiểm qua API), chụp màn hình bằng chứng 1366/390 px.
