# Pharmacy Management System

Đồ án môn Lập trình hướng đối tượng (OOP) – HK1 2026–2027. Website nhà thuốc: mua hàng trực tuyến (QR thủ công) + bán tại quầy, quản lý thuốc theo lô (FEFO), đơn thuốc, hóa đơn, báo cáo kho.

**Next.js (React) → ASP.NET Core Web API (C#, .NET 10) → SQLite**

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `frontend/` | Next.js + React + TypeScript (App Router). `/api/*` được rewrite sang backend |
| `backend/Pharmacy.Api/` | ASP.NET Core Web API: controller, DTO, auth |
| `backend/Pharmacy.Core/` | Domain, service nghiệp vụ, EF Core DbContext |
| `backend/Pharmacy.Tests/` | xUnit |
| `Pharmacy.sln` | Solution backend |
| `docs/` | SRS, kiến trúc, API contract, backlog, review |

## Tài liệu
- [SRS v2.0](docs/SRS_v2.0.md) (bản Word: `docs/SRS_OOP.docx`, diagram: `docs/diagrams/`)
- [Kiến trúc & quyết định](docs/ARCHITECTURE.md) · [API Contract](docs/API_CONTRACT.md)
- [Quy trình nhóm](docs/WORKFLOW.md) · [Backlog BE](docs/TASKS_BACKEND.md) · [Backlog FE](docs/TASKS_FRONTEND.md)

## Yêu cầu
Node.js 22.12+ (khuyến nghị 24), npm, .NET SDK 10.0.400+.

## Cài đặt và chạy (từ thư mục gốc)

```powershell
npm.cmd install
dotnet restore Pharmacy.sln
npm.cmd run dev
```

| Dịch vụ | Địa chỉ |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| .NET API | http://localhost:5000/api |
| OpenAPI (Development) | http://localhost:5000/openapi/v1.json |

Chạy riêng: `npm.cmd run dev:web`, `npm.cmd run dev:api`. Test backend: `npm.cmd run test` (= `dotnet test Pharmacy.sln`).

## Cấu hình
Sao chép mẫu `.env` sau khi clone (file `.env` bị Git bỏ qua):

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/Pharmacy.Api/.env.example backend/Pharmacy.Api/.env
```

- `BACKEND_URL` (frontend): địa chỉ API .NET cho Next.js rewrites, mặc định `http://localhost:5000`.
- `backend/Pharmacy.Api/.env`: biến môi trường .NET dạng `Section__Key` (được `npm run dev:api` nạp qua `scripts/run-api.mjs`; `dotnet run` trực tiếp không tự nạp).

Tài khoản demo (dữ liệu mẫu): xem `docs/ARCHITECTURE.md §8`.
