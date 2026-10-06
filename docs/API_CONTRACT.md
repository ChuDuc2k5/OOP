# API Contract v1 — Pharmacy Management System

> Hợp đồng giữa Backend (Codex) và Frontend (Antigravity). **Nguồn sự thật duy nhất** cho URL, DTO, mã lỗi.
> Muốn đổi: mở đề xuất cho PO, PO cập nhật file này trên `main` rồi hai bên mới sửa code.
> Kiểu dữ liệu viết bằng TypeScript cho dễ đọc. `?` = có thể vắng/null.

---

## 1. Quy ước chung

### 1.1 Định dạng
- Base path: `/api`. JSON `camelCase`. Enum là **chuỗi** (vd `"AwaitingPayment"`).
- Tiền: `number` nguyên VND (backend `decimal`, không phần lẻ).
- Ngày: `DateOnly` → `"yyyy-MM-dd"`. Thời điểm: ISO 8601 có offset (`"2026-10-06T09:30:00+07:00"`).
- Danh sách phân trang: query `page` (mặc định 1), `pageSize` (mặc định 20, tối đa 100) →
  ```ts
  type Paged<T> = { items: T[]; page: number; pageSize: number; total: number }
  ```

### 1.2 Xác thực & anti-forgery
- Cookie `pharmacy.auth` (HttpOnly). FE gọi `fetch` với `credentials: "include"`.
- Trước request thay đổi dữ liệu đầu tiên, FE gọi `GET /api/auth/csrf` → server set cookie `XSRF-TOKEN`.
  Mọi `POST/PUT/PATCH/DELETE` gửi header `X-XSRF-TOKEN: <giá trị cookie>`. Thiếu/sai → `400 ANTIFORGERY_INVALID`.
  Sau login/logout server cấp lại token (FE gọi lại `/api/auth/csrf`).
- Chưa đăng nhập vào API cần quyền → `401` (không redirect HTML). Sai role → `403`.
  Truy cập tài nguyên không thuộc mình (đơn/giỏ/đơn thuốc/hóa đơn của người khác) → `404` (không lộ sự tồn tại).

### 1.3 Role
`type Role = "User" | "Staff" | "Admin"`. Guest = không có cookie. Ký hiệu quyền trong bảng: **G** Guest, **U** User, **S** Staff, **A** Admin.

### 1.4 Lỗi (RFC 7807 ProblemDetails)
```ts
type ApiError = {
  status: number;          // 400 | 401 | 403 | 404 | 409 | 422 | 500
  code: string;            // mã máy đọc, bảng dưới
  title: string;           // thông điệp tiếng Việt cho người dùng
  errors?: Record<string, string[]>;   // lỗi theo trường (camelCase), dùng hiển thị dưới ô nhập
  data?: unknown;          // dữ liệu kèm theo (vd PRICE_CHANGED)
}
```
| code | status | Khi nào |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Dữ liệu sai định dạng/thiếu; kèm `errors` |
| `ANTIFORGERY_INVALID` | 400 | Thiếu/sai X-XSRF-TOKEN |
| `INVALID_CREDENTIALS` | 401 | Đăng nhập sai (thông báo chung) |
| `UNAUTHENTICATED` | 401 | Chưa đăng nhập |
| `FORBIDDEN` | 403 | Sai role |
| `NOT_FOUND` | 404 | Không có / không thuộc quyền |
| `DUPLICATE` | 409 | Trùng username, mã thuốc, số lô, mã đơn thuốc… (`errors` chỉ trường) |
| `INVALID_STATE` | 409 | Chuyển trạng thái không hợp lệ (đơn đã hủy, đã duyệt, nháp đã hoàn tất…) |
| `INSUFFICIENT_STOCK` | 409 | Không đủ tồn khả dụng; `data: { drugId, requested, available }[]` |
| `PRESCRIPTION_INVALID` | 409 | Đơn thuốc không hợp lệ (hết hạn, sai người bệnh, thuốc ngoài đơn, quá hạn mức, chưa duyệt) |
| `PRESCRIPTION_REQUIRED` | 409 | OTC có thuốc cần đơn/kiểm soát |
| `NOT_FOR_SALE` | 409 | Sản phẩm đã tắt bán |
| `PRICE_CHANGED` | 409 | Đặt hàng: tổng tính lại khác `expectedTotal`; `data: CartView` mới |
| `PAYMENT_NOT_CONFIGURED` | 409 | Chưa cấu hình tài khoản nhận tiền/QR |
| `DUPLICATE_BANK_REFERENCE` | 409 | Mã giao dịch đã xác nhận cho đơn khác |
| `CONCURRENCY_CONFLICT` | 409 | Xung đột đồng thời, FE tải lại dữ liệu |
| `FILE_INVALID` | 400 | File không phải PNG/JPG/JPEG hoặc > 5 MB |
| `INTERNAL_ERROR` | 500 | Lỗi hệ thống — **không** trả stack trace |

