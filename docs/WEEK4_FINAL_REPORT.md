BÁO CÁO TUẦN 4 VÀ TỔNG KẾT ĐỒ ÁN
Đề tài: Pharmacy Management System – Hệ thống quản lý nhà thuốc
Môn học: Lập trình hướng đối tượng, HK1 2026–2027
GVHD: Huỳnh Xuân Phụng
Thành viên: Chu Ngọc Việt Đức (23110016), Lê Anh Đức (23110017)
Ngày cập nhật: 29/10/2026
Trọng tâm: tích hợp, kiểm thử hồi quy, demo mở rộng, UML, tài liệu và chuẩn bị bảo vệ.

Repository:
https://github.com/ChuDuc2k5/OOP

1. MỤC TIÊU TUẦN

Theo Kế_Hoạch_4_Tuần_OOP_Pharmacy_Management_System, tuần 4 tập trung chạy luồng tạo thuốc/lô đến bán hàng, validation, checkout, giảm kho và kiểm tra tổng tiền; chạy các trường hợp lỗi và đa hình; hồi quy; hoàn thiện UML, README, Self-Explanation và nhật ký AI. Rubric bổ sung yêu cầu demo mở rộng bằng biến thể mới không sửa lớp có sẵn, bộ 10 câu hỏi/đáp án và reflection.

Kết quả lần hoàn thiện này: thêm demo QuantityLimitedOTCSale ở tầng domain, ba test tích hợp mới, chạy lại backend và giao diện, cập nhật sơ đồ lớp cốt lõi và chuẩn bị tài liệu bảo vệ. Các kết quả kiểm thử dưới đây là lượt chạy mới ngày 29/10, tách khỏi kết quả tuần 2/3. Việc thực hiện có hỗ trợ AI và được ghi rõ tại mục 12.

2. CÔNG VIỆC VÀ ĐẦU RA ĐÃ HOÀN THÀNH

- Giữ nguyên các lớp sản phẩm trong Pharmacy.Core/Pharmacy.Api; thêm biến thể minh họa, runner và bộ test riêng trong examples/.
- Thêm Week4IntegrationTests cho luồng tạo thuốc/lô, checkout, FEFO, giá, hóa đơn và báo cáo; từ chối OTC thuốc kiểm soát; từ chối lô hết hạn sau khi lưu nháp.
- Chạy hồi quy backend: 206 Pass / 0 Fail / 2 Skip, tổng 208 trường hợp.
- Chạy bộ test mở rộng: 10 Pass / 0 Fail / 0 Skip; console demo đạt 6/6 scenario dự kiến.
- Chạy lại giao diện với backend thật: 30 Pass / 0 Fail / 0 Skip, hai viewport 1366×900 và 390×844; production build và lint đạt.
- Cập nhật sơ đồ domain/services cốt lõi, file draw.io, hướng dẫn chạy demo/test và 10 câu hỏi bảo vệ.

Nguồn số liệu chi tiết, thời điểm, danh sách test và dữ liệu gốc:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/WEEK4_FINAL_2026-10-29.md

3. CẬP NHẬT THIẾT KẾ VÀ DEMO MỞ RỘNG

3.1. Thiết kế sản phẩm

Frontend Next.js gọi ASP.NET Core Web API; Domain giữ trạng thái/quy tắc, Services điều phối nghiệp vụ, Data dùng EF Core và SQLite. Luồng online tách Payment Confirmed khỏi xuất kho/tạo hóa đơn. Luồng tại quầy yêu cầu xác nhận nhận tiền mặt. Khóa InventoryLock dùng SemaphoreSlim trong một tiến trình; không coi đó là khóa phân tán.

Kiến trúc và API:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/ARCHITECTURE.md
https://github.com/ChuDuc2k5/OOP/blob/main/docs/API_CONTRACT.md

3.2. Biến thể mới không sửa lớp sản phẩm hiện có

QuantityLimitedOTCSale kế thừa Sale, thêm MaxUnitsPerDrug và ghi đè Validate(). Nếu mua vượt giới hạn mỗi thuốc, kết quả có mã PURCHASE_LIMIT_EXCEEDED. Biến thể kết hợp validator OTCSale hiện có, nên vẫn chặn thuốc cần đơn/thuốc kiểm soát; không tự thay thế quy tắc đó bằng kiểm tra số lượng.

