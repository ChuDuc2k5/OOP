# Frontend — Pharmacy Management System

Ứng dụng web dành cho Nhà thuốc (Khách hàng, Nhân viên, Quản trị viên) được xây dựng trên nền tảng **Next.js (App Router)** + **React 19** + **TypeScript** + **Tailwind CSS**.

---

## 1. Yêu cầu & Cài đặt

- Node.js: `>= 20.0.0` (Khuyến nghị Node 22+)
- Quản lý gói: `npm` (monorepo npm workspaces)

Từ thư mục gốc của repository:
```bash
npm install
```

---

## 2. Lệnh thực thi

| Lệnh | Mô tả |
|---|---|
| `npm run dev:web` | Khởi chạy server phát triển Next.js ở cổng `3000` |
| `npm run build --workspace frontend` | Biên dịch tối ưu hóa production build của Next.js |
| `npm run lint --workspace frontend` | Kiểm tra cú pháp và quy chuẩn mã nguồn bằng ESLint |
| `npm run dev` | Khởi chạy đồng thời cả Backend API (.NET) và Frontend |

---

## 3. Cấu hình môi trường (`frontend/.env.local`)

Tạo file `frontend/.env.local` (sao chép từ `frontend/.env.example`):

```env
# Địa chỉ máy chủ Backend ASP.NET Core Web API
BACKEND_URL=http://localhost:5000

# Bật chế độ Mock độc lập (cho phép kiểm thử UI đầy đủ khi Backend chưa bật)
NEXT_PUBLIC_USE_MOCK=false
```

> **Chế độ phát triển:** Khi đặt `NEXT_PUBLIC_USE_MOCK=true` (hoặc gắn `?mock=true` trên URL ở môi trường development), ứng dụng kích hoạt tầng giả lập nội bộ. Giao diện không hiển thị dấu hiệu chế độ này hoặc gợi ý tài khoản. Khi mock tắt, mọi API chỉ gọi backend thật; lỗi HTTP hoặc lỗi mạng được trả dưới dạng `ApiException`, không thay bằng dữ liệu giả.

Luồng thanh toán: **Đặt hàng & thanh toán** → tạo đơn → nếu `AwaitingPayment` và `canPay`, mở payment ngay và chuyển tới QR. Đơn `WaitingReview` chuyển tới chi tiết, chờ dược sĩ duyệt trước khi thanh toán. Mở payment lỗi vẫn giữ đơn đã tạo, báo lỗi ở chi tiết và cho thử mở QR lại. Nút **Đóng / Về đơn hàng** chỉ điều hướng, không đổi trạng thái. Thông tin nhận tiền và ảnh QR lấy nguyên từ `PaymentView`; QR là ảnh cố định, khách tự nhập đúng số tiền và nội dung chuyển khoản. Hóa đơn dùng `InvoiceView` từ backend, gồm `items[].allocations` để hiển thị lô xuất, hạn dùng và số lượng.

---

## 4. Tài khoản khởi tạo

Backend khởi tạo các tài khoản sau khi database trống:

| Tên đăng nhập | Mật khẩu | Vai trò (Role) | Giao diện sau đăng nhập (`homePath`) |
|---|---|---|---|
| `admin` | `Admin@12345` | `Admin` | `/admin` (Bảng điều khiển Quản trị viên) |
| `staff` | `Staff@12345` | `Staff` | `/staff` (Bảng điều khiển Nhân viên) |
| `chuduc` | `User@12345` | `User` | `/` (Chu Đức) |
| `nguyenvana` | `User@12345` | `User` | `/` (Nguyễn Văn A) |

---

