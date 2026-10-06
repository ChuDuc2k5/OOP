'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MilestonePlaceholder from '@/components/MilestonePlaceholder';

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <MilestonePlaceholder
          title="Giỏ hàng của bạn"
          functionCode="F012"
          milestone="M2 — Khách hàng (fe/m2-customer)"
          description="Quản lý các sản phẩm đã thêm vào giỏ, cập nhật số lượng, kiểm tra cảnh báo tồn kho và chuyển sang bước đặt hàng (Checkout)."
          backHref="/"
          backLabel="Tiếp tục mua sắm"
        />
      </main>
      <Footer />
    </div>
  );
}
