"use client";
import { use, useCallback } from "react";
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

export function OrderList() {
  const base = useBasePath();
  return (
    <RecordList
      title="Đơn hàng trực tuyến"
      load={staffOrdersApi.list}
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
          <td>{o.handledByUsername || "Chưa nhận"}</td>
        </>
      )}
    />
  );
}
export function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const base = useBasePath();
  const action = useAction();
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
        action.setSuccess(`Đã xuất kho và lập hóa đơn ${result.invoiceId}.`),
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
              <p>Người xử lý: {o.handledByUsername || "Chưa nhận"}</p>
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
              {!["Completed", "Cancelled", "Rejected"].includes(o.status) && (
                <button
                  className={buttonClass}
                  disabled={action.busy}
                  onClick={() => transition("claim")}
                >
                  Nhận xử lý
                </button>
              )}
              {o.status === "Preparing" &&
                o.payment?.status === "Confirmed" &&
                !o.invoiceId && (
                  <button
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
                    Xuất kho &amp; lập hóa đơn
                  </button>
                )}
              {o.status === "Preparing" &&
                o.payment?.status === "Confirmed" &&
                o.invoiceId &&
                o.receiveMethod === "Delivery" && (
                  <button
                    className={buttonClass}
                    disabled={action.busy}
                    onClick={() => transition("ship")}
                  >
                    Bắt đầu giao hàng
                  </button>
                )}
              {o.invoiceId &&
                o.payment?.status === "Confirmed" &&
                ((o.status === "Delivering" &&
                  o.receiveMethod === "Delivery") ||
                  (o.status === "Preparing" &&
                    o.receiveMethod === "Pickup")) && (
                  <button
                    className={buttonClass}
                    disabled={action.busy}
                    onClick={() => {
                      if (window.confirm("Xác nhận khách đã nhận hàng?"))
                        void transition("complete");
                    }}
                  >
                    Hoàn tất đơn hàng
                  </button>
                )}
            </div>
            {["Completed", "Cancelled", "Rejected"].includes(o.status) && (
              <p>Đơn đã kết thúc, không còn thao tác xử lý.</p>
            )}
          </Card>
          <ReasonActions
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
