'use client';

import React from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useRequireAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/Status';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chỉ Staff và Admin mới được vào /staff (API Contract §1.3, SRS §3)
  const { user, loading, authorized } = useRequireAuth(['Staff', 'Admin']);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <LoadingState />
      </div>
    );
  }

  if (!authorized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100">
      <Sidebar role="Staff" />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {user.role === 'Admin' && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950"><span>Bạn đang dùng giao diện nhân viên</span><Link href="/admin" className="font-semibold underline">Quay lại trang quản lý</Link></div>}
        {children}
      </div>
    </div>
  );
}
