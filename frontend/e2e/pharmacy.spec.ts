import { test, expect, type Page, type TestInfo, type APIRequestContext } from '@playwright/test';
import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const visitedRoutes = new Set<string>();

async function visit(page: Page, url: string) {
  try { await page.goto(url); }
  catch (error) {
    if (!(error instanceof Error) || !error.message.includes('ERR_NETWORK_IO_SUSPENDED')) throw error;
    await page.goto(url);
  }
}
async function ready(page: Page) {
  await expect(page.getByText('Đang tải dữ liệu...', { exact: true })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  visitedRoutes.add(new URL(page.url()).pathname);
}
async function layout(page: Page) {
  const width = page.viewportSize()!.width;
  await expect(page.locator('body')).not.toContainText(/\bVAT\b|\bSRS\b|phí ship/i);
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
async function login(page: Page, username: 'user' | 'staff' | 'admin') {
  await page.context().clearCookies();
  await visit(page, '/login');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await ready(page); await layout(page);
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(username === 'admin' ? 'Admin@12345' : username === 'staff' ? 'Staff@12345' : 'User@12345');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(username === 'user' ? /\/$/ : new RegExp(`/${username}$`));
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

test('TC09-F004, TC32-F013, TC42-F017, TC45/TC46-F018, TC37-F019, TC53-F020: luồng khách và nhân viên', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await visit(page, '/'); await ready(page);
  await expect(page.locator('main')).not.toContainText('₫');
  await expect(page.getByRole('link', { name: 'Đăng nhập để mua' }).first()).toBeVisible();
  await shot(page, 'TC09-F004-guest', info);
  await visit(page, '/products/PARA500'); await ready(page);
  await expect(page.locator('main')).not.toContainText('₫');
  await shot(page, 'TC09-F004-guest-detail', info);

  await login(page, 'user');
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
  await page.getByLabel('Họ và tên người nhận').fill('Khách kiểm thử giao diện');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  await shot(page, 'TC32-F013-checkout', info);
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  const opened = page.waitForResponse(r => /\/api\/orders\/[^/]+\/payment$/.test(r.url()) && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const order = await (await placed).json();
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
  await staff.getByRole('row').filter({ has: staff.getByRole('link', { name: order.orderId, exact: true }) }).getByRole('button', { name: 'Đối chiếu', exact: true }).click();
  await staff.getByLabel('Mã giao dịch ngân hàng').fill(`UI-${info.project.name}-${order.orderId}`);
  await staff.getByLabel('Số tiền thực nhận (VND)').fill(String(order.totalAmount - 1));
  await staff.getByRole('button', { name: 'Xác nhận đã nhận tiền', exact: true }).click();
  await expect(staff.getByText('Chuyển thiếu – chưa duyệt thanh toán', { exact: true })).toBeVisible();
  await shot(staff, 'TC46-F018-short-payment', info);
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Trạng thái thanh toán' })).toContainText('Ghi chú đối chiếu:');
  await shot(page, 'TC46-F017-user-review-note', info);
  const autoRefresh = page.waitForResponse(response => response.url().endsWith(`/api/orders/${order.orderId}/payment`) && response.request().method() === 'GET', { timeout: 25_000 });
  await staff.getByLabel('Số tiền thực nhận (VND)').fill(String(order.totalAmount));
  await staff.getByRole('button', { name: 'Xác nhận đã nhận tiền', exact: true }).click();
  await expect(staff.locator('main')).toContainText('Đã xác nhận tiền và lập hóa đơn HD');
  expect((await autoRefresh).ok()).toBeTruthy();
  await expect(page.getByRole('status', { name: 'Trạng thái thanh toán' })).toContainText('Đã xác nhận');
  await expect(page.getByTestId('toast')).toContainText('Đã xác nhận thanh toán.');
  await shot(page, 'TC45-F017-qr-confirmed', info);
  await shot(staff, 'TC45-F018-approved', info);
  await page.getByRole('link', { name: 'Đóng / Về đơn hàng', exact: true }).click(); await ready(page);
  await expect(page.getByRole('heading', { name: 'Đã thanh toán – Mời bạn đến quầy nhận thuốc' })).toBeVisible();
  await shot(page, 'TC45-F014-pickup-paid', info);
  await visit(staff, `/staff/orders/${order.orderId}`); await ready(staff);
  await expect(staff.getByRole('button', { name: 'Nhận xử lý', exact: true })).toHaveCount(0);
  const invoiceLink = staff.getByRole('link', { name: /^Hóa đơn HD/ });
  await expect(invoiceLink).toBeVisible();
  const invoiceId = (await invoiceLink.getAttribute('href'))!.split('/').at(-1)!;
  await shot(staff, 'TC37-F019-fulfill', info);
  await staff.getByRole('button', { name: 'Khách đã nhận thuốc', exact: true }).click();
  await expect(staff.getByText('Đơn đã kết thúc, không còn thao tác xử lý.')).toBeVisible();
  await shot(staff, 'TC37-F015-completed', info);
  await staffContext.close();

  await login(page, 'user'); await visit(page, `/invoices/${invoiceId}`); await ready(page);
  await expect(page.getByRole('heading', { name: `#${invoiceId}`, exact: true })).toBeVisible();
  await expect(page.getByText('Lô:', { exact: false }).first()).toBeVisible();
  await shot(page, 'TC53-F020-user-invoice', info);
  await visit(page, '/staff'); await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Tra cứu/ })).toBeVisible();
  await shot(page, 'TC17-F002-user-blocked-staff', info);
});

