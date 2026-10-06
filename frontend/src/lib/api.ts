import {
  ApiError,
  DashboardSummary,
  HealthCheck,
  LoginInput,
  Me,
  Paged,
  Product,
  RegisterInput,
} from './types';
import {
  getMockProductById,
  getMockProducts,
  MOCK_ACCOUNTS,
  MOCK_DASHBOARD_SUMMARY,
} from './mock-data';

export class ApiException extends Error {
  status: number;
  code: string;
  title: string;
  errors?: Record<string, string[]>;
  data?: unknown;

  constructor(apiError: ApiError) {
    super(apiError.title || 'Đã có lỗi xảy ra');
    this.name = 'ApiException';
    this.status = apiError.status;
    this.code = apiError.code;
    this.title = apiError.title;
    this.errors = apiError.errors;
    this.data = apiError.data;
  }
}

/**
 * Kiểm tra xem chế độ mock có được bật hay không
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
    try {
      await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      token = getXsrfToken();
    } catch (err) {
      console.warn('Không thể lấy CSRF token:', err);
    }
  }
  return token;
}

/**
 * Làm mới CSRF token sau khi login hoặc logout
 */
export async function refreshCsrf(): Promise<void> {
  if (isMockMode()) return;
  try {
    await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    });
  } catch (err) {
    console.warn('Lỗi khi làm mới CSRF:', err);
  }
}

/**
 * Mock dispatcher xử lý các API khi NEXT_PUBLIC_USE_MOCK=true
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

    // Role User theo F001, KHÔNG tự đăng nhập
    const newUser: Me = {
      userId: `U${Math.floor(10000000 + Math.random() * 90000000)}`,
      username: trimmedUsername,
      role: 'User',
      homePath: '/',
    };

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

  // 8. Dashboard Summary
  if (path === '/api/dashboard/summary' && method === 'GET') {
    return MOCK_DASHBOARD_SUMMARY as unknown as T;
  }

  // 9. Health Check
  if (path === '/api/health' && method === 'GET') {
    const health: HealthCheck = {
      status: 'ok',
      service: 'Pharmacy.Api (Mock)',
      timestamp: new Date().toISOString(),
    };
    return health as unknown as T;
  }

  throw new ApiException({
    status: 404,
    code: 'NOT_FOUND',
    title: `Mock endpoint không tồn tại: ${method} ${path}`,
  });
}

/**
 * Fetch wrapper chính của ứng dụng
 * Tự động gắn credentials, CSRF token, parse JSON và ánh xạ ProblemDetails ApiError
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
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
    // Nếu kết nối backend thất bại và chưa cấu hình mock, thử fallback sang mock nếu cần
    console.warn(`Lỗi khi gọi ${endpoint}:`, error);
    throw new ApiException({
      status: 503,
      code: 'NETWORK_ERROR',
      title: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend hoặc bật NEXT_PUBLIC_USE_MOCK=true.',
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
      try {
        const errorData = (await response.json()) as ApiError;
        throw new ApiException(errorData);
      } catch (e) {
        if (e instanceof ApiException) throw e;
      }
    }

    // Fallback error nếu không có body JSON ProblemDetails
    throw new ApiException({
      status: response.status,
      code: response.status === 401 ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
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

export const dashboardApi = {
  getSummary: () => apiFetch<DashboardSummary>('/api/dashboard/summary'),
};

export const healthApi = {
  check: () => apiFetch<HealthCheck>('/api/health'),
};
