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
| `docs/` | SRS, kiến trúc, API contract, báo cáo và bằng chứng kiểm thử |

## Tài liệu
- [SRS v2.0](docs/SRS_v2.0.md) (bản Word: `docs/SRS_OOP.docx`, diagram: `docs/diagrams/`)
- [Kiến trúc & quyết định](docs/ARCHITECTURE.md) · [API Contract](docs/API_CONTRACT.md)
- [Kết quả kiểm thử](docs/TEST_STATUS.md) · [Nhật ký sử dụng AI](docs/AI_USAGE_LOG.md)
- [Báo cáo tuần 4](docs/WEEK4_FINAL_REPORT.md) · [Self-Explanation và 10 câu hỏi bảo vệ](docs/WEEK4_SELF_EXPLANATION_DEFENSE.md)
- [Demo mở rộng domain](examples/Week4.ExtensibilityDemo/README.md) · [Minh chứng tuần 4](docs/test-results/WEEK4_FINAL_2026-10-29.md)

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

## Kiểm tra và demo tuần 4

```powershell
dotnet run --project examples/Week4.ExtensibilityDemo --configuration Release
dotnet test examples/Week4.ExtensibilityDemo.Tests --configuration Release
dotnet test backend/Pharmacy.Tests/Pharmacy.Tests.csproj --configuration Release
npm.cmd run test:e2e --workspace frontend
```

Demo mới chỉ mở rộng domain validation qua `Sale`, chưa tích hợp subtype vào API/EF. E2E dùng cổng riêng 3017/5017 và API Release. Có thể đặt `PHARMACY_E2E_CHANNEL=chrome` để dùng Chrome đã cài và `PHARMACY_E2E_EVIDENCE_DIR` để giữ ảnh riêng; nếu không chọn channel thì chuẩn bị Chromium bằng Playwright. Xem hồ sơ tuần 4 để biết nguồn, thời điểm và phạm vi của từng lượt test.

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
