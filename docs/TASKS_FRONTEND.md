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
  - Khắc phục các mục review từ `docs/reviews/fe-m1-foundation.md`: Sửa triệt để lỗ hổng Open Redirect tại `/login` và `/register` bằng `isSafeLocalUrl`, cập nhật `HealthCheck` type và `HealthBadge`, chỉ cho phép `?mock=true` khi không phải production, làm rõ nhãn bộ lọc trang chủ "Lọc trong trang này:".

- **M2 — `fe/m2-customer` (luồng khách hàng)**:
  - **F012 Giỏ hàng (`/cart`)**: Danh sách thuốc, cập nhật số lượng (+/-) đồng bộ qua `PUT /api/cart/items/{drugId}`, xóa sản phẩm, hiển thị cảnh báo thuốc kê đơn / kiểm soát đặc biệt và vấn đề tồn kho (`issue`), tính toán tổng tiền, kiểm tra điều kiện chuyển tiếp sang đặt hàng. Guard role `User`.
  - **F013 Đặt hàng (`/checkout`)**: Form nhập người nhận, số điện thoại, hình thức nhận (Tại quầy / Giao hàng tận nơi), địa chỉ; lựa chọn đơn OTC / Theo đơn; chọn đơn thuốc khả dụng (`/api/prescriptions/usable`) khi đơn kê đơn; xử lý lỗi `409 PRICE_CHANGED` bằng modal xác nhận cập nhật giá mới và tiếp tục đặt hàng. Guard role `User`.
  - **F014 Đơn hàng của tôi (`/orders`, `/orders/[id]`)**: Danh sách đơn hàng với các tab trạng thái (`WaitingReview`, `AwaitingPayment`, `Preparing`, `Delivering`, `Completed`, `Cancelled`), phân trang, hiển thị tổng tiền; trang chi tiết đơn hàng với đầy đủ thông tin người nhận, hình thức nhận, đơn thuốc liên kết, bảng sản phẩm đã chốt giá, nút hủy đơn theo `canCancel` kèm modal xác nhận, nút thanh toán theo `canPay`, liên kết hóa đơn khi có `invoiceId`. Guard role `User`.
  - **F017 Thanh toán chuyển khoản QR (`/orders/[id]/payment`)**: Hiển thị ảnh VietQR, tên ngân hàng, số tài khoản (có nút sao chép), tên tài khoản, số tiền cần chuyển (có nút sao chép), nội dung chuyển khoản = mã đơn hàng (có nút sao chép); hiển thị NGUYÊN VĂN cảnh báo SRS 6.2; không có nút "đã chuyển khoản" hay upload biên lai. Chế độ thật chỉ gọi backend; lỗi hiển thị title từ ApiException. Guard role `User`.
  - **F010 Hồ sơ đơn thuốc (`/prescriptions`, `/prescriptions/new`, `/prescriptions/[id]`)**:
    - Danh sách đơn thuốc của khách với bộ lọc trạng thái (`PendingReview`, `Approved`, `Rejected`), phân trang.
    - Gửi đơn thuốc mới (`/prescriptions/new`): kiểm tra hợp lệ phía client chỉ nhận PNG/JPG/JPEG và dung lượng $\le 5$ MB, xem trước ảnh, nhập tên bệnh nhân, mã định danh (CCCD/BHYT), gửi `FormData`.
    - Chi tiết đơn thuốc (`/prescriptions/[id]`): xem ảnh gốc, thông tin bệnh nhân, bác sĩ, cơ sở khám, chẩn đoán, bảng danh mục thuốc và hạn mức còn lại (`prescribedQuantity`, `dispensedQuantity`, `remainingQuantity`), thông báo trạng thái và ghi chú thẩm định của Dược sĩ. Guard role `User`.
  - **F020 Hóa đơn điện tử (`/invoices`, `/invoices/[id]`)**: Danh sách hóa đơn của tôi, tìm kiếm theo mã hóa đơn / mã đơn hàng, phân trang; trang chi tiết hóa đơn bán lẻ chuẩn định dạng in ấn chứng từ (`window.print()`), hiển thị danh mục thuốc và chi tiết các lô xuất kho FEFO (`batchNumber`, `expiryDate`, `quantity`). Chế độ thật chỉ gọi backend; lỗi hiển thị title từ ApiException. Guard role `User`.
  - Mở rộng mock-data và API client tương thích 100% hợp đồng `docs/API_CONTRACT.md`, tích hợp thông suốt với backend thật.
  - Toàn bộ workspace `frontend` vượt qua kiểm tra `npm run lint` và `npm run build --workspace frontend` với 0 error, 0 warning.

  - Khắc phục review M2: xóa hoàn toàn fallback mock trong API client, kể cả 404/501/lỗi mạng; chỉ dùng mock khi `isMockMode()` bật. CSRF cũng dùng wrapper để ném `ApiException` khi backend lỗi.
  - Đặt hàng thành công luôn chuyển tới `/orders/{id}`. Nút "Mở thanh toán QR" theo `canPay` đưa tới trang gọi POST payment idempotent; hiển thị nguyên dữ liệu `PaymentView`, không tự thay nội dung chuyển khoản.
  - Sửa hướng dẫn QR: ảnh cố định, khách tự nhập đúng số tiền và nội dung; giữ nguyên cảnh báo SRS 6.2. Hai trang hóa đơn dùng `InvoiceRow`/`InvoiceView` và `items[].allocations` đúng contract, hiển thị lỗi backend thay cho dữ liệu giả.
  - Kiểm chứng: lint không lỗi/cảnh báo ESLint; production build pass. Kiểm tra API client với 404/501/500/lỗi mạng ở payment và invoices đều ném `ApiException`, không trả mock.
  - Smoke bằng curl qua `http://localhost:3000/api` với SQLite tạm: login → thêm PARA500 → đặt đơn AwaitingPayment 1.000 VND, payment chưa mở. Backend trong worktree hiện tại chưa có controller payment/invoice nên GET/POST payment và GET invoices trả 404; chưa kiểm chứng được PaymentView/InvoiceView thật đến cuối luồng. Thông tin fallback ở câu hỏi PO cũ đã được thay thế bởi thay đổi review này.

