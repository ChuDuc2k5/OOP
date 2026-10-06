# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

Pharmacy Management System


| Thông tin | Nội dung |
|---|---|
| Phiên bản | 2.0 |
| Ngày tạo | 2026-09-30 |
| Ngày cập nhật | 2026-10-05 |
| Nhóm thực hiện | Lê Anh Đức; Chu Ngọc Việt Đức |
| Môn học | Lập trình hướng đối tượng (OOP) – HK1, năm học 2026–2027 |
| Giảng viên hướng dẫn | Huỳnh Xuân Phụng |
| Trạng thái | Đặc tả phục vụ triển khai; chưa ghi nhận phê duyệt của giảng viên |

Lịch sử cập nhật


| Phiên bản | Nội dung |
|---|---|
| 1.2 | Bản đặc tả trước khi thống nhất phạm vi mua hàng trực tuyến. |
| 2.0 | Thống nhất 6 module, 20 function; bổ sung Guest/User, homepage, dashboard, giỏ và đơn hàng; thanh toán QR cố định do Admin/Staff duyệt; bỏ phí ship và các chức năng tài khoản nâng cao. Đồng bộ yêu cầu, dữ liệu, kiểm thử và truy vết. |


## 1. Giới thiệu


### 1.1. Mục đích

Tài liệu mô tả yêu cầu của Pharmacy Management System trong đồ án môn Lập trình hướng đối tượng. Nhóm gồm Lê Anh Đức và Chu Ngọc Việt Đức, thực hiện trong 4 tuần dưới sự hướng dẫn của giảng viên Huỳnh Xuân Phụng. SRS là cơ sở thống nhất phạm vi, thiết kế lớp, lập trình và kiểm thử. Các chức năng được mô tả là yêu cầu cần triển khai, không phải kết quả chương trình đã chạy.


### 1.2. Phạm vi

Hệ thống là website cho một nhà thuốc, kết hợp mua hàng trực tuyến và bán tại quầy. Guest/User sử dụng homepage; Staff có dashboard nhân viên; Admin có dashboard quản lý. Phạm vi gồm tài khoản cơ bản, sản phẩm, lô và tồn kho, đơn thuốc, giỏ hàng, đơn hàng, bán OTC/bán theo đơn, thanh toán QR thủ công, hóa đơn và hai báo cáo kho.

Phạm vi được tổ chức thành 6 module và 20 function. Mỗi function có đúng một submodule sở hữu. Những thao tác nhỏ trong cùng chức năng được gộp để phù hợp thời gian làm đồ án. Các quy trình có thể gọi chung một chức năng xử lý mà không tạo thêm function hoặc sao chép mã nghiệp vụ.

Khách đăng nhập mới được xem giá bán, thêm vào giỏ, đặt hàng và xem đơn của mình. Bấm Thanh toán mở ngay QR cố định và thông tin chuyển khoản. Admin hoặc Staff đối chiếu tiền thực nhận trên ứng dụng ngân hàng rồi duyệt trong website. Tổng phải trả chỉ gồm tiền sản phẩm, không thu phí ship.

Không triển khai kích hoạt/ngừng hoạt động tài khoản, đặt lại/đổi mật khẩu, đổi role sau khi tạo, khóa đăng nhập tạm thời, quên mật khẩu qua email; không tích hợp API ngân hàng/ví điện tử, đọc biên lai tự động, hoàn tiền tự động, hãng vận chuyển, tính khoảng cách, nhà cung cấp, kiểm kê, kế toán, mã giảm giá, điểm thưởng hoặc báo cáo doanh thu. Hệ thống không tự kiểm chứng đơn thuốc với cơ sở dữ liệu bên ngoài.


### 1.3. Thuật ngữ


| Thuật ngữ | Giải thích |
|---|---|
| Guest | Khách chưa đăng nhập; là trạng thái truy cập, không phải role lưu trong tài khoản. |
| User / Staff / Admin | Khách hàng / nhân viên / quản lý; ba role của tài khoản. |
| Module / Submodule / Function | Nhóm nghiệp vụ / nhóm nhỏ thuộc module / chức năng cụ thể; mã M, SM và F. |
| FR / NFR / BR / TC | Yêu cầu chức năng / phi chức năng / quy tắc nghiệp vụ / ca kiểm thử. |
| OTC / PrescriptionSale | Bán không theo đơn / bán theo đơn thuốc. |
| FEFO | Ưu tiên xuất lô còn hạn có hạn sử dụng gần nhất. |
| Tồn khả dụng | Tồn còn hạn trừ số lượng đang giữ cho đơn khác. |
| QR cố định | Ảnh QR tài khoản nhận tiền dùng chung; khách nhập số tiền và mã đơn được hiển thị riêng. |
| Đối chiếu thủ công | Người có quyền kiểm tra tiền thực nhận ngoài website và nhập xác nhận. |
| Ngày nghiệp vụ D | Ngày dùng để kiểm tra hạn thuốc, hiệu lực đơn và báo cáo; tách khỏi giờ chuyển khoản. |
| Draft / Completed / Cancelled | Nháp / giao dịch bán hoàn tất / nháp đã hủy. |


### 1.4. Tài liệu tham khảo và nguyên tắc đọc

Nguồn yêu cầu gồm đề bài Pharmacy Management System do giảng viên cung cấp, kế hoạch Ke_Hoach_4_Tuan_OOP_Pharmacy_Management_System.docx và phạm vi đã thống nhất của nhóm. Đề bài yêu cầu mô hình Drug, Prescription, Sale; theo dõi lô/hạn; hai luồng bán; báo cáo tồn thấp/sắp hết hạn; kiểm soát thuốc cần đơn; thể hiện đa hình, đóng gói và trách nhiệm đơn nhất. Phạm vi website và QR thủ công là phần nhóm bổ sung.

Các hướng dẫn nộp bài, Self-Explanation và AI Usage Log là yêu cầu của môn học đối với hồ sơ bàn giao, không phải chức năng của website.


## 2. Mô tả tổng quan


### 2.1. Bối cảnh và đối tượng sử dụng

Nhà thuốc cần theo dõi thuốc theo từng lô, nhận đơn của khách, kiểm tra đơn thuốc và hoàn tất giao dịch mà không cấp thuốc hết hạn hoặc vượt tồn. Website cung cấp phần mua hàng và phần vận hành nhà thuốc trong cùng ứng dụng.


| Đối tượng | Giao diện | Đặc điểm sử dụng |
|---|---|---|
| Guest | Homepage công khai | Xem thông tin sản phẩm, tìm kiếm; đăng ký hoặc đăng nhập. Chưa xem giá và chưa mua hàng. |
| User | Homepage sau đăng nhập | Xem giá, dùng giỏ, gửi đơn thuốc, đặt hàng, mở QR và theo dõi dữ liệu của mình. |
| Staff | Dashboard nhân viên | Tiếp nhận đơn thuốc, xử lý đơn, đối chiếu/duyệt thanh toán, bán tại quầy, xem kho và báo cáo. |
| Admin | Dashboard quản lý | Có nghiệp vụ của Staff; thêm quản lý tài khoản, thuốc, nhập lô và cấu hình QR. |

Giảng viên và người đánh giá đồ án là bên xem sản phẩm và bằng chứng kiểm thử. Họ không có role riêng trong hệ thống; khi demo có thể dùng tài khoản thử nghiệm được nhóm cung cấp.


### 2.2. Môi trường và công nghệ

Giao diện người dùng (FE) được xây dựng bằng React và Next.js. Backend (BE) sử dụng C# trên nền tảng ASP.NET Core/.NET 10, cung cấp API cho frontend. Supabase được sử dụng để lưu trữ dữ liệu lâu dài. xUnit dùng cho kiểm thử nghiệp vụ.

Ứng dụng phục vụ đồ án môn học, chủ yếu chạy trên localhost của máy tính cá nhân; người dùng thao tác bằng trình duyệt Edge hoặc Chrome. Có thể triển khai thử frontend Next.js trên Vercel để demo, không đặt yêu cầu triển khai vận hành chính thức. Một phiên trình duyệt đại diện một người đăng nhập; có thể mở các trình duyệt hoặc cửa sổ riêng để demo nhiều role. Cơ sở dữ liệu dùng chung và phải bảo vệ các thao tác giữ hàng, duyệt thanh toán, xuất kho khi có yêu cầu đồng thời.


### 2.3. Ràng buộc và giả định

Phạm vi gồm một nhà thuốc, một tài khoản nhận tiền và tiền tệ VND. Mỗi thuốc có một đơn vị bán; số lượng là số nguyên. Admin/Staff có khả năng xem giao dịch thực nhận của tài khoản ngân hàng để đối chiếu. Website không đọc thông báo ngân hàng.

Thông tin ngân hàng và ảnh QR phải được Admin cấu hình trước khi sử dụng thanh toán. Không ghi thông tin cá nhân của tài khoản nhận tiền giả định trong SRS. Địa chỉ giao hàng chỉ nhập theo đơn; không làm sổ địa chỉ hoặc tài khoản người vận chuyển.

Dữ liệu mẫu chỉ tạo ở lần khởi tạo database chưa có dữ liệu cần thiết. Mở lại ứng dụng không được xóa hoặc nạp đè tài khoản, kho, đơn và thanh toán đã lưu. Các thông số kỹ thuật và ca kiểm thử dưới đây được dùng để kiểm chứng bản đồ án, không biểu thị chương trình đã được kiểm thử.


### 2.4. Cấu trúc module, submodule và function


| Module | Submodule | Function |
|---|---|---|
| M01 – Tài khoản | SM01.01 – Xác thực | F001 – Đăng ký |
| M01 – Tài khoản | SM01.01 – Xác thực | F002 – Đăng nhập/đăng xuất |
| M01 – Tài khoản | SM01.02 – Quản lý tài khoản | F003 – Quản lý tài khoản cơ bản |
| M02 – Sản phẩm | SM02.01 – Tra cứu sản phẩm | F004 – Xem sản phẩm |
| M02 – Sản phẩm | SM02.02 – Quản lý sản phẩm | F005 – Quản lý thuốc |
| M03 – Kho và báo cáo | SM03.01 – Lô thuốc | F006 – Nhập lô |
| M03 – Kho và báo cáo | SM03.01 – Lô thuốc | F007 – Tra cứu kho |
| M03 – Kho và báo cáo | SM03.02 – Xử lý tồn kho | F008 – Xử lý kho theo giao dịch |
| M03 – Kho và báo cáo | SM03.03 – Báo cáo kho | F009 – Xem báo cáo cảnh báo |
| M04 – Đơn thuốc | SM04.01 – Tiếp nhận đơn thuốc | F010 – Tiếp nhận và tra cứu đơn thuốc |
| M04 – Đơn thuốc | SM04.02 – Kiểm tra đơn thuốc | F011 – Xử lý đơn thuốc |
| M05 – Giỏ và đơn hàng | SM05.01 – Giỏ hàng | F012 – Quản lý giỏ hàng |
| M05 – Giỏ và đơn hàng | SM05.02 – Đơn hàng cá nhân | F013 – Đặt hàng |
| M05 – Giỏ và đơn hàng | SM05.02 – Đơn hàng cá nhân | F014 – Quản lý đơn của mình |
| M05 – Giỏ và đơn hàng | SM05.03 – Xử lý đơn hàng | F015 – Quản lý đơn trực tuyến |
| M05 – Giỏ và đơn hàng | SM05.04 – Bán tại quầy | F016 – Lập giao dịch tại quầy |
| M06 – Thanh toán và hóa đơn | SM06.01 – Thanh toán QR | F017 – Hiển thị thanh toán |
| M06 – Thanh toán và hóa đơn | SM06.02 – Xác nhận thanh toán | F018 – Duyệt thanh toán |
| M06 – Thanh toán và hóa đơn | SM06.03 – Hoàn tất bán hàng | F019 – Hoàn tất giao dịch |
| M06 – Thanh toán và hóa đơn | SM06.04 – Tra cứu hóa đơn | F020 – Xem hóa đơn |

