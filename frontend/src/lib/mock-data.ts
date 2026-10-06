import {
  CartLine,
  CartView,
  DashboardSummary,
  DrugAdmin,
  InvoiceRow,
  InvoiceView,
  Me,
  OrderItemView,
  OrderRow,
  OrderStatus,
  OrderView,
  Paged,
  PaymentStatus,
  PaymentView,
  PlaceOrderInput,
  PrescriptionRow,
  PrescriptionStatus,
  PrescriptionView,
  Product,
  Role,
} from './types';

// Tài khoản nội bộ dùng khi phát triển
export const MOCK_ACCOUNTS: Record<string, { user: Me; password: string }> = {
  admin: {
    user: {
      userId: 'U00000001',
      username: 'admin',
      role: 'Admin',
      homePath: '/admin',
    },
    password: 'Admin@12345',
  },
  staff: {
    user: {
      userId: 'U00000002',
      username: 'staff',
      role: 'Staff',
      homePath: '/staff',
    },
    password: 'Staff@12345',
  },
  chuduc: {
    user: {
      userId: 'U00000003',
      username: 'chuduc',
      role: 'User',
      homePath: '/',
    },
    password: 'User@12345',
  },
  nguyenvana: {
    user: {
      userId: 'U00000004',
      username: 'nguyenvana',
      role: 'User',
      homePath: '/',
    },
    password: 'User@12345',
  },
};

// ≥ 12 thuốc mẫu theo SRS §8
export const MOCK_DRUGS: DrugAdmin[] = [
  {
    drugId: 'PARA500',
    name: 'Paracetamol 500mg',
    description: 'Thuốc giảm đau, hạ sốt thông thường dùng trong các trường hợp cảm cúm, nhức đầu.',
    saleUnit: 'Hộp',
    unitPrice: 35000,
    lowStockThreshold: 20,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'AMOX500',
    name: 'Amoxicillin 500mg',
    description: 'Kháng sinh nhóm penicillin điều trị nhiễm khuẩn hô hấp, tiết niệu, tai mũi họng.',
    saleUnit: 'Vỉ',
    unitPrice: 45000,
    lowStockThreshold: 15,
    requiresPrescription: true,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'IBUP400',
    name: 'Ibuprofen 400mg',
    description: 'Thuốc chống viêm không steroid (NSAID), giảm đau khớp, đau răng, đau bụng kinh.',
    saleUnit: 'Hộp',
    unitPrice: 55000,
    lowStockThreshold: 25,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'BERB100',
    name: 'Berberin 100mg',
    description: 'Thuốc điều trị tiêu chảy, kiết lỵ, viêm ruột từ thảo mộc.',
    saleUnit: 'Lọ',
    unitPrice: 28000,
    lowStockThreshold: 30,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'MORPH10',
    name: 'Morphin Sulfat 10mg',
    description: 'Thuốc giảm đau mạnh thuộc nhóm opioid gây nghiện, kiểm soát đặc biệt.',
    saleUnit: 'Ống',
    unitPrice: 120000,
    lowStockThreshold: 10,
    requiresPrescription: true,
    isControlled: true,
    isForSale: true,
  },
  {
    drugId: 'DIAZ005',
    name: 'Diazepam 5mg',
    description: 'Thuốc hướng thần an thần, giải lo âu, kiểm soát co giật.',
    saleUnit: 'Hộp',
    unitPrice: 90000,
    lowStockThreshold: 10,
    requiresPrescription: true,
    isControlled: true,
    isForSale: true,
  },
  {
    drugId: 'PANADOL',
    name: 'Panadol Extra Đỏ',
    description: 'Giảm đau hạ sốt có chứa paracetamol và caffeine.',
    saleUnit: 'Hộp',
    unitPrice: 42000,
    lowStockThreshold: 50,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'OMEP20',
    name: 'Omeprazole 20mg',
    description: 'Thuốc ức chế bơm proton điều trị trào ngược dạ dày, viêm loét dạ dày tá tràng.',
    saleUnit: 'Hộp',
    unitPrice: 65000,
    lowStockThreshold: 20,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'CETI10',
    name: 'Cetirizine 10mg',
    description: 'Thuốc kháng histamin chống dị ứng, viêm mũi dị ứng, mề đay.',
    saleUnit: 'Hộp',
    unitPrice: 32000,
    lowStockThreshold: 20,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'CEFA500',
    name: 'Cefalexin 500mg',
    description: 'Kháng sinh cephalosporin thế hệ 1 dùng cho nhiễm khuẩn da và đường hô hấp.',
    saleUnit: 'Hộp',
    unitPrice: 48000,
    lowStockThreshold: 15,
    requiresPrescription: true,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'VITC500',
    name: 'Vitamin C 500mg C sủi',
    description: 'Viên sủi bổ sung vitamin C, tăng cường sức đề kháng và giảm mệt mỏi.',
    saleUnit: 'Tuýp',
    unitPrice: 38000,
    lowStockThreshold: 40,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'AZITH500',
    name: 'Azithromycin 500mg',
    description: 'Kháng sinh nhóm macrolide điều trị viêm phổi, viêm họng, nhiễm khuẩn sinh dục.',
    saleUnit: 'Hộp',
    unitPrice: 110000,
    lowStockThreshold: 10,
    requiresPrescription: true,
    isControlled: false,
    isForSale: true,
  },
  {
    drugId: 'DISC001',
    name: 'Thuốc Mẫu Tắt Bán',
    description: 'Sản phẩm đã ngừng kinh doanh để kiểm thử điều kiện isForSale=false.',
    saleUnit: 'Hộp',
    unitPrice: 50000,
    lowStockThreshold: 5,
    requiresPrescription: false,
    isControlled: false,
    isForSale: false,
  },
  {
    drugId: 'OUT001',
    name: 'Siro Ho Trẻ Em (Tạm hết hàng)',
    description: 'Siro trị ho long đờm cho trẻ nhỏ - minh họa sản phẩm hết hàng tồn kho.',
    saleUnit: 'Chai',
    unitPrice: 40000,
    lowStockThreshold: 10,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  },
];

