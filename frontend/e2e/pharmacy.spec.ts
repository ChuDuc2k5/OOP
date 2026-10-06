import { test, expect, type Page, type TestInfo, type APIRequestContext, type Browser } from '@playwright/test';
import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const visitedRoutes = new Set<string>();

async function visit(page: Page, url: string) {
  try { await page.goto(url); }
  catch (error) {
    if (!(error instanceof Error) || !error.message.includes('ERR_NETWORK_IO_SUSPENDED')) throw error;
    await page.goto(url);
  }
  const requested = new URL(url, page.url()).pathname;
  if (/^\/admin\/(payments|sales|prescriptions)(\/|$)/.test(requested)) {
    await expect(page).toHaveURL(new RegExp(requested.replace('/admin/', '/staff/') + '(\\?|$)'));
    visitedRoutes.add(requested);
  }
}
async function ready(page: Page) {
  await expect(page.getByText('Đang tải dữ liệu...', { exact: true })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  visitedRoutes.add(new URL(page.url()).pathname);
}
async function layout(page: Page) {
  const width = page.viewportSize()!.width;
  await expect(page.locator('body')).not.toContainText(/\bVAT\b|\bSRS\b|phí ship|demo|mock mode|dữ liệu mẫu|tài khoản mẫu|Trạng thái API/i);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for (const table of await page.locator('table').all()) {
    const contained = await table.evaluate(element => {
      let parent = element.parentElement;
      while (parent && parent.tagName !== 'MAIN') {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll'].includes(style.overflowX) && parent.clientWidth <= document.documentElement.clientWidth) return true;
        parent = parent.parentElement;
      }
      return element.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(contained, 'Bảng dài phải cuộn trong khung riêng').toBeTruthy();
  }
}
async function shot(page: Page, code: string, info: TestInfo) {
  await ready(page); await layout(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const folder = resolve(process.cwd(), '../docs/screenshots');
  await mkdir(folder, { recursive: true });
  const path = resolve(folder, `${code}-${info.project.name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(code, { path, contentType: 'image/png' });
}
async function login(page: Page, username: 'chuduc' | 'staff' | 'admin') {
  await page.context().clearCookies();
  await visit(page, '/login');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await ready(page); await layout(page);
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(username === 'admin' ? 'Admin@12345' : username === 'staff' ? 'Staff@12345' : 'User@12345');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(username === 'chuduc' ? /\/$/ : new RegExp(`/${username}$`));
  await ready(page);
}
async function api(request: APIRequestContext, path: string, method = 'GET', data?: unknown) {
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    await request.get('/api/auth/csrf');
    const cookies = (await request.storageState()).cookies;
    headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies.find(c => c.name === 'XSRF-TOKEN')!.value);
  }
  const response = await request.fetch(`/api${path}`, { method, data, headers });
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}

async function configurePayments(browser: Browser) {
  const context = await browser.newContext({ baseURL: 'http://localhost:3017' });
  try {
    await api(context.request, '/auth/login', 'POST', { username: 'admin', password: 'Admin@12345' });
    await api(context.request, '/admin/payment-settings', 'PUT', {
      bankName: 'Ngân hàng kiểm thử', accountNumber: '0000000000', accountName: 'NHA THUOC KIEM THU',
    });
    await context.request.get('/api/auth/csrf');
    const token = (await context.cookies()).find(c => c.name === 'XSRF-TOKEN')!.value;
    const uploaded = await context.request.post('/api/admin/payment-settings/qr-image', {
      headers: { 'X-XSRF-TOKEN': decodeURIComponent(token) },
      multipart: { file: { name: 'payment-qr.png', mimeType: 'image/png', buffer: await readFile(resolve(process.cwd(), 'e2e/fixtures/payment-qr.png')) } },
    });
    expect(uploaded.ok(), await uploaded.text()).toBeTruthy();
    expect((await api(context.request, '/admin/payment-settings')).isConfigured).toBe(true);
  } finally { await context.close(); }
}
test.beforeAll(async ({ browser }) => configurePayments(browser));

test('TC01-F001: đăng ký tự đăng nhập và chuyển tới next an toàn', async ({ page }, info) => {
  await visit(page, '/register?next=/cart'); await ready(page);
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(`tc01_${info.project.name}`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('User@12345');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('User@12345');
  await page.request.get('/api/auth/csrf');
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'invalid-old-token', url: new URL(page.url()).origin }]);
  const rejected = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.status() === 400);
  const registered = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.status() === 201);
  const refreshed = page.waitForResponse(r => r.url().endsWith('/api/auth/me') && r.request().method() === 'GET');
  await page.getByRole('button', { name: 'Đăng ký tài khoản', exact: true }).click();
  expect((await (await rejected).json()).code).toBe('ANTIFORGERY_INVALID');
  expect((await registered).status()).toBe(201);
  expect((await refreshed).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/cart$/); await ready(page);
  await expect(page.getByTestId('toast')).toContainText('Đăng ký thành công');
  const me = await api(page.request, '/auth/me'); expect(me.username).toBe(`tc01_${info.project.name}`); expect(me.role).toBe('User');
  await shot(page, 'TC01-F001-registered-session', info);
});

test('TC01-F001: token lỗi liên tiếp chỉ thử lại một lần', async ({ page }, info) => {
  await visit(page, '/register'); await ready(page);
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(`csrf_limit_${info.project.name}`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('User@12345');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('User@12345');
  let requests = 0;
  await page.route('**/api/auth/register', route => {
    requests++;
    return route.fulfill({ status: 400, contentType: 'application/problem+json', json: {
      status: 400, code: 'ANTIFORGERY_INVALID', title: 'Token bảo vệ yêu cầu không hợp lệ.',
    } });
  });
  await page.getByRole('button', { name: 'Đăng ký tài khoản', exact: true }).click();
  await expect(page.getByTestId('toast')).toContainText('Token bảo vệ yêu cầu không hợp lệ.');
  await expect(page.getByRole('button', { name: 'Đăng ký tài khoản', exact: true })).toBeEnabled();
  expect(requests).toBe(2);
  await expect(page.getByLabel('Tên đăng nhập', { exact: true })).toHaveValue(`csrf_limit_${info.project.name}`);
});

test('TC09-F004, TC32-F013, TC42-F017, TC45/TC46-F018, TC37-F019, TC53-F020: luồng khách và nhân viên', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await visit(page, '/'); await ready(page);
  await expect(page.locator('main')).not.toContainText('₫');
  await expect(page.getByRole('link', { name: 'Đăng nhập để mua' }).first()).toBeVisible();
  await shot(page, 'TC09-F004-guest', info);
  await visit(page, '/products/PARA500'); await ready(page);
  await expect(page.locator('main')).not.toContainText('₫');
  await shot(page, 'TC09-F004-guest-detail', info);

  await login(page, 'chuduc');
  const initialCart = await api(page.request, '/cart');
  for (const item of initialCart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await visit(page, '/products/PARA500'); await ready(page);
  const added = page.waitForResponse(r => r.url().endsWith('/api/cart/items') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  expect((await added).ok()).toBeTruthy();
  await expect(page.getByTestId('toast')).toContainText('Đã thêm 1 Viên Paracetamol 500mg vào giỏ');
  await expect(page.getByTestId('toast').getByRole('link', { name: 'Xem giỏ hàng' })).toBeVisible();
  await expect(page.getByTestId('cart-badge').filter({ visible: true })).toHaveText('1');
  await shot(page, 'TC29-F012-add-toast', info);
  await visit(page, '/checkout'); await ready(page);
  await expect(page.locator('input[name="saleKind"]')).toHaveCount(0);
  await page.getByLabel('Họ và tên người nhận').fill('Khách kiểm thử giao diện');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  await shot(page, 'TC32-F013-checkout', info);
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  const opened = page.waitForResponse(r => /\/api\/orders\/[^/]+\/payment$/.test(r.url()) && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const order = await (await placed).json();
  expect(order.saleKind).toBe('OTC');
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}/payment\\?created=1$`));
  await expect(page.locator('main')).toContainText(`Đặt hàng thành công – Mã đơn ${order.orderId}`);
  await expect(page.getByTestId('cart-badge').filter({ visible: true })).toHaveText('0');
  const payment = await (await opened).json();
  expect(payment.expectedAmount).toBe(order.totalAmount);
  await expect(page.getByText('QR là ảnh cố định.', { exact: false })).toBeVisible();
  const qr = page.locator(`img[src="${payment.qrImageUrl}"]`);
  await expect(qr).toBeVisible();
  await expect.poll(() => qr.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  const amount = page.getByText(`${payment.expectedAmount.toLocaleString('vi-VN')} ₫`, { exact: true }).last();
  await amount.scrollIntoViewIfNeeded();
  await expect(amount).toBeInViewport();
  const box = await amount.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(page.getByRole('button', { name: /đã chuyển khoản/i })).toHaveCount(0);
  await shot(page, 'TC42-F017-qr', info);
  await page.getByRole('link', { name: 'Đóng / Về đơn hàng', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}$`)); await ready(page);
  await expect(page.locator('main')).toContainText('Đang chờ nhà thuốc xác nhận thanh toán. Bạn không cần thao tác thêm.');
  await expect(page.getByRole('link', { name: 'Xem lại mã QR', exact: true })).toBeVisible();
  expect((await api(page.request, `/orders/${order.orderId}`)).payment.status).toBe('PendingReview');
  await shot(page, 'TC32-F014-pickup-qr-closed', info);
  await shot(page, 'TC43-F014-pending-next-step', info);
  await visit(page, `/orders/${order.orderId}/payment`); await ready(page);

  const staffContext = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin, viewport: page.viewportSize()!, locale: 'vi-VN' });
  const staff = await staffContext.newPage();
  staff.on('dialog', dialog => dialog.accept());
  await login(staff, 'staff');
  await visit(staff, '/staff/payments'); await ready(staff);
  await staff.getByRole('row').filter({ has: staff.getByRole('link', { name: order.orderId, exact: true }) }).getByRole('button', { name: 'Chưa đủ tiền', exact: true }).click();
  await staff.getByLabel('Số tiền thực nhận (VND)').fill(String(order.totalAmount - 1));
  await staff.getByLabel('Ghi chú chuyển thiếu').fill('Khách chuyển thiếu tiền thuốc');
  await staff.getByRole('button', { name: 'Ghi nhận chuyển thiếu', exact: true }).click();
  await expect(staff.getByText('Chuyển thiếu – chưa duyệt thanh toán', { exact: true })).toBeVisible();
  await shot(staff, 'TC46-F018-short-payment', info);
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Trạng thái thanh toán' })).toContainText('Ghi chú đối chiếu:');
  await shot(page, 'TC46-F017-user-review-note', info);
  const autoRefresh = page.waitForResponse(response => response.url().endsWith(`/api/orders/${order.orderId}/payment`) && response.request().method() === 'GET', { timeout: 25_000 });
  await staff.getByRole('button', { name: 'Đóng', exact: true }).click();
  await visit(staff, '/staff/orders'); await ready(staff);
  await staff.getByRole('row').filter({ has: staff.getByRole('link', { name: order.orderId, exact: true }) }).getByRole('button', { name: 'Đã nhận đủ tiền', exact: true }).click();
  await expect(staff.getByRole('dialog')).toContainText(`cho ${order.orderId}?`);
  await expect(staff.getByLabel('Mã giao dịch ngân hàng (tùy chọn)')).toHaveValue('');
  await expect(staff.getByLabel('Số tiền thực nhận (VND)')).toHaveCount(0);
  const oneTapReview = staff.waitForRequest(r => r.url().endsWith(`/api/staff/payments/${payment.paymentId}/review`) && r.method() === 'POST');
  await shot(staff, 'TC45-F018-one-tap', info);
  await staff.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  expect((await oneTapReview).postDataJSON()).toEqual({});
  await expect(staff.locator('main')).toContainText('Đã xác nhận tiền và lập hóa đơn HD');
  expect((await autoRefresh).ok()).toBeTruthy();
  await expect(page.getByTestId('toast')).toContainText('Đã xác nhận thanh toán.');
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}$`));
  await ready(page);
  await shot(staff, 'TC45-F018-approved', info);
  await staff.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nhà thuốc đang chuẩn bị đơn của bạn.', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Mời bạn đến quầy');
  await expect(page.getByRole('list', { name: 'Tiến trình đơn hàng' }).locator('[aria-current="step"]')).toContainText('Đang chuẩn bị');
  await shot(page, 'TC45-F014-pickup-paid', info);
  await visit(staff, `/staff/orders/${order.orderId}`); await ready(staff);
  await expect(staff.getByRole('button', { name: 'Nhận xử lý', exact: true })).toHaveCount(0);
  const invoiceLink = staff.getByRole('link', { name: /^Hóa đơn HD/ });
  await expect(invoiceLink).toBeVisible();
  const invoiceId = (await invoiceLink.getAttribute('href'))!.split('/').at(-1)!;
  await shot(staff, 'TC37-F019-fulfill', info);
  await expect(staff.getByRole('button', { name: 'Đã chuẩn bị xong', exact: true })).toBeVisible();
  await expect(staff.getByRole('button', { name: 'Khách đã nhận thuốc', exact: true })).toHaveCount(0);
  await visit(staff, '/staff/orders'); await ready(staff);
  const pickupRow = staff.getByRole('row').filter({ has: staff.getByRole('link', { name: order.orderId, exact: true }) });
  await expect(pickupRow).toContainText('Chuẩn bị đơn');
  await pickupRow.getByRole('button', { name: 'Đã chuẩn bị xong', exact: true }).click();
  await expect(staff.getByTestId('toast')).toContainText('Đã báo khách đến nhận thuốc');
  await expect(pickupRow).toContainText('Chờ khách đến lấy');
  await expect(pickupRow).toContainText(/Sẵn sàng từ \d{2}:\d{2}/);
  const readied = await api(staff.request, `/staff/orders/${order.orderId}`);
  expect(readied.readyAt).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Đơn đã sẵn sàng – Mời bạn đến quầy nhận thuốc', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('toast')).toContainText('Đơn đã sẵn sàng – Mời bạn đến quầy nhận thuốc');
  await expect(page.getByRole('list', { name: 'Tiến trình đơn hàng' }).locator('[aria-current="step"]')).toContainText('Sẵn sàng nhận');
  await shot(page, 'TC37-F015-ready-pickup', info);
  await visit(page, '/orders'); await ready(page);
  const customerRow = page.getByRole('row').filter({ has: page.getByRole('link', { name: order.orderId, exact: true }) });
  await expect(customerRow).toContainText('Sẵn sàng nhận');
  await visit(page, `/orders/${order.orderId}`); await ready(page);
  await expect(page.getByTestId('toast').filter({ hasText: 'Đơn đã sẵn sàng' })).toHaveCount(0, { timeout: 5_000 });
  await pickupRow.getByRole('button', { name: 'Khách đã nhận thuốc', exact: true }).click();
  await expect(pickupRow).toContainText('Hoàn tất');
  await visit(staff, `/staff/orders/${order.orderId}`); await ready(staff);
  await expect(staff.getByText('Đơn đã kết thúc, không còn thao tác xử lý.')).toBeVisible();
  await shot(staff, 'TC37-F015-completed', info);
  await expect(page.locator('main')).toContainText('Đơn hàng đã hoàn tất.', { timeout: 15_000 });
  await staffContext.close();

  await login(page, 'chuduc'); await visit(page, `/invoices/${invoiceId}`); await ready(page);
  await expect(page.getByRole('heading', { name: `#${invoiceId}`, exact: true })).toBeVisible();
  await expect(page.getByText('Lô:', { exact: false }).first()).toBeVisible();
  await shot(page, 'TC53-F020-user-invoice', info);
  await visit(page, '/staff'); await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Tra cứu/ })).toBeVisible();
  await shot(page, 'TC17-F002-user-blocked-staff', info);
});

