"use client";
import Image from "next/image";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { staffPrescriptionsApi } from "@/lib/backoffice-api";
import type { PrescriptionDetailsInput, PrescriptionView } from "@/lib/types";
import {
  formatDate,
  formatDateTime,
  PRESCRIPTION_STATUS_LABELS,
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
  const base = useBasePath();
  return (
    <RecordList
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
  return {
    patientId: p.patientId,
    patientName: p.patientName,
    prescriberName: p.prescriberName || "",
    issueDate: p.issueDate || "",
    validUntil: p.validUntil || "",
    items: p.items.map((i) => ({
      drugId: i.drugId,
      quantity: i.prescribedQuantity,
    })),
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
  const action = useAction();
  useEffect(() => {
    if (initial) setForm(detailsFrom(initial));
  }, [initial]);
  const fields = [
    ["patientId", "Mã người bệnh (CCCD/BHYT)", "text"],
    ["patientName", "Tên người bệnh", "text"],
    ["prescriberName", "Người kê đơn", "text"],
    ["issueDate", "Ngày kê đơn", "date"],
    ["validUntil", "Hiệu lực đến", "date"],
  ] as const;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(
          () =>
            creating
              ? staffPrescriptionsApi.create({
                  ...form,
                  prescriptionId: paperId.trim(),
                })
              : staffPrescriptionsApi.update(prescriptionId!, form),
          (p) => {
            onSaved(p);
            action.setSuccess("Đã lưu chi tiết đơn thuốc.");
          },
        );
      }}
    >
      <Feedback {...action} />
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
              disabled={action.busy}
            />
          ))}
        </div>
      </Card>
      <DrugLines
        value={form.items}
        onChange={(items) => setForm({ ...form, items })}
        errors={action.fields}
        disabled={action.busy}
      />
      <button
        className={buttonClass}
        disabled={action.busy || !form.items.length}
      >
        {creating ? "Tiếp nhận đơn tại quầy" : "Lưu chi tiết"}
      </button>
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
            {p.hasImage && (
              <a
                href={`/api/prescriptions/${encodeURIComponent(id)}/image`}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <span className="text-emerald-700 underline">Mở ảnh gốc</span>
                <Image
                  unoptimized
                  width={800}
                  height={800}
                  src={`/api/prescriptions/${encodeURIComponent(id)}/image`}
                  alt={`Ảnh đơn thuốc ${id}`}
                  className="mt-3 max-h-96 max-w-full rounded border object-contain"
                />
              </a>
            )}
          </Card>
          <Card>
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
          </Card>
          {p.status === "PendingReview" && (
            <>
              <PrescriptionForm
                initial={p}
                prescriptionId={id}
                onSaved={resource.setData}
              />
              <button
                className={buttonClass}
                disabled={
                  action.busy ||
                  !p.items.length ||
                  !p.prescriberName ||
                  !p.issueDate ||
                  !p.validUntil
                }
                onClick={() => {
                  if (window.confirm("Chấp nhận đơn thuốc đã đối chiếu?"))
                    void transition("approve");
                }}
              >
                Chấp nhận đơn thuốc
              </button>
            </>
          )}
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
