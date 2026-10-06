import { RefreshCw, AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ message = 'Đang tải dữ liệu...' }: { message?: string }) {
  return <div role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"><RefreshCw aria-hidden="true" className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-700" />{message}</div>;
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><AlertCircle aria-hidden="true" className="mb-2 h-5 w-5" /><p>{message}</p>{retry && <button onClick={retry} className="mt-3 rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white">Thử lại</button>}</div>;
}
export function EmptyState({ message = 'Không có dữ liệu phù hợp.' }: { message?: string }) {
  return <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"><Inbox aria-hidden="true" className="mx-auto mb-3 h-6 w-6" />{message}</div>;
}
