'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoginInput, Me, RegisterInput, Role } from '@/lib/types';
import { authApi, refreshCsrf } from '@/lib/api';

interface AuthContextType {
  user: Me | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<Me>;
  register: (input: RegisterInput) => Promise<Me>;
  logout: () => Promise<void>;
  loggingOut: boolean;
  refreshUser: () => Promise<Me | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutLock = useRef(false);

  const refreshUser = useCallback(async (): Promise<Me | null> => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput): Promise<Me> => {
    const me = await authApi.login(input);
    setUser(me);
    await refreshCsrf();
    return me;
  };

  const register = async (input: RegisterInput): Promise<Me> => {
    const me = await authApi.register(input);
    // Theo API contract F001: 201 Me, role luôn User, KHÔNG tự đăng nhập
    return me;
  };

  const logout = async (): Promise<void> => {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLoggingOut(true);
    try {
      await authApi.logout();
      setUser(null);
      await refreshCsrf();
    } finally {
      logoutLock.current = false;
      setLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loggingOut,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}

/**
 * Hook bảo vệ route theo role ở phía client (NFR-02, NFR-05)
 * @param allowedRoles Danh sách các role được phép truy cập
 */
export function useRequireAuth(allowedRoles?: Role[]) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Chưa đăng nhập
    if (!user) {
      if (allowedRoles && allowedRoles.length > 0) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // Đã đăng nhập nhưng không có role phù hợp
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.replace(user.homePath || '/');
    }
  }, [user, loading, allowedRoles, router, pathname]);

  return { user, loading, authorized: user ? (!allowedRoles || allowedRoles.includes(user.role)) : false };
}

/**
 * Hook cho trang công khai chỉ dành cho Guest (Login, Register).
 * Nếu đã đăng nhập thì tự động chuyển về homePath.
 */
export function useGuestOnly() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.homePath || '/');
    }
  }, [user, loading, router]);

  return { isGuest: !user, loading };
}
