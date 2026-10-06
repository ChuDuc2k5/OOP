'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function AdminAccountsPage() {
  return (
    <MilestonePlaceholder
      title="Quản lý tài khoản người dùng"
      functionCode="F003"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Xem danh sách tài khoản, tìm kiếm theo tên và tạo tài khoản nhân viên (Staff) mới."
      backHref="/admin"
      backLabel="Về bảng điều khiển quản trị"
    />
  );
}
