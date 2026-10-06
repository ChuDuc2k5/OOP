# Review `be/m2-catalog-inventory` — APPROVED

Reviewer: PO · 2026-10-06

- `dotnet build` 0 warning; `dotnet test` 84/84 pass (TC-09..12, 14..19, 22, 23 + biên D/D+1/D+30/D+31, đồng thời, rollback)
- Smoke HTTP: Guest `/api/products` không có `unitPrice`, Admin có; `/api/inventory/PARA500` tách lô hết hạn (D−5, D) và còn hạn; low-stock gồm biên = ngưỡng (Amlodipine 8/8) và = 0; expiring sắp theo hạn; lô trùng → 409 `DUPLICATE`; `isControlled` không kèm `requiresPrescription` → 400
- `InventoryService.Execute` gom khóa + transaction cho workflow sau (M3/M4) dùng chung — đúng ARCHITECTURE §6; FEFO ở `Drug.PlanFEFO`, trừ qua `DrugBatch.Deduct`

Ghi chú cho M5: `InventoryReader.Snapshot` nạp toàn bộ thuốc/lô vào bộ nhớ — cần đo NFR-01 với 500 thuốc/2.000 lô. `unitPrice` serialize dạng `2000.0` (JS đọc vẫn là 2000, chấp nhận).