test('TC29-F012, TC24-F010: phản hồi giỏ và gửi ảnh đơn thuốc', async ({ page }, info) => {
  await login(page, 'user');
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
  await page.getByLabel('Ảnh đơn thuốc').setInputFiles({ name: 'prescription.png', mimeType: 'image/png', buffer: await readFile(resolve(process.cwd(), '../backend/Pharmacy.Core/Data/Assets/demo-qr.png')) });
  await page.getByRole('button', { name: 'Gửi đơn thuốc', exact: true }).click();
  await expect(page).toHaveURL(/\/prescriptions\/DT[^?]+\?sent=1$/);
  await expect(page.locator('main')).toContainText('Đã gửi, chờ dược sĩ kiểm tra');
  await shot(page, 'TC24-F010-sent-banner', info);
});

test('TC32/TC42/TC45/TC37: giao hàng và thử xuất kho lại sau xác nhận tiền', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await login(page, 'user');
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
  await staff.getByLabel('Mã giao dịch ngân hàng').fill(`DELIVERY-${info.project.name}-${order.orderId}`);
  await staff.getByLabel('Số tiền thực nhận (VND)').fill(String(order.totalAmount));
  await staff.route(`**/api/staff/orders/${order.orderId}/fulfill`, route => route.abort('failed'), { times: 1 });
  await staff.getByRole('button', { name: 'Xác nhận đã nhận tiền', exact: true }).click();
  await expect(staff.locator('main')).toContainText('Đã xác nhận tiền nhưng chưa xuất kho được: Không thể kết nối đến máy chủ.');
  const reviewed = await api(staff.request, `/staff/orders/${order.orderId}`);
  expect(reviewed.payment.status).toBe('Confirmed'); expect(reviewed.invoiceId).toBeFalsy();
  await expect(staff.getByRole('button', { name: 'Xác nhận đã nhận tiền', exact: true })).toHaveCount(0);
  await shot(staff, 'TC37-F019-fulfill-retry', info);
  await staff.getByRole('button', { name: 'Thử xuất kho lại', exact: true }).click();
  await expect(staff.getByRole('link', { name: /^Hóa đơn HD/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đã thanh toán – Nhà thuốc đang chuẩn bị', exact: true })).toBeVisible({ timeout: 25_000 });
  await shot(page, 'TC45-F014-delivery-paid', info);
  await staff.getByRole('button', { name: 'Bắt đầu giao', exact: true }).click();
  await expect(staff.getByRole('button', { name: 'Đã giao xong', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đã thanh toán – Nhà thuốc đang giao', exact: true })).toBeVisible({ timeout: 25_000 });
  await shot(page, 'TC37-F015-delivering', info);
  await staff.getByRole('button', { name: 'Đã giao xong', exact: true }).click();
  await expect(staff.locator('main')).toContainText('Đơn đã kết thúc');
  await shot(staff, 'TC37-F015-delivery-completed', info);
  await visit(page, `/orders/${order.orderId}`); await ready(page);
  await expect(page.locator('main')).toContainText('Đơn hàng đã hoàn tất.');
  await staffContext.close();
});

test('TC31-F012: hết hàng bị khóa và backend từ chối số lượng vượt tồn', async ({ page }, info) => {
  await login(page, 'user');
  const initialCart = await api(page.request, '/cart');
  for (const item of initialCart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await visit(page, '/?search=DEMO02'); await ready(page);
  await expect(page.getByText('Hết hàng', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạm hết hàng', exact: true })).toBeDisabled();
  await shot(page, 'TC31-F012-out-of-stock-home', info);
  await visit(page, '/products/DEMO02'); await ready(page);
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

test('TC32/TC33-F013: lỗi mở QR giữ đơn và đơn thuốc chờ duyệt chưa mở QR', async ({ page }, info) => {
  await login(page, 'user');
  const cart = await api(page.request, '/cart');
  for (const item of cart.items) await api(page.request, `/cart/items/${item.drugId}`, 'DELETE');
  await api(page.request, '/cart/items', 'POST', { drugId: 'PARA500', quantity: 1 });
  await visit(page, '/checkout'); await ready(page);
  await page.getByLabel('Họ và tên người nhận').fill('Khách kiểm tra lỗi');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  await page.route('**/api/orders/*/payment', route => route.abort('failed'), { times: 1 });
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const order = await (await placed).json();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}\\?created=1$`)); await ready(page);
  await expect(page.locator('main')).toContainText('Không mở được thanh toán: Không thể kết nối đến máy chủ.');
  await expect(page.getByRole('link', { name: 'Mở thanh toán QR', exact: true })).toBeVisible();
  await shot(page, 'TC32-F013-payment-open-error', info);
  await page.getByRole('link', { name: 'Mở thanh toán QR', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}/payment$`)); await ready(page);
  await api(page.request, `/orders/${order.orderId}/cancel`, 'POST');
  const pending = (await api(page.request, '/prescriptions/usable')).find((p: {status: string}) => p.status === 'PendingReview');
  expect(pending).toBeTruthy();
  await api(page.request, '/cart/items', 'POST', { drugId: 'PARA500', quantity: 1 });
  await visit(page, '/checkout'); await ready(page);
  await page.getByLabel('Họ và tên người nhận').fill('Khách chờ duyệt');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  await page.getByRole('radio', { name: /Theo đơn/ }).check();
  await page.locator('select').selectOption(pending.prescriptionId);
  const waiting = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đặt hàng & thanh toán', exact: true }).click();
  const waitingOrder = await (await waiting).json(); expect(waitingOrder.status).toBe('WaitingReview');
  await expect(page).toHaveURL(new RegExp(`/orders/${waitingOrder.orderId}\\?created=1$`)); await ready(page);
  await expect(page.locator('main')).toContainText('Đơn đang chờ dược sĩ kiểm tra đơn thuốc. Bạn sẽ thanh toán sau khi đơn thuốc được duyệt.');
  expect((await api(page.request, `/orders/${waitingOrder.orderId}`)).payment).toBeFalsy();
  await shot(page, 'TC33-F013-waiting-prescription', info);
});

test('TC38-F016/F019: bán OTC tại quầy bằng form', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await login(page, 'staff'); await visit(page, '/staff/sales/new');
  await page.getByLabel('Loại giao dịch').selectOption('OTC');
  await page.getByRole('button', { name: 'Tạo nháp' }).click();
  await expect(page).toHaveURL(/\/staff\/sales\/BH/); await ready(page);
  await expect(page.getByRole('button', { name: 'Đã nhận tiền mặt – Hoàn tất' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Thêm dòng' }).click();
  await page.getByLabel('Mã thuốc dòng 1').fill('PARA500');
  await page.getByLabel('Số lượng dòng 1').fill('1');
  await page.getByRole('button', { name: 'Lưu dòng thuốc & kiểm tra' }).click();
  await expect(page.getByText('Đã lưu nháp và kiểm tra điều kiện bán.')).toBeVisible();
  await shot(page, 'TC38-F016-counter-draft', info);
  await page.getByLabel(/Tôi xác nhận đã nhận đủ/).check();
  await page.getByRole('button', { name: 'Đã nhận tiền mặt – Hoàn tất' }).click();
  await expect(page.getByText('Đã hoàn tất.', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hủy nháp' })).toHaveCount(0);
  await shot(page, 'TC38-F019-counter-checkout', info);
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

  await login(page, 'user');
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
