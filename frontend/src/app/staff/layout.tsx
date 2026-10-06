'use client';

import React from 'react';
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
      <Sidebar role={user.role === 'Admin' ? 'Admin' : 'Staff'} />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
