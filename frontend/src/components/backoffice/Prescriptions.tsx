"use client";
import { ActionButton } from '@/components/ActionButton';
import Image from "next/image";
import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/Status";
import { notify } from "@/lib/feedback";
import { staffPrescriptionsApi } from "@/lib/backoffice-api";
import type { PrescriptionDetailsInput, PrescriptionView } from "@/lib/types";
import {
  formatDate,
  formatDateTime,
  PRESCRIPTION_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from "@/lib/format";
import {
  buttonClass,
  Card,
  DetailLink,
  Field,
  Feedback,
  LoadState,
  Page,
  ReasonActions,
  RecordList,
  Table,
  useAction,
  useBasePath,
  useResource,
} from "./shared";
import DrugLines from "./DrugLines";

export function PrescriptionList() {
  return <Suspense fallback={<LoadingState />}><PrescriptionListContent /></Suspense>;
}
function PrescriptionListContent() {
  const base = useBasePath();
  const requestedStatus = useSearchParams().get('status') || '';
  const initialStatus = Object.hasOwn(PRESCRIPTION_STATUS_LABELS, requestedStatus) ? requestedStatus : '';
  return (
    <RecordList
      key={initialStatus}
      initialStatus={initialStatus}
      title="Đơn thuốc"
      load={staffPrescriptionsApi.list}
      statuses={PRESCRIPTION_STATUS_LABELS}
      createHref={`${base}/prescriptions/new`}
      rowKey={(p) => p.prescriptionId}
      headers={[
        "Mã đơn",
        "Người bệnh",
        "Mã người bệnh",
        "Chủ đơn",
        "Trạng thái",
        "Ngày tạo",
        "Hiệu lực đến",
      ]}
      row={(p) => (
        <>
          <td>
            <DetailLink
              href={`${base}/prescriptions/${encodeURIComponent(p.prescriptionId)}`}
            >
              {p.prescriptionId}
            </DetailLink>
          </td>
          <td>{p.patientName}</td>
          <td>{p.patientId}</td>
          <td>{p.ownerUsername || "Tại quầy"}</td>
          <td>{PRESCRIPTION_STATUS_LABELS[p.status]}</td>
          <td>{formatDateTime(p.createdAt)}</td>
          <td>{formatDate(p.validUntil)}</td>
        </>
      )}
    />
  );
}
const emptyDetails: PrescriptionDetailsInput = {
  patientId: "",
  patientName: "",
  prescriberName: "",
  issueDate: "",
  validUntil: "",
  items: [],
};
function detailsFrom(p: PrescriptionView): PrescriptionDetailsInput {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const validUntil = new Date(`${today}T00:00:00Z`);
  validUntil.setUTCDate(validUntil.getUTCDate() + 30);
  const items = p.items.map(i => ({ drugId: i.drugId, quantity: i.prescribedQuantity }));
  if (!items.length && p.status === 'PendingReview') {
    for (const order of (p.linkedOrders || []).filter(o => o.status === 'WaitingReview')) {
      for (const item of order.items) {
        const existing = items.find(i => i.drugId === item.drugId);
        if (existing) existing.quantity += item.quantity;
        else items.push({ drugId: item.drugId, quantity: item.quantity });
      }
    }
  }
  return {
    patientId: p.patientId,
    patientName: p.patientName,
    prescriberName: p.prescriberName || "",
    issueDate: p.issueDate || today,
    validUntil: p.validUntil || validUntil.toISOString().slice(0, 10),
    items,
  };
}
function PrescriptionForm({
  initial,
  prescriptionId,
  creating,
  onSaved,
}: {
  initial?: PrescriptionView;
  prescriptionId?: string;
  creating?: boolean;
  onSaved: (p: PrescriptionView) => void;
}) {
  const [form, setForm] = useState(
    initial ? detailsFrom(initial) : emptyDetails,
  );
  const [paperId, setPaperId] = useState("");
  const [editingLines, setEditingLines] = useState(!initial?.linkedOrders?.length);
  const action = useAction();
  useEffect(() => {
    if (initial) setForm(detailsFrom(initial));
  }, [initial]);
  const fields = [
    ["patientId", "Mã người bệnh (CCCD/BHYT)", "text"],
    ["patientName", "Tên người bệnh", "text"],
    ["prescriberName", "Người kê đơn (bắt buộc)", "text"],
    ["issueDate", "Ngày kê đơn", "date"],
    ["validUntil", "Hiệu lực đến", "date"],
  ] as const;
  const waitingOrders = (initial?.linkedOrders || []).filter(o => o.status === 'WaitingReview');
  const prefilled = initial && !initial.items.length && waitingOrders.length > 0;
  const missing: string[] = fields.filter(([key]) => !form[key].trim()).map(([, label]) => label);
  if (creating && !paperId.trim()) missing.push('Mã đơn giấy');
  if (!form.items.length) missing.push('Ít nhất một dòng thuốc');
  else if (form.items.some(i => !i.drugId.trim() || !Number.isInteger(i.quantity) || i.quantity < 1)) missing.push('Mã thuốc và số lượng nguyên dương ở mỗi dòng');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (form.issueDate > today) missing.push('Ngày kê không được sau hôm nay');
  if (form.issueDate && form.validUntil && form.validUntil < form.issueDate) missing.push('Hiệu lực đến phải từ ngày kê trở đi');
  const names = new Map(initial?.items.map(i => [i.drugId, { name: i.drugName, unit: i.saleUnit }]) || []);
  for (const order of initial?.linkedOrders || []) for (const item of order.items) names.set(item.drugId, { name: item.drugName, unit: item.unit });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (missing.length || action.busy) return;
        void action.run(
          async () => {
            if (creating) return staffPrescriptionsApi.create({
                  ...form,
                  prescriptionId: paperId.trim(),
                });
            await staffPrescriptionsApi.update(prescriptionId!, form, true);
            return staffPrescriptionsApi.action(prescriptionId!, 'approve', undefined, true);
          },
          (p) => {
            onSaved(p);
            const transitioned = (p.linkedOrders || []).filter(o => o.status === 'AwaitingPayment' && waitingOrders.some(before => before.orderId === o.orderId));
            const message = creating ? 'Đã tiếp nhận đơn tại quầy.' : `Đã chấp nhận đơn thuốc.${transitioned.length ? ` Đơn hàng ${transitioned.map(o => o.orderId).join(', ')} đã chuyển sang Chờ thanh toán.` : ''}`;
            action.setSuccess(message);
            if (!creating) notify({ kind: 'success', message });
          },
        );
      }}
    >
      <Feedback {...action} />
      {prefilled && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">Điền sẵn từ đơn hàng {waitingOrders.map(o => o.orderId).join(', ')}, vui lòng đối chiếu với ảnh đơn thuốc.</p>}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {creating && (
            <Field
              label="Mã đơn giấy"
              name="prescriptionId"
              value={paperId}
              onChange={(e) => setPaperId(e.target.value)}
              errors={action.fields}
              required
              disabled={action.busy}
            />
          )}
          {fields.map(([key, label, type]) => (
            <Field
              key={key}
              label={label}
              name={key}
              type={type}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              errors={action.fields}
              required
              autoFocus={key === 'prescriberName' && !creating}
              disabled={action.busy}
            />
          ))}
        </div>
      </Card>
      <button type="button" className={buttonClass} aria-expanded={editingLines} aria-controls="prescription-drug-lines" disabled={action.busy} onClick={() => setEditingLines(!editingLines)}>Thêm/sửa dòng thuốc</button>
      <div id="prescription-drug-lines">
      {editingLines ? <DrugLines
        value={form.items}
        onChange={(items) => setForm({ ...form, items })}
        errors={action.fields}
        disabled={action.busy}
      /> : <Card>
        <h3 className="font-semibold">Dòng thuốc cần đối chiếu</h3>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 px-3">
          {form.items.map((i, index) => <li key={index} className="flex items-start justify-between gap-3 py-3 text-sm">
            <span className="min-w-0 break-words">{names.get(i.drugId)?.name || i.drugId} ({i.drugId})</span>
            <strong className="shrink-0 whitespace-nowrap">{i.quantity} {names.get(i.drugId)?.unit}</strong>
          </li>)}
        </ul>
        {!form.items.length && <p>Chưa có dòng thuốc. Bấm “Thêm/sửa dòng thuốc” để nhập.</p>}
      </Card>}
      </div>
      {missing.length > 0 && <p className="text-sm text-amber-900">Chưa thể {creating ? 'tiếp nhận' : 'lưu & chấp nhận'}: {missing.join('; ')}.</p>}
      <ActionButton busy={action.busy}
        className={buttonClass}
        disabled={action.busy || missing.length > 0}
      >
        {creating ? "Tiếp nhận đơn tại quầy" : "Lưu & chấp nhận"}
      </ActionButton>
    </form>
  );
}
export function PrescriptionNew() {
  const router = useRouter();
  const base = useBasePath();
  return (
    <Page
      title="Tiếp nhận đơn giấy tại quầy"
      actions={
        <Link href={`${base}/prescriptions`} className={buttonClass}>
          Danh sách
        </Link>
      }
    >
      <PrescriptionForm
        creating
        onSaved={(p) =>
          router.push(
            `${base}/prescriptions/${encodeURIComponent(p.prescriptionId)}`,
          )
        }
      />
    </Page>
  );
}
function PrescriptionImage({ id }: { id: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/api/prescriptions/${encodeURIComponent(id)}/image`;
  return <Card>
    <h2 className="font-semibold">Ảnh đơn thuốc</h2>
    <p className="text-sm text-slate-600">Bấm ảnh để phóng to và đối chiếu dòng thuốc.</p>
    <button type="button" aria-label="Phóng to ảnh đơn thuốc" className="block w-full rounded-lg border focus-visible:ring-2 focus-visible:ring-emerald-600" onClick={() => dialog.current?.showModal()}>
      <Image unoptimized src={src} width={1000} height={1000} alt={`Ảnh đơn thuốc ${id}`} className="h-auto max-h-[70vh] w-full object-contain" />
    </button>
    <dialog ref={dialog} aria-labelledby="prescription-image-title" className="max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl overflow-auto rounded-xl p-4 backdrop:bg-slate-950/70">
      <div className="sticky top-0 flex flex-wrap items-center justify-between gap-3 bg-white pb-3">
        <h2 id="prescription-image-title" className="font-bold">Ảnh đơn thuốc {id}</h2>
        <form method="dialog"><button className={buttonClass}>Đóng ảnh phóng to</button></form>
      </div>
      <Image unoptimized src={src} width={1600} height={1600} alt={`Ảnh phóng to đơn thuốc ${id}`} className="h-auto w-full object-contain" />
      <a href={src} target="_blank" rel="noreferrer" className="mt-3 inline-block text-emerald-700 underline">Mở ảnh gốc</a>
    </dialog>
  </Card>;
}
export function PrescriptionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const base = useBasePath();
  const action = useAction();
  const resource = useResource(
    useCallback(() => staffPrescriptionsApi.get(id), [id]),
  );
  const p = resource.data;
  const transition = (key: string, reason?: string) =>
    action.run(
      () =>
        staffPrescriptionsApi.action(
          id,
          key as "approve" | "reject" | "cancel",
          reason,
        ),
      (value) => {
        resource.setData(value);
        action.setSuccess("Đã cập nhật trạng thái đơn thuốc.");
      },
    );
  return (
    <Page
      title={`Đơn thuốc ${id}`}
      actions={
        <Link href={`${base}/prescriptions`} className={buttonClass}>
          Danh sách
        </Link>
      }
    >
      <LoadState {...resource} retry={resource.reload} />
      <Feedback {...action} />
      {!resource.loading && !resource.error && p && (
        <>
          <Card>
            <h2 className="font-semibold">
              {PRESCRIPTION_STATUS_LABELS[p.status]} · {p.patientName}
            </h2>
            <p>
              Mã người bệnh: {p.patientId} · Chủ đơn:{" "}
              {p.ownerUsername || "Tại quầy"}
            </p>
            <p>
              Người kê: {p.prescriberName || "Chưa nhập"} · Ngày kê:{" "}
              {formatDate(p.issueDate)} · Hiệu lực: {formatDate(p.validUntil)}
            </p>
            <p>
              Người tiếp nhận: {p.createdByUsername} ·{" "}
              {formatDateTime(p.createdAt)}
            </p>
            {p.reviewedByUsername && (
              <p>
                Người duyệt: {p.reviewedByUsername} ·{" "}
                {formatDateTime(p.reviewedAt)}
              </p>
            )}
            {p.reviewNote && (
              <p className="rounded bg-amber-50 p-3">{p.reviewNote}</p>
            )}
          </Card>
          <div className={`grid min-w-0 items-start gap-6 ${p.status === 'PendingReview' ? 'lg:grid-cols-2' : ''}`} data-testid="prescription-review-layout">
            <div className="min-w-0">{p.hasImage ? <PrescriptionImage id={id} /> : p.status === 'PendingReview' && <Card><h2 className="font-semibold">Đơn tiếp nhận tại quầy</h2><p className="text-sm text-slate-600">Đối chiếu đơn giấy và nhập chi tiết bên cạnh.</p></Card>}</div>
            {p.status === 'PendingReview' && <div className="min-w-0"><PrescriptionForm key={id} initial={p} prescriptionId={id} onSaved={resource.setData} /></div>}
          </div>
          {!!p.linkedOrders?.length && <Card>
            <h2 className="font-semibold">Đơn hàng liên quan</h2>
            <div className="space-y-4">{p.linkedOrders.map(order => <div key={order.orderId} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2"><DetailLink href={`${base}/orders/${encodeURIComponent(order.orderId)}`}>{order.orderId}</DetailLink><span className="text-sm text-slate-600">{ORDER_STATUS_LABELS[order.status]}</span></div>
              <ul className="mt-2 space-y-1 text-sm">{order.items.map(item => <li key={item.drugId}>{item.drugName} ({item.drugId}) · {item.quantity} {item.unit}</li>)}</ul>
            </div>)}</div>
          </Card>}
          {p.status !== 'PendingReview' && <Card>
            <h2 className="font-semibold">Hạn mức thuốc</h2>
            {p.items.length ? (
              <Table
                headers={[
                  "Thuốc",
                  "Đơn vị",
                  "Lượng kê",
                  "Đang giữ",
                  "Đã cấp",
                  "Còn lại",
                ]}
              >
                {p.items.map((i) => (
                  <tr key={i.itemId}>
                    <td>
                      {i.drugName} ({i.drugId})
                    </td>
                    <td>{i.saleUnit}</td>
                    <td>{i.prescribedQuantity}</td>
                    <td>{i.reservedQuantity}</td>
                    <td>{i.dispensedQuantity}</td>
                    <td>{i.remainingQuantity}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p>Chưa nhập dòng thuốc.</p>
            )}
          </Card>}
          <ReasonActions
            busy={action.busy}
            errorFields={action.fields}
            onAction={transition}
            actions={
              p.status === "PendingReview"
                ? [{ key: "reject", label: "Từ chối đơn thuốc" }]
                : p.status === "Approved" &&
                    p.items.some(
                      (i) => i.dispensedQuantity < i.prescribedQuantity,
                    )
                  ? [{ key: "cancel", label: "Hủy hiệu lực đơn thuốc" }]
                  : []
            }
          />
        </>
      )}
    </Page>
  );
}
