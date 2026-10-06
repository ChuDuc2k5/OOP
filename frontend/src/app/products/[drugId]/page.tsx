'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { cartApi, productsApi } from '@/lib/api';
import { Product } from '@/lib/types';
import { formatVND } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Pill,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Lock,
  RefreshCw,
  Plus,
  Minus,
  Check,
} from 'lucide-react';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ drugId: string }>;
}) {
  const resolvedParams = use(params);
  const drugId = resolvedParams.drugId;
  const router = useRouter();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const data = await productsApi.getProductById(drugId);
        setProduct(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không tìm thấy thông tin sản phẩm';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [drugId, user]);

  const hasPrice = typeof product?.unitPrice === 'number';

  const [addingToCart, setAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      await cartApi.addItem({ drugId: product.drugId, quantity });
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 3000);
    } catch (err) {
      console.warn('Lỗi thêm giỏ hàng:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-emerald-700 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách sản phẩm</span>
        </Link>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center min-h-[300px]">
            <div className="flex items-center space-x-2 text-emerald-700 font-medium">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Đang tải thông tin sản phẩm...</span>
            </div>
          </div>
        ) : error || !product ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Không tìm thấy sản phẩm</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {error || 'Sản phẩm này có thể đã bị ngừng kinh doanh hoặc mã thuốc không tồn tại.'}
            </p>
            <Link
              href="/"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
            >
              Về trang chủ tìm kiếm
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-10">
            {/* Left: Image */}
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-8 border border-slate-100 min-h-[320px]">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-h-72 object-contain"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Pill className="w-16 h-16" />
                </div>
              )}
              <span className="text-xs text-slate-400 mt-4 font-mono">Mã thuốc: {product.drugId}</span>
            </div>

            {/* Right: Info & Actions */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {product.inStock ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Còn hàng khả dụng</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tạm hết hàng</span>
                    </span>
                  )}

                  {product.requiresPrescription && (
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Thuốc kê đơn (Rx)
                    </span>
                  )}

                  {product.isControlled && (
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Kiểm soát đặc biệt
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  {product.name}
                </h1>

                {/* Price Display */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  {hasPrice ? (
                    <div className="flex items-baseline space-x-3">
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                        {formatVND(product.unitPrice)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / {product.saleUnit} (Đã bao gồm thuế)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-amber-800">
                      <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                      <div>
                        <div className="text-sm font-semibold">Chưa hiển thị giá bán</div>
                        <div className="text-xs text-slate-600">
                          Theo quy định, chỉ khách hàng đã đăng nhập mới được xem đơn giá và đặt mua.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Regulatory Warnings */}
                {product.requiresPrescription && (
                  <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900">
                    <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cảnh báo quy chế kê đơn:</strong> Thuốc chỉ được bán khi có đơn thuốc hợp lệ của bác sĩ. Quý khách vui lòng chuẩn bị đơn thuốc để gửi duyệt khi đặt hàng.
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">Mô tả và hướng dẫn:</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {product.description || 'Chưa có thông tin mô tả chi tiết cho loại thuốc này.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Đơn vị bán lẻ</span>
                    <strong className="text-slate-800 text-sm">{product.saleUnit}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Loại sản phẩm</span>
                    <strong className="text-slate-800 text-sm">
                      {product.requiresPrescription ? 'Thuốc theo đơn' : 'Thuốc không kê đơn (OTC)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                {hasPrice ? (
                  <>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-semibold text-slate-700">Số lượng:</span>
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1 || !product.inStock}
                          className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          aria-label="Giảm"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-1 text-sm font-bold text-slate-800 min-w-[2.5rem] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          disabled={!product.inStock}
                          className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          aria-label="Tăng"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-slate-400">
                        Tổng tạm tính:{' '}
                        <strong className="text-emerald-700">
                          {formatVND((product.unitPrice || 0) * quantity)}
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={handleAddToCart}
                        disabled={!product.inStock}
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-semibold text-sm transition shadow-sm ${
                          product.inStock
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{product.inStock ? 'Thêm vào giỏ hàng' : 'Tạm hết hàng'}</span>
                      </button>
                    </div>

                    {addedToast && (
                      <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg animate-fadeIn">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Đã thêm {quantity} {product.saleUnit} {product.name} vào giỏ hàng!</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() =>
                        router.push(`/login?next=${encodeURIComponent(`/products/${product.drugId}`)}`)
                      }
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-xl font-semibold text-sm transition shadow-sm flex items-center justify-center space-x-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Đăng nhập để xem giá và mua hàng</span>
                    </button>
                    <p className="text-center text-xs text-slate-500">
                      Chưa có tài khoản?{' '}
                      <Link href="/register" className="text-emerald-600 font-semibold hover:underline">
                        Đăng ký tài khoản mới ngay
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
