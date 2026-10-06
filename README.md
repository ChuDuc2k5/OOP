# Pharmacy Management System

Đồ án môn Lập trình hướng đối tượng (OOP) – HK1 2026–2027. Website nhà thuốc: mua hàng trực tuyến (QR thủ công) + bán tại quầy, quản lý thuốc theo lô (FEFO), đơn thuốc, hóa đơn, báo cáo kho.

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Backend | ASP.NET Core Web API (.NET 10), EF Core, SQLite, xUnit | `backend/` |
| Frontend | Next.js (React, TypeScript, Tailwind) | `frontend/` |

## Tài liệu
- [SRS v2.0](docs/SRS_v2.0.md) (bản Word: `docs/SRS_OOP.docx`, diagram: `docs/diagrams/`)
- [Kiến trúc & quyết định](docs/ARCHITECTURE.md)
- [API Contract](docs/API_CONTRACT.md)
- [Quy trình nhóm](docs/WORKFLOW.md) · [Backlog BE](docs/TASKS_BACKEND.md) · [Backlog FE](docs/TASKS_FRONTEND.md)

## Chạy dự án
_(Hoàn thiện khi backend/frontend được merge)_

```bash
dotnet run --project backend/src/Pharmacy.Api     # http://localhost:5080
cd frontend && npm install && npm run dev         # http://localhost:3000
```

Tài khoản demo (chỉ dữ liệu mẫu): xem `docs/ARCHITECTURE.md §8`.
