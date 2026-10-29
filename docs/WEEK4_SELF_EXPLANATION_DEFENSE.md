# Self Explanation và chuẩn bị bảo vệ tuần 4

Tài liệu ôn tập được biên tập với hỗ trợ AI, bám mã nguồn của nhóm. Hai thành viên cần tự diễn đạt lại và thao tác được trên máy; tài liệu này không phải biên bản xác nhận đã tập bảo vệ hoặc đã trả lời độc lập.

## 1. Phần Chu Ngọc Việt Đức chuẩn bị trình bày

Chuỗi cần giải thích là `SaleService` tạo/cập nhật nháp → `CheckoutService.Checkout` hoặc `Fulfill` → `SaleEvaluation.Evaluate` → `sale.Validate` → `InventoryTransaction.Deduct` → `sale.ApplyCompletionEffects` → `sale.Complete` → tạo `Invoice`. Bán tại quầy chốt giá ở checkout, còn bán trực tuyến giữ giá của đơn hàng. Review tiền và xuất kho là hai nghiệp vụ khác nhau: xác nhận tiền không tự trừ kho; UI có thể gọi fulfill ngay sau review thành công.

Khi gặp lỗi xuất kho, giao dịch kho/Sale/Invoice rollback nhưng khoản tiền đã được xác nhận ở giao dịch trước không bị xóa. Người trình bày phải chỉ được TC51 và giải thích tại sao trạng thái đó đúng hơn việc giả vờ chưa nhận tiền. Khi truy vấn hóa đơn, phải giải thích phạm vi User/Staff/Admin và việc giá/phân bổ lô đã được giữ ở các dòng SaleItem.

Mã cần mở: `backend/Pharmacy.Core/Services/CheckoutService.cs`, `ManualPaymentService.cs`, `InvoiceService.cs`, `SaleEvaluation.cs`; test mới `Week4IntegrationTests.cs` và test hồi quy `CheckoutTests.cs`.

## 2. Phần Lê Anh Đức chuẩn bị trình bày

`DrugBatch.Quantity` và `PrescriptionItem.DispensedQuantity` có private setter. Trừ kho đi qua `Deduct`, cấp thuốc đi qua `RecordDispense`; service kết hợp các kiểm tra với lượng giữ và giao dịch. `IReadOnlyCollection` ngăn sửa cấu trúc danh sách trực tiếp, không khiến phần tử bên trong bất biến. Lô có hạn đúng ngày nghiệp vụ bị loại vì code yêu cầu `ExpiryDate > date`; hiệu lực đơn thuốc lại bao gồm hai đầu mút.

Demo mới thêm `QuantityLimitedOTCSale` kế thừa `Sale` và dùng lại validator OTC theo composition. Cùng `SaleValidationRunner.Evaluate(Sale, SaleContext)` nhận cả subtype cũ và mới. Giới hạn mua là quy tắc minh họa, không phải quy định pháp lý. Không sửa lớp core có sẵn; demo chỉ chứng minh mở rộng domain validation, chưa đăng ký subtype mới trong EF/API. Người trình bày phải chỉ được diff, sáu scenario và 10 test; không gọi đây là checkout API mới.

Mã cần mở: `Drug.cs`, `Prescription.cs`, `Common/BusinessClock.cs`, `examples/Week4.ExtensibilityDemo/QuantityLimitedOTCSale.cs`, `SaleValidationRunner.cs` và `examples/Week4.ExtensibilityDemo.Tests/ExtensionTests.cs`.

## 3. Mười câu hỏi và đáp án chuẩn bị

### 1. Vì sao cần DrugBatch thay vì chỉ một quantity trong Drug?

Mỗi lô có hạn dùng và lượng còn lại khác nhau. Một tổng tồn không đủ để loại lô hết hạn hoặc truy vết lô xuất. Drug giữ nhiều batch, tính tồn khả dụng và lập FEFO; allocation của dòng bán giữ lô và số lượng đã xuất.

### 2. Chính xác nơi nào ngăn xuất lô hết hạn và trừ âm?

`Drug.PlanFEFO` chỉ chọn lô có `ExpiryDate > date` và còn số lượng. `DrugBatch.Deduct` kiểm số lượng dương, không vượt Quantity và hạn sau ngày nghiệp vụ. `InventoryTransaction` kiểm lượng giữ trước khi áp dụng. Vì vậy có bảo vệ cả ở khâu chọn lô và khâu thay đổi trạng thái.

### 3. Private set và collection chỉ đọc bảo vệ được gì?

Caller không gán trực tiếp Quantity/DispensedQuantity và không thêm/xóa qua collection được trả ra bằng AsReadOnly. Caller phải đi qua phương thức nghiệp vụ. Phần tử bên trong vẫn thay đổi hợp lệ qua method, nên không được gọi toàn bộ đồ thị đối tượng là immutable.

### 4. Đa hình xuất hiện ở đâu trong code thực tế?