Các chức năng F008, F011 và F019 có phần xử lý nội bộ dùng chung. F019 chỉ thuộc SM06.03; bán tại quầy và đơn trực tuyến gọi F019. F008 chỉ thuộc SM03.02; không tạo thêm chức năng trừ kho ở một submodule khác. Số lượng thao tác trong mô tả chi tiết không làm tăng số function.


## 3. Ma trận phân quyền chức năng

Ký hiệu: Có = được sử dụng; Không = không được sử dụng; Của mình = chỉ dữ liệu thuộc tài khoản hiện tại; Nội bộ = chỉ gọi trong quy trình đã được cấp quyền. Kiểm tra quyền được thực hiện ở phía máy chủ, không chỉ bằng ẩn menu.


| Function | Guest | User | Staff | Admin |
|---|---|---|---|---|
| F001 – Đăng ký | Có | Không | Không | Không |
| F002 – Đăng nhập/đăng xuất | Đăng nhập | Có | Có | Có |
| F003 – Tài khoản | Không | Không | Không | Có |
| F004 – Xem sản phẩm | Không có giá | Có giá | Có giá | Có giá |
| F005 – Quản lý thuốc | Không | Không | Không | Có |
| F006 – Nhập lô | Không | Không | Không | Có |
| F007 – Tra cứu kho | Không | Không | Có | Có |
| F008 – Xử lý kho | Không | Nội bộ theo đơn | Nội bộ | Nội bộ |
| F009 – Báo cáo kho | Không | Không | Có | Có |
| F010 – Tiếp nhận/tra cứu đơn thuốc | Không | Gửi/xem của mình | Có | Có |
| F011 – Xử lý đơn thuốc | Không | Không | Có | Có |
| F012 – Giỏ hàng | Không | Của mình | Không | Không |
| F013 – Đặt hàng | Không | Có | Không | Không |
| F014 – Đơn cá nhân | Không | Của mình | Không | Không |
| F015 – Đơn trực tuyến | Không | Không | Có | Có |
| F016 – Bán tại quầy | Không | Không | Nháp của mình | Nháp của mình |
| F017 – QR | Không | Đơn của mình | Không | Cấu hình QR |
| F018 – Duyệt thanh toán | Không | Không | Có | Có |
| F019 – Hoàn tất bán | Không | Không | Theo nghiệp vụ | Theo nghiệp vụ |
| F020 – Hóa đơn | Không | Của mình | Mình lập/xử lý | Tất cả |

Staff/Admin được xem các đơn trực tuyến để thực hiện công việc; người xử lý được ghi nhận trong đơn. Đối với nháp tại quầy, cả Admin lẫn Staff chỉ sửa, hủy hoặc hoàn tất nháp do mình lập. User không được tự duyệt đơn thuốc, thanh toán, xuất kho hoặc xem đơn/hóa đơn của khách khác.


## 4. Yêu cầu chức năng

Mỗi FR tương ứng một function đã chốt: FR-001 ↔ F001 đến FR-020 ↔ F020. Mọi yêu cầu bên dưới thuộc phạm vi cơ bản. Các thao tác gộp trong một function vẫn phải đáp ứng điều kiện, lỗi và kết quả đã mô tả.

*Hình 4.1. UC tổng*


### 4.1. M01 – Tài khoản

*Hình 4.2. UC-M01 — Tài khoản*

*Hình 4.3. UC-SM01.01 — Xác thực*


#### FR-001 / F001 – Đăng ký


| Mô tả | Đăng ký |
|---|---|
| Module / Submodule | Thuộc M01 – Tài khoản, SM01.01 – Xác thực. |
| Actor | Guest. |
| Input / Pre-condition | Chưa đăng nhập. Nhập tên đăng nhập và mật khẩu, xác nhận mật khẩu. |
| Main Flow | Tên đăng nhập dài 3–30 ký tự, gồm chữ Latin, chữ số, dấu chấm, gạch dưới hoặc gạch ngang. Chuẩn hóa bằng bỏ khoảng trắng hai đầu và so sánh không phân biệt hoa/thường. Mật khẩu dài 8–128 ký tự, giữ nguyên hoa/thường và khoảng trắng; xác nhận phải khớp. Tạo mã tài khoản và role User ở phía máy chủ, lưu password hash. |
| Luồng thay thế/ngoại lệ | Từ chối dữ liệu rỗng, sai định dạng, tên đã có hoặc mật khẩu không khớp; không tạo bản ghi một phần. Không nhận role Admin/Staff do khách gửi. |
| Output / Post-condition | Đăng ký thành công có thể đăng nhập bằng tài khoản mới. Mọi cách gửi role tùy ý vẫn chỉ tạo User. |

*Hình 4.4. SQ-F001 — Đăng ký*


#### FR-002 / F002 – Đăng nhập/đăng xuất


| Mô tả | Đăng nhập/đăng xuất |
|---|---|
| Module / Submodule | Thuộc M01 – Tài khoản, SM01.01 – Xác thực. |
| Actor | Guest đăng nhập; User/Staff/Admin đăng xuất. |
| Input / Pre-condition | Tài khoản đã tồn tại; nhập tên và mật khẩu. |
| Main Flow | Kiểm tra password hash; sai thông tin trả thông báo chung. Thành công đưa User về homepage, Staff về dashboard nhân viên và Admin về dashboard quản lý. Đăng xuất xóa xác thực của trình duyệt và đưa về homepage Guest; không xóa dữ liệu nghiệp vụ đã lưu. |
| Luồng thay thế/ngoại lệ | Không tạo đăng nhập khi thông tin sai. Chặn truy cập cần quyền sau đăng xuất. Không triển khai đếm sai, khóa tạm, đặt lại hoặc đổi mật khẩu. |
| Output / Post-condition | Đúng tài khoản vào đúng giao diện; sai tài khoản không truy cập được nghiệp vụ. Giỏ, đơn, hóa đơn và nháp đã lưu vẫn còn sau đăng xuất. |

*Hình 4.5. SQ-F002 — Đăng nhập/đăng xuất*

*Hình 4.6. UC-SM01.02 — Quản lý tài khoản*


#### FR-003 / F003 – Quản lý tài khoản cơ bản


| Mô tả | Quản lý tài khoản cơ bản |
|---|---|
| Module / Submodule | Thuộc M01 – Tài khoản, SM01.02 – Quản lý tài khoản. |
| Actor | Admin. |
| Input / Pre-condition | Admin đã đăng nhập. Nhập username và mật khẩu ban đầu khi tạo Staff. |
| Main Flow | Xem và tìm kiếm danh sách tài khoản gồm mã, username và role; không hiển thị hash hoặc mật khẩu. Tạo Staff với quy tắc username/password như FR-001. Admin ban đầu do bước khởi tạo tạo sẵn; User tự đăng ký. |
| Luồng thay thế/ngoại lệ | Staff/User/Guest bị từ chối ở phía máy chủ. Tên trùng hoặc thông tin sai không được lưu. Không có xóa, đổi role, kích hoạt/ngừng hoạt động hoặc đặt lại mật khẩu. |
| Output / Post-condition | Admin tạo được Staff đăng nhập được; các role khác không tạo Staff hoặc quản trị tài khoản được. |

*Hình 4.7. SQ-F003 — Quản lý tài khoản cơ bản*


### 4.2. M02 – Sản phẩm

*Hình 4.8. UC-M02 — Sản phẩm*

*Hình 4.9. UC-SM02.01 — Tra cứu sản phẩm*


#### FR-004 / F004 – Xem sản phẩm


| Mô tả | Xem sản phẩm |
|---|---|
| Module / Submodule | Thuộc M02 – Sản phẩm, SM02.01 – Tra cứu sản phẩm. |
| Actor | Guest/User/Staff/Admin. |
| Input / Pre-condition | Sản phẩm đã được thêm và đang hiển thị. |
| Main Flow | Gộp xem danh sách, tìm theo mã/tên không phân biệt hoa/thường và xem chi tiết. Hiển thị tên, mô tả, hình ảnh nếu có, đơn vị, thông tin cần đơn và tình trạng còn hàng. Guest không nhận giá trong dữ liệu trả về. User/Staff/Admin xem giá hiện tại; Guest bấm mua được chuyển tới đăng nhập. |
| Luồng thay thế/ngoại lệ | Không có kết quả thì thông báo rõ. Không lộ giá nhập, dữ liệu từng lô hoặc thông tin khách qua homepage. Sản phẩm tắt bán không được mua dù gửi mã trực tiếp. |
| Output / Post-condition | Guest xem thông tin nhưng chưa xem giá/mua; User xem giá và chuyển sang giỏ. Tra cứu không thay đổi kho. |

*Hình 4.10. SQ-F004 — Xem sản phẩm*

*Hình 4.11. UC-SM02.02 — Quản lý sản phẩm*


#### FR-005 / F005 – Quản lý thuốc


| Mô tả | Quản lý thuốc |
|---|---|
| Module / Submodule | Thuộc M02 – Sản phẩm, SM02.02 – Quản lý sản phẩm. |
| Actor | Admin. |
| Input / Pre-condition | Nhập mã, tên, mô tả, đơn vị, giá bán, ngưỡng tồn thấp, các cờ phân loại và trạng thái bán. |
| Main Flow | Thêm/sửa thuốc và bật/tắt bán. Mã duy nhất, tên và đơn vị không rỗng, giá VND nguyên dương, ngưỡng không âm. IsControlled=true bắt buộc RequiresPrescription=true. Ảnh sản phẩm là tùy chọn; khi chưa có dùng ảnh mặc định. Giá mới áp dụng cho lần lập/chốt giá tiếp theo. |
| Luồng thay thế/ngoại lệ | Từ chối thông tin sai hoặc role không đủ quyền. Không xóa thuốc đã có lịch sử; không làm đổi lô, đơn đã chốt và hóa đơn cũ. |
| Output / Post-condition | Admin quản lý được thuốc; Staff không sửa được. Đơn trực tuyến đã đặt giữ giá đã chốt khi danh mục đổi giá. |

*Hình 4.12. SQ-F005 — Quản lý thuốc*


### 4.3. M03 – Kho và báo cáo

*Hình 4.13. UC-M03 — Kho và báo cáo*

*Hình 4.14. UC-SM03.01 — Lô thuốc*


#### FR-006 / F006 – Nhập lô


| Mô tả | Nhập lô |
|---|---|
| Module / Submodule | Thuộc M03 – Kho và báo cáo, SM03.01 – Lô thuốc. |
| Actor | Admin. |
| Input / Pre-condition | Thuốc đã tồn tại. Nhập số lô, hạn sử dụng và số lượng nguyên dương. |
| Main Flow | Lưu lô theo thuốc; cặp DrugId+BatchNumber duy nhất. Hạn sử dụng phải sau ngày nghiệp vụ; lưu số lượng ban đầu và số lượng hiện có. Tồn kho tăng sau khi nhập thành công. |
| Luồng thay thế/ngoại lệ | Từ chối thuốc không có, lô trùng, số lượng không nguyên/không dương, ngày không hợp lệ hoặc lô hết hạn. Không cập nhật dữ liệu khi thất bại. |
| Output / Post-condition | Nhập đúng làm tăng tồn tương ứng; nhập sai không tạo lô. Không làm sửa lô/xóa lô hoặc phiếu nhập nhiều bước. |

*Hình 4.15. SQ-F006 — Nhập lô*


#### FR-007 / F007 – Tra cứu kho


| Mô tả | Tra cứu kho |
|---|---|
| Module / Submodule | Thuộc M03 – Kho và báo cáo, SM03.01 – Lô thuốc. |
| Actor | Staff/Admin. |
| Input / Pre-condition | Đã đăng nhập đúng quyền; chọn thuốc hoặc tìm theo mã/tên. |
| Main Flow | Xem từng lô, hạn, số lượng, trạng thái hết hạn, tổng tồn thực tế, tồn còn hạn, lượng giữ và tồn khả dụng. Tồn thực tế bao gồm lô hết hạn; tồn khả dụng không gồm lô hết hạn và phần đang giữ. |
| Luồng thay thế/ngoại lệ | Không có thuốc/lô thì thông báo rõ. Guest/User không truy cập kho chi tiết qua URL hoặc yêu cầu trực tiếp. |
| Output / Post-condition | Các số tồn khớp các lô và giữ hàng; xem kho không thay đổi bất kỳ dữ liệu nào. |

