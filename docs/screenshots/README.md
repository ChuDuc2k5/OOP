# Bằng chứng kiểm thử giao diện M4–M8

105 ảnh PNG từ Playwright Chromium ở 1366×900 và 390×844, chạy frontend production qua `/api` ở cổng 3017 với backend thật cổng 5017, SQLite riêng và seed. Lần chạy cuối M8: 28/28 ca pass (3,1 phút), đối chiếu đủ 49 route ở mỗi viewport, gồm các route chuyển hướng sang Staff. M8 thêm bốn ảnh xác nhận tiền/dashboard Admin và chụp lại các luồng liên quan. Mã trong tên ảnh tương ứng luồng TC/F; menu mobile chỉ có ảnh 390 px.

M5 ban đầu bổ sung 12 ảnh phản hồi thao tác. D6–D9 bổ sung ảnh Pickup/Delivery, thử xuất kho lại, hết hàng/409, lỗi mở QR và đơn thuốc chờ duyệt ở hai viewport; banner đặt hàng hiện trên ảnh QR `TC42-F017-qr-*`. `TC32-F014-order-before-qr-*` là ảnh lưu của luồng trước D6, được giữ để đối chiếu lịch sử. Toast dành chỗ ở đầu trang để không che nút chính trên mobile.

D10 thêm 16 ảnh: đăng ký tự đăng nhập, tải đơn thuốc tại checkout, form tiền điền sẵn, bán tại quầy một màn hình và lỗi giữ nháp, lưu/chấp nhận đơn thuốc, tạo thuốc kèm ảnh/lô đầu. `TC38-F016-counter-draft-*` là ảnh lịch sử trước màn hình bán mới; `TC38-F019-counter-checkout-*` hiện chụp hóa đơn sau nút thu tiền mặt.

Các nhóm: Guest không thấy giá; checkout/đơn trước QR; mở QR; duyệt thiếu/đủ; xuất kho/hoàn tất; hóa đơn của User; chặn User vào Staff; bán OTC tại quầy; lỗi theo trường; Admin cấu hình QR; loading/rỗng/lỗi mạng; kho, thuốc/nhập lô và sidebar.

D12 bổ sung 6 ảnh: trang duyệt tự điền/gộp dòng từ hai đơn hàng chờ kiểm tra, ảnh bên trái/form bên phải ở 1366 px và một cột ở 390 px; trạng thái sau “Lưu & chấp nhận”; khách thấy Chờ thanh toán và mở được QR. Ghi chú của nhà thuốc và đối chiếu thanh toán chỉ hiển thị trong một khối trên trang đơn; trạng thái xác nhận/tiền nhận/hóa đơn gộp trong khối thanh toán trên trang QR.

M7 kiểm tra khách ở nguyên trang chờ duyệt, Staff chấp nhận qua API và khách tự tới QR trong ≤15 giây với polling thật. Kiểm tra chỉ một POST, lỗi mở QR giữ đơn/thử lại thủ công; clock kiểm tra tab ẩn tạm dừng, quay lại làm mới ngay và đơn kết thúc dừng polling. Hai ảnh mới `TC33-F017-auto-qr-*` thể hiện toast duyệt và trang QR ở 1366/390 px.

M8 (D13/D14) thêm bốn ảnh `TC45-F018-one-tap-*` và `AC02-admin-dashboard-*`: hộp xác nhận ngắn từ dòng đơn hàng, không cần mã giao dịch/số tiền/thời điểm; dashboard quản lý riêng với tài khoản, thuốc, cảnh báo kho, trạng thái đơn và 5 đơn mới nhất. E2e đối chiếu số liệu API, review body rỗng → hóa đơn, ghi chuyển thiếu, thử xuất kho lại, thao tác nhận/giao thuốc ngay trên dòng, menu Admin 8 mục và chuyển qua/lại giao diện Staff. `TC45-F018-prefilled-review-*` giữ tên cũ nhưng đã chụp lại hộp xác nhận của D13 ở trang chi tiết; không còn form đối chiếu dài.

