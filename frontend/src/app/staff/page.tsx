'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';
import {
  FileText,
  ShoppingBag,
  CreditCard,
  Store,
  Boxes,
  AlertTriangle,
  Receipt,
  ArrowRight,
  RefreshCw,
  Clock,
  Package,
} from 'lucide-react';

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.warn('Lỗi tải tóm tắt dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Bảng điều khiển nghiệp vụ
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Xin chào, {user?.username || 'Nhân viên'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi đơn thuốc cần duyệt, đơn hàng trực tuyến và trạng thái tồn kho nhà thuốc.
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Pending Prescriptions */}
        <Link
          href="/staff/prescriptions"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-sm transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Đơn thuốc chờ</span>
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 group-hover:text-purple-700 transition">
            {loading ? '-' : summary?.pendingPrescriptions ?? 0}
          </div>
          <span className="text-[11px] text-purple-600 font-medium mt-1">Cần đối chiếu ảnh</span>
        </Link>

        {/* 2. Awaiting Payment Orders */}
        <Link
          href="/staff/orders"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Chờ thanh toán</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition">
            {loading ? '-' : summary?.awaitingPaymentOrders ?? 0}
          </div>
          <span className="text-[11px] text-blue-600 font-medium mt-1">Đơn đã mở QR</span>
        </Link>

        {/* 3. Pending Payments */}
        <Link
          href="/staff/payments"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-sm transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Duyệt chuyển khoản</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 group-hover:text-amber-700 transition">
            {loading ? '-' : summary?.pendingPayments ?? 0}
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1">Cần đối chiếu STK</span>
        </Link>

        {/* 4. Preparing Orders */}
        <Link
          href="/staff/orders"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Đang chuẩn bị</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition">
            {loading ? '-' : summary?.preparingOrders ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1">Đã thanh toán</span>
        </Link>

        {/* 5. Low Stock */}
        <Link
          href="/staff/reports"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-sm transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Tồn kho thấp</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 group-hover:text-rose-700 transition">
            {loading ? '-' : summary?.lowStockCount ?? 0}
          </div>
          <span className="text-[11px] text-rose-600 font-medium mt-1">Dưới ngưỡng an toàn</span>
        </Link>

        {/* 6. Expiring */}
        <Link
          href="/staff/reports"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-sm transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Sắp hết hạn</span>
            <Boxes className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 group-hover:text-orange-700 transition">
            {loading ? '-' : summary?.expiringCount ?? 0}
          </div>
          <span className="text-[11px] text-orange-600 font-medium mt-1">Trong vòng 30 ngày</span>
        </Link>
      </div>

      {/* Main Operations Navigation Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Chức năng nghiệp vụ chính
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card: Bán hàng tại quầy */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Bán thuốc tại quầy (F016)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tạo giao dịch bán trực tiếp: chọn đơn thuốc hoặc bán OTC, tự động trừ tồn kho theo lô FEFO và xuất hóa đơn.
              </p>
            </div>
            <Link
              href="/staff/sales"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>Vào quầy bán hàng</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card: Duyệt thanh toán QR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Duyệt thanh toán QR (F018)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đối chiếu số tiền thực nhận với thông báo ngân hàng. Xác nhận đủ tiền để chuyển trạng thái chuẩn bị đơn.
              </p>
            </div>
            <Link
              href="/staff/payments"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              <span>Danh sách chờ duyệt</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card: Xử lý đơn thuốc */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-purple-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Tiếp nhận đơn thuốc (F010, F011)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Xem ảnh đơn thuốc do khách tải lên hoặc tiếp nhận đơn giấy tại quầy, kiểm tra hạn mức và phê duyệt bán.
              </p>
            </div>
            <Link
              href="/staff/prescriptions"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              <span>Xử lý đơn thuốc</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card: Đơn hàng trực tuyến */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Đơn hàng trực tuyến (F015)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nhận xử lý đơn (Claim), xuất kho và tạo hóa đơn (Fulfill), cập nhật giao hàng và hoàn tất đơn cho khách.
              </p>
            </div>
            <Link
              href="/staff/orders"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Danh sách đơn hàng</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card: Tra cứu kho */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Tra cứu tồn kho (F007)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Xem số lượng tồn thực tế, số lượng còn hạn, lượng đang giữ và tồn khả dụng chi tiết theo từng số lô.
              </p>
            </div>
            <Link
              href="/staff/inventory"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>Tra cứu kho thuốc</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card: Báo cáo cảnh báo */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-rose-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Cảnh báo kho FEFO (F009)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Báo cáo các mặt hàng có tồn khả dụng thấp hơn ngưỡng an toàn và các lô thuốc sắp hết hạn trong 30 ngày.
              </p>
            </div>
            <Link
              href="/staff/reports"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <span>Xem báo cáo kho</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