test('TC29-F012, TC24-F010: phản hồi giỏ và gửi ảnh đơn thuốc', async ({ page }, info) => {
  await login(page, 'chuduc');
  const cart = await api(page.request, '/cart');
  for (const item of cart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await visit(page, '/?search=PARA500'); await ready(page);
  let writes = 0;
  await page.route('**/api/cart/items', async route => {
    if (route.request().method() === 'POST') { ++writes; await new Promise(resolve => setTimeout(resolve, 700)); }
    await route.continue();
  });
  const addButton = page.getByRole('button', { name: 'Thêm Paracetamol 500mg vào giỏ', exact: true });
  await addButton.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(addButton).toBeDisabled();
  await expect(addButton).toContainText('Đang xử lý…');
  await expect(page.getByTestId('toast')).toContainText('Đã thêm 1 Viên Paracetamol 500mg vào giỏ');
  expect(writes).toBe(1);
  await expect(page.getByTestId('cart-badge').filter({ visible: true })).toHaveText('1');
  await shot(page, 'TC29-F012-home-add-toast', info);
  await page.getByTestId('toast').getByRole('link', { name: 'Xem giỏ hàng' }).click();
  await expect(page).toHaveURL(/\/cart$/); await ready(page);
  await page.getByRole('button', { name: 'Tăng số lượng', exact: true }).click();
  await expect(page.getByTestId('toast')).toContainText('Đã cập nhật số lượng');
  await expect(page.getByTestId('cart-badge').filter({ visible: true })).toHaveText('2');
  await page.route('**/api/cart/items/PARA500', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Tăng số lượng', exact: true }).click();
  await expect(page.getByTestId('toast')).toContainText('Không thể kết nối đến máy chủ.');
  await expect(page.getByTestId('cart-badge').filter({ visible: true })).toHaveText('2');
  await expect(page.locator('main')).toContainText('Paracetamol 500mg');
  await page.unroute('**/api/cart/items/PARA500');
  await page.getByRole('button', { name: 'Đóng thông báo' }).click();
  await expect(page.getByTestId('toast')).toHaveCount(0);
  await page.getByTitle('Xóa khỏi giỏ').click();
  await expect(page.getByTestId('toast')).toContainText('Đã xóa thuốc');
  await expect(page.getByTestId('cart-badge').filter({ visible: true })).toHaveText('0');
  await expect(page.getByTestId('toast')).toHaveCount(0, { timeout: 5500 });
  await visit(page, '/prescriptions/new'); await ready(page);
  await page.getByLabel('Họ và tên bệnh nhân').fill('Người bệnh kiểm thử phản hồi');
  await page.getByLabel('Mã định danh bệnh nhân', { exact: false }).fill(`UI-${info.project.name}-PAT`);
  await page.getByLabel('Ảnh đơn thuốc').setInputFiles({ name: 'prescription.png', mimeType: 'image/png', buffer: await readFile(resolve(process.cwd(), 'e2e/fixtures/payment-qr.png')) });
  await page.getByRole('button', { name: 'Gửi đơn thuốc', exact: true }).click();
  await expect(page).toHaveURL(/\/prescriptions\/DT[^?]+\?sent=1$/);
  await expect(page.locator('main')).toContainText('Đã gửi, chờ dược sĩ kiểm tra');
  await shot(page, 'TC24-F010-sent-banner', info);
});

test('TC32/TC42/TC45/TC37: giao hàng và thử xuất kho lại sau xác nhận tiền', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await login(page, 'chuduc');
  const cart = await api(page.request, '/cart');
  for (const item of cart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await api(page.request, '/cart/items', 'POST', { drugId: 'PARA500', quantity: 1 });
  await visit(page, '/checkout'); await ready(page);
  await page.getByLabel('Họ và tên người nhận').fill('Khách giao hàng');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Giao tận nơi/ }).check();
  await page.getByLabel('Địa chỉ nhận thuốc chi tiết', { exact: false }).fill('123 Nguyễn Trãi, Hà Nội');
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const order = await (await placed).json();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}/payment\\?created=1$`)); await ready(page);
  await shot(page, 'TC42-F017-delivery-qr', info);
  await page.getByRole('link', { name: 'Đóng / Về đơn hàng', exact: true }).click(); await ready(page);
  const staffContext = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin, viewport: page.viewportSize()!, locale: 'vi-VN' });
  const staff = await staffContext.newPage(); staff.on('dialog', dialog => dialog.accept());
  await login(staff, 'staff'); await visit(staff, `/staff/orders/${order.orderId}`); await ready(staff);
  await expect(staff.getByLabel('Lý do (bắt buộc)', { exact: true })).toHaveCount(0);
  await staff.getByRole('button', { name: 'Từ chối đơn hàng', exact: true }).click();
  await expect(staff.getByLabel('Lý do (bắt buộc)', { exact: true })).toBeVisible();
  await expect(staff.getByRole('button', { name: 'Xác nhận từ chối đơn hàng', exact: true })).toBeDisabled();
  await staff.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(staff.getByLabel('Lý do (bắt buộc)', { exact: true })).toHaveCount(0);
  await staff.getByRole('button', { name: 'Đã nhận đủ tiền', exact: true }).click();
  await staff.getByLabel('Mã giao dịch ngân hàng').fill(`DELIVERY-${info.project.name}-${order.orderId}`);
  await expect(staff.getByLabel('Số tiền thực nhận (VND)')).toHaveCount(0);
  await expect(staff.getByLabel('Thời điểm nhận tiền')).toHaveCount(0);
  await shot(staff, 'TC45-F018-prefilled-review', info);
  await staff.route(`**/api/staff/orders/${order.orderId}/fulfill`, route => route.abort('failed'), { times: 1 });
  await staff.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(staff.locator('main')).toContainText('Đã xác nhận tiền nhưng chưa xuất kho được: Không thể kết nối đến máy chủ.');
  const reviewed = await api(staff.request, `/staff/orders/${order.orderId}`);
  expect(reviewed.payment.status).toBe('Confirmed'); expect(reviewed.invoiceId).toBeFalsy();
  await expect(staff.getByRole('button', { name: 'Đã nhận đủ tiền', exact: true })).toHaveCount(0);
  await shot(staff, 'TC37-F019-fulfill-retry', info);
  await staff.getByRole('button', { name: 'Thử xuất kho lại', exact: true }).click();
  await expect(staff.getByRole('link', { name: /^Hóa đơn HD/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nhà thuốc đang chuẩn bị đơn của bạn.', exact: true })).toBeVisible({ timeout: 25_000 });
  await shot(page, 'TC45-F014-delivery-paid', info);
  await visit(staff, '/staff/orders'); await ready(staff);
  const deliveryRow = staff.getByRole('row').filter({ has: staff.getByRole('link', { name: order.orderId, exact: true }) });
  await deliveryRow.getByRole('button', { name: 'Đã chuẩn bị xong – Bắt đầu giao', exact: true }).click();
  await expect(deliveryRow.getByRole('button', { name: 'Đã giao xong', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đơn hàng đang trên đường giao đến bạn', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('toast')).toContainText('Đơn hàng đang trên đường giao đến bạn');
  await shot(page, 'TC37-F015-delivering', info);
  await deliveryRow.getByRole('button', { name: 'Đã giao xong', exact: true }).click();
  await expect(deliveryRow).toContainText('Hoàn tất');
  await visit(staff, `/staff/orders/${order.orderId}`); await ready(staff);
  await expect(staff.locator('main')).toContainText('Đơn đã kết thúc');
  await shot(staff, 'TC37-F015-delivery-completed', info);
  await visit(page, `/orders/${order.orderId}`); await ready(page);
  await expect(page.locator('main')).toContainText('Đơn hàng đã hoàn tất.');
  await staffContext.close();
});

test('TC31-F012: hết hàng bị khóa và backend từ chối số lượng vượt tồn', async ({ page }, info) => {
  await login(page, 'chuduc');
  const initialCart = await api(page.request, '/cart');
  for (const item of initialCart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await visit(page, '/?search=VITC500'); await ready(page);
  await expect(page.getByText('Hết hàng', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạm hết hàng', exact: true })).toBeDisabled();
  await shot(page, 'TC31-F012-out-of-stock-home', info);
  await visit(page, '/products/VITC500'); await ready(page);
  await expect(page.getByRole('button', { name: 'Tạm hết hàng', exact: true })).toBeDisabled();
  await shot(page, 'TC31-F012-out-of-stock-detail', info);
  await visit(page, '/products/PARA500'); await ready(page);
  await page.getByRole('button', { name: 'Tăng', exact: true }).evaluate((button: HTMLButtonElement) => { for (let i = 0; i < 100; i++) button.click(); });
  const rejected = page.waitForResponse(r => r.url().endsWith('/api/cart/items') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  const response = await rejected;
  expect(response.status()).toBe(409);
  const problem = await response.json(); expect(problem.code).toBe('INSUFFICIENT_STOCK');
  await expect(page.getByTestId('toast')).toContainText(problem.title);
  await shot(page, 'TC31-F012-insufficient-stock', info);
});

test('TC32/TC33-F013: lỗi mở QR giữ đơn và đơn thuốc chờ duyệt chưa mở QR', async ({ page, browser }, info) => {
  await configurePayments(browser);
  await login(page, 'chuduc');
  const cart = await api(page.request, '/cart');
  for (const item of cart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await api(page.request, '/cart/items', 'POST', { drugId: 'PARA500', quantity: 1 });
  await visit(page, '/checkout'); await ready(page);
  await page.getByLabel('Họ và tên người nhận').fill('Khách kiểm tra lỗi');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  let paymentFailureSent = false;
  await page.route('**/api/orders/*/payment', route => {
    if (route.request().method() === 'POST' && !paymentFailureSent) {
      paymentFailureSent = true;
      return route.fulfill({ status: 409, contentType: 'application/problem+json', json: { status: 409, code: 'PAYMENT_NOT_CONFIGURED', title: 'PAYMENT_NOT_CONFIGURED' } });
    }
    return route.continue();
  });
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const order = await (await placed).json();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}\\?created=1$`)); await ready(page);
  await expect(page.locator('main')).toContainText('Nhà thuốc chưa cấu hình tài khoản nhận tiền. Vui lòng thử lại sau.');
  await expect(page.locator('body')).not.toContainText('PAYMENT_NOT_CONFIGURED');
  await expect(page.getByRole('link', { name: 'Mở thanh toán QR', exact: true })).toBeVisible();
  await shot(page, 'TC32-F013-payment-open-error', info);
  await page.getByRole('link', { name: 'Mở thanh toán QR', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}/payment$`)); await ready(page);
  await api(page.request, `/orders/${order.orderId}/cancel`, 'POST');
  await api(page.request, '/cart/items', 'POST', { drugId: 'PARA500', quantity: 1 });
  await api(page.request, '/cart/items', 'POST', { drugId: 'AMOX500', quantity: 1 });
  await visit(page, '/checkout'); await ready(page);
  await page.getByLabel('Họ và tên người nhận').fill('Khách chờ duyệt');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  await expect(page.locator('input[name="saleKind"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tải ảnh đơn thuốc mới', exact: true }).click();
  await page.getByLabel('Tên người bệnh', { exact: true }).fill('Người bệnh tại checkout');
  await page.getByLabel('Mã người bệnh (CCCD/BHYT)', { exact: true }).fill(`CHECKOUT-${info.project.name}`);
  await page.getByLabel('Ảnh đơn thuốc (PNG/JPG, tối đa 5 MB)').setInputFiles({ name: 'prescription.png', mimeType: 'image/png', buffer: await readFile(resolve(process.cwd(), 'e2e/fixtures/payment-qr.png')) });
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'invalid-upload-token', url: new URL(page.url()).origin }]);
  const rejectedUpload = page.waitForResponse(r => r.url().endsWith('/api/prescriptions') && r.status() === 400);
  const prescriptionResponse = page.waitForResponse(r => r.url().endsWith('/api/prescriptions') && r.status() === 201);
  await page.getByRole('button', { name: 'Gửi ảnh đơn thuốc', exact: true }).click();
  expect((await (await rejectedUpload).json()).code).toBe('ANTIFORGERY_INVALID');
  const prescription = await (await prescriptionResponse).json();
  expect(prescription.hasImage).toBe(true);
  await expect(page.getByLabel('Chọn đơn thuốc của bạn', { exact: true })).toHaveValue(prescription.prescriptionId);
  await shot(page, 'TC33-F013-inline-prescription', info);
  const waiting = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const waitingOrder = await (await waiting).json(); expect(waitingOrder.status).toBe('WaitingReview');
  await expect(page).toHaveURL(new RegExp(`/orders/${waitingOrder.orderId}\\?created=1$`)); await ready(page);
  await expect(page.locator('main')).toContainText('Đơn đang chờ dược sĩ kiểm tra đơn thuốc. Bạn sẽ thanh toán sau khi đơn thuốc được duyệt.');
  expect((await api(page.request, `/orders/${waitingOrder.orderId}`)).payment).toBeFalsy();
  await shot(page, 'TC33-F013-waiting-prescription', info);
  expect((await api(page.request, `/prescriptions/${prescription.prescriptionId}`)).linkedOrders).toEqual([]);
  await api(page.request, '/cart/items', 'POST', { drugId: 'PARA500', quantity: 2 });
  await api(page.request, '/cart/items', 'POST', { drugId: 'AMOX500', quantity: 2 });
  const secondCart = await api(page.request, '/cart');
  const secondOrder = await api(page.request, '/orders', 'POST', { saleKind: 'Prescription', prescriptionId: prescription.prescriptionId, receiverName: 'Khách chờ duyệt', phone: '0901234567', receiveMethod: 'Pickup', expectedTotal: secondCart.subtotal });
  expect(secondOrder.status).toBe('WaitingReview');
  const staffContext = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin, viewport: page.viewportSize()!, locale: 'vi-VN' });
  try {
    const staff = await staffContext.newPage();
    await login(staff, 'staff');
    const pendingCard = staff.getByRole('link').filter({ hasText: 'Đơn thuốc chờ kiểm tra' });
    await expect(pendingCard).toHaveAttribute('href', '/staff/prescriptions?status=PendingReview');
    await pendingCard.click(); await ready(staff);
    await expect(staff.getByRole('combobox')).toHaveValue('PendingReview');
    await visit(staff, '/staff/orders'); await ready(staff);
    const reviewLink = staff.getByRole('row').filter({ has: staff.getByRole('link', { name: waitingOrder.orderId, exact: true }) }).getByRole('link', { name: 'Kiểm tra đơn thuốc', exact: true });
    await expect(reviewLink).toHaveAttribute('href', `/staff/prescriptions/${prescription.prescriptionId}`);
    await reviewLink.click(); await ready(staff);
    const linked = await api(staff.request, `/prescriptions/${prescription.prescriptionId}`);
    expect(linked.items).toHaveLength(0); expect(linked.linkedOrders).toHaveLength(2);
    await expect(staff.locator('main')).toContainText(`Điền sẵn từ đơn hàng ${waitingOrder.orderId}, ${secondOrder.orderId}`);
    await expect(staff.getByRole('heading', { name: 'Đơn hàng liên quan', exact: true })).toBeVisible();
    const preview = staff.getByRole('heading', { name: 'Dòng thuốc cần đối chiếu', exact: true }).locator('..');
    await expect(preview.getByRole('listitem').filter({ hasText: 'AMOX500' })).toContainText('3 Viên');
    await expect(preview.getByRole('listitem').filter({ hasText: 'PARA500' })).toContainText('3 Viên');
    for (const quantity of await preview.locator('strong').all()) {
      const box = await quantity.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(staff.viewportSize()!.width);
    }
    await expect(staff.getByLabel('Tìm thuốc theo mã/tên')).toHaveCount(0);
    await expect(staff.getByRole('button', { name: 'Thêm/sửa dòng thuốc', exact: true })).toHaveAttribute('aria-expanded', 'false');
    const prescriber = staff.getByLabel('Người kê đơn (bắt buộc)', { exact: true });
    await expect(prescriber).toBeFocused(); await expect(prescriber).toHaveAttribute('required', '');
    await expect(staff.getByRole('button', { name: 'Lưu & chấp nhận', exact: true })).toBeDisabled();
    await expect(staff.locator('main')).toContainText('Chưa thể lưu & chấp nhận: Người kê đơn');
    const dates = await staff.evaluate(() => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      const end = new Date(`${today}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 30);
      return { today, end: end.toISOString().slice(0, 10) };
    });
    await expect(staff.getByLabel('Ngày kê đơn', { exact: true })).toHaveValue(dates.today);
    await expect(staff.getByLabel('Hiệu lực đến', { exact: true })).toHaveValue(dates.end);
    const columns = await staff.getByTestId('prescription-review-layout').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(info.project.name === '1366' ? 2 : 1);
    await shot(staff, 'TC26-F011-online-prefilled', info);
    await staff.getByRole('button', { name: 'Phóng to ảnh đơn thuốc', exact: true }).click();
    await expect(staff.getByRole('dialog')).toBeVisible();
    await staff.getByRole('button', { name: 'Đóng ảnh phóng to', exact: true }).click();
    await expect(staff.getByRole('dialog')).not.toBeVisible();
    await staff.getByRole('button', { name: 'Thêm/sửa dòng thuốc', exact: true }).click();
    await expect(staff.getByLabel('Tìm thuốc theo mã/tên')).toBeVisible();
    await expect(staff.getByLabel('Số lượng dòng 1', { exact: true })).toHaveValue('3');
    await staff.getByRole('button', { name: 'Thêm/sửa dòng thuốc', exact: true }).click();
    await prescriber.fill('Bác sĩ đối chiếu ảnh');
    await staff.getByRole('button', { name: 'Lưu & chấp nhận', exact: true }).click();
    await expect(staff.getByTestId('toast')).toContainText(`Đã chấp nhận đơn thuốc. Đơn hàng ${waitingOrder.orderId}, ${secondOrder.orderId} đã chuyển sang Chờ thanh toán.`);
    expect((await api(staff.request, `/staff/orders/${secondOrder.orderId}`)).status).toBe('AwaitingPayment');
    await shot(staff, 'TC26-F011-online-approved', info);
  } finally { await staffContext.close(); }
  await expect(page).toHaveURL(new RegExp(`/orders/${waitingOrder.orderId}/payment$`), { timeout: 15_000 }); await ready(page);
  expect((await api(page.request, `/orders/${waitingOrder.orderId}`)).payment.status).toBe('PendingReview');
  await visit(page, `/orders/${waitingOrder.orderId}`); await ready(page);
  await expect(page.locator('[aria-current="step"]')).toContainText('Chờ thanh toán');
  await expect(page.locator('main')).not.toContainText('Đơn hàng đang chờ nhân viên kiểm tra đơn thuốc');
  await shot(page, 'TC33-F014-prescription-approved', info);
  await page.getByRole('link', { name: 'Xem lại mã QR', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${waitingOrder.orderId}/payment$`)); await ready(page);
  expect((await api(page.request, `/orders/${waitingOrder.orderId}`)).payment.status).toBe('PendingReview');
});

test('TC33-F017: duyệt qua API tự mở QR trong 15 giây và lỗi giữ đơn', async ({ page }, info) => {
  await login(page, 'chuduc');
  const staff = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin });
  try {
    await api(staff.request, '/auth/login', 'POST', { username: 'staff', password: 'Staff@12345' });
    const createWaiting = async (suffix: string) => {
      const cart = await api(page.request, '/cart');
      for (const item of cart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
      await page.request.get('/api/auth/csrf');
      const token = (await page.context().cookies()).find(c => c.name === 'XSRF-TOKEN')!.value;
      const uploaded = await page.request.post('/api/prescriptions', {
        headers: { 'X-XSRF-TOKEN': decodeURIComponent(token) },
        multipart: { patientName: 'Khách chờ tự cập nhật', patientId: `LIVE-${info.project.name}-${suffix}`, image: { name: 'prescription.png', mimeType: 'image/png', buffer: await readFile(resolve(process.cwd(), 'e2e/fixtures/payment-qr.png')) } },
      });
      expect(uploaded.status()).toBe(201); const rx = await uploaded.json();
      await api(page.request, '/cart/items', 'POST', { drugId: 'AMOX500', quantity: 1 });
      const current = await api(page.request, '/cart');
      const order = await api(page.request, '/orders', 'POST', { saleKind: 'Prescription', prescriptionId: rx.prescriptionId, receiverName: 'Khách tự cập nhật', phone: '0901234567', receiveMethod: 'Pickup', expectedTotal: current.subtotal });
      await visit(page, `/orders/${order.orderId}`); await ready(page);
      await expect(page.locator('[aria-current="step"]')).toContainText('Chờ kiểm tra đơn thuốc');
      await expect(page.locator('main')).toContainText('Tự cập nhật mỗi 10 giây');
      await api(staff.request, `/prescriptions/${rx.prescriptionId}/details`, 'PUT', { patientName: rx.patientName, patientId: rx.patientId, prescriberName: 'Bác sĩ kiểm thử tự cập nhật', issueDate: '2026-10-06', validUntil: '2026-11-05', items: [{ drugId: 'AMOX500', quantity: 1 }] });
      return { order, rx };
    };
    const first = await createWaiting('OK');
    let posts = 0;
    page.on('request', r => { if (r.url().endsWith(`/api/orders/${first.order.orderId}/payment`) && r.method() === 'POST') posts++; });
    const started = Date.now();
    await api(staff.request, `/prescriptions/${first.rx.prescriptionId}/approve`, 'POST');
    await expect(page).toHaveURL(new RegExp(`/orders/${first.order.orderId}/payment$`), { timeout: 15_000 }); await ready(page);
    expect(Date.now() - started).toBeLessThanOrEqual(15_000);
    expect(posts).toBe(1);
    expect((await api(page.request, `/orders/${first.order.orderId}`)).payment.status).toBe('PendingReview');
    await shot(page, 'TC33-F017-auto-qr', info);
    await page.clock.install({ time: new Date('2026-10-06T08:00:00Z') });
    const second = await createWaiting('RETRY');
    let detailReads = 0;
    page.on('request', r => { if (r.url().endsWith(`/api/orders/${second.order.orderId}`) && r.method() === 'GET') detailReads++; });
    const visibility = async (shown: boolean) => page.evaluate(shown => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: shown ? 'visible' : 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, shown);
    await visibility(false);
    await page.clock.runFor(11_000);
    expect(detailReads).toBe(0);
    await page.route(`**/api/orders/${second.order.orderId}/payment`, route => route.fulfill({ status: 409, contentType: 'application/problem+json', json: { status: 409, code: 'INSUFFICIENT_STOCK', title: 'Không đủ hàng để mở thanh toán.' } }), { times: 1 });
    let failedPosts = 0;
    page.on('request', r => { if (r.url().endsWith(`/api/orders/${second.order.orderId}/payment`) && r.method() === 'POST') failedPosts++; });
    await api(staff.request, `/prescriptions/${second.rx.prescriptionId}/approve`, 'POST');
    expect(failedPosts).toBe(0);
    await visibility(true);
    await expect(page.locator('main').getByRole('alert')).toContainText('Không đủ hàng để mở thanh toán.', { timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/orders/${second.order.orderId}$`));
    await expect(page.getByRole('link', { name: 'Mở thanh toán QR', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Làm mới', exact: true })).toBeEnabled();
    expect(failedPosts).toBe(1);
    await page.getByRole('link', { name: 'Mở thanh toán QR', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${second.order.orderId}/payment$`)); await ready(page);
    expect(failedPosts).toBe(2);
    await api(page.request, `/orders/${second.order.orderId}/cancel`, 'POST');
    await visit(page, `/orders/${second.order.orderId}`); await ready(page);
    detailReads = 0;
    await page.clock.runFor(20_000);
    expect(detailReads).toBe(0);
    await visit(page, '/orders'); await ready(page);
    let listReads = 0;
    page.on('request', r => { if (r.url().includes('/api/orders/mine') && r.method() === 'GET') listReads++; });
    await page.clock.runFor(16_000);
    await expect.poll(() => listReads).toBe(1);
    await expect(page.getByRole('button', { name: 'Làm mới', exact: true })).toBeEnabled();
    await visibility(false); await page.clock.runFor(20_000);
    expect(listReads).toBe(1);
    await visibility(true);
    await expect.poll(() => listReads).toBe(2);
    await visit(page, '/orders?status=Completed'); await ready(page);
    listReads = 0;
    await page.clock.runFor(20_000);
    expect(listReads).toBe(0);
  } finally { await staff.close(); }
});

test('TC38-F016/F019: bán OTC tại quầy bằng form', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await login(page, 'staff'); await visit(page, '/staff/sales/new');
  await page.getByLabel('Tìm thuốc theo mã/tên').fill('PARA500');
  await page.getByRole('button', { name: 'Tra cứu thuốc', exact: true }).click();
  await page.getByRole('button', { name: /Paracetamol 500mg \(PARA500\)/ }).click();
  await page.getByLabel('Số lượng dòng 1').fill('1');
  await expect(page.getByLabel('Mã đơn thuốc', { exact: true })).toHaveCount(0);
  await shot(page, 'TC38-F016-counter-one-screen', info);
  let created = 0;
  page.on('request', r => { if (r.url().endsWith('/api/staff/sales') && r.method() === 'POST') ++created; });
  await page.route('**/api/staff/sales/*/checkout', route => route.abort('failed'), { times: 1 });
  await page.getByRole('button', { name: 'Thu tiền mặt & hoàn tất', exact: true }).click();
  await expect(page.locator('main')).toContainText('Không thể kết nối đến máy chủ.');
  await expect(page.getByRole('link', { name: 'Mở nháp để tiếp tục', exact: true })).toBeVisible();
  await shot(page, 'TC38-F016-counter-retry', info);
  await page.getByRole('button', { name: 'Thu tiền mặt & hoàn tất', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/invoices\/HD/); await ready(page);
  expect(created).toBe(1);
  await shot(page, 'TC38-F019-counter-checkout', info);
});

test('TC26-F011: lưu chi tiết và chấp nhận một nút', async ({ page }, info) => {
  await login(page, 'staff');
  const prescription = await api(page.request, '/prescriptions/counter', 'POST', { prescriptionId: `ONE-${info.project.name}`, patientId: 'PATIENT-ONE', patientName: 'Người bệnh một bước', prescriberName: 'Bác sĩ kiểm thử', issueDate: '2026-10-06', validUntil: '2026-11-06', items: [{ drugId: 'PARA500', quantity: 1 }] });
  await visit(page, `/staff/prescriptions/${prescription.prescriptionId}`); await ready(page);
  await expect(page.getByRole('button', { name: 'Thêm/sửa dòng thuốc', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Chấp nhận đơn thuốc', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Lưu & chấp nhận', exact: true }).click();
  await expect(page.locator('main')).toContainText('Đã chấp nhận');
  expect((await api(page.request, `/prescriptions/${prescription.prescriptionId}`)).status).toBe('Approved');
  await shot(page, 'TC26-F011-save-approve', info);
});

test('TC11-F005, TC14-F006: tạo thuốc kèm ảnh và lô đầu', async ({ page }, info) => {
  await login(page, 'admin'); await visit(page, '/admin/drugs/new'); await ready(page);
  const drugId = `FIRST-${info.project.name}`;
  await page.getByLabel('Mã thuốc', { exact: true }).fill(drugId);
  await page.getByLabel('Tên thuốc', { exact: true }).fill('Thuốc kiểm thử một bước');
  await page.getByLabel('Đơn vị bán', { exact: true }).fill('Viên');
  await page.getByLabel('Giá bán (VND)', { exact: true }).fill('2000');
  await page.getByLabel('Ảnh thuốc (tùy chọn, PNG/JPG tối đa 5 MB)').setInputFiles({ name: 'drug.png', mimeType: 'image/png', buffer: await readFile(resolve(process.cwd(), 'e2e/fixtures/payment-qr.png')) });
  await page.getByLabel('Nhập lô đầu tiên', { exact: true }).check();
  await page.getByLabel('Số lô đầu tiên', { exact: true }).fill('FIRST-LOT');
  await page.getByLabel('Hạn dùng lô đầu tiên', { exact: true }).fill('2027-10-06');
  await page.getByLabel('Số lượng lô đầu tiên', { exact: true }).fill('10');
  await shot(page, 'TC11-F005-create-image-batch', info);
  await page.getByRole('button', { name: 'Thêm thuốc', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/drugs/${drugId}$`)); await ready(page);
  const drug = await api(page.request, `/admin/drugs/${drugId}`); expect(drug.imageUrl).toBeTruthy();
  const inventory = await api(page.request, `/inventory/${drugId}`);
  expect(inventory.availableQuantity).toBe(10); expect(inventory.batches[0].batchNumber).toBe('FIRST-LOT');
  await shot(page, 'TC14-F006-first-batch', info);
});

test('F017: Admin cấu hình QR và lỗi theo trường giữ dữ liệu', async ({ page }, info) => {
  await login(page, 'admin'); await visit(page, '/admin/accounts'); await ready(page);
  const form = page.getByRole('button', { name: 'Tạo Staff', exact: true }).locator('..');
  await form.getByLabel('Tên đăng nhập').fill('staff');
  await form.getByLabel('Mật khẩu', { exact: true }).fill('Staff@12345');
  await form.getByLabel('Xác nhận mật khẩu').fill('Staff@12345');
  await form.getByRole('button', { name: 'Tạo Staff', exact: true }).click();
  await expect(form.getByLabel('Tên đăng nhập')).toHaveValue('staff');
  await expect(form.getByLabel('Mật khẩu', { exact: true })).toHaveValue('Staff@12345');
  await expect(form.locator('label').filter({ has: page.getByLabel('Tên đăng nhập') })).toContainText(/đã|tồn tại/i);
  await shot(page, 'TC07-F003-field-error', info);
  await visit(page, '/admin/settings/payment'); await ready(page);
  await page.getByLabel('Tên ngân hàng').fill('Ngân hàng kiểm thử');
  await page.getByLabel('Số tài khoản').fill('0000000000');
  await page.getByLabel('Tên chủ tài khoản').fill('NHA THUOC KIEM THU');
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
  await expect(page.getByText('Đã lưu tài khoản nhận tiền.')).toBeVisible();
  const settings = await api(page.request, '/admin/payment-settings');
  const image = await page.request.get(settings.qrImageUrl);
  expect(image.ok()).toBeTruthy();
  expect(image.headers()['content-type']).toContain('image/png');
  const png = await image.body();
  await page.getByLabel('Tên ngân hàng').fill('Tên đang sửa chưa lưu');
  await page.getByLabel('Ảnh PNG/JPG/JPEG tối đa 5 MB').setInputFiles({ name: 'fixed-qr.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('Xem trước Ảnh QR cố định')).toBeVisible();
  await page.getByRole('button', { name: 'Tải ảnh lên', exact: true }).click();
  await expect(page.getByText('Đã tải ảnh lên.')).toBeVisible();
  await expect(page.getByLabel('Tên ngân hàng')).toHaveValue('Tên đang sửa chưa lưu');
  await page.getByLabel('Tên ngân hàng').fill('Ngân hàng kiểm thử');
  await shot(page, 'F017-admin-qr-settings', info);
});

test('AC02: dashboard quản lý và chuyển sang giao diện nhân viên', async ({ page }, info) => {
  await login(page, 'admin');
  await expect(page.getByRole('heading', { name: 'Tổng quan quản lý', exact: true })).toBeVisible();
  for (const role of ['Admin', 'Staff', 'User']) {
    const accounts = await api(page.request, `/admin/accounts?role=${role}&pageSize=1`);
    await expect(page.getByTestId(`account-count-${role}`)).toHaveText(String(accounts.total));
  }
  const products = await api(page.request, '/products?pageSize=100');
  await expect(page.getByTestId('selling-drug-count')).toHaveText(String(products.total));
  await expect(page.getByTestId('out-of-stock-count')).toHaveText(String(products.items.filter((p: { inStock: boolean }) => !p.inStock).length));
  const summary = await api(page.request, '/dashboard/summary');
  await expect(page.getByTestId('low-stock-count')).toHaveText(String(summary.lowStockCount));
  await expect(page.getByTestId('expiring-count')).toHaveText(String(summary.expiringCount));
  const latest = await api(page.request, '/staff/orders?pageSize=5');
  await expect(page.locator('main tbody tr')).toHaveCount(latest.items.length);
  for (const order of latest.items) await expect(page.locator('main').getByRole('link', { name: order.orderId, exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/doanh thu|thu chi|Chức năng nghiệp vụ/i);
  if (info.project.name === '390') await page.getByRole('button', { name: 'Mở menu quản lý' }).click();
  const sidebar = page.locator('aside');
  await expect(sidebar.locator('nav a')).toHaveCount(8);
  await expect(sidebar).not.toContainText(/Duyệt thanh toán|Bán tại quầy|Đơn thuốc/);
  await expect(sidebar.getByRole('link', { name: 'Làm việc như nhân viên', exact: true })).toBeVisible();
  if (info.project.name === '390') await page.getByRole('button', { name: 'Đóng menu quản lý' }).click();
  await shot(page, 'AC02-admin-dashboard', info);
  await page.locator('main').getByRole('link', { name: 'Làm việc như nhân viên', exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/); await ready(page);
  await expect(page.getByText('Bạn đang dùng giao diện nhân viên', { exact: true })).toBeVisible();
  if (info.project.name === '390') await page.getByRole('button', { name: 'Mở menu quản lý' }).click();
  await expect(sidebar.getByRole('link', { name: 'Duyệt thanh toán', exact: true })).toBeVisible();
  await expect(sidebar.getByText('Quản trị viên', { exact: true })).toBeVisible();
  if (info.project.name === '390') await page.getByRole('button', { name: 'Đóng menu quản lý' }).click();
  await page.getByRole('link', { name: 'Quay lại trang quản lý', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/); await ready(page);
  await page.locator('main').getByRole('link', { name: /Chờ thanh toán/ }).click();
  await expect(page).toHaveURL(/\/admin\/orders\?status=AwaitingPayment$/);
  await expect(page.getByRole('combobox', { name: 'Trạng thái', exact: true })).toHaveValue('AwaitingPayment');
});

test('M4: rà tất cả route, loading/rỗng/lỗi và menu mobile', async ({ page }, info) => {
  await visit(page, '/register'); await ready(page); await layout(page);
  await visit(page, '/'); await ready(page);
  await visit(page, '/?search=khong-co-thuoc-xyz'); await ready(page);
  await expect(page.locator('main')).toContainText(/Không tìm thấy/);
  await shot(page, 'F004-empty', info);
  await page.route('**/api/products/NO-SUCH-PRODUCT', route => route.abort('failed'));
  await visit(page, '/products/NO-SUCH-PRODUCT'); await ready(page);
  await expect(page.locator('main')).toContainText('Không thể kết nối đến máy chủ.');
  await expect(page.locator('main')).not.toContainText(/TypeError|stack| at /);
  await shot(page, 'F004-network-error', info);
  await page.unroute('**/api/products/NO-SUCH-PRODUCT');
  await page.route('**/api/products?*', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
  await visit(page, '/');
  await expect(page.getByRole('status').filter({ hasText: 'Đang tải dữ liệu...' })).toBeVisible();
  await shotLoading(page, info);
  await ready(page); await page.unroute('**/api/products?*');

  await login(page, 'chuduc');
  const userPrescription = await api(page.request, '/prescriptions/usable');
  for (const route of ['/cart', '/orders', '/prescriptions', '/prescriptions/new', '/invoices', ...(userPrescription.length ? [`/prescriptions/${userPrescription[0].prescriptionId}`] : [])]) {
    await visit(page, route); await ready(page); await layout(page);
  }
  await login(page, 'staff');
  const paper = await api(page.request, '/prescriptions/counter', 'POST', { prescriptionId: `AUDIT-${info.project.name}`, patientId: 'PATIENT-AUDIT', patientName: 'Người bệnh kiểm thử', prescriberName: 'Bác sĩ kiểm thử', issueDate: '2026-10-06', validUntil: '2026-11-06', items: [{ drugId: 'PARA500', quantity: 1 }] });
  const sale = await api(page.request, '/staff/sales', 'POST', { kind: 'OTC' });
  const orders = await api(page.request, '/staff/orders');
  const invoices = await api(page.request, '/invoices');
  const shared = ['', '/prescriptions', '/prescriptions/new', `/prescriptions/${paper.prescriptionId}`, '/orders', ...(orders.items.length ? [`/orders/${orders.items[0].orderId}`] : []), '/payments', '/sales', '/sales/new', `/sales/${sale.saleId}`, '/inventory', '/inventory/PARA500', '/reports', '/invoices', ...(invoices.items.length ? [`/invoices/${invoices.items[0].invoiceId}`] : [])];
  for (const route of shared) { await visit(page, `/staff${route}`); await ready(page); await layout(page); }
  await visit(page, '/staff/inventory'); await ready(page);
  await shot(page, 'F007-staff-inventory', info);
  if (info.project.name === '390') {
    await page.getByRole('button', { name: 'Mở menu quản lý' }).click();
    await expect(page.getByRole('button', { name: 'Đóng menu quản lý' })).toBeVisible();
    await shot(page, 'M4-sidebar-open', info);
    await page.getByRole('button', { name: 'Đóng menu quản lý' }).click();
    await expect(page.getByRole('button', { name: 'Mở menu quản lý' })).toHaveAttribute('aria-expanded', 'false');
  }
  await login(page, 'admin');
  // Counter drafts are scoped to their creator, including for Admin.
  const adminSale = await api(page.request, '/staff/sales', 'POST', { kind: 'OTC' });
  for (const route of [...shared.filter(r => r !== `/sales/${sale.saleId}`), `/sales/${adminSale.saleId}`, '/accounts', '/drugs', '/drugs/new', '/drugs/PARA500', '/settings/payment']) {
    await visit(page, `/admin${route}`); await ready(page); await layout(page);
  }
  await visit(page, '/admin/drugs/PARA500'); await ready(page);
  await shot(page, 'F005-F006-admin-drug', info);
  const files = await readdir(resolve(process.cwd(), 'src/app'), { recursive: true });
  const routes = files.map(file => file.replaceAll('\\', '/'))
    .filter(file => file === 'page.tsx' || file.endsWith('/page.tsx'))
    .map(file => '/' + file.replace(/(^|\/)page\.tsx$/, ''));
  const visited = [...visitedRoutes].sort();
  for (const route of routes) {
    const pattern = new RegExp('^' + route.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
    expect(visited.some(url => pattern.test(url)), `Chưa rà route ${route}`).toBeTruthy();
  }
  await writeFile(resolve(process.cwd(), `../docs/screenshots/M4-route-audit-${info.project.name}.json`),
    JSON.stringify({ viewport: page.viewportSize(), routes: routes.sort(), visited, covered: routes.length }, null, 2) + '\n');
});
async function shotLoading(page: Page, info: TestInfo) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const folder = resolve(process.cwd(), '../docs/screenshots'); await mkdir(folder, { recursive: true });
  await page.screenshot({ path: resolve(folder, `F004-loading-${info.project.name}.png`), animations: 'disabled' });
}