SaleValidationRunner.Evaluate(Sale, SaleContext) gọi sale.Validate(context) cho OTCSale, PrescriptionSale và QuantityLimitedOTCSale. Demo chỉ thêm file, không sửa Sale.cs, Drug.cs, Prescription.cs, factory hay EF mapping của sản phẩm. Diff để kiểm chứng:
https://github.com/ChuDuc2k5/OOP/commit/70250b6d934add9f43d5d524d90d4dc3dd90e22e

Biến thể mới, caller và chương trình demo:
https://github.com/ChuDuc2k5/OOP/blob/main/examples/Week4.ExtensibilityDemo/QuantityLimitedOTCSale.cs
https://github.com/ChuDuc2k5/OOP/blob/main/examples/Week4.ExtensibilityDemo/SaleValidationRunner.cs
https://github.com/ChuDuc2k5/OOP/blob/main/examples/Week4.ExtensibilityDemo/Program.cs
https://github.com/ChuDuc2k5/OOP/blob/main/examples/Week4.ExtensibilityDemo/README.md

Phạm vi minh chứng: mở rộng domain validation qua abstraction Sale. Biến thể mẫu chưa được đăng ký trong SaleKind factory hoặc EF Core, nên không tuyên bố API/website đã hỗ trợ loại bán này đầu-cuối. Giới hạn mua là quy tắc minh họa cho bài OOP, không phải quy định pháp lý về cấp thuốc.

3.3. UML cập nhật theo code

Sơ đồ domain thể hiện Sale và hai subtype sản phẩm, biến thể mẫu, Drug/DrugBatch, Prescription/PrescriptionItem, SaleItem, BatchAllocation và Invoice. Sơ đồ services thể hiện các interface và phụ thuộc cốt lõi. Chọn các thành viên cần giải thích; có chú thích những module/DTO không mở rộng trong hai hình, không trình bày đây là toàn bộ mọi lớp của repo.

Domain:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/diagrams/WEEK4_DOMAIN_FINAL.png
Services và interfaces:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/diagrams/WEEK4_SERVICES_FINAL.png
File nguồn chỉnh sửa, gồm hai trang:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/diagrams/WEEK4_FINAL.drawio

Các điểm đã đối chiếu: Drug.GetAvailableQuantity nhận ngày và lượng giữ; NearExpiry nhận days và lấy ngày từ IBusinessClock; Sale.ApplyCompletionEffects là virtual, chỉ PrescriptionSale override trong code sản phẩm; OTCSale kế thừa mặc định. Sơ đồ mới tách lớp mẫu khỏi pipeline production.

4. CHI TIẾT TRIỂN KHAI VÀ LUỒNG NGHIỆP VỤ

4.1. Happy path qua HTTP API và SQLite

W4_01 tạo thuốc W4OTC giá 2.500, ngưỡng tồn thấp 4; nhập lô FIRST số lượng 3 hạn D+1 và SECOND số lượng 5 hạn D+10. Staff tạo Sale OTC mua 4 đơn vị và checkout với cashReceived=true. Test kiểm Sale Completed, tổng tiền 10.000, hóa đơn có lượng 4 và giá 2.500; allocation là 3 từ FIRST và 1 từ SECOND. Kho còn FIRST=0, SECOND=4; báo cáo tồn thấp có thuốc tại đúng ngưỡng và báo cáo sắp hết hạn chỉ còn lô có hàng. Checkout lặp bị INVALID_STATE và không làm đổi snapshot dữ liệu.

Đây là kiểm thử tích hợp qua ASP.NET TestServer và SQLite; không gọi nó là kiểm thử trình duyệt. Luồng trình duyệt thực tế được kiểm riêng bằng Playwright ở mục 6.

4.2. Error scenarios

W4_02 tạo thuốc kiểm soát và lô còn hạn, lập nháp OTC rồi checkout: API trả PRESCRIPTION_REQUIRED, dữ liệu kho/hóa đơn giữ nguyên. W4_03 tạo nháp khi lô còn hạn, đổi ngày nghiệp vụ qua thời điểm hết hạn rồi checkout: trả INSUFFICIENT_STOCK; Sale vẫn Draft, lượng kho không bị trừ và chưa có hóa đơn. Hồi quy TC51 kiểm thêm thiếu hàng nhiều dòng và lỗi ghi hóa đơn gây rollback.

