'use client';

import React, { useState } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRequireAuth } from '@/context/AuthContext';
import { ApiException, prescriptionsApi } from '@/lib/api';
import {
  FileText,
  Upload,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  RefreshCw,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export default function NewPrescriptionPage() {
  const { user, loading: authLoading, authorized } = useRequireAuth(['User']);
  const router = useRouter();

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Validation & Submission states
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFileError(null);

    if (!selectedFile) {
      return;
    }

    // Check mime type and extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const isValidType =
      ALLOWED_TYPES.includes(selectedFile.type) || ['png', 'jpg', 'jpeg'].includes(ext || '');

    if (!isValidType) {
      setFileError('Chỉ chấp nhận tệp hình ảnh định dạng PNG, JPG hoặc JPEG.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // Check size limit: <= 5MB
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setFileError(`Kích thước tệp (${sizeMb} MB) vượt quá giới hạn tối đa cho phép là 5 MB.`);
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);
    // Create preview
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const clientErrors: Record<string, string[]> = {};

    if (!patientName.trim()) {
      clientErrors.patientName = ['Vui lòng nhập họ và tên bệnh nhân ghi trên đơn thuốc'];
    }

    if (!patientId.trim()) {
      clientErrors.patientId = [
        'Vui lòng nhập mã định danh bệnh nhân (CCCD, mã thẻ BHYT hoặc mã hồ sơ bệnh án)',
      ];
    }

    if (!file) {
      clientErrors.image = ['Vui lòng tải lên hình ảnh đơn thuốc hợp lệ (PNG/JPG <= 5MB)'];
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('patientName', patientName.trim());
      formData.append('patientId', patientId.trim());
      formData.append('image', file as Blob);

      const created = await prescriptionsApi.createPrescription(formData);
      router.push(`/prescriptions/${created.prescriptionId}`);
    } catch (err: unknown) {
      if (err instanceof ApiException) setFieldErrors(err.errors || {});
      setSubmitError(err instanceof ApiException ? err.title : 'Không thể tải lên đơn thuốc. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !authorized) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
            <span>/</span>
            <Link href="/prescriptions" className="hover:text-emerald-700">Đơn thuốc</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Gửi đơn thuốc mới</span>
          </div>
          <Link
            href="/prescriptions"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </Link>
        </div>

        {/* Page Title Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <Upload className="w-6 h-6 text-emerald-600" />
            <span>Gửi hình ảnh đơn thuốc</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Hệ thống nhà thuốc yêu cầu đơn thuốc hợp lệ do bác sĩ/bệnh viện cấp đối với tất cả các loại thuốc kê đơn (ETC) hoặc thuốc kiểm soát đặc biệt theo quy định của Bộ Y tế.
          </p>
        </div>

        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Gửi đơn thuốc thất bại</strong>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Patient Info Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>1. Thông tin bệnh nhân ghi trên đơn</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên bệnh nhân <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                    fieldErrors.patientName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.patientName && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">
                    {fieldErrors.patientName[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã định danh bệnh nhân (CCCD / BHYT / Mã hồ sơ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 001201000123"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                    fieldErrors.patientId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.patientId && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">
                    {fieldErrors.patientId[0]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>2. Hình ảnh đơn thuốc gốc</span> <span className="text-rose-500">*</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">Định dạng PNG/JPG/JPEG ≤ 5MB</span>
            </div>

            {/* Error banner for file validation */}
            {fileError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {fieldErrors.image && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fieldErrors.image[0]}</span>
              </div>
            )}

            {/* File Dropzone or Preview */}
            {!previewUrl ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20 group">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 mb-3 group-hover:scale-105 transition">
                  <Upload className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  Bấm vào đây để chọn tệp hình ảnh đơn thuốc
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Chỉ nhận định dạng PNG, JPG, JPEG (tối đa 5 MB)
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {file?.name}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      ({file ? (file.size / 1024).toFixed(1) : 0} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition"
                    title="Xóa tệp đã chọn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Xem trước đơn thuốc"
                    className="max-h-80 w-auto object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quy định lưu ý */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <strong className="text-slate-800 font-semibold block flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Lưu ý quan trọng từ Dược sĩ:</span>
            </strong>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li>Hình ảnh chụp đơn thuốc phải rõ nét, thấy đầy đủ thông tin: Bác sĩ, Ngày khám, Chữ ký/Con dấu cơ sở y tế.</li>
              <li>Sau khi gửi, dược sĩ sẽ kiểm tra và nhập chi tiết thuốc kê đơn. Đơn thuốc được duyệt sẽ có thể dùng để đặt thuốc kê đơn (ETC) tại giỏ hàng.</li>
            </ul>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <Link
              href="/prescriptions"
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
            >
              Hủy bỏ
            </Link>
            <button
              type="submit"
              disabled={submitting || !file}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Gửi đơn thuốc</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
