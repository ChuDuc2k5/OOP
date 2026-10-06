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

  - Tiếp tục D6–D9: checkout “Đặt hàng & thanh toán” tạo đơn rồi mở QR ngay khi `canPay`; đơn thuốc chờ duyệt chưa mở QR, lỗi mở QR giữ đơn và báo title ở chi tiết. Đóng QR chỉ điều hướng; chi tiết đơn tự làm mới 15 giây và có nút xem lại QR khi chờ xác nhận.
  - D7: đơn Pickup đã thanh toán có khối mời đến quầy và mã đơn lớn; Delivery hiển thị đang chuẩn bị/đang giao.
  - D8: form xác nhận tiền dùng chung cho danh sách thanh toán và chi tiết đơn Staff/Admin, review đủ tiền gọi fulfill ngay; chuyển thiếu giữ chờ duyệt, lỗi fulfill giữ tiền đã xác nhận và cho thử xuất kho lại. Bỏ nút nhận xử lý; Pickup hoàn tất bằng “Khách đã nhận thuốc”, Delivery bằng “Bắt đầu giao” → “Đã giao xong”. Danh sách đơn có thanh toán và việc cần làm.
  - D9: thuốc hết hàng vẫn hiển thị, khóa nút thêm giỏ màu xám; giới hạn lượng thêm theo tồn khả dụng khi đã biết từ cart/product, lỗi 409 INSUFFICIENT_STOCK hiện toast. Bỏ VAT, phí vận chuyển/giao hàng và mã SRS trên giao diện, giữ nguyên nội dung cảnh báo thanh toán với tiêu đề dễ hiểu.
  - E2e bổ sung Pickup/Delivery, lỗi mở QR giữ đơn, đơn thuốc chờ duyệt, lỗi fulfill sau xác nhận tiền rồi thử lại, thuốc hết hàng và 409 thật; ảnh TC31/TC32/TC33/TC42/TC45/TC37 ở cả 1366/390 px. Mỗi ca giỏ có dữ liệu riêng để tránh ảnh hưởng giữa viewport.
  - Kiểm chứng cuối D6–D9: `npm run lint` sạch, `npm run build --workspace frontend` pass, `npm run test:e2e --workspace frontend` 16/16 ca pass (2,4 phút), backend SQLite thật, mock tắt, đủ 49 route mỗi viewport. Thêm 24 ảnh (tổng 77 ảnh, có ảnh lịch sử trước D6); danh mục ở `docs/screenshots/README.md`. Server thử nghiệm 3017/5017 đã đóng, không đổi nhánh hoặc commit.

  - D10 (mục 1–7): đăng ký 201 tự GET me, cập nhật auth/CSRF, toast thành công và chuyển tới next an toàn hoặc trang chủ. Checkout tự xác định OTC/Prescription từ giỏ, bỏ lựa chọn loại đơn; giỏ kê đơn/kiểm soát cho chọn đơn đã gửi hoặc tải ảnh PNG/JPG ≤5 MB tại chỗ, dùng id mới và chờ dược sĩ. Giỏ hỗn hợp được gửi cho backend kiểm tra, lỗi title/field giữ dữ liệu.
  - Lưu thông tin người nhận sau tạo đơn thành công trong localStorage theo userId (try/catch); tự điền lần sau, mặc định username. Form xác nhận tiền điền sẵn expectedAmount và giờ hiện tại. Đơn thuốc có nút “Lưu & chấp nhận” gọi PUT details rồi approve; từ chối vẫn bắt lý do.
  - Bán tại quầy Staff/Admin dùng cùng một màn hình tìm thuốc từ GET products có giá, sửa/xóa số lượng, tổng tiền; hiện mã đơn/mã người bệnh khi có thuốc kê đơn. Một nút tạo đúng loại nháp → PUT dòng → checkout tiền mặt → hóa đơn. Lỗi hiển thị issues/title và giữ liên kết nháp; thử lại dùng nháp hiện tại, không tạo lặp.
  - Admin thêm thuốc cho chọn ảnh và lô đầu tiên tùy chọn ngay tại form; gọi create → image → batch. Khi bước sau lỗi, giữ thuốc đã tạo để thử lại hoặc mở chi tiết, không tạo lại mã thuốc.
  - E2e D10 bổ sung đăng ký tự đăng nhập/next, OTC tự động, tải ảnh tại checkout với giỏ hỗn hợp, tiền/giờ điền sẵn, lưu/chấp nhận đơn thuốc, bán tại quầy lỗi rồi thử lại cùng nháp, thêm thuốc kèm ảnh/lô. Chụp ảnh TC01/TC33/TC45/TC38/TC26/TC11/TC14 ở 1366/390 px; danh mục trong `docs/screenshots/README.md`.

  - Kiểm chứng cuối D10: `npm run lint` sạch; `npm run build --workspace frontend` pass; `npm run test:e2e --workspace frontend` 22/22 ca pass (2,6 phút), backend SQLite thật và mock tắt, đủ 49 route mỗi viewport. Thêm 16 ảnh, tổng 93 ảnh; server thử nghiệm 3017/5017 đã dừng.

  - D11: bỏ HealthBadge/trạng thái API, gợi ý tài khoản đăng nhập và mọi dấu hiệu chế độ phát triển trên giao diện; placeholder tên đăng nhập thống nhất. Mock giữ cho phát triển với tên tài khoản chuduc/nguyenvana và nội dung không lộ chế độ; e2e dùng mã thuốc có nghĩa VITC500/AMOX500 và các mã mới của backend.
  - QR chưa cấu hình: tạo đơn vẫn thành công, giữ nút mở QR tại chi tiết; PAYMENT_NOT_CONFIGURED được đổi thành thông báo tiếng Việt, không lộ mã lỗi. Admin hiển thị rõ “Chưa cấu hình”. E2e chuẩn bị tài khoản nhận tiền và tải QR qua API Admin, dùng fixture riêng trong frontend thay cho ảnh đã bỏ khỏi seed backend.
  - CSRF: mutation nhận 400 ANTIFORGERY_INVALID tự lấy token mới bằng GET auth/csrf rồi gửi lại đúng một lần, giữ nguyên body kể cả FormData; lỗi lần hai được ném và hiển thị như bình thường. E2e đăng ký với cookie XSRF-TOKEN rác kiểm tra 400 rồi 201, phiên đăng nhập và next an toàn; thêm ca lỗi liên tiếp chỉ gửi hai request và gửi lại ảnh đơn thuốc với token cũ.

  - Kiểm chứng cuối D11: `npm run lint` sạch, `npm run build --workspace frontend` pass, `npm run test:e2e --workspace frontend` 24/24 ca pass (2,5 phút), Chromium ở 1366/390 px với backend SQLite thật, đủ 49 route mỗi viewport. Rà nguồn không còn demo/mock mode hoặc gợi ý tài khoản hiển thị; chụp lại ảnh liên quan và cập nhật danh mục. Server thử nghiệm 3017/5017 đã dừng.

