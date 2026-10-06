'use client';
import { useState } from 'react';
import { ActionButton } from '../ActionButton';
import { Field, buttonClass } from '../backoffice/shared';
import { ApiException, prescriptionsApi } from '@/lib/api';
import { notifyError } from '@/lib/feedback';
import type { PrescriptionView } from '@/lib/types';

export function CheckoutPrescription({ options, value, onChange, onCreated, disabled, onBusy, error, retry }: {
  options: PrescriptionView[]; value: string; onChange: (id: string) => void;
  onCreated: (p: PrescriptionView) => void; disabled: boolean; onBusy: (busy: boolean) => void;
  error?: string | null; retry: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setTitle(''); setFields({});
    if (!file || !['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFields({ image: ['Chọn ảnh PNG/JPG không quá 5 MB.'] }); return;
    }
    setBusy(true); onBusy(true);
    try {
      const data = new FormData();
      data.append('patientName', patientName.trim()); data.append('patientId', patientId.trim()); data.append('image', file);
      const prescription = await prescriptionsApi.createPrescription(data);
      onCreated(prescription); setCreating(false);
    } catch (err) {
      notifyError(err);
      setTitle(err instanceof ApiException ? err.title : 'Không thể gửi ảnh đơn thuốc.');
      if (err instanceof ApiException) setFields(err.errors || {});
    } finally { setBusy(false); onBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="font-bold">Đơn thuốc</h2>
    <p className="text-sm text-slate-600">Giỏ có thuốc kê đơn hoặc kiểm soát đặc biệt. Đơn thuốc mới sẽ chờ dược sĩ kiểm tra trước khi thanh toán.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled || busy} className={buttonClass} aria-pressed={!creating} onClick={() => { setCreating(false); onChange(options[0]?.prescriptionId || ''); }}>Chọn đơn thuốc đã gửi</button>
      <button type="button" disabled={disabled || busy} className={buttonClass} aria-pressed={creating} onClick={() => { setCreating(true); onChange(''); }}>Tải ảnh đơn thuốc mới</button>
    </div>
    {!creating ? <>
      {error && <p role="alert" className="text-sm text-rose-700">{error} <button type="button" onClick={retry} className="underline">Thử lại</button></p>}
      <label htmlFor="checkout-prescription" className="block text-sm font-semibold">Chọn đơn thuốc của bạn</label>
      <select id="checkout-prescription" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full min-w-0 rounded-lg border border-slate-300 p-2 text-sm">
        <option value="">Chọn đơn thuốc</option>
        {options.map(p => <option key={p.prescriptionId} value={p.prescriptionId}>{p.prescriptionId} — {p.patientName} ({p.status === 'Approved' ? 'Đã duyệt' : 'Chờ kiểm tra'})</option>)}
      </select>
      {!options.length && <p className="text-sm text-slate-600">Bạn chưa có đơn thuốc khả dụng. Có thể tải ảnh ngay tại đây.</p>}
    </> : <form onSubmit={upload} className="space-y-3">
      {title && <p role="alert" className="text-sm text-rose-700">{title}</p>}
      <Field label="Tên người bệnh" name="patientName" value={patientName} onChange={e => setPatientName(e.target.value)} required disabled={disabled || busy} errors={fields} />
      <Field label="Mã người bệnh (CCCD/BHYT)" name="patientId" value={patientId} onChange={e => setPatientId(e.target.value)} required disabled={disabled || busy} errors={fields} />
      <label htmlFor="checkout-prescription-image" className="block text-sm font-semibold">Ảnh đơn thuốc (PNG/JPG, tối đa 5 MB)</label>
      <input id="checkout-prescription-image" type="file" accept="image/png,image/jpeg" required disabled={disabled || busy} className="block w-full min-w-0 text-sm" onChange={e => setFile(e.target.files?.[0] || null)} />
      {fields.image && <p className="text-sm text-rose-700">{fields.image.join(' ')}</p>}
      <ActionButton busy={busy} disabled={disabled} className={buttonClass}>Gửi ảnh đơn thuốc</ActionButton>
    </form>}
  </section>;
}
