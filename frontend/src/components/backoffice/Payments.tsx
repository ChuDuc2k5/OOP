"use client";
import { ActionButton } from '@/components/ActionButton';
import { useState } from "react";
import { staffPaymentsApi, staffOrdersApi, type ListQuery } from "@/lib/backoffice-api";
import { ApiException } from '@/lib/api';
import { notify } from '@/lib/feedback';
import type { PaymentRow, PaymentReviewResult } from "@/lib/types";
import { formatDateTime, formatVND, ORDER_STATUS_LABELS } from "@/lib/format";
import {
  buttonClass,
  Card,
  DetailLink,
  Field,
  Feedback,
  RecordList,
  useAction,
  useBasePath,
} from "./shared";

const listPending = (query: ListQuery) =>
  staffPaymentsApi.list({ ...query, status: "PendingReview" });
function localNow() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function ReviewForm({
  payment,
  refresh,
  close,
}: {
  payment: PaymentRow;
  refresh: (failure?: string) => void | Promise<void>;
  close?: () => void;
}) {
  const action = useAction();
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(localNow);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<PaymentReviewResult | null>(null);
  const [reviewNote, setReviewNote] = useState(payment.reviewNote || "");
  const [invoiceId, setInvoiceId] = useState('');
  const [fulfillError, setFulfillError] = useState('');
  async function fulfillConfirmed() {
    try {
      const invoice = await staffOrdersApi.fulfill(payment.orderId, true);
      const message = `Đã xác nhận tiền và lập hóa đơn ${invoice.invoiceId}`;
      setInvoiceId(invoice.invoiceId);
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
  const pending = !result?.approved;
  return (
    <Card>
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-bold">
          Đối chiếu {payment.orderId} · Yêu cầu{" "}
          {formatVND(payment.expectedAmount)}
        </h2>
        {close && <ActionButton busy={action.busy}
          type="button"
          className={buttonClass}
          onClick={close}
          disabled={action.busy}
        >
          Đóng
        </ActionButton>}
      </div>
      <p>
        Khách hàng: {payment.customerUsername} · Mã thanh toán:{" "}
        {payment.paymentId}
      </p>
      <Feedback {...action} />
      {result && (
        <div
          role="status"
          className={`rounded-lg border p-4 ${result.approved ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-400 bg-amber-50 text-amber-950"}`}
        >
          <strong>
            {result.approved
              ? invoiceId ? `Đã xác nhận tiền và lập hóa đơn ${invoiceId}` : 'Đã xác nhận tiền'
              : "Chuyển thiếu – chưa duyệt thanh toán"}
          </strong>
          <p>
            Thực nhận: {formatVND(result.payment.receivedAmount)} / Yêu cầu:{" "}
            {formatVND(result.payment.expectedAmount)}
          </p>
          <p>{result.payment.reviewNote}</p>
          <p>Đơn hàng: {ORDER_STATUS_LABELS[result.orderStatus]}</p>
        </div>
      )}
      {fulfillError && <div role="alert" className="space-y-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900"><p>{fulfillError}</p><ActionButton busy={action.busy} className={buttonClass} onClick={() => void action.run(fulfillConfirmed)}>Thử xuất kho lại</ActionButton></div>}
      {reviewNote && (
        <p className="rounded bg-amber-50 p-3 text-sm">
          Ghi chú đối chiếu: {reviewNote}
        </p>
      )}
      {pending && (
        <>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(
                () =>
                  staffPaymentsApi.review(payment.paymentId, {
                    bankReference: reference.trim(),
                    receivedAmount: Number(amount),
                    receivedAt: new Date(receivedAt).toISOString(),
                    note: note.trim() || undefined,
                  }, true),
                async (value) => {
                  setResult(value);
                  setReviewNote(value.payment.reviewNote || "");
                  if (value.approved) await fulfillConfirmed();
                  else {
                    notify({ kind: 'info', message: `Chuyển thiếu – chưa duyệt thanh toán. ${value.payment.reviewNote || ''}` });
                    await refresh();
                  }
                },
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Mã giao dịch ngân hàng"
                name="bankReference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                errors={action.fields}
                disabled={action.busy}
              />
              <Field
                label="Số tiền thực nhận (VND)"
                name="receivedAmount"
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                errors={action.fields}
                disabled={action.busy}
              />
              <Field
                label="Thời điểm nhận tiền"
                name="receivedAt"
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                required
                errors={action.fields}
                disabled={action.busy}
              />
              <Field
                label="Ghi chú đối chiếu"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                errors={action.fields}
                disabled={action.busy}
              />
            </div>
            <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy}>
              Xác nhận đã nhận tiền
            </ActionButton>
          </form>
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(
                () => staffPaymentsApi.note(payment.paymentId, note.trim()),
                (value) => {
                  setReviewNote(value.reviewNote || "");
                  action.setSuccess("Đã lưu ghi chú chưa duyệt.");
                  refresh();
                },
              );
            }}
          >
            <Field
              label="Lý do chưa duyệt (bắt buộc khi ghi chú)"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              errors={action.fields}
              required
              disabled={action.busy}
            />
            <ActionButton busy={action.busy}
              className={buttonClass}
              disabled={action.busy || !note.trim()}
            >
              Ghi chú chưa duyệt
            </ActionButton>
          </form>
        </>
      )}
    </Card>
  );
}
export default function Payments() {
  const base = useBasePath();
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <RecordList
      title="Thanh toán chờ duyệt"
      load={listPending}
      refreshKey={refreshKey}
      rowKey={(p) => p.paymentId}
      headers={[
        "Đơn hàng",
        "Khách hàng",
        "Yêu cầu",
        "Đã nhận",
        "Mở lúc",
        "Ghi chú",
        "Thao tác",
      ]}
      row={(p) => (
        <>
          <td>
            <DetailLink
              href={`${base}/orders/${encodeURIComponent(p.orderId)}`}
            >
              {p.orderId}
            </DetailLink>
          </td>
          <td>{p.customerUsername}</td>
          <td>{formatVND(p.expectedAmount)}</td>
          <td>
            {p.receivedAmount === undefined || p.receivedAmount === null
              ? "Chưa đối chiếu"
              : formatVND(p.receivedAmount)}
          </td>
          <td>{formatDateTime(p.createdAt)}</td>
          <td>{p.reviewNote}</td>
          <td>
            <button className={buttonClass} onClick={() => setSelected(p)}>
              Đối chiếu
            </button>
          </td>
        </>
      )}
    >
      {selected && (
        <ReviewForm
          key={selected.paymentId}
          payment={selected}
          refresh={() => setRefreshKey((k) => k + 1)}
          close={() => setSelected(null)}
        />
      )}
    </RecordList>
  );
}
