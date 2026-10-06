"use client";
import { useCallback } from "react";
import Link from "next/link";
import { dashboardApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  buttonClass,
  Card,
  LoadState,
  Page,
  useBasePath,
  useResource,
} from "./shared";

export default function Dashboard() {
  const base = useBasePath();
  const { user } = useAuth();
  const resource = useResource(
    useCallback(() => dashboardApi.getSummary(), []),
  );
  const cards = [
    ["pendingPrescriptions", "Đơn thuốc chờ kiểm tra", "/prescriptions"],
    ["awaitingPaymentOrders", "Đơn chờ thanh toán", "/orders"],
    ["pendingPayments", "Thanh toán chờ duyệt", "/payments"],
    ["preparingOrders", "Đơn đang chuẩn bị", "/orders"],
    ["lowStockCount", "Tồn khả dụng thấp", "/reports"],
    ["expiringCount", "Lô sắp hết hạn (30 ngày)", "/reports"],
  ] as const;
  return (
    <Page
      title={`Xin chào, ${user?.username || ""}`}
      actions={
        <button
          className={buttonClass}
          onClick={resource.reload}
          disabled={resource.loading}
        >
          Làm mới
        </button>
      }
    >
      <LoadState {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && resource.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([key, title, path]) => (
            <Link
              key={key}
              href={`${base}${path}`}
              className="rounded-xl border bg-white p-6 hover:border-emerald-600"
            >
              <p className="text-sm text-slate-600">{title}</p>
              <strong className="mt-3 block text-3xl text-emerald-700">
                {resource.data?.[key]}
              </strong>
            </Link>
          ))}
        </div>
      )}
      <Card>
        <h2 className="font-semibold">Chức năng nghiệp vụ</h2>
        <div className="flex flex-wrap gap-3">
          {[
            ["prescriptions/new", "Tiếp nhận đơn giấy"],
            ["sales/new", "Bán tại quầy"],
            ["inventory", "Tra cứu kho"],
            ["invoices", "Hóa đơn"],
            ...(base === "/admin"
              ? [
                  ["accounts", "Tài khoản"],
                  ["drugs", "Danh mục & nhập lô"],
                  ["settings/payment", "Cấu hình QR"],
                ]
              : []),
          ].map(([path, label]) => (
            <Link className={buttonClass} key={path} href={`${base}/${path}`}>
              {label}
            </Link>
          ))}
        </div>
      </Card>
    </Page>
  );
}