*Hình 4.16. SQ-F007 — Tra cứu kho*

*Hình 4.17. UC-SM03.02 — Xử lý tồn kho*


#### FR-008 / F008 – Xử lý kho theo giao dịch


| Mô tả | Xử lý kho theo giao dịch |
|---|---|
| Module / Submodule | Thuộc M03 – Kho và báo cáo, SM03.02 – Xử lý tồn kho. |
| Actor | Xử lý nội bộ qua đặt thanh toán, hủy đơn và hoàn tất bán. |
| Input / Pre-condition | Giao dịch hợp lệ; lượng cần bán nguyên dương. |
| Main Flow | Kiểm tra tồn khả dụng; giữ hàng khi mở thanh toán trực tuyến lần đầu và giải phóng khi hủy đơn chưa duyệt. Khi xuất, lập kế hoạch FEFO từ lô còn hạn: hạn gần trước, cùng hạn theo số lô tăng dần; cho phép chia nhiều lô. Kiểm tra lại tại thời điểm ghi; cập nhật qua phương thức của Drug/DrugBatch và giải phóng lượng giữ trong cùng giao dịch. |
| Luồng thay thế/ngoại lệ | Thiếu hàng hoặc lô hết hạn thì từ chối toàn bộ. Không để tồn âm, không giữ/trừ lặp khi mở QR hoặc gửi lại thao tác. Đơn đã giữ nhưng thiếu hàng hợp lệ khi xuất phải dừng xuất; không tự đổi thanh toán đã duyệt về chưa thanh toán. |
| Output / Post-condition | Không có bán vượt tồn khi hai đơn cùng mua phần hàng cuối; tổng phân bổ bằng lượng bán và không sử dụng lô hết hạn. |

*Hình 4.18. SQ-F008 — Xử lý kho theo giao dịch*

*Hình 4.19. UC-SM03.03 — Báo cáo kho*


#### FR-009 / F009 – Xem báo cáo cảnh báo


| Mô tả | Xem báo cáo cảnh báo |
|---|---|
| Module / Submodule | Thuộc M03 – Kho và báo cáo, SM03.03 – Báo cáo kho. |
| Actor | Staff/Admin. |
| Input / Pre-condition | Kho đã có dữ liệu. Chọn tồn thấp hoặc sắp hết hạn. |
| Main Flow | Tồn thấp: liệt kê thuốc có tồn khả dụng ≤ ngưỡng, gồm tồn bằng 0; hiển thị mã/tên/tồn/ngưỡng, sắp tồn tăng rồi mã. Sắp hết hạn: nhập số ngày nguyên dương, mặc định 30; chọn lô còn số lượng với 0 < số ngày còn lại ≤ cửa sổ; hiển thị thuốc/lô/số lượng/hạn/ngày còn, sắp hạn tăng. |
| Luồng thay thế/ngoại lệ | Từ chối cửa sổ không hợp lệ; báo rõ khi rỗng. Lô hết hạn hoặc hết hàng không vào báo cáo sắp hết hạn. Không cho Guest/User mở báo cáo. |
| Output / Post-condition | Hai báo cáo đúng cả biên bằng ngưỡng và bằng số ngày cảnh báo; không làm thay đổi dữ liệu. |

*Hình 4.20. SQ-F009 — Xem báo cáo cảnh báo*


### 4.4. M04 – Đơn thuốc

*Hình 4.21. UC-M04 — Đơn thuốc*

*Hình 4.22. UC-SM04.01 — Tiếp nhận đơn thuốc*


#### FR-010 / F010 – Tiếp nhận và tra cứu đơn thuốc


| Mô tả | Tiếp nhận và tra cứu đơn thuốc |
|---|---|
| Module / Submodule | Thuộc M04 – Đơn thuốc, SM04.01 – Tiếp nhận đơn thuốc. |
| Actor | User gửi/xem của mình; Staff/Admin tiếp nhận và tra cứu. |
| Input / Pre-condition | User đã đăng nhập; Staff/Admin có quyền nghiệp vụ. |
| Main Flow | User gửi ảnh PNG/JPG/JPEG tối đa 5 MB và mã/tên người bệnh; tạo trạng thái Chờ kiểm tra, gắn tài khoản gửi. Staff/Admin nhập đơn tại quầy hoặc tiếp nhận ảnh, gồm mã đơn, người bệnh, người kê, ngày kê/hết hiệu lực và các dòng thuốc/số lượng. Xem danh sách/chi tiết theo quyền; gộp dòng trùng thuốc. |
| Luồng thay thế/ngoại lệ | Từ chối file sai loại/quá lớn, mã trùng, thuốc không tồn tại, số lượng không dương hoặc đơn không có dòng. User không xem đơn của người khác. Ảnh gửi chưa là đơn đã duyệt. |
| Output / Post-condition | User thấy đơn đang chờ; Staff/Admin xem và đối chiếu được. Tiếp nhận chưa trừ kho hoặc tăng lượng đã cấp. |

*Hình 4.23. SQ-F010 — Tiếp nhận và tra cứu đơn thuốc*

*Hình 4.24. UC-SM04.02 — Kiểm tra đơn thuốc*


#### FR-011 / F011 – Xử lý đơn thuốc


| Mô tả | Xử lý đơn thuốc |
|---|---|
| Module / Submodule | Thuộc M04 – Đơn thuốc, SM04.02 – Kiểm tra đơn thuốc. |
| Actor | Staff/Admin. |
| Input / Pre-condition | Có đơn đã tiếp nhận. Người xử lý đối chiếu ảnh và dữ liệu nếu mua trực tuyến. |
| Main Flow | Chấp nhận hoặc từ chối kèm lý do; ghi người/thời gian xử lý. Ngày kê không ở tương lai, ngày hết hiệu lực ≥ ngày kê. Khi bán kiểm tra đơn được chấp nhận, chưa hủy, đúng người bệnh, IssueDate ≤ D ≤ ValidUntil; mọi thuốc bán theo đơn có trong đơn và không vượt lượng còn được cấp. Theo dõi lượng kê, đang giữ, đã cấp; cho cấp một phần. Có thể hủy hiệu lực đơn chưa cấp đầy đủ. |
| Luồng thay thế/ngoại lệ | Từ chối đơn hết hạn/chưa tới ngày, sai người bệnh, thuốc ngoài đơn, quá hạn mức hoặc đơn bị hủy. User không chấp nhận đơn của mình. Lượng giữ cho đơn khác cũng phải được trừ khi kiểm tra hạn mức. |
| Output / Post-condition | Đơn hợp lệ mở được mua theo đơn; đơn sai bị chặn. Hai đơn hàng không cùng sử dụng một phần hạn mức còn lại. |

*Hình 4.25. SQ-F011 — Xử lý đơn thuốc*


### 4.5. M05 – Giỏ và đơn hàng

*Hình 4.26. UC-M05 — Giỏ và đơn hàng*

*Hình 4.27. UC-SM05.01 — Giỏ hàng*


#### FR-012 / F012 – Quản lý giỏ hàng


| Mô tả | Quản lý giỏ hàng |
|---|---|
| Module / Submodule | Thuộc M05 – Giỏ và đơn hàng, SM05.01 – Giỏ hàng. |
| Actor | User. |
| Input / Pre-condition | Đăng nhập role User; sản phẩm đang bán. |
| Main Flow | Gộp thêm thuốc, tăng/giảm số lượng, bỏ thuốc và xem giỏ/tổng tiền tạm tính. Một thuốc có một dòng; thêm lại cộng số lượng. Giá giỏ là giá hiện tại, chưa phải giá đã chốt của đơn. Giỏ gắn tài khoản và lưu database; thêm giỏ chưa giữ kho. |
| Luồng thay thế/ngoại lệ | Guest chuyển tới đăng nhập; yêu cầu trực tiếp không có quyền bị chặn. Số lượng phải nguyên dương; sản phẩm tắt bán hoặc không đủ khả dụng phải báo để sửa. Không dùng giá/tổng do trình duyệt gửi làm giá chính thức. |
| Output / Post-condition | Giỏ đúng dòng/số lượng/tạm tính; khách không thao tác giỏ người khác; kho chưa thay đổi. |

*Hình 4.28. SQ-F012 — Quản lý giỏ hàng*

*Hình 4.29. UC-SM05.02 — Đơn hàng cá nhân*


#### FR-013 / F013 – Đặt hàng


| Mô tả | Đặt hàng |
|---|---|
| Module / Submodule | Thuộc M05 – Giỏ và đơn hàng, SM05.02 – Đơn hàng cá nhân. |
| Actor | User. |
| Input / Pre-condition | Giỏ không rỗng; thông tin người nhận đầy đủ; chọn OTC hoặc theo đơn và cách nhận. |
| Main Flow | Nhập tên, điện thoại và nhận tại quầy hoặc giao đến địa chỉ; giao hàng bắt buộc có địa chỉ. Kiểm tra lại thuốc/giá/lượng tại máy chủ; tạo mã duy nhất, lưu giá từng dòng và tổng là tổng tiền sản phẩm. Theo đơn liên kết một đơn thuốc và người bệnh; đơn chưa duyệt ở Chờ kiểm tra, chưa được thanh toán. Đơn đủ điều kiện ở Chờ thanh toán; đặt xong bỏ các dòng đã đặt khỏi giỏ. |
| Luồng thay thế/ngoại lệ | Từ chối giỏ rỗng, dữ liệu sai, thiếu hàng hoặc OTC có thuốc cần đơn/kiểm soát. Nếu giá thay đổi từ lúc xem giỏ, hiển thị giá mới và yêu cầu khách xác nhận trước khi tạo. Không nhận giá hoặc UserId tùy ý từ khách. |
| Output / Post-condition | Tạo được đơn của chính User, không có phí ship. Tạo đơn chưa là đã thanh toán và chưa xuất kho. |

*Hình 4.30. SQ-F013 — Đặt hàng*


#### FR-014 / F014 – Quản lý đơn của mình


| Mô tả | Quản lý đơn của mình |
|---|---|
| Module / Submodule | Thuộc M05 – Giỏ và đơn hàng, SM05.02 – Đơn hàng cá nhân. |
| Actor | User. |
| Input / Pre-condition | Đã đăng nhập; đơn thuộc tài khoản. |
| Main Flow | Gộp lịch sử, chi tiết, trạng thái đơn và thanh toán; hiển thị số tiền, người nhận, lý do chưa duyệt/từ chối nếu có. Cho hủy đơn Chờ kiểm tra/Chờ thanh toán khi chưa xác nhận thanh toán; hủy đồng thời giải phóng hàng/hạn mức đang giữ. |
| Luồng thay thế/ngoại lệ | Chặn xem/hủy đơn người khác, đơn đã thanh toán hoặc đã xuất. Sau hủy không mở QR/duyệt/xuất đơn đó. Không sửa nội dung đơn đã chốt; muốn thay đổi thì hủy đơn đủ điều kiện và đặt lại. |
| Output / Post-condition | User chỉ thấy dữ liệu của mình. Hủy hợp lệ không đổi tồn thực tế và không tăng lượng đã cấp. |

*Hình 4.31. SQ-F014 — Quản lý đơn của mình*

*Hình 4.32. UC-SM05.03 — Xử lý đơn hàng*


#### FR-015 / F015 – Quản lý đơn trực tuyến


| Mô tả | Quản lý đơn trực tuyến |
|---|---|
| Module / Submodule | Thuộc M05 – Giỏ và đơn hàng, SM05.03 – Xử lý đơn hàng. |
| Actor | Staff/Admin. |
| Input / Pre-condition | Đã đăng nhập đúng quyền. |
| Main Flow | Xem/tìm/lọc đơn; xử lý yêu cầu và ghi người phụ trách khi nhận xử lý. Đơn OTC đủ điều kiện tới Chờ thanh toán; đơn cần đơn chờ kết quả FR-011. Chuyển đơn đã trả tiền sang chuẩn bị; trước giao/nhận tại quầy gọi F019 để xuất và lập hóa đơn. Cập nhật Đang giao/Hoàn tất, hoặc từ chối/hủy đơn chưa thanh toán kèm lý do. |
| Luồng thay thế/ngoại lệ | Không giao/hoàn tất đơn chưa trả tiền hoặc chưa xuất thành công. Không tùy ý hủy đơn đã thanh toán. Trường hợp tiền về sau hủy hoặc cần trả tiền được xử lý ngoài ứng dụng; không tự xóa ghi nhận tiền. |
| Output / Post-condition | Luồng trạng thái hợp lệ, người xử lý được ghi nhận; việc cập nhật giao hàng không trừ kho lần nữa. |

