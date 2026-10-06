# Review `fe/m1-foundation` — APPROVED (merge kèm việc phải sửa ở M2)

Reviewer: PO (Claude Code) · 2026-10-06 · commit `534db32`

## Đã kiểm tra
- `npm install`, `npm run lint` (0 lỗi), `npm run build --workspace frontend` (20 route) — **pass**
- Chạy `?mock=true`: trang chủ Guest hiển thị thuốc, **không có giá**, nút "Đăng nhập để mua" — đúng F004/BR-18
- `lib/api.ts`: `credentials: include`, CSRF tự lấy + `X-XSRF-TOKEN`, map ProblemDetails → `ApiException` — đúng contract §1.2/§1.4
- `next.config.mjs` rewrites `/api` → `BACKEND_URL ?? http://localhost:5000` — đúng D5
- Guard `/staff` (Staff, Admin), `/admin` (Admin); register không tự đăng nhập — đúng F001

## Phải sửa (làm đầu tiên trong `fe/m2-customer`)
| Mức | Vị trí | Vấn đề | Cách sửa |
|---|---|---|---|
| MAJOR | `app/login/page.tsx:52` | **Open redirect**: `router.replace(nextPath)` nhận mọi giá trị `?next=` (vd `//evil.com`, `https://evil.com`) | Chỉ chấp nhận chuỗi bắt đầu bằng `/` và không bắt đầu bằng `//` hoặc `/\`; ngược lại dùng `me.homePath`. Áp dụng cả `register` nếu chuyển tiếp `next` |
| MINOR | `app/page.tsx:61` | Bộ lọc OTC/Rx/Còn hàng chỉ lọc **trang hiện tại** ở client nên số lượng/phân trang sai lệch | Ghi rõ "lọc trong trang này" hoặc bỏ bộ lọc (contract không có tham số lọc) |
| MINOR | `lib/types.ts:499`, `HealthBadge` | `HealthCheck` không khớp backend thật `{ status: "ok", service }` | Đổi type thành `{ status: string; service: string }` |
| MINOR | `lib/api.ts:39` | `?mock=true` bật mock cả ở bản build production | Chỉ cho phép query `mock` khi `process.env.NODE_ENV !== 'production'` |
| MINOR | `/cart`, `/orders` | Trang giữ chỗ chưa có guard role User | Thêm `useRequireAuth(['User'])` khi làm M2 |
| INFO | `package.json` | `next lint` bị deprecated ở Next 16 | Không bắt buộc; có thể chuyển sang ESLint CLI ở M4 |
