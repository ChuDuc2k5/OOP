"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ActionButton } from './ActionButton';
import { ROLE_LABELS } from "@/lib/format";
import {
  LayoutDashboard,
  FileText,
  ShoppingBag,
  CreditCard,
  Store,
  Boxes,
  AlertTriangle,
  Receipt,
  Users,
  Pill,
  QrCode,
  LogOut,
  Home,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  role: "Staff" | "Admin";
}

export default function Sidebar({ role }: SidebarProps) {
  const { user, logout, loggingOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
    await logout();
    router.push("/login");
    } catch { /* Lỗi đã được hiển thị bởi toast. */ }
  };

  const staffNavItems = [
    { label: "Tổng quan công việc", href: "/staff", icon: LayoutDashboard },
    { label: "Đơn thuốc", href: "/staff/prescriptions", icon: FileText },
    { label: "Đơn hàng trực tuyến", href: "/staff/orders", icon: ShoppingBag },
    { label: "Duyệt thanh toán", href: "/staff/payments", icon: CreditCard },
    { label: "Bán tại quầy", href: "/staff/sales", icon: Store },
    { label: "Tra cứu tồn kho", href: "/staff/inventory", icon: Boxes },
    {
      label: "Báo cáo cảnh báo kho",
      href: "/staff/reports",
      icon: AlertTriangle,
    },
    { label: "Hóa đơn bán lẻ", href: "/staff/invoices", icon: Receipt },
  ];

  const adminNavItems = [
    { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { label: "Tài khoản", href: "/admin/accounts", icon: Users },
    { label: "Thuốc & nhập lô", href: "/admin/drugs", icon: Pill },
    { label: "Tồn kho", href: "/admin/inventory", icon: Boxes },
    { label: "Báo cáo kho", href: "/admin/reports", icon: AlertTriangle },
    { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
    { label: "Hóa đơn", href: "/admin/invoices", icon: Receipt },
    { label: "Cài đặt QR", href: "/admin/settings/payment", icon: QrCode },
  ];

  const navItems = role === "Admin" ? adminNavItems : staffNavItems;

  return (
    <>
      {/* Mobile top bar with hamburger toggle */}
      <div data-mobile-sidebar-header className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2 font-bold text-emerald-400">
          <Pill className="w-5 h-5 text-emerald-400" />
          <span>
            {role === "Admin" ? "Quản trị nhà thuốc" : "Nhân viên nhà thuốc"}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          aria-label="Mở menu quản lý"
          aria-expanded={mobileOpen}
          aria-controls="dashboard-menu"
        >
          {mobileOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        id="dashboard-menu"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } lg:visible lg:static lg:h-screen lg:z-10`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/50">
          <Link
            href={role === "Admin" ? "/admin" : "/staff"}
            className="flex items-center space-x-2.5"
          >
            <span className="p-2 bg-emerald-600 text-white rounded-lg shadow">
              <Pill className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-white text-base leading-tight">
                Pharmacy System
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {role === "Admin" ? "Quản trị viên" : "Nhân viên nhà thuốc"}
              </span>
            </div>
          </Link>
          <button
            aria-label="Đóng menu quản lý"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card (NFR-05: Tên tài khoản + Role + Đăng xuất) */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.username || "Chưa đăng nhập"}
                </p>
                <p className="text-xs text-emerald-400 font-medium truncate">
                  {user ? ROLE_LABELS[user.role] : "Khách"}
                </p>
              </div>
            </div>
              <ActionButton busy={loggingOut} compact
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition shrink-0"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </ActionButton>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {role === 'Admin' && <p className="px-3.5 pb-2 text-xs font-bold uppercase text-slate-400">Quản lý</p>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom link: Về trang khách hàng */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          {role === 'Admin' && <Link href="/staff" onClick={() => setMobileOpen(false)} className="mb-2 block rounded-lg bg-emerald-700 px-3 py-3 text-center text-sm font-semibold text-white">Làm việc như nhân viên</Link>}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-emerald-400 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <Home className="w-4 h-4" />
            <span>Xem trang mua thuốc (Khách)</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
