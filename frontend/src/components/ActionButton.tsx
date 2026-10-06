'use client';
import type { ButtonHTMLAttributes } from 'react';
import { RefreshCw } from 'lucide-react';
export function ActionButton({ busy, compact, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; compact?: boolean }) {
  return <button {...props} disabled={disabled || busy} aria-busy={!!busy}>{busy ? <span className="inline-flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" /><span className={compact ? 'sr-only' : undefined}>Đang xử lý…</span></span> : children}</button>;
}
