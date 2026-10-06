'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';
import {
  Users,
  Pill,
  QrCode,
  Boxes,
  AlertTriangle,
  Receipt,
  FileText,
  ShoppingBag,
  CreditCard,
  Store,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function AdminDashboardPage() {
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
          <div className="flex items-center space-x-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Khu vực Quản trị tối cao (Admin)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Chào mừng trở lại, {user?.username}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý tài khoản nhân viên, danh mục thuốc, cấu hình thanh toán QR và toàn bộ vận hành nhà thuốc.
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

      {/* Admin Specific Privileges */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Đặc quyền quản trị (Chỉ dành cho Admin)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* F003: Quản lý tài khoản */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs hover:border-emerald-400 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Quản lý tài khoản (F003)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Xem danh sách tất cả tài khoản trong hệ thống, tìm kiếm theo tên và tạo tài khoản nhân viên (Staff) mới.
              </p>
            </div>
            <Link
              href="/admin/accounts"
              className="mt-5 inline-flex items-center space-x-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <span>Quản lý tài khoản</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* F005, F006: Thuốc & Nhập lô */}
          <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-xs hover:border-indigo-400 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Danh mục &amp; Nhập lô (F005, F006)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thêm thuốc mới, chỉnh sửa thông tin, tải ảnh thuốc lên, bật/tắt bán và nhập các lô thuốc theo hạn dùng.
              </p>
            </div>
            <Link
              href="/admin/drugs"
              className="mt-5 inline-flex items-center space-x-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              <span>Quản lý thuốc &amp; nhập lô</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* F017: Cấu hình QR */}
          <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Cấu hình thanh toán QR (F017)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thiết lập ngân hàng, số tài khoản, tên chủ sở hữu và ảnh mã QR tĩnh phục vụ thanh toán chuyển khoản.
              </p>
            </div>
            <Link
              href="/admin/settings/payment"
              className="mt-5 inline-flex items-center space-x-2 text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              <span>Cài đặt thông tin QR</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Chỉ số vận hành hệ thống
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Đơn thuốc chờ duyệt</span>
            <span className="text-2xl font-bold text-purple-700 mt-1 block">
              {loading ? '-' : summary?.pendingPrescriptions ?? 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Đơn chờ thanh toán</span>
            <span className="text-2xl font-bold text-blue-700 mt-1 block">
              {loading ? '-' : summary?.awaitingPaymentOrders ?? 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Chờ xác nhận tiền</span>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">
              {loading ? '-' : summary?.pendingPayments ?? 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Đang đóng gói chuẩn bị</span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              {loading ? '-' : summary?.preparingOrders ?? 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Mặt hàng tồn thấp</span>
            <span className="text-2xl font-bold text-rose-700 mt-1 block">
              {loading ? '-' : summary?.lowStockCount ?? 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Lô sắp hết hạn (30d)</span>
            <span className="text-2xl font-bold text-orange-700 mt-1 block">
              {loading ? '-' : summary?.expiringCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Modules Link */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Nghiệp vụ vận hành cửa hàng (Tái sử dụng với Staff)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/staff/prescriptions"
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 text-slate-700 transition"
          >
            <FileText className="w-5 h-5 mx-auto text-purple-600" />
            <span className="text-xs font-semibold block">Đơn thuốc</span>
          </Link>
          <Link
            href="/staff/orders"
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 text-slate-700 transition"
          >
            <ShoppingBag className="w-5 h-5 mx-auto text-blue-600" />
            <span className="text-xs font-semibold block">Đơn hàng</span>
          </Link>
          <Link
            href="/staff/payments"
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 text-slate-700 transition"
          >
            <CreditCard className="w-5 h-5 mx-auto text-amber-600" />
            <span className="text-xs font-semibold block">Duyệt tiền QR</span>
          </Link>
          <Link
            href="/staff/sales"
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 text-slate-700 transition"
          >
            <Store className="w-5 h-5 mx-auto text-emerald-600" />
            <span className="text-xs font-semibold block">Bán tại quầy</span>
          </Link>
          <Link
            href="/staff/inventory"
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 text-slate-700 transition"
          >
            <Boxes className="w-5 h-5 mx-auto text-indigo-600" />
            <span className="text-xs font-semibold block">Tồn kho theo lô</span>
          </Link>
          <Link
            href="/staff/invoices"
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1 text-slate-700 transition"
          >
            <Receipt className="w-5 h-5 mx-auto text-slate-600" />
            <span className="text-xs font-semibold block">Hóa đơn</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