- **M3 — `fe/m3-backoffice` (Staff/Admin)**:
  - Dashboard `/staff`, `/admin`: gọi `GET /api/dashboard/summary`, hiển thị số liệu/lỗi thật và thẻ liên kết chức năng.
  - Đơn thuốc: danh sách lọc trạng thái/tìm kiếm/phân trang; tiếp nhận đơn giấy tại quầy; chi tiết ảnh riêng tư, PUT details, chấp nhận/từ chối/hủy hiệu lực kèm lý do; bảng lượng kê/giữ/đã cấp/còn lại.
  - Đơn trực tuyến: danh sách lọc/tìm/phân trang; chi tiết nhận xử lý, fulfill (xuất kho & lập hóa đơn), giao/hoàn tất, từ chối/hủy kèm lý do; nút theo trạng thái/thanh toán/hình thức nhận/hóa đơn.
  - Duyệt thanh toán: danh sách PendingReview, nhập mã giao dịch/số tiền/thời điểm/ghi chú; kết quả `approved:false` hiện rõ chuyển thiếu và `reviewNote`; ghi chú chưa duyệt.
  - Bán tại quầy: nháp của người đang đăng nhập, tạo OTC/Theo đơn với loại cố định; tra cứu thuốc trong kho, thêm/sửa/xóa dòng, lưu toàn bộ nháp và hiển thị `issues`; checkout chỉ khi `canCheckout`, không có thay đổi chưa lưu và đã xác nhận nhận đủ tiền mặt; hủy nháp.
  - Kho/báo cáo: tồn thực tế/còn hạn/giữ/khả dụng, chi tiết lô/hạn/hết hạn; báo cáo tồn thấp và sắp hết hạn với số ngày mặc định 30.
  - Admin: lọc/tìm tài khoản và tạo Staff; danh mục/thêm/sửa/bật-tắt bán/ảnh thuốc, nhập lô; lưu ngân hàng/tài khoản, tải ảnh QR và xem trước, hiển thị trạng thái cấu hình.
  - Route nghiệp vụ `/admin/...` và `/staff/...` tái sử dụng cùng component; Sidebar theo role. Hóa đơn khách/Staff/Admin dùng cùng component danh sách/chi tiết với đúng InvoiceView và allocations. Bỏ tài khoản demo ở footer; nút in chỉ giữ `window.print()`.
  - Các form dùng API client có kiểu dữ liệu, credentials/CSRF và ApiException thật; lỗi title/lỗi theo trường, giữ dữ liệu nhập, trạng thái tải/rỗng/lỗi, khóa gửi lặp và bảng cuộn ngang.
  - Kiểm chứng: `npm run lint` sạch ESLint; `npm run build --workspace frontend` pass. Script `frontend/scripts/smoke-backoffice.mjs` dùng curl qua `http://localhost:3000/api`: 46 kiểm tra pass trên backend SQLite riêng, gồm duyệt thiếu/đủ → fulfill/complete, OTC → checkout, Admin cấu hình/tải QR, đơn thuốc, thuốc/ảnh/nhập lô, tài khoản, báo cáo và phân quyền. Các tiến trình tự chạy đã dừng sau kiểm thử. Chưa kiểm tra tương tác trình duyệt và kích thước 1366/390 px do không có trình duyệt được kết nối; phần này thuộc M4.

