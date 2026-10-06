export type ToastKind = 'success' | 'error' | 'info';
import type { CartView, PaymentReviewResult } from './types';
export type ToastMessage = { kind: ToastKind; message: string; href?: string; label?: string };
export const TOAST_EVENT = 'pharmacy:toast';
export const MUTATION_EVENT = 'pharmacy:mutation';
export type MutationEvent = { endpoint: string; result: unknown };

export function notify(message: ToastMessage) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

const reported = new WeakSet<object>();
export function notifyError(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  const title = typeof error === 'object' && error !== null && 'title' in error && typeof error.title === 'string'
    ? error.title : 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
  notify({ kind: 'error', message: title });
}

export function mutationFeedback(endpoint: string, options: RequestInit, result: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MutationEvent>(MUTATION_EVENT, { detail: { endpoint, result } }));
  const method = (options.method || 'GET').toUpperCase();
  const data = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  let message = 'Đã lưu thay đổi.';
  let kind: ToastKind = 'success';
  if (endpoint === '/api/cart/items' && method === 'POST') {
    const input = JSON.parse(String(options.body)) as { drugId: string; quantity: number };
    const items = (result as CartView).items;
    const item = items?.find(item => item.drugId === input.drugId);
    notify({ kind, message: `Đã thêm ${input.quantity} ${item?.saleUnit || ''} ${item?.name || input.drugId} vào giỏ`, href: '/cart', label: 'Xem giỏ hàng' });
    return;
  }
  if (endpoint.startsWith('/api/cart/items/')) message = method === 'DELETE' ? 'Đã xóa thuốc khỏi giỏ hàng.' : 'Đã cập nhật số lượng trong giỏ hàng.';
  else if (endpoint === '/api/auth/login') message = 'Đăng nhập thành công.';
  else if (endpoint === '/api/auth/logout') message = 'Đã đăng xuất.';
  else if (endpoint === '/api/auth/register') message = 'Đăng ký thành công';
  else if (endpoint === '/api/orders') message = `Đặt hàng thành công – Mã đơn ${data.orderId}.`;
  else if (/\/orders\/[^/]+\/payment$/.test(endpoint)) { message = 'Đã mở thanh toán QR. Chuyển khoản đúng số tiền và nội dung, sau đó chờ nhà thuốc đối chiếu.'; kind = 'info'; }
  else if (/\/payments\/[^/]+\/review$/.test(endpoint)) {
    kind = data.approved === false ? 'info' : 'success';
    const payment = (result as PaymentReviewResult).payment;
    message = data.approved === false ? `Chuyển thiếu – chưa duyệt thanh toán. ${payment?.reviewNote || ''}` : 'Đã xác nhận đủ tiền.';
  }
  else if (endpoint.endsWith('/fulfill')) message = `Đã xuất kho và lập hóa đơn ${data.invoiceId || ''}.`;
  else if (endpoint.endsWith('/claim')) message = 'Đã nhận xử lý đơn hàng.';
  else if (endpoint.endsWith('/ship')) message = 'Đã chuyển đơn sang trạng thái đang giao.';
  else if (endpoint.endsWith('/complete')) message = 'Đã hoàn tất đơn hàng.';
  else if (endpoint.endsWith('/checkout')) message = 'Đã hoàn tất bán tại quầy và lập hóa đơn.';
  else if (endpoint.endsWith('/reject')) message = 'Đã từ chối và lưu lý do.';
  else if (endpoint.endsWith('/cancel')) message = 'Đã hủy và cập nhật trạng thái.';
  else if (endpoint.endsWith('/approve')) message = 'Đã chấp nhận đơn thuốc.';
  else if (endpoint.endsWith('/note')) { message = 'Đã lưu ghi chú chưa duyệt.'; kind = 'info'; }
  else if (endpoint.endsWith('/details')) message = 'Đã lưu chi tiết đơn thuốc.';
  else if (endpoint.endsWith('/qr-image')) message = 'Đã tải ảnh QR lên.';
  else if (endpoint.endsWith('/image')) message = 'Đã tải ảnh thuốc lên.';
  else if (endpoint.endsWith('/batches')) message = 'Đã nhập lô vào kho.';
  else if (endpoint.endsWith('/sale-status')) message = 'Đã cập nhật trạng thái bán thuốc.';
  else if (endpoint === '/api/admin/payment-settings') message = 'Đã lưu cấu hình tài khoản nhận tiền.';
  else if (endpoint === '/api/admin/accounts/staff') message = 'Đã tạo tài khoản nhân viên.';
  else if (endpoint.startsWith('/api/admin/drugs')) message = method === 'POST' ? 'Đã thêm thuốc.' : 'Đã lưu thuốc.';
  else if (endpoint === '/api/prescriptions') { message = 'Đã gửi, chờ dược sĩ kiểm tra.'; kind = 'info'; }
  else if (endpoint === '/api/prescriptions/counter') message = 'Đã tiếp nhận đơn thuốc tại quầy.';
  else if (endpoint === '/api/staff/sales') message = 'Đã tạo nháp bán tại quầy.';
  else if (endpoint.startsWith('/api/staff/sales/')) message = 'Đã lưu dòng thuốc và kiểm tra điều kiện bán.';
  notify({ kind, message });
}