D11 cập nhật ảnh đang dùng với tài khoản `chuduc` (Chu Đức), `nguyenvana` và mã thuốc VITC500/NACL09/ORESOL/CETI10/ZINC10/AMOX500/CEFI200/METF500/AMLO5/DIAZ5/HYDRO1. Trang chủ không còn ô trạng thái API; đăng nhập không còn gợi ý tài khoản. Bộ thử tự cấu hình QR qua API Admin vì DB mới không có tài khoản nhận tiền. `TC32-F013-payment-open-error-*` kiểm tra thông báo chưa cấu hình QR và giữ đơn; `TC01-F001-registered-session-*` chụp sau đăng ký thành công dù ban đầu có cookie XSRF-TOKEN cũ. Kiểm thử thêm CSRF lỗi liên tiếp chỉ thử lại một lần và gửi lại ảnh FormData thành công. Các ảnh được ghi rõ là lịch sử ở trên không đại diện giao diện hiện tại.

`M4-route-audit-1366.json` và `M4-route-audit-390.json` ghi danh sách route đã rà và kích thước viewport. Ca audit đối chiếu toàn bộ `src/app/**/page.tsx`, kiểm tra trang không tràn ngang và bảng dài có khung cuộn riêng. Ảnh toàn trang đưa về đầu trước khi chụp để thanh menu sticky nằm đúng vị trí.

Chạy lại: `npm run test:e2e --workspace frontend`. Hướng dẫn cài đặt và báo cáo trong [README frontend](../../frontend/README.md).

