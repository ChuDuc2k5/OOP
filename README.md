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
| .NET API (web tự gọi, không cần mở) | http://localhost:5000/api |

Chạy riêng: `npm.cmd run dev:web`, `npm.cmd run dev:api` (API chạy bản build Release để tránh Windows Smart App Control chặn DLL Debug; nếu chạy tay dùng `dotnet run --project backend/Pharmacy.Api --launch-profile http -c Release`). Test backend: `npm.cmd run test` (= `dotnet test Pharmacy.sln`).

## Cấu hình
Sao chép mẫu `.env` sau khi clone (file `.env` bị Git bỏ qua):

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/Pharmacy.Api/.env.example backend/Pharmacy.Api/.env
```

- `BACKEND_URL` (frontend): địa chỉ API .NET cho Next.js rewrites, mặc định `http://localhost:5000`.
- `backend/Pharmacy.Api/.env`: biến môi trường .NET dạng `Section__Key` (được `npm run dev:api` nạp qua `scripts/run-api.mjs`; `dotnet run` trực tiếp không tự nạp).

## Tài khoản ban đầu

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Quản lý (Admin) | `admin` | `Admin@12345` |
| Nhân viên (Staff) | `staff` | `Staff@12345` |
| Khách hàng – Chu Đức | `chuduc` | `User@12345` |
| Khách hàng | `nguyenvana` | `User@12345` |

Tài khoản nhận tiền và ảnh QR **không** được tạo sẵn: đăng nhập `admin` → **Cài đặt QR** để cấu hình trước khi khách thanh toán.
Nạp thêm danh mục thuốc vào database đã có dữ liệu: `dotnet run --project backend/Pharmacy.Api --launch-profile http -- --seed-catalog`.

## Dành cho lập trình viên
- Danh sách API đầy đủ: [docs/API_CONTRACT.md](docs/API_CONTRACT.md).
- Khi chạy ở chế độ Development, backend tự sinh mô tả API dạng OpenAPI tại `http://localhost:5000/openapi/v1.json` (file JSON, dùng cho công cụ như Postman; người dùng không cần mở).
