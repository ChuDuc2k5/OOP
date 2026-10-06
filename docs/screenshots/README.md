# Bằng chứng kiểm thử giao diện M4/M5

77 ảnh PNG từ Playwright Chromium ở 1366×900 và 390×844, chạy frontend production qua `/api` ở cổng 3017 với backend thật cổng 5017, SQLite riêng và seed. Lần chạy cuối D6–D9: 16/16 ca pass (2,4 phút), đối chiếu đủ 49 route ở mỗi viewport. Đợt này thêm 24 ảnh và cập nhật ảnh luồng hiện có. Mã trong tên ảnh tương ứng luồng TC/F; menu mobile chỉ có ảnh 390 px.

M5 ban đầu bổ sung 12 ảnh phản hồi thao tác. D6–D9 bổ sung ảnh Pickup/Delivery, thử xuất kho lại, hết hàng/409, lỗi mở QR và đơn thuốc chờ duyệt ở hai viewport; banner đặt hàng hiện trên ảnh QR `TC42-F017-qr-*`. `TC32-F014-order-before-qr-*` là ảnh lưu của luồng trước D6, được giữ để đối chiếu lịch sử. Toast dành chỗ ở đầu trang để không che nút chính trên mobile.

Các nhóm: Guest không thấy giá; checkout/đơn trước QR; mở QR; duyệt thiếu/đủ; xuất kho/hoàn tất; hóa đơn của User; chặn User vào Staff; bán OTC tại quầy; lỗi theo trường; Admin cấu hình QR; loading/rỗng/lỗi mạng; kho, thuốc/nhập lô và sidebar.

`M4-route-audit-1366.json` và `M4-route-audit-390.json` ghi danh sách route đã rà và kích thước viewport. Ca audit đối chiếu toàn bộ `src/app/**/page.tsx`, kiểm tra trang không tràn ngang và bảng dài có khung cuộn riêng. Ảnh toàn trang đưa về đầu trước khi chụp để thanh menu sticky nằm đúng vị trí.

Chạy lại: `npm run test:e2e --workspace frontend`. Hướng dẫn cài đặt và báo cáo trong [README frontend](../../frontend/README.md).

| Mã ảnh | 1366 px | 390 px |
|---|---|---|
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
| TC45-F017-qr-confirmed | [TC45-F017-qr-confirmed-1366.png](TC45-F017-qr-confirmed-1366.png) | [TC45-F017-qr-confirmed-390.png](TC45-F017-qr-confirmed-390.png) |
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
