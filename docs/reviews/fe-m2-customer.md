# Review `fe/m2-customer` — CHANGES REQUESTED

Reviewer: PO · 2026-10-06 · HEAD `46ee96b`

## Đã kiểm tra
- `npm run lint` 0 lỗi, `npm run build` pass
- End-to-end với **backend thật** (SQLite): đăng nhập `user` → `/` → `/products/PARA500` hiện giá 1.000 ₫ → "Thêm vào giỏ hàng" (giỏ backend có PARA500×1) → `/checkout` → Admin đổi giá sang 1.200 ₫ giữa chừng → hộp thoại **PRICE_CHANGED** hiện đúng 1.000 → 1.200 ₫ → "Đồng ý đặt giá mới" tạo đơn `AwaitingPayment` 1.200 ₫ — **tốt**
- `/orders/[id]` hiện tổng đúng, nút "Mở thanh toán QR"/"Hủy đơn hàng" theo `canPay/canCancel`
- Cảnh báo SRS 6.2 nguyên văn, không có nút "đã chuyển khoản" — đúng
- Guard `useRequireAuth(['User'])` ở cart/checkout/orders/prescriptions/invoices; `?mock` chỉ khi không production; open redirect đã sửa (`lib/url.ts`)

## Phải sửa
| Mức | Vị trí | Vấn đề | Cách sửa |
|---|---|---|---|
| **MAJOR** | `lib/api.ts:628-680` (`isPendingBackendM4`) | Ở chế độ thật, khi backend trả 404/501/lỗi mạng cho `/api/orders/{id}/payment` hoặc `/api/invoices*`, FE **tự trả dữ liệu mock**. Test thực tế: đơn 1.200 ₫ nhưng trang QR hiện **108.000 ₫, "Ngân hàng Quân Đội (MB Bank)", "NHA THUOC DEMO GPP"** — khách có thể chuyển sai tiền/sai tài khoản. Sau M4, `GET payment` trả 404 hợp lệ khi chưa mở QR, hóa đơn ngoài phạm vi trả 404 → vẫn ra dữ liệu giả | Xóa hoàn toàn fallback. Chế độ thật **chỉ** gọi backend; lỗi thì hiển thị lỗi (`ApiException.title`). Mock chỉ khi `isMockMode()` |
| MINOR | `app/checkout/page.tsx:158` | Đặt hàng xong tự chuyển sang trang thanh toán ⇒ tự `POST /payment` (giữ hàng) mà khách chưa bấm "Thanh toán" (UC-02: đặt đơn → Chờ thanh toán → **bấm** Thanh toán mới mở QR) | Sau khi tạo đơn chuyển tới `/orders/{id}`; chỉ nút "Mở thanh toán QR" mới mở trang QR |
| MINOR | trang QR | Chữ "QUÉT MÃ VIETQR … điền tự động số tiền và nội dung" sai nghiệp vụ: QR là **ảnh cố định**, khách tự nhập số tiền/nội dung (SRS 6.2, BR-12) | Đổi thành "Quét mã QR để mở tài khoản nhận, sau đó tự nhập đúng số tiền và nội dung bên dưới" |

## Vòng 2 — APPROVED (2026-10-06, HEAD `443b50c`)
Dev tiếp quản frontend sửa toàn bộ mục trên. Kiểm tra lại end-to-end với backend M4 thật:
- Đặt hàng → chuyển tới `/orders/DH…` (không tự mở QR); nút "Mở thanh toán QR" → trang QR hiện **dữ liệu backend thật** (1.000 ₫, "Ngân hàng Demo", `0000000000`, ảnh `/api/files/qr/demo-qr.png`), có hướng dẫn QR cố định + cảnh báo SRS 6.2; không còn chữ VietQR
- Staff duyệt → fulfill → complete; `/invoices` và `/invoices/HD…` hiện đúng lô xuất LOT03 (FEFO), giá chốt, không phí ship
- Không còn fallback mock (`isPendingBackendM4` đã xóa)

Ghi chú cho M3/M4 (MINOR): nút "In hóa đơn" ngoài phạm vi F020 ("không làm in/xuất PDF") — có thể giữ `window.print()` nhưng không làm thêm; footer đang hiện tài khoản demo — chỉ để khi demo, bỏ ở bản nộp.
