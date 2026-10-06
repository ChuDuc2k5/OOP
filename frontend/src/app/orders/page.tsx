'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { ActionButton } from '@/components/ActionButton';
import { useVisiblePolling } from '@/hooks/useVisiblePolling';
import { LoadingState } from '@/components/Status';
import { ActionLink } from '@/components/ActionLink';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, ordersApi } from '@/lib/api';
import { OrderRow, OrderStatus, Paged } from '@/lib/types';
import {
  formatDate,
  formatVND,
  getStatusBadgeClass,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIVE_METHOD_LABELS,
  SALE_KIND_LABELS,
} from '@/lib/format';
import {
  ShoppingBag,
  Clock,
  CreditCard,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Filter,
} from 'lucide-react';

const STATUS_FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Chờ kiểm tra', value: 'WaitingReview' },
  { label: 'Chờ thanh toán', value: 'AwaitingPayment' },
  { label: 'Đang chuẩn bị', value: 'Preparing' },
  { label: 'Đang giao', value: 'Delivering' },
  { label: 'Hoàn tất', value: 'Completed' },
  { label: 'Đã hủy', value: 'Cancelled' },
];

function OrdersContent() {
  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ordersData, setOrdersData] = useState<Paged<OrderRow>>({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const [updating, setUpdating] = useState(false);
  const refreshing = useRef(false);
  const generation = useRef(0);

  const statusParam = (searchParams.get('status') as OrderStatus) || 'ALL';
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'ALL'>(statusParam);
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async (background = false) => {
    if (refreshing.current) return;
    const version = generation.current;
    refreshing.current = true;
    setUpdating(true);
    if (!background) setLoading(true);
    setError(null);
    setRefreshError('');
    try {
      const data = await ordersApi.getMyOrders({
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        page,
        pageSize: 10,
      });
      if (version === generation.current) setOrdersData(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không thể tải danh sách đơn hàng';
      if (version === generation.current) {
        if (background) setRefreshError(msg);
        else setError(msg);
      }
    } finally {
      if (version === generation.current) { setLoading(false); setUpdating(false); refreshing.current = false; }
    }
  }, [activeStatus, page]);

  useEffect(() => {
    const version = ++generation.current;
    refreshing.current = false;
    if (authorized && user) {
      void fetchOrders();
    }
    return () => { generation.current = version + 1; };
  }, [authorized, user, fetchOrders]);
  const autoUpdating = useVisiblePolling(() => fetchOrders(true), authorized && ordersData.items.some(o => !['Completed', 'Cancelled', 'Rejected'].includes(o.status)), 15_000);

  const handleFilterChange = (status: OrderStatus | 'ALL') => {
    setActiveStatus(status);
    setPage(1);
    if (status === 'ALL') {
      router.push('/orders');
    } else {
      router.push(`/orders?status=${status}`);
    }
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  const totalPages = Math.ceil(ordersData.total / ordersData.pageSize) || 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Đơn hàng của tôi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <ShoppingBag className="w-6 h-6 text-emerald-600" />
              <span>Lịch sử đơn mua của tôi</span>
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>

        {/* Filter Tabs by OrderStatus */}
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-500">
          <span>{autoUpdating ? 'Tự cập nhật mỗi 15 giây' : 'Tự cập nhật đang tạm dừng'}</span>
          <ActionButton type="button" busy={updating} disabled={updating || loading} onClick={() => void fetchOrders(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-emerald-700"><RefreshCw className="h-3.5 w-3.5" />Làm mới</ActionButton>
        </div>
        {refreshError && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950">{refreshError}</p>}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs pb-1 sm:pb-0">
            <span className="text-slate-400 text-xs flex items-center mr-1">
              <Filter className="w-3.5 h-3.5 mr-1" /> Trạng thái:
            </span>
            {STATUS_FILTERS.map((f) => {
              const isSelected = activeStatus === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => handleFilterChange(f.value)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List Area */}
        {loading ? <LoadingState /> : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => void fetchOrders()}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : ordersData.items.length === 0 ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Chưa có đơn hàng nào</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {activeStatus === 'ALL'
                ? 'Bạn chưa đặt đơn hàng nào trên hệ thống nhà thuốc.'
                : `Không có đơn hàng nào ở trạng thái "${ORDER_STATUS_LABELS[activeStatus]}".`}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <span>Xem danh mục thuốc</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table / Mobile Card List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-4">Mã đơn hàng</th>
                      <th className="p-4">Ngày đặt</th>
                      <th className="p-4">Phân loại</th>
                      <th className="p-4">Hình thức</th>
                      <th className="p-4">Tổng tiền</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ordersData.items.map((order) => (
                      <tr key={order.orderId} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-slate-900">
                          <Link
                            href={`/orders/${order.orderId}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {order.orderId}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-slate-800">
                            {SALE_KIND_LABELS[order.saleKind]}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {RECEIVE_METHOD_LABELS[order.receiveMethod]}
                        </td>
                        <td className="p-4 font-bold text-slate-900 text-sm">
                          {formatVND(order.totalAmount)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <span className={`mt-2 block w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${order.paymentStatus ? getStatusBadgeClass(order.paymentStatus) : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                            Thanh toán: {order.paymentStatus ? PAYMENT_STATUS_LABELS[order.paymentStatus] : 'Chưa mở thanh toán'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {order.status === 'AwaitingPayment' && !['Confirmed', 'Closed'].includes(order.paymentStatus || '') && (
                            <ActionLink
                              href={`/orders/${order.orderId}/payment`}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Thanh toán</span>
                            </ActionLink>
                          )}
                          <Link
                            href={`/orders/${order.orderId}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-2 text-xs">
                <span className="text-slate-500">
                  Trang <strong>{page}</strong> / {totalPages} (Tổng số {ordersData.total} đơn)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                  >
                    Trang trước
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center space-x-2 text-emerald-700 font-medium">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Đang tải danh sách đơn hàng...</span>
          </div>
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
