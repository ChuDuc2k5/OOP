'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffInvoicesPage() {
  return (
    <MilestonePlaceholder
      title="Tra cứu & Xem hóa đơn"
      functionCode="F020"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Xem chi tiết các hóa đơn bán hàng đã xuất: danh sách thuốc, lô xuất, đơn giá đã chốt và tổng tiền."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
