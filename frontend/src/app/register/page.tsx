'use client';
import { ActionButton } from '@/components/ActionButton';

import React, { useState, Suspense } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useGuestOnly } from '@/context/AuthContext';
import { ApiException } from '@/lib/api';
import { isSafeLocalUrl } from '@/lib/url';
import {
  Pill,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

function RegisterForm() {
  const { register } = useAuth();
  const { isGuest, loading: authLoading } = useGuestOnly();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successUsername, setSuccessUsername] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setGeneralError(null);
    setFieldErrors({});

    const errors: Record<string, string[]> = {};
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      errors.username = ['Vui lòng nhập tên đăng nhập'];
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      errors.username = ['Tên đăng nhập phải từ 3 đến 30 ký tự'];
    } else if (!/^[A-Za-z0-9._-]+$/.test(trimmedUsername)) {
      errors.username = [
        'Tên đăng nhập chỉ gồm chữ cái, chữ số, dấu chấm, gạch dưới hoặc gạch ngang',
      ];
    }

    if (!password) {
      errors.password = ['Vui lòng nhập mật khẩu'];
    } else if (password.length < 8 || password.length > 128) {
      errors.password = ['Mật khẩu phải từ 8 đến 128 ký tự'];
    }

    if (!confirmPassword) {
      errors.confirmPassword = ['Vui lòng xác nhận lại mật khẩu'];
    } else if (password !== confirmPassword) {
      errors.confirmPassword = ['Mật khẩu xác nhận không khớp'];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username: trimmedUsername,
        password,
        confirmPassword,
      });

      // Đăng ký thành công (theo API Contract F001: không tự đăng nhập)
      setSuccessUsername(trimmedUsername);
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        if (err.errors && Object.keys(err.errors).length > 0) {
          setFieldErrors(err.errors);
        }
        setGeneralError(err.title || 'Đăng ký không thành công');
      } else {
        setGeneralError('Đã có lỗi kết nối máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isGuest) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-2 text-emerald-700 font-bold text-2xl">
            <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-md">
              <Pill className="w-8 h-8" />
            </span>
            <span>Pharmacy System</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Đăng ký tài khoản
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link
            href={`/login${isSafeLocalUrl(nextPath) ? `?next=${encodeURIComponent(nextPath!)}` : ''}`}
            className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {/* Success State */}
          {successUsername ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Đăng ký thành công!</h3>
              <p className="text-sm text-slate-600">
                Tài khoản <strong className="text-slate-900 font-semibold">{successUsername}</strong>{' '}
                đã được tạo thành công với vai trò Khách hàng (User).
              </p>
              <div className="pt-2">
                <Link
                  href={`/login?username=${encodeURIComponent(successUsername)}${
                    isSafeLocalUrl(nextPath) ? `&next=${encodeURIComponent(nextPath!)}` : ''
                  }`}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition"
                >
                  <span>Chuyển tới đăng nhập ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* General Error Banner */}
              {generalError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-sm text-rose-800">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{generalError}</p>
                    <p className="text-xs text-rose-600 mt-0.5">
                      Vui lòng sửa các thông tin chưa chính xác bên dưới.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label htmlFor="reg-username" className="block text-sm font-semibold text-slate-700">
                    Tên đăng nhập
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      id="reg-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="3-30 ký tự, chỉ gồm chữ, số, ., _, -"
                      className={`block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border focus:outline-none transition ${
                        fieldErrors.username
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      }`}
                    />
                  </div>
                  {fieldErrors.username ? (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                      {fieldErrors.username.join(', ')}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Độ dài 3–30 ký tự. Không phân biệt chữ hoa/thường.
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-700">
                    Mật khẩu
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border focus:outline-none transition ${
                        fieldErrors.password
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                      {fieldErrors.password.join(', ')}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">Từ 8 đến 128 ký tự.</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="reg-confirmPassword" className="block text-sm font-semibold text-slate-700">
                    Xác nhận mật khẩu
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="reg-confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu giống bên trên"
                      className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border focus:outline-none transition ${
                        fieldErrors.confirmPassword
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                      {fieldErrors.confirmPassword.join(', ')}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <ActionButton busy={submitting}
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition"
                  >
                    {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
                  </ActionButton>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-emerald-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ sản phẩm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
