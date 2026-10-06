'use client';
import Link from 'next/link';
import type { OrderView, OrderStatus } from '@/lib/types';
import { QueryBanner } from '../QueryBanner';
import { CheckCircle2 } from 'lucide-react';

export function OrderProgress({ order }: { order: OrderView }) {
  const terminal = order.status === 'Cancelled' || order.status === 'Rejected';
  const stages: { status: OrderStatus; label: string }[] = [
    ...(order.saleKind === 'Prescription' ? [{ status: 'WaitingReview' as const, label: 'Chờ kiểm tra đơn thuốc' }] : []),
    { status: 'AwaitingPayment', label: 'Chờ thanh toán' },
    { status: 'Preparing', label: 'Đang chuẩn bị' },
    ...(order.receiveMethod === 'Delivery' ? [{ status: 'Delivering' as const, label: 'Đang giao' }] : []),
    { status: 'Completed', label: 'Hoàn tất' },
  ];
  const index = stages.findIndex(step => step.status === order.status);
  let next = 'Đơn đã được tạo. Bấm “Mở thanh toán QR” để chuyển khoản.';
  if (terminal) next = order.status === 'Cancelled' ? 'Đơn hàng đã hủy. Đơn này không còn được xử lý.' : 'Nhà thuốc đã từ chối đơn hàng.';
  else if (order.status === 'WaitingReview') next = 'Đang chờ dược sĩ kiểm tra đơn thuốc.';
  else if (order.status === 'Completed') next = 'Đơn hàng đã hoàn tất. Bạn có thể xem hóa đơn bên dưới.';
  else if (order.status === 'Delivering') next = 'Đơn hàng đang được giao đến bạn. Vui lòng giữ liên lạc để nhận hàng.';
  else if (order.payment?.status === 'Confirmed' || order.status === 'Preparing') next = order.receiveMethod === 'Pickup'
    ? 'Đã xác nhận thanh toán. Nhà thuốc đang chuẩn bị hàng để bạn nhận tại quầy.'
    : 'Đã xác nhận thanh toán. Nhà thuốc đang chuẩn bị hàng.';
  else if (order.payment?.status === 'PendingReview') next = 'Nhà thuốc đang chờ đối chiếu tiền chuyển khoản. Bạn không cần thao tác thêm.';
  else if (order.payment?.status === 'Closed') next = 'Yêu cầu thanh toán đã đóng. Vui lòng liên hệ nhà thuốc để được hỗ trợ.';
  return <div className="space-y-4">
    <QueryBanner param="created">Đặt hàng thành công – Mã đơn {order.orderId}</QueryBanner>
    {!terminal && <ol aria-label="Tiến trình đơn hàng" className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex sm:flex-wrap">
      {stages.map((step, i) => <li key={step.status} aria-current={i === index ? 'step' : undefined} className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${i === index ? 'bg-emerald-100 font-bold text-emerald-950' : i < index ? 'text-emerald-700' : 'text-slate-500'}`}>
        {i < index ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">{i + 1}</span>}{step.label}{i === index && <span className="sr-only"> (hiện tại)</span>}
      </li>)}
    </ol>}
    <section aria-labelledby="order-next-step" className={`space-y-2 rounded-xl border p-4 ${terminal ? 'border-rose-300 bg-rose-50 text-rose-950' : 'border-blue-200 bg-blue-50 text-blue-950'}`}>
      <h2 id="order-next-step" className="font-bold">{terminal ? (order.status === 'Cancelled' ? 'Đơn đã hủy' : 'Đơn bị từ chối') : 'Bước tiếp theo'}</h2>
      <p className="text-sm">{next}</p>
      {terminal && <p className="text-sm font-semibold">Lý do: {order.note || 'Vui lòng liên hệ nhà thuốc để biết thêm chi tiết.'}</p>}
      {!terminal && order.payment?.reviewNote && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950">Ghi chú đối chiếu: {order.payment.reviewNote}</p>}
      {order.invoiceId && <Link className="inline-block text-sm font-bold underline" href={`/invoices/${order.invoiceId}`}>Xem hóa đơn</Link>}
    </section>
  </div>;
}
