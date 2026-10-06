'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffOrdersPage() {
  return (
    <MilestonePlaceholder
      title="Quản lý đơn hàng trực tuyến"
      functionCode="F015"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Tiếp nhận xử lý đơn trực tuyến (Claim), xuất kho và tạo hóa đơn qua CheckoutService (Fulfill), chuyển trạng thái Đang giao và Hoàn tất."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