*Hình 4.33. SQ-F015 — Quản lý đơn trực tuyến*

*Hình 4.34. UC-SM05.04 — Bán tại quầy*


#### FR-016 / F016 – Lập giao dịch tại quầy


| Mô tả | Lập giao dịch tại quầy |
|---|---|
| Module / Submodule | Thuộc M05 – Giỏ và đơn hàng, SM05.04 – Bán tại quầy. |
| Actor | Staff/Admin. |
| Input / Pre-condition | Chọn luồng OTC hoặc theo đơn; nhập thuốc/số lượng. |
| Main Flow | Gộp tạo, xem, sửa và hủy nháp của người lập. OTC tạo OTCSale; theo đơn tạo PrescriptionSale với mã đơn/người bệnh. Gộp thuốc trùng, tính tổng tạm; chỉ hiện xác nhận hoàn tất khi điều kiện hợp lệ. Tại quầy ghi nhận tiền mặt đã nhận và gọi F019; không áp dụng luồng chờ QR của khách trực tuyến. |
| Luồng thay thế/ngoại lệ | OTC phải chặn thuốc cần đơn/kiểm soát dù nhập thêm mã đơn. Theo đơn kiểm tra FR-011. Không sửa/hủy/hoàn tất nháp người khác, kể cả Admin. Nháp đã hủy/hoàn tất không dùng lại. |
| Output / Post-condition | Hai loại Sale dùng cùng giao diện xử lý nhưng khác kiểm tra; nháp chưa trừ kho. Không phát sinh chức năng tính tiền thừa hoặc công nợ. |

*Hình 4.35. SQ-F016 — Lập giao dịch tại quầy*


### 4.6. M06 – Thanh toán và hóa đơn

*Hình 4.36. UC-M06 — Thanh toán và hóa đơn*

*Hình 4.37. UC-SM06.01 — Thanh toán QR*


#### FR-017 / F017 – Hiển thị thanh toán


| Mô tả | Hiển thị thanh toán |
|---|---|
| Module / Submodule | Thuộc M06 – Thanh toán và hóa đơn, SM06.01 – Thanh toán QR. |
| Actor | User với đơn của mình; Admin cấu hình QR. |
| Input / Pre-condition | Đơn Chờ thanh toán đủ điều kiện bán; tài khoản nhận và QR đã được cấu hình. |
| Main Flow | User bấm Thanh toán để mở ngay QR cố định, tên ngân hàng/chủ tài khoản/số tài khoản, mã đơn, tổng cần chuyển và nội dung chuyển khoản chính là mã đơn. Lần đầu kiểm tra/giữ hàng và hạn mức đơn thuốc, tạo thanh toán Chờ duyệt; mở lại dùng cùng bản ghi. Admin cập nhật cấu hình QR trong phần cài đặt của chức năng này. Đơn đã mở QR lưu bản chụp thông tin nhận tiền để lần xem sau không đổi tài khoản đích. |
| Luồng thay thế/ngoại lệ | Chưa duyệt đơn thuốc, đơn đã hủy, thiếu hàng/hạn mức hoặc thiếu cấu hình thì không mở thanh toán. Guest/Staff không thanh toán thay khách. Không có nút Tôi đã chuyển khoản, tải biên lai hoặc gọi API ngân hàng. |
| Output / Post-condition | Hiển thị trực tiếp QR và đúng tổng đã chốt; chưa thành Đã xác nhận chỉ vì mở trang. Hiển thị đầy đủ cảnh báo chuyển thiếu/thừa ở Phần 6. |

*Hình 4.38. SQ-F017 — Hiển thị thanh toán*

*Hình 4.39. UC-SM06.02 — Xác nhận thanh toán*


#### FR-018 / F018 – Duyệt thanh toán


| Mô tả | Duyệt thanh toán |
|---|---|
| Module / Submodule | Thuộc M06 – Thanh toán và hóa đơn, SM06.02 – Xác nhận thanh toán. |
| Actor | Staff/Admin. |
| Input / Pre-condition | Đơn có thanh toán Chờ duyệt; người xử lý đã đối chiếu tiền thực nhận ngoài website. |
| Main Flow | Xem danh sách chờ, đối chiếu mã đơn, nhập mã giao dịch, số tiền nhận, thời điểm nhận và ghi chú. Duyệt khi đúng giao dịch và số tiền nhận ≥ tổng phải trả; ghi ApprovedBy/ApprovedAt và chuyển đơn sang Đang chuẩn bị. Chuyển thiếu không duyệt, giữ Chờ duyệt và ghi lý do. Chuyển thừa có thể duyệt đơn theo tổng yêu cầu, lưu số tiền thực nhận; phần thừa không có xử lý hoàn tự động. |
| Luồng thay thế/ngoại lệ | User/Guest không duyệt. Mã giao dịch đối chiếu chỉ gắn một đơn; bản ghi đã duyệt không duyệt lại. Hai người duyệt đồng thời chỉ một thao tác thành công. Đơn hủy/chưa đủ điều kiện không được duyệt; không tự suy ra tiền về từ QR. |
| Output / Post-condition | Admin và Staff đều duyệt được theo quyền. Duyệt chưa trừ kho và chưa chứng minh đã giao hàng; ghi nhận truy vết của lần duyệt. |

*Hình 4.40. SQ-F018 — Duyệt thanh toán*

*Hình 4.41. UC-SM06.03 — Hoàn tất bán hàng*


#### FR-019 / F019 – Hoàn tất giao dịch


| Mô tả | Hoàn tất giao dịch |
|---|---|
| Module / Submodule | Thuộc M06 – Thanh toán và hóa đơn, SM06.03 – Hoàn tất bán hàng. |
| Actor | Staff/Admin; xử lý chung cho bán tại quầy và đơn trực tuyến. |
| Input / Pre-condition | Nháp tại quầy của người lập hoặc đơn trực tuyến đã xác nhận thanh toán/chưa xuất. |
| Main Flow | CheckoutService kiểm tra quyền, gọi Sale.Validate(context) theo subtype, kiểm tra toàn bộ dòng/hạn mức và gọi F008 lập/xuất lô. Trong một transaction: trừ kho, giảm giữ hàng, cập nhật đã cấp và giải phóng giữ hạn mức, ghi Sale Completed và hóa đơn duy nhất. Đơn trực tuyến vẫn theo trạng thái giao hàng riêng; tại quầy hoàn tất sau xác nhận đã nhận tiền mặt. |
| Luồng thay thế/ngoại lệ | Lỗi ở một dòng hoặc lúc ghi database thì rollback toàn bộ xuất kho/hạn mức/Sale/hóa đơn; thanh toán đã duyệt trước đó vẫn được giữ. Không xuất lặp. Nếu lô đã hết hạn lúc xuất, phân bổ lại lô hợp lệ hoặc dừng khi không đủ. |
| Output / Post-condition | Một luồng hoàn tất dùng được cho OTCSale/PrescriptionSale. Chỉ giao dịch xuất thành công có hóa đơn; lỗi không làm thay đổi dữ liệu một phần. |

*Hình 4.42. SQ-F019 — Hoàn tất giao dịch*

*Hình 4.43. UC-SM06.04 — Tra cứu hóa đơn*


#### FR-020 / F020 – Xem hóa đơn


| Mô tả | Xem hóa đơn |
|---|---|
| Module / Submodule | Thuộc M06 – Thanh toán và hóa đơn, SM06.04 – Tra cứu hóa đơn. |
| Actor | User của hóa đơn; Staff đã lập/xử lý; Admin tất cả. |
| Input / Pre-condition | Giao dịch đã xuất/hoàn tất thành công. |
| Main Flow | Tra cứu và xem mã hóa đơn, loại bán, kênh bán, thời gian, khách/người nhận nếu có, người lập, mã đơn thuốc nếu có, thuốc, lô xuất, số lượng, đơn vị, đơn giá đã chốt, thành tiền và tổng. Hóa đơn trực tuyến gắn User và Order; tại quầy có thể không có tài khoản khách. |
| Luồng thay thế/ngoại lệ | Không hiển thị hóa đơn chính thức cho nháp hoặc đơn chỉ mới trả tiền. Chặn User xem hóa đơn người khác, Staff ngoài phạm vi. Hóa đơn không sửa/xóa; đổi danh mục không đổi lịch sử. |
| Output / Post-condition | Thông tin hóa đơn khớp xuất kho và tổng không có phí ship. Không làm in/xuất PDF/Excel trong phạm vi chức năng. |

*Hình 4.44. SQ-F020 — Xem hóa đơn*


## 5. Yêu cầu phi chức năng


| Mã | Nhóm | Yêu cầu kiểm chứng |
|---|---|---|
| NFR-01 | Hiệu năng | Với dữ liệu demo tối đa 500 thuốc, 2.000 lô và 1.000 đơn trên máy chạy cục bộ, ít nhất 95% thao tác tra cứu, mở giỏ và mở danh sách trong 20 lượt đo hoàn tất trong 2 giây. Không tính thời gian người dùng mở ứng dụng ngân hàng. |
| NFR-02 | Bảo mật và quyền | Mật khẩu lưu bằng PasswordHasher của .NET, không lưu dạng rõ hoặc ghi ra log/giao diện. Kiểm tra role và chủ sở hữu ở server; Guest không nhận giá trong dữ liệu sản phẩm. Form thay đổi dữ liệu có chống giả mạo yêu cầu (anti-forgery); không tin UserId, role, giá và tổng do trình duyệt gửi. |
| NFR-03 | Nhất quán dữ liệu | Giữ hàng, duyệt thanh toán và xuất phải chống thao tác lặp/yêu cầu đồng thời. Dùng transaction và ràng buộc duy nhất cho username, lô, mã đơn, mã giao dịch đã đối chiếu và hóa đơn của Sale. Lỗi phải giữ được dữ liệu trước thao tác. |
| NFR-04 | Lưu dữ liệu | Tài khoản, giỏ, thuốc/lô, đơn thuốc, đơn hàng, thanh toán, giữ hàng, Sale và hóa đơn lưu SQLite. Tắt/mở lại ứng dụng không làm mất hoặc nạp đè dữ liệu. Không lưu mật khẩu rõ trong dữ liệu mẫu. |
| NFR-05 | Khả năng sử dụng | Giao diện tiếng Việt, định dạng giá VND rõ, ô mật khẩu che ký tự. Homepage cho Guest/User; dashboard Admin/Staff có tên tài khoản, role và menu tương ứng. Lỗi chỉ rõ trường cần sửa, giữ dữ liệu hợp lệ để người dùng nhập lại. |
| NFR-06 | Tương thích | Chạy cục bộ trên Windows với .NET 10 và SQLite, kiểm tra bằng Edge/Chrome. Giao diện sử dụng được ở chiều rộng 1366 px và 390 px; bảng dài có cơ chế cuộn phù hợp, QR và số tiền không bị che. |
| NFR-07 | Khả năng bảo trì và OOP | Controller/View chỉ tiếp nhận và hiển thị; nghiệp vụ nằm trong các lớp/service. Giữ Sale abstract với OTCSale/PrescriptionSale, bảo vệ lượng tồn/hạn mức qua phương thức nghiệp vụ và tách InventoryReportService khỏi xử lý bán. |
| NFR-08 | Kiểm chứng và lỗi | xUnit kiểm thử quy tắc nghiệp vụ; kiểm thử tích hợp cho phân quyền, lưu SQLite, duyệt đồng thời và rollback. Dùng ngày nghiệp vụ truyền vào để kiểm tra biên hạn. Không hiển thị stack trace cho người dùng; lỗi hệ thống được ghi phục vụ sửa. |


