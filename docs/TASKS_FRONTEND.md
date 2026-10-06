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
- **M1 — `fe/m1-foundation`**:
  - Chuyển đổi toàn bộ khung Vite sang Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, ESLint, giữ nguyên tên package `frontend` và cổng 3000.
  - Cấu hình `next.config.mjs` với `rewrites` từ `/api/:path*` sang `${BACKEND_URL ?? 'http://localhost:5000'}/api/:path*`.
  - Cập nhật `frontend/.env.example` với `BACKEND_URL=http://localhost:5000` và `NEXT_PUBLIC_USE_MOCK=false`.
  - Xây dựng `lib/types.ts` đầy đủ 100% các kiểu dữ liệu, DTOs, Enums và ApiError từ `docs/API_CONTRACT.md`.
  - Xây dựng `lib/format.ts` định dạng tiền tệ VND (`120.000 ₫`), ngày tháng (`dd/MM/yyyy`), ngày giờ (`dd/MM/yyyy HH:mm`) và nhãn trạng thái tiếng Việt theo chuẩn hợp đồng.
  - Xây dựng `lib/api.ts` fetch wrapper với `credentials: "include"`, tự động lấy và gắn header `X-XSRF-TOKEN` cho POST/PUT/PATCH/DELETE, xử lý ngoại lệ `ApiException` ánh xạ RFC 7807 ProblemDetails.
  - Xây dựng Mock Layer (`lib/mock-data.ts`) hỗ trợ kích hoạt qua `NEXT_PUBLIC_USE_MOCK=true` hoặc `?mock=true`, bao gồm tài khoản mẫu SRS §8 (`admin`, `staff`, `user`, `user2`), 14 loại thuốc mẫu chuẩn nghiệp vụ và dashboard summary.
  - Xây dựng `AuthContext` và hooks bảo vệ phân quyền phía client (`useRequireAuth`, `useGuestOnly`), tự động điều hướng theo `homePath` khi đăng nhập và chặn truy cập trái phép vai trò.
  - Xây dựng Layout Homepage (`Header`, `Footer`) và Dashboard Staff / Admin (`Sidebar` hiển thị tên tài khoản, vai trò, đăng xuất theo NFR-05).
  - Hoàn thiện trang Đăng nhập (`/login`) và Đăng ký (`/register`): che ký tự mật khẩu, toggle ẩn/hiện, hiển thị lỗi theo từng trường nhập liệu (`errors.*`), giữ lại dữ liệu đã nhập khi phát sinh lỗi.
  - Hoàn thiện Trang chủ (`/`) và Chi tiết thuốc (`/products/[drugId]`): tìm kiếm, bộ lọc danh mục/tồn kho, phân trang, ô kiểm tra `GET /api/health`, phân quyền xem giá (Guest không nhận và không thấy giá, nút "Mua" chuyển sang đăng nhập; User thấy giá VND).
  - Tạo các route giữ chỗ cho các chức năng kế tiếp của M2 và M3.
  - Kiểm tra `npm install`, `npm run lint` và `npm run build --workspace frontend` đạt kết quả tuyệt đối (0 error, 0 warning).

## Câu hỏi cho PO
_(Hiện chưa có câu hỏi nào cho PO; hợp đồng API v1 và SRS v2.0 đã đầy đủ và rõ ràng cho milestone M1)_