## 5. Cấu trúc thư mục

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router routes & layouts
│   │   ├── layout.tsx                # Root layout bọc AuthProvider
│   │   ├── page.tsx                  # Trang chủ (F004 danh sách thuốc, tìm kiếm, lọc)
│   │   ├── globals.css               # Tailwind CSS & custom scrollbar
│   │   ├── login/page.tsx            # Trang đăng nhập (F002)
│   │   ├── register/page.tsx         # Trang đăng ký khách hàng (F001)
│   │   ├── products/[drugId]/page.tsx# Trang chi tiết thuốc (F004)
│   │   ├── staff/                    # Khu vực nhân viên
│   │   │   ├── layout.tsx            # Layout bảo vệ quyền Staff/Admin + Sidebar
│   │   │   └── page.tsx              # Dashboard tóm tắt công việc nhân viên
│   │   └── admin/                    # Khu vực quản trị viên
│   │       ├── layout.tsx            # Layout bảo vệ quyền Admin + Sidebar
│   │       └── page.tsx              # Dashboard bảng điều khiển Admin
│   ├── components/                   # UI components tái sử dụng
│   │   ├── Header.tsx                # Header điều hướng chính
│   │   ├── Footer.tsx                # Footer thông tin nhà thuốc
│   │   ├── Sidebar.tsx               # Menu thanh bên cho Staff/Admin (NFR-05)
│   │   └── ProductCard.tsx           # Thẻ sản phẩm với logic ẩn giá cho Guest
│   ├── context/
│   │   └── AuthContext.tsx           # Context quản lý phiên đăng nhập & route guard
│   └── lib/
│       ├── api.ts                    # Fetch wrapper, tự lấy CSRF token, parse ApiError
│       ├── types.ts                  # Toàn bộ Type definitions theo API Contract v1
│       ├── format.ts                 # Định dạng tiền tệ VND, ngày tháng & nhãn trạng thái
│       └── mock-data.ts              # Tầng giả lập dữ liệu chuẩn SRS §8
├── next.config.mjs                   # Cấu hình Next.js rewrites /api sang BACKEND_URL
├── tailwind.config.ts                # Cấu hình màu sắc thương hiệu và layout
└── tsconfig.json                     # Cấu hình TypeScript
```

---

## 6. Kiến trúc & Bảo mật

1. **Next.js Rewrites (Cùng origin):** Mọi request tới `/api/...` từ trình duyệt được Next.js proxy ngầm sang `${BACKEND_URL}/api/...`. Do đó cookie xác thực `pharmacy.auth` là first-party, không gặp vấn đề CORS.
2. **Anti-Forgery (CSRF):** Trước các thao tác thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`), `lib/api.ts` tự động kiểm tra cookie `XSRF-TOKEN` (gọi `GET /api/auth/csrf` nếu chưa có) và gắn header `X-XSRF-TOKEN`.
3. **Phân quyền phía Client (NFR-02, NFR-05):**
   - Guest: Chỉ xem thông tin sản phẩm, không thấy giá bán, không được đặt mua. Bấm mua chuyển hướng sang `/login?next=...`.
   - User: Xem giá bán, truy cập giỏ hàng, đơn hàng. Nếu cố truy cập `/staff` hoặc `/admin` sẽ bị chuyển hướng về `/`.
   - Staff: Truy cập dashboard nhân viên `/staff`. Nếu cố truy cập `/admin` sẽ bị chuyển về `/staff`.
   - Admin: Toàn quyền truy cập cả `/admin` và `/staff`.

## 7. Nghiệp vụ Staff/Admin (M3)

| Trang | Chức năng |
|---|---|
| `/staff`, `/admin` | Dashboard từ backend, thẻ dẫn tới chức năng |
| `/staff/prescriptions`, `/new`, `/[id]` | Tìm/lọc, tiếp nhận đơn giấy, ảnh riêng tư, chi tiết và duyệt/hủy hiệu lực |
| `/staff/orders`, `/[id]` | Nhận xử lý, xuất kho/lập hóa đơn, giao/hoàn tất, từ chối/hủy |
| `/staff/payments` | Đối chiếu thực nhận; chuyển thiếu giữ chờ duyệt; ghi chú chưa duyệt |
| `/staff/sales`, `/new`, `/[id]` | Nháp OTC/Theo đơn, sửa dòng, issues, xác nhận tiền mặt rồi checkout |
| `/staff/inventory`, `/[drugId]` | Tồn thực tế/còn hạn/giữ/khả dụng và các lô |
| `/staff/reports` | Tồn thấp, sắp hết hạn theo số ngày |
| `/staff/invoices`, `/[id]` | Hóa đơn và lô xuất; dùng chung component với khách |
| `/admin/accounts` | Tìm/lọc tài khoản, tạo Staff |
| `/admin/drugs`, `/new`, `/[drugId]` | Danh mục thuốc, ảnh, bật/tắt bán, nhập lô |
| `/admin/settings/payment` | Ngân hàng/tài khoản, ảnh QR cố định và xem trước |

Các trang nghiệp vụ Staff có route tương ứng dưới `/admin`, dùng lại component trong `src/components/backoffice`. Hóa đơn dùng component trong `src/components/invoices`. Tầng API `lib/backoffice-api.ts` gọi `apiFetch` hiện có để giữ cookie, CSRF và lỗi ProblemDetails. Không có fallback dữ liệu giả.

Kiểm thử curl qua frontend proxy khi cả backend và frontend đang chạy:

```bash
node frontend/scripts/smoke-backoffice.mjs
```