## 6. Giao diện và giao tiếp bên ngoài


### 6.1. Homepage và dashboard


| Giao diện | Nội dung và quyền |
|---|---|
| Homepage Guest | Danh sách/tìm kiếm/chi tiết thuốc; không có giá; đăng ký và đăng nhập. Bấm mua đưa tới đăng nhập. |
| Homepage User | Thông tin và giá sản phẩm; giỏ; gửi/xem đơn thuốc; đơn cá nhân; QR và hóa đơn của mình. |
| Dashboard Admin | Tổng quan số đơn chờ duyệt/đang xử lý và cảnh báo kho. Menu tài khoản, thuốc, nhập/tra cứu kho, đơn thuốc, đơn hàng, thanh toán, bán tại quầy, báo cáo, hóa đơn và cài đặt QR. |
| Dashboard Staff | Tổng quan công việc: đơn thuốc chờ kiểm tra, đơn chờ thanh toán, đơn đang chuẩn bị. Menu đơn thuốc, đơn hàng, duyệt thanh toán, bán tại quầy, kho, báo cáo và hóa đơn theo quyền. |
| Giỏ/đặt hàng | Thuốc, đơn vị, giá, số lượng, tổng; người nhận, điện thoại, nhận tại quầy/giao đến địa chỉ và đơn thuốc nếu cần. Không có ô phí ship. |
| Thanh toán QR | Ảnh QR cố định, tài khoản nhận, mã đơn, tổng phải chuyển, nội dung chuyển khoản; cảnh báo thiếu/thừa và trạng thái chờ duyệt. Không có upload biên lai/nút báo chuyển khoản. |
| Duyệt thanh toán | Admin/Staff xem đơn chờ, nhập thông tin giao dịch thực nhận và xác nhận hoặc ghi lý do chưa duyệt. |
| Bán tại quầy | Chọn OTC/theo đơn; chỉnh nháp; xem tổng; xác nhận đã nhận tiền mặt và hoàn tất. |
| Chi tiết đơn/hóa đơn | Trạng thái thanh toán và giao hàng tách riêng; giá đã chốt, thuốc/lô/số lượng, người xử lý; chỉ hiện thao tác hợp lệ theo quyền. |

Hai dashboard có đường truy cập riêng, ví dụ /admin và /staff, cùng kiểm tra role ở server. Có thể dùng chung layout và các View nghiệp vụ; việc tách dashboard không yêu cầu viết hai hệ thống quản lý độc lập. Các thẻ tổng quan chỉ đưa tới những function hiện có, không tạo thêm module báo cáo kinh doanh.


### 6.2. Màn hình QR và thông báo

User bấm Thanh toán ở đơn đủ điều kiện thì mở trực tiếp trang QR. Trang phải hiển thị số tiền theo giá đã chốt, mã đơn và thông tin tài khoản nhận. QR là ảnh có sẵn do Admin cấu hình; khách tự nhập số tiền và nội dung trong ứng dụng ngân hàng. Có thể có nút sao chép số tài khoản/nội dung để giảm nhập sai.

Thông báo bắt buộc: “Vui lòng kiểm tra kỹ số tiền và nội dung chuyển khoản trước khi thanh toán. Chuyển thiếu số tiền yêu cầu sẽ không được duyệt. Nếu chuyển thừa, cửa hàng không chịu trách nhiệm đối với phần tiền chuyển thừa. Sau khi chuyển khoản, vui lòng chờ Admin hoặc nhân viên kiểm tra và xác nhận.”

Thông báo trên là nội dung giao diện của bản đồ án. Hệ thống lưu số tiền thực nhận khi đối chiếu; tổng hóa đơn vẫn là tiền sản phẩm. Chưa có nghiệp vụ hoàn tiền tự động. Nếu tiền về sau khi hủy đơn hoặc cần xử lý ngoại lệ, người vận hành giải quyết ngoài ứng dụng và không tự sửa lịch sử thành chưa nhận tiền.


### 6.3. Giao diện phần mềm, phần cứng và truyền thông

Trình duyệt giao tiếp với ASP.NET Core qua HTTP ở môi trường localhost; nếu triển khai môi trường có tài khoản thật thì dùng HTTPS. EF Core thao tác với file SQLite. Hình sản phẩm/đơn thuốc/QR lưu cục bộ, database lưu đường dẫn; ảnh đơn thuốc được đọc qua điểm truy cập có kiểm tra quyền, không đặt công khai.

Không cần thiết bị phần cứng riêng. Khách có thể dùng điện thoại quét QR từ màn hình hoặc lưu ảnh để ứng dụng ngân hàng đọc. Admin/Staff kiểm tra giao dịch bằng ứng dụng ngân hàng bên ngoài website. Không có callback/webhook, đồng bộ ngân hàng, API ví hoặc API giao hàng.


## 7. Luồng xử lý, trạng thái và dữ liệu


### 7.1. Các luồng sử dụng chính


#### UC-01 – Đăng ký, đăng nhập và chọn giao diện

Guest đăng ký User → đăng nhập → homepage có giá/giỏ. Staff đăng nhập → dashboard nhân viên. Admin đăng nhập → dashboard quản lý. Đăng xuất kết thúc xác thực; không xóa giỏ, đơn hoặc nháp đã lưu. Sai thông tin thì không mở được giao diện có quyền.


#### UC-02 – Mua OTC trực tuyến và duyệt QR

User thêm giỏ → kiểm tra thông tin người nhận → đặt đơn OTC → đơn Chờ thanh toán → bấm Thanh toán mở QR và giữ hàng → Admin/Staff đối chiếu rồi duyệt → đơn Đang chuẩn bị → gọi F019 xuất/lập hóa đơn → giao hoặc nhận tại quầy → Hoàn tất. Thiếu tiền thì chưa duyệt; thiếu hàng lúc giữ thì chưa mở thanh toán.


#### UC-03 – Mua theo đơn thuốc trực tuyến

User gửi ảnh/thông tin đơn → Staff/Admin đối chiếu và nhập dòng thuốc → chấp nhận hoặc từ chối → User đặt đơn theo đơn thuốc. Nếu ảnh còn chờ kiểm tra, đơn hàng Chờ kiểm tra và chưa được mở QR. Đơn hợp lệ chuyển Chờ thanh toán; mở QR giữ cả hàng và hạn mức; tiếp tục luồng UC-02. Hệ thống kiểm tra lại đơn thuốc khi xuất, không chỉ lúc xem ảnh.


#### UC-04 – Bán tại quầy và kiểm tra đa hình

Staff/Admin tạo nháp qua kiểu Sale, chọn OTCSale hoặc PrescriptionSale → thêm thuốc/số lượng → xác nhận nhận tiền mặt → gọi chung CheckoutService.Checkout(Sale). OTC chặn thuốc cần đơn/kiểm soát; PrescriptionSale kiểm tra tham chiếu và hạn mức. Một nháp không tự đổi loại khi bổ sung mã đơn. Nháp sai có thể sửa/hủy; nháp đã hoàn tất không dùng lại.


#### UC-05 – Hủy đơn chưa duyệt thanh toán

User mở đơn của mình hoặc Staff/Admin xử lý đơn → kiểm tra chưa xác nhận thanh toán/chưa xuất → hủy đơn → giải phóng hàng và hạn mức giữ trong cùng transaction. Mọi thao tác mở QR/duyệt/xuất sau đó bị chặn. Nếu duyệt và hủy đến đồng thời, chỉ thao tác đáp ứng trạng thái hiện tại được ghi thành công.


#### UC-06 – Nhập lô và xem báo cáo

Admin nhập lô hợp lệ → Staff/Admin xem tồn thực tế/tồn khả dụng → mở báo cáo tồn thấp hoặc sắp hết hạn. Thuốc hết hạn không được tính vào lượng có thể bán; lô còn hạn gần nhất được ưu tiên lúc xuất. Guest/User không xem kho chi tiết hoặc báo cáo.


### 7.2. Trạng thái và điều kiện chuyển


| Đối tượng | Trạng thái và điều kiện |
|---|---|
| Đơn thuốc | Chờ kiểm tra → Đã chấp nhận hoặc Từ chối. Đã chấp nhận có thể Hủy hiệu lực khi chưa cấp đầy đủ. Lượng cấp một phần/đầy đủ được tính từ các dòng, không thay cho kiểm tra ngày hiệu lực. |
| Đơn trực tuyến | Chờ kiểm tra (nếu cần) → Chờ thanh toán → Đang chuẩn bị → Đang giao → Hoàn tất. Nhận tại quầy: Đang chuẩn bị → Hoàn tất sau xuất/nhận. Đơn chưa trả tiền có thể Hủy/Từ chối; trạng thái kết thúc không mở lại. |
| Thanh toán | Chưa mở thanh toán: chưa có bản ghi. Mở QR: Chờ duyệt → Đã xác nhận sau Admin/Staff duyệt. Thiếu tiền/chưa đối chiếu: vẫn Chờ duyệt, kèm lý do. Đơn hủy có thể lưu thanh toán Đã đóng, không được duyệt tiếp. |
| Sale tại quầy | Draft → Completed hoặc Cancelled. Chỉ chủ nháp sửa/hủy/checkout; Completed/Cancelled không sửa hoặc checkout lại. |
| Sale của đơn trực tuyến | Tạo và hoàn tất khi F019 xuất thành công; gắn một Order. Một Order chỉ có một Sale đã hoàn tất và một hóa đơn. Trạng thái Sale Completed không tự có nghĩa đơn đã giao. |
| Giữ hàng/hạn mức | Đang giữ → Đã dùng khi xuất hoặc Đã giải phóng khi hủy. Không tự hết hạn theo đồng hồ trong phạm vi tối giản; đơn chưa trả tiền tồn lâu được người vận hành xử lý hủy sau đối chiếu. |

Tiền đã xác nhận không tự bị xóa khi xuất kho thất bại. Đơn vẫn chờ xử lý chuẩn bị, ghi lỗi và không có hóa đơn mới. Nếu hàng giữ hết hạn trước khi xuất, F008 phải tìm lô còn hạn khác; khi không đủ thì dừng để người vận hành xử lý. Thao tác đổi trạng thái giao hàng không tạo thêm lần xuất.


### 7.3. Quan hệ dữ liệu

UserAccount có nhiều CartItem, Order và Prescription gửi trực tuyến. Drug có nhiều DrugBatch; Prescription có nhiều PrescriptionItem. Order có nhiều OrderItem, tối đa một Payment và một Sale hoàn tất; OrderItem giữ giá/đơn vị lúc đặt. StockReservation liên kết Order với Drug và PrescriptionItem nếu có. Sale có nhiều SaleItem; SaleItem có nhiều BatchAllocation tới các lô thực xuất. Invoice tham chiếu duy nhất một Sale. PaymentSetting chứa cấu hình nhận tiền dùng chung; Payment giữ bản chụp cấu hình khi mở QR.

Tài khoản người tạo, người kiểm tra đơn thuốc, người duyệt thanh toán và người xuất được lưu theo UserId. Chủ sở hữu dữ liệu khách hàng lấy từ tài khoản đăng nhập. Người bệnh trên đơn thuốc có mã/tên để đối chiếu, không tạo role hoặc module tài khoản riêng.


### 7.4. Từ điển dữ liệu


