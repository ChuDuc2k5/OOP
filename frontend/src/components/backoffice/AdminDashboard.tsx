"use client";
import { useCallback } from 'react';
import Link from 'next/link';
import { dashboardApi, productsApi } from '@/lib/api';
import { adminApi, staffOrdersApi } from '@/lib/backoffice-api';
import type { Paged, Product } from '@/lib/types';
import { formatDateTime, formatVND, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/format';
import { buttonClass, Card, DetailLink, LoadState, Page, Table, useResource } from './shared';

async function countProducts() {
  let page = 1;
  let total = 0;
  let outOfStock = 0;
  let response: Paged<Product>;
  do {
    response = await productsApi.getProducts({ page, pageSize: 100 });
    total += response.items.length;
    outOfStock += response.items.filter(p => !p.inStock).length;
    page++;
  } while (response.items.length && total < response.total);
  return { total, outOfStock };
}
async function loadOverview() {
  const [summary, admin, staff, user, products, latest, waiting, delivering, completed, cancelled, rejected] = await Promise.all([
    dashboardApi.getSummary(),
    adminApi.accounts({ role: 'Admin', pageSize: 1 }),
    adminApi.accounts({ role: 'Staff', pageSize: 1 }),
    adminApi.accounts({ role: 'User', pageSize: 1 }),
    countProducts(),
    staffOrdersApi.list({ pageSize: 5 }),
    ...['WaitingReview', 'Delivering', 'Completed', 'Cancelled', 'Rejected'].map(status => staffOrdersApi.list({ status, pageSize: 1 })),
  ]);
  return { summary, accounts: { Admin: admin.total, Staff: staff.total, User: user.total }, products, latest: latest.items,
    orders: { WaitingReview: waiting.total, AwaitingPayment: summary.awaitingPaymentOrders, Preparing: summary.preparingOrders, Delivering: delivering.total, Completed: completed.total, Cancelled: cancelled.total, Rejected: rejected.total } };
}
export default function AdminDashboard() {
  const r = useResource(useCallback(loadOverview, []));
  const d = r.data;
  return <Page title="Tổng quan quản lý" actions={<><Link href="/staff" className={`${buttonClass} bg-emerald-700 text-white`}>Làm việc như nhân viên</Link><button className={buttonClass} onClick={r.reload} disabled={r.loading}>Làm mới</button></>}>
    <LoadState {...r} retry={r.reload} />
    {!r.loading && !r.error && d && <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card><h2 className="font-bold">Tài khoản theo vai trò</h2><dl className="space-y-2">{([['Admin', 'Quản trị viên'], ['Staff', 'Nhân viên'], ['User', 'Khách hàng']] as const).map(([role, label]) => <div key={role} className="flex justify-between gap-3"><dt>{label}</dt><dd data-testid={`account-count-${role}`} className="font-bold text-emerald-700">{d.accounts[role]}</dd></div>)}</dl><DetailLink href="/admin/accounts">Quản lý tài khoản</DetailLink></Card>
        <Card><h2 className="font-bold">Thuốc đang bán</h2><p data-testid="selling-drug-count" className="text-3xl font-bold text-emerald-700">{d.products.total}</p><p>Trong đó hết hàng: <strong data-testid="out-of-stock-count">{d.products.outOfStock}</strong></p><DetailLink href="/admin/drugs">Thuốc & nhập lô</DetailLink></Card>
        <Card><h2 className="font-bold">Cảnh báo kho</h2><p>Tồn khả dụng thấp: <strong data-testid="low-stock-count">{d.summary.lowStockCount}</strong></p><p>Lô sắp hết hạn (30 ngày): <strong data-testid="expiring-count">{d.summary.expiringCount}</strong></p><DetailLink href="/admin/reports">Xem báo cáo kho</DetailLink></Card>
      </div>
      <Card><h2 className="font-bold">Đơn hàng theo trạng thái</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(Object.keys(d.orders) as (keyof typeof d.orders)[]).map(status => <Link key={status} href={`/admin/orders?status=${status}`} className="rounded-lg border p-3 text-sm hover:border-emerald-600"><p>{ORDER_STATUS_LABELS[status]}</p><strong className="text-2xl text-emerald-700">{d.orders[status]}</strong></Link>)}</div></Card>
      <Card><h2 className="font-bold">5 đơn hàng mới nhất</h2>{!d.latest.length ? <p className="text-slate-500">Chưa có đơn hàng.</p> : <Table headers={['Mã đơn', 'Khách hàng', 'Ngày đặt', 'Trạng thái', 'Thanh toán', 'Tổng tiền']}>{d.latest.map(o => <tr key={o.orderId}><td><DetailLink href={`/admin/orders/${encodeURIComponent(o.orderId)}`}>{o.orderId}</DetailLink></td><td>{o.customerUsername}</td><td>{formatDateTime(o.createdAt)}</td><td>{ORDER_STATUS_LABELS[o.status]}</td><td>{o.paymentStatus ? PAYMENT_STATUS_LABELS[o.paymentStatus] : 'Chưa mở thanh toán'}</td><td>{formatVND(o.totalAmount)}</td></tr>)}</Table>}<DetailLink href="/admin/orders">Xem toàn bộ đơn hàng</DetailLink></Card>
    </>}
  </Page>;
}
