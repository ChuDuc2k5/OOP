'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { invoicesApi } from '@/lib/api';
import { InvoiceRow, Paged } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  formatVND,
  SALE_CHANNEL_LABELS,
  SALE_KIND_LABELS,
} from '@/lib/format';
import {
  Receipt,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  FileText,
} from 'lucide-react';

function InvoicesContent() {
  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [activeSearch, setActiveSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<InvoiceRow>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.getInvoices({
        search: activeSearch || undefined,
        page,
        pageSize: 10,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách hóa đơn';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeSearch, page]);

  useEffect(() => {
    if (authorized && user) {
      fetchInvoices();
    }
  }, [authorized, user, fetchInvoices]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchTerm.trim());
    setPage(1);
  };

  if (authLoading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center space-x-2 text-emerald-700 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Đang xác thực quyền truy cập...</span>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / (data.pageSize || 10));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
              <Receipt className="w-6 h-6 text-emerald-600" />
              <span>Hóa đơn của tôi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Xem và tải hóa đơn bán lẻ, chứng từ xuất thuốc điện tử các đơn hàng đã hoàn tất
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 max-w-md w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã HD, mã đơn..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Đang tải danh sách hóa đơn...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchInvoices}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Không tìm thấy hóa đơn nào</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {activeSearch
                ? `Không tìm thấy hóa đơn phù hợp với từ khóa "${activeSearch}".`
                : 'Bạn chưa có hóa đơn bán lẻ nào. Hóa đơn sẽ tự động phát hành sau khi đơn hàng được chuẩn bị và xuất kho thành công.'}
            </p>
            <div className="pt-2">
              <Link
                href="/orders"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <span>Xem danh sách đơn hàng</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-4">Mã hóa đơn</th>
                      <th className="p-4">Ngày phát hành</th>
                      <th className="p-4">Phân loại</th>
                      <th className="p-4">Kênh</th>
                      <th className="p-4">Đơn hàng gốc</th>
                      <th className="p-4">Tổng tiền</th>
                      <th className="p-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.items.map((inv) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-emerald-800">
                          <Link
                            href={`/invoices/${inv.invoiceId}`}
                            className="hover:underline flex items-center space-x-1"
                          >
                            <span>{inv.invoiceId}</span>
                          </Link>
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          {formatDateTime(inv.issuedAt)}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-800">
                            {SALE_KIND_LABELS[inv.kind]}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {SALE_CHANNEL_LABELS[inv.channel]}
                        </td>
                        <td className="p-4">
                          {inv.orderId ? (
                            <Link
                              href={`/orders/${inv.orderId}`}
                              className="font-mono text-purple-700 hover:underline inline-flex items-center space-x-1 font-semibold"
                            >
                              <span>{inv.orderId}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 font-extrabold text-slate-900 text-sm">
                          {formatVND(inv.totalAmount)}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/invoices/${inv.invoiceId}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            <span>Xem</span>
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
                  Trang <strong>{page}</strong> / {totalPages} (Tổng số {data.total} hóa đơn)
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

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center space-x-2 text-emerald-700 font-medium">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Đang tải danh sách hóa đơn...</span>
          </div>
        </div>
      }
    >
      <InvoicesContent />
    </Suspense>
  );
}