| Đối tượng | Trường / kiểu dữ liệu | Ý nghĩa và ràng buộc |
|---|---|---|
| UserAccount | UserId / Username / NormalizedUsername <br> string | Mã duy nhất; username 3–30 ký tự; normalized duy nhất, bỏ khoảng trắng hai đầu và không phân biệt hoa/thường. |
| UserAccount | PasswordHash / Role <br> string / enum | Hash mật khẩu; Role chỉ User, Staff, Admin. Không có mật khẩu rõ, trạng thái hoạt động, bộ đếm sai hoặc khóa tạm. |
| Drug | DrugId / Name / Description / ImagePath <br> string | Mã duy nhất; tên bắt buộc; mô tả/ảnh tùy chọn. |
| Drug | SaleUnit / UnitPrice / LowStockThreshold <br> string / decimal / int | Một đơn vị bán; giá nguyên dương VND; ngưỡng không âm. |
| Drug | RequiresPrescription / IsControlled / IsForSale <br> bool | Controlled kéo theo RequiresPrescription; tắt bán ngăn đơn mới, không xóa lịch sử. |
| DrugBatch | BatchId / DrugId / BatchNumber <br> string | FK thuốc; cặp DrugId+BatchNumber duy nhất. |
| DrugBatch | ExpiryDate / InitialQuantity / Quantity <br> DateOnly / int | Ngày hợp lệ; nhập còn hạn; lượng ban đầu dương; lượng hiện có không âm. |
| Prescription | PrescriptionId / OwnerUserId / CreatedByUserId <br> string / nullable string | Mã duy nhất; Owner là User gửi hoặc null khi tại quầy; CreatedBy là người tiếp nhận. |
| Prescription | PatientId / PatientName / PrescriberName <br> string | Thông tin đối chiếu; người kê phải có khi chấp nhận. |
| Prescription | ImagePath / IssueDate / ValidUntil <br> nullable string / nullable DateOnly | Ảnh trực tuyến; ngày có thể chưa nhập ở trạng thái chờ, bắt buộc trước chấp nhận. |
| Prescription | Status / ReviewedByUserId / ReviewedAt / ReviewNote <br> enum / nullable | PendingReview, Approved, Rejected, Cancelled; người/thời gian/lý do xử lý. |
| PrescriptionItem | ItemId / PrescriptionId / DrugId <br> string | Một dòng mỗi thuốc trong một đơn. |
| PrescriptionItem | PrescribedQuantity / DispensedQuantity <br> int | Kê dương; đã cấp không âm và không vượt lượng kê. Phần đang giữ lấy từ StockReservation. |
| CartItem | UserId / DrugId / Quantity <br> string / int | Cặp UserId+DrugId duy nhất; lượng nguyên dương; chưa giữ hàng. |
| Order | OrderId / UserId / CreatedAt / SaleKind <br> string / DateTimeOffset / enum | Mã duy nhất; chủ đơn; thời điểm tạo; OTC hoặc Prescription. |
| Order | ReceiverName / Phone / ReceiveMethod / Address <br> string / enum | Tên/điện thoại bắt buộc; Pickup hoặc Delivery; địa chỉ bắt buộc khi Delivery. |
| Order | PrescriptionId / PatientId / HandledByUserId <br> nullable string | Tham chiếu/người bệnh cần khi bán theo đơn; người xử lý được ghi khi thực hiện công việc. |
| Order | Status / TotalAmount / Note <br> enum / decimal / string | WaitingReview, AwaitingPayment, Preparing, Delivering, Completed, Cancelled, Rejected. Tổng là tiền sản phẩm; không có ShippingFee. |
| OrderItem | OrderItemId / OrderId / DrugId / DrugName / Unit <br> string | Tham chiếu và bản chụp tên/đơn vị lúc đặt. |
| OrderItem | Quantity / UnitPrice / LineTotal <br> int / decimal | Lượng nguyên dương; giá đã chốt; LineTotal = Quantity × UnitPrice. |
| Payment | PaymentId / OrderId / Status <br> string / enum | OrderId duy nhất; PendingReview, Confirmed, Closed. Chỉ tạo khi mở QR. |
| Payment | ExpectedAmount / ReceivedAmount / BankReference <br> decimal / nullable | Expected là tổng đơn; số nhận/mã giao dịch nhập khi đối chiếu; mã đã xác nhận không dùng cho đơn khác. |
| Payment | BankName / AccountNumber / AccountName / QrImagePath <br> string | Bản chụp thông tin nhận tiền khi mở QR; không đổi theo cấu hình mới. |
| Payment | ReceivedAt / ApprovedByUserId / ApprovedAt / ReviewNote <br> nullable | Thời điểm nhận ngoài ngân hàng; người/thời điểm duyệt trong website; lý do chưa duyệt nếu có. |
| StockReservation | ReservationId / OrderId / DrugId / PrescriptionItemId <br> string / nullable | Liên kết đơn–thuốc và dòng đơn thuốc nếu có; một giữ đang hoạt động cho mỗi Order+Drug. |
| StockReservation | Quantity / Status <br> int / enum | Lượng dương; Active, Consumed, Released. Chỉ Active trừ vào tồn/hạn mức khả dụng. |
| Sale | SaleId / Channel / Kind / Status <br> string / enum | Counter hoặc Online; OTC hoặc Prescription; Draft, Completed, Cancelled. |
| Sale | CreatedByUserId / BuyerUserId / OrderId / PrescriptionId / PatientId <br> string / nullable | Người lập; khách trực tuyến/đơn liên quan khi có; tham chiếu đơn thuốc cho PrescriptionSale. |
| Sale | CompletedAt / TotalAmount / PaymentMethod <br> nullable DateTimeOffset / decimal / enum | Giờ hoàn tất, tổng tiền; Cash tại quầy hoặc ManualQR trực tuyến. |
| SaleItem | SaleItemId / SaleId / DrugId / DrugName / Unit <br> string | Dòng bán và bản chụp tên/đơn vị. |
| SaleItem | Quantity / UnitPrice / LineTotal <br> int / decimal | Online lấy giá OrderItem; tại quầy chốt giá khi hoàn tất; Completed không sửa. |
| BatchAllocation | AllocationId / SaleItemId / BatchId / Quantity <br> string / int | Lô thực xuất và lượng dương; tổng theo dòng bằng lượng bán. |
| Invoice | InvoiceId / SaleId / IssuedAt <br> string / DateTimeOffset | SaleId duy nhất; nội dung lấy từ SaleItem/BatchAllocation bất biến của giao dịch đã hoàn tất. |
| PaymentSetting | BankName / AccountNumber / AccountName / QrImagePath <br> string | Một cấu hình do Admin lưu trong cài đặt F017; không có phí ship hoặc API key. |


### 7.5. Lưu trữ và kiểm tra dữ liệu

Dùng khóa ngoại để giữ liên kết tài khoản, thuốc, đơn, lô và giao dịch. Các bản ghi đã phát sinh nghiệp vụ không bị xóa qua giao diện. Giá lịch sử và phân bổ lô được giữ để xem lại hóa đơn. Tên/mã tham chiếu bắt buộc không rỗng; số lượng nguyên dương, các lượng đã cấp/tồn không âm; giá VND dùng decimal và không nhận phần lẻ.

Upload chỉ nhận PNG/JPG/JPEG tối đa 5 MB, kiểm tra cả loại nội dung; đặt tên file mới, không dùng đường dẫn khách gửi. Ảnh đơn thuốc và dữ liệu thanh toán chỉ người có quyền được đọc. Định dạng ngày giao diện dd/MM/yyyy, dữ liệu ngày lưu dạng DateOnly; dùng DateTimeOffset cho thời điểm xử lý.

Không có các trường IsActive, FailedLoginCount, LockedUntil, CredentialVersion, ShippingFee, Discount hoặc Tax trong phạm vi dữ liệu nghiệp vụ này. Bộ dữ liệu demo cần đủ thuốc OTC, thuốc cần đơn/kiểm soát, nhiều lô, đơn thuốc còn/hết hiệu lực và tài khoản cho ba role. Lô hết hạn dùng trong dữ liệu mẫu/kiểm thử, không nhập qua chức năng nhập lô.


## 8. Kiểm thử theo yêu cầu

Các ca dưới đây là kế hoạch kiểm thử; trạng thái hiện tại của tất cả ca là Chưa chạy. Khi triển khai, nhóm ghi Pass/Fail thực tế và lưu bằng chứng riêng. Không dùng việc hoàn tất SRS để kết luận chương trình đã vượt kiểm thử. D là ngày nghiệp vụ cố định truyền vào trong test; D+n/D−n biểu thị ngày tương đối, tránh phụ thuộc ngày máy.


