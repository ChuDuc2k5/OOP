"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { staffSalesApi } from "@/lib/backoffice-api";
import type { SaleKind, UpdateSaleInput } from "@/lib/types";
import {
  formatDate,
  formatDateTime,
  formatVND,
  SALE_KIND_LABELS,
  SALE_STATUS_LABELS,
} from "@/lib/format";
import {
  buttonClass,
  Card,
  DetailLink,
  Field,
  Feedback,
  LoadState,
  Page,
  RecordList,
  Select,
  Table,
  useAction,
  useBasePath,
  useResource,
} from "./shared";
import DrugLines from "./DrugLines";

export function SaleList() {
  const base = useBasePath();
  return (
    <RecordList
      title="Giao dịch bán tại quầy của tôi"
      load={staffSalesApi.list}
      statuses={SALE_STATUS_LABELS}
      search={false}
      createHref={`${base}/sales/new`}
      rowKey={(s) => s.saleId}
      headers={[
        "Mã giao dịch",
        "Loại",
        "Trạng thái",
        "Ngày tạo",
        "Tổng tiền",
        "Hóa đơn",
      ]}
      row={(s) => (
        <>
          <td>
            <DetailLink href={`${base}/sales/${encodeURIComponent(s.saleId)}`}>
              {s.saleId}
            </DetailLink>
          </td>
          <td>{SALE_KIND_LABELS[s.kind]}</td>
          <td>{SALE_STATUS_LABELS[s.status]}</td>
          <td>{formatDateTime(s.createdAt)}</td>
          <td>{formatVND(s.totalAmount)}</td>
          <td>
            {s.invoiceId && (
              <DetailLink
                href={`${base}/invoices/${encodeURIComponent(s.invoiceId)}`}
              >
                {s.invoiceId}
              </DetailLink>
            )}
          </td>
        </>
      )}
    />
  );
}
export function SaleNew() {
  const base = useBasePath();
  const router = useRouter();
  const action = useAction();
  const [kind, setKind] = useState<SaleKind>("OTC");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [patientId, setPatientId] = useState("");
  return (
    <Page
      title="Tạo giao dịch bán tại quầy"
      actions={
        <Link href={`${base}/sales`} className={buttonClass}>
          Danh sách
        </Link>
      }
    >
      <Card>
        <Feedback {...action} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(
              () =>
                staffSalesApi.create({
                  kind,
                  ...(kind === "Prescription"
                    ? {
                        prescriptionId: prescriptionId.trim(),
                        patientId: patientId.trim(),
                      }
                    : {}),
                }),
              (s) =>
                router.push(`${base}/sales/${encodeURIComponent(s.saleId)}`),
            );
          }}
        >
          <Select
            label="Loại giao dịch"
            name="kind"
            errors={action.fields}
            options={SALE_KIND_LABELS}
            value={kind}
            onChange={(v) => setKind(v as SaleKind)}
          />
          <p className="text-sm text-slate-600">
            Loại giao dịch được cố định sau khi tạo nháp.
          </p>
          {kind === "Prescription" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Mã đơn thuốc"
                name="prescriptionId"
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                errors={action.fields}
                required
              />
              <Field
                label="Mã người bệnh"
                name="patientId"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                errors={action.fields}
                required
              />
            </div>
          )}
          <button className={buttonClass} disabled={action.busy}>
            Tạo nháp
          </button>
        </form>
      </Card>
    </Page>
  );
}
export function SaleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const base = useBasePath();
  const action = useAction();
  const resource = useResource(useCallback(() => staffSalesApi.get(id), [id]));
  const sale = resource.data;
  const [form, setForm] = useState<UpdateSaleInput>({ items: [] });
  const [cashReceived, setCashReceived] = useState(false);
  useEffect(() => {
    if (sale) {
      setForm({
        prescriptionId: sale.prescriptionId || "",
        patientId: sale.patientId || "",
        items: sale.items.map((i) => ({
          drugId: i.drugId,
          quantity: i.quantity,
        })),
      });
      setCashReceived(false);
    }
  }, [sale]);
  const dirty =
    !!sale &&
    JSON.stringify(form) !==
      JSON.stringify({
        prescriptionId: sale.prescriptionId || "",
        patientId: sale.patientId || "",
        items: sale.items.map((i) => ({
          drugId: i.drugId,
          quantity: i.quantity,
        })),
      });
  return (
    <Page
      title={`Bán tại quầy ${id}`}
      actions={
        <Link href={`${base}/sales`} className={buttonClass}>
          Danh sách
        </Link>
      }
    >
      <LoadState {...resource} retry={resource.reload} />
      <Feedback {...action} />
      {!resource.loading && !resource.error && sale && (
        <>
          <Card>
            <h2 className="font-semibold">
              {SALE_KIND_LABELS[sale.kind]} · {SALE_STATUS_LABELS[sale.status]}
            </h2>
            <p>
              Người tạo: {sale.createdByUsername} ·{" "}
              {formatDateTime(sale.createdAt)}
            </p>
            {sale.completedAt && (
              <p>Hoàn tất: {formatDateTime(sale.completedAt)}</p>
            )}
            {sale.prescriptionId && (
              <DetailLink
                href={`${base}/prescriptions/${encodeURIComponent(sale.prescriptionId)}`}
              >
                Đơn thuốc {sale.prescriptionId}
              </DetailLink>
            )}
            {sale.invoiceId && (
              <DetailLink
                href={`${base}/invoices/${encodeURIComponent(sale.invoiceId)}`}
              >
                Hóa đơn {sale.invoiceId}
              </DetailLink>
            )}
          </Card>
          {sale.issues.length > 0 && (
            <Card>
              <h2 className="font-semibold text-amber-900">Vấn đề cần xử lý</h2>
              <ul className="list-disc space-y-1 pl-5 text-amber-900">
                {sale.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            {sale.items.length ? (
              <Table
                headers={[
                  "Thuốc",
                  "Đơn vị",
                  "Số lượng",
                  "Đơn giá",
                  "Thành tiền",
                  "Lô xuất",
                ]}
              >
                {sale.items.map((i) => (
                  <tr key={i.drugId}>
                    <td>
                      {i.drugName} ({i.drugId})
                    </td>
                    <td>{i.unit}</td>
                    <td>{i.quantity}</td>
                    <td>{formatVND(i.unitPrice)}</td>
                    <td>{formatVND(i.lineTotal)}</td>
                    <td>
                      {i.allocations?.map((a, j) => (
                        <p key={j}>
                          {a.batchNumber} · {formatDate(a.expiryDate)} ·{" "}
                          {a.quantity}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p>Nháp chưa có thuốc.</p>
            )}
            <p className="text-right text-lg font-bold">
              Tổng: {formatVND(sale.totalAmount)}
            </p>
          </Card>
          {sale.status === "Draft" && (
            <>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action.run(
                    () =>
                      staffSalesApi.update(id, {
                        items: form.items,
                        ...(sale.kind === "Prescription"
                          ? {
                              prescriptionId: form.prescriptionId,
                              patientId: form.patientId,
                            }
                          : {}),
                      }),
                    (s) => {
                      resource.setData(s);
                      action.setSuccess(
                        "Đã lưu nháp và kiểm tra điều kiện bán.",
                      );
                    },
                  );
                }}
              >
                {sale.kind === "Prescription" && (
                  <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Mã đơn thuốc"
                        name="prescriptionId"
                        value={form.prescriptionId}
                        onChange={(e) =>
                          setForm({ ...form, prescriptionId: e.target.value })
                        }
                        errors={action.fields}
                        required
                      />
                      <Field
                        label="Mã người bệnh"
                        name="patientId"
                        value={form.patientId}
                        onChange={(e) =>
                          setForm({ ...form, patientId: e.target.value })
                        }
                        errors={action.fields}
                        required
                      />
                    </div>
                  </Card>
                )}
                <DrugLines
                  value={form.items}
                  onChange={(items) => setForm({ ...form, items })}
                  errors={action.fields}
                  disabled={action.busy}
                />
                <button className={buttonClass} disabled={action.busy}>
                  Lưu dòng thuốc &amp; kiểm tra
                </button>
              </form>
              <Card>
                {dirty && (
                  <p className="text-amber-800">
                    Có thay đổi chưa lưu. Lưu nháp trước khi hoàn tất.
                  </p>
                )}
                {sale.canCheckout && (
                  <>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={cashReceived}
                        onChange={(e) => setCashReceived(e.target.checked)}
                        disabled={action.busy || dirty}
                      />
                      Tôi xác nhận đã nhận đủ {formatVND(sale.totalAmount)} tiền
                      mặt.
                    </label>
                    <button
                      className={buttonClass}
                      disabled={action.busy || dirty || !cashReceived}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Hoàn tất bán hàng, trừ kho và lập hóa đơn?",
                          )
                        )
                          void action.run(
                            async () => {
                              try {
                                return await staffSalesApi.checkout(id);
                              } catch (err) {
                                await resource.reload();
                                throw err;
                              }
                            },
                            (s) => {
                              resource.setData(s);
                              action.setSuccess(
                                `Đã hoàn tất. Hóa đơn ${s.invoiceId}.`,
                              );
                            },
                          );
                      }}
                    >
                      Đã nhận tiền mặt – Hoàn tất
                    </button>
                  </>
                )}
                <button
                  className={buttonClass}
                  disabled={action.busy}
                  onClick={() => {
                    if (window.confirm("Hủy nháp bán hàng?"))
                      void action.run(
                        () => staffSalesApi.cancel(id),
                        resource.setData,
                      );
                  }}
                >
                  Hủy nháp
                </button>
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}
