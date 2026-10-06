import { mutationFeedback, notifyError } from './feedback';
import {
  ApiError,
  CartView,
  DashboardSummary,
  HealthCheck,
  InvoiceRow,
  InvoiceView,
  LoginInput,
  Me,
  OrderItemView,
  OrderRow,
  OrderStatus,
  OrderView,
  Paged,
  PaymentView,
  PlaceOrderInput,
  PrescriptionRow,
  PrescriptionStatus,
  PrescriptionView,
  Product,
  RegisterInput,
} from './types';
import {
  addMockCartItem,
  clearMockCart,
  deleteMockCartItem,
  getMockCart,
  getMockInvoices,
  getMockOrders,
  getMockPaymentForOrder,
  getMockPrescriptions,
  getMockProductById,
  getMockProducts,
  MOCK_ACCOUNTS,
  MOCK_DASHBOARD_SUMMARY,
  saveMockOrders,
  saveMockPrescriptions,
  updateMockCartItem,
} from './mock-data';

export class ApiException extends Error {
  status: number;
  code: string;
  title: string;
  errors?: Record<string, string[]>;
  data?: unknown;

  constructor(apiError: ApiError) {
    const title = apiError.code === 'PAYMENT_NOT_CONFIGURED'
      ? 'Nhà thuốc chưa cấu hình tài khoản nhận tiền. Vui lòng thử lại sau.'
      : apiError.title || 'Đã có lỗi xảy ra';
    super(title);
    this.name = 'ApiException';
    this.status = apiError.status;
    this.code = apiError.code;
    this.title = title;
    this.errors = apiError.errors;
    this.data = apiError.data;
  }
}

/**
 * Kiểm tra xem chế độ mock có được bật hay không
 * Chỉ cho phép bật mock qua URL query ?mock=true khi không phải môi trường production
 */
export function isMockMode(): boolean {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const queryParam = new URLSearchParams(window.location.search).get('mock');
    if (queryParam === 'true') return true;
    if (queryParam === 'false') return false;
  }
  return process.env.NEXT_PUBLIC_USE_MOCK === 'true';
}

/**
 * Lấy cookie XSRF-TOKEN từ document.cookie
 */
export function getXsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Lấy session mock từ localStorage
 */
function getMockSession(): Me | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('pharmacy_mock_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setMockSession(user: Me | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem('pharmacy_mock_session');
  } else {
    localStorage.setItem('pharmacy_mock_session', JSON.stringify(user));
  }
}

/**
 * Đảm bảo token CSRF đã được nạp trước khi gọi mutation (POST/PUT/PATCH/DELETE)
 */
export async function ensureCsrfToken(): Promise<string | null> {
  if (isMockMode()) return 'mock-csrf-token';

  let token = getXsrfToken();
  if (!token) {
    await apiFetch<void>('/api/auth/csrf');
    token = getXsrfToken();
  }
  return token;
}

/**
 * Làm mới CSRF token sau khi login hoặc logout
 */
export async function refreshCsrf(): Promise<void> {
  if (isMockMode()) return;
  await apiFetch<void>('/api/auth/csrf');
}

/**
 * Mock dispatcher chỉ xử lý các API khi isMockMode() được bật
 */