---

## 2. Enum

```ts
type SaleKind = "OTC" | "Prescription";
type SaleChannel = "Counter" | "Online";
type SaleStatus = "Draft" | "Completed" | "Cancelled";
type ReceiveMethod = "Pickup" | "Delivery";
type OrderStatus = "WaitingReview" | "AwaitingPayment" | "Preparing" | "Delivering" | "Completed" | "Cancelled" | "Rejected";
type PaymentStatus = "PendingReview" | "Confirmed" | "Closed";
type PrescriptionStatus = "PendingReview" | "Approved" | "Rejected" | "Cancelled";
type PaymentMethod = "Cash" | "ManualQR";
```
Nhãn tiếng Việt (FE): WaitingReview=Chờ kiểm tra, AwaitingPayment=Chờ thanh toán, Preparing=Đang chuẩn bị, Delivering=Đang giao, Completed=Hoàn tất, Cancelled=Đã hủy, Rejected=Từ chối; Payment PendingReview=Chờ duyệt, Confirmed=Đã xác nhận, Closed=Đã đóng; Prescription PendingReview=Chờ kiểm tra, Approved=Đã chấp nhận, Rejected=Từ chối, Cancelled=Đã hủy hiệu lực.

---

## 3. M01 – Tài khoản (F001–F003)

```ts
type Me = { userId: string; username: string; role: Role; homePath: "/" | "/staff" | "/admin" }
type AccountRow = { userId: string; username: string; role: Role }
```

