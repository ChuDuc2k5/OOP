# Tổng hợp kết quả kiểm thử

Tài liệu giữ lại kết quả kỹ thuật đã ghi nhận của dự án. Các số liệu ngày 06–07/10/2026 là kết quả lịch sử, không phải kết quả chạy lại khi cập nhật báo cáo ngày 19/10/2026.

## Backend

Lượt ngày 07/10/2026 lúc 09:23:25 (UTC+07:00), catalog 33 sản phẩm:

- Build: 0 warning, 0 error.
- xUnit: **203 Pass / 0 Fail / 2 Skip**, tổng 205 trường hợp, khoảng 56 giây.
- Hai trường hợp Skip: kiểm thử PostgreSQL cần `PHARMACY_TEST_POSTGRES` và kiểm thử hiệu năng cần bật opt-in. Không tính Skip vào Pass.
- Seed: 33 sản phẩm, 33 ảnh, 77 lô; 10 sản phẩm cần đơn thuốc. Bộ dữ liệu kiểm thử riêng có các biên hết hạn, tồn thấp, hết hàng và thuốc kiểm soát.
- CatalogSeedTests kiểm tra seed tất định, ảnh, chỉ bổ sung dữ liệu thiếu và CLI chạy lặp không nhân đôi.

Chi tiết các test, số đo hiệu năng và những lượt trước đó nằm trong [TEST_REPORT_BE.md](TEST_REPORT_BE.md). Báo cáo này có cả lượt ban đầu bị Windows chặn và lượt chạy thành công về sau; cần đọc theo thời điểm, không gộp các kết quả thành một lần chạy.

Lượt PostgreSQL thực tế ngày 06/10/2026 đã ghi nhận migrate/seed, đăng nhập, tra cứu và khởi động lại không seed đè. Đây là kiểm chứng ở mốc M3.5, không xác nhận các thay đổi M12/M13 đã được chạy lại trên PostgreSQL.

## Frontend

Lượt ngày 07/10/2026:

- Playwright: **30/30 ca đạt**; lint và production build đạt.
- Chạy qua backend thật với SQLite riêng, frontend cổng 3017 và backend cổng 5017.
- Hai viewport: 1366 × 900 và 390 × 844; đối chiếu 49 route tại mỗi viewport.
- Danh mục, giỏ hàng, đơn thuốc, QR thủ công, trạng thái nhận/giao hàng và các lỗi quyền được kiểm tra theo bộ test.
- Kho ảnh đã ghi nhận 123 PNG; có cả ảnh lịch sử và ảnh chụp lại của luồng mới. Xem [hướng dẫn ảnh minh chứng](screenshots/README.md) và [bộ test Playwright](../frontend/e2e/pharmacy.spec.ts).

Các con số trên được chuyển từ hồ sơ kiểm chứng đã lưu trước khi dọn tài liệu điều phối. Không có lần chạy Playwright mới trong lượt cập nhật tài liệu này.

## Kiểm thử phục vụ báo cáo tuần 2

Ngày 19/10/2026 đã chạy lại `FefoDomainTests`, `InventoryTests`, `OrderingTests` và `FoundationTests`, cấu hình Release: **84 Pass / 0 Fail / 0 Skip**, thời lượng khoảng 50 giây. Đây là kết quả chạy mới cho một phần suite, không thay thế số liệu toàn suite lịch sử. Bộ lọc có cả một số test ordering/report ngoài domain core để kiểm tra hồi quy liên quan.

Danh sách test thực tế và lệnh tái hiện nằm trong [kết quả ngày 19/10/2026](test-results/WEEK2_DOMAIN_2026-10-19.md). Không chạy lại Playwright, PostgreSQL hoặc bài đo hiệu năng trong lần cập nhật này.
