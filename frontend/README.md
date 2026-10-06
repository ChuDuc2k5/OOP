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

> **Lưu ý về Mock Mode:** Khi đặt `NEXT_PUBLIC_USE_MOCK=true` (hoặc gắn `?mock=true` trên URL ở môi trường development), ứng dụng sẽ kích hoạt tầng Mock dữ liệu chuẩn theo SRS §8 và API Contract v1 (gồm 14 loại thuốc, tài khoản demo, tóm tắt dashboard, phân quyền giá Guest/User). Khi mock tắt, mọi API chỉ gọi backend thật; lỗi HTTP hoặc lỗi mạng được trả dưới dạng `ApiException`, không thay bằng dữ liệu giả.

Luồng thanh toán: đặt hàng thành công → `/orders/{id}` → người dùng bấm **Mở thanh toán QR** → trang QR gọi `POST /api/orders/{id}/payment` (idempotent). Thông tin nhận tiền và ảnh QR lấy nguyên từ `PaymentView`; QR là ảnh cố định, khách tự nhập đúng số tiền và nội dung chuyển khoản. Hóa đơn dùng `InvoiceView` từ backend, gồm `items[].allocations` để hiển thị lô xuất, hạn dùng và số lượng.

---

## 4. Tài khoản thử nghiệm (Demo Accounts - SRS §8)

Hệ thống hỗ trợ các tài khoản mẫu phục vụ kiểm thử và chấm đồ án:

| Tên đăng nhập | Mật khẩu | QVai trò (Role) | Giao diện sau đăng nhập (`homePath`) |
|---|---|---|---|
| `admin` | `Admin@12345` | `Admin` | `/admin` (Bảng điều khiển Quản trị viên) |
| `staff` | `Staff@12345` | `Staff` | `/staff` (Bảng điều khiển Nhân viên) |
| `user` | `User@12345` | `User` | `/` (Trang chủ sản phẩm có giá & giỏ hàng) |
| `user2` | `User@12345` | `User` | `/` (Khách hàng 2) |

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
│   │   ├── Footer.tsx                # Footer thông tin nhà thuốc & demo
│   │   ├── Sidebar.tsx               # Menu thanh bên cho Staff/Admin (NFR-05)
│   │   ├── ProductCard.tsx           # Thẻ sản phẩm với logic ẩn giá cho Guest
│   │   ├── HealthBadge.tsx           # Thẻ kiểm tra GET /api/health
│   │   └── MilestonePlaceholder.tsx  # Thông báo lộ trình cho các route M2/M3
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
