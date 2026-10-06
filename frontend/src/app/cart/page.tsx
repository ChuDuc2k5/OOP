'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ActionButton } from '@/components/ActionButton';
import { notifyError } from '@/lib/feedback';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, cartApi } from '@/lib/api';
import { CartView } from '@/lib/types';
import { formatVND } from '@/lib/format';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  FileText,
  ShieldAlert,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

export default function CartPage() {
  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const router = useRouter();

  const [cart, setCart] = useState<CartView>({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingDrugId, setUpdatingDrugId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không thể tải giỏ hàng';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized && user) {
      fetchCart();
    }
  }, [authorized, user, fetchCart]);

  const handleUpdateQuantity = async (drugId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      await handleRemoveItem(drugId);
      return;
    }
    setUpdatingDrugId(drugId);
    try {
      const updated = await cartApi.updateItem(drugId, { quantity: newQty });
      setCart(updated);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không thể cập nhật số lượng';
      notifyError(err);
    } finally {
      setUpdatingDrugId(null);
    }
  };

  const handleRemoveItem = async (drugId: string) => {
    setUpdatingDrugId(drugId);
    try {
      const updated = await cartApi.removeItem(drugId);
      setCart(updated);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không thể xóa sản phẩm';
      notifyError(err);
    } finally {
      setUpdatingDrugId(null);
    }
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  const hasIssues = cart.items.some((i) => !!i.issue);
  const hasPrescriptionItems = cart.items.some(
    (i) => i.requiresPrescription || i.isControlled
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Giỏ hàng của tôi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
              <span>Giỏ hàng ({cart.items.length} mặt hàng)</span>
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp tục tìm &amp; chọn thuốc</span>
          </Link>
        </div>

        {loading ? <LoadingState /> : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold text-base">{error}</p>
            <button
              onClick={fetchCart}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Tải lại giỏ hàng
            </button>
          </div>
        ) : cart.items.length === 0 ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Giỏ hàng của bạn đang trống</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Hãy khám phá các loại dược phẩm chất lượng tại danh mục sản phẩm và thêm vào giỏ hàng.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <span>Xem danh mục thuốc</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Prescription Warning Notice */}
              {hasPrescriptionItems && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-purple-900">
                  <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">
                      Giỏ hàng có thuốc kê đơn hoặc kiểm soát đặc biệt (Rx):
                    </strong>
                    Khi đặt hàng, hệ thống sẽ yêu cầu bạn chọn đơn thuốc đã duyệt hoặc đơn thuốc đang chờ duyệt của mình để nhân viên dược sĩ kiểm tra trước khi xác nhận.
                  </div>
                </div>
              )}

              {/* Items Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {cart.items.map((item) => {
                  const isUpdating = updatingDrugId === item.drugId;
                  return (
                    <div
                      key={item.drugId}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                        item.issue ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Item Info */}
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <FileText className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <Link
                            href={`/products/${item.drugId}`}
                            className="text-sm font-bold text-slate-900 hover:text-emerald-700 line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span>Mã: <code className="font-mono text-slate-700">{item.drugId}</code></span>
                            <span>•</span>
                            <span>Đơn vị: {item.saleUnit}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-700">{formatVND(item.unitPrice)}</span>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.requiresPrescription && (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                Thuốc kê đơn
                              </span>
                            )}
                            {item.isControlled && (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                                Kiểm soát đặc biệt
                              </span>
                            )}
                            {item.issue === 'NOT_FOR_SALE' && (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                Sản phẩm đã ngừng bán
                              </span>
                            )}
                            {item.issue === 'INSUFFICIENT_STOCK' && (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                Vượt quá tồn kho khả dụng ({item.availableQuantity})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Line Total */}
                      <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                          <ActionButton busy={isUpdating} compact
                            onClick={() => handleUpdateQuantity(item.drugId, item.quantity, -1)}
                            disabled={isUpdating}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </ActionButton>
                          <span className="px-3 py-1 text-xs font-bold text-slate-800 min-w-[2rem] text-center">
                            {isUpdating ? '...' : item.quantity}
                          </span>
                          <ActionButton busy={isUpdating} compact
                            onClick={() => handleUpdateQuantity(item.drugId, item.quantity, 1)}
                            disabled={isUpdating}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </ActionButton>
                        </div>

                        {/* Line total */}
                        <div className="text-right min-w-[5.5rem]">
                          <span className="text-sm font-bold text-slate-900 block">
                            {formatVND(item.lineTotal)}
                          </span>
                        </div>

                        {/* Remove button */}
                        <ActionButton busy={isUpdating} compact
                          onClick={() => handleRemoveItem(item.drugId)}
                          disabled={isUpdating}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa khỏi giỏ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền thuốc:</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {formatVND(cart.subtotal)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    {formatVND(cart.subtotal)}
                  </span>
                </div>
              </div>

              {hasIssues && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Một số sản phẩm trong giỏ không đủ điều kiện bán. Vui lòng kiểm tra và sửa trước khi đặt hàng.</span>
                </div>
              )}

              <button
                onClick={() => router.push('/checkout')}
                disabled={cart.items.length === 0 || hasIssues}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition shadow-sm"
              >
                <span>Tiến hành đặt hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                Nhận tại quầy hoặc Giao hàng tận nơi
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
