'use client';

import React from 'react';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function AdminDrugsPage() {
  return (
    <MilestonePlaceholder
      title="Quản lý danh mục thuốc & Nhập lô"
      functionCode="F005, F006"
      milestone="M3 — Quản trị & Vận hành (fe/m3-backoffice)"
      description="Thêm thuốc mới, sửa thông tin thuốc, tải ảnh đại diện, bật/tắt bán và nhập các lô thuốc mới theo ngày hết hạn FEFO."
      backHref="/admin"
      backLabel="Về bảng điều khiển quản trị"
    />
  );
}
