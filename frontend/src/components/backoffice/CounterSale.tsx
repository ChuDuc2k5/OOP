'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { productsApi } from '@/lib/api';
import { staffSalesApi } from '@/lib/backoffice-api';
import { notify } from '@/lib/feedback';
import type { Product, SaleView } from '@/lib/types';
import { formatVND, SALE_KIND_LABELS } from '@/lib/format';
import { ActionButton } from '../ActionButton';
import { buttonClass, Card, Field, Feedback, Page, Table, useAction, useBasePath } from './shared';

export default function CounterSale() {
  const base = useBasePath(); const router = useRouter();
  const action = useAction(); const searchAction = useAction();
  const [search, setSearch] = useState(''); const [products, setProducts] = useState<Product[]>([]);
  const [searched, setSearched] = useState(false);
  const [lines, setLines] = useState<{ product: Product; quantity: number }[]>([]);
  const [prescriptionId, setPrescriptionId] = useState(''); const [patientId, setPatientId] = useState('');
  const [draft, setDraft] = useState<SaleView | null>(null);
  const kind = lines.some(l => l.product.requiresPrescription || l.product.isControlled) ? 'Prescription' : 'OTC';
  const incompatible = !!draft && draft.kind !== kind;
  const total = lines.reduce((sum, l) => sum + (l.product.unitPrice || 0) * l.quantity, 0);
  function add(product: Product) {
    setLines(old => old.some(l => l.product.drugId === product.drugId) ? old.map(l => l.product.drugId === product.drugId ? { ...l, quantity: l.quantity + 1 } : l) : [...old, { product, quantity: 1 }]);
  }
  function checkout() {
    void action.run(async () => {
      let current = draft ? await staffSalesApi.get(draft.saleId) : await staffSalesApi.create({ kind, ...(kind === 'Prescription' ? { prescriptionId: prescriptionId.trim(), patientId: patientId.trim() } : {}) });
      setDraft(current);
      if (current.status === 'Completed') return current;
      current = await staffSalesApi.update(current.saleId, { items: lines.map(l => ({ drugId: l.product.drugId, quantity: l.quantity })), ...(kind === 'Prescription' ? { prescriptionId: prescriptionId.trim(), patientId: patientId.trim() } : {}) });
      setDraft(current);
      if (!current.canCheckout) {
        const message = 'Nháp chưa đủ điều kiện hoàn tất. Vui lòng sửa các vấn đề bên dưới.';
        action.setError(message); notify({ kind: 'error', message }); return null;
      }
      const completed = await staffSalesApi.checkout(current.saleId);
      setDraft(completed); return completed;
    }, completed => {
      if (!completed?.invoiceId) return;
      notify({ kind: 'success', message: `Đã thu tiền mặt và lập hóa đơn ${completed.invoiceId}` });
      router.push(`${base}/invoices/${encodeURIComponent(completed.invoiceId)}`);
    });
  }
  return <Page title="Bán tại quầy" actions={<Link className={buttonClass} href={`${base}/sales`}>Danh sách nháp</Link>}>
    <Feedback {...action} />
    {draft && <Card>
      <p>Nháp {draft.saleId} · {SALE_KIND_LABELS[draft.kind]}</p>
      <Link href={`${base}/sales/${draft.saleId}`} className="font-semibold underline">Mở nháp để tiếp tục</Link>
      {draft.issues.length > 0 && <ul role="alert" className="list-disc space-y-1 pl-5 text-rose-700">{draft.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
      {incompatible && <p role="alert" className="text-rose-700">Loại nháp đã cố định. Mở nháp để sửa hoặc bắt đầu giao dịch mới.</p>}
      <button disabled={action.busy} className={buttonClass} onClick={() => { setDraft(null); setLines([]); setPrescriptionId(''); setPatientId(''); action.setError(''); }}>Bắt đầu giao dịch mới</button>
    </Card>}
    <Card><form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void searchAction.run(() => productsApi.getProducts({ search: search.trim(), pageSize: 20 }), result => { setProducts(result.items); setSearched(true); }); }}>
      <Field label="Tìm thuốc theo mã/tên" value={search} onChange={e => setSearch(e.target.value)} disabled={action.busy} />
      <ActionButton busy={searchAction.busy} disabled={action.busy} className={buttonClass}>Tra cứu thuốc</ActionButton>
    </form><Feedback {...searchAction} />
      <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">{products.map(p => <button type="button" key={p.drugId} disabled={action.busy || !p.inStock || p.unitPrice === undefined} className="rounded-lg border p-3 text-left text-sm hover:bg-emerald-50 disabled:bg-slate-100 disabled:text-slate-400" onClick={() => add(p)}>{p.name} ({p.drugId}) · {formatVND(p.unitPrice)} / {p.saleUnit}{!p.inStock && ' · Hết hàng'}</button>)}{searched && !products.length && <p role="status">Không tìm thấy thuốc.</p>}</div>
    </Card>
    <form onSubmit={e => { e.preventDefault(); checkout(); }} className="space-y-4">
      <Card><Table headers={['Thuốc', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thao tác']}>
        {lines.map((l, i) => <tr key={l.product.drugId}><td>{l.product.name} ({l.product.drugId})</td><td><Field label={`Số lượng dòng ${i + 1}`} type="number" name={`items[${i}].quantity`} value={l.quantity} min={1} step={1} required errors={action.fields} disabled={action.busy} onChange={e => setLines(old => old.map((line, j) => i === j ? { ...line, quantity: Number(e.target.value) } : line))} /></td><td>{formatVND(l.product.unitPrice)}</td><td>{formatVND((l.product.unitPrice || 0) * l.quantity)}</td><td><button type="button" className={buttonClass} disabled={action.busy} onClick={() => setLines(old => old.filter((_, j) => i !== j))}>Xóa dòng</button></td></tr>)}
      </Table>{!lines.length && <p role="status" className="mt-3 text-slate-600">Chưa có thuốc. Tra cứu và chọn thuốc để bắt đầu.</p>}<p className="mt-4 text-right text-xl font-bold">Tổng tiền thuốc: {formatVND(total)}</p></Card>
      {kind === 'Prescription' && <Card><h2 className="font-bold">Đơn thuốc</h2><div className="grid gap-3 sm:grid-cols-2"><Field label="Mã đơn thuốc" name="prescriptionId" value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)} required disabled={action.busy} errors={action.fields} /><Field label="Mã người bệnh" name="patientId" value={patientId} onChange={e => setPatientId(e.target.value)} required disabled={action.busy} errors={action.fields} /></div></Card>}
      <p className="text-sm text-slate-600">Bấm hoàn tất khi đã nhận đủ tiền mặt từ khách.</p>
      <ActionButton busy={action.busy} disabled={!lines.length || incompatible} className={buttonClass}>Thu tiền mặt &amp; hoàn tất</ActionButton>
    </form>
  </Page>;
}