export const MOCK_STOCK: Record<string, number> = {
  PARA500: 150,
  AMOX500: 45,
  IBUP400: 80,
  BERB100: 200,
  MORPH10: 12,
  DIAZ005: 18,
  PANADOL: 300,
  OMEP20: 60,
  CETI10: 95,
  CEFA500: 30,
  VITC500: 180,
  AZITH500: 25,
  DISC001: 50,
  OUT001: 0,
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  pendingPrescriptions: 3,
  awaitingPaymentOrders: 4,
  pendingPayments: 2,
  preparingOrders: 5,
  lowStockCount: 2,
  expiringCount: 1,
};

// Cấu hình thanh toán QR nội bộ
export const MOCK_PAYMENT_SETTING = {
  bankName: 'Ngân hàng Quân Đội (MB Bank)',
  accountNumber: '0000000000',
  accountName: 'NHA THUOC GPP',
  // SVG Data URI QR Code minh họa chuẩn
  qrImageUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23ffffff"/><rect x="25" y="25" width="70" height="70" fill="%230f172a"/><rect x="40" y="40" width="40" height="40" fill="%23ffffff"/><rect x="50" y="50" width="20" height="20" fill="%230f172a"/><rect x="205" y="25" width="70" height="70" fill="%230f172a"/><rect x="220" y="40" width="40" height="40" fill="%23ffffff"/><rect x="230" y="50" width="20" height="20" fill="%230f172a"/><rect x="25" y="205" width="70" height="70" fill="%230f172a"/><rect x="40" y="220" width="40" height="40" fill="%23ffffff"/><rect x="50" y="230" width="20" height="20" fill="%230f172a"/><rect x="120" y="30" width="20" height="30" fill="%230f172a"/><rect x="150" y="40" width="30" height="20" fill="%230f172a"/><rect x="110" y="80" width="80" height="20" fill="%230f172a"/><rect x="40" y="120" width="30" height="40" fill="%230f172a"/><rect x="90" y="120" width="40" height="30" fill="%230f172a"/><rect x="150" y="120" width="40" height="40" fill="%23059669"/><rect x="210" y="120" width="50" height="30" fill="%230f172a"/><rect x="120" y="180" width="30" height="40" fill="%230f172a"/><rect x="170" y="180" width="40" height="30" fill="%230f172a"/><rect x="230" y="170" width="40" height="50" fill="%230f172a"/><rect x="120" y="240" width="50" height="30" fill="%230f172a"/><rect x="190" y="240" width="60" height="25" fill="%230f172a"/><text x="150" y="290" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%23059669" font-weight="bold">MA QR</text></svg>',
  isConfigured: true,
};

