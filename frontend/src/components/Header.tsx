'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/lib/format';
import {
  Menu,
  X,
  ShoppingCart,
  ClipboardList,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Pill,
  Search,
} from 'lucide-react';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-emerald-700 font-bold text-xl tracking-tight">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                <Pill className="w-6 h-6" />
              </span>
              <span className="hidden sm:inline">Pharmacy System</span>
              <span className="sm:hidden">Pharmacy</span>
            </Link>
          </div>

          {/* Search bar desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Tìm tên thuốc, mã thuốc (vd: Paracetamol)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </form>
          </div>

          {/* Desktop Right actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user?.role === 'User' && (
              <>
                <Link
                  href="/cart"
                  className="flex items-center space-x-1 text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition"
                  title="Giỏ hàng"
                >
                  <ShoppingCart className="w-5 h-5 text-slate-600" />
                  <span>Giỏ hàng</span>
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center space-x-1 text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition"
                  title="Đơn mua của tôi"
                >
                  <ClipboardList className="w-5 h-5 text-slate-600" />
                  <span>Đơn hàng</span>
                </Link>
              </>
            )}

            {/* Dashboard shortcut for Staff / Admin */}
            {isAuthenticated && (user?.role === 'Staff' || user?.role === 'Admin') && (
              <Link
                href={user.homePath}
                className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Trang quản lý</span>
              </Link>
            )}

            {/* User Profile / Auth buttons */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 border-l pl-4 border-slate-200">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
                    {user.username}
                  </span>
                  <span className="text-xs text-slate-500">
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-slate-700 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center space-x-2">
            {isAuthenticated && user?.role === 'User' && (
              <Link href="/cart" className="p-2 text-slate-600 hover:text-emerald-600">
                <ShoppingCart className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="md:hidden pb-3 pt-1">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Tìm tên thuốc, mã thuốc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-full text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          {isAuthenticated && user ? (
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{user.username}</div>
                  <div className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</div>
                </div>
              </div>
              {(user.role === 'Staff' || user.role === 'Admin') && (
                <Link
                  href={user.homePath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 flex items-center space-x-2 text-sm text-emerald-700 font-medium py-2 px-3 bg-emerald-50 rounded-lg"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Vào trang quản lý ({ROLE_LABELS[user.role]})</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col space-y-2 pb-3 border-b border-slate-200">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 bg-emerald-600 text-white rounded-lg font-medium"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-800 hover:bg-slate-50"
            >
              Trang chủ sản phẩm
            </Link>
            {isAuthenticated && user?.role === 'User' && (
              <>
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-slate-800 hover:bg-slate-50"
                >
                  <ShoppingCart className="w-5 h-5 text-slate-500" />
                  <span>Giỏ hàng</span>
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-slate-800 hover:bg-slate-50"
                >
                  <ClipboardList className="w-5 h-5 text-slate-500" />
                  <span>Đơn mua của tôi</span>
                </Link>
              </>
            )}
          </div>

          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-md font-medium text-left"
              >
                <LogOut className="w-5 h-5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
