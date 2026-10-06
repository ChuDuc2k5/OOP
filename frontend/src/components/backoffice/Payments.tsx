"use client";
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '@/components/ActionButton';
import { staffPaymentsApi, staffOrdersApi, type ListQuery } from '@/lib/backoffice-api';
import { ApiException } from '@/lib/api';
import { notify } from '@/lib/feedback';
import type { PaymentRow, PaymentReviewResult } from '@/lib/types';
import { formatDateTime, formatVND } from '@/lib/format';
import { buttonClass, Card, DetailLink, Field, Feedback, RecordList, useAction, useBasePath } from './shared';

const listPending = (query: ListQuery) => staffPaymentsApi.list({ ...query, status: 'PendingReview' });
export type ReviewMode = 'full' | 'short';
export function ReviewForm({ payment, refresh, close, mode = 'full' }: {
  payment: PaymentRow;
  refresh: (failure?: string) => void | Promise<void>;
  close?: () => void;
  mode?: ReviewMode;
}) {
  const action = useAction();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<PaymentReviewResult | null>(null);
  const [fulfillError, setFulfillError] = useState('');
  async function fulfillConfirmed() {
    try {
      const invoice = await staffOrdersApi.fulfill(payment.orderId, true);
      const message = `Đã xác nhận tiền và lập hóa đơn ${invoice.invoiceId}`;
      setFulfillError('');
      action.setSuccess(message);
      notify({ kind: 'success', message });
      await refresh();
    } catch (error) {
      const title = error instanceof ApiException ? error.title : 'Không thể xuất kho. Vui lòng thử lại.';
      const message = `Đã xác nhận tiền nhưng chưa xuất kho được: ${title}`;
      setFulfillError(message);
      notify({ kind: 'error', message });
      await refresh(message);
    }
  }
  return <dialog ref={dialog} aria-labelledby="payment-review-title" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl bg-transparent p-0 backdrop:bg-slate-900/50" onCancel={e => { e.preventDefault(); if (!action.busy) close?.(); }}><Card>
    <h2 id="payment-review-title" className="font-bold">{mode === 'full' ? `Xác nhận đã nhận ${formatVND(payment.expectedAmount)} cho ${payment.orderId}?` : `Ghi nhận chuyển thiếu cho ${payment.orderId}`}</h2>
    <Feedback {...action} />
    {result && !result.approved && <div role="status" className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-amber-950"><strong>Chuyển thiếu – chưa duyệt thanh toán</strong><p>{result.payment.reviewNote}</p><p>Thực nhận: {formatVND(result.payment.receivedAmount)} / Yêu cầu: {formatVND(payment.expectedAmount)}</p></div>}
    {fulfillError && <div role="alert" className="space-y-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900"><p>{fulfillError}</p><ActionButton busy={action.busy} className={buttonClass} onClick={() => void action.run(fulfillConfirmed)}>Thử xuất kho lại</ActionButton></div>}
    {!result?.approved && <form className="space-y-4" onSubmit={e => {
      e.preventDefault();
      void action.run(() => staffPaymentsApi.review(payment.paymentId, mode === 'full'
        ? { bankReference: reference.trim() || undefined }
        : { bankReference: reference.trim() || undefined, receivedAmount: Number(amount), note: note.trim() }, true), async value => {
        setResult(value);
        if (value.approved) await fulfillConfirmed();
        else {
          notify({ kind: 'info', message: `Chuyển thiếu – chưa duyệt thanh toán. ${value.payment.reviewNote || ''}` });
          await refresh();
        }
      });
    }}>
      <Field label="Mã giao dịch ngân hàng (tùy chọn)" name="bankReference" value={reference} onChange={e => setReference(e.target.value)} errors={action.fields} disabled={action.busy} />
      {mode === 'short' && <>
        <Field label="Số tiền thực nhận (VND)" name="receivedAmount" type="number" min={0} max={Math.max(0, payment.expectedAmount - 1)} step={1} value={amount} onChange={e => setAmount(e.target.value)} required errors={action.fields} disabled={action.busy} />
        <Field label="Ghi chú chuyển thiếu" name="note" value={note} onChange={e => setNote(e.target.value)} required errors={action.fields} disabled={action.busy} />
      </>}
      <div className="flex flex-wrap gap-2">
        <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy}>{mode === 'full' ? 'Xác nhận' : 'Ghi nhận chuyển thiếu'}</ActionButton>
        {close && <button type="button" className={buttonClass} onClick={close} disabled={action.busy}>Đóng</button>}
      </div>
    </form>}
    {result?.approved && close && <button type="button" className={buttonClass} onClick={close} disabled={action.busy}>Đóng</button>}
  </Card></dialog>;
}

export function PaymentButtons({ onSelect, disabled = false }: { onSelect: (mode: ReviewMode) => void; disabled?: boolean }) {
  return <div className="flex flex-wrap gap-2">
    <button type="button" className={`${buttonClass} bg-emerald-700 text-white`} disabled={disabled} onClick={() => onSelect('full')}>Đã nhận đủ tiền</button>
    <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={disabled} onClick={() => onSelect('short')}>Chưa đủ tiền</button>
  </div>;
}
export default function Payments() {
  const base = useBasePath();
  const [selected, setSelected] = useState<{ payment: PaymentRow; mode: ReviewMode } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return <RecordList title="Thanh toán chờ duyệt" load={listPending} refreshKey={refreshKey} rowKey={p => p.paymentId}
    headers={['Đơn hàng', 'Khách hàng', 'Yêu cầu', 'Đã nhận', 'Mở lúc', 'Ghi chú', 'Thao tác']}
    row={p => <>
      <td><DetailLink href={`${base}/orders/${encodeURIComponent(p.orderId)}`}>{p.orderId}</DetailLink></td>
      <td>{p.customerUsername}</td><td>{formatVND(p.expectedAmount)}</td>
      <td>{p.receivedAmount == null ? 'Chưa đối chiếu' : formatVND(p.receivedAmount)}</td>
      <td>{formatDateTime(p.createdAt)}</td><td>{p.reviewNote}</td>
      <td><PaymentButtons onSelect={mode => setSelected({ payment: p, mode })} /></td>
    </>}>
    {selected && <ReviewForm key={`${selected.payment.paymentId}-${selected.mode}`} payment={selected.payment} mode={selected.mode} refresh={() => setRefreshKey(k => k + 1)} close={() => setSelected(null)} />}
  </RecordList>;
}
