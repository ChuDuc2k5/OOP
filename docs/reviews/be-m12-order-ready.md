# Review `be/m12-order-ready` — APPROVED

Reviewer: PO · 2026-10-06
- D15: `Order.ReadyAt` + `MarkReady` (Pickup, Preparing, có hóa đơn, idempotent); `POST /api/staff/orders/{id}/ready`; `readyAt` trong OrderView/OrderRow; migration `OrderReadyAt` SQLite + Postgres
- `dotnet test` 203 pass, 2 skip có chủ đích
