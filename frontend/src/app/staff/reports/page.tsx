'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffReportsPage() {
  return (
    <MilestonePlaceholder
      title="Báo cáo cảnh báo kho FEFO"
      functionCode="F009"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Xem báo cáo 2 tab: Mặt hàng có tồn khả dụng thấp hơn ngưỡng cảnh báo và các lô thuốc sắp hết hạn sử dụng trong số ngày quy định."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
