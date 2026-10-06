"use client";
import { ActionButton } from '@/components/ActionButton';
import Image from "next/image";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, inventoryApi, type ListQuery } from "@/lib/backoffice-api";
import { ApiException } from "@/lib/api";
import { notifyError } from '@/lib/feedback';
import type {
  CreateBatchInput,
  CreateStaffInput,
  DrugAdmin,
  DrugCreate,
  DrugInput,
  PaymentSettingInput,
} from "@/lib/types";
import { formatVND, ROLE_LABELS } from "@/lib/format";
import {
  buttonClass,
  Card,
  DetailLink,
  Field,
  Feedback,
  LoadState,
  Page,
  RecordList,
  useAction,
  useResource,
  validateImage,
  errorTitle,
} from "./shared";
import { StockSummary } from "./Inventory";

const accountList = ({ status, ...query }: ListQuery) =>
  adminApi.accounts({ ...query, role: status });
export function Accounts() {
  const action = useAction();
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState<CreateStaffInput>({
    username: "",
    password: "",
    confirmPassword: "",
  });
  return (
    <RecordList
      title="Quản lý tài khoản"
      load={accountList}
      statuses={ROLE_LABELS}
      filterLabel="Vai trò"
      refreshKey={refreshKey}
      rowKey={(a) => a.userId}
      headers={["Mã tài khoản", "Tên đăng nhập", "Vai trò"]}
      row={(a) => (
        <>
          <td>{a.userId}</td>
          <td>{a.username}</td>
          <td>{ROLE_LABELS[a.role]}</td>
        </>
      )}
    >
      <Card>
        <h2 className="font-bold">Tạo tài khoản nhân viên</h2>
        <Feedback {...action} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(
              () => adminApi.createStaff(form),
              (account) => {
                action.setSuccess(`Đã tạo nhân viên ${account.username}.`);
                setForm({ username: "", password: "", confirmPassword: "" });
                setRefreshKey((k) => k + 1);
              },
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Tên đăng nhập"
              name="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              errors={action.fields}
              minLength={3}
              maxLength={30}
              required
              disabled={action.busy}
            />
            <Field
              label="Mật khẩu"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              errors={action.fields}
              minLength={8}
              maxLength={128}
              required
              disabled={action.busy}
            />
            <Field
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              errors={action.fields}
              required
              disabled={action.busy}
            />
          </div>
          <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy}>
            Tạo Staff
          </ActionButton>
        </form>
      </Card>
    </RecordList>
  );
}
export function DrugList() {
  return (
    <RecordList
      title="Danh mục thuốc & nhập lô"
      load={adminApi.drugs}
      createHref="/admin/drugs/new"
      rowKey={(d) => d.drugId}
      headers={[
        "Thuốc",
        "Đơn vị",
        "Giá",
        "Ngưỡng",
        "Kê đơn",
        "Kiểm soát",
        "Bán",
      ]}
      row={(d) => (
        <>
          <td>
            <DetailLink href={`/admin/drugs/${encodeURIComponent(d.drugId)}`}>
              {d.name} ({d.drugId})
            </DetailLink>
          </td>
          <td>{d.saleUnit}</td>
          <td>{formatVND(d.unitPrice)}</td>
          <td>{d.lowStockThreshold}</td>
          <td>{d.requiresPrescription ? "Có" : "Không"}</td>
          <td>{d.isControlled ? "Có" : "Không"}</td>
          <td>{d.isForSale ? "Đang bán" : "Tắt bán"}</td>
        </>
      )}
    />
  );
}
const emptyDrug: DrugCreate = {
  drugId: "",
  name: "",
  description: "",
  saleUnit: "",
  unitPrice: 1,
  lowStockThreshold: 0,
  requiresPrescription: false,
  isControlled: false,
  isForSale: true,
};
function DrugForm({
  drug,
  saved,
}: {
  drug?: DrugAdmin;
  saved: (drug: DrugAdmin) => void;
}) {
  const action = useAction();
  const [form, setForm] = useState<DrugCreate>(drug || emptyDrug);
  const [created, setCreated] = useState<DrugAdmin | null>(null);
  const [firstImage, setFirstImage] = useState<File | null>(null);
  const [imageSaved, setImageSaved] = useState(false);
  const [withBatch, setWithBatch] = useState(false);
  const [firstBatch, setFirstBatch] = useState<CreateBatchInput>({ batchNumber: '', expiryDate: '', quantity: 1 });
  useEffect(() => {
    if (drug) setForm(drug);
  }, [drug]);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input: DrugInput = {
          name: form.name.trim(),
          description: form.description,
          saleUnit: form.saleUnit.trim(),
          unitPrice: form.unitPrice,
          lowStockThreshold: form.lowStockThreshold,
          requiresPrescription: form.requiresPrescription,
          isControlled: form.isControlled,
          isForSale: form.isForSale,
        };
        void action.run(
          async () => {
            if (drug) return adminApi.updateDrug(drug.drugId, input);
            if (firstImage) validateImage(firstImage);
            let value = created ? await adminApi.updateDrug(created.drugId, input) : await adminApi.createDrug({ ...input, drugId: form.drugId.trim() });
            setCreated(value);
            if (firstImage && !imageSaved) { value = await adminApi.drugImage(value.drugId, firstImage); setImageSaved(true); setCreated(value); }
            if (withBatch) await adminApi.batch(value.drugId, firstBatch);
            return value;
          },
          (value) => {
            saved(value);
            action.setSuccess("Đã lưu thuốc.");
          },
        );
      }}
    >
      <Feedback {...action} />
      <Card>
        {!drug && created && <p className="rounded-lg bg-blue-50 p-3 text-sm">Thuốc {created.drugId} đã được tạo. Nếu ảnh hoặc lô lỗi, có thể sửa và thử lại hoặc <Link href={`/admin/drugs/${encodeURIComponent(created.drugId)}`} className="font-semibold underline">mở chi tiết thuốc</Link>.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mã thuốc"
            name="drugId"
            value={form.drugId}
            onChange={(e) => setForm({ ...form, drugId: e.target.value })}
            errors={action.fields}
            disabled={!!drug || !!created || action.busy}
            required
          />
          <Field
            label="Tên thuốc"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            errors={action.fields}
            required
            disabled={action.busy}
          />
          <Field
            label="Đơn vị bán"
            name="saleUnit"
            value={form.saleUnit}
            onChange={(e) => setForm({ ...form, saleUnit: e.target.value })}
            errors={action.fields}
            required
            disabled={action.busy}
          />
          <Field
            label="Giá bán (VND)"
            name="unitPrice"
            type="number"
            min={1}
            step={1}
            value={form.unitPrice}
            onChange={(e) =>
              setForm({ ...form, unitPrice: Number(e.target.value) })
            }
            errors={action.fields}
            required
            disabled={action.busy}
          />
          <Field
            label="Ngưỡng tồn thấp"
            name="lowStockThreshold"
            type="number"
            min={0}
            step={1}
            value={form.lowStockThreshold}
            onChange={(e) =>
              setForm({ ...form, lowStockThreshold: Number(e.target.value) })
            }
            errors={action.fields}
            required
            disabled={action.busy}
          />
          <Field
            label="Mô tả"
            name="description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            errors={action.fields}
            disabled={action.busy}
          />
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label>
            <input
              type="checkbox"
              className="mr-2"
              checked={form.requiresPrescription}
              disabled={form.isControlled || action.busy}
              onChange={(e) =>
                setForm({ ...form, requiresPrescription: e.target.checked })
              }
            />
            Yêu cầu đơn thuốc
          </label>
          <label>
            <input
              type="checkbox"
              className="mr-2"
              checked={form.isControlled}
              disabled={action.busy}
              onChange={(e) =>
                setForm({
                  ...form,
                  isControlled: e.target.checked,
                  requiresPrescription:
                    e.target.checked || form.requiresPrescription,
                })
              }
            />
            Thuốc kiểm soát đặc biệt
          </label>
          <label>
            <input
              type="checkbox"
              className="mr-2"
              checked={form.isForSale}
              disabled={action.busy}
              onChange={(e) =>
                setForm({ ...form, isForSale: e.target.checked })
              }
            />
            Bật bán
          </label>
        </div>
        {action.fields.requiresPrescription && (
          <p className="text-rose-700">
            {action.fields.requiresPrescription.join(" ")}
          </p>
        )}
        {!drug && <div className="space-y-4 border-t pt-4">
          <label htmlFor="first-drug-image" className="block text-sm font-semibold">Ảnh thuốc (tùy chọn, PNG/JPG tối đa 5 MB)</label>
          <input id="first-drug-image" type="file" accept="image/png,image/jpeg" disabled={action.busy} className="block w-full min-w-0 text-sm" onChange={e => { setFirstImage(e.target.files?.[0] || null); setImageSaved(false); }} />
          {action.fields.file && <p className="text-sm text-rose-700">{action.fields.file.join(' ')}</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withBatch} disabled={action.busy} onChange={e => setWithBatch(e.target.checked)} />Nhập lô đầu tiên</label>
          {withBatch && <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Số lô đầu tiên" name="batchNumber" value={firstBatch.batchNumber} required disabled={action.busy} errors={action.fields} onChange={e => setFirstBatch(b => ({ ...b, batchNumber: e.target.value }))} />
            <Field label="Hạn dùng lô đầu tiên" name="expiryDate" type="date" value={firstBatch.expiryDate} required disabled={action.busy} errors={action.fields} onChange={e => setFirstBatch(b => ({ ...b, expiryDate: e.target.value }))} />
            <Field label="Số lượng lô đầu tiên" name="quantity" type="number" min={1} step={1} value={firstBatch.quantity} required disabled={action.busy} errors={action.fields} onChange={e => setFirstBatch(b => ({ ...b, quantity: Number(e.target.value) }))} />
          </div>}
        </div>}
        <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy}>
          {drug ? "Lưu thuốc" : "Thêm thuốc"}
        </ActionButton>
      </Card>
    </form>
  );
}
export function DrugNew() {
  const router = useRouter();
  return (
    <Page
      title="Thêm thuốc"
      actions={
        <Link className={buttonClass} href="/admin/drugs">
          Danh mục
        </Link>
      }
    >
      <DrugForm
        saved={(d) =>
          router.push(`/admin/drugs/${encodeURIComponent(d.drugId)}`)
        }
      />
    </Page>
  );
}
function ImageUpload({
  title,
  imageUrl,
  send,
  saved,
}: {
  title: string;
  imageUrl?: string;
  send: (file: File) => Promise<unknown>;
  saved: () => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const action = useAction();
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <Card>
      <h2 className="font-bold">{title}</h2>
      <Feedback {...action} />
      {(preview || imageUrl) && (
        <div>
          <Image
            unoptimized
            width={800}
            height={800}
            src={preview || imageUrl || ""}
            alt={preview ? `Xem trước ${title}` : title}
            className="max-h-64 max-w-full rounded border object-contain"
          />
        </div>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (file)
            void action.run(
              async () => {
                validateImage(file);
                return send(file);
              },
              async () => {
                await saved();
                setFile(null);
                setInputKey((k) => k + 1);
                action.setSuccess("Đã tải ảnh lên.");
              },
            );
        }}
      >
        <Field
          key={inputKey}
          label="Ảnh PNG/JPG/JPEG tối đa 5 MB"
          name="file"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          errors={action.fields}
          disabled={action.busy}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            setFile(null);
            action.setError("");
            action.setFields({});
            if (selected) {
              try {
                validateImage(selected);
                setFile(selected);
              } catch (err) {
                notifyError(err);
                if (err instanceof ApiException) action.setFields(err.errors || {});
                action.setError(
                  errorTitle(err),
                );
              }
            }
          }}
        />
        <p className="text-sm text-slate-600">{file ? file.name : "Chưa chọn ảnh"}</p>
        <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy || !file}>
          Tải ảnh lên
        </ActionButton>
      </form>
    </Card>
  );
}
function BatchForm({
  drugId,
  reload,
}: {
  drugId: string;
  reload: () => Promise<void>;
}) {
  const action = useAction();
  const [form, setForm] = useState<CreateBatchInput>({
    batchNumber: "",
    expiryDate: "",
    quantity: 1,
  });
  return (
    <Card>
      <h2 className="font-bold">Nhập lô mới</h2>
      <Feedback {...action} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(
            () =>
              adminApi.batch(drugId, {
                ...form,
                batchNumber: form.batchNumber.trim(),
              }),
            async (b) => {
              await reload();
              action.setSuccess(
                `Đã nhập lô ${b.batchNumber}, ${b.quantity} đơn vị.`,
              );
              setForm({ batchNumber: "", expiryDate: "", quantity: 1 });
            },
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Số lô"
            name="batchNumber"
            value={form.batchNumber}
            onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
            errors={action.fields}
            required
            disabled={action.busy}
          />
          <Field
            label="Hạn dùng (sau ngày hiện tại)"
            name="expiryDate"
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            errors={action.fields}
            required
            disabled={action.busy}
          />
          <Field
            label="Số lượng nhập"
            name="quantity"
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(e) =>
              setForm({ ...form, quantity: Number(e.target.value) })
            }
            errors={action.fields}
            required
            disabled={action.busy}
          />
        </div>
        <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy}>
          Nhập lô
        </ActionButton>
      </form>
    </Card>
  );
}
export function DrugDetail({
  params,
}: {
  params: Promise<{ drugId: string }>;
}) {
  const { drugId } = use(params);
  const action = useAction();
  const r = useResource(useCallback(() => adminApi.drug(drugId), [drugId]));
  const stock = useResource(
    useCallback(() => inventoryApi.get(drugId), [drugId]),
  );
  const d = r.data;
  return (
    <Page
      title={`Thuốc ${drugId}`}
      actions={
        <Link className={buttonClass} href="/admin/drugs">
          Danh mục
        </Link>
      }
    >
      <LoadState {...r} retry={r.reload} />
      <Feedback {...action} />
      {!r.loading && !r.error && d && (
        <>
          <DrugForm drug={d} saved={r.setData} />
          <Card>
            <p>Trạng thái: {d.isForSale ? "Đang bán" : "Tắt bán"}</p>
            <ActionButton busy={action.busy}
              className={buttonClass}
              disabled={action.busy}
              onClick={() =>
                action.run(
                  () => adminApi.saleStatus(drugId, !d.isForSale),
                  r.setData,
                )
              }
            >
              {d.isForSale ? "Tắt bán" : "Bật bán"}
            </ActionButton>
          </Card>
          <ImageUpload
            title="Ảnh thuốc"
            imageUrl={d.imageUrl}
            send={(file) => adminApi.drugImage(drugId, file)}
            saved={async () => r.setData(await adminApi.drug(drugId))}
          />
          <Card>
            <h2 className="font-bold">Tồn kho hiện tại</h2>
            <LoadState {...stock} retry={stock.reload} />
            {!stock.loading && !stock.error && stock.data && (
              <StockSummary inventory={stock.data} />
            )}
            <DetailLink href={`/admin/inventory/${encodeURIComponent(drugId)}`}>
              Chi tiết các lô
            </DetailLink>
          </Card>
          <BatchForm drugId={drugId} reload={stock.reload} />
        </>
      )}
    </Page>
  );
}
export function PaymentSettings() {
  const action = useAction();
  const r = useResource(useCallback(() => adminApi.paymentSettings(), []));
  const [form, setForm] = useState<PaymentSettingInput>({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const bankName = r.data?.bankName;
  const accountNumber = r.data?.accountNumber;
  const accountName = r.data?.accountName;
  useEffect(() => {
    if (bankName !== undefined && accountNumber !== undefined && accountName !== undefined)
      setForm({ bankName, accountNumber, accountName });
  }, [bankName, accountNumber, accountName]);
  return (
    <Page title="Cấu hình tài khoản nhận tiền & QR">
      <LoadState {...r} retry={r.reload} />
      <Feedback {...action} />
      {!r.loading && !r.error && r.data && (
        <>
          <Card>
            <p
              className={
                r.data.isConfigured ? "text-emerald-800" : "text-amber-800"
              }
            >
              {r.data.isConfigured
                ? "Đã cấu hình đầy đủ."
                : "Chưa cấu hình. Vui lòng nhập tài khoản nhận tiền và tải ảnh QR."}
            </p>
            <p className="text-sm text-slate-600">
              Thay đổi áp dụng cho lần mở thanh toán mới. Thanh toán đã mở giữ
              nguyên bản chụp tài khoản/QR.
            </p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(
                  () => adminApi.savePaymentSettings(form),
                  (value) => {
                    r.setData(value);
                    action.setSuccess("Đã lưu tài khoản nhận tiền.");
                  },
                );
              }}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["bankName", "Tên ngân hàng"],
                  ["accountNumber", "Số tài khoản"],
                  ["accountName", "Tên chủ tài khoản"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    name={key}
                    label={label}
                    value={form[key as keyof PaymentSettingInput]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    errors={action.fields}
                    required
                    disabled={action.busy}
                  />
                ))}
              </div>
              <ActionButton busy={action.busy} className={buttonClass} disabled={action.busy}>
                Lưu tài khoản
              </ActionButton>
            </form>
          </Card>
          <ImageUpload
            title="Ảnh QR cố định"
            imageUrl={r.data.qrImageUrl}
            send={adminApi.qrImage}
            saved={async () => r.setData(await adminApi.paymentSettings())}
          />
        </>
      )}
    </Page>
  );
}
