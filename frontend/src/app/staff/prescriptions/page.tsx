'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffPrescriptionsPage() {
  return (
    <MilestonePlaceholder
      title="Tiếp nhận & Xử lý đơn thuốc"
      functionCode="F010, F011"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Xem ảnh đơn thuốc bệnh nhân gửi lên, nhập chi tiết thuốc theo đơn, duyệt hoặc từ chối đơn thuốc và kiểm tra hạn mức cấp phát."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
