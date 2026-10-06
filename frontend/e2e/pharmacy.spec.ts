import { test, expect, type Page, type TestInfo, type APIRequestContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

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
}
async function layout(page: Page) {
  const width = page.viewportSize()!.width;
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
  const folder = resolve(process.cwd(), '../docs/screenshots');
  await mkdir(folder, { recursive: true });
  const path = resolve(folder, `${code}-${info.project.name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(code, { path, contentType: 'image/png' });
}
async function login(page: Page, username: 'user' | 'staff' | 'admin') {
  await page.context().clearCookies();
  await visit(page, '/login');
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

test('TC09-F004, TC32-F013, TC35-F017, TC38-F018, TC40-F019, TC44-F020: luồng khách và nhân viên', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept());
  await visit(page, '/'); await ready(page);
  await expect(page.locator('main')).not.toContainText('₫');
  await expect(page.getByText('PARA500', { exact: false }).first()).toBeVisible();
  await shot(page, 'TC09-F004-guest', info);
  await visit(page, '/products/PARA500'); await ready(page);
  await expect(page.locator('main')).not.toContainText('₫');
  await shot(page, 'TC09-F004-guest-detail', info);

  await login(page, 'user');
  await visit(page, '/products/PARA500'); await ready(page);
  const added = page.waitForResponse(r => r.url().endsWith('/api/cart/items') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  expect((await added).ok()).toBeTruthy();
  await visit(page, '/checkout'); await ready(page);
  await page.getByLabel('Họ và tên người nhận').fill('Khách kiểm thử giao diện');
  await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
  await page.getByRole('radio', { name: /Nhận tại quầy nhà thuốc/ }).check();
  await shot(page, 'TC32-F013-checkout', info);
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Xác nhận đặt hàng', exact: true }).click();
  const order = await (await placed).json();
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}$`));
  await expect(page.getByRole('link', { name: 'Mở thanh toán QR' })).toBeVisible();
  expect(order.payment).toBeFalsy();
  await shot(page, 'TC32-F014-order-before-qr', info);
  const opened = page.waitForResponse(r => r.url().endsWith(`/api/orders/${order.orderId}/payment`) && r.request().method() === 'POST');
  await page.getByRole('link', { name: 'Mở thanh toán QR' }).click();
  const payment = await (await opened).json();
  expect(payment.expectedAmount).toBe(order.totalAmount);
  await expect(page.getByText('QR là ảnh cố định.', { exact: false })).toBeVisible();
  await expect(page.locator(`img[src="${payment.qrImageUrl}"]`)).toBeVisible();
  await expect(page.getByRole('button', { name: /đã chuyển khoản/i })).toHaveCount(0);
  await shot(page, 'TC35-F017-qr', info);

  await login(page, 'staff');
  await visit(page, '/staff/payments'); await ready(page);
  await page.getByRole('row').filter({ has: page.getByRole('link', { name: order.orderId, exact: true }) }).getByRole('button', { name: 'Đối chiếu', exact: true }).click();
  await page.getByLabel('Mã giao dịch ngân hàng').fill(`UI-${info.project.name}-${order.orderId}`);
  await page.getByLabel('Số tiền thực nhận (VND)').fill(String(order.totalAmount - 1));
  await page.getByRole('button', { name: 'Đối chiếu & duyệt thanh toán' }).click();
  await expect(page.getByText('Chuyển thiếu – chưa duyệt thanh toán', { exact: true })).toBeVisible();
  await shot(page, 'TC38-F018-short-payment', info);
  await page.getByLabel('Số tiền thực nhận (VND)').fill(String(order.totalAmount));
  await page.getByRole('button', { name: 'Đối chiếu & duyệt thanh toán' }).click();
  await expect(page.getByText('Đã xác nhận đủ tiền', { exact: true })).toBeVisible();
  await shot(page, 'TC38-F018-approved', info);
  await visit(page, `/staff/orders/${order.orderId}`); await ready(page);
  await page.getByRole('button', { name: 'Nhận xử lý', exact: true }).click();
  await expect(page.getByText('Đã cập nhật đơn hàng.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xuất kho & lập hóa đơn', exact: true }).click();
  const invoiceLink = page.getByRole('link', { name: /^Hóa đơn HD/ });
  await expect(invoiceLink).toBeVisible();
  const invoiceId = (await invoiceLink.getAttribute('href'))!.split('/').at(-1)!;
  await shot(page, 'TC40-F019-fulfill', info);
  await page.getByRole('button', { name: 'Hoàn tất đơn hàng' }).click();
  await expect(page.getByText('Đơn đã kết thúc, không còn thao tác xử lý.')).toBeVisible();
  await shot(page, 'TC37-F015-completed', info);

  await login(page, 'user'); await visit(page, `/invoices/${invoiceId}`); await ready(page);
  await expect(page.getByRole('heading', { name: `#${invoiceId}`, exact: true })).toBeVisible();
  await expect(page.getByText('Lô:', { exact: false }).first()).toBeVisible();
  await shot(page, 'TC44-F020-user-invoice', info);
  await visit(page, '/staff'); await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Tra cứu/ })).toBeVisible();
  await shot(page, 'TC08-F002-user-blocked-staff', info);
});

test('TC39-F016, TC41-F019: bán OTC tại quầy bằng form', async ({ page }, info) => {
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
  await shot(page, 'TC39-F016-counter-draft', info);
  await page.getByLabel(/Tôi xác nhận đã nhận đủ/).check();
  await page.getByRole('button', { name: 'Đã nhận tiền mặt – Hoàn tất' }).click();
  await expect(page.getByText('Đã hoàn tất.', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hủy nháp' })).toHaveCount(0);
  await shot(page, 'TC41-F019-counter-checkout', info);
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
  await shot(page, 'TC02-F003-field-error', info);
  await visit(page, '/admin/settings/payment'); await ready(page);
  await page.getByLabel('Tên ngân hàng').fill('Ngân hàng kiểm thử');
  await page.getByLabel('Số tài khoản').fill('0000000000');
  await page.getByLabel('Tên chủ tài khoản').fill('NHA THUOC KIEM THU');
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
  await expect(page.getByText('Đã lưu tài khoản nhận tiền.')).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUAAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Ảnh PNG/JPG/JPEG tối đa 5 MB').setInputFiles({ name: 'fixed-qr.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('Xem trước Ảnh QR cố định')).toBeVisible();
  await page.getByRole('button', { name: 'Tải ảnh lên', exact: true }).click();
  await expect(page.getByText('Đã tải ảnh lên.')).toBeVisible();
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
    await shot(page, 'TC08-F002-sidebar-open', info);
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
});
async function shotLoading(page: Page, info: TestInfo) {
  const folder = resolve(process.cwd(), '../docs/screenshots'); await mkdir(folder, { recursive: true });
  await page.screenshot({ path: resolve(folder, `F004-loading-${info.project.name}.png`), animations: 'disabled' });
}
