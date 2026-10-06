'use client';
import { ActionButton } from '@/components/ActionButton';

import React, { useState, Suspense } from 'react';
import { LoadingState } from '@/components/Status';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useGuestOnly } from '@/context/AuthContext';
import { ApiException } from '@/lib/api';
import { isSafeLocalUrl } from '@/lib/url';
import { Pill, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

function LoginForm() {
  const { login } = useAuth();
  const { isGuest, loading: authLoading } = useGuestOnly();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lỗi hiển thị theo trường và lỗi chung
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setGeneralError(null);
    setFieldErrors({});

    // Client-side quick check
    const errors: Record<string, string[]> = {};
    if (!username.trim()) {
      errors.username = ['Vui lòng nhập tên đăng nhập'];
    }
    if (!password) {
      errors.password = ['Vui lòng nhập mật khẩu'];
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const me = await login({
        username: username.trim(),
        password,
      });

      // Nếu có tham số next an toàn và user là role 'User', điều hướng về next; ngược lại dùng homePath
      if (me.role === 'User' && isSafeLocalUrl(nextPath)) {
        router.replace(nextPath!);
      } else {
        router.replace(me.homePath || '/');
      }
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        if (err.errors && Object.keys(err.errors).length > 0) {
          setFieldErrors(err.errors);
        }
        setGeneralError(err.title || 'Đăng nhập không thành công');
      } else {
        setGeneralError('Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.');
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
          Đăng nhập hệ thống
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Hoặc{' '}
          <Link
            href={`/register${isSafeLocalUrl(nextPath) ? `?next=${encodeURIComponent(nextPath!)}` : ''}`}
            className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
          >
            đăng ký tài khoản khách hàng mới
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {/* General Error Banner */}
          {generalError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-sm text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{generalError}</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  Vui lòng kiểm tra lại tên đăng nhập hoặc mật khẩu.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                Tên đăng nhập
              </label>
              <div className="mt-1 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập (vd: user, staff, admin)"
                  className={`block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border focus:outline-none transition ${
                    fieldErrors.username
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  }`}
                />
              </div>
              {fieldErrors.username && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">
                  {fieldErrors.username.join(', ')}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Mật khẩu
              </label>
              <div className="mt-1 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">
                  {fieldErrors.password.join(', ')}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <ActionButton busy={submitting}
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition"
              >
                {submitting ? 'Đang xác thực...' : 'Đăng nhập'}
              </ActionButton>
            </div>
          </form>

          {/* Demo account quick hint */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-2 font-medium">
              Gợi ý tài khoản demo kiểm thử:
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-center font-mono">
              <button
                type="button"
                onClick={() => {
                  setUsername('user');
                  setPassword('User@12345');
                }}
                className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-slate-200 transition"
              >
                user / User@12345
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('staff');
                  setPassword('Staff@12345');
                }}
                className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-slate-200 transition"
              >
                staff / Staff@12345
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('Admin@12345');
                }}
                className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-slate-200 transition"
              >
                admin / Admin@12345
              </button>
            </div>
          </div>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
