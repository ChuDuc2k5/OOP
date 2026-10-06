"use client";
import { ActionButton } from '@/components/ActionButton';
import { Suspense, use, useCallback, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { LoadingState } from '@/components/Status';
import { PaymentButtons, ReviewForm, type ReviewMode } from './Payments';
import type { OrderRow, PaymentRow } from '@/lib/types';
import Link from "next/link";
import { staffOrdersApi } from "@/lib/backoffice-api";
import {
  formatDateTime,
  formatVND,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIVE_METHOD_LABELS,
  SALE_KIND_LABELS,
} from "@/lib/format";
import {
  buttonClass,
  Card,
  DetailLink,
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

function PrescriptionReviewLink({ orderId }: { orderId: string }) {
  const base = useBasePath();
  const r = useResource(useCallback(() => staffOrdersApi.get(orderId), [orderId]));
  if (r.loading) return <span className="text-sm text-slate-500">Đang tải liên kết đơn thuốc…</span>;
  if (r.error) return <button type="button" className="text-sm text-emerald-700 underline" onClick={r.reload}>Tải lại liên kết đơn thuốc</button>;
  return <DetailLink href={r.data?.prescriptionId ? `${base}/prescriptions/${encodeURIComponent(r.data.prescriptionId)}` : `${base}/orders/${encodeURIComponent(orderId)}`}>Kiểm tra đơn thuốc</DetailLink>;
}
export function OrderList() {
  return <Suspense fallback={<LoadingState />}><OrderListContent /></Suspense>;
}
function OrderListContent() {
  const base = useBasePath();
  const requestedStatus = useSearchParams().get('status') || '';
  const initialStatus = Object.hasOwn(ORDER_STATUS_LABELS, requestedStatus) ? requestedStatus : '';
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<{ payment: PaymentRow; mode: ReviewMode } | null>(null);
  const action = useAction();
  const reload = () => setRefreshKey(k => k + 1);
  return (
    <RecordList
      key={initialStatus}
      initialStatus={initialStatus}
      title="Đơn hàng trực tuyến"
      load={staffOrdersApi.list}
      refreshKey={refreshKey}
      statuses={ORDER_STATUS_LABELS}
      rowKey={(o) => o.orderId}
      headers={[
        "Mã đơn",
        "Khách hàng",
        "Ngày đặt",
        "Trạng thái đơn",
        "Thanh toán",
        "Hình thức nhận",
        "Tổng tiền",
        "Người xử lý",
        "Việc cần làm",
      ]}
      row={(o) => (
        <>
          <td>
            <DetailLink
              href={`${base}/orders/${encodeURIComponent(o.orderId)}`}
            >
              {o.orderId}
            </DetailLink>
          </td>
          <td>{o.customerUsername}</td>
          <td>{formatDateTime(o.createdAt)}</td>
          <td>{ORDER_STATUS_LABELS[o.status]}</td>
          <td>
            {o.paymentStatus
              ? PAYMENT_STATUS_LABELS[o.paymentStatus]
              : "Chưa mở thanh toán"}
          </td>
          <td>{RECEIVE_METHOD_LABELS[o.receiveMethod]}</td>
          <td>{formatVND(o.totalAmount)}</td>
          <td>{o.handledByUsername || "—"}</td>
          <td>{['Completed', 'Cancelled', 'Rejected'].includes(o.status) ? 'Đã kết thúc' : o.status === 'WaitingReview' ? <PrescriptionReviewLink orderId={o.orderId} /> : o.paymentStatus === 'PendingReview' ? <PaymentButtons disabled={action.busy} onSelect={mode => void action.run(() => staffOrdersApi.get(o.orderId), detail => {
            if (detail.payment?.status !== 'PendingReview') { reload(); return; }
            setSelected({ mode, payment: { paymentId: detail.payment.paymentId, orderId: detail.orderId, expectedAmount: detail.payment.expectedAmount, customerUsername: detail.customerUsername || '', status: 'PendingReview', createdAt: detail.createdAt, receivedAmount: detail.payment.receivedAmount, reviewNote: detail.payment.reviewNote } });
          })} /> : o.paymentStatus === 'Confirmed' ? <ConfirmedOrderAction order={o} refresh={reload} /> : 'Chờ khách thanh toán'}</td>
        </>
      )}
    >
      <Feedback {...action} />
      {selected && <ReviewForm key={`${selected.payment.paymentId}-${selected.mode}`} payment={selected.payment} mode={selected.mode} close={() => setSelected(null)} refresh={reload} />}
    </RecordList>
  );
}

function ConfirmedOrderAction({ order, refresh }: { order: OrderRow; refresh: () => void }) {
  const r = useResource(useCallback(() => staffOrdersApi.get(order.orderId), [order.orderId]));
  const action = useAction();
  const o = r.data;
  const eligible = o?.payment?.status === 'Confirmed' && ['Preparing', 'Delivering'].includes(o.status);
  const label = !o?.invoiceId ? 'Thử xuất kho lại' : o.receiveMethod === 'Pickup' ? 'Khách đã nhận thuốc' : o.status === 'Delivering' ? 'Đã giao xong' : 'Bắt đầu giao';
  return <div className="space-y-2"><Feedback {...action} /><LoadState {...r} retry={r.reload} />{eligible && <ActionButton busy={action.busy} className={buttonClass} onClick={() => {
    if (label !== 'Bắt đầu giao' && !window.confirm(`${label} cho ${o.orderId}?`)) return;
    void action.run(async () => {
      if (!o.invoiceId) await staffOrdersApi.fulfill(o.orderId);
      else await staffOrdersApi.action(o.orderId, o.receiveMethod === 'Delivery' && o.status === 'Preparing' ? 'ship' : 'complete');
    }, refresh);
  }}>{label}</ActionButton>}</div>;
}
export function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const base = useBasePath();
  const action = useAction();
  const [fulfillError, setFulfillError] = useState('');
  const [reviewMode, setReviewMode] = useState<ReviewMode | null>(null);
  const resource = useResource(useCallback(() => staffOrdersApi.get(id), [id]));
  const o = resource.data;
  const transition = (key: string, reason?: string) =>
    action.run(
      () =>
        staffOrdersApi.action(
          id,
          key as "claim" | "ship" | "complete" | "reject" | "cancel",
          reason,
        ),
      async () => {
        await resource.reload();
        action.setSuccess("Đã cập nhật đơn hàng.");
      },
    );
  const fulfill = () =>
    action.run(
      async () => {
        try {
          return await staffOrdersApi.fulfill(id);
        } finally {
          await resource.reload();
        }
      },
      (result) =>
        { setFulfillError(''); action.setSuccess(`Đã xuất kho và lập hóa đơn ${result.invoiceId}.`); },
    );
  const unpaid =
    !!o &&
    o.canCancel &&
    ["WaitingReview", "AwaitingPayment"].includes(o.status) &&
    o.payment?.status !== "Confirmed";
  return (
    <Page
      title={`Đơn hàng ${id}`}
      actions={
        <Link href={`${base}/orders`} className={buttonClass}>
          Danh sách
        </Link>
      }
    >
      <LoadState {...resource} retry={resource.reload} />
      <Feedback {...action} />
      {fulfillError && o?.payment?.status === 'Confirmed' && !o.invoiceId && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900">{fulfillError}</p>}
      {o?.payment?.status === 'PendingReview' && <PaymentButtons onSelect={setReviewMode} />}
      {o?.payment?.status === 'PendingReview' && reviewMode && <ReviewForm key={reviewMode} mode={reviewMode} close={() => setReviewMode(null)} payment={{ paymentId: o.payment.paymentId, orderId: o.orderId, expectedAmount: o.payment.expectedAmount, customerUsername: o.customerUsername || '', status: 'PendingReview', createdAt: o.createdAt, receivedAmount: o.payment.receivedAmount, reviewNote: o.payment.reviewNote }} refresh={async failure => { setFulfillError(failure || ''); await resource.reload(); }} />}
      {!resource.loading && !resource.error && o && (
        <>
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <p>
                <strong>Trạng thái đơn:</strong> {ORDER_STATUS_LABELS[o.status]}
              </p>
              <p>
                <strong>Thanh toán:</strong>{" "}
                {o.payment
                  ? PAYMENT_STATUS_LABELS[o.payment.status]
                  : "Chưa mở thanh toán"}
              </p>
              <p>Khách: {o.customerUsername || "—"}</p>
              <p>Ngày đặt: {formatDateTime(o.createdAt)}</p>
              <p>
                Người nhận: {o.receiverName} · {o.phone}
              </p>
              <p>
                {RECEIVE_METHOD_LABELS[o.receiveMethod]}{" "}
                {o.address && `· ${o.address}`}
              </p>
              <p>Loại đơn: {SALE_KIND_LABELS[o.saleKind]}</p>
              <p>Người xử lý: {o.handledByUsername || "—"}</p>
            </div>
            {o.prescriptionId && (
              <DetailLink
                href={`${base}/prescriptions/${encodeURIComponent(o.prescriptionId)}`}
              >
                Đơn thuốc {o.prescriptionId}
              </DetailLink>
            )}
            {o.note && <p className="rounded bg-amber-50 p-3">{o.note}</p>}
            {o.payment && (
              <p>
                Yêu cầu {formatVND(o.payment.expectedAmount)} · Thực nhận{" "}
                {o.payment.receivedAmount === undefined ||
                o.payment.receivedAmount === null
                  ? "Chưa đối chiếu"
                  : formatVND(o.payment.receivedAmount)}
                {o.payment.reviewNote && ` · ${o.payment.reviewNote}`}
              </p>
            )}
            {o.invoiceId && (
              <DetailLink
                href={`${base}/invoices/${encodeURIComponent(o.invoiceId)}`}
              >
                Hóa đơn {o.invoiceId}
              </DetailLink>
            )}
          </Card>
          <Card>
            <Table
              headers={[
                "Thuốc",
                "Đơn vị",
                "Số lượng",
                "Đơn giá chốt",
                "Thành tiền",
              ]}
            >
              {o.items.map((i) => (
                <tr key={i.drugId}>
                  <td>
                    {i.drugName} ({i.drugId})
                  </td>
                  <td>{i.unit}</td>
                  <td>{i.quantity}</td>
                  <td>{formatVND(i.unitPrice)}</td>
                  <td>{formatVND(i.lineTotal)}</td>
                </tr>
              ))}
            </Table>
            <p className="text-right text-lg font-bold">
              Tổng: {formatVND(o.totalAmount)}
            </p>
          </Card>
          <Card>
            <div className="flex flex-wrap gap-3">
              {o.status === "Preparing" &&
                o.payment?.status === "Confirmed" &&
                !o.invoiceId && (
                  <ActionButton busy={action.busy}
                    className={buttonClass}
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Xuất kho và lập hóa đơn cho đơn hàng này?",
                        )
                      )
                        void fulfill();
                    }}
                  >
                    Thử xuất kho lại
                  </ActionButton>
                )}
              {o.status === "Preparing" &&
                o.payment?.status === "Confirmed" &&
                o.invoiceId &&
                o.receiveMethod === "Delivery" && (
                  <ActionButton busy={action.busy}
                    className={buttonClass}
                    disabled={action.busy}
                    onClick={() => transition("ship")}
                  >
                    Bắt đầu giao
                  </ActionButton>
                )}
              {o.invoiceId &&
                o.payment?.status === "Confirmed" &&
                ((o.status === "Delivering" &&
                  o.receiveMethod === "Delivery") ||
                  (o.status === "Preparing" &&
                    o.receiveMethod === "Pickup")) && (
                  <ActionButton busy={action.busy}
                    className={buttonClass}
                    disabled={action.busy}
                    onClick={() => {
                      if (window.confirm("Xác nhận khách đã nhận hàng?"))
                        void transition("complete");
                    }}
                  >
                    {o.receiveMethod === 'Pickup' ? 'Khách đã nhận thuốc' : 'Đã giao xong'}
                  </ActionButton>
                )}
            </div>
            {["Completed", "Cancelled", "Rejected"].includes(o.status) && (
              <p>Đơn đã kết thúc, không còn thao tác xử lý.</p>
            )}
          </Card>
          <ReasonActions
            collapsed
            busy={action.busy}
            errorFields={action.fields}
            onAction={transition}
            actions={
              unpaid
                ? [
                    { key: "reject", label: "Từ chối đơn hàng" },
                    { key: "cancel", label: "Hủy đơn hàng" },
                  ]
                : []
            }
          />
        </>
      )}
    </Page>
  );
}
