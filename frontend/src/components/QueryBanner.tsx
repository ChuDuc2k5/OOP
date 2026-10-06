'use client';
import { Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
function Banner({ param, children }: { param: string; children: ReactNode }) {
  return useSearchParams().get(param) === '1' ? <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-950">{children}</div> : null;
}
export function QueryBanner(props: { param: string; children: ReactNode }) {
  return <Suspense fallback={null}><Banner {...props} /></Suspense>;
}
