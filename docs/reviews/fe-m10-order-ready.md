# Review `fe/m10-order-ready` — APPROVED

Reviewer: PO · 2026-10-06
- D15 Staff: Pickup "Đã chuẩn bị xong" → "Khách đã nhận thuốc" (hiện giờ sẵn sàng); Delivery "Đã chuẩn bị xong – Bắt đầu giao" → "Đã giao xong"; cột "Việc cần làm" theo bước
- Khách: "Nhà thuốc đang chuẩn bị đơn" → tự nhận toast + khối "Đơn đã sẵn sàng – Mời bạn đến quầy nhận thuốc" + mã đơn lớn; Delivery "đang trên đường giao"; stepper thêm "Sẵn sàng nhận"
- Sửa test chập chờn TC32/TC33-F013
- PO xem ảnh `TC37-F015-ready-pickup-1366.png`; PO tự chạy e2e **28/28 pass**
