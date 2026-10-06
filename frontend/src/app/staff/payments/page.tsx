'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function StaffPaymentsPage() {
  return (
    <MilestonePlaceholder
      title="Duyệt thanh toán QR thủ công"
      functionCode="F018"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Xem danh sách thanh toán đang chờ duyệt (PendingReview), nhập mã giao dịch ngân hàng và số tiền thực nhận để đối chiếu xác nhận."
      backHref="/staff"
      backLabel="Về bảng điều khiển nhân viên"
    />
  );
}