Test mới:
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/Week4IntegrationTests.cs

4.3. Thuốc theo đơn, thanh toán và hóa đơn

Prescription.Validate kiểm trạng thái Approved, bệnh nhân và khoảng ngày bao gồm hai đầu mút. PrescriptionSale.Validate kiểm thuốc/hạn mức sau lượng đã cấp và lượng giữ; với online còn kiểm chủ đơn. RecordDispense bảo vệ lượng đã cấp. ManualPaymentService.Review xác nhận tiền, còn CheckoutService.Fulfill kiểm lại điều kiện và xuất kho. Nếu fulfill lỗi thì giữ Payment đã Confirmed từ bước trước để xử lý tiếp.

Mã đối chiếu:
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Domain/Prescription.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Domain/Sale.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Services/CheckoutService.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Services/ManualPaymentService.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Services/InvoiceService.cs

5. SELF EXPLANATION VÀ ĐỐI CHIẾU KIẾN THỨC OOP

Encapsulation: DrugBatch.Quantity có private set; Deduct() kiểm số lượng dương, hạn dùng và đủ kho trước khi trừ. PrescriptionItem.DispensedQuantity tăng qua RecordDispense(). Collection trả qua IReadOnlyCollection và AsReadOnly ngăn caller sửa cấu trúc danh sách trực tiếp; không có nghĩa phần tử bên trong bất biến.
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Domain/Drug.cs

Polymorphism: SaleEvaluation.Evaluate nhận Sale và gọi Validate theo đối tượng thực tế. Checkout gọi ApplyCompletionEffects qua Sale; PrescriptionSale cập nhật lượng cấp, OTC dùng mặc định. Demo tuần 4 thêm subtype giới hạn số lượng vào cùng contract mà không thay định nghĩa lớp cũ.
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Services/SaleEvaluation.cs

SRP: Sale giữ quy tắc loại bán; InventoryService/InventoryTransaction xử lý kho và ranh giới giao dịch; CheckoutService điều phối; InventoryReportService chỉ đọc cảnh báo. Reporting không trừ kho và ManualPaymentService không trực tiếp xuất kho.
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Services/InventoryService.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Services/InventoryReportService.cs

Interfaces: IBusinessClock cho phép kiểm biên ngày bằng TestClock; IInventoryLock tách cơ chế khóa; IFileStorage tách lưu file khỏi service. Đây là các ví dụ cho Interfaces, Encapsulation và SRP theo hàng Pharmacy ở Appendix A của rubric; kế thừa/đa hình và demo Open/Closed bổ sung cho thiết kế.
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Common/BusinessClock.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Core/Common/FileStorage.cs

Tài liệu tự giải thích, phần chuẩn bị cho từng thành viên, ví dụ tính tay và 10 câu hỏi/đáp án:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/WEEK4_SELF_EXPLANATION_DEFENSE.md

Ví dụ để tự diễn giải: lô X có 20 đơn vị hết hạn đúng D, A có 3 đơn vị hạn D+1, B có 5 đơn vị hạn D+10, không có giữ hàng. Bán 4: loại X, lấy A=3/B=1, tồn còn hạn từ 8 xuống 4, tổng 10.000 nếu giá 2.500. Với biến thể có giới hạn 2, mua 3 phải bị từ chối dù OTC thường có thể hợp lệ. Đây là phân tích theo code, không phải xác nhận đã viết tay trong buổi bảo vệ.

6. KIỂM THỬ MỚI VÀ PHÂN BIỆT KẾT QUẢ LỊCH SỬ

