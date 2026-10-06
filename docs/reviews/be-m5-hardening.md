# Review `be/m5-hardening` — APPROVED

Reviewer: PO · 2026-10-06

- `dotnet build` 0 warning; `dotnet test` 174 pass, 2 skip có chủ đích (Postgres smoke cần `PHARMACY_TEST_POSTGRES`; NFR-01 cần `PHARMACY_TEST_PERFORMANCE=1`)
- OOP-01: `CheckoutService`/`SaleEvaluation` không còn rẽ nhánh theo `Kind`; hiệu ứng hoàn tất qua `sale.ApplyCompletionEffects(...)` của subtype
- NFR-01: PO tự chạy `PHARMACY_TEST_PERFORMANCE=1 dotnet test --filter NFR01` → Pass (500 thuốc/2.000 lô/1.000 đơn, p95 mọi endpoint < 50 ms theo docs/TEST_REPORT_BE.md)
- `docs/TEST_REPORT_BE.md`: 56/56 TC backend Pass