- **M6 — `fe/m6-rx-review` (D12)**:
  - PrescriptionView bổ sung linkedOrders theo contract. Staff/Admin dùng chung trang duyệt: ảnh lớn có phóng to trong dialog, hai cột ở desktop và một cột ở mobile. Khi chưa có items, tự gộp thuốc/số lượng từ các đơn WaitingReview, ghi rõ mã đơn và yêu cầu đối chiếu ảnh; giữ chi tiết đã nhập khi đã có items. Ngày mặc định hôm nay tại Việt Nam, hiệu lực +30 ngày, focus người kê và đánh dấu bắt buộc.
  - Có khối đơn hàng liên quan với liên kết/trạng thái/dòng thuốc; phần tìm/sửa thuốc thu gọn khi có đơn online và mở sẵn với đơn tại quầy. Danh sách đối chiếu hiển thị tên và số lượng ngay trên mobile, không cần cuộn ngang để thấy lượng kê. Nút Lưu & chấp nhận khóa khi thiếu thông tin, dòng không hợp lệ hoặc đang gửi; giải thích phần thiếu, PUT details rồi approve. Toast dựa trên trạng thái backend trả về, chỉ nêu những đơn đã chuyển sang Chờ thanh toán; Từ chối vẫn bắt lý do.
  - Danh sách đơn Staff/Admin có liên kết Kiểm tra đơn thuốc cho WaitingReview (lấy prescriptionId từ GET chi tiết vì OrderRow chưa chứa mã này); dashboard dẫn tới danh sách lọc PendingReview. Bỏ hộp chờ duyệt trùng trên trang khách, gộp ghi chú vào Bước tiếp theo và gộp thông báo thanh toán xác nhận trên QR.
  - E2e mở rộng luồng checkout tải ảnh → hai đơn WaitingReview dùng cùng đơn thuốc → Staff thấy dòng tự gộp, ngày/hiệu lực/focus/thiếu người kê → phóng to ảnh → Lưu & chấp nhận → khách Chờ thanh toán → mở QR. Kiểm tra linkedOrders không lộ cho khách, bộ lọc dashboard, liên kết danh sách, hai/một cột và form đơn tại quầy mở sẵn. Bổ sung 6 ảnh TC26-F011/TC33-F014 ở 1366/390 px trong danh mục ảnh.

  - Kiểm chứng cuối D12: `npm run lint` sạch; `npm run build --workspace frontend` pass; `npm run test:e2e --workspace frontend` 24/24 ca pass (2,6 phút), backend SQLite thật, mock tắt, 1366/390 px và đủ 49 route mỗi viewport. Đã xem ảnh mới ở cả hai kích thước; số lượng đối chiếu thấy ngay trên mobile. Thêm 6 ảnh, tổng 99 ảnh trong danh mục. Kiểm tra UTF-8/phạm vi sửa và diff sạch; server thử nghiệm 3017/5017 đã dừng, không commit hoặc đổi nhánh.