SaleEvaluation nhận Sale và gọi sale.Validate(context). Checkout gọi sale.ApplyCompletionEffects. Validate được hai subtype sản phẩm ghi đè; PrescriptionSale còn ghi đè completion effects, OTCSale kế thừa mặc định. Demo tuần 4 truyền thêm QuantityLimitedOTCSale vào caller nhận Sale mà không thay đổi contract đó.

### 5. Bán OTC thuốc kiểm soát bị chặn ở đâu?

`OTCSale.Validate` từ chối dòng có RequiresPrescription hoặc IsControlled và trả mã PRESCRIPTION_REQUIRED. Demo giới hạn số lượng kết hợp validator OTCSale hiện có nên không bỏ qua quy tắc này. Quy tắc ở server/domain vẫn cần thiết dù UI đã lọc thuốc.

### 6. Vì sao mở QR và duyệt tiền chưa phải đã xuất kho?

Mở QR có thể giữ hàng nhưng không xác nhận chuyển khoản. ManualPaymentService.Review xác nhận tiền và chuyển đơn sang Preparing. CheckoutService.Fulfill mới kiểm lại điều kiện và trừ kho/tạo hóa đơn. UI có thể tự nối hai lệnh nhưng chúng vẫn có ranh giới giao dịch riêng.

### 7. Nếu lỗi xảy ra sau khi bắt đầu trừ kho thì sao?

InventoryService.Execute bao luồng bằng transaction; lỗi sẽ rollback và clear ChangeTracker. Test gây lỗi ghi hóa đơn kiểm tồn, quota, Sale và reservation không bị cập nhật dở dang. Payment đã Confirmed trước fulfill vẫn còn để xử lý tiếp, không được nhận tiền lần nữa một cách sai lệch.

### 8. LowStock và NearExpiry khác nhau thế nào?

LowStock so sánh tồn khả dụng sau lượng giữ với ngưỡng, dùng <= nên bằng ngưỡng và bằng 0 có thể được cảnh báo. NearExpiry xét từng lô còn hàng, số ngày còn lại nằm trong (0, days], mặc định 30; không đưa lô đã hết hạn vào danh sách sắp hết hạn. InventoryReader cung cấp snapshot dùng chung.

### 9. Demo mới chứng minh Open/Closed đến đâu?

Thêm QuantityLimitedOTCSale và các file demo/test; không sửa lớp sản phẩm core có sẵn. Runner nhận Sale gọi Validate cho subtype mới. Tuy nhiên factory SaleKind, API và EF mapping chưa hỗ trợ subtype mới: demo chỉ chứng minh khả năng mở rộng của contract domain. Muốn tích hợp production phải thiết kế thêm điểm đăng ký, mapping và kiểm thử end-to-end; không khẳng định việc đó đã xong.

### 10. Interfaces và SRP giúp kiểm thử ra sao?

IBusinessClock cho phép thay ngày cố định trong test; IFileStorage tách xử lý lưu file; IInventoryLock tách cơ chế khóa. Sale giữ quy tắc, inventory quản lý kho, checkout điều phối, reporting chỉ đọc. Cách chia này giúp kiểm tra giới hạn ngày, rollback và báo cáo riêng, nhưng khóa SemaphoreSlim hiện chỉ trong một tiến trình.

## 4. Bài tính tay để tự kiểm tra trước khi chạy

Ngày nghiệp vụ D, giá 2.500/đơn vị. Lô X có 20 đơn vị nhưng hết hạn đúng D; lô A có 3 đơn vị hạn D+1; lô B có 5 đơn vị hạn D+10. Không có lượng giữ. Bán 4 đơn vị: X không được chọn, FEFO lấy A=3 và B=1; tồn còn hạn từ 8 xuống 4; tổng tiền 10.000. Nếu ngưỡng tồn thấp là 4 thì có cảnh báo. Bảng gần hết hạn không hiển thị A đã hết hàng, chỉ còn B.

Với demo giới hạn 2 đơn vị/thuốc: mua 2 hợp lệ; mua 3 bị PURCHASE_LIMIT_EXCEEDED. Với OTC thông thường mua 3 vẫn hợp lệ nếu các điều kiện khác đúng. Đổi thuốc sang loại cần đơn thì cả OTC thông thường và biến thể mới đều bị PRESCRIPTION_REQUIRED. Đây là dự đoán theo code để sinh viên tự diễn giải, không phải tuyên bố đã viết tay trong buổi thi.

## 5. Tự phản ánh cần xác nhận trực tiếp trước buổi bảo vệ

Chưa có xác nhận hai thành viên đã hoàn thành mock defense. Mỗi người cần tự bổ sung: một phần khó thực sự; một đầu ra AI đã kiểm chứng hoặc chỉnh sửa; điều đã học; điều sẽ làm khác; một flow tự demo được. Không ghi là đã tự sửa code/chạy test hoặc trả lời độc lập nếu phần đó do AI thực hiện.
