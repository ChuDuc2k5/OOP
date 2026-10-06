import { apiFetch } from "./api";
import type {
  AccountRow,
  BatchView,
  CreateBatchInput,
  CreateSaleInput,
  CreateStaffInput,
  DrugAdmin,
  DrugCreate,
  DrugInput,
  ExpiringRow,
  FulfillResult,
  InventoryDetail,
  InventoryRow,
  LowStockRow,
  OrderRow,
  OrderView,
  Paged,
  PaymentReviewInput,
  PaymentReviewResult,
  PaymentRow,
  PaymentSettingInput,
  PaymentSettingView,
  PaymentView,
  PrescriptionCounterInput,
  PrescriptionDetailsInput,
  PrescriptionRow,
  PrescriptionView,
  SaleView,
  UpdateSaleInput,
} from "./types";

export type ListQuery = {
  search?: string;
  status?: string;
  role?: string;
  page?: number;
  pageSize?: number;
};
function query(params: ListQuery = {}) {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") values.set(key, String(value));
  });
  return values.size ? `?${values}` : "";
}
const id = encodeURIComponent;
const post = <T>(path: string, body?: unknown, silent = false) =>
  apiFetch<T>(path, {
    method: "POST",
    silent,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const put = <T>(path: string, body: unknown, silent = false) =>
  apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body), silent });
function upload<T>(path: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<T>(path, { method: "POST", body });
}

export const staffPrescriptionsApi = {
  list: (params: ListQuery) =>
    apiFetch<Paged<PrescriptionRow>>(`/api/prescriptions${query(params)}`),
  get: (key: string) =>
    apiFetch<PrescriptionView>(`/api/prescriptions/${id(key)}`),
  create: (input: PrescriptionCounterInput) =>
    post<PrescriptionView>("/api/prescriptions/counter", input),
  update: (key: string, input: PrescriptionDetailsInput, silent = false) =>
    put<PrescriptionView>(`/api/prescriptions/${id(key)}/details`, input, silent),
  action: (
    key: string,
    action: "approve" | "reject" | "cancel",
    reason?: string,
    silent = false,
  ) =>
    post<PrescriptionView>(
      `/api/prescriptions/${id(key)}/${action}`,
      reason === undefined ? undefined : { reason },
      silent,
    ),
};
export const staffOrdersApi = {
  list: (params: ListQuery) =>
    apiFetch<Paged<OrderRow>>(`/api/staff/orders${query(params)}`),
  get: (key: string) =>
    apiFetch<OrderView & { customerUsername?: string }>(
      `/api/staff/orders/${id(key)}`,
    ),
  action: (
    key: string,
    action: "claim" | "ready" | "ship" | "complete" | "reject" | "cancel",
    reason?: string,
    silent = false,
  ) =>
    post<OrderView>(
      `/api/staff/orders/${id(key)}/${action}`,
      reason === undefined ? undefined : { reason },
      silent,
    ),
  fulfill: (key: string, silent = false) =>
    post<FulfillResult>(`/api/staff/orders/${id(key)}/fulfill`, undefined, silent),
};
export const staffPaymentsApi = {
  list: (params: ListQuery) =>
    apiFetch<Paged<PaymentRow>>(`/api/staff/payments${query(params)}`),
  review: (key: string, input: PaymentReviewInput, silent = false) =>
    post<PaymentReviewResult>(`/api/staff/payments/${id(key)}/review`, input, silent),
  note: (key: string, note: string) =>
    post<PaymentView>(`/api/staff/payments/${id(key)}/note`, { note }),
};
export const staffSalesApi = {
  list: (params: ListQuery) =>
    apiFetch<Paged<SaleView>>(`/api/staff/sales${query(params)}`),
  get: (key: string) => apiFetch<SaleView>(`/api/staff/sales/${id(key)}`),
  create: (input: CreateSaleInput) => post<SaleView>("/api/staff/sales", input),
  update: (key: string, input: UpdateSaleInput) =>
    put<SaleView>(`/api/staff/sales/${id(key)}`, input),
  cancel: (key: string) => post<SaleView>(`/api/staff/sales/${id(key)}/cancel`),
  checkout: (key: string) =>
    post<SaleView>(`/api/staff/sales/${id(key)}/checkout`, {
      cashReceived: true,
    }),
};
export const inventoryApi = {
  list: (params: ListQuery) =>
    apiFetch<Paged<InventoryRow>>(`/api/inventory${query(params)}`),
  get: (key: string) => apiFetch<InventoryDetail>(`/api/inventory/${id(key)}`),
  lowStock: () => apiFetch<LowStockRow[]>("/api/reports/low-stock"),
  expiring: (days: number) =>
    apiFetch<ExpiringRow[]>(`/api/reports/expiring?days=${days}`),
};
export const adminApi = {
  accounts: (params: ListQuery) =>
    apiFetch<Paged<AccountRow>>(`/api/admin/accounts${query(params)}`),
  createStaff: (input: CreateStaffInput) =>
    post<AccountRow>("/api/admin/accounts/staff", input),
  drugs: (params: ListQuery) =>
    apiFetch<Paged<DrugAdmin>>(`/api/admin/drugs${query(params)}`),
  drug: (key: string) => apiFetch<DrugAdmin>(`/api/admin/drugs/${id(key)}`),
  createDrug: (input: DrugCreate) => post<DrugAdmin>("/api/admin/drugs", input),
  updateDrug: (key: string, input: DrugInput) =>
    put<DrugAdmin>(`/api/admin/drugs/${id(key)}`, input),
  saleStatus: (key: string, isForSale: boolean) =>
    apiFetch<DrugAdmin>(`/api/admin/drugs/${id(key)}/sale-status`, {
      method: "PATCH",
      body: JSON.stringify({ isForSale }),
    }),
  drugImage: (key: string, file: File) =>
    upload<DrugAdmin>(`/api/admin/drugs/${id(key)}/image`, file),
  batch: (key: string, input: CreateBatchInput) =>
    post<BatchView>(`/api/admin/drugs/${id(key)}/batches`, input),
  paymentSettings: () =>
    apiFetch<PaymentSettingView>("/api/admin/payment-settings"),
  savePaymentSettings: (input: PaymentSettingInput) =>
    put<PaymentSettingView>("/api/admin/payment-settings", input),
  qrImage: (file: File) =>
    upload<PaymentSettingView>("/api/admin/payment-settings/qr-image", file),
};
