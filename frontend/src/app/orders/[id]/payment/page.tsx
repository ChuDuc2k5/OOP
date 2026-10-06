'use client';

import React, { useEffect, useState, use } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, paymentApi, ordersApi } from '@/lib/api';
import { OrderView, PaymentView } from '@/lib/types';
import { formatDateTime, formatVND, PAYMENT_STATUS_LABELS, getStatusBadgeClass } from '@/lib/format';
import {
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  Building2,
  User,
  Hash,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function OrderPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);

  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy indicator states
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchPaymentData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both payment info and order info
      const [paymentData, orderData] = await Promise.all([
        paymentApi.openOrGetPayment(orderId),
        ordersApi.getOrderById(orderId).catch(() => null),
      ]);
      setPayment(paymentData);
      setOrder(orderData);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiException ? err.title : 'Không thể tải thông tin thanh toán cho đơn hàng';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (authorized && user) {
      fetchPaymentData();
    }
  }, [authorized, user, fetchPaymentData]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldName ? null : curr));
    }, 2000);
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
            <span>/</span>
            <Link href="/orders" className="hover:text-emerald-700">Đơn hàng</Link>
            <span>/</span>
            <Link href={`/orders/${orderId}`} className="hover:text-emerald-700">#{orderId}</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Thanh toán chuyển khoản</span>
          </div>
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại chi tiết đơn</span>
          </Link>
        </div>

        {loading ? <LoadingState /> : error || !payment ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Không thể mở cổng thanh toán</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {error || 'Đơn hàng chưa sẵn sàng để thanh toán hoặc không tồn tại thông tin tài khoản.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={fetchPaymentData}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
              >
                Thử lại
              </button>
              <Link
                href={`/orders/${orderId}`}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Về đơn hàng
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Title Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    Thanh toán chuyển khoản ngân hàng
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Đơn hàng: <strong className="font-mono text-slate-800">#{payment.orderId}</strong>{' '}
                  {order && `• Ngày đặt: ${formatDateTime(order.createdAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                    payment.status
                  )}`}
                >
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </span>
                <button
                  onClick={fetchPaymentData}
                  title="Cập nhật trạng thái"
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-50 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* If Already Paid / Confirmed */}
            {payment.status === 'Confirmed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-emerald-900">
                  Đơn hàng đã được thanh toán thành công!
                </h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Nhà thuốc đã xác nhận nhận đủ số tiền{' '}
                  <strong>{formatVND(payment.receivedAmount ?? payment.expectedAmount)}</strong>. Dược sĩ đang tiến hành chuẩn bị và xuất thuốc cho bạn.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`/orders/${orderId}`}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Xem tiến độ đơn hàng
                  </Link>
                  {order?.invoiceId && (
                    <Link
                      href={`/invoices/${order.invoiceId}`}
                      className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold hover:bg-emerald-50"
                    >
                      Xem hóa đơn điện tử
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* SRS 6.2 Warning Box - MANDATORY VERBATIM TEXT */}
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-amber-950 shadow-xs flex items-start space-x-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
                <strong className="font-bold block text-amber-900 uppercase tracking-wide text-xs">
                  Cảnh báo thanh toán quan trọng (SRS 6.2):
                </strong>
                <p className="font-medium text-amber-900">
                  Vui lòng kiểm tra kỹ số tiền và nội dung chuyển khoản trước khi thanh toán. Chuyển thiếu số tiền yêu cầu sẽ không được duyệt. Nếu chuyển thừa, cửa hàng không chịu trách nhiệm đối với phần tiền chuyển thừa. Sau khi chuyển khoản, vui lòng chờ Admin hoặc nhân viên kiểm tra và xác nhận.
                </p>
              </div>
            </div>

            {/* Main Payment Section: QR Code on Left/Top, Bank Details on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* QR Code Card */}
              <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>QR tài khoản nhận tiền</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
                  {payment.qrImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={payment.qrImageUrl}
                      alt={`VietQR ${payment.orderId}`}
                      className="w-56 h-56 object-contain rounded-xl mx-auto"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 p-4 space-y-2">
                      <QrCode className="w-16 h-16 text-slate-300" />
                      <span className="text-[11px] text-center">
                        Không tải được ảnh QR. Vui lòng thử lại.
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 mt-4 leading-normal">
                  QR là ảnh cố định. Quét mã QR để mở tài khoản nhận, sau đó tự nhập đúng số tiền và nội dung chuyển khoản bên dưới.
                </p>
              </div>

              {/* Bank Account Details Card */}
              <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Thông tin chuyển khoản thủ công</span>
                  </h3>

                  <div className="divide-y divide-slate-100 text-xs mt-2">
                    {/* Bank Name */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                      <strong className="text-slate-900 font-semibold sm:text-right">
                        {payment.bankName}
                      </strong>
                    </div>

                    {/* Account Name */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-500">Tên chủ tài khoản:</span>
                      <strong className="text-slate-900 font-bold uppercase sm:text-right">
                        {payment.accountName}
                      </strong>
                    </div>

                    {/* Account Number */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        <span>Số tài khoản:</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-base text-slate-900 tracking-wider">
                          {payment.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payment.accountNumber, 'accountNumber')}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === 'accountNumber' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/50 -mx-6 px-6">
                      <span className="text-slate-600 font-semibold flex items-center space-x-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Số tiền chính xác cần chuyển:</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-base sm:text-lg text-emerald-700">
                          {formatVND(payment.expectedAmount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payment.expectedAmount.toString(), 'amount')}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold transition"
                          title="Sao chép số tiền"
                        >
                          {copiedField === 'amount' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Transfer Content */}
                    <div className="py-3 flex flex-col gap-2 bg-blue-50/50 -mx-6 px-6">
                      <div>
                        <span className="text-blue-900 font-bold block">Nội dung chuyển khoản (bắt buộc):</span>
                        <span className="text-[11px] text-blue-700">
                          Nhập đúng nội dung bên dưới để nhân viên đối chiếu giao dịch
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-base text-blue-800 tracking-wider bg-white px-2 py-0.5 rounded border border-blue-200">
                          {payment.transferContent}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(payment.transferContent, 'content')
                          }
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedField === 'content' ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin hoặc nhân viên đối chiếu thủ công</span>
                  </div>
                  <Link
                    href={`/orders/${orderId}`}
                    className="text-emerald-700 hover:underline font-semibold"
                  >
                    Quay lại đơn hàng &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
