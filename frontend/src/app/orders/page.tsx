'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function OrdersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <MilestonePlaceholder
          title="Đơn hàng của tôi"
          functionCode="F014"
          milestone="M2 — Khách hàng (fe/m2-customer)"
          description="Theo dõi lịch sử đơn hàng, xem chi tiết tình trạng thanh toán và giao hàng, mở trang QR chuyển khoản hoặc hủy đơn hàng hợp lệ."
          backHref="/"
          backLabel="Về trang mua sắm"
        />
      </main>
      <Footer />
    </div>
  );
}
