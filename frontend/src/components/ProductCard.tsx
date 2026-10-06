import React from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { formatVND } from '@/lib/format';
import { Pill, AlertCircle, Lock, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasPrice = typeof product.unitPrice === 'number';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col h-full group">
      {/* Product Image / Placeholder */}
      <div className="relative aspect-video bg-slate-100 flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition duration-300">
            <Pill className="w-8 h-8" />
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute top-2.5 right-2.5">
          {product.inStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              Còn hàng
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
              Hết hàng
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {product.requiresPrescription && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                Thuốc kê đơn
              </span>
            )}
            {product.isControlled && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                Kiểm soát đặc biệt
              </span>
            )}
            <span className="inline-flex items-center text-[11px] text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-100">
              Đơn vị: {product.saleUnit}
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/products/${product.drugId}`}
            className="font-bold text-slate-900 text-base hover:text-emerald-600 line-clamp-1 mb-1 transition"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Drug ID & Description */}
          <p className="text-xs text-slate-400 font-mono mb-2">Mã: {product.drugId}</p>
          <p className="text-xs text-slate-600 line-clamp-2 mb-3">
            {product.description || 'Chưa có thông tin mô tả chi tiết cho loại thuốc này.'}
          </p>
        </div>

        {/* Pricing & CTA Section */}
        <div className="pt-3 border-t border-slate-100 mt-2">
          {hasPrice ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Đơn giá ({product.saleUnit})</span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatVND(product.unitPrice)}
                </span>
              </div>
              <Link
                href={`/products/${product.drugId}`}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm ${
                  product.inStock
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{product.inStock ? 'Xem & Mua' : 'Hết hàng'}</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Đăng nhập để xem giá bán</span>
              </div>
              <Link
                href={`/login?next=${encodeURIComponent(`/products/${product.drugId}`)}`}
                className="w-full text-center block bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-lg transition"
              >
                Đăng nhập để mua
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