// ==========================================
// STATEFUL STORAGE HELPERS (LocalStorage)
// ==========================================

function readStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Lỗi lưu localStorage [${key}]:`, err);
  }
}

// ------------------------------------------
// M02: PRODUCTS
// ------------------------------------------

export function mapDrugToProduct(drug: DrugAdmin, isAuthenticated: boolean): Product {
  const stock = MOCK_STOCK[drug.drugId] ?? 0;
  const inStock = stock > 0;

  const base: Product = {
    drugId: drug.drugId,
    name: drug.name,
    description: drug.description,
    imageUrl: drug.imageUrl,
    saleUnit: drug.saleUnit,
    requiresPrescription: drug.requiresPrescription,
    isControlled: drug.isControlled,
    inStock,
  };

  if (isAuthenticated) {
    base.unitPrice = drug.unitPrice;
  }

  return base;
}

export function getMockProducts(
  search: string = '',
  page: number = 1,
  pageSize: number = 20,
  isAuthenticated: boolean = false
): Paged<Product> {
  const normalizedSearch = search.trim().toLowerCase();
  let filtered = MOCK_DRUGS.filter((d) => d.isForSale);

  if (normalizedSearch) {
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(normalizedSearch) ||
        d.drugId.toLowerCase().includes(normalizedSearch)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return {
    items: pageItems.map((d) => mapDrugToProduct(d, isAuthenticated)),
    page,
    pageSize,
    total,
  };
}

export function getMockProductById(
  drugId: string,
  isAuthenticated: boolean = false
): Product | null {
  const drug = MOCK_DRUGS.find((d) => d.drugId.toLowerCase() === drugId.toLowerCase());
  if (!drug || !drug.isForSale) {
    return null;
  }
  return mapDrugToProduct(drug, isAuthenticated);
}

// ------------------------------------------
// M05: CART (F012)
// ------------------------------------------

const DEFAULT_CART: CartView = {
  items: [
    {
      drugId: 'PARA500',
      name: 'Paracetamol 500mg',
      saleUnit: 'Hộp',
      unitPrice: 35000,
      quantity: 2,
      lineTotal: 70000,
      requiresPrescription: false,
      isControlled: false,
      availableQuantity: 150,
    },
    {
      drugId: 'VITC500',
      name: 'Vitamin C 500mg C sủi',
      saleUnit: 'Tuýp',
      unitPrice: 38000,
      quantity: 1,
      lineTotal: 38000,
      requiresPrescription: false,
      isControlled: false,
      availableQuantity: 180,
    },
  ],
  subtotal: 108000,
};

export function getMockCart(): CartView {
  return readStorage<CartView>('pharmacy_mock_cart', DEFAULT_CART);
}

export function saveMockCart(cart: CartView): void {
  writeStorage('pharmacy_mock_cart', cart);
}

export function addMockCartItem(drugId: string, quantity: number): CartView {
  const cart = getMockCart();
  const drug = MOCK_DRUGS.find((d) => d.drugId === drugId);
  if (!drug) return cart;

  const existingIndex = cart.items.findIndex((i) => i.drugId === drugId);
  const stock = MOCK_STOCK[drugId] ?? 50;

  if (existingIndex >= 0) {
    const existing = cart.items[existingIndex];
    const newQty = existing.quantity + quantity;
    cart.items[existingIndex] = {
      ...existing,
      quantity: newQty,
      lineTotal: newQty * existing.unitPrice,
    };
  } else {
    cart.items.push({
      drugId: drug.drugId,
      name: drug.name,
      saleUnit: drug.saleUnit,
      unitPrice: drug.unitPrice,
      quantity,
      lineTotal: drug.unitPrice * quantity,
      requiresPrescription: drug.requiresPrescription,
      isControlled: drug.isControlled,
      availableQuantity: stock,
    });
  }

  cart.subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0);
  saveMockCart(cart);
  return cart;
}

export function updateMockCartItem(drugId: string, quantity: number): CartView {
  const cart = getMockCart();
  const itemIndex = cart.items.findIndex((i) => i.drugId === drugId);
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const item = cart.items[itemIndex];
      cart.items[itemIndex] = {
        ...item,
        quantity,
        lineTotal: quantity * item.unitPrice,
      };
    }
    cart.subtotal = cart.items.reduce((sum, i) => sum + i.lineTotal, 0);
    saveMockCart(cart);
  }
  return cart;
}

export function deleteMockCartItem(drugId: string): CartView {
  const cart = getMockCart();
  cart.items = cart.items.filter((i) => i.drugId !== drugId);
  cart.subtotal = cart.items.reduce((sum, i) => sum + i.lineTotal, 0);
  saveMockCart(cart);
  return cart;
}

export function clearMockCart(): void {
  saveMockCart({ items: [], subtotal: 0 });
}

// ------------------------------------------
// M04: PRESCRIPTIONS (F010, F011)
// ------------------------------------------

const DEFAULT_PRESCRIPTIONS: PrescriptionView[] = [
  {
    linkedOrders: [],
    prescriptionId: 'DT2610060001',
    status: 'Approved',
    ownerUserId: 'U00000003',
    ownerUsername: 'chuduc',
    createdByUsername: 'chuduc',
    patientId: '079201000123',
    patientName: 'Nguyễn Văn A',
    prescriberName: 'BS. Lê Minh Hoàng (Bệnh viện Thống Nhất)',
    issueDate: '2026-10-01',
    validUntil: '2026-10-31',
    hasImage: true,
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><text x="200" y="40" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="%230f172a">DON THUOC MAU</text><text x="30" y="80" font-family="sans-serif" font-size="12" fill="%23334155">Benh vien Thong Nhat</text><text x="30" y="110" font-family="sans-serif" font-size="12" fill="%23334155">Benh nhan: Nguyen Van A - Nam</text><text x="30" y="130" font-family="sans-serif" font-size="12" fill="%23334155">Chan doan: Viem hong cap</text><line x1="30" y1="150" x2="370" y2="150" stroke="%23cbd5e1"/><text x="30" y="180" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23047857">1. Amoxicillin 500mg (SL: 20 vi)</text><text x="50" y="200" font-family="sans-serif" font-size="11" fill="%2364748b">Ngay uong 2 vien chia 2 lan</text><text x="30" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23047857">2. Paracetamol 500mg (SL: 10 hop)</text><text x="50" y="250" font-family="sans-serif" font-size="11" fill="%2364748b">Uong khi sot tren 38.5 do</text><text x="250" y="420" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%230f172a">Bac si dieu tri</text><text x="250" y="460" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="%23047857">BS. Le Minh Hoang</text></svg>',
    reviewedByUsername: 'staff',
    reviewedAt: '2026-10-02T10:00:00+07:00',
    reviewNote: 'Đơn thuốc hợp lệ, chữ ký và chẩn đoán đầy đủ',
    createdAt: '2026-10-01T15:30:00+07:00',
    items: [
      {
        itemId: 'ITEM001',
        drugId: 'AMOX500',
        drugName: 'Amoxicillin 500mg',
        saleUnit: 'Vỉ',
        prescribedQuantity: 20,
        reservedQuantity: 0,
        dispensedQuantity: 0,
        remainingQuantity: 20,
      },
      {
        itemId: 'ITEM002',
        drugId: 'PARA500',
        drugName: 'Paracetamol 500mg',
        saleUnit: 'Hộp',
        prescribedQuantity: 10,
        reservedQuantity: 0,
        dispensedQuantity: 0,
        remainingQuantity: 10,
      },
    ],
  },
  {
    linkedOrders: [],
    prescriptionId: 'DT2610060002',
    status: 'PendingReview',
    ownerUserId: 'U00000003',
    ownerUsername: 'chuduc',
    createdByUsername: 'chuduc',
    patientId: '079201000123',
    patientName: 'Nguyễn Văn A',
    hasImage: true,
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23fef3c7" stroke="%23f59e0b"/><text x="200" y="150" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="%2392400e">ANH DON THUOC DANG CHO DUYET</text></svg>',
    createdAt: '2026-10-06T08:00:00+07:00',
    items: [],
  },
  {
    linkedOrders: [],
    prescriptionId: 'DT2609010001',
    status: 'Cancelled',
    ownerUserId: 'U00000003',
    ownerUsername: 'chuduc',
    createdByUsername: 'chuduc',
    patientId: '079201000123',
    patientName: 'Nguyễn Văn A',
    issueDate: '2026-08-01',
    validUntil: '2026-08-31',
    hasImage: false,
    reviewedByUsername: 'staff',
    reviewedAt: '2026-08-02T09:00:00+07:00',
    reviewNote: 'Đơn thuốc đã hết thời hạn sử dụng',
    createdAt: '2026-08-01T10:00:00+07:00',
    items: [],
  },
];

export function getMockPrescriptions(): PrescriptionView[] {
  return readStorage<PrescriptionView[]>('pharmacy_mock_prescriptions', DEFAULT_PRESCRIPTIONS);
}

export function saveMockPrescriptions(prescriptions: PrescriptionView[]): void {
  writeStorage('pharmacy_mock_prescriptions', prescriptions);
}

// ------------------------------------------
// M05: ORDERS (F013, F014)
// ------------------------------------------

const DEFAULT_ORDERS: OrderView[] = [
  {
    orderId: 'DH2610060001',
    createdAt: '2026-10-06T09:00:00+07:00',
    saleKind: 'OTC',
    status: 'AwaitingPayment',
    receiverName: 'Nguyễn Văn A',
    phone: '0901234567',
    receiveMethod: 'Delivery',
    address: '123 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh',
    totalAmount: 108000,
    items: [
      {
        drugId: 'PARA500',
        drugName: 'Paracetamol 500mg',
        unit: 'Hộp',
        quantity: 2,
        unitPrice: 35000,
        lineTotal: 70000,
      },
      {
        drugId: 'VITC500',
        drugName: 'Vitamin C 500mg C sủi',
        unit: 'Tuýp',
        quantity: 1,
        unitPrice: 38000,
        lineTotal: 38000,
      },
    ],
    payment: {
      paymentId: 'TT2610060001',
      status: 'PendingReview',
      expectedAmount: 108000,
    },
    canCancel: true,
    canPay: true,
  },
  {
    orderId: 'DH2610050002',
    createdAt: '2026-10-05T14:20:00+07:00',
    saleKind: 'Prescription',
    status: 'Preparing',
    receiverName: 'Nguyễn Văn A',
    phone: '0901234567',
    receiveMethod: 'Pickup',
    prescriptionId: 'DT2610060001',
    patientId: '079201000123',
    totalAmount: 90000,
    items: [
      {
        drugId: 'AMOX500',
        drugName: 'Amoxicillin 500mg',
        unit: 'Vỉ',
        quantity: 2,
        unitPrice: 45000,
        lineTotal: 90000,
      },
    ],
    payment: {
      paymentId: 'TT2610050002',
      status: 'Confirmed',
      expectedAmount: 90000,
      receivedAmount: 90000,
      approvedAt: '2026-10-05T15:00:00+07:00',
    },
    handledByUsername: 'staff',
    canCancel: false,
    canPay: false,
  },
  {
    orderId: 'DH2610040003',
    createdAt: '2026-10-04T10:15:00+07:00',
    saleKind: 'OTC',
    status: 'Completed',
    receiverName: 'Nguyễn Văn A',
    phone: '0901234567',
    receiveMethod: 'Delivery',
    address: '123 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh',
    totalAmount: 70000,
    items: [
      {
        drugId: 'PARA500',
        drugName: 'Paracetamol 500mg',
        unit: 'Hộp',
        quantity: 2,
        unitPrice: 35000,
        lineTotal: 70000,
      },
    ],
    payment: {
      paymentId: 'TT2610040003',
      status: 'Confirmed',
      expectedAmount: 70000,
      receivedAmount: 70000,
      approvedAt: '2026-10-04T10:30:00+07:00',
    },
    invoiceId: 'HD2610040001',
    handledByUsername: 'staff',
    canCancel: false,
    canPay: false,
  },
];

export function getMockOrders(): OrderView[] {
  return readStorage<OrderView[]>('pharmacy_mock_orders', DEFAULT_ORDERS);
}

export function saveMockOrders(orders: OrderView[]): void {
  writeStorage('pharmacy_mock_orders', orders);
}

// ------------------------------------------
// M06: INVOICES (F020)
// ------------------------------------------

const DEFAULT_INVOICES: InvoiceView[] = [
  {
    invoiceId: 'HD2610040001',
    issuedAt: '2026-10-04T11:00:00+07:00',
    saleId: 'BH2610040001',
    kind: 'OTC',
    channel: 'Online',
    paymentMethod: 'ManualQR',
    customerUsername: 'chuduc',
    receiverName: 'Nguyễn Văn A',
    createdByUsername: 'staff',
    orderId: 'DH2610040003',
    items: [
      {
        drugId: 'PARA500',
        drugName: 'Paracetamol 500mg',
        unit: 'Hộp',
        quantity: 2,
        unitPrice: 35000,
        lineTotal: 70000,
        allocations: [
          {
            batchNumber: 'B261001A',
            expiryDate: '2027-10-01',
            quantity: 2,
          },
        ],
      },
    ],
    totalAmount: 70000,
  },
];

export function getMockInvoices(): InvoiceView[] {
  return readStorage<InvoiceView[]>('pharmacy_mock_invoices', DEFAULT_INVOICES);
}

export function saveMockInvoices(invoices: InvoiceView[]): void {
  writeStorage('pharmacy_mock_invoices', invoices);
}

// ------------------------------------------
// M06: PAYMENTS (F017)
// ------------------------------------------

export function getMockPaymentForOrder(orderId: string): PaymentView {
  const orders = getMockOrders();
  const order = orders.find((o) => o.orderId === orderId);
  const amount = order?.totalAmount ?? 100000;

  return {
    paymentId: order?.payment?.paymentId || `TT${orderId.replace('DH', '')}`,
    orderId,
    status: order?.payment?.status || 'PendingReview',
    expectedAmount: amount,
    transferContent: orderId,
    bankName: MOCK_PAYMENT_SETTING.bankName,
    accountNumber: MOCK_PAYMENT_SETTING.accountNumber,
    accountName: MOCK_PAYMENT_SETTING.accountName,
    qrImageUrl: MOCK_PAYMENT_SETTING.qrImageUrl,
    receivedAmount: order?.payment?.receivedAmount,
    reviewNote: order?.payment?.reviewNote,
    createdAt: order?.createdAt || new Date().toISOString(),
    approvedAt: order?.payment?.approvedAt,
  };
}
