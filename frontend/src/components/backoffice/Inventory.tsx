"use client";
import { use, useCallback, useState } from "react";
import Link from "next/link";
import { inventoryApi } from "@/lib/backoffice-api";
import type { InventoryRow } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  buttonClass,
  Card,
  DetailLink,
  Field,
  LoadState,
  Page,
  RecordList,
  Table,
  useBasePath,
  useResource,
} from "./shared";

export function InventoryList() {
  const base = useBasePath();
  return (
    <RecordList
      title="Tra cứu tồn kho"
      load={inventoryApi.list}
      rowKey={(i) => i.drugId}
      headers={[
        "Thuốc",
        "Đơn vị",
        "Thực tế",
        "Còn hạn",
        "Đang giữ",
        "Khả dụng",
        "Ngưỡng tồn thấp",
      ]}
      row={(i) => (
        <>
          <td>
            <DetailLink
              href={`${base}/inventory/${encodeURIComponent(i.drugId)}`}
            >
              {i.name} ({i.drugId})
            </DetailLink>
          </td>
          <td>{i.saleUnit}</td>
          <td>{i.totalQuantity}</td>
          <td>{i.unexpiredQuantity}</td>
          <td>{i.reservedQuantity}</td>
          <td>{i.availableQuantity}</td>
          <td>{i.lowStockThreshold}</td>
        </>
      )}
    />
  );
}
export function StockSummary({ inventory }: { inventory: InventoryRow }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ["Tồn thực tế", inventory.totalQuantity],
        ["Tồn còn hạn", inventory.unexpiredQuantity],
        ["Đang giữ", inventory.reservedQuantity],
        ["Khả dụng", inventory.availableQuantity],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-600">{label}</p>
          <strong className="block text-xl text-emerald-800">{value}</strong>
        </div>
      ))}
    </div>
  );
}
export function InventoryDetail({
  params,
}: {
  params: Promise<{ drugId: string }>;
}) {
  const { drugId } = use(params);
  const base = useBasePath();
  const resource = useResource(
    useCallback(() => inventoryApi.get(drugId), [drugId]),
  );
  const i = resource.data;
  return (
    <Page
      title={`Tồn kho ${drugId}`}
      actions={
        <Link href={`${base}/inventory`} className={buttonClass}>
          Danh sách
        </Link>
      }
    >
      <LoadState {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && i && (
        <Card>
          <h2 className="font-bold">
            {i.name} · Đơn vị: {i.saleUnit}
          </h2>
          <StockSummary inventory={i} />
          <p>Ngưỡng tồn thấp: {i.lowStockThreshold}</p>
          {i.batches.length ? (
            <Table
              headers={[
                "Số lô",
                "Hạn dùng",
                "Tình trạng",
                "Ban đầu",
                "Tồn thực tế",
              ]}
            >
              {i.batches.map((b) => (
                <tr key={b.batchId}>
                  <td>{b.batchNumber}</td>
                  <td>{formatDate(b.expiryDate)}</td>
                  <td
                    className={
                      b.isExpired ? "text-rose-700" : "text-emerald-700"
                    }
                  >
                    {b.isExpired ? "Đã hết hạn" : "Còn hạn"}
                  </td>
                  <td>{b.initialQuantity}</td>
                  <td>{b.quantity}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <p>Chưa có lô thuốc.</p>
          )}
        </Card>
      )}
    </Page>
  );
}
function LowStockReport() {
  const base = useBasePath();
  const r = useResource(useCallback(() => inventoryApi.lowStock(), []));
  return (
    <Card>
      <h2 className="font-bold">Tồn khả dụng ≤ ngưỡng</h2>
      <LoadState {...r} retry={r.reload} />
      {!r.loading &&
        !r.error &&
        r.data &&
        (r.data.length ? (
          <Table headers={["Thuốc", "Khả dụng", "Ngưỡng"]}>
            {r.data.map((i) => (
              <tr key={i.drugId}>
                <td>
                  <DetailLink
                    href={`${base}/inventory/${encodeURIComponent(i.drugId)}`}
                  >
                    {i.name} ({i.drugId})
                  </DetailLink>
                </td>
                <td>{i.availableQuantity}</td>
                <td>{i.lowStockThreshold}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p>Không có thuốc tồn thấp.</p>
        ))}
    </Card>
  );
}
function ExpiringReport() {
  const base = useBasePath();
  const [inputDays, setInputDays] = useState("30");
  const [days, setDays] = useState(30);
  const r = useResource(useCallback(() => inventoryApi.expiring(days), [days]));
  return (
    <Card>
      <h2 className="font-bold">Lô sắp hết hạn</h2>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(inputDays);
          if (Number.isInteger(n) && n > 0) {
            if (n === days) void r.reload();
            else setDays(n);
          }
        }}
      >
        <Field
          label="Số ngày tới"
          type="number"
          min={1}
          step={1}
          value={inputDays}
          onChange={(e) => setInputDays(e.target.value)}
          required
        />
        <button className={buttonClass}>Xem báo cáo</button>
      </form>
      <LoadState {...r} retry={r.reload} />
      {!r.loading &&
        !r.error &&
        r.data &&
        (r.data.length ? (
          <Table
            headers={["Thuốc", "Số lô", "Số lượng", "Hạn dùng", "Còn (ngày)"]}
          >
            {r.data.map((i) => (
              <tr key={i.batchId}>
                <td>
                  <DetailLink
                    href={`${base}/inventory/${encodeURIComponent(i.drugId)}`}
                  >
                    {i.drugName}
                  </DetailLink>
                </td>
                <td>{i.batchNumber}</td>
                <td>{i.quantity}</td>
                <td>{formatDate(i.expiryDate)}</td>
                <td>{i.daysRemaining}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p>Không có lô sắp hết hạn trong {days} ngày.</p>
        ))}
    </Card>
  );
}
export function Reports() {
  const [tab, setTab] = useState("low");
  return (
    <Page title="Báo cáo cảnh báo kho">
      <div className="flex gap-3" role="tablist" aria-label="Báo cáo kho">
        <button
          role="tab"
          aria-selected={tab === "low"}
          className={buttonClass}
          onClick={() => setTab("low")}
        >
          Tồn thấp
        </button>
        <button
          role="tab"
          aria-selected={tab === "expiring"}
          className={buttonClass}
          onClick={() => setTab("expiring")}
        >
          Sắp hết hạn
        </button>
      </div>
      {tab === "low" ? <LowStockReport /> : <ExpiringReport />}
    </Page>
  );
}