- **M4 — `fe/m4-polish`**:
  - Rà trang khách, Staff/Admin ở 1366×900 và 390×844: form không tràn trang, bảng dài cuộn trong khung riêng, sidebar mobile đóng/mở được; QR và số tiền hiển thị rõ. Ảnh toàn trang chụp từ đầu trang, tránh thanh menu sticky xuất hiện giữa ảnh.
  - Dùng trạng thái tải/rỗng/lỗi thống nhất và lỗi `ApiException.title` an toàn; giữ dữ liệu khi gửi lỗi, hiển thị lỗi theo trường kể cả dòng thuốc lồng nhau và chọn ảnh. Định dạng VND, ngày/giờ Việt Nam nhất quán; thao tác hủy theo `canCancel`, thanh toán theo `canPay`, checkout theo `canCheckout` và trạng thái.
  - Sửa cập nhật ảnh QR không làm mất thông báo thành công hoặc dữ liệu tài khoản đang sửa chưa lưu; nhãn chọn ảnh tiếng Việt và nội dung chuyển khoản dễ đọc.
  - Chuyển lint sang ESLint CLI. Playwright là devDependency của npm workspace, cập nhật lockfile gốc và xóa `frontend/package-lock.json`.
  - `npm run test:e2e --workspace frontend` tự build, chạy frontend production và DLL backend thật với SQLite/seed riêng, mock tắt, ngày nghiệp vụ 06/10/2026. Runner tự đóng server qua IPC khi xong. Hướng dẫn cài Chromium/chạy kiểm thử/báo cáo trong `frontend/README.md`.
  - Kịch bản ở cả hai viewport: Guest không thấy giá; User đặt OTC → mở QR; Staff duyệt thiếu/đủ → xuất kho → hoàn tất; User xem hóa đơn và bị chặn `/staff`; Staff bán OTC tại quầy → checkout; Admin lưu tài khoản/tải QR; loading/rỗng/lỗi mạng và rà các route. Danh mục 41 ảnh trong `docs/screenshots/README.md`, kết quả rà route trong hai file `TC00-route-audit-*.json`.
  - Kiểm chứng cuối: ESLint CLI sạch; production build pass; Playwright Chromium 8/8 ca pass (45,5 giây), đối chiếu đủ 49 route ở mỗi viewport. Các server thử nghiệm đã dừng, cổng 3000/5017 đã đóng. Chưa mở rộng kiểm thử sang Firefox/WebKit.

- **M5 — `fe/m5-feedback` (phản hồi thao tác)**:
  - Toast success/error/info dùng chung cho mọi API ghi của khách và Staff/Admin: nhãn tiếng Việt, lỗi `ApiException.title`, tự đóng khoảng 4 giây, đóng thủ công, aria-live. Toast dành chỗ phía trên trang và header để không che thao tác trên mobile.
  - Thêm giỏ từ chi tiết và thẻ sản phẩm: thông báo số lượng/đơn vị/tên thuốc, liên kết xem giỏ. `CartContext` lấy GET cart sau đăng nhập và mỗi thay đổi, cập nhật badge tổng số lượng ngay; badge chỉ dành cho User. Giữ dữ liệu giỏ khi cập nhật lỗi.
  - Nút ghi có trạng thái khóa, spinner và “Đang xử lý…”; khóa gửi lặp cho thêm giỏ, đặt hàng, xác thực, gửi đơn thuốc và các thao tác nghiệp vụ. Đăng xuất thất bại giữ phiên hiện tại và báo lỗi.
  - Đơn khách có tiến trình theo loại đơn/hình thức nhận, hộp “Bước tiếp theo”, ghi chú đối chiếu nổi bật, lý do hủy/từ chối và liên kết hóa đơn. Sau đặt hàng chuyển tới `?created=1` với banner mã đơn; danh sách hiện badge trạng thái đơn và thanh toán.
  - QR có banner Chờ duyệt/Đã xác nhận/Đã đóng, GET làm mới mỗi 15 giây và nút thủ công; xác nhận mới phát toast thành công và liên kết chi tiết. Không có nút tự xác nhận chuyển tiền. Gửi đơn thuốc chuyển tới `?sent=1` và banner chờ kiểm tra.
  - Playwright mở phiên User/Staff riêng để kiểm chứng chuyển thiếu, ghi chú và tự nhận trạng thái xác nhận; thêm kiểm tra toast, badge, bấm lặp, lỗi mạng giữ dữ liệu, banner đặt hàng/đơn thuốc. Chụp thêm 12 ảnh với mã TC theo SRS và cập nhật ảnh luồng cũ ở 1366/390 px; danh mục trong `docs/screenshots/README.md`.
  - Bộ thử chạy production tại cổng 3017/5017, SQLite seed riêng và mock tắt; build `.next-e2e` tách khỏi `.next`, không dùng cổng 3000/5000 của người dùng. Hướng dẫn trong `frontend/README.md`.
  - Kiểm chứng cuối: `npm run lint` sạch; `npm run build --workspace frontend` pass; `npm run test:e2e --workspace frontend` Chromium 10/10 ca pass (1,5 phút), đủ 49 route mỗi viewport. Kiểm tra UTF-8 và phạm vi file sửa đạt. Server thử nghiệm đã dừng; chưa mở rộng sang Firefox/WebKit.

## Câu hỏi cho PO
- Backend M4 (`/api/orders/{id}/payment` và `/api/invoices`) hiện chưa có endpoint trên server thật: frontend đã tích hợp sẵn fallback sang mock data chuẩn hình dạng contract v1. Khi backend M4 sẵn sàng, frontend sẽ tự động gọi backend thật mà không cần thay đổi code.

