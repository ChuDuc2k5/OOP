/**
 * API Contract v1 - Pharmacy Management System
 * Toàn bộ kiểu dữ liệu được đồng bộ chính xác theo docs/API_CONTRACT.md
 */

// ==========================================
// 1. Quy ước chung & Paged & Lỗi
// ==========================================

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type Role = "User" | "Staff" | "Admin";

/**
 * RFC 7807 ProblemDetails
 */
export type ApiError = {
  status: number; // 400 | 401 | 403 | 404 | 409 | 422 | 500
  code: string; // mã máy đọc (VALIDATION_FAILED, INVALID_CREDENTIALS, ...)
  title: string; // thông điệp tiếng Việt cho người dùng
  errors?: Record<string, string[]>; // lỗi theo trường (camelCase), hiển thị dưới ô nhập
  data?: unknown; // dữ liệu kèm theo (vd PRICE_CHANGED)
};

// ==========================================
// 2. Enum
// ==========================================

export type SaleKind = "OTC" | "Prescription";
export type SaleChannel = "Counter" | "Online";
export type SaleStatus = "Draft" | "Completed" | "Cancelled";
export type ReceiveMethod = "Pickup" | "Delivery";
export type OrderStatus =
  | "WaitingReview"
  | "AwaitingPayment"
  | "Preparing"
  | "Delivering"
  | "Completed"
  | "Cancelled"
  | "Rejected";
export type PaymentStatus = "PendingReview" | "Confirmed" | "Closed";
export type PrescriptionStatus = "PendingReview" | "Approved" | "Rejected" | "Cancelled";
export type PaymentMethod = "Cash" | "ManualQR";

// ==========================================
// 3. M01 - Tài khoản (F001 - F003)
// ==========================================

export type Me = {
  userId: string;
  username: string;
  role: Role;
  homePath: "/" | "/staff" | "/admin";
};

export type AccountRow = {
  userId: string;
  username: string;
  role: Role;
};

export type RegisterInput = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type CreateStaffInput = {
  username: string;
  password: string;
  confirmPassword: string;
};

// ==========================================
// 4. M02 - Sản phẩm (F004 - F005)
// ==========================================

export type Product = {
  availableQuantity?: number;
  drugId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  saleUnit: string;
  requiresPrescription: boolean;
  isControlled: boolean;
  inStock: boolean;
  unitPrice?: number; // CHỈ có khi đã đăng nhập. Với Guest, thuộc tính KHÔNG xuất hiện
};

export type DrugAdmin = {
  drugId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  saleUnit: string;
  unitPrice: number;
  lowStockThreshold: number;
  requiresPrescription: boolean;
  isControlled: boolean;
  isForSale: boolean;
};

export type DrugInput = Omit<DrugAdmin, "drugId" | "imageUrl">; // PUT
export type DrugCreate = Omit<DrugAdmin, "imageUrl">; // POST

export type ChangeSaleStatusInput = {
  isForSale: boolean;
};

// ==========================================
// 5. M03 - Kho và báo cáo (F006 - F009)
// ==========================================

export type InventoryRow = {
  drugId: string;
  name: string;
  saleUnit: string;
  lowStockThreshold: number;
  totalQuantity: number;
  unexpiredQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
};

export type BatchView = {
  batchId: string;
  batchNumber: string;
  expiryDate: string; // yyyy-MM-dd
  initialQuantity: number;
  quantity: number;
  isExpired: boolean;
};

export type InventoryDetail = InventoryRow & {
  batches: BatchView[];
};

export type LowStockRow = {
  drugId: string;
  name: string;
  availableQuantity: number;
  lowStockThreshold: number;
};

export type ExpiringRow = {
  drugId: string;
  drugName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
};

export type CreateBatchInput = {
  batchNumber: string;
  expiryDate: string;
  quantity: number;
};

// ==========================================
// 6. M04 - Đơn thuốc (F010 - F011)
// ==========================================

export type PrescriptionItemView = {
  itemId: string;
  drugId: string;
  drugName: string;
  saleUnit: string;
  prescribedQuantity: number;
  reservedQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
};

export type PrescriptionView = {
  prescriptionId: string;
  status: PrescriptionStatus;
  ownerUserId?: string;
  ownerUsername?: string;
  createdByUsername: string;
  patientId: string;
  patientName: string;
  prescriberName?: string;
  issueDate?: string;
  validUntil?: string;
  hasImage: boolean;
  imageUrl?: string;
  reviewedByUsername?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  items: PrescriptionItemView[];
  linkedOrders: {
    orderId: string;
    status: OrderStatus;
    items: { drugId: string; drugName: string; unit: string; quantity: number }[];
  }[];
};

export type PrescriptionRow = Pick<
  PrescriptionView,
  "prescriptionId" | "status" | "patientId" | "patientName" | "ownerUsername" | "createdAt" | "validUntil"
>;

export type PrescriptionItemInput = {
  drugId: string;
  quantity: number;
};

export type PrescriptionDetailsInput = {
  patientId: string;
  patientName: string;
  prescriberName: string;
  issueDate: string;
  validUntil: string;
  items: PrescriptionItemInput[];
};

export type PrescriptionCounterInput = PrescriptionDetailsInput & {
  prescriptionId: string;
};

