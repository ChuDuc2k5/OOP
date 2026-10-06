'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { prescriptionsApi } from '@/lib/api';
import { PrescriptionRow, PrescriptionStatus, Paged } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  PRESCRIPTION_STATUS_LABELS,
} from '@/lib/format';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ExternalLink,
  Filter,
  User,
  Calendar,
} from 'lucide-react';

function PrescriptionsContent() {
  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get('status') as PrescriptionStatus | 'ALL') || 'ALL';

  const [activeStatus, setActiveStatus] = useState<PrescriptionStatus | 'ALL'>(initialStatus);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<PrescriptionRow>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await prescriptionsApi.getMyPrescriptions({
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        page,
        pageSize: 10,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn thuốc';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, page]);

  useEffect(() => {
    if (authorized && user) {
      fetchPrescriptions();
    }
  }, [authorized, user, fetchPrescriptions]);

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

  // Filter items by status on client if needed
  const filteredItems =
    activeStatus === 'ALL'
      ? data.items
      : data.items.filter((item) => item.status === activeStatus);

  const totalPages = Math.ceil(data.total / (data.pageSize || 10));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              <span>Đơn thuốc của tôi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý hồ sơ đơn thuốc đã gửi để mua thuốc kê đơn (ETC) tại hệ thống
            </p>
          </div>

          <Link
            href="/prescriptions/new"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Gửi đơn thuốc mới</span>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveStatus('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả ({data.items.length})
          </button>
          <button
            onClick={() => setActiveStatus('PendingReview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeStatus === 'PendingReview'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            Chờ duyệt
          </button>
          <button
            onClick={() => setActiveStatus('Approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeStatus === 'Approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => setActiveStatus('Rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeStatus === 'Rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            Từ chối
          </button>
        </div>

        {/* Content List Area */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Đang tải danh sách đơn thuốc...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchPrescriptions}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Không có đơn thuốc nào</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {activeStatus === 'ALL'
                ? 'Bạn chưa gửi hình ảnh đơn thuốc nào lên hệ thống.'
                : `Không có đơn thuốc nào ở trạng thái "${PRESCRIPTION_STATUS_LABELS[activeStatus]}".`}
            </p>
            <div className="pt-2">
              <Link
                href="/prescriptions/new"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Gửi đơn thuốc mới ngay</span>
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
                      <th className="p-4">Mã đơn thuốc</th>
                      <th className="p-4">Bệnh nhân / Mã định danh</th>
                      <th className="p-4">Ngày gửi</th>
                      <th className="p-4">Hiệu lực đến</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredItems.map((item) => (
                      <tr key={item.prescriptionId} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-purple-700">
                          <Link
                            href={`/prescriptions/${item.prescriptionId}`}
                            className="hover:underline flex items-center space-x-1"
                          >
                            <span>{item.prescriptionId}</span>
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{item.patientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            CCCD/BHYT: {item.patientId}
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="p-4 text-slate-600 whitespace-nowrap">
                          {item.validUntil ? formatDate(item.validUntil) : 'Chờ xác nhận'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(
                              item.status
                            )}`}
                          >
                            {PRESCRIPTION_STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/prescriptions/${item.prescriptionId}`}
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
                  Trang <strong>{page}</strong> / {totalPages} (Tổng số {data.total} đơn thuốc)
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

export default function PrescriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center space-x-2 text-emerald-700 font-medium">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Đang tải danh sách đơn thuốc...</span>
          </div>
        </div>
      }
    >
      <PrescriptionsContent />
    </Suspense>
  );
}
