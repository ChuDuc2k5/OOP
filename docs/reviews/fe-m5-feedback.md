# Review `fe/m5-feedback` — APPROVED

Reviewer: PO · 2026-10-06 · gồm 4 đợt theo phản hồi người dùng (D6–D11)

## Nội dung
- Phản hồi trạng thái: toast mọi thao tác, badge giỏ, nút khóa khi gửi, stepper + "Bước tiếp theo" ở đơn hàng, QR tự làm mới 15s
- D6 "Đặt hàng & thanh toán" mở QR ngay, nút "Đóng / Về đơn hàng" chỉ điều hướng
- D7 Pickup: "Mời đến quầy nhận thuốc" + mã đơn lớn; D8 Staff một nút "Xác nhận đã nhận tiền" (review → fulfill), "Khách đã nhận thuốc"; bỏ "Nhận xử lý"
- D9 thuốc hết hàng: nhãn "Hết hàng", nút "Tạm hết hàng" khóa
- D10 đăng ký tự đăng nhập; checkout tự xác định loại đơn + tải ảnh đơn thuốc tại chỗ; tự điền người nhận; form duyệt tiền điền sẵn; "Lưu & chấp nhận"; bán tại quầy một màn hình; Admin tạo thuốc kèm ảnh + lô đầu
- D11 bỏ mọi dấu hiệu demo/mock/HealthBadge/gợi ý tài khoản; mã thuốc/tài khoản mới; báo rõ khi chưa cấu hình QR
- Bỏ VAT, phí ship, mã SRS hiển thị

## Kiểm tra của PO
- Bấm thử trên trình duyệt với backend thật: thêm giỏ → toast + badge; Vitamin C hết hàng → "Tạm hết hàng" disabled; checkout không VAT/phí ship → 1 nút ra QR → "Đóng" → "Đang chờ nhà thuốc xác nhận thanh toán. Bạn không cần thao tác thêm."; Staff "Xác nhận đã nhận tiền" → "Đã xác nhận tiền và lập hóa đơn HD…"; "Khách đã nhận thuốc" → Hoàn tất; đăng ký → tự đăng nhập; bán tại quầy: chọn thuốc → "Thu tiền mặt & hoàn tất" → mở hóa đơn
- PO phát hiện lỗi token XSRF cũ khi đăng ký sau khi backend khởi động lại → dev đã sửa (tự lấy token mới, thử lại 1 lần) + e2e
- PO tự chạy `npm run test:e2e`: **24/24 pass** (1366 + 390 px); lint sạch, build pass