| Mã ảnh | 1366 px | 390 px |
|---|---|---|
| TC33-F017-auto-qr | [TC33-F017-auto-qr-1366.png](TC33-F017-auto-qr-1366.png) | [TC33-F017-auto-qr-390.png](TC33-F017-auto-qr-390.png) |
| TC26-F011-online-prefilled | [TC26-F011-online-prefilled-1366.png](TC26-F011-online-prefilled-1366.png) | [TC26-F011-online-prefilled-390.png](TC26-F011-online-prefilled-390.png) |
| TC26-F011-online-approved | [TC26-F011-online-approved-1366.png](TC26-F011-online-approved-1366.png) | [TC26-F011-online-approved-390.png](TC26-F011-online-approved-390.png) |
| TC33-F014-prescription-approved | [TC33-F014-prescription-approved-1366.png](TC33-F014-prescription-approved-1366.png) | [TC33-F014-prescription-approved-390.png](TC33-F014-prescription-approved-390.png) |
| F004-empty | [F004-empty-1366.png](F004-empty-1366.png) | [F004-empty-390.png](F004-empty-390.png) |
| F004-loading | [F004-loading-1366.png](F004-loading-1366.png) | [F004-loading-390.png](F004-loading-390.png) |
| F004-network-error | [F004-network-error-1366.png](F004-network-error-1366.png) | [F004-network-error-390.png](F004-network-error-390.png) |
| F005-F006-admin-drug | [F005-F006-admin-drug-1366.png](F005-F006-admin-drug-1366.png) | [F005-F006-admin-drug-390.png](F005-F006-admin-drug-390.png) |
| F007-staff-inventory | [F007-staff-inventory-1366.png](F007-staff-inventory-1366.png) | [F007-staff-inventory-390.png](F007-staff-inventory-390.png) |
| F017-admin-qr-settings | [F017-admin-qr-settings-1366.png](F017-admin-qr-settings-1366.png) | [F017-admin-qr-settings-390.png](F017-admin-qr-settings-390.png) |
| TC07-F003-field-error | [TC07-F003-field-error-1366.png](TC07-F003-field-error-1366.png) | [TC07-F003-field-error-390.png](TC07-F003-field-error-390.png) |
| M4-sidebar-open | - | [M4-sidebar-open-390.png](M4-sidebar-open-390.png) |
| TC17-F002-user-blocked-staff | [TC17-F002-user-blocked-staff-1366.png](TC17-F002-user-blocked-staff-1366.png) | [TC17-F002-user-blocked-staff-390.png](TC17-F002-user-blocked-staff-390.png) |
| TC09-F004-guest | [TC09-F004-guest-1366.png](TC09-F004-guest-1366.png) | [TC09-F004-guest-390.png](TC09-F004-guest-390.png) |
| TC09-F004-guest-detail | [TC09-F004-guest-detail-1366.png](TC09-F004-guest-detail-1366.png) | [TC09-F004-guest-detail-390.png](TC09-F004-guest-detail-390.png) |
| TC32-F013-checkout | [TC32-F013-checkout-1366.png](TC32-F013-checkout-1366.png) | [TC32-F013-checkout-390.png](TC32-F013-checkout-390.png) |
| TC32-F014-order-before-qr | [TC32-F014-order-before-qr-1366.png](TC32-F014-order-before-qr-1366.png) | [TC32-F014-order-before-qr-390.png](TC32-F014-order-before-qr-390.png) |
| TC42-F017-qr | [TC42-F017-qr-1366.png](TC42-F017-qr-1366.png) | [TC42-F017-qr-390.png](TC42-F017-qr-390.png) |
| TC37-F015-completed | [TC37-F015-completed-1366.png](TC37-F015-completed-1366.png) | [TC37-F015-completed-390.png](TC37-F015-completed-390.png) |
| TC45-F018-approved | [TC45-F018-approved-1366.png](TC45-F018-approved-1366.png) | [TC45-F018-approved-390.png](TC45-F018-approved-390.png) |
| TC46-F018-short-payment | [TC46-F018-short-payment-1366.png](TC46-F018-short-payment-1366.png) | [TC46-F018-short-payment-390.png](TC46-F018-short-payment-390.png) |
| TC38-F016-counter-draft | [TC38-F016-counter-draft-1366.png](TC38-F016-counter-draft-1366.png) | [TC38-F016-counter-draft-390.png](TC38-F016-counter-draft-390.png) |
| TC37-F019-fulfill | [TC37-F019-fulfill-1366.png](TC37-F019-fulfill-1366.png) | [TC37-F019-fulfill-390.png](TC37-F019-fulfill-390.png) |
| TC38-F019-counter-checkout | [TC38-F019-counter-checkout-1366.png](TC38-F019-counter-checkout-1366.png) | [TC38-F019-counter-checkout-390.png](TC38-F019-counter-checkout-390.png) |
| TC53-F020-user-invoice | [TC53-F020-user-invoice-1366.png](TC53-F020-user-invoice-1366.png) | [TC53-F020-user-invoice-390.png](TC53-F020-user-invoice-390.png) |
| TC29-F012-add-toast | [TC29-F012-add-toast-1366.png](TC29-F012-add-toast-1366.png) | [TC29-F012-add-toast-390.png](TC29-F012-add-toast-390.png) |
| TC29-F012-home-add-toast | [TC29-F012-home-add-toast-1366.png](TC29-F012-home-add-toast-1366.png) | [TC29-F012-home-add-toast-390.png](TC29-F012-home-add-toast-390.png) |
| TC43-F014-pending-next-step | [TC43-F014-pending-next-step-1366.png](TC43-F014-pending-next-step-1366.png) | [TC43-F014-pending-next-step-390.png](TC43-F014-pending-next-step-390.png) |
| TC46-F017-user-review-note | [TC46-F017-user-review-note-1366.png](TC46-F017-user-review-note-1366.png) | [TC46-F017-user-review-note-390.png](TC46-F017-user-review-note-390.png) |
| TC24-F010-sent-banner | [TC24-F010-sent-banner-1366.png](TC24-F010-sent-banner-1366.png) | [TC24-F010-sent-banner-390.png](TC24-F010-sent-banner-390.png) |
| TC32-F014-pickup-qr-closed | [TC32-F014-pickup-qr-closed-1366.png](TC32-F014-pickup-qr-closed-1366.png) | [TC32-F014-pickup-qr-closed-390.png](TC32-F014-pickup-qr-closed-390.png) |
| TC45-F014-pickup-paid | [TC45-F014-pickup-paid-1366.png](TC45-F014-pickup-paid-1366.png) | [TC45-F014-pickup-paid-390.png](TC45-F014-pickup-paid-390.png) |
| TC42-F017-delivery-qr | [TC42-F017-delivery-qr-1366.png](TC42-F017-delivery-qr-1366.png) | [TC42-F017-delivery-qr-390.png](TC42-F017-delivery-qr-390.png) |
| TC37-F019-fulfill-retry | [TC37-F019-fulfill-retry-1366.png](TC37-F019-fulfill-retry-1366.png) | [TC37-F019-fulfill-retry-390.png](TC37-F019-fulfill-retry-390.png) |
| TC45-F014-delivery-paid | [TC45-F014-delivery-paid-1366.png](TC45-F014-delivery-paid-1366.png) | [TC45-F014-delivery-paid-390.png](TC45-F014-delivery-paid-390.png) |
| TC37-F015-delivering | [TC37-F015-delivering-1366.png](TC37-F015-delivering-1366.png) | [TC37-F015-delivering-390.png](TC37-F015-delivering-390.png) |
| TC37-F015-delivery-completed | [TC37-F015-delivery-completed-1366.png](TC37-F015-delivery-completed-1366.png) | [TC37-F015-delivery-completed-390.png](TC37-F015-delivery-completed-390.png) |
| TC31-F012-out-of-stock-home | [TC31-F012-out-of-stock-home-1366.png](TC31-F012-out-of-stock-home-1366.png) | [TC31-F012-out-of-stock-home-390.png](TC31-F012-out-of-stock-home-390.png) |
| TC31-F012-out-of-stock-detail | [TC31-F012-out-of-stock-detail-1366.png](TC31-F012-out-of-stock-detail-1366.png) | [TC31-F012-out-of-stock-detail-390.png](TC31-F012-out-of-stock-detail-390.png) |
| TC31-F012-insufficient-stock | [TC31-F012-insufficient-stock-1366.png](TC31-F012-insufficient-stock-1366.png) | [TC31-F012-insufficient-stock-390.png](TC31-F012-insufficient-stock-390.png) |
| TC32-F013-payment-open-error | [TC32-F013-payment-open-error-1366.png](TC32-F013-payment-open-error-1366.png) | [TC32-F013-payment-open-error-390.png](TC32-F013-payment-open-error-390.png) |
| TC33-F013-waiting-prescription | [TC33-F013-waiting-prescription-1366.png](TC33-F013-waiting-prescription-1366.png) | [TC33-F013-waiting-prescription-390.png](TC33-F013-waiting-prescription-390.png) |
| TC01-F001-registered-session | [TC01-F001-registered-session-1366.png](TC01-F001-registered-session-1366.png) | [TC01-F001-registered-session-390.png](TC01-F001-registered-session-390.png) |
| TC33-F013-inline-prescription | [TC33-F013-inline-prescription-1366.png](TC33-F013-inline-prescription-1366.png) | [TC33-F013-inline-prescription-390.png](TC33-F013-inline-prescription-390.png) |
| TC45-F018-prefilled-review | [TC45-F018-prefilled-review-1366.png](TC45-F018-prefilled-review-1366.png) | [TC45-F018-prefilled-review-390.png](TC45-F018-prefilled-review-390.png) |
| TC38-F016-counter-one-screen | [TC38-F016-counter-one-screen-1366.png](TC38-F016-counter-one-screen-1366.png) | [TC38-F016-counter-one-screen-390.png](TC38-F016-counter-one-screen-390.png) |
| TC38-F016-counter-retry | [TC38-F016-counter-retry-1366.png](TC38-F016-counter-retry-1366.png) | [TC38-F016-counter-retry-390.png](TC38-F016-counter-retry-390.png) |
| TC26-F011-save-approve | [TC26-F011-save-approve-1366.png](TC26-F011-save-approve-1366.png) | [TC26-F011-save-approve-390.png](TC26-F011-save-approve-390.png) |
| TC11-F005-create-image-batch | [TC11-F005-create-image-batch-1366.png](TC11-F005-create-image-batch-1366.png) | [TC11-F005-create-image-batch-390.png](TC11-F005-create-image-batch-390.png) |
| TC14-F006-first-batch | [TC14-F006-first-batch-1366.png](TC14-F006-first-batch-1366.png) | [TC14-F006-first-batch-390.png](TC14-F006-first-batch-390.png) |
| TC45-F018-one-tap | [TC45-F018-one-tap-1366.png](TC45-F018-one-tap-1366.png) | [TC45-F018-one-tap-390.png](TC45-F018-one-tap-390.png) |
| AC02-admin-dashboard | [AC02-admin-dashboard-1366.png](AC02-admin-dashboard-1366.png) | [AC02-admin-dashboard-390.png](AC02-admin-dashboard-390.png) |
