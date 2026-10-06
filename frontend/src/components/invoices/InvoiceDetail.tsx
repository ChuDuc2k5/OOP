'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, invoicesApi } from '@/lib/api';
import { InvoiceView } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  formatVND,
  PAYMENT_METHOD_LABELS,
  SALE_CHANNEL_LABELS,
  SALE_KIND_LABELS,
} from '@/lib/format';
import {
  ArrowLeft,
  Receipt,
  Printer,
  ShoppingBag,
  ExternalLink,
  XCircle,
  RefreshCw,
  Building,
  Calendar,
  User,
  CreditCard,
  FileText,
  Boxes,
  ShieldCheck,
} from 'lucide-react';

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const pathname = usePathname();
  const base = pathname.startsWith('/admin/') ? '/admin' : pathname.startsWith('/staff/') ? '/staff' : '';
  const { user, loading: authLoading, authorized } = useRequireAuth(base ? ['Staff', 'Admin'] : ['User']);

  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoicesApi.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không tìm thấy hóa đơn';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (authorized && user) {
      fetchInvoice();
    }
  }, [authorized, user, fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="print:hidden">
        {!base && <Header />}
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href={base || "/"} className="hover:text-emerald-700">Trang chủ</Link>
            <span>/</span>
            <Link href={`${base}/invoices`} className="hover:text-emerald-700">Hóa đơn</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Chi tiết #{invoiceId}</span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`${base}/invoices`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>In hóa đơn</span>
            </button>
          </div>
        </div>

        {loading ? <LoadingState /> : error || !invoice ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Không tìm thấy hóa đơn</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {error || 'Hóa đơn này không tồn tại hoặc bạn không có quyền xem chứng từ này.'}
            </p>
            <Link
              href={`${base}/invoices`}
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
            >
              Về danh sách hóa đơn
            </Link>
          </div>
        ) : (
          /* Printable Invoice Paper Container */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
            {/* Header: Pharmacy Brand & Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center space-x-2 text-emerald-700 font-black text-xl">
                  <Receipt className="w-6 h-6" />
                  <span>HỆ THỐNG NHÀ THUỐC PHARMACY</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Địa chỉ: 123 Đường Y Dược, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội
                </p>
                <p className="text-xs text-slate-500">
                  Hotline: 1900 8888 • Email: support@pharmacy.local
                </p>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  Hóa đơn bán lẻ
                </span>
                <h1 className="text-lg sm:text-xl font-mono font-black text-slate-900">
                  #{invoice.invoiceId}
                </h1>
                <p className="text-xs text-slate-500">
                  Ngày lập: {formatDateTime(invoice.issuedAt)}
                </p>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs bg-slate-50 rounded-xl p-5 border border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-sm mb-1">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Thông tin khách hàng &amp; Giao nhận</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Người nhận:</span>
                  <strong className="text-slate-900">{invoice.receiverName || 'Khách lẻ tại quầy'}</strong>
                </div>
                {invoice.customerUsername && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tài khoản đặt hàng:</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {invoice.customerUsername}
                    </span>
                  </div>
                )}
                {invoice.orderId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Đơn hàng gốc:</span>
                    <Link
                      href={`${base}/orders/${invoice.orderId}`}
                      className="font-mono font-bold text-purple-700 hover:underline flex items-center space-x-1"
                    >
                      <span>{invoice.orderId}</span>
                      <ExternalLink className="w-3 h-3 print:hidden" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-sm mb-1">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Hình thức &amp; Nghiệp vụ xuất bán</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phân loại đơn:</span>
                  <strong className="text-slate-900">{SALE_KIND_LABELS[invoice.kind]}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kênh bán:</span>
                  <span className="text-slate-800 font-medium">
                    {SALE_CHANNEL_LABELS[invoice.channel]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phương thức thanh toán:</span>
                  <span className="font-semibold text-emerald-700">
                    {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Dược sĩ / Người lập:</span>
                  <span className="font-semibold text-slate-800">{invoice.createdByUsername}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Chi tiết thuốc &amp; Lô xuất kho</span>
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-3 w-10 text-center">STT</th>
                      <th className="p-3">Tên thuốc / Mã thuốc</th>
                      <th className="p-3">Đơn vị</th>
                      <th className="p-3 text-center">SL</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {invoice.items.map((item, idx) => (
                      <React.Fragment key={item.drugId || idx}>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900">{item.drugName}</span>
                            <div className="text-[11px] font-mono text-slate-400">
                              {item.drugId}
                            </div>
                          </td>
                          <td className="p-3">{item.unit}</td>
                          <td className="p-3 text-center font-bold text-slate-900">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-right">{formatVND(item.unitPrice)}</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatVND(item.lineTotal)}
                          </td>
                        </tr>

                        {/* Batch Allocations Sub-row */}
                        {item.allocations && item.allocations.length > 0 && (
                          <tr className="bg-slate-50/70 text-[11px] text-slate-600">
                            <td className="p-2"></td>
                            <td colSpan={5} className="p-2 space-y-1">
                              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
                                Lô xuất kho (FEFO):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {item.allocations.map((alloc, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700"
                                  >
                                    <span>Lô: <strong>{alloc.batchNumber}</strong></span>
                                    <span>• HSD: {formatDate(alloc.expiryDate)}</span>
                                    <span>• SL: <strong>{alloc.quantity}</strong> {item.unit}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 border-t border-slate-200 text-xs font-bold">
                      <td colSpan={5} className="p-3.5 text-right text-slate-700">
                        Tổng thanh toán:
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-700 text-base">
                        {formatVND(invoice.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs text-slate-600">
              <div className="space-y-12">
                <span className="font-bold block">Khách hàng nhận thuốc</span>
                <span className="text-[11px] text-slate-400 italic block">(Ký và ghi rõ họ tên)</span>
              </div>
              <div className="space-y-12">
                <div>
                  <span className="font-bold block">Dược sĩ phụ trách bán hàng</span>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                    {invoice.createdByUsername}
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Chứng từ xuất kho hợp lệ</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="print:hidden">
        {!base && <Footer />}
      </div>
    </div>
  );
}
