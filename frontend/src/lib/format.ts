import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrescriptionStatus,
  ReceiveMethod,
  Role,
  SaleChannel,
  SaleKind,
  SaleStatus,
} from './types';

/**
 * Định dạng tiền tệ VND: 120.000 ₫
 */
export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  // Dùng toLocaleString vi-VN và nối ký hiệu ₫
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

/**
 * Định dạng ngày theo chuẩn dd/MM/yyyy
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** ??nh d?ng ng?y gi? dd/MM/yyyy HH:mm theo gi? Vi?t Nam. */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const time = date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return formatDate(dateString) + ' ' + time;
}

/**
 * Nhãn tiếng Việt cho OrderStatus (theo API_CONTRACT §2)
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  WaitingReview: 'Chờ kiểm tra',
  AwaitingPayment: 'Chờ thanh toán',
  Preparing: 'Đang chuẩn bị',
  Delivering: 'Đang giao',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
  Rejected: 'Từ chối',
};

/**
 * Nhãn tiếng Việt cho PaymentStatus (theo API_CONTRACT §2)
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PendingReview: 'Chờ duyệt',
  Confirmed: 'Đã xác nhận',
  Closed: 'Đã đóng',
};

/**
 * Nhãn tiếng Việt cho PrescriptionStatus (theo API_CONTRACT §2)
 */
export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  PendingReview: 'Chờ kiểm tra',
  Approved: 'Đã chấp nhận',
  Rejected: 'Từ chối',
  Cancelled: 'Đã hủy hiệu lực',
};

/**
 * Nhãn tiếng Việt cho SaleKind
 */
export const SALE_KIND_LABELS: Record<SaleKind, string> = {
  OTC: 'Không theo đơn (OTC)',
  Prescription: 'Theo đơn thuốc',
};

/**
 * Nhãn tiếng Việt cho SaleChannel
 */
export const SALE_CHANNEL_LABELS: Record<SaleChannel, string> = {
  Counter: 'Tại quầy',
  Online: 'Trực tuyến',
};

/**
 * Nhãn tiếng Việt cho SaleStatus
 */
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  Draft: 'Nháp',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
};

/**
 * Nhãn tiếng Việt cho ReceiveMethod
 */
export const RECEIVE_METHOD_LABELS: Record<ReceiveMethod, string> = {
  Pickup: 'Nhận tại quầy',
  Delivery: 'Giao tận nơi',
};

/**
 * Nhãn tiếng Việt cho PaymentMethod
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: 'Tiền mặt',
  ManualQR: 'Chuyển khoản QR',
};

/**
 * Nhãn tiếng Việt cho Role
 */
export const ROLE_LABELS: Record<Role, string> = {
  User: 'Khách hàng',
  Staff: 'Nhân viên',
  Admin: 'Quản trị viên',
};

/**
 * Màu sắc badge Tailwind cho trạng thái
 */
export function getStatusBadgeClass(
  status: OrderStatus | PaymentStatus | PrescriptionStatus | SaleStatus
): string {
  switch (status) {
    case 'Completed':
    case 'Confirmed':
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'WaitingReview':
    case 'PendingReview':
    case 'Preparing':
    case 'Draft':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'AwaitingPayment':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Delivering':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Cancelled':
    case 'Rejected':
    case 'Closed':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