- Backend Release: 206 Pass / 0 Fail / 2 Skip, tổng 208. TRX ghi khoảng 154 giây cho toàn bộ test run; summary VSTest ghi khoảng 2 phút 20 giây cho phần thực thi. Hai Skip là PostgreSQL khi chưa cấu hình connection và đo tải khi chưa bật opt-in; không tính Skip thành Pass.
- Bộ test mở rộng: 10 Pass / 0 Fail / 0 Skip, khoảng 11,8 giây theo TRX.
- Console demo: 6/6 scenario khớp kỳ vọng, exit code 0. Đây không phải sáu unit test bổ sung để cộng vào suite.
- Giao diện: 30 Pass / 0 Fail / 0 Skip trên Chrome headless qua Playwright, 15 ca mỗi viewport, khoảng 311 giây (5,2 phút) theo JSON reporter. Backend thật cổng 5017, frontend production cổng 3017, database/storage test tách riêng.
- Lint và production build frontend đạt. Ba test tích hợp mới được kiểm tra lại riêng sau chỉnh cảnh báo analyzer; kết quả lượt này nằm trong hồ sơ, không cộng lặp vào 206 Pass.

Kết quả mới, TRX và JSON reporter:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/WEEK4_FINAL_2026-10-29.md
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/week4/week4-backend.trx
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/week4/week4-extension.trx
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/week4/week4-playwright.json
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/week4/extension-demo.txt

Các số 203 Pass / 2 Skip và 30/30 Playwright ngày 07/10 là lịch sử; 84 Pass ngày 19/10 phục vụ tuần 2; 54 Pass, khoảng 54 giây của nhóm ngày 29/10 phục vụ tuần 3. Không cộng chúng vào lượt tuần 4. Dù lượt Playwright mới cũng đạt 30 ca, đó là kết quả mới có JSON và ảnh riêng.

7. MINH CHỨNG VÀ HƯỚNG DẪN CHẠY

Commit thêm demo và test:
https://github.com/ChuDuc2k5/OOP/commit/70250b6d934add9f43d5d524d90d4dc3dd90e22e
Commit tách thư mục ảnh, chọn browser và chạy API Release cho E2E:
https://github.com/ChuDuc2k5/OOP/commit/4cf456721504447d77105015c640b33e87e4b014

Test backend hồi quy và test demo:
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/CheckoutTests.cs
https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/InventoryTests.cs
https://github.com/ChuDuc2k5/OOP/blob/main/examples/Week4.ExtensibilityDemo.Tests/ExtensionTests.cs
Bộ test trình duyệt:
https://github.com/ChuDuc2k5/OOP/blob/main/frontend/e2e/pharmacy.spec.ts

Ảnh mới được chọn cho báo cáo, đủ hai viewport; xem danh sách và link từng ảnh trong hồ sơ:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/test-results/WEEK4_FINAL_2026-10-29.md

Hướng dẫn cài, build, chạy ứng dụng:
https://github.com/ChuDuc2k5/OOP/blob/main/README.md

Lệnh từ thư mục gốc:
dotnet test backend/Pharmacy.Tests/Pharmacy.Tests.csproj --configuration Release
dotnet test examples/Week4.ExtensibilityDemo.Tests --configuration Release
dotnet run --project examples/Week4.ExtensibilityDemo --configuration Release
npm.cmd run lint --workspace frontend
npm.cmd run test:e2e --workspace frontend

Nếu dùng Chrome đã cài thay Chromium tải riêng, đặt PHARMACY_E2E_CHANNEL=chrome; có thể đặt PHARMACY_E2E_EVIDENCE_DIR để giữ ảnh mới tách khỏi ảnh lịch sử. Chuẩn bị cấu hình theo README, không commit .env hoặc tài khoản nhận tiền thật.

8. PHÂN CÔNG HAI THÀNH VIÊN

Giữ cách chia trách nhiệm như tuần 3, đồng thời đối chiếu nhiệm vụ tích hợp của kế hoạch tuần 4:

Chu Ngọc Việt Đức (23110016): chịu trách nhiệm rà soát/trình bày luồng bán tại quầy và online, kiểm tra đơn thuốc, thanh toán và hóa đơn; đối chiếu happy path và các lỗi liên quan. Khi chuẩn bị bảo vệ, tập trung CheckoutService, ManualPaymentService, InvoiceService và các test liên quan, đồng thời phải hiểu toàn bộ diagram.

