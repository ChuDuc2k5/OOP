'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { TOAST_EVENT, type ToastMessage } from '@/lib/feedback';

const ToastContext = createContext<(toast: ToastMessage) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastMessage & { id: number }) | null>(null);
  const sequence = useRef(0);
  const host = useRef<HTMLDivElement>(null);
  const show = useCallback((message: ToastMessage) => setToast({ ...message, id: ++sequence.current }), []);
  useEffect(() => {
    const listen = (event: Event) => show((event as CustomEvent<ToastMessage>).detail);
    window.addEventListener(TOAST_EVENT, listen);
    return () => window.removeEventListener(TOAST_EVENT, listen);
  }, [show]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const root = document.documentElement;
    if (!host.current || !toast) { root.style.setProperty('--toast-height', '0px'); return; }
    const update = () => root.style.setProperty('--toast-height', `${host.current?.getBoundingClientRect().height || 0}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host.current);
    return () => { observer.disconnect(); root.style.setProperty('--toast-height', '0px'); };
  }, [toast]);
  const Icon = toast?.kind === 'error' ? AlertCircle : toast?.kind === 'success' ? CheckCircle2 : Info;
  return <ToastContext.Provider value={show}>
    <div aria-live="polite" aria-atomic="true" className="fixed inset-x-0 top-0 z-[80] pointer-events-none">
      {toast && <div ref={host} className="p-2 sm:p-3" data-testid="toast">
        <div className={`pointer-events-auto mx-auto flex max-w-xl items-start gap-3 rounded-xl border p-3 shadow-lg ${toast.kind === 'error' ? 'bg-rose-50 border-rose-300 text-rose-900' : toast.kind === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-blue-50 border-blue-300 text-blue-950'}`}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm break-words"><p>{toast.message}</p>{toast.href && <Link className="mt-1 inline-block font-bold underline" href={toast.href} onClick={() => setToast(null)}>{toast.label}</Link>}</div>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)} className="shrink-0 rounded p-1 hover:bg-black/5"><X className="h-5 w-5" /></button>
        </div>
      </div>}
    </div>
    {children}
  </ToastContext.Provider>;
}
