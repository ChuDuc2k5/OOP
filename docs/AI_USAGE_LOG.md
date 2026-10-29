# Nhật ký sử dụng AI

## Phạm vi hỗ trợ đã ghi nhận

Nhóm có sử dụng AI trong quá trình phát triển. Tài liệu quy trình và prompt đã lưu ở các phiên bản trước ghi nhận Claude Code hỗ trợ tài liệu và review, ChatGPT Codex hỗ trợ backend, Antigravity hỗ trợ frontend. Việc ghi nhận này phản ánh phạm vi công cụ được sử dụng, không xác định công cụ đã tạo ra từng dòng code.

| Công việc | Hỗ trợ từ AI | Tình trạng bằng chứng |
|---|---|---|
| SRS, kiến trúc, API | Soạn và chỉnh tài liệu theo yêu cầu | Có tài liệu và lịch sử Git; chưa có nhật ký đầy đủ theo phiên |
| Backend, frontend và test | Tạo, sửa mã nguồn và đề xuất cách kiểm thử | Có mã nguồn, diff và kết quả kiểm thử lịch sử; chưa có ánh xạ prompt tới từng commit |
| Kiểm tra thay đổi | Hỗ trợ đọc diff, ghi vấn đề và tổng hợp kết quả | Hồ sơ cũ ghi nhận hoạt động hỗ trợ; không xem đây là bằng chứng sinh viên tự review toàn bộ |

## Yêu cầu đã dùng cho lần cập nhật này

Yêu cầu người dùng: kiểm tra repo, xóa các tài liệu task giao AI viết/sửa/review code và hỗ trợ viết lại báo cáo tuần 2. Sau đó người dùng cung cấp tài liệu `Ke_Hoach_4_Tuan_OOP_Pharmacy_Management_System.docx` và yêu cầu đọc để đối chiếu.

Các prompt phát triển trước đây yêu cầu triển khai theo SRS/API, sửa lỗi và kiểm tra build/test. Đây là tóm tắt nội dung đã ghi nhận, không phải bản chép nguyên văn đầy đủ của mọi phiên làm việc.

## Model và vai trò của thành viên

Tài liệu cũ không ghi đủ tên model và phiên bản của từng phiên. Khi biểu mẫu yêu cầu thông tin này, cần lấy từ lịch sử sử dụng thực tế; không suy đoán từ tên ứng dụng.

Nhóm đã xác nhận Lê Anh Đức phụ trách FE M5/M6 và BE M5/M6/M12/M13; tác giả của 12 commit triển khai tương ứng đã được sửa từ danh tính commit nhầm. Tên tác giả commit ghi nhận đóng góp theo xác nhận của nhóm, không tự chứng minh toàn bộ mã nguồn được viết thủ công hoặc không có hỗ trợ AI.

Chu Ngọc Việt Đức phụ trách tổng hợp repo và các phần triển khai còn lại theo lịch sử, với hỗ trợ AI đã nêu. Bảng phân công trong kế hoạch 4 tuần là kế hoạch trách nhiệm; không dùng nó để thay thế chứng cứ công việc đã hoàn thành.

## Cách kiểm chứng và giới hạn

Mã nguồn có unit/integration test và Playwright; các kết quả đã lưu được tổng hợp trong [TEST_STATUS.md](TEST_STATUS.md). Báo cáo tuần 2 chỉ ra class/method và test liên quan để đối chiếu. Các lần kiểm tra mới phải ghi kết quả thực tế, không dùng kết quả cũ để tuyên bố chạy thành công trong lần cập nhật này.

## Bổ sung theo nhận xét giảng viên, 19/10/2026

Giảng viên yêu cầu link file code cụ thể, khai báo AI hỗ trợ viết code/báo cáo và minh chứng chỉnh sửa qua commit. Codex hỗ trợ bổ sung mục 7 và 12 trong báo cáo: URL trực tiếp tới file C#/TSX, mô tả trước–sau của các commit đã kiểm tra, công cụ AI, yêu cầu đã dùng, phần AI thực hiện, phần sinh viên xác nhận và giới hạn nhật ký model. Lần này chỉ sửa tài liệu; không có lượt chạy test mới. Kết quả 84 test là lượt chạy đã hoàn thành trước đó trong ngày.
