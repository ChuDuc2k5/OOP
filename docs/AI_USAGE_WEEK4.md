# Khai báo sử dụng AI tuần 4

## Công cụ và model

- Công cụ trong lần hoàn thiện này: **OpenAI Codex**.
- Model/phiên bản: **không ghi nhận chính xác mã model cụ thể của phiên**. Không suy đoán từ tên ứng dụng hoặc tên model được dùng ở các phiên trước.
- Ngày thực hiện: **29/10/2026**.

## Yêu cầu trực tiếp đã dùng

1. “tiếp tục làm báo cáo tuần 4 cho tôi”, kèm kế hoạch 4 tuần của nhóm.
2. “chưa có test và demo mới, bạn làm cho tôi, nhớ là chia việc cho 2 người như tuần 3 nhé, gắn link đầy đủ”.
3. “thêm phần AI để thêm vào báo cáo”.
4. “phần minh chứng AI này bạn để riêng cho tôi copy nhé”.

Các dòng trên là yêu cầu người dùng đã gửi; không phải nhật ký đầy đủ của mọi prompt phát triển từ đầu dự án.

## Đầu ra do AI hỗ trợ thực hiện

- Đọc kế hoạch, rubric, code và bằng chứng cũ; nhận diện phần tuần 4 còn thiếu.
- Tạo QuantityLimitedOTCSale, runner nhận Sale, console sáu scenario và 10 test riêng. Demo không sửa các lớp sản phẩm hiện có, nhưng chỉ mở rộng domain validation, không giả định API/EF tự hỗ trợ subtype mới.
- Thêm Week4IntegrationTests: tạo thuốc/lô → checkout/FEFO → giá/hóa đơn/báo cáo; chặn OTC thuốc kiểm soát; chặn lô hết hạn sau khi tạo nháp.
- Cài dependencies của repo để chạy test, dùng API Release, chọn Chrome đã cài và tách thư mục ảnh E2E. Chỉnh predicate analyzer trong test mới.
- Chạy backend, test demo, console demo, frontend lint/build và Playwright. Kết quả thực tế: backend 206 Pass/0 Fail/2 Skip; extension 10/10; console 6/6; Playwright 30/30. Ba test mới kiểm tra lại riêng là tập con, không cộng lặp.
- Tạo/cập nhật sơ đồ cốt lõi domain/services, source draw.io, hồ sơ kết quả, README, Self-Explanation/10 câu hỏi, báo cáo và nội dung khai báo AI riêng.

## Cách kiểm chứng và phần đã điều chỉnh

- Đối chiếu điều kiện ngày, lượng giữ, quyền/chủ sở hữu và chữ ký phương thức với source.
- TRX cho kết quả từng trường hợp; JSON reporter cho Playwright và ảnh mới tách khỏi lịch sử. Không dùng số liệu 54 giây của máy khác ở tuần 3 làm số đo tuần 4.
- Demo in actual/expected và exit code; test kiểm giới hạn 1/2/3, thuốc cần đơn/kiểm soát, trạng thái hoàn tất, quota và subtype cũ.
- Kiểm tra diff: các lớp trong backend/Pharmacy.Core và backend/Pharmacy.Api giữ nguyên, bổ sung ví dụ/test/tài liệu.
- Sửa cảnh báo Assert.Single và xử lý lỗi khóa DLL bằng cách không build lại API đang chạy E2E; không biến các lần chuẩn bị chưa chạy test thành Pass.
- Hai sơ đồ mới sửa cách mô tả completion effects và chữ ký service so với hình cũ, có chú thích phạm vi và lớp chỉ thuộc examples.

## Phần sinh viên cung cấp và trách nhiệm

Người dùng cung cấp tài liệu kế hoạch, yêu cầu thực hiện test/demo, cách chia trách nhiệm và định dạng khai báo AI. Không ghi người dùng đã tự viết các file mới, tự chạy các lệnh hoặc tự trả lời mock defense nếu chưa có xác nhận. Code/test/UML/tài liệu của phiên này được Codex thực hiện theo chỉ đạo; hai thành viên cần tự đọc, kiểm tra, diễn đạt lại và thao tác khi bảo vệ.

Phân công trách nhiệm chuẩn bị trình bày như tuần 3: Chu Ngọc Việt Đức tập trung luồng bán hàng, đơn thuốc, thanh toán/hóa đơn; Lê Anh Đức tập trung hardening, extension/đa hình, inventory/report tests và minh chứng AI. Cả hai cần hiểu toàn bộ hệ thống.

## Giới hạn

Chưa chạy PostgreSQL/performance opt-in và chưa xác nhận mock defense. Bộ 10 câu hỏi là tài liệu chuẩn bị có AI hỗ trợ; không tuyên bố đã được sinh viên tự soạn độc lập hoặc đã trả lời thành công. Reflection trải nghiệm cá nhân phải được mỗi thành viên tự xác nhận. Model không được ghi đủ thì để đúng là chưa ghi nhận.

## Liên kết kiểm chứng

- [Code demo](../examples/Week4.ExtensibilityDemo/QuantityLimitedOTCSale.cs)
- [Test tích hợp](../backend/Pharmacy.Tests/Week4IntegrationTests.cs)
- [Minh chứng chạy mới](test-results/WEEK4_FINAL_2026-10-29.md)
- [Báo cáo](WEEK4_FINAL_REPORT.md)
- [Self-Explanation và chuẩn bị bảo vệ](WEEK4_SELF_EXPLANATION_DEFENSE.md)