| Mã | Chức năng và tình huống | Kết quả mong đợi |
|---|---|---|
| TC-01 | F001 <br> Đăng ký username và mật khẩu hợp lệ. | Tạo User, lưu hash; đăng nhập được. |
| TC-02 | F001 <br> Đăng ký username trùng sau trim/không phân biệt hoa thường; mật khẩu sai hoặc xác nhận không khớp. | Từ chối; không tạo tài khoản một phần. |
| TC-03 | F001, F003 <br> Guest gửi role Admin/Staff trong yêu cầu đăng ký. | Chỉ tạo User hoặc từ chối dữ liệu bất hợp lệ; không có quyền nội bộ. |
| TC-04 | F002 <br> Đăng nhập lần lượt User, Staff, Admin. | User vào homepage; Staff/Admin vào đúng dashboard. |
| TC-05 | F002 <br> Sai mật khẩu hoặc username không tồn tại. | Thông báo chung; chưa đăng nhập; không tạo khóa tạm/bộ đếm. |
| TC-06 | F002, F012, F014, F016 <br> Đăng xuất rồi mở nghiệp vụ; đăng nhập lại. | Truy cập có quyền bị chặn sau logout; giỏ/đơn/nháp đã lưu vẫn còn. |
| TC-07 | F003 <br> Admin tạo Staff và xem danh sách tài khoản. | Staff đăng nhập được; không lộ mật khẩu/hash. |
| TC-08 | F003 <br> Staff/User gọi quản trị tài khoản trực tiếp. | Bị từ chối; dữ liệu không đổi. |
| TC-09 | F004 <br> Guest xem/tìm thuốc và kiểm tra dữ liệu trả về. | Có thông tin nhưng không có giá; không có dữ liệu lô/khách. |
| TC-10 | F004 <br> User xem thuốc, tìm không phân biệt hoa/thường và tìm không có kết quả. | Có giá hiện tại; kết quả đúng; trường hợp rỗng thông báo rõ. |
| TC-11 | F005 <br> Admin thêm/sửa/tắt bán thuốc; thử Controlled=true nhưng RequiresPrescription=false. | Thao tác đúng lưu được; cấu hình sai bị chặn; thuốc tắt không mua mới được. |
| TC-12 | F005 <br> Staff gửi sửa danh mục thuốc. | Bị chặn ở server; giá và thông tin giữ nguyên. |
| TC-13 | F005, F013, F017, F020 <br> Đặt đơn rồi đổi giá danh mục. | Đơn/QR/hóa đơn trực tuyến giữ giá đã chốt; giỏ mới dùng giá mới. |
| TC-14 | F006 <br> Nhập lô còn hạn với số lượng nguyên dương. | Lưu lô đúng thuốc và tăng tồn. |
| TC-15 | F006 <br> Nhập lô trùng, hết hạn D, ngày sai hoặc lượng ≤0/không nguyên. | Từ chối; không tạo lô/đổi kho. |
| TC-16 | F007, F008 <br> Kho có lô hết hạn và hàng đang giữ. | Tồn thực tế gồm lô hết hạn; tồn khả dụng trừ lô hết hạn và giữ của đơn khác. |
| TC-17 | F007, F009 <br> Guest/User mở URL hoặc gọi kho/báo cáo. | Bị từ chối; không lộ dữ liệu nội bộ. |
| TC-18 | F008, F019 <br> Xuất cần chia nhiều lô, có hai lô cùng hạn. | FEFO đúng; cùng hạn theo số lô; tổng phân bổ đúng, tồn không âm. |
| TC-19 | F008, F019 <br> Lô có ExpiryDate=D và lô D+1. | Không xuất lô D; được dùng lô D+1. |
| TC-20 | F008, F017 <br> Hai User đồng thời mở QR cho số hàng cuối. | Chỉ lượng tồn cho phép được giữ; yêu cầu còn lại báo thiếu. |
| TC-21 | F008, F011, F014 <br> Hủy đơn theo đơn thuốc đã giữ hàng/hạn mức. | Giải phóng cả hai; tồn thực tế/đã cấp không đổi. |
| TC-22 | F009 <br> Cửa sổ sắp hết hạn 30 ngày; lô D, D+30, D+31, lô rỗng. | Chỉ lô còn hàng thuộc (D,D+30] xuất hiện. |
| TC-23 | F009 <br> Tồn khả dụng bằng ngưỡng, bằng 0 và lớn hơn ngưỡng. | Hai trường hợp đầu có trong tồn thấp; trường hợp sau không có. |
| TC-24 | F010 <br> User gửi ảnh hợp lệ; Staff nhập đơn tại quầy. | Lưu đúng chủ/người tạo, trạng thái chờ và dòng; chưa trừ kho. |
| TC-25 | F010 <br> Ảnh không đúng định dạng, >5 MB hoặc truy cập ảnh người khác. | Bị chặn; không lộ ảnh/dữ liệu. |
| TC-26 | F010, F011 <br> Staff đối chiếu ảnh, nhập dữ liệu, gộp dòng trùng và chấp nhận/từ chối. | Đúng dữ liệu/lý do/người/thời gian; đơn sai không thành Approved. |
| TC-27 | F011, F016 <br> Thử đơn hết/chưa hiệu lực, sai người bệnh, thuốc ngoài đơn hoặc quá lượng còn. | Bán theo đơn bị từ chối toàn bộ. |
| TC-28 | F011 <br> User gửi yêu cầu tự chấp nhận đơn hoặc hai đơn dùng cùng hạn mức cuối. | User bị chặn; tổng giữ+đã cấp không vượt lượng kê. |
| TC-29 | F012 <br> Thêm thuốc trùng, đổi lượng, bỏ dòng, xem tổng. | Một dòng mỗi thuốc; lượng/tổng đúng; không giữ hoặc trừ kho. |
| TC-30 | F012 <br> Guest bấm mua hoặc gọi API giỏ trực tiếp. | Đưa tới đăng nhập hoặc từ chối; không tạo giỏ Guest. |
| TC-31 | F012, F013 <br> Giỏ có thuốc tắt bán, lượng sai hoặc không đủ hàng. | Thông báo để sửa; không tạo đơn không hợp lệ. |
| TC-32 | F013 <br> Đặt OTC hợp lệ, chọn nhận tại quầy hoặc giao địa chỉ. | Mã đơn duy nhất, chủ đúng, tổng chỉ tiền hàng, không phí ship. |
| TC-33 | F013, F017 <br> Đặt theo ảnh đơn thuốc còn chờ kiểm tra. | Đơn Chờ kiểm tra; chưa mở QR/giữ hạn mức như đơn đã duyệt. |
| TC-34 | F013, F014 <br> Guest đặt hàng hoặc User xem/hủy đơn khác. | Bị từ chối; dữ liệu khách khác không lộ. |
| TC-35 | F014, F017, F018 <br> Hủy đơn chưa duyệt rồi mở QR hoặc duyệt; hủy/duyệt đồng thời. | Đơn hủy không dùng tiếp; chỉ chuyển trạng thái hợp lệ được ghi. |
| TC-36 | F015, F019 <br> Staff cố giao/hoàn tất đơn chưa trả tiền hoặc chưa xuất. | Bị chặn; không tự trừ kho hoặc tạo hóa đơn. |
| TC-37 | F015 <br> Đơn đã trả tiền, xuất thành công rồi nhận/giao xong. | Chuyển đúng trạng thái; cập nhật giao hàng không xuất lặp. |
| TC-38 | F016, F019 <br> Bán OTC tại quầy với thuốc không cần đơn, nhận tiền mặt. | Hoàn tất đúng; trừ kho và có hóa đơn. |
| TC-39 | F016 <br> OTC có thuốc cần đơn/kiểm soát, kể cả có nhập mã đơn. | Bị từ chối; không đổi OTC thành PrescriptionSale. |
| TC-40 | F016, F011, F019 <br> Bán theo đơn hợp lệ một phần, rồi cấp phần còn. | Hạn mức giảm đúng; không cấp vượt. |
| TC-41 | F016, F019 <br> Staff hoặc Admin sửa/hủy/checkout nháp người khác. | Bị chặn; chủ nháp mới thực hiện được. |
| TC-42 | F017 <br> User bấm Thanh toán ở đơn đủ điều kiện. | Mở ngay QR cố định; đúng số tiền/mã/nội dung, đủ cảnh báo thiếu/thừa. |
| TC-43 | F017, F018 <br> Chỉ mở QR, chưa có người duyệt. | Thanh toán vẫn Chờ duyệt, đơn chưa chuẩn bị; không tự xác nhận tiền. |
| TC-44 | F017, F008 <br> Mở QR nhiều lần và cấu hình nhận tiền đổi sau lần đầu. | Không giữ/tạo Payment lặp; cùng đơn vẫn hiển thị bản chụp nhận tiền cũ. |
| TC-45 | F018 <br> Admin và Staff lần lượt duyệt các đơn có giao dịch đúng, đủ tiền. | Cả hai role được duyệt; ghi người/giờ/mã giao dịch; đơn chuẩn bị. |
| TC-46 | F018 <br> Số nhận nhỏ hơn tổng yêu cầu. | Không duyệt; ghi lý do; kho chưa xuất. |
| TC-47 | F017, F018 <br> Khách chuyển thừa; người xử lý đối chiếu đúng giao dịch. | Có cảnh báo; có thể duyệt tổng yêu cầu, lưu số nhận; không tự hoàn tiền thừa. |
| TC-48 | F018 <br> Duyệt lại hoặc hai người duyệt cùng đơn đồng thời. | Chỉ một lần duyệt thành công; không tạo ghi nhận trùng. |
| TC-49 | F018 <br> Dùng mã giao dịch đã xác nhận cho đơn khác. | Bị từ chối; không xác nhận hai đơn bằng một giao dịch. |
| TC-50 | F018 <br> Guest/User gọi duyệt thanh toán trực tiếp. | Bị từ chối; trạng thái không đổi. |
| TC-51 | F019 <br> Một dòng thiếu hàng hoặc phát sinh lỗi khi ghi giao dịch. | Rollback kho/giữ/hạn mức/Sale/hóa đơn; giữ thanh toán đã duyệt trước đó. |
| TC-52 | F008, F019 <br> Hàng giữ hết hạn trước lúc xuất. | Dùng lô còn hạn khác nếu đủ; nếu không đủ, dừng xuất và giữ ghi nhận tiền. |
| TC-53 | F020 <br> Xem hóa đơn của giao dịch online và tại quầy. | Đúng thuốc/lô/giá/số lượng/tổng; online không có phí ship; lịch sử bất biến. |
| TC-54 | F020 <br> User xem hóa đơn khác, Staff ngoài phạm vi hoặc xem hóa đơn nháp. | Bị chặn/không có hóa đơn chính thức; Admin xem tất cả. |
| TC-55 | F003, F008, F010, F013, F018, F020 <br> Đóng/mở ứng dụng sau khi có dữ liệu nghiệp vụ. | Tài khoản, kho, giỏ, đơn thuốc, đơn, giữ hàng, thanh toán và hóa đơn còn nguyên; seed không ghi đè. |
| TC-56 | F016, F019 <br> Truyền cùng thuốc cần đơn qua hai subtype bằng biến Sale. | OTCSale bị chặn; PrescriptionSale có đơn hợp lệ thành công qua cùng CheckoutService. |

Bằng chứng tối thiểu gồm một luồng mua OTC trực tuyến end-to-end với Staff hoặc Admin duyệt QR, một luồng bán/cấp thuốc theo đơn, một thao tác sai bị chặn và một test thực thi đa hình. Bổ sung kiểm thử giao diện phân quyền, lưu database, yêu cầu đồng thời và rollback. Khi test cần thuốc hết hạn, tạo fixture trực tiếp; không mở quyền nhập lô hết hạn cho người dùng.


## 9. Ma trận truy vết yêu cầu

Các hàng dưới đây liên kết function, FR và ca kiểm thử. Mỗi F xuất hiện một lần trong cấu trúc module, còn TC có thể kiểm tra nhiều F trong một luồng. Tất cả liên kết hiện ở trạng thái Chưa kiểm thử.


| Function / FR | Submodule sở hữu | Test case | Trạng thái |
|---|---|---|---|
| F001 / FR-001 | SM01.01 – Xác thực | TC-01, TC-02, TC-03 | Chưa kiểm thử |
| F002 / FR-002 | SM01.01 – Xác thực | TC-04, TC-05, TC-06 | Chưa kiểm thử |
| F003 / FR-003 | SM01.02 – Quản lý tài khoản | TC-03, TC-07, TC-08, TC-55 | Chưa kiểm thử |
| F004 / FR-004 | SM02.01 – Tra cứu sản phẩm | TC-09, TC-10 | Chưa kiểm thử |
| F005 / FR-005 | SM02.02 – Quản lý sản phẩm | TC-11, TC-12, TC-13 | Chưa kiểm thử |
| F006 / FR-006 | SM03.01 – Lô thuốc | TC-14, TC-15 | Chưa kiểm thử |
| F007 / FR-007 | SM03.01 – Lô thuốc | TC-16, TC-17 | Chưa kiểm thử |
| F008 / FR-008 | SM03.02 – Xử lý tồn kho | TC-16, TC-18, TC-19, TC-20, TC-21, TC-44, TC-52, TC-55 | Chưa kiểm thử |
| F009 / FR-009 | SM03.03 – Báo cáo kho | TC-17, TC-22, TC-23 | Chưa kiểm thử |
| F010 / FR-010 | SM04.01 – Tiếp nhận đơn thuốc | TC-24, TC-25, TC-26, TC-55 | Chưa kiểm thử |
| F011 / FR-011 | SM04.02 – Kiểm tra đơn thuốc | TC-21, TC-26, TC-27, TC-28, TC-40 | Chưa kiểm thử |
| F012 / FR-012 | SM05.01 – Giỏ hàng | TC-06, TC-29, TC-30, TC-31 | Chưa kiểm thử |
| F013 / FR-013 | SM05.02 – Đơn hàng cá nhân | TC-13, TC-31, TC-32, TC-33, TC-34, TC-55 | Chưa kiểm thử |
| F014 / FR-014 | SM05.02 – Đơn hàng cá nhân | TC-06, TC-21, TC-34, TC-35 | Chưa kiểm thử |
| F015 / FR-015 | SM05.03 – Xử lý đơn hàng | TC-36, TC-37 | Chưa kiểm thử |
| F016 / FR-016 | SM05.04 – Bán tại quầy | TC-06, TC-27, TC-38, TC-39, TC-40, TC-41, TC-56 | Chưa kiểm thử |
| F017 / FR-017 | SM06.01 – Thanh toán QR | TC-13, TC-20, TC-33, TC-35, TC-42, TC-43, TC-44, TC-47 | Chưa kiểm thử |
| F018 / FR-018 | SM06.02 – Xác nhận thanh toán | TC-35, TC-43, TC-45, TC-46, TC-47, TC-48, TC-49, TC-50, TC-55 | Chưa kiểm thử |
| F019 / FR-019 | SM06.03 – Hoàn tất bán hàng | TC-18, TC-19, TC-36, TC-38, TC-40, TC-41, TC-51, TC-52, TC-56 | Chưa kiểm thử |
| F020 / FR-020 | SM06.04 – Tra cứu hóa đơn | TC-13, TC-53, TC-54, TC-55 | Chưa kiểm thử |

NFR-01 kiểm chứng bằng đo thời gian; NFR-02 bằng TC-03/08/09/17/25/30/34/41/50/54; NFR-03 bằng TC-18/20/21/28/35/44/48/49/51/52; NFR-04 bằng TC-06/55; NFR-05/06 bằng kiểm thử giao diện ở hai chiều rộng đã nêu; NFR-07 bằng TC-56 và review lớp; NFR-08 bằng chạy bộ test và kiểm tra xử lý lỗi. Quy tắc nghiệp vụ Phần 11.1 được đối chiếu với các FR tương ứng.


## 10. Tiêu chí nghiệm thu

AC-01: Đúng 6 module/20 function trong Phần 2.4; không có function thuộc đồng thời hai submodule. SRS, giao diện và source dùng thống nhất mã/chức năng và quyền.

AC-02: Guest/User dùng homepage, Admin/Staff có dashboard riêng theo role. Guest không xem giá/mua; User chỉ thao tác dữ liệu của mình. Staff không quản lý tài khoản, thuốc hoặc nhập lô.

