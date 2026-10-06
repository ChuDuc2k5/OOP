# Backlog Frontend — Antigravity (React / Next.js)

Đọc trước: `docs/SRS_v2.0.md` (mục 2.1, 3, 4, 6), `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/WORKFLOW.md`.
Chỉ sửa trong `frontend/`.

## Bản đồ trang

| Route | Ai | Function |
|---|---|---|
| `/` | Guest/User | F004 danh sách + tìm kiếm (Guest không có giá, nút "Mua" → `/login?next=`) |
| `/products/[drugId]` | Guest/User | F004 chi tiết, thêm giỏ (User) |
| `/login`, `/register` | Guest | F001, F002 (đăng nhập xong điều hướng theo `homePath`) |
| `/cart` | User | F012 |
| `/checkout` | User | F013 (form người nhận, Pickup/Delivery, OTC/Theo đơn + chọn đơn thuốc, xử lý `PRICE_CHANGED`) |
| `/orders`, `/orders/[id]` | User | F014 (hủy theo `canCancel`, nút Thanh toán theo `canPay`) |
| `/orders/[id]/payment` | User | F017 trang QR + cảnh báo nguyên văn + nút sao chép STK/nội dung |
| `/prescriptions`, `/prescriptions/new`, `/prescriptions/[id]` | User | F010 gửi ảnh, xem của mình |
| `/invoices`, `/invoices/[id]` | User | F020 |
| `/staff` | Staff | Dashboard (thẻ tổng quan → link chức năng) |
| `/staff/prescriptions`, `/staff/prescriptions/new`, `/staff/prescriptions/[id]` | Staff/Admin | F010, F011 (xem ảnh, nhập chi tiết, chấp nhận/từ chối/hủy hiệu lực) |
| `/staff/orders`, `/staff/orders/[id]` | Staff/Admin | F015 (claim, xuất & lập hóa đơn = fulfill, giao, hoàn tất, từ chối/hủy) |
| `/staff/payments` | Staff/Admin | F018 danh sách chờ + form đối chiếu |
| `/staff/sales`, `/staff/sales/new`, `/staff/sales/[id]` | Staff/Admin | F016, F019 (nháp, issues, xác nhận đã nhận tiền mặt → checkout) |
| `/staff/inventory`, `/staff/inventory/[drugId]` | Staff/Admin | F007 |
| `/staff/reports` | Staff/Admin | F009 (tab tồn thấp / sắp hết hạn + ô số ngày) |
| `/staff/invoices`, `/staff/invoices/[id]` | Staff/Admin | F020 |
| `/admin` | Admin | Dashboard quản lý; các trang nghiệp vụ ở `/admin/...` **tái sử dụng component** của `/staff/...` |
| `/admin/accounts` | Admin | F003 |
| `/admin/drugs`, `/admin/drugs/new`, `/admin/drugs/[drugId]` | Admin | F005 + upload ảnh + nhập lô F006 |
| `/admin/settings/payment` | Admin | F017 cấu hình QR |

Layout: homepage header (logo, tìm kiếm, giỏ, đơn, đăng nhập/tài khoản). Dashboard: sidebar menu theo role + tên tài khoản + role + đăng xuất (NFR-05).

---

## M1 — `fe/m1-foundation`
1. `frontend/` hiện là khung **Vite** (cổng 5173, gọi gateway NestJS đã bị bỏ). Thay bằng **Next.js** (TypeScript, App Router, Tailwind, ESLint), giữ tên package `frontend` để workspace gốc (`npm run dev:web`, `npm run lint`, `npm run build`) vẫn chạy; cổng 3000. `next.config` rewrites `/api/:path*` → `${BACKEND_URL ?? 'http://localhost:5000'}/api/:path*`. Cập nhật `frontend/.env.example` (`BACKEND_URL=http://localhost:5000`). Trang chủ tạm có thể giữ ô kiểm tra `GET /api/health`.
2. `lib/api.ts`: fetch wrapper (`credentials: include`, tự lấy CSRF, gắn `X-XSRF-TOKEN`, parse `ApiError`). `lib/types.ts`: **toàn bộ** type từ contract. `lib/format.ts`: VND, dd/MM/yyyy, nhãn trạng thái tiếng Việt.
3. Mock layer tùy chọn (`NEXT_PUBLIC_USE_MOCK=true`) cho phép làm UI khi BE chưa sẵn sàng.
4. Auth context (`/api/auth/me`), guard theo role phía client (User vào `/staff` → chuyển về `/`, v.v.).
5. Layout homepage + layout dashboard Staff/Admin; trang login/register (lỗi theo trường, giữ dữ liệu đã nhập, ô mật khẩu che).
6. Trang `/` và `/products/[id]` (F004) — giá chỉ hiện khi có `unitPrice`.

## M2 — `fe/m2-customer` (luồng khách)
Giỏ, checkout (`PRICE_CHANGED` → modal hiển thị giá mới, xác nhận), đơn của tôi, trang QR (cảnh báo nguyên văn SRS 6.2, không có nút "đã chuyển khoản"), đơn thuốc của tôi (upload PNG/JPG ≤ 5 MB kiểm tra trước ở client), hóa đơn của tôi.

## M3 — `fe/m3-backoffice` (Staff/Admin)
Dashboard, đơn thuốc, đơn trực tuyến, duyệt thanh toán (hiển thị rõ khi `approved:false` = chuyển thiếu), bán tại quầy (chọn OTC/Theo đơn khi tạo, không đổi loại), kho, báo cáo, hóa đơn; Admin: tài khoản, thuốc + ảnh + nhập lô, cài đặt QR.

## M4 — `fe/m4-polish`
Kiểm tra 1366 px & 390 px (bảng cuộn ngang, QR & số tiền không bị che), trạng thái loading/empty/error, thông báo rỗng rõ ràng, không lộ stack trace, chụp ảnh màn hình các luồng chính vào `docs/screenshots/` cho bằng chứng kiểm thử.

---

## Đã làm
_(Dev cập nhật sau mỗi milestone)_

## Câu hỏi cho PO
_(Dev ghi câu hỏi ở đây)_
