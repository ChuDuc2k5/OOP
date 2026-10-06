'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useRequireAuth } from '@/context/AuthContext';
import { RefreshCw } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chỉ Admin mới được vào /admin (API Contract §1.3, SRS §3)
  const { user, loading, authorized } = useRequireAuth(['Admin']);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center space-x-2 text-emerald-700 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Đang xác thực quyền Quản trị viên...</span>
        </div>
      </div>
    );
  }

  if (!authorized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100">
      <Sidebar role="Admin" />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
