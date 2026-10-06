# Review `be/m1-foundation` — APPROVED

Reviewer: PO · 2026-10-06

## Vòng 1 — Changes requested
| Mức | Vấn đề | Kết quả |
|---|---|---|
| BLOCKER | Mojibake tiếng Việt trong `DbSeeder.cs`, `FoundationTests.cs`, `PersistenceTests.cs` | Đã sửa, file UTF-8 |
| MAJOR | Nhiều câu lệnh trên một dòng, khó giải thích (NFR-07/AC-10) | Đã định dạng lại + `.editorconfig` |
| MINOR | Seed thiếu thuốc đang bán tồn = 0, đơn vị/mô tả chung chung | Đã bổ sung |

## Vòng 2 — Đã kiểm tra
- `dotnet build Pharmacy.sln` 0 warning/0 error; `dotnet test` 43/43 pass (TC-01..08, TC-55 + test nền tảng)
- Smoke HTTP thật: health 200; csrf 204; login staff → `homePath:/staff`; staff gọi `/api/admin/accounts` → 403 `FORBIDDEN`; POST thiếu `X-XSRF-TOKEN` → 400 `ANTIFORGERY_INVALID`; register gửi kèm `role:"Admin"` → tạo `User` (TC-03)
- Domain: `DrugBatch.Quantity` private set + `Deduct`, `Drug.PlanFEFO`, `Sale` abstract + `OTCSale`/`PrescriptionSale.Validate` — đúng OOP-01/02

## Quyết định cho câu hỏi của dev
- DB ở `backend/data` (`Data Source=../data/pharmacy.db`) — giữ. Cookie `pharmacy.antiforgery` — chấp nhận. Giới hạn 9.999 mã/ngày — chấp nhận.