- **M7 — `fe/m7-live-status`**:
  - Khách xem chi tiết đơn: GET mỗi 10 giây khi chưa kết thúc, dừng ở Completed/Cancelled/Rejected; tab ẩn tạm dừng, quay lại làm mới ngay. Hook polling dùng chung không khởi động lại bộ đếm sau mỗi phản hồi, khóa request trùng và bỏ phản hồi cũ khi đổi trang. Có chỉ báo Tự cập nhật/nút Làm mới; tải nền giữ dữ liệu, lỗi title hiển thị an toàn.
  - Phát hiện WaitingReview → AwaitingPayment với canPay: toast đơn thuốc đã duyệt, POST payment một lần và chuyển tới QR theo D6. Lỗi giữ trang đơn và nút mở QR, không tự POST lặp; khi phát hiện payment đã tạo thì bỏ lỗi cũ. Toast cho thanh toán xác nhận, mời nhận tại quầy, giao, hoàn tất, từ chối/hủy kèm lý do; stepper cập nhật ngay từ phản hồi backend.
  - Danh sách đơn cập nhật mỗi 15 giây khi trang đang xem còn đơn chưa kết thúc, cùng chính sách visibility và chỉ báo/nút làm mới. E2e cập nhật luồng D12 để khách tự tới QR, thêm duyệt qua API với polling thật ≤15 giây, kiểm tra đúng một POST và lỗi giữ đơn/thử lại thủ công. Thêm hai ảnh TC33-F017-auto-qr ở 1366/390 px.

  - Kiểm chứng cuối M7: `npm run lint` sạch; `npm run build --workspace frontend` pass; `npm run test:e2e --workspace frontend` 26/26 ca pass (3,0 phút), backend SQLite thật trên cổng riêng 3017/5017, đủ 49 route mỗi viewport. Kiểm tra polling thật ≤15 giây, lỗi/thử lại, visibility và dừng ở trạng thái kết thúc. Đã xem hai ảnh mới TC33-F017-auto-qr ở 1366/390 px; tổng 101 ảnh. Server thử nghiệm đã dừng; không commit hoặc đổi nhánh.