export type PrescriptionRejectInput = {
  reason: string;
};

export type PrescriptionCancelInput = {
  reason: string;
};

// ==========================================
// 7. M05 - Giỏ và đơn hàng (F012 - F016)
// ==========================================

export type CartLine = {
  drugId: string;
  name: string;
  saleUnit: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  requiresPrescription: boolean;
  isControlled: boolean;
  issue?: "NOT_FOR_SALE" | "INSUFFICIENT_STOCK";
  availableQuantity: number;
};

export type CartView = {
  items: CartLine[];
  subtotal: number;
};

export type AddToCartInput = {
  drugId: string;
  quantity: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

export type OrderItemView = {
  drugId: string;
  drugName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PaymentSummary = {
  paymentId: string;
  status: PaymentStatus;
  expectedAmount: number;
  receivedAmount?: number;
  reviewNote?: string;
  approvedAt?: string;
};

export type OrderView = {
  orderId: string;
  createdAt: string;
  saleKind: SaleKind;
  status: OrderStatus;
  receiverName: string;
  phone: string;
  receiveMethod: ReceiveMethod;
  address?: string;
  prescriptionId?: string;
  patientId?: string;
  totalAmount: number;
  note?: string;
  items: OrderItemView[];
  payment?: PaymentSummary;
  invoiceId?: string;
  handledByUsername?: string;
  canCancel: boolean;
  canPay: boolean;
};

export type OrderRow = Pick<
  OrderView,
  "orderId" | "createdAt" | "saleKind" | "status" | "totalAmount" | "receiveMethod"
> & {
  paymentStatus?: PaymentStatus;
  customerUsername?: string;
  handledByUsername?: string;
};

export type PlaceOrderInput = {
  saleKind: SaleKind;
  receiverName: string;
  phone: string;
  receiveMethod: ReceiveMethod;
  address?: string;
  prescriptionId?: string;
  expectedTotal: number;
};

export type RejectOrderInput = {
  reason: string;
};

export type CancelOrderInput = {
  reason: string;
};

export type SaleAllocation = {
  batchNumber: string;
  expiryDate: string;
  quantity: number;
};

export type SaleLineView = {
  drugId: string;
  drugName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  allocations?: SaleAllocation[];
};

export type SaleView = {
  saleId: string;
  channel: SaleChannel;
  kind: SaleKind;
  status: SaleStatus;
  createdByUsername: string;
  createdAt: string;
  completedAt?: string;
  prescriptionId?: string;
  patientId?: string;
  orderId?: string;
  items: SaleLineView[];
  totalAmount: number;
  canCheckout: boolean;
  issues: string[];
  paymentMethod?: PaymentMethod;
  invoiceId?: string;
};

export type CreateSaleInput = {
  kind: SaleKind;
  prescriptionId?: string;
  patientId?: string;
};

export type UpdateSaleInput = {
  prescriptionId?: string;
  patientId?: string;
  items: { drugId: string; quantity: number }[];
};

export type CheckoutSaleInput = {
  cashReceived: boolean;
};

export type FulfillResult = {
  saleId: string;
  invoiceId: string;
};

// ==========================================
// 8. M06 - Thanh toán và hóa đơn (F017 - F020)
// ==========================================

export type PaymentView = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  expectedAmount: number;
  transferContent: string; // = orderId
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrImageUrl: string;
  receivedAmount?: number;
  reviewNote?: string;
  createdAt: string;
  approvedAt?: string;
};

export type PaymentSettingView = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrImageUrl?: string;
  isConfigured: boolean;
};

export type PaymentSettingInput = {
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export type PaymentRow = {
  paymentId: string;
  orderId: string;
  customerUsername: string;
  expectedAmount: number;
  status: PaymentStatus;
  createdAt: string;
  reviewNote?: string;
  receivedAmount?: number;
};

export type PaymentReviewInput = {
  bankReference: string;
  receivedAmount: number;
  receivedAt: string;
  note?: string;
};

export type PaymentReviewResult = {
  approved: boolean;
  payment: PaymentView;
  orderStatus: OrderStatus;
};

export type PaymentNoteInput = {
  note: string;
};

export type InvoiceView = {
  invoiceId: string;
  issuedAt: string;
  saleId: string;
  kind: SaleKind;
  channel: SaleChannel;
  paymentMethod: PaymentMethod;
  customerUsername?: string;
  receiverName?: string;
  createdByUsername: string;
  orderId?: string;
  prescriptionId?: string;
  patientId?: string;
  items: SaleLineView[];
  totalAmount: number;
};

export type InvoiceRow = Pick<
  InvoiceView,
  | "invoiceId"
  | "issuedAt"
  | "kind"
  | "channel"
  | "totalAmount"
  | "customerUsername"
  | "createdByUsername"
  | "orderId"
>;

// ==========================================
// 9. Dashboard
// ==========================================

export type DashboardSummary = {
  pendingPrescriptions: number;
  awaitingPaymentOrders: number;
  pendingPayments: number;
  preparingOrders: number;
  lowStockCount: number;
  expiringCount: number;
};

// ==========================================
// 10. Health check
// ==========================================

export type HealthCheck = {
  status: string;
  service?: string;
  database?: string;
  timestamp?: string;
};
