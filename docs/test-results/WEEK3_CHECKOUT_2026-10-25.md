# Kết quả kiểm thử phục vụ báo cáo tuần 3

## Nguồn số liệu

Nhóm xác nhận đã chạy trên máy kiểm thử khác ngày **29/10/2026**, cấu hình **Release**, kết quả **54 Pass / 0 Fail / 0 Skip**, thời lượng khoảng **54 giây**. Tên tệp giữ theo đường dẫn đã nêu trong bản báo cáo trước; ngày chạy thực tế là 29/10, không phải 25/10.

Đây là bản tổng hợp từ kết quả do nhóm xác nhận, được biên tập để bổ sung hồ sơ. Chưa có log/TRX gốc của chính lượt chạy này trong dữ liệu dùng để soạn tệp; không gọi đây là log gốc và không tạo thời điểm bắt đầu/kết thúc hoặc SHA nguồn giả. Khi bổ sung hồ sơ, lấy log/TRX và SHA thực tế từ máy đã chạy.

## Phạm vi

- Toàn bộ `CheckoutTests`.
- Toàn bộ `HardeningTests`.
- Toàn bộ `FoundationTests`.
- Chỉ `InventoryTests.TC22_ExpiringReport_UsesOpenClosedDayWindow_AndDoesNotWrite` và `InventoryTests.TC23_LowStockReport_IncludesEqualityAndZero_ExcludesAboveThreshold`.

Đây là phần suite được chọn, không phải toàn bộ suite backend. Theory được tính theo từng bộ tham số, không diễn giải 54 trường hợp thành 54 mã TC khác nhau.

## Lệnh tham khảo để tái hiện cùng phạm vi

Lệnh dưới đây chọn đúng nhóm test đã khai báo; không khẳng định là bản chép nguyên văn command history của máy thực hiện lượt chạy 54 giây.

```powershell
dotnet restore backend/Pharmacy.Tests/Pharmacy.Tests.csproj
$week3Filter = 'FullyQualifiedName~Pharmacy.Tests.CheckoutTests|FullyQualifiedName~Pharmacy.Tests.HardeningTests|FullyQualifiedName~Pharmacy.Tests.FoundationTests|FullyQualifiedName~Pharmacy.Tests.InventoryTests.TC22_|FullyQualifiedName~Pharmacy.Tests.InventoryTests.TC23_'
dotnet test backend/Pharmacy.Tests/Pharmacy.Tests.csproj --configuration Release --no-restore -m:1 --filter $week3Filter --logger 'trx;LogFileName=week3-checkout.trx' --results-directory TestResults/week3
```

## Nội dung đối chiếu với mã nguồn

| Phạm vi | Mã kiểm thử liên quan |
|---|---|
| OTC, FEFO, hóa đơn, chặn hoàn tất lặp | TC38 |
| Chặn thuốc cần đơn/kiểm soát trong OTC | TC39 |
| Cấp một phần, hạn mức và lượng giữ | TC40 |
| Mở QR chưa xác nhận nhận tiền/chưa trừ kho | TC43 |
| Review/fulfill đồng thời | TC48 |
| Rollback khi lỗi hóa đơn hoặc thiếu hàng | TC51 |
| Giá, phân bổ lô và quyền xem hóa đơn | TC53/TC54 |
| Đa hình qua cùng CheckoutService, chủ đơn và completion effects | TC56, HardeningTests, FoundationTests |
| Báo cáo sắp hết hạn và tồn thấp | TC22/TC23 |

Mã nguồn:

- [CheckoutTests.cs](https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/CheckoutTests.cs)
- [HardeningTests.cs](https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/HardeningTests.cs)
- [FoundationTests.cs](https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/FoundationTests.cs)
- [InventoryTests.cs](https://github.com/ChuDuc2k5/OOP/blob/main/backend/Pharmacy.Tests/InventoryTests.cs)

## Giới hạn

- Không chạy lại Playwright, PostgreSQL hoặc phép đo tải trong lượt đã khai báo.
- Backend 203 Pass / 0 Fail / 2 Skip và Playwright 30/30 ngày 07/10 là kết quả lịch sử; 84 Pass ngày 19/10 phục vụ tuần 2. Không cộng vào 54 trường hợp tuần 3.
- Tài liệu này không sử dụng kết quả của một lượt kiểm thử độc lập khác để thay thế thời lượng hoặc log của máy nhóm đã chạy.
- AI hỗ trợ biên tập bản tổng hợp; số liệu do nhóm xác nhận. Sinh viên chịu trách nhiệm đối chiếu với kết quả thực tế trên máy kiểm thử.
