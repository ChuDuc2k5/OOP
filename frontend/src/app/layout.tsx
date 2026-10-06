import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Pharmacy Management System - Nhà Thuốc Trực Tuyến & Quản Lý GPP',
  description: 'Hệ thống quản lý nhà thuốc, đặt thuốc trực tuyến, bán tại quầy và theo dõi tồn kho FEFO.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