async function handleMockRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');

  // Giả lập độ trễ mạng nhẹ (50-100ms) để UI có trạng thái loading tự nhiên
  await new Promise((resolve) => setTimeout(resolve, 60));

  // 1. CSRF
  if (path === '/api/auth/csrf') {
    return undefined as unknown as T;
  }

  // 2. Auth: /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    const session = getMockSession();
    if (!session) {
      throw new ApiException({
        status: 401,
        code: 'UNAUTHENTICATED',
        title: 'Chưa đăng nhập',
      });
    }
    return session as unknown as T;
  }

  // 3. Auth: /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const { username, password } = body as LoginInput;

    const account = Object.values(MOCK_ACCOUNTS).find(
      (acc) =>
        acc.user.username.toLowerCase() === (username || '').trim().toLowerCase()
    );

    if (!account || account.password !== password) {
      throw new ApiException({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Tên đăng nhập hoặc mật khẩu không chính xác',
      });
    }

    setMockSession(account.user);
    return account.user as unknown as T;
  }

  // 4. Auth: /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const { username, password, confirmPassword } = body as RegisterInput;

    const errors: Record<string, string[]> = {};
    const trimmedUsername = (username || '').trim();

    if (!trimmedUsername || !/^[A-Za-z0-9._-]{3,30}$/.test(trimmedUsername)) {
      errors.username = [
        'Tên đăng nhập phải từ 3 đến 30 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang',
      ];
    }

    if (!password || password.length < 8 || password.length > 128) {
      errors.password = ['Mật khẩu phải từ 8 đến 128 ký tự'];
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = ['Mật khẩu xác nhận không khớp'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiException({
        status: 400,
        code: 'VALIDATION_FAILED',
        title: 'Dữ liệu không hợp lệ',
        errors,
      });
    }

    const exists = Object.values(MOCK_ACCOUNTS).some(
      (acc) => acc.user.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (exists) {
      throw new ApiException({
        status: 409,
        code: 'DUPLICATE',
        title: 'Tên đăng nhập đã được sử dụng',
        errors: { username: ['Tên đăng nhập này đã tồn tại trong hệ thống'] },
      });
    }

    const newUser: Me = {
      userId: `U${Math.floor(10000000 + Math.random() * 90000000)}`,
      username: trimmedUsername,
      role: 'User',
      homePath: '/',
    };

    setMockSession(newUser);
    return newUser as unknown as T;
  }

  // 5. Auth: /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    setMockSession(null);
    return undefined as unknown as T;
  }

  // 6. Products: /api/products
  if (path === '/api/products' && method === 'GET') {
    const search = params.get('search') || '';
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '20', 10);
    const session = getMockSession();
    const result = getMockProducts(search, page, pageSize, session !== null);
    return result as unknown as T;
  }

  // 7. Products: /api/products/[drugId]
  if (path.startsWith('/api/products/') && method === 'GET') {
    const drugId = decodeURIComponent(path.replace('/api/products/', ''));
    const session = getMockSession();
    const product = getMockProductById(drugId, session !== null);
    if (!product) {
      throw new ApiException({
        status: 404,
        code: 'NOT_FOUND',
        title: `Không tìm thấy thuốc với mã ${drugId} hoặc sản phẩm đã tắt bán`,
      });
    }
    return product as unknown as T;
  }

  // 8. Cart (F012)
  if (path === '/api/cart' && method === 'GET') {
    const cart = getMockCart();
    return cart as unknown as T;
  }

  if (path === '/api/cart/items' && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const { drugId, quantity } = body;
    const cart = addMockCartItem(drugId, Number(quantity) || 1);
    return cart as unknown as T;
  }

  if (path.startsWith('/api/cart/items/') && method === 'PUT') {
    const drugId = decodeURIComponent(path.replace('/api/cart/items/', ''));
    const body = options.body ? JSON.parse(options.body as string) : {};
    const { quantity } = body;
    const cart = updateMockCartItem(drugId, Number(quantity) || 1);
    return cart as unknown as T;
  }

  if (path.startsWith('/api/cart/items/') && method === 'DELETE') {
    const drugId = decodeURIComponent(path.replace('/api/cart/items/', ''));
    const cart = deleteMockCartItem(drugId);
    return cart as unknown as T;
  }

  // 9. Orders (F013, F014)
  if (path === '/api/orders' && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : ({} as PlaceOrderInput);
    const cart = getMockCart();

    if (cart.items.length === 0) {
      throw new ApiException({
        status: 400,
        code: 'VALIDATION_FAILED',
        title: 'Giỏ hàng của bạn đang trống',
      });
    }

    // Kiểm tra đơn giá nếu có test PRICE_CHANGED
    if (body.expectedTotal > 0 && Math.abs(body.expectedTotal - cart.subtotal) > 0.01) {
      throw new ApiException({
        status: 409,
        code: 'PRICE_CHANGED',
        title: 'Giá sản phẩm đã thay đổi so với lúc xem giỏ hàng',
        data: cart,
      });
    }

    const orderItems: OrderItemView[] = cart.items.map((i) => ({
      drugId: i.drugId,
      drugName: i.name,
      unit: i.saleUnit,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    }));

    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `DH${dateStr}${randNum}`;

    const newOrder: OrderView = {
      orderId,
      createdAt: new Date().toISOString(),
      saleKind: body.saleKind || 'OTC',
      status: body.saleKind === 'Prescription' ? 'WaitingReview' : 'AwaitingPayment',
      receiverName: body.receiverName,
      phone: body.phone,
      receiveMethod: body.receiveMethod,
      address: body.address,
      prescriptionId: body.prescriptionId,
      totalAmount: cart.subtotal,
      items: orderItems,
      payment: {
        paymentId: `TT${dateStr}${randNum}`,
        status: 'PendingReview',
        expectedAmount: cart.subtotal,
      },
      canCancel: true,
      canPay: body.saleKind !== 'Prescription',
    };

    const currentOrders = getMockOrders();
    currentOrders.unshift(newOrder);
    saveMockOrders(currentOrders);
    clearMockCart();

    return newOrder as unknown as T;
  }

  if (path === '/api/orders/mine' && method === 'GET') {
    const orders = getMockOrders();
    const status = params.get('status');
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '20', 10);

    let filtered = orders;
    if (status) {
      filtered = filtered.filter((o) => o.status === status);
    }

    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    const rows: OrderRow[] = pageItems.map((o) => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      saleKind: o.saleKind,
      status: o.status,
      totalAmount: o.totalAmount,
      receiveMethod: o.receiveMethod,
      paymentStatus: o.payment?.status,
      customerUsername: 'chuduc',
      handledByUsername: o.handledByUsername,
    }));

    const result: Paged<OrderRow> = {
      items: rows,
      page,
      pageSize,
      total: filtered.length,
    };
    return result as unknown as T;
  }

  if (path.startsWith('/api/orders/') && path.endsWith('/cancel') && method === 'POST') {
    const orderId = path.replace('/api/orders/', '').replace('/cancel', '');
    const orders = getMockOrders();
    const order = orders.find((o) => o.orderId === orderId);

    if (!order) {
      throw new ApiException({
        status: 404,
        code: 'NOT_FOUND',
        title: `Không tìm thấy đơn hàng ${orderId}`,
      });
    }

    order.status = 'Cancelled';
    order.canCancel = false;
    order.canPay = false;
    if (order.payment) {
      order.payment.status = 'Closed';
    }
    saveMockOrders(orders);
    return order as unknown as T;
  }

  // 10. Payment (F017)
  if (path.startsWith('/api/orders/') && path.endsWith('/payment')) {
    const orderId = path.replace('/api/orders/', '').replace('/payment', '');
    const payment = getMockPaymentForOrder(orderId);
    return payment as unknown as T;
  }

  if (path.startsWith('/api/orders/') && method === 'GET') {
    const orderId = path.replace('/api/orders/', '');
    const orders = getMockOrders();
    const order = orders.find((o) => o.orderId === orderId);

    if (!order) {
      throw new ApiException({
        status: 404,
        code: 'NOT_FOUND',
        title: `Không tìm thấy đơn hàng ${orderId}`,
      });
    }
    return order as unknown as T;
  }

  // 11. Prescriptions (F010, F011)
  if (path === '/api/prescriptions/mine' && method === 'GET') {
    const prescriptions = getMockPrescriptions();
    const status = params.get('status');
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '20', 10);

    let filtered = prescriptions;
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    const rows: PrescriptionRow[] = pageItems.map((p) => ({
      prescriptionId: p.prescriptionId,
      status: p.status,
      patientId: p.patientId,
      patientName: p.patientName,
      ownerUsername: p.ownerUsername,
      createdAt: p.createdAt,
      validUntil: p.validUntil,
    }));

    const result: Paged<PrescriptionRow> = {
      items: rows,
      page,
      pageSize,
      total: filtered.length,
    };
    return result as unknown as T;
  }

  if (path === '/api/prescriptions/usable' && method === 'GET') {
    const prescriptions = getMockPrescriptions();
    // Đơn của mình Approved còn hiệu lực hoặc PendingReview
    const usable = prescriptions.filter(
      (p) => p.status === 'Approved' || p.status === 'PendingReview'
    );
    return usable as unknown as T;
  }

  if (path.startsWith('/api/prescriptions/') && method === 'GET') {
    const id = path.replace('/api/prescriptions/', '');
    const prescriptions = getMockPrescriptions();
    const prescription = prescriptions.find((p) => p.prescriptionId === id);

    if (!prescription) {
      throw new ApiException({
        status: 404,
        code: 'NOT_FOUND',
        title: `Không tìm thấy đơn thuốc ${id}`,
      });
    }
    return prescription as unknown as T;
  }

  if (path === '/api/prescriptions' && method === 'POST') {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const prescriptionId = `DT${dateStr}${randNum}`;

    let patientId = '079201000123';
    let patientName = 'Nguyễn Văn A';

    if (options.body instanceof FormData) {
      patientId = (options.body.get('patientId') as string) || patientId;
      patientName = (options.body.get('patientName') as string) || patientName;
    }

    const newPrescription: PrescriptionView = {
      linkedOrders: [],
      prescriptionId,
      status: 'PendingReview',
      ownerUserId: 'U00000003',
      ownerUsername: 'chuduc',
      createdByUsername: 'chuduc',
      patientId,
      patientName,
      hasImage: true,
      imageUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23fef3c7" stroke="%23f59e0b"/><text x="200" y="150" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="%2392400e">ANH DON THUOC MOI TAI LEN</text></svg>',
      createdAt: new Date().toISOString(),
      items: [],
    };

    const current = getMockPrescriptions();
    current.unshift(newPrescription);
    saveMockPrescriptions(current);

    return newPrescription as unknown as T;
  }

  // 12. Invoices (F020)
  if (path === '/api/invoices' && method === 'GET') {
    const invoices = getMockInvoices();
    const search = (params.get('search') || '').trim().toLowerCase();
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '20', 10);

    let filtered = invoices;
    if (search) {
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceId.toLowerCase().includes(search) ||
          inv.orderId?.toLowerCase().includes(search)
      );
    }

    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    const rows: InvoiceRow[] = pageItems.map((inv) => ({
      invoiceId: inv.invoiceId,
      issuedAt: inv.issuedAt,
      kind: inv.kind,
      channel: inv.channel,
      totalAmount: inv.totalAmount,
      customerUsername: inv.customerUsername,
      createdByUsername: inv.createdByUsername,
      orderId: inv.orderId,
    }));

    const result: Paged<InvoiceRow> = {
      items: rows,
      page,
      pageSize,
      total: filtered.length,
    };
    return result as unknown as T;
  }

  if (path.startsWith('/api/invoices/') && method === 'GET') {
    const invoiceId = path.replace('/api/invoices/', '');
    const invoices = getMockInvoices();
    const invoice = invoices.find((inv) => inv.invoiceId === invoiceId);

    if (!invoice) {
      throw new ApiException({
        status: 404,
        code: 'NOT_FOUND',
        title: `Không tìm thấy hóa đơn ${invoiceId}`,
      });
    }
    return invoice as unknown as T;
  }

  // 13. Dashboard Summary
  if (path === '/api/dashboard/summary' && method === 'GET') {
    return MOCK_DASHBOARD_SUMMARY as unknown as T;
  }

  // 14. Health Check
  if (path === '/api/health' && method === 'GET') {
    const health: HealthCheck = {
      status: 'ok',
      service: 'Pharmacy.Api',
      timestamp: new Date().toISOString(),
    };
    return health as unknown as T;
  }

  throw new ApiException({
    status: 404,
    code: 'NOT_FOUND',
    title: 'Chức năng chưa khả dụng. Vui lòng thử lại sau.',
  });
}

