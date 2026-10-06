'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function ActionLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <Link href={href} aria-busy={busy} aria-disabled={busy} className={`${className || ''} ${busy ? 'pointer-events-none opacity-60' : ''}`} onClick={event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    router.push(href);
  }}>{busy ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Đang xử lý…</span></> : children}</Link>;
}
