"use client";
import { useState } from "react";
import { inventoryApi } from "@/lib/backoffice-api";
import type { PrescriptionItemInput } from "@/lib/types";
import {
  buttonClass,
  Card,
  DetailLink,
  Field,
  Feedback,
  Table,
  useAction,
  useBasePath,
} from "./shared";

export default function DrugLines({
  value,
  onChange,
  errors = {},
  disabled = false,
}: {
  value: PrescriptionItemInput[];
  onChange: (items: PrescriptionItemInput[]) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
}) {
  const base = useBasePath();
  const action = useAction();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Awaited<
    ReturnType<typeof inventoryApi.list>
  > | null>(null);
  const searchDrugs = () =>
    action.run(
      () => inventoryApi.list({ search: search.trim(), pageSize: 20 }),
      setProducts,
    );
  return (
    <Card>
      <h3 className="font-semibold">Dòng thuốc</h3>
      <p className="text-sm text-slate-500">
        Tìm trong kho hoặc nhập mã thuốc. Lưu sẽ gộp các dòng trùng mã.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field
          label="Tìm thuốc theo mã/tên"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className={buttonClass}
          onClick={searchDrugs}
          disabled={disabled || action.busy}
        >
          Tra cứu thuốc
        </button>
      </div>
      <Feedback {...action} />
      {products && (
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {products.items.length ? (
            products.items.map((p) => (
              <button
                type="button"
                key={p.drugId}
                className="rounded border p-2 text-left text-sm hover:bg-emerald-50 disabled:opacity-50"
                disabled={disabled}
                onClick={() =>
                  onChange([...value, { drugId: p.drugId, quantity: 1 }])
                }
              >
                {p.name} ({p.drugId}) · Khả dụng {p.availableQuantity}{" "}
                {p.saleUnit}
              </button>
            ))
          ) : (
            <p>Không tìm thấy thuốc.</p>
          )}
        </div>
      )}
      <Table headers={["Mã thuốc", "Số lượng", "Thao tác"]}>
        {value.map((line, index) => (
          <tr key={index}>
            <td>
              <Field
                label={`Mã thuốc dòng ${index + 1}`}
                name={`items[${index}].drugId`}
                errors={errors}
                value={line.drugId}
                disabled={disabled}
                required
                onChange={(e) =>
                  onChange(
                    value.map((item, i) =>
                      i === index ? { ...item, drugId: e.target.value } : item,
                    ),
                  )
                }
              />
              <DetailLink
                href={`${base}/inventory/${encodeURIComponent(line.drugId)}`}
              >
                Xem tồn kho
              </DetailLink>
            </td>
            <td>
              <Field
                label={`Số lượng dòng ${index + 1}`}
                name={`items[${index}].quantity`}
                errors={errors}
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                disabled={disabled}
                required
                onChange={(e) =>
                  onChange(
                    value.map((item, i) =>
                      i === index
                        ? { ...item, quantity: Number(e.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </td>
            <td>
              <button
                type="button"
                className={buttonClass}
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Xóa dòng
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {errors.items && (
        <p className="text-sm text-rose-700">{errors.items.join(" ")}</p>
      )}
      <button
        type="button"
        className={buttonClass}
        disabled={disabled}
        onClick={() => onChange([...value, { drugId: "", quantity: 1 }])}
      >
        Thêm dòng
      </button>
    </Card>
  );
}
