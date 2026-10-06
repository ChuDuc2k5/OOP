import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

// Run against a local, isolated SQLite backend through the Next.js proxy.
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const folder = mkdtempSync(join(tmpdir(), "pharmacy-backoffice-curl-"));
const curl = process.platform === "win32" ? "curl.exe" : "curl";
let checks = 0;
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
}
function request(jar, method, path, body, extra = []) {
  const args = [
    "-sS",
    "--max-time",
    "60",
    "-b",
    jar,
    "-c",
    jar,
    "-X",
    method,
    "-w",
    "\n%{http_code}",
    `${base}/api${path}`,
  ];
  if (method !== "GET") {
    const cookie = readFileSync(jar, "utf8")
      .split("\n")
      .findLast((line) => line.includes("\tXSRF-TOKEN\t"));
    assert.ok(cookie, "CSRF cookie present");
    args.push(
      "-H",
      `X-XSRF-TOKEN: ${decodeURIComponent(cookie.trim().split("\t").at(-1))}`,
    );
  }
  if (body !== undefined) {
    const file = join(folder, "body.json");
    writeFileSync(file, JSON.stringify(body));
    args.push(
      "-H",
      "Content-Type: application/json",
      "--data-binary",
      `@${file}`,
    );
  }
  const raw = execFileSync(curl, [...args, ...extra], { encoding: "utf8" });
  const split = raw.lastIndexOf("\n");
  return {
    status: Number(raw.slice(split + 1)),
    data: raw.slice(0, split) ? JSON.parse(raw.slice(0, split)) : null,
  };
}
function login(username, password) {
  const jar = join(folder, `${username}.cookies`);
  writeFileSync(jar, "");
  check(request(jar, "GET", "/auth/csrf").status === 204, `${username} CSRF`);
  check(
    request(jar, "POST", "/auth/login", { username, password }).status === 200,
    `${username} login`,
  );
  request(jar, "GET", "/auth/csrf");
  return jar;
}
try {
  const user = login("user", "User@12345");
  const staff = login("staff", "Staff@12345");
  const admin = login("admin", "Admin@12345");
  const suffix = Date.now().toString();
  const csrfDenied = execFileSync(
    curl,
    [
      "-sS",
      "-b",
      staff,
      "-X",
      "POST",
      "-o",
      join(folder, "denied.json"),
      "-w",
      "%{http_code}",
      `${base}/api/staff/sales`,
      "-H",
      "Content-Type: application/json",
      "--data",
      "{}",
    ],
    { encoding: "utf8" },
  );
  check(csrfDenied === "400", "mutation without CSRF blocked");
  const settings = request(admin, "PUT", "/admin/payment-settings", {
    bankName: "Ngan hang kiem thu",
    accountNumber: "0000000000",
    accountName: "NHA THUOC KIEM THU",
  });
  check(
    settings.status === 200 && settings.data.bankName === "Ngan hang kiem thu",
    "admin saves bank configuration",
  );
  const png = join(folder, "qr.png");
  execFileSync(curl, [
    "-sS",
    "-b",
    admin,
    "-o",
    png,
    `${base}${settings.data.qrImageUrl}`,
  ]);
  const uploaded = request(
    admin,
    "POST",
    "/admin/payment-settings/qr-image",
    undefined,
    ["-F", `file=@${png};type=image/png`],
  );
  check(
    uploaded.status === 200 &&
      uploaded.data.isConfigured &&
      uploaded.data.qrImageUrl,
    "admin uploads fixed QR image",
  );
  check(
    request(admin, "GET", "/admin/payment-settings").data.accountNumber ===
      "0000000000",
    "QR settings persist",
  );

  const cart = request(user, "POST", "/cart/items", {
    drugId: "PARA500",
    quantity: 1,
  });
  check(cart.status === 200, "user adds OTC cart item");
  const placed = request(user, "POST", "/orders", {
    saleKind: "OTC",
    receiverName: "Khach kiem thu",
    phone: "0901234567",
    receiveMethod: "Pickup",
    expectedTotal: cart.data.subtotal,
  });
  check(
    placed.status === 201 &&
      placed.data.status === "AwaitingPayment" &&
      !placed.data.payment,
    "order created before opening payment",
  );
  const orderId = placed.data.orderId;
  check(
    request(user, "GET", `/orders/${orderId}/payment`).status === 404,
    "unopened payment remains 404",
  );
  const opened = request(user, "POST", `/orders/${orderId}/payment`);
  check(
    opened.status === 201 &&
      opened.data.expectedAmount === placed.data.totalAmount &&
      opened.data.bankName === "Ngan hang kiem thu",
    "QR uses exact order total and configured bank",
  );
  const paymentId = opened.data.paymentId;
  check(
    request(user, "POST", `/orders/${orderId}/payment`).data.paymentId ===
      paymentId,
    "payment POST idempotent",
  );
  check(
    request(
      staff,
      "GET",
      "/staff/payments?status=PendingReview",
    ).data.items.some((p) => p.paymentId === paymentId),
    "staff pending payment list",
  );
  check(
    request(staff, "POST", `/staff/payments/${paymentId}/note`, {
      note: "Can doi chieu ngan hang",
    }).status === 200,
    "staff saves pending note",
  );
  const short = request(staff, "POST", `/staff/payments/${paymentId}/review`, {
    bankReference: `SHORT-${suffix}`,
    receivedAmount: placed.data.totalAmount - 1,
    receivedAt: new Date().toISOString(),
  });
  check(
    short.status === 200 &&
      !short.data.approved &&
      short.data.payment.status === "PendingReview" &&
      short.data.payment.reviewNote &&
      short.data.orderStatus === "AwaitingPayment",
    "short transfer approved=false with reviewNote",
  );
  const approved = request(
    staff,
    "POST",
    `/staff/payments/${paymentId}/review`,
    {
      bankReference: `PAID-${suffix}`,
      receivedAmount: placed.data.totalAmount,
      receivedAt: new Date().toISOString(),
    },
  );
  check(
    approved.status === 200 &&
      approved.data.approved &&
      approved.data.orderStatus === "Preparing",
    "staff confirms full transfer",
  );
  check(
    request(staff, "POST", `/staff/orders/${orderId}/claim`).status === 200,
    "staff claims online order",
  );
  const fulfilled = request(staff, "POST", `/staff/orders/${orderId}/fulfill`);
  check(
    fulfilled.status === 200 && fulfilled.data.invoiceId,
    "staff fulfills online order",
  );
  const onlineInvoice = request(
    staff,
    "GET",
    `/invoices/${fulfilled.data.invoiceId}`,
  );
  check(
    onlineInvoice.status === 200 &&
      onlineInvoice.data.items[0].allocations[0].batchNumber &&
      onlineInvoice.data.totalAmount === placed.data.totalAmount,
    "online invoice has FEFO allocations and snapshot price",
  );
  check(
    request(staff, "POST", `/staff/orders/${orderId}/complete`).data.status ===
      "Completed",
    "pickup order completes",
  );

  const draft = request(staff, "POST", "/staff/sales", { kind: "OTC" });
  check(
    draft.status === 201 &&
      draft.data.status === "Draft" &&
      !draft.data.canCheckout,
    "OTC draft created with checkout initially unavailable",
  );
  const saleId = draft.data.saleId;
  const updated = request(staff, "PUT", `/staff/sales/${saleId}`, {
    items: [{ drugId: "PARA500", quantity: 1 }],
  });
  check(
    updated.status === 200 &&
      updated.data.canCheckout &&
      updated.data.issues.length === 0,
    "OTC draft validates ready for checkout",
  );
  check(
    request(staff, "POST", `/staff/sales/${saleId}/checkout`, {
      cashReceived: false,
    }).status === 400,
    "cash confirmation required",
  );
  const checkout = request(staff, "POST", `/staff/sales/${saleId}/checkout`, {
    cashReceived: true,
  });
  check(
    checkout.status === 200 &&
      checkout.data.status === "Completed" &&
      checkout.data.invoiceId &&
      checkout.data.items[0].allocations.length,
    "OTC cash checkout deducts stock and creates invoice",
  );
  check(
    request(staff, "GET", `/invoices/${checkout.data.invoiceId}`).data
      .paymentMethod === "Cash",
    "counter invoice payment method is Cash",
  );
  const cancelled = request(staff, "POST", "/staff/sales", { kind: "OTC" });
  check(
    request(staff, "POST", `/staff/sales/${cancelled.data.saleId}/cancel`).data
      .status === "Cancelled",
    "staff cancels own draft",
  );
  check(
    request(admin, "GET", `/staff/sales/${saleId}`).status === 404,
    "another operator cannot access own-only sale",
  );

  const date = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const paperId = `PAPER-${suffix}`;
  const paper = request(staff, "POST", "/prescriptions/counter", {
    prescriptionId: paperId,
    patientId: "PATIENT-TEST",
    patientName: "Nguoi benh kiem thu",
    prescriberName: "Bac si kiem thu",
    issueDate: date,
    validUntil: future,
    items: [{ drugId: "PARA500", quantity: 2 }],
  });
  check(
    paper.status === 201 && paper.data.status === "PendingReview",
    "staff receives paper prescription",
  );
  const details = request(staff, "PUT", `/prescriptions/${paperId}/details`, {
    patientId: "PATIENT-TEST",
    patientName: "Nguoi benh kiem thu",
    prescriberName: "Bac si kiem thu",
    issueDate: date,
    validUntil: future,
    items: [{ drugId: "PARA500", quantity: 3 }],
  });
  check(
    details.status === 200 && details.data.items[0].prescribedQuantity === 3,
    "staff updates prescription details",
  );
  check(
    request(staff, "POST", `/prescriptions/${paperId}/approve`).data.status ===
      "Approved",
    "staff approves prescription",
  );
  check(
    request(staff, "POST", `/prescriptions/${paperId}/cancel`, {
      reason: "Huy hieu luc kiem thu",
    }).data.status === "Cancelled",
    "staff cancels unused prescription",
  );
  check(
    request(
      staff,
      "GET",
      "/prescriptions?status=Cancelled&search=PAPER",
    ).data.items.some((p) => p.prescriptionId === paperId),
    "prescription server filters and searches",
  );

  check(
    request(admin, "POST", "/admin/accounts/staff", {
      username: `staff.${suffix}`,
      password: "Staff@12345",
      confirmPassword: "Staff@12345",
    }).status === 201,
    "admin creates Staff account",
  );
  check(
    request(admin, "GET", "/admin/accounts?role=Staff").data.items.every(
      (a) => a.role === "Staff",
    ),
    "accounts role filter",
  );
  const drugId = `TEST${suffix}`;
  const drug = {
    drugId,
    name: "Thuoc kiem thu",
    description: "Smoke",
    saleUnit: "Vien",
    unitPrice: 1234,
    lowStockThreshold: 1,
    requiresPrescription: false,
    isControlled: false,
    isForSale: true,
  };
  check(
    request(admin, "POST", "/admin/drugs", drug).status === 201,
    "admin creates drug",
  );
  const { drugId: unused, ...drugInput } = drug;
  void unused;
  check(
    request(admin, "PUT", `/admin/drugs/${drugId}`, {
      ...drugInput,
      unitPrice: 1500,
    }).data.unitPrice === 1500,
    "admin updates drug",
  );
  check(
    request(admin, "POST", `/admin/drugs/${drugId}/image`, undefined, [
      "-F",
      `file=@${png};type=image/png`,
    ]).status === 200,
    "admin uploads drug image",
  );
  check(
    request(admin, "POST", `/admin/drugs/${drugId}/batches`, {
      batchNumber: "BATCH-TEST",
      expiryDate: future,
      quantity: 5,
    }).status === 201,
    "admin imports batch",
  );
  check(
    request(admin, "PATCH", `/admin/drugs/${drugId}/sale-status`, {
      isForSale: false,
    }).data.isForSale === false,
    "admin toggles sale status",
  );
  const inventory = request(staff, "GET", `/inventory/${drugId}`);
  check(
    inventory.status === 200 &&
      inventory.data.availableQuantity === 5 &&
      inventory.data.batches[0].batchNumber === "BATCH-TEST",
    "inventory detail has quantities and batches",
  );
  check(
    request(staff, "GET", "/reports/low-stock").status === 200 &&
      request(staff, "GET", "/reports/expiring?days=30").status === 200,
    "both inventory reports load",
  );
  check(
    request(staff, "GET", "/dashboard/summary").status === 200,
    "dashboard summary loads",
  );
  check(
    request(user, "GET", "/staff/payments").status === 403 &&
      request(staff, "GET", "/admin/payment-settings").status === 403,
    "server enforces Staff/Admin roles",
  );
  writeFileSync(
    join(tmpdir(), "pharmacy-backoffice-smoke-result.json"),
    JSON.stringify({
      checks,
      orderId,
      saleId,
      onlineInvoice: fulfilled.data.invoiceId,
      counterInvoice: checkout.data.invoiceId,
      paperId,
      drugId,
    }),
  );
  console.log(`All ${checks} checks passed through ${base}/api.`);
} finally {
  const cleanupPath = resolve(folder);
  assert.ok(
    dirname(cleanupPath) === resolve(tmpdir()) &&
      basename(cleanupPath).startsWith("pharmacy-backoffice-curl-"),
    "cleanup stays in the smoke test temporary directory",
  );
  rmSync(cleanupPath, { recursive: true, force: true });
}
