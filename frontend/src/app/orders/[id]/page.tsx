'use client';
import { ActionButton } from '@/components/ActionButton';

import React, { useEffect, useState, use, useRef } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { OrderProgress } from '@/components/orders/OrderProgress';
import { ActionLink } from '@/components/ActionLink';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, ordersApi } from '@/lib/api';
import { OrderView } from '@/lib/types';
import {
  formatDateTime,
  formatVND,
  getStatusBadgeClass,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIVE_METHOD_LABELS,
  SALE_KIND_LABELS,
} from '@/lib/format';
import {
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  Truck,
  Store,
  FileText,
  User as UserIcon,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Receipt,
  AlertTriangle,
} from 'lucide-react';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const router = useRouter();

  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshing = useRef(false);

  // Cancel order modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchOrderDetail = React.useCallback(async (background = false) => {
    if (refreshing.current) return;
    refreshing.current = true;
    if (!background) setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.getOrderById(orderId);
      setOrder(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không tìm thấy thông tin đơn hàng';
      if (!background) setError(msg);
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    if (authorized && user) {
      fetchOrderDetail();
    }
  }, [authorized, user, fetchOrderDetail]);
  useEffect(() => {
    if (!authorized || !order || ['Completed', 'Cancelled', 'Rejected'].includes(order.status)) return;
    const timer = setInterval(() => void fetchOrderDetail(true), 15_000);
    return () => clearInterval(timer);
  }, [authorized, order, fetchOrderDetail]);

  const handleCancelOrder = async () => {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await ordersApi.cancelOrder(orderId);
      setOrder(updated);
      setShowCancelModal(false);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không thể hủy đơn hàng';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
            <span>/</span>
            <Link href="/orders" className="hover:text-emerald-700">Đơn hàng</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Chi tiết #{orderId}</span>
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách đơn</span>
          </Link>
        </div>

        {loading ? <LoadingState /> : error || !order ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Không tìm thấy đơn hàng</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {error || 'Đơn hàng này không tồn tại hoặc không thuộc tài khoản của bạn.'}
            </p>
            <Link
              href="/orders"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
            >
              Về danh sách đơn hàng
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <OrderProgress order={order} />
            {/* Top Status Banner Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
                    #{order.orderId}
                  </h1>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                      order.status
                    )}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  {order.payment && (
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      Thanh toán: {PAYMENT_STATUS_LABELS[order.payment.status]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Thời gian đặt: {formatDateTime(order.createdAt)} • Kênh: Trực tuyến • Loại đơn:{' '}
                  <strong className="text-slate-700">{SALE_KIND_LABELS[order.saleKind]}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {order.invoiceId && (
                  <Link
                    href={`/invoices/${order.invoiceId}`}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Xem hóa đơn ({order.invoiceId})</span>
                  </Link>
                )}

                {(order.canPay || order.payment?.status === 'PendingReview') && (
                  <ActionLink
                    href={`/orders/${order.orderId}/payment`}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{order.payment?.status === 'PendingReview' ? 'Xem lại mã QR' : 'Mở thanh toán QR'}</span>
                  </ActionLink>
                )}

                {order.canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 border border-rose-300 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Hủy đơn hàng</span>
                  </button>
                )}
              </div>
            </div>

            {/* Note banner if status WaitingReview or has note */}




            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Receiver Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>Thông tin nhận thuốc</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Người nhận:</span>
                    <strong className="text-slate-800">{order.receiverName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <strong className="text-slate-800">{order.phone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hình thức nhận:</span>
                    <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                      {order.receiveMethod === 'Delivery' ? (
                        <>
                          <Truck className="w-3.5 h-3.5" />
                          <span>Giao tận nơi</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5" />
                          <span>Nhận tại quầy</span>
                        </>
                      )}
                    </span>
                  </div>
                  {order.address && (
                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-slate-500 block mb-0.5">Địa chỉ giao hàng:</span>
                      <p className="text-slate-800 leading-relaxed font-medium">{order.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription / Operational details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Đơn thuốc &amp; Xử lý</span>
                </h3>
                <div className="space-y-2 text-xs">
                  {order.prescriptionId ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mã đơn thuốc đính kèm:</span>
                        <Link
                          href={`/prescriptions/${order.prescriptionId}`}
                          className="font-mono font-bold text-purple-700 hover:underline"
                        >
                          {order.prescriptionId}
                        </Link>
                      </div>
                      {order.patientId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mã định danh bệnh nhân:</span>
                          <span className="font-mono text-slate-800">{order.patientId}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-500">
                      Đơn hàng bán không theo đơn (OTC), không yêu cầu đơn thuốc.
                    </div>
                  )}

                  {order.handledByUsername && (
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Dược sĩ tiếp nhận xử lý:</span>
                      <span className="font-semibold text-slate-800">{order.handledByUsername}</span>
                    </div>
                  )}

                  {order.payment && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trạng thái thanh toán:</span>
                        <strong className="text-slate-800">
                          {PAYMENT_STATUS_LABELS[order.payment.status]}
                        </strong>
                      </div>
                      {order.payment.receivedAmount !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Số tiền đã đối chiếu:</span>
                          <strong className="text-emerald-700">
                            {formatVND(order.payment.receivedAmount)}
                          </strong>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Chi tiết sản phẩm đặt mua ({order.items.length} mặt hàng)
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-4">Tên thuốc</th>
                      <th className="p-4">Mã thuốc</th>
                      <th className="p-4">Đơn vị</th>
                      <th className="p-4 text-center">Số lượng</th>
                      <th className="p-4 text-right">Đơn giá đã chốt</th>
                      <th className="p-4 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {order.items.map((item) => (
                      <tr key={item.drugId}>
                        <td className="p-4 font-bold text-slate-900">
                          <Link href={`/products/${item.drugId}`} className="hover:text-emerald-700">
                            {item.drugName}
                          </Link>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{item.drugId}</td>
                        <td className="p-4">{item.unit}</td>
                        <td className="p-4 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="p-4 text-right">{formatVND(item.unitPrice)}</td>
                        <td className="p-4 text-right font-bold text-slate-900">
                          {formatVND(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/50 border-t border-slate-200 text-xs font-semibold">
                      <td colSpan={5} className="p-4 text-right text-slate-600">
                        Tổng cộng tiền sản phẩm:
                      </td>
                      <td className="p-4 text-right font-extrabold text-emerald-700 text-base">
                        {formatVND(order.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận hủy đơn hàng */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-rose-200 space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xác nhận hủy đơn hàng?</h3>
                <p className="text-xs text-slate-600">
                  Bạn có chắc chắn muốn hủy đơn hàng <strong>#{orderId}</strong> không? Thao tác này không thể hoàn tác.
                </p>
              </div>

              {cancelError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {cancelError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <ActionButton busy={cancelling}
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Không, giữ lại
                </ActionButton>
                <ActionButton busy={cancelling}
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {cancelling ? 'Đang hủy...' : 'Đồng ý hủy đơn'}
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
