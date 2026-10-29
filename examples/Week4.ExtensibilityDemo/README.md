# Demo mở rộng domain cho báo cáo tuần 4

`QuantityLimitedOTCSale` là biến thể bán OTC giới hạn số đơn vị của từng thuốc trong một giao dịch. Nó kế thừa `Sale` và kết hợp validator `OTCSale` hiện có, nên quy tắc mới không bỏ qua điều kiện thuốc cần đơn/thuốc kiểm soát.

`SaleValidationRunner.Evaluate(Sale, SaleContext)` gọi `sale.Validate(context)` cho cả `OTCSale`, `PrescriptionSale` và biến thể mới. Thêm demo này không yêu cầu sửa các lớp sản phẩm cũ, enum, factory, controller hoặc EF mapping.

## Chạy

Từ thư mục gốc repository:

```powershell
dotnet run --project examples/Week4.ExtensibilityDemo --configuration Release
dotnet test examples/Week4.ExtensibilityDemo.Tests --configuration Release
```

Console có sáu scenario với đầu ra mong đợi:

1. OTC hiện có mua 3 đơn vị: hợp lệ.
2. Biến thể mới mua 2 đơn vị với hạn mức 2: hợp lệ.
3. Biến thể mới mua 3 đơn vị với hạn mức 2: `PURCHASE_LIMIT_EXCEEDED`.
4. Biến thể mới mua thuốc cần đơn: `PRESCRIPTION_REQUIRED`.
5. Biến thể mới mua thuốc kiểm soát: `PRESCRIPTION_REQUIRED`.
6. PrescriptionSale hiện có với đơn hợp lệ: hợp lệ.

## Phạm vi minh chứng

Đây là demo mở rộng **domain validation** qua abstraction `Sale`, không phải loại bán mới đã tích hợp vào API checkout hoặc cơ sở dữ liệu. `CheckoutService.CreateSale()` và cấu hình EF Core của ứng dụng vẫn chỉ biết hai subtype sản phẩm hiện có. Không gửi biến thể mẫu này vào API/EF rồi tuyên bố ứng dụng đã hỗ trợ nó đầu-cuối.

Giới hạn mua trong ví dụ là một quy tắc minh họa cho bài OOP, không phải quy định pháp lý về cấp thuốc.

Phần test mới `backend/Pharmacy.Tests/Week4IntegrationTests.cs` kiểm tra luồng API thực tế riêng: tạo thuốc/lô → bán → FEFO → giá/hóa đơn/báo cáo; từ chối OTC với thuốc kiểm soát; từ chối lô hết hạn sau khi tạo nháp. Nó không sử dụng biến thể demo trong pipeline sản phẩm.
