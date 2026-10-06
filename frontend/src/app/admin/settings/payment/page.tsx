'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function AdminPaymentSettingsPage() {
  return (
    <MilestonePlaceholder
      title="Cấu hình tài khoản ngân hàng & QR"
      functionCode="F017"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Thiết lập tên ngân hàng, số tài khoản, tên chủ tài khoản và tải ảnh mã QR tĩnh dùng cho khách hàng chuyển khoản thủ công."
      backHref="/admin"
      backLabel="Về bảng điều khiển quản trị"
    />
  );
}