AC-03: User đăng ký được; Admin tạo Staff được; đăng nhập/đăng xuất đúng. Không có màn hình hoặc test bắt buộc cho khóa tài khoản, đặt lại/đổi mật khẩu hay đổi role sau khi tạo.

AC-04: Thuốc/lô/tồn đáp ứng quy tắc ngày, số lượng, FEFO và giữ hàng; không xuất thuốc hết hạn hoặc tồn âm. Hai báo cáo tồn thấp/sắp hết hạn đúng biên.

AC-05: Đơn thuốc được kiểm tra trước thanh toán/cấp; OTC chặn thuốc cần đơn/kiểm soát. Bán theo đơn đúng người bệnh/thuốc/hạn mức, cho cấp một phần và không vượt tổng khi có giữ hàng.

AC-06: Bấm Thanh toán mở QR ngay và đúng tổng tiền hàng, có cảnh báo thiếu/thừa. Không có phí ship, upload biên lai/nút báo đã chuyển hoặc tích hợp ngân hàng. Admin và Staff đều duyệt được sau đối chiếu; chuyển thiếu không duyệt.

AC-07: Không duyệt/xuất lặp; cùng mã giao dịch không xác nhận hai đơn. Đã trả tiền khác đã giao hàng; lỗi xuất giữ được ghi nhận tiền và rollback toàn bộ thay đổi xuất.

AC-08: Hóa đơn khớp giao dịch và không đổi khi sửa danh mục. Đóng/mở ứng dụng không mất dữ liệu và không seed đè. Mật khẩu không lưu rõ/hiển thị trong giao diện hoặc log.

AC-09: Có bằng chứng thực thi các luồng chính, ít nhất một lỗi bị từ chối và test đa hình; tất cả TC áp dụng được chạy, lỗi còn lại có ghi nhận rõ. Trạng thái Chưa chạy trong SRS không được coi là Pass.

AC-10: Bàn giao source, README build/run/test, database/dữ liệu mẫu và cấu hình QR demo, báo cáo, UML, Self-Explanation, bằng chứng kiểm thử và AI Usage Log theo đề bài. Cả hai thành viên chạy và giải thích được nghiệp vụ, thiết kế và xử lý lỗi.


## 11. Phụ lục


### 11.1. Quy tắc nghiệp vụ


| Mã | Quy tắc | Function |
|---|---|---|
| BR-01 | ExpiryDate ≤ D là hết hạn; chỉ lô ExpiryDate > D được xuất. | F006, F008, F009 |
| BR-02 | Tồn thực tế gồm mọi lô; tồn khả dụng = tồn còn hạn − lượng đang giữ. Không đếm lượng giữ hai lần. | F007, F008 |
| BR-03 | FEFO theo hạn tăng; cùng hạn theo số lô tăng. Một dòng có thể dùng nhiều lô. | F008, F019 |
| BR-04 | IsControlled=true kéo theo RequiresPrescription=true; OTC chặn cả hai cờ. | F005, F013, F016 |
| BR-05 | Một thuốc có một đơn vị bán; số lượng nguyên dương; gộp dòng trùng trước kiểm tra. | F005, F010, F012, F016 |
| BR-06 | Đơn thuốc đã chấp nhận, chưa hủy, đúng người bệnh, IssueDate ≤ D ≤ ValidUntil. | F011, F013, F016, F019 |
| BR-07 | Mọi thuốc trong bán theo đơn phải có trong đơn; đã cấp + đang giữ + lượng mới không vượt lượng kê. | F008, F011, F017, F019 |
| BR-08 | Giỏ không giữ hàng. Mở QR lần đầu giữ hàng/hạn mức; hủy chưa duyệt giải phóng; xuất dùng và giải phóng giữ. | F008, F012, F014, F017, F019 |
| BR-09 | Kiểm tra mọi dòng và áp dụng xuất trong một transaction; lỗi rollback. Thanh toán đã ghi trước đó không bị xóa do xuất lỗi. | F008, F019 |
| BR-10 | Giá VND nguyên dương dùng decimal. Online chốt lúc đặt, tại quầy chốt lúc hoàn tất; tổng chỉ tiền sản phẩm. | F005, F013, F016, F019 |
| BR-11 | Không tính/thu phí ship; thông tin nhận hàng không làm tăng tổng. Không có giảm giá/thuế/công nợ. | F013, F017, F020 |
| BR-12 | QR cố định do Admin cấu hình; tổng/mã đơn hiển thị riêng; mở QR chưa xác nhận đã nhận tiền. | F017, F018 |
| BR-13 | Admin hoặc Staff đối chiếu giao dịch thực nhận. Thiếu tiền không duyệt; thừa có thể duyệt đơn và lưu số nhận, không hoàn tự động. | F018 |
| BR-14 | Một mã giao dịch đã đối chiếu chỉ xác nhận một đơn; duyệt cùng đơn chỉ một lần, kể cả đồng thời. | F018 |
| BR-15 | Đơn đã trả tiền chưa phải đã giao. Chưa xuất thành công không giao/hoàn tất hoặc có hóa đơn chính thức. | F015, F019, F020 |
| BR-16 | Nháp tại quầy chỉ chủ nháp sửa/hủy/hoàn tất; Completed/Cancelled không dùng lại. Giao trực tuyến không xuất lặp. | F015, F016, F019 |
| BR-17 | User chỉ xem/sửa giỏ, đơn và đơn thuốc của mình. Staff xem hóa đơn mình lập/xử lý; Admin xem tất cả. | F010, F012, F014, F020 |
| BR-18 | Guest không có giá/giỏ/đặt hàng. Tài khoản chỉ có User/Staff/Admin; đăng ký luôn User, Admin tạo Staff. | F001, F003, F004, F012 |
| BR-19 | Username duy nhất sau chuẩn hóa; mật khẩu 8–128 ký tự được hash. Không có khóa tạm, đổi role, đổi/đặt lại mật khẩu. | F001, F002, F003 |
| BR-20 | Tồn thấp khi khả dụng ≤ ngưỡng. Sắp hết hạn khi còn hàng và 0 < số ngày còn ≤ cửa sổ (mặc định 30). | F009 |
| BR-21 | Tra cứu/kiểm tra/đăng xuất không đổi dữ liệu nghiệp vụ. Database giữ dữ liệu qua lần chạy, seed không ghi đè. | F002, F004, F007, F009, F014, F020 |
| BR-22 | Đơn đã hủy không mở QR/duyệt/xuất; không hủy bình thường đơn đã nhận tiền. Ngoại lệ chuyển tiền xử lý thủ công ngoài ứng dụng. | F014, F015, F017, F018 |


### 11.2. Định hướng thiết kế OOP

*Hình 11.1. Class Diagram tổng — Pharmacy Management System*

OOP-01 – Đa hình: Sale là abstract class có Validate(context). OTCSale kiểm tra thuốc không cần đơn; PrescriptionSale kiểm tra đơn, người bệnh và hạn mức. CheckoutService.Checkout(Sale) gọi Validate qua kiểu Sale rồi dùng cùng luồng hoàn tất. Order trực tuyến tạo subtype theo SaleKind khi xuất; giao dịch tại quầy chọn subtype khi lập nháp. Test TC-56 phải thực thi hai subtype và chứng minh cùng lời gọi có kết quả kiểm tra khác nhau.

OOP-02 – Đóng gói: Drug quản lý lô và phương thức tính khả dụng/lập phân bổ; DrugBatch bảo vệ Quantity bằng setter không công khai và Deduct(quantity, businessDate) kiểm tra hạn/lượng. PrescriptionItem bảo vệ DispensedQuantity; StockReservation quản lý lượng giữ qua phương thức. Controller không sửa trực tiếp lượng tồn/đã cấp; collection chỉ trả dữ liệu đọc. Các kiểm tra ở model không bị thay bằng kiểm tra UI.

OOP-03 – Trách nhiệm đơn nhất: xử lý kho, đơn thuốc, thanh toán, checkout và báo cáo có lớp riêng. InventoryReportService chỉ lập báo cáo, không trừ kho. ManualPaymentService chỉ ghi nhận đối chiếu tiền và quyền duyệt, không gọi ngân hàng và không xuất kho; CheckoutService điều phối hoàn tất bán sau khi đủ điều kiện.


| Lớp/nhóm dự kiến | Trách nhiệm và liên kết function |
|---|---|
| AccountService / Authentication | Đăng ký, đăng nhập/đăng xuất, tạo Staff; F001–F003. Cookie xác thực và PasswordHasher; không có SetActive/ResetPassword/ChangeRole/ChangeOwnPassword. |
| Authorization / Controller | Kiểm tra role/chủ dữ liệu ở từng nghiệp vụ; định tuyến homepage và hai dashboard. View chỉ nhập/hiển thị, không giữ quy tắc bán. |
| Drug / DrugBatch / InventoryService | Thuốc/lô, tồn khả dụng, giữ/giải phóng và FEFO; F005–F008. |
| InventoryReportService | Hai báo cáo cảnh báo; F009. |
| Prescription / PrescriptionItem / PrescriptionService | Tiếp nhận, kiểm tra và bảo vệ lượng cấp/giữ theo đơn; F010–F011. |
| CartService / OrderService | Giỏ, đặt/tra cứu/hủy đơn và luồng nhận/giao; F012–F015. |
| Sale / OTCSale / PrescriptionSale | Nháp tại quầy và kiểm tra theo loại bán; F016 và F019. |
| ManualPaymentService / PaymentSetting | Mở QR, lưu cấu hình/bản chụp, đối chiếu và duyệt; F017–F018. |
| CheckoutService / Invoice | Hoàn tất atomic, ghi hóa đơn và tra cứu theo quyền; F019–F020. |
| DbContext / SQLite | Lưu dữ liệu, khóa ngoại, transaction và ràng buộc duy nhất; không là một module giao diện riêng. |

Đây là định hướng thiết kế để triển khai; UML và Self-Explanation bàn giao phải dùng tên lớp/phương thức thực tế trong source. Mỗi phần Self-Explanation chỉ rõ nơi áp dụng, test liên quan và lý do chọn thiết kế cho bài toán; không chỉ chép định nghĩa chung của nguyên lý.


### 11.3. Kế hoạch 4 tuần và bàn giao


| Tuần | Công việc và kết quả |
|---|---|
| 1 | Chốt SRS 2.0, role matrix, use case/UML; tạo ASP.NET Core MVC, SQLite, dữ liệu mẫu; đăng ký/đăng nhập và homepage/dashboard theo quyền. |
| 2 | Thuốc/lô/tồn, đơn thuốc, giỏ và đặt hàng; kiểm tra quyền sở hữu, quy tắc thuốc/hạn mức; cập nhật UML và test nghiệp vụ. |
| 3 | QR cố định, Admin/Staff duyệt, giữ hàng, bán tại quầy và checkout chung; hóa đơn, hai báo cáo; kiểm thử đa hình, đồng thời và rollback. |
| 4 | Tích hợp và hồi quy, kiểm tra lưu database/giao diện, chạy các TC, chụp bằng chứng; hoàn thiện README, báo cáo, UML, Self-Explanation và luyện bảo vệ. |

Phân công dự kiến: Lê Anh Đức phụ trách thuốc/kho, báo cáo, dashboard nội bộ, tích hợp checkout và README. Chu Ngọc Việt Đức phụ trách tài khoản/homepage, giỏ/đơn, đơn thuốc, Sale/subtype và QR thủ công. Cả hai review chéo, kiểm thử tích hợp quyền–thanh toán–kho và hiểu toàn bộ quy trình; phân công không thay đổi trách nhiệm chung đối với kết quả.

Sản phẩm bàn giao gồm source và hướng dẫn build/run/test; file database hoặc bước tạo database/dữ liệu mẫu; cấu hình QR demo; báo cáo với phát biểu bài toán, UML, Self-Explanation, bằng chứng test và AI Usage Log theo yêu cầu môn học. AI Usage Log là hồ sơ riêng ghi việc hỗ trợ đã dùng và cách nhóm kiểm chứng, không phải hướng dẫn cho công cụ viết hệ thống.
