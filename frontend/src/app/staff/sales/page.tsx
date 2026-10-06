'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffSalesPage() {
  return (
    <MilestonePlaceholder
      title="Bán thuốc tại quầy"
      functionCode="F016, F019"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Lập giao dịch bán thuốc trực tiếp tại quầy: chọn bán OTC hoặc bán theo đơn, chỉnh sửa các dòng thuốc, nhận tiền mặt và hoàn tất giao dịch."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