- **M8 — `fe/m8-quickpay-admin` (D13/D14)**:
  - Staff dùng chung hai nút Đã nhận đủ tiền/Chưa đủ tiền ở danh sách đơn, danh sách thanh toán và chi tiết đơn. Hộp xác nhận ngắn, mã giao dịch tùy chọn; xác nhận đủ chỉ gửi bankReference nếu có, backend tự xác định số tiền/thời điểm. Chuyển thiếu nhập số thực nhận và ghi chú; giữ PendingReview và hiện rõ reviewNote. Duyệt đủ gọi fulfill, toast mã hóa đơn; lỗi xuất kho giữ nút thử lại.
  - Cột Việc cần làm có thao tác theo trạng thái: kiểm tra đơn thuốc, xác nhận tiền, thử xuất kho, khách nhận thuốc, bắt đầu giao/đã giao xong. Ô lý do từ chối/hủy trên chi tiết đơn chỉ mở sau khi chọn thao tác; người xử lý chưa có hiện dấu gạch.
  - Dashboard Admin riêng: số tài khoản theo vai trò, thuốc đang bán/hết hàng, cảnh báo kho, số đơn theo trạng thái và 5 đơn mới nhất; đọc backend thật, đếm thuốc qua toàn bộ trang. Sidebar chỉ nhóm Quản lý. Dashboard/cuối sidebar có Làm việc như nhân viên; mọi trang Staff khi Admin dùng có thanh quay lại quản lý, sidebar nghiệp vụ và vai trò thực tế. Các route Admin thanh toán/bán tại quầy/đơn thuốc chuyển tới Staff tương ứng; liên kết trạng thái dashboard lọc danh sách đơn. Không bổ sung doanh thu/thu chi theo D14.
  - E2e cập nhật chuyển thiếu, xác nhận không mã từ danh sách đơn (body rỗng), xuất kho/hóa đơn và lỗi thử lại. Kiểm tra số liệu Admin đối chiếu API, menu 8 mục, chuyển giao diện nhân viên/quay lại, bộ lọc và redirect; thêm ảnh TC45-F018-one-tap/AC02-admin-dashboard ở 1366/390 px.

  - Kiểm chứng cuối M8: `npm run lint` sạch; `npm run build --workspace frontend` pass; `npm run test:e2e --workspace frontend` 28/28 ca pass (3,1 phút) trên 1366/390 px, backend SQLite thật, mock tắt, cổng riêng 3017/5017. Đủ 49 route mỗi viewport, kể cả redirect. Đã xem bốn ảnh mới; tổng 105 ảnh, UTF-8/phạm vi sửa/diff sạch. Server thử nghiệm đã dừng; không commit hoặc đổi nhánh.

- **M10 — `fe/m10-order-ready` (D15)**:
  - Bổ sung readyAt vào OrderView/OrderRow và ready vào API Staff. Danh sách/chi tiết dùng chung quy tắc thao tác sau xuất kho: Pickup chưa ready → Đã chuẩn bị xong → POST ready, toast báo khách; đã ready → Khách đã nhận thuốc. Hiện Sẵn sàng từ HH:mm theo giờ Việt Nam. Delivery dùng Đã chuẩn bị xong – Bắt đầu giao → ship, rồi Đã giao xong. Cột việc cần làm phân biệt Chuẩn bị đơn/Chờ khách đến lấy/Đang giao; nút khóa khi gửi và không hiện khi chưa có hóa đơn.
  - Khách đã thanh toán nhưng chưa ready thấy Nhà thuốc đang chuẩn bị đơn của bạn, không được mời đến quầy sớm. Polling hiện tại phát hiện readyAt và toast mời nhận thuốc, khối nổi bật/mã đơn lớn; giao hàng hiện Đơn hàng đang trên đường giao đến bạn và toast. Stepper Pickup thêm Sẵn sàng nhận trước Hoàn tất; badge chi tiết/danh sách chỉ hiện sẵn sàng ở Pickup Preparing có readyAt, trạng thái server vẫn giữ nguyên.
  - E2e Pickup kiểm tra xác nhận tiền → đang chuẩn bị → nút ready ở chi tiết/danh sách → khách tự thấy sẵn sàng/toast/stepper trong 15 giây → badge danh sách → nhận thuốc → khách tự thấy hoàn tất. Delivery kiểm tra nhãn nút mới và thông báo giao hàng tự cập nhật. Ca TC32/TC33 tự cấu hình QR qua API Admin để độc lập với thứ tự thử nghiệm. Thêm ảnh TC37-F015-ready-pickup ở 1366/390 px và chụp lại TC37-F015-delivering cùng các luồng liên quan.

  - Kiểm chứng cuối M10: `npm run lint` sạch; `npm run build --workspace frontend` pass; `npm run test:e2e --workspace frontend` 28/28 ca pass (3,6 phút), backend SQLite thật, mock tắt, cổng riêng 3017/5017. Đủ 49 route ở 1366/390 px. Đã sửa ca TC32/TC33: giữ route interceptor ổn định, chỉ trả lỗi cho POST đầu để không làm treo chuyển trang khi gỡ interceptor một lần; cấu hình QR độc lập. Đã xem ảnh ready/giao hàng, thêm hai ảnh và cập nhật hai ảnh yêu cầu (tổng 105 PNG). UTF-8/phạm vi sửa/diff sạch; server thử nghiệm đã dừng, không commit hoặc đổi nhánh.

## Câu hỏi cho PO
- Backend M4 (`/api/orders/{id}/payment` và `/api/invoices`) hiện chưa có endpoint trên server thật: frontend đã tích hợp sẵn fallback sang mock data chuẩn hình dạng contract v1. Khi backend M4 sẵn sàng, frontend sẽ tự động gọi backend thật mà không cần thay đổi code.

