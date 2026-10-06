'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, prescriptionsApi } from '@/lib/api';
import { PrescriptionView } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  PRESCRIPTION_STATUS_LABELS,
} from '@/lib/format';
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Building,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  Clock,
} from 'lucide-react';

export default function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const prescriptionId = resolvedParams.id;

  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);

  const [prescription, setPrescription] = useState<PrescriptionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await prescriptionsApi.getPrescriptionById(prescriptionId);
      setPrescription(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiException ? err.title : 'Không tìm thấy thông tin đơn thuốc';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    if (authorized && user) {
      fetchPrescription();
    }
  }, [authorized, user, fetchPrescription]);

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
            <span>/</span>
            <Link href="/prescriptions" className="hover:text-emerald-700">Đơn thuốc</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Chi tiết #{prescriptionId}</span>
          </div>
          <Link
            href="/prescriptions"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách đơn thuốc</span>
          </Link>
        </div>

        {loading ? <LoadingState /> : error || !prescription ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 space-y-3">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Không tìm thấy đơn thuốc</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {error || 'Đơn thuốc này không tồn tại hoặc bạn không có quyền xem thông tin này.'}
            </p>
            <Link
              href="/prescriptions"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
            >
              Về danh sách đơn thuốc
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Status Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    #{prescription.prescriptionId}
                  </h1>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                      prescription.status
                    )}`}
                  >
                    {PRESCRIPTION_STATUS_LABELS[prescription.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Gửi lúc: {formatDateTime(prescription.createdAt)} • Người tạo:{' '}
                  <strong className="text-slate-700">{prescription.createdByUsername}</strong>
                </p>
              </div>

              {prescription.status === 'Approved' && (
                <Link
                  href="/"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Mua thuốc theo đơn</span>
                </Link>
              )}
            </div>

            {/* Status alerts */}
            {prescription.status === 'PendingReview' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold block text-sm">Đang chờ dược sĩ kiểm duyệt</strong>
                  <p>
                    Đơn thuốc của bạn đã được tiếp nhận trên hệ thống. Dược sĩ chuyên môn đang thẩm định hình ảnh và sẽ nhập danh mục thuốc, liều dùng và hạn mức kê đơn cho bạn sớm nhất có thể.
                  </p>
                </div>
              </div>
            )}

            {prescription.status === 'Rejected' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold block text-sm">Đơn thuốc đã bị từ chối duyệt</strong>
                  <p>
                    Lý do: <span className="font-semibold">{prescription.reviewNote || 'Ảnh mờ hoặc đơn thuốc không đáp ứng quy định'}</span>
                  </p>
                  <p className="text-[11px] text-rose-700 pt-1">
                    Bạn có thể gửi lại hình ảnh đơn thuốc mới rõ nét hơn tại trang{' '}
                    <Link href="/prescriptions/new" className="underline font-bold">
                      Gửi đơn thuốc mới
                    </Link>.
                  </p>
                </div>
              </div>
            )}

            {prescription.status === 'Approved' && prescription.reviewNote && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Ghi chú duyệt từ Dược sĩ:</strong>
                  <span>{prescription.reviewNote}</span>
                  {prescription.reviewedByUsername && (
                    <span className="block text-[11px] text-emerald-700 mt-0.5">
                      Duyệt bởi: {prescription.reviewedByUsername}{' '}
                      {prescription.reviewedAt && `• ${formatDateTime(prescription.reviewedAt)}`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Grid 2 Columns: Information & Image */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Metadata */}
              <div className="lg:col-span-6 space-y-6">
                {/* Patient Information Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Thông tin bệnh nhân</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Họ và tên bệnh nhân:</span>
                      <strong className="text-slate-900">{prescription.patientName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã định danh (CCCD/BHYT):</span>
                      <span className="font-mono font-bold text-slate-800">{prescription.patientId}</span>
                    </div>
                  </div>
                </div>

                {/* Medical & Doctor Information */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    <span>Thông tin khám chữa bệnh</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bác sĩ / Cơ sở kê đơn:</span>
                      <strong className="text-slate-800">
                        {prescription.prescriberName || '—'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày kê đơn:</span>
                      <span className="text-slate-800 font-medium">
                        {prescription.issueDate ? formatDate(prescription.issueDate) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hiệu lực đến ngày:</span>
                      <strong className="text-emerald-700">
                        {prescription.validUntil ? formatDate(prescription.validUntil) : 'Chờ duyệt'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Original Prescription Image */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Ảnh chụp đơn thuốc gốc</span>
                  </span>
                  {prescription.imageUrl && (
                    <a
                      href={prescription.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                    >
                      <span>Mở ảnh lớn</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </h3>

                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-3 min-h-[300px]">
                  {prescription.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={prescription.imageUrl}
                      alt={`Đơn thuốc ${prescription.prescriptionId}`}
                      className="max-h-96 w-auto object-contain rounded-lg shadow-xs"
                    />
                  ) : (
                    <div className="text-center text-slate-400 space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-xs">Không có hình ảnh đính kèm</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prescribed Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>
                  Danh mục thuốc được kê trong đơn ({prescription.items?.length || 0} mục)
                </span>
                {prescription.status === 'PendingReview' && (
                  <span className="text-xs font-normal text-amber-700 italic">
                    Dược sĩ sẽ cập nhật danh mục khi duyệt đơn
                  </span>
                )}
              </div>

              {prescription.items && prescription.items.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="p-4">Tên thuốc</th>
                        <th className="p-4">Đơn vị</th>
                        <th className="p-4 text-center">SL kê đơn</th>
                        <th className="p-4 text-center">Đang giữ</th>
                        <th className="p-4 text-center">Đã cấp</th>
                        <th className="p-4 text-center">Còn lại được mua</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {prescription.items.map((item, idx) => (
                        <tr key={item.itemId || idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-4">
                            <span className="font-bold text-slate-900">{item.drugName}</span>
                            {item.drugId && (
                              <div className="text-[11px] font-mono text-slate-400">
                                Mã: {item.drugId}
                              </div>
                            )}
                          </td>
                          <td className="p-4">{item.saleUnit}</td>
                          <td className="p-4 text-center font-bold text-slate-900">
                            {item.prescribedQuantity}
                          </td>
                          <td className="p-4 text-center text-slate-600">
                            {item.reservedQuantity}
                          </td>
                          <td className="p-4 text-center text-slate-600">
                            {item.dispensedQuantity}
                          </td>
                          <td className="p-4 text-center font-extrabold text-emerald-700">
                            {item.remainingQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có danh mục thuốc chi tiết cho đơn này.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