Chạy lệnh từ gốc repository với SQLite riêng dành cho kiểm thử và dữ liệu seed. Script tạo giao dịch, tài khoản/thuốc/lô thử và thay cấu hình QR trong database đó; mặc định gọi `http://localhost:3000/api`. Dùng `SMOKE_BASE_URL` nếu frontend chạy ở địa chỉ khác. Cookie/file gửi tạm được xóa sau kiểm thử, kết quả mã giao dịch được lưu trong thư mục tạm hệ điều hành. Không thực hiện chuyển tiền ngân hàng.

## Phản hồi thao tác M5

Toast dùng chung cho thao tác ghi, tự đóng sau khoảng 4 giây và có nút đóng. Giỏ hàng đồng bộ từ backend sau thay đổi, badge chỉ hiện với khách hàng đã đăng nhập. Nút gửi có spinner và khóa khi đang xử lý. Chi tiết đơn có tiến trình, hộp “Bước tiếp theo” và banner sau đặt hàng; đơn thuốc có banner sau gửi ảnh. Trang QR tự kiểm tra trạng thái mỗi 15 giây, có nút làm mới và thông báo khi được xác nhận; không có nút xác nhận tự chuyển tiền.

Theo D6–D9, chi tiết đơn tự làm mới mỗi 15 giây, giữ nút xem lại QR khi chờ xác nhận. Đơn Pickup đã thanh toán hiện lời mời đến quầy và mã đơn lớn; Delivery hiện đang chuẩn bị/đang giao. Form **Xác nhận đã nhận tiền** dùng chung cho Staff/Admin ở danh sách thanh toán và chi tiết đơn: review đủ tiền → fulfill ngay; lỗi xuất kho giữ thanh toán và nút **Thử xuất kho lại**. Pickup có **Khách đã nhận thuốc**, Delivery có **Bắt đầu giao** rồi **Đã giao xong**. Thuốc hết hàng vẫn được hiển thị nhưng khóa thêm giỏ; số lượng vượt tồn bị backend từ chối bằng lỗi 409 và toast.

D10: đăng ký tự lấy phiên đăng nhập và chuyển tới `next` an toàn hoặc trang chủ. Checkout tự chọn loại đơn theo giỏ; giỏ có thuốc kê đơn/kiểm soát có thể chọn đơn đã gửi hoặc tải PNG/JPG tối đa 5 MB ngay tại checkout. Thông tin người nhận được nhớ trong localStorage theo userId sau khi tạo đơn thành công. Form duyệt tiền điền sẵn số tiền cần nhận và giờ hiện tại; đơn thuốc có nút **Lưu & chấp nhận**. Bán tại quầy dùng một màn hình chọn thuốc/sửa dòng/xem tổng và **Thu tiền mặt & hoàn tất**, tự tạo đúng loại nháp rồi lưu dòng và checkout. Lỗi giữ dữ liệu và liên kết nháp, thử lại dùng cùng nháp. Form thêm thuốc Admin hỗ trợ ảnh và lô đầu tiên tùy chọn; nếu bước sau lỗi, giữ thuốc đã tạo và liên kết chi tiết.

## Kiểm thử giao diện M4/M5 với backend thật

Yêu cầu Node.js 20+, .NET SDK phù hợp với backend và cổng 3017/5017 trống. Chạy từ thư mục gốc:

```bash
npm install
node frontend/e2e/run.mjs install chromium
npm run lint
npm run build --workspace frontend
npm run test:e2e --workspace frontend
```

Playwright là devDependency của workspace frontend, dùng `package-lock.json` ở gốc. Thêm hoặc cập nhật bằng `npm install -D @playwright/test --workspace frontend`; không tạo lockfile riêng trong frontend.

Lệnh e2e tự build backend và frontend với proxy backend cổng 5017, chạy frontend production ở cổng 3017 và trực tiếp chạy DLL backend trong môi trường Development với SQLite riêng trong thư mục tạm. Build kiểm thử nằm trong `frontend/.next-e2e`, tách khỏi `.next` của môi trường làm việc. Backend tự seed tài khoản, thuốc và lô; bước chuẩn bị đăng nhập Admin qua API, cấu hình tài khoản nhận tiền và tải ảnh QR từ fixture `e2e/fixtures/payment-qr.png`. Tài khoản khách là `chuduc` và `nguyenvana`; thuốc dùng mã có nghĩa như `VITC500`, `AMOX500`. Ngày nghiệp vụ cố định 06/10/2026 để lô seed còn hạn. Mock luôn tắt; database làm việc của dev không được dùng. Runner kiểm tra cổng trước khi chạy và dừng các tiến trình do nó khởi tạo qua IPC sau kiểm thử; không đóng server của người dùng ở cổng 3000/5000.