| Method & URL | Quyền | Body / Query | Response |
|---|---|---|---|
| `GET /api/auth/csrf` | tất cả | – | `204` + cookie `XSRF-TOKEN` |
| `POST /api/auth/register` | G (đã login → 403) | `{ username, password, confirmPassword }` — mọi trường khác (vd `role`) **bị bỏ qua** | `201 Me` (role luôn `User`) + **tự đăng nhập** (set cookie, cấp lại XSRF) — D10 |
| `POST /api/auth/login` | G | `{ username, password }` | `200 Me` + set cookie; sai → `401 INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | U,S,A | – | `204`, xóa cookie |
| `GET /api/auth/me` | U,S,A | – | `200 Me`; Guest → `401` |
| `GET /api/admin/accounts` | A | `?search=&role=&page=&pageSize=` | `200 Paged<AccountRow>` (không có hash) |
| `POST /api/admin/accounts/staff` | A | `{ username, password, confirmPassword }` | `201 AccountRow` (role `Staff`) |

Validation (F001): username trim, 3–30 ký tự `^[A-Za-z0-9._-]+$`, so trùng không phân biệt hoa thường; password 8–128 ký tự, giữ nguyên; `confirmPassword` khớp. Lỗi trả `errors.username` / `errors.password` / `errors.confirmPassword`.

---

## 4. M02 – Sản phẩm (F004–F005)

```ts
type Product = {
  drugId: string; name: string; description?: string; imageUrl?: string;   // null → FE dùng ảnh mặc định
  saleUnit: string; requiresPrescription: boolean; isControlled: boolean;
  inStock: boolean;                 // availableQuantity > 0
  unitPrice?: number;               // CHỈ có khi đã đăng nhập. Với Guest, thuộc tính KHÔNG xuất hiện trong JSON
}
type DrugAdmin = {
  drugId: string; name: string; description?: string; imageUrl?: string; saleUnit: string;
  unitPrice: number; lowStockThreshold: number;
  requiresPrescription: boolean; isControlled: boolean; isForSale: boolean;
}
type DrugInput = Omit<DrugAdmin, "drugId" | "imageUrl">   // PUT
type DrugCreate = Omit<DrugAdmin, "imageUrl">               // POST (có drugId)
```

| Method & URL | Quyền | Body / Query | Response |
|---|---|---|---|
| `GET /api/products` | G,U,S,A | `?search=&page=&pageSize=` (search theo mã/tên, không phân biệt hoa thường; chỉ `isForSale=true`) | `200 Paged<Product>` |
| `GET /api/products/{drugId}` | G,U,S,A | – | `200 Product`; không có/tắt bán → `404` |
| `GET /api/admin/drugs` | A | `?search=&page=&pageSize=` | `200 Paged<DrugAdmin>` (gồm cả thuốc tắt bán) |
| `GET /api/admin/drugs/{drugId}` | A | – | `200 DrugAdmin` |
| `POST /api/admin/drugs` | A | `DrugCreate` | `201 DrugAdmin` |
| `PUT /api/admin/drugs/{drugId}` | A | `DrugInput` | `200 DrugAdmin` |
| `PATCH /api/admin/drugs/{drugId}/sale-status` | A | `{ isForSale: boolean }` | `200 DrugAdmin` |
| `POST /api/admin/drugs/{drugId}/image` | A | `multipart/form-data` field `file` | `200 DrugAdmin` |
| `GET /api/files/drugs/{fileName}` | tất cả | – | ảnh |

Rule: `isControlled=true` ⇒ `requiresPrescription=true` (nếu không → `400`, `errors.requiresPrescription`). Giá nguyên dương; ngưỡng ≥ 0. Không có API xóa thuốc.

---

## 5. M03 – Kho và báo cáo (F006–F009)

```ts
type InventoryRow = {
  drugId: string; name: string; saleUnit: string; lowStockThreshold: number;
  totalQuantity: number;       // tồn thực tế (gồm lô hết hạn)
  unexpiredQuantity: number;   // tồn còn hạn (ExpiryDate > D)
  reservedQuantity: number;    // tổng StockReservation Active
  availableQuantity: number;   // unexpired - reserved (>= 0)
}
type BatchView = { batchId: string; batchNumber: string; expiryDate: string; initialQuantity: number; quantity: number; isExpired: boolean }
type InventoryDetail = InventoryRow & { batches: BatchView[] }   // batches sắp theo expiryDate tăng, rồi batchNumber
type LowStockRow = { drugId: string; name: string; availableQuantity: number; lowStockThreshold: number }
type ExpiringRow = { drugId: string; drugName: string; batchId: string; batchNumber: string; quantity: number; expiryDate: string; daysRemaining: number }
```

| Method & URL | Quyền | Body / Query | Response |
|---|---|---|---|
| `POST /api/admin/drugs/{drugId}/batches` | A | `{ batchNumber, expiryDate, quantity }` | `201 BatchView`. Lỗi: thuốc không có `404`; lô trùng `409 DUPLICATE`; `expiryDate <= D` hoặc quantity ≤ 0 → `400` |
| `GET /api/inventory` | S,A | `?search=&page=&pageSize=` | `200 Paged<InventoryRow>` |
| `GET /api/inventory/{drugId}` | S,A | – | `200 InventoryDetail` |
| `GET /api/reports/low-stock` | S,A | – | `200 LowStockRow[]` — available ≤ threshold, sắp `availableQuantity` tăng rồi `drugId` |
| `GET /api/reports/expiring` | S,A | `?days=30` (nguyên dương, mặc định 30; sai → `400`) | `200 ExpiringRow[]` — lô quantity > 0 và `0 < daysRemaining <= days`, sắp expiryDate tăng |

F008 (giữ/giải phóng/FEFO) là **nội bộ**, không có endpoint riêng.

---

## 6. M04 – Đơn thuốc (F010–F011)

```ts
type PrescriptionItemView = {
  itemId: string; drugId: string; drugName: string; saleUnit: string;
  prescribedQuantity: number; reservedQuantity: number; dispensedQuantity: number;
  remainingQuantity: number;   // prescribed - dispensed - reserved
}
type PrescriptionView = {
  prescriptionId: string; status: PrescriptionStatus;
  ownerUserId?: string; ownerUsername?: string;           // null = tiếp nhận tại quầy
  createdByUsername: string;
  patientId: string; patientName: string; prescriberName?: string;
  issueDate?: string; validUntil?: string;
  hasImage: boolean; imageUrl?: string;                    // "/api/prescriptions/{id}/image"
  reviewedByUsername?: string; reviewedAt?: string; reviewNote?: string;
  createdAt: string;
  items: PrescriptionItemView[];
  linkedOrders: { orderId: string; status: OrderStatus; items: { drugId: string; drugName: string; unit: string; quantity: number }[] }[];  // D12: đơn hàng online dùng đơn thuốc này (chỉ trả cho S,A; với U là [])
}
type PrescriptionRow = Pick<PrescriptionView, "prescriptionId"|"status"|"patientId"|"patientName"|"ownerUsername"|"createdAt"|"validUntil">
type PrescriptionDetailsInput = {
  patientId: string; patientName: string; prescriberName: string;
  issueDate: string; validUntil: string;
  items: { drugId: string; quantity: number }[];           // server gộp dòng trùng thuốc
}
```

| Method & URL | Quyền | Body / Query | Response |
|---|---|---|---|
| `POST /api/prescriptions` | U | `multipart`: `image` (PNG/JPG/JPEG ≤ 5 MB, kiểm tra cả nội dung), `patientId`, `patientName` | `201 PrescriptionView` (`PendingReview`, items rỗng) |
| `GET /api/prescriptions/mine` | U | `?status=&page=&pageSize=` | `200 Paged<PrescriptionRow>` |
| `GET /api/prescriptions` | S,A | `?status=&search=&page=&pageSize=` | `200 Paged<PrescriptionRow>` |
| `GET /api/prescriptions/{id}` | U(chủ),S,A | – | `200 PrescriptionView` |
| `GET /api/prescriptions/{id}/image` | U(chủ),S,A | – | file ảnh (không public) |
| `POST /api/prescriptions/counter` | S,A | `PrescriptionDetailsInput & { prescriptionId: string }` (mã đơn giấy, unique) | `201 PrescriptionView` (`PendingReview`) |
| `PUT /api/prescriptions/{id}/details` | S,A | `PrescriptionDetailsInput` (chỉ khi `PendingReview`) | `200 PrescriptionView` |
| `POST /api/prescriptions/{id}/approve` | S,A | – (yêu cầu đã có prescriber, ngày, ≥1 dòng; issueDate ≤ D; validUntil ≥ issueDate) | `200 PrescriptionView` |
| `POST /api/prescriptions/{id}/reject` | S,A | `{ reason: string }` (bắt buộc) | `200 PrescriptionView` |
| `POST /api/prescriptions/{id}/cancel` | S,A | `{ reason: string }` (chỉ `Approved` chưa cấp đủ) | `200 PrescriptionView` |
| `GET /api/prescriptions/usable` | U | – | `200 PrescriptionView[]` — đơn của mình `Approved` còn hiệu lực hoặc `PendingReview` (để chọn khi đặt hàng) |

Khi Approve: các Order `WaitingReview` liên kết được kiểm tra lại → đủ điều kiện thì sang `AwaitingPayment`, không thì giữ nguyên và ghi `note`. Khi Reject/Cancel: Order `WaitingReview` liên kết → `Rejected` kèm lý do.

---

## 7. M05 – Giỏ và đơn hàng (F012–F016)

### 7.1 Giỏ (F012) — chỉ U
```ts
type CartLine = {
  drugId: string; name: string; saleUnit: string; imageUrl?: string;
  unitPrice: number; quantity: number; lineTotal: number;
  requiresPrescription: boolean; isControlled: boolean;
  issue?: "NOT_FOR_SALE" | "INSUFFICIENT_STOCK";   // báo để khách sửa
  availableQuantity: number;
}
type CartView = { items: CartLine[]; subtotal: number }
```
| Method & URL | Body | Response |
|---|---|---|
| `GET /api/cart` | – | `200 CartView` |
| `POST /api/cart/items` | `{ drugId, quantity }` — đã có thì **cộng dồn** | `200 CartView` |
| `PUT /api/cart/items/{drugId}` | `{ quantity }` (nguyên dương) | `200 CartView` |
| `DELETE /api/cart/items/{drugId}` | – | `200 CartView` |

Guest gọi → `401`; S/A gọi → `403`. Thêm giỏ **không** giữ kho. Thêm mới hoặc tăng số lượng khi tồn khả dụng không đủ (kể cả = 0) → `409 INSUFFICIENT_STOCK`, giỏ không đổi; giảm/xóa luôn được phép (D9).

### 7.2 Đơn hàng của User (F013, F014)
```ts
type OrderItemView = { drugId: string; drugName: string; unit: string; quantity: number; unitPrice: number; lineTotal: number }
type PaymentSummary = { paymentId: string; status: PaymentStatus; expectedAmount: number; receivedAmount?: number; reviewNote?: string; approvedAt?: string }
type OrderView = {
  orderId: string; createdAt: string; saleKind: SaleKind; status: OrderStatus;
  receiverName: string; phone: string; receiveMethod: ReceiveMethod; address?: string;
  prescriptionId?: string; patientId?: string;
  totalAmount: number; note?: string;              // lý do từ chối/hủy/chưa duyệt
  items: OrderItemView[];
  payment?: PaymentSummary;                        // null = chưa mở thanh toán
  invoiceId?: string;                              // có sau khi F019 xuất thành công
  handledByUsername?: string;
  canCancel: boolean; canPay: boolean;             // server tính, FE chỉ hiển thị nút theo cờ
}
type OrderRow = Pick<OrderView, "orderId"|"createdAt"|"saleKind"|"status"|"totalAmount"|"receiveMethod"> & { paymentStatus?: PaymentStatus; customerUsername?: string; handledByUsername?: string }
type PlaceOrderInput = {
  saleKind: SaleKind;
  receiverName: string; phone: string; receiveMethod: ReceiveMethod; address?: string;  // address bắt buộc khi Delivery
  prescriptionId?: string;                         // bắt buộc khi saleKind = Prescription
  expectedTotal: number;                           // tổng khách đã thấy
}
```
| Method & URL | Quyền | Body / Query | Response |
|---|---|---|---|
| `POST /api/orders` | U | `PlaceOrderInput` (đặt toàn bộ dòng giỏ) | `201 OrderView`. Tổng tính lại ≠ `expectedTotal` → `409 PRICE_CHANGED` với `data: CartView`; FE hiển thị giá mới, khách bấm xác nhận → gửi lại với tổng mới |
| `GET /api/orders/mine` | U | `?status=&page=&pageSize=` | `200 Paged<OrderRow>` |
| `GET /api/orders/{orderId}` | U(chủ) | – | `200 OrderView` |
| `POST /api/orders/{orderId}/cancel` | U(chủ) | – | `200 OrderView` (chỉ `WaitingReview`/`AwaitingPayment` và payment chưa `Confirmed`; giải phóng giữ hàng/hạn mức, payment → `Closed`) |

Quy tắc đặt hàng: OTC có thuốc `requiresPrescription`/`isControlled` → `409 PRESCRIPTION_REQUIRED`. Prescription: đơn thuốc phải của chính User; `Approved` + hiệu lực + đủ hạn mức → `AwaitingPayment`; `PendingReview` → `WaitingReview`; khác → `409 PRESCRIPTION_INVALID`. Đặt xong xóa các dòng đã đặt khỏi giỏ. Không nhận `userId`/giá từ client.

### 7.3 Quản lý đơn trực tuyến (F015) — S,A
| Method & URL | Body / Query | Response / Điều kiện |
|---|---|---|
| `GET /api/staff/orders` | `?status=&search=&page=&pageSize=` (search theo mã đơn, username, tên người nhận, SĐT) | `200 Paged<OrderRow>` |
| `GET /api/staff/orders/{orderId}` | – | `200 OrderView` (+ `customerUsername`) |
| `POST /api/staff/orders/{orderId}/claim` | – | ghi `HandledBy = me` → `200 OrderView` |
| `POST /api/staff/orders/{orderId}/fulfill` | – | Gọi **F019 CheckoutService**: `Preparing` + payment `Confirmed` + chưa có invoice → `200 { saleId, invoiceId }`. Lỗi → `409` (đơn vẫn `Preparing`, ghi `note`, thanh toán giữ nguyên) |
| `POST /api/staff/orders/{orderId}/ship` | – | `Preparing` → `Delivering` (chỉ `Delivery`, phải có invoice) |
| `POST /api/staff/orders/{orderId}/complete` | – | `Delivering` → `Completed` (Delivery) hoặc `Preparing` → `Completed` (Pickup, phải có invoice) |
| `POST /api/staff/orders/{orderId}/reject` | `{ reason }` | `WaitingReview`/`AwaitingPayment` chưa thanh toán → `Rejected`, giải phóng giữ |
| `POST /api/staff/orders/{orderId}/cancel` | `{ reason }` | như trên → `Cancelled` |

Mọi thao tác ghi `HandledBy` nếu chưa có. Cập nhật giao hàng **không** trừ kho lần nữa.

### 7.4 Bán tại quầy (F016) — S,A, chỉ nháp **của mình**
```ts
type SaleLineView = { drugId: string; drugName: string; unit: string; quantity: number; unitPrice: number; lineTotal: number;
                      allocations?: { batchNumber: string; expiryDate: string; quantity: number }[] }   // allocations chỉ có khi Completed