Lê Anh Đức (23110017): chịu trách nhiệm rà soát/trình bày hardening, demo đa hình/mở rộng, biên hạn dùng, hồi quy inventory/report, UML và minh chứng AI. Khi chuẩn bị bảo vệ, tập trung QuantityLimitedOTCSale, runner/test mở rộng, DrugBatch và giao dịch kho.

Cả hai: kiểm tra tài liệu cuối, chạy được ứng dụng và tự trình bày ít nhất một flow. Các file code/test/UML và tài liệu mới của phiên hoàn thiện này được AI thực hiện theo chỉ đạo của nhóm; phân công trách nhiệm không được dùng để tuyên bố từng người đã tự viết thủ công các file đó. Chưa có xác nhận hai thành viên đã hoàn thành buổi mock defense độc lập.

9. KHÓ KHĂN, GIỚI HẠN VÀ BÀI HỌC KỸ THUẬT

- Không thể đồng nhất domain extension với API extension. SaleKind factory và EF mapping vẫn chỉ có hai subtype sản phẩm; demo mới có giới hạn rõ tại domain validation.
- Trên Windows, build lại API khi server E2E đang chạy có thể bị khóa DLL. Một lượt kiểm tra lại đã gặp lỗi build này, không được tính là kết quả test đạt; chạy tuần tự sau khi tắt server test để xác nhận bản cuối.
- Lượt backend đầu có cảnh báo analyzer ở cách dùng Assert.Single trong test mới. Đã chuyển sang overload có predicate; không đổi logic sản phẩm.
- Sơ đồ cũ chưa phản ánh đầy đủ completion effects và một số chữ ký phương thức. Sơ đồ tuần 4 được đối chiếu lại, tách core domain/services và đánh dấu biến thể mẫu.
- PostgreSQL và đo tải chưa được chạy mới trong lượt này. Kết quả kiểm tra một tiến trình không chứng minh khóa kho phân tán hoặc khả năng chịu tải qua mạng.

Bài học từ các điểm trên là cần kiểm tra cả phạm vi lời khẳng định, mã thực tế và log thực thi; không dùng đầu ra AI hoặc tên một test thay cho bằng chứng đã chạy. Reflection trải nghiệm của mỗi thành viên cần được tự diễn đạt/xác nhận trước buổi bảo vệ, không giả lập thành biên bản đã phỏng vấn.

10. ĐIỀU CHỈNH SO VỚI KẾ HOẠCH

Các chức năng website đã có trước tuần 4 nên công việc mới tập trung hồi quy, minh chứng, extension demo và tài liệu. Ngoài checklist tích hợp của kế hoạch nhóm, bổ sung demo mở rộng và 10 câu hỏi/đáp án theo rubric. Không triển khai loại bán mới vào database/API vì phần minh chứng tuần này tách ở domain; phần đó được ghi thành giới hạn thay vì mô tả như tính năng website đã hoàn thành.

Số liệu/commit của các tuần trước được giữ đúng ngày và đúng phạm vi. Nhật ký AI được bổ sung theo công việc thực tế; không suy đoán model hoặc trải nghiệm cá nhân khi chưa có xác nhận.

11. CHUẨN BỊ BẢO VỆ VÀ BÀN GIAO

Hai thành viên tự luyện 10 câu hỏi trong tài liệu Self-Explanation, tự chạy demo và mở đúng class/method khi giải thích. Phần tự đánh giá cá nhân và buổi hỏi chéo cần thực hiện trực tiếp; chưa đánh dấu đã hoàn thành chỉ vì tài liệu ôn tập đã được soạn. Bộ source, README, sơ đồ, kết quả kiểm thử và tài liệu cuối được liên kết trong báo cáo này.

12. AI USAGE LOG

Có sử dụng AI cho code mẫu, test, chạy kiểm chứng, UML và tài liệu. Khai báo chi tiết được để riêng để nhập biểu mẫu theo yêu cầu của nhóm; nhật ký phiên tuần 4 trên repo:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/AI_USAGE_WEEK4.md
Nhật ký chung:
https://github.com/ChuDuc2k5/OOP/blob/main/docs/AI_USAGE_LOG.md

Phạm vi AI và phần sinh viên chỉ đạo/xác nhận được tách rõ. Chưa có thông tin chắc chắn về mã model cụ thể của phiên nên không tự điền một phiên bản suy đoán.