Trình duyệt mặc định nằm trong thư mục tạm `pharmacy-playwright`. Có thể đổi bằng biến môi trường `PLAYWRIGHT_BROWSERS_PATH` trước cả lệnh install và test. Nếu máy không tải được Chromium, cài trình duyệt ở môi trường có quyền truy cập mạng rồi chạy lại; không bỏ qua kiểm thử để báo pass.

Hai project chạy tuần tự ở 1366×900 và 390×844:

- Guest: danh sách và chi tiết thuốc không có giá.
- User: đặt OTC tại quầy/giao hàng → QR ngay → đóng về đơn vẫn chờ xác nhận; kiểm tra ảnh, số tiền, banner đặt hàng và trạng thái tự cập nhật. Đơn thuốc chờ duyệt chưa mở QR; lỗi mở QR giữ đơn và cho thử lại.
- User: thêm giỏ từ chi tiết/thẻ sản phẩm, toast và liên kết xem giỏ; badge sau thêm/đổi/xóa; khóa bấm lặp, giữ giỏ khi lỗi mạng, tự đóng toast. Kiểm tra banner đặt hàng, hộp bước tiếp theo khi chờ duyệt, ghi chú chuyển thiếu và QR tự cập nhật khi Staff duyệt đủ. Gửi ảnh đơn thuốc và kiểm tra banner chờ dược sĩ.
- Staff: xác nhận chuyển thiếu/đủ → tự xuất kho/lập hóa đơn → khách nhận tại quầy hoặc bắt đầu giao/giao xong. Ngắt request fulfill để kiểm tra thanh toán vẫn Confirmed và thử xuất kho lại thành công. Thuốc hết hàng bị khóa; thêm quá tồn trả 409 INSUFFICIENT_STOCK thật từ backend.
- User: hóa đơn có allocations lô xuất; bị chuyển về trang chủ khi vào `/staff`.
- Đăng ký: cookie XSRF-TOKEN cũ → 400 ANTIFORGERY_INVALID → lấy token mới và gửi lại → 201 → GET me → phiên User và `next` an toàn. Checkout: loại OTC tự động, tải ảnh đơn thuốc tại chỗ, giỏ hỗn hợp OTC/kê đơn chờ kiểm tra. Lỗi PAYMENT_NOT_CONFIGURED giữ đơn và hiển thị thông báo tiếng Việt, không lộ mã lỗi.
- Staff: duyệt tiền với số tiền/giờ điền sẵn; lưu/chấp nhận đơn thuốc một nút; bán OTC tại quầy một màn hình, checkout lỗi giữ nháp rồi thử lại không tạo nháp mới. Admin: thêm thuốc kèm ảnh và lô đầu tiên.
- D12: khách tải ảnh tại checkout và đặt thuốc kê đơn; Staff đi từ dashboard lọc PendingReview hoặc liên kết “Kiểm tra đơn thuốc” trong danh sách đơn. Trang duyệt dùng linkedOrders để gộp dòng từ nhiều đơn WaitingReview, mặc định ngày kê/hiệu lực +30 ngày, focus người kê, khóa chấp nhận khi thiếu. Kiểm tra ảnh phóng to, thu gọn/mở tìm thuốc, bố cục hai/một cột, toast sau duyệt và khách chuyển sang chờ thanh toán/mở QR. Ảnh TC26-F011-online-prefilled/online-approved và TC33-F014-prescription-approved ở cả hai viewport.
- Admin: lỗi theo trường giữ dữ liệu; lưu tài khoản, chọn ảnh PNG, xem trước và tải QR.
- Rà các route khách/Staff/Admin: loading, rỗng, lỗi mạng, chiều rộng trang, bảng cuộn trong khung và sidebar mobile; không hiển thị dấu hiệu chế độ phát triển hoặc gợi ý tài khoản. Lỗi mạng được tạo bằng cách ngắt request; trạng thái QR chưa cấu hình được kiểm tra thêm bằng phản hồi lỗi có kiểm soát.

Ảnh có mã TC/F và hậu tố 1366/390 trong `docs/screenshots/`; danh mục ở `docs/screenshots/README.md`. Báo cáo HTML ở `frontend/playwright-report/`, trace khi lỗi ở `frontend/test-results/` (đều được gitignore).

```bash
# Chỉ chạy một viewport
npm run test:e2e --workspace frontend -- --project=390
# Mở báo cáo vừa chạy
node frontend/e2e/run.mjs show-report frontend/playwright-report
```

Build e2e không thay cấu hình proxy của build `.next` dùng cho môi trường dev/production thông thường.
