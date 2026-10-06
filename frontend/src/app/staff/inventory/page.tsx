'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffInventoryPage() {
  return (
    <MilestonePlaceholder
      title="Tra cứu tồn kho theo lô"
      functionCode="F007"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Tra cứu tổng tồn thực tế, tồn còn hạn sử dụng, số lượng đang giữ và tồn khả dụng chi tiết theo từng lô thuốc."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
