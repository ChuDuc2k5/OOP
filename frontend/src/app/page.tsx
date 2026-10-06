'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { LoadingState } from '@/components/Status';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { ApiException, productsApi } from '@/lib/api';
import { Product, Paged } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Search, Filter, RefreshCw, AlertCircle, Shield, Truck, Clock } from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const { user, isAuthenticated } = useAuth();

  const [productsData, setProductsData] = useState<Paged<Product>>({
    items: [],
    page: 1,
    pageSize: 12,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [activeFilter, setActiveFilter] = useState<'all' | 'otc' | 'rx' | 'controlled' | 'instock'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Đồng bộ với query param khi header search
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.getProducts({
        search: searchTerm,
        page: currentPage,
        pageSize: 12,
      });
      setProductsData(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không thể tải danh sách sản phẩm';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts, isAuthenticated]);

  // Bộ lọc phụ ở client (OTC, Rx, Controlled, Còn hàng)
  const filteredItems = productsData.items.filter((item) => {
    if (activeFilter === 'otc') return !item.requiresPrescription;
    if (activeFilter === 'rx') return item.requiresPrescription;
    if (activeFilter === 'controlled') return item.isControlled;
    if (activeFilter === 'instock') return item.inStock;
    return true;
  });

  const totalPages = Math.ceil(productsData.total / productsData.pageSize) || 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl space-y-3">
            <span className="inline-block bg-emerald-500/30 text-emerald-200 text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border border-emerald-400/30">
              Nhà thuốc trực tuyến &amp; Quản trị theo chuẩn GPP
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Tra cứu &amp; Đặt mua dược phẩm an toàn, minh bạch
            </h1>
            <p className="text-sm sm:text-base text-emerald-100">
              Theo dõi tồn kho theo từng số lô, hạn sử dụng FEFO. Khách hàng đăng nhập để xem đơn giá chính thức và đặt mua thuốc.
            </p>
            {!user && (
              <div className="pt-2 text-xs text-emerald-200">
                💡 <span className="underline font-semibold">Lưu ý:</span> Khách vãng lai (Guest) có thể tìm kiếm và xem chi tiết sản phẩm. Vui lòng đăng nhập để xem giá bán và mua hàng.
              </div>
            )}
          </div>

          {/* Quick value props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-emerald-600/50 mt-6 text-xs text-emerald-100">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>100% thuốc có nguồn gốc rõ ràng, quản lý theo lô</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Hỗ trợ nhận tại quầy hoặc giao hàng tận nơi</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Đối chiếu thanh toán QR nhanh chóng</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Tìm kiếm theo mã thuốc hoặc tên thuốc..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar text-xs">
              <span className="text-slate-400 text-xs flex items-center mr-1">
                <Filter className="w-3.5 h-3.5 mr-1" /> Lọc trong trang này:
              </span>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setActiveFilter('otc')}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  activeFilter === 'otc'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Không kê đơn (OTC)
              </button>
              <button
                onClick={() => setActiveFilter('rx')}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  activeFilter === 'rx'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Thuốc kê đơn
              </button>
              <button
                onClick={() => setActiveFilter('controlled')}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  activeFilter === 'controlled'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kiểm soát đặc biệt
              </button>
              <button
                onClick={() => setActiveFilter('instock')}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  activeFilter === 'instock'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Còn hàng
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        {loading ? <LoadingState /> : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold text-base">Không thể tải dữ liệu sản phẩm</p>
            <p className="text-sm text-rose-600">{error}</p>
            <button
              onClick={loadProducts}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 text-lg">Không tìm thấy sản phẩm</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Không có sản phẩm nào phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Vui lòng thử từ khóa khác.
            </p>
            {(searchTerm || activeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveFilter('all');
                  setCurrentPage(1);
                }}
                className="text-sm text-emerald-600 font-semibold hover:underline"
              >
                Xóa bộ lọc &amp; xem tất cả
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((product) => (
                <ProductCard key={product.drugId} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-2">
                <span className="text-xs text-slate-500">
                  Hiển thị trang <strong className="text-slate-800">{currentPage}</strong> / {totalPages} (Tổng cộng {productsData.total} sản phẩm)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Trang trước
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center space-x-2 text-emerald-700 font-medium text-sm">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Đang tải thông tin trang chủ...</span>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