type SaleView = {
  saleId: string; channel: SaleChannel; kind: SaleKind; status: SaleStatus;
  createdByUsername: string; createdAt: string; completedAt?: string;
  prescriptionId?: string; patientId?: string; orderId?: string;
  items: SaleLineView[]; totalAmount: number;     // Draft: tạm tính theo giá hiện tại; Completed: giá đã chốt
  canCheckout: boolean; issues: string[];         // kết quả Sale.Validate() chạy thử (tiếng Việt)
  paymentMethod?: PaymentMethod; invoiceId?: string;
}
```
| Method & URL | Body / Query | Response |
|---|---|---|
| `POST /api/staff/sales` | `{ kind: SaleKind; prescriptionId?: string; patientId?: string }` | `201 SaleView` (`Draft`, `Counter`). Loại **không đổi** sau khi tạo |
| `GET /api/staff/sales` | `?status=&page=&pageSize=` (chỉ của mình) | `200 Paged<SaleView>` |
| `GET /api/staff/sales/{saleId}` | – | `200 SaleView` (nháp người khác → `404`) |
| `PUT /api/staff/sales/{saleId}` | `{ prescriptionId?: string; patientId?: string; items: { drugId: string; quantity: number }[] }` | `200 SaleView` — thay toàn bộ dòng, gộp trùng; chỉ `Draft` |
| `POST /api/staff/sales/{saleId}/cancel` | – | `200 SaleView` (`Cancelled`) |
| `POST /api/staff/sales/{saleId}/checkout` | `{ cashReceived: true }` | Gọi **F019** → `200 SaleView` (`Completed`, có `invoiceId`). Lỗi → `409` tương ứng, nháp giữ nguyên |

---

## 8. M06 – Thanh toán và hóa đơn (F017–F020)

### 8.1 Hiển thị thanh toán QR (F017)
```ts
type PaymentView = {
  paymentId: string; orderId: string; status: PaymentStatus;
  expectedAmount: number; transferContent: string;   // = orderId
  bankName: string; accountNumber: string; accountName: string; qrImageUrl: string;   // BẢN CHỤP lúc mở lần đầu
  receivedAmount?: number; reviewNote?: string; createdAt: string; approvedAt?: string;
}
type PaymentSettingView = { bankName: string; accountNumber: string; accountName: string; qrImageUrl?: string; isConfigured: boolean }
```
| Method & URL | Quyền | Body | Response |
|---|---|---|---|
| `POST /api/orders/{orderId}/payment` | U(chủ) | – | Lần đầu: kiểm tra + **giữ hàng/hạn mức** + tạo Payment `PendingReview` → `201 PaymentView`. Lần sau: trả **cùng** bản ghi `200` (không giữ lặp). Lỗi: `INVALID_STATE` (đơn không `AwaitingPayment`), `INSUFFICIENT_STOCK`, `PRESCRIPTION_INVALID`, `PAYMENT_NOT_CONFIGURED` |
| `GET /api/orders/{orderId}/payment` | U(chủ),S,A | – | `200 PaymentView`; chưa mở → `404` |
| `GET /api/files/qr/{fileName}` | U,S,A | – | ảnh QR |
| `GET /api/admin/payment-settings` | A | – | `200 PaymentSettingView` |
| `PUT /api/admin/payment-settings` | A | `{ bankName, accountNumber, accountName }` | `200 PaymentSettingView` |
| `POST /api/admin/payment-settings/qr-image` | A | multipart `file` | `200 PaymentSettingView` |

FE phải hiển thị nguyên văn cảnh báo (SRS 6.2):
> Vui lòng kiểm tra kỹ số tiền và nội dung chuyển khoản trước khi thanh toán. Chuyển thiếu số tiền yêu cầu sẽ không được duyệt. Nếu chuyển thừa, cửa hàng không chịu trách nhiệm đối với phần tiền chuyển thừa. Sau khi chuyển khoản, vui lòng chờ Admin hoặc nhân viên kiểm tra và xác nhận.

Không có nút "Tôi đã chuyển khoản", không upload biên lai.

### 8.2 Duyệt thanh toán (F018) — S,A
```ts
type PaymentRow = { paymentId: string; orderId: string; customerUsername: string; expectedAmount: number; status: PaymentStatus; createdAt: string; reviewNote?: string; receivedAmount?: number }
type PaymentReviewInput = { bankReference: string; receivedAmount: number; receivedAt: string; note?: string }
type PaymentReviewResult = { approved: boolean; payment: PaymentView; orderStatus: OrderStatus }
```
| Method & URL | Body / Query | Response |
|---|---|---|
| `GET /api/staff/payments` | `?status=PendingReview&search=&page=&pageSize=` | `200 Paged<PaymentRow>` |
| `POST /api/staff/payments/{paymentId}/review` | `PaymentReviewInput` | `receivedAmount >= expectedAmount` → `Confirmed`, ghi ApprovedBy/At, order → `Preparing`, `approved: true`. `receivedAmount < expectedAmount` → **giữ** `PendingReview`, lưu `reviewNote` "Chuyển thiếu …", `approved: false` (status `200`). Đã duyệt/đơn hủy → `409 INVALID_STATE`; mã GD đã dùng → `409 DUPLICATE_BANK_REFERENCE` |
| `POST /api/staff/payments/{paymentId}/note` | `{ note: string }` | ghi lý do chưa duyệt (vd chưa thấy tiền) → `200 PaymentView` |

Duyệt **không** trừ kho.

### 8.3 Hoàn tất giao dịch (F019)
Nội bộ — gọi qua `POST /api/staff/orders/{id}/fulfill` và `POST /api/staff/sales/{id}/checkout`.

### 8.4 Hóa đơn (F020)
```ts
type InvoiceView = {
  invoiceId: string; issuedAt: string; saleId: string;
  kind: SaleKind; channel: SaleChannel; paymentMethod: PaymentMethod;
  customerUsername?: string; receiverName?: string;      // online
  createdByUsername: string;                             // người lập/xuất
  orderId?: string; prescriptionId?: string; patientId?: string;
  items: SaleLineView[];                                 // có allocations (lô xuất)
  totalAmount: number;
}
type InvoiceRow = Pick<InvoiceView, "invoiceId"|"issuedAt"|"kind"|"channel"|"totalAmount"|"customerUsername"|"createdByUsername"|"orderId">
```
| Method & URL | Quyền | Response |
|---|---|---|
| `GET /api/invoices` | U (của mình), S (mình lập hoặc đơn mình xử lý), A (tất cả) · `?search=&page=&pageSize=` | `200 Paged<InvoiceRow>` |
| `GET /api/invoices/{invoiceId}` | như trên | `200 InvoiceView`; ngoài phạm vi → `404` |

---

## 9. Dashboard
```ts
type DashboardSummary = {
  pendingPrescriptions: number;    // đơn thuốc PendingReview
  awaitingPaymentOrders: number;   // đơn AwaitingPayment
  pendingPayments: number;         // payment PendingReview
  preparingOrders: number;         // đơn Preparing
  lowStockCount: number; expiringCount: number;   // cửa sổ 30 ngày
}
```
| `GET /api/dashboard/summary` | S,A | `200 DashboardSummary` |
|---|---|---|

---

## 10. Ma trận endpoint ↔ function
| F | Endpoint chính |
|---|---|
| F001 | `POST /api/auth/register` |
| F002 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| F003 | `/api/admin/accounts*` |
| F004 | `/api/products*` |
| F005 | `/api/admin/drugs*` (trừ batches) |
| F006 | `POST /api/admin/drugs/{id}/batches` |
| F007 | `/api/inventory*` |
| F008 | nội bộ (InventoryService) |
| F009 | `/api/reports/*` |
| F010 | `POST /api/prescriptions`, `/counter`, `/mine`, `GET /api/prescriptions*`, `/details` |
| F011 | `/approve`, `/reject`, `/cancel` + kiểm tra hạn mức nội bộ |
| F012 | `/api/cart*` |
| F013 | `POST /api/orders` |
| F014 | `/api/orders/mine`, `/api/orders/{id}`, `/cancel` |
| F015 | `/api/staff/orders*` |
| F016 | `/api/staff/sales*` (trừ checkout) |
| F017 | `/api/orders/{id}/payment`, `/api/admin/payment-settings*` |
| F018 | `/api/staff/payments*` |
| F019 | `/fulfill`, `/checkout` (CheckoutService) |
| F020 | `/api/invoices*` |