/**
 * Fetch wrapper chính của ứng dụng
 * Tự động gắn credentials, CSRF token, parse JSON và ánh xạ ProblemDetails ApiError
 */
async function requestApi<T>(
  endpoint: string,
  options: RequestInit = {},
  csrfRetried = false
): Promise<T> {
  if (isMockMode()) {
    return handleMockRequest<T>(endpoint, options);
  }

  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Gắn CSRF token cho các mutation request (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await ensureCsrfToken();
    if (token) {
      headers.set('X-XSRF-TOKEN', token);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(endpoint, fetchOptions);
  } catch (error) {
    console.warn(`Lỗi khi gọi ${endpoint}:`, error);
    throw new ApiException({
      status: 503,
      code: 'NETWORK_ERROR',
      title: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    });
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json') || contentType.includes('problem+json');

  if (!response.ok) {
    if (isJson) {
      let errorData: ApiError | undefined;
      try {
        errorData = (await response.json()) as ApiError;
      } catch { /* Dùng lỗi HTTP an toàn khi phản hồi không đọc được. */ }
      if (errorData) {
        if (response.status === 400 && errorData.code === 'ANTIFORGERY_INVALID'
          && !csrfRetried && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          await requestApi<void>('/api/auth/csrf');
          return requestApi<T>(endpoint, options, true);
        }
        throw new ApiException(errorData);
      }
    }

    throw new ApiException({
      status: response.status,
      code:
        response.status === 401
          ? 'UNAUTHENTICATED'
          : response.status === 403
          ? 'FORBIDDEN'
          : 'INTERNAL_ERROR',
      title: response.statusText || `Yêu cầu thất bại với mã lỗi ${response.status}`,
    });
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

// ==========================================
// Các hàm gọi API tiện ích
// ==========================================

export async function apiFetch<T>(endpoint: string, options: RequestInit & { silent?: boolean } = {}): Promise<T> {
  const { silent, ...requestOptions } = options;
  const writing = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase());
  try {
    const result = await requestApi<T>(endpoint, requestOptions);
    if (writing && !silent) mutationFeedback(endpoint, requestOptions, result);
    return result;
  } catch (error) {
    if (writing && !silent) notifyError(error);
    throw error;
  }
}

export const authApi = {
  getCsrf: () => apiFetch<void>('/api/auth/csrf'),
  getMe: () => apiFetch<Me>('/api/auth/me'),
  login: (input: LoginInput) =>
    apiFetch<Me>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  register: (input: RegisterInput) =>
    apiFetch<Me>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () =>
    apiFetch<void>('/api/auth/logout', {
      method: 'POST',
    }),
};

export const productsApi = {
  getProducts: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return apiFetch<Paged<Product>>(`/api/products${qs ? `?${qs}` : ''}`);
  },
  getProductById: (drugId: string) =>
    apiFetch<Product>(`/api/products/${encodeURIComponent(drugId)}`),
};

export const cartApi = {
  getCart: () => apiFetch<CartView>('/api/cart'),
  addItem: (input: { drugId: string; quantity: number }) =>
    apiFetch<CartView>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateItem: (drugId: string, input: { quantity: number }) =>
    apiFetch<CartView>(`/api/cart/items/${encodeURIComponent(drugId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  removeItem: (drugId: string) =>
    apiFetch<CartView>(`/api/cart/items/${encodeURIComponent(drugId)}`, {
      method: 'DELETE',
    }),
};

export const ordersApi = {
  placeOrder: (input: PlaceOrderInput) =>
    apiFetch<OrderView>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getMyOrders: (params?: { status?: OrderStatus; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return apiFetch<Paged<OrderRow>>(`/api/orders/mine${qs ? `?${qs}` : ''}`);
  },
  getOrderById: (orderId: string) =>
    apiFetch<OrderView>(`/api/orders/${encodeURIComponent(orderId)}`),
  cancelOrder: (orderId: string) =>
    apiFetch<OrderView>(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
    }),
};

export const paymentApi = {
  openOrGetPayment: (orderId: string, silent = false) =>
    apiFetch<PaymentView>(`/api/orders/${encodeURIComponent(orderId)}/payment`, {
      method: 'POST',
      silent,
    }),
  getPayment: (orderId: string) =>
    apiFetch<PaymentView>(`/api/orders/${encodeURIComponent(orderId)}/payment`, {
      method: 'GET',
    }),
};

export const prescriptionsApi = {
  getMyPrescriptions: (params?: {
    status?: PrescriptionStatus;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return apiFetch<Paged<PrescriptionRow>>(`/api/prescriptions/mine${qs ? `?${qs}` : ''}`);
  },
  getUsablePrescriptions: () =>
    apiFetch<PrescriptionView[]>('/api/prescriptions/usable'),
  getPrescriptionById: (id: string) =>
    apiFetch<PrescriptionView>(`/api/prescriptions/${encodeURIComponent(id)}`),
  createPrescription: (formData: FormData) =>
    apiFetch<PrescriptionView>('/api/prescriptions', {
      method: 'POST',
      body: formData,
    }),
};

export const invoicesApi = {
  getInvoices: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return apiFetch<Paged<InvoiceRow>>(`/api/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoiceById: (invoiceId: string) =>
    apiFetch<InvoiceView>(`/api/invoices/${encodeURIComponent(invoiceId)}`),
};

export const dashboardApi = {
  getSummary: () => apiFetch<DashboardSummary>('/api/dashboard/summary'),
};

export const healthApi = {
  check: () => apiFetch<HealthCheck>('/api/health'),
};
