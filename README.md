# Pharmacy Management System

Khung dự án quản lý nhà thuốc: **React → NestJS gateway → C# ASP.NET Core API**.

## Cấu trúc

- `frontend/`: React + TypeScript + Vite.
- `gateway/`: NestJS, điểm truy cập API cho frontend; gọi backend .NET.
- `backend/Pharmacy.Api/`: ASP.NET Core Web API (.NET 10).
- `Pharmacy.sln`: solution backend.

## Yêu cầu

Node.js 22.12+ (khuyến nghị Node 24), npm và .NET SDK 10.0.400 hoặc bản feature mới hơn trong .NET 10.

## Cài đặt và chạy

Chạy từ thư mục gốc:

```powershell
npm.cmd install
dotnet restore Pharmacy.sln
npm.cmd run dev
```

Mở http://localhost:5173. Trang chủ kiểm tra kết nối React → gateway → backend.
Ctrl+C dừng cả ba dịch vụ.

| Dịch vụ | Địa chỉ |
| --- | --- |
| React | http://localhost:5173 |
| NestJS gateway | http://localhost:3000/api |
| .NET API | http://localhost:5000/api |
| OpenAPI (.NET, Development) | http://localhost:5000/openapi/v1.json |

Chạy riêng từng dịch vụ:

```powershell
npm.cmd run dev:web
npm.cmd run dev:gateway
npm.cmd run dev:api
```

## Cấu hình

Các file `.env` local đã được tạo và được Git bỏ qua. Sau khi clone trên máy khác, sao chép mẫu nếu chưa có file `.env`:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item gateway/.env.example gateway/.env
Copy-Item backend/Pharmacy.Api/.env.example backend/Pharmacy.Api/.env
```

- `VITE_GATEWAY_URL`: địa chỉ gateway để React gọi API.
- `PORT`: cổng gateway.
- `FRONTEND_ORIGIN`: origin được gateway cho phép qua CORS.
- `BACKEND_URL`: địa chỉ API .NET.
- `EXTERNAL_API_KEY` trong `gateway/.env`: API key bí mật cho NestJS, đọc bằng `process.env.EXTERNAL_API_KEY`.
- `ApiKeys__ExternalService` trong `backend/Pharmacy.Api/.env`: API key bí mật cho .NET, đọc bằng `builder.Configuration["ApiKeys:ExternalService"]`.
- Cổng backend local được cấu hình trong `backend/Pharmacy.Api/Properties/launchSettings.json`.

Khởi động lại dịch vụ sau khi đổi biến môi trường. Không lưu bí mật trong biến `VITE_*` vì các biến này được đưa vào trình duyệt.

Điền key thật vào `.env` của dịch vụ sử dụng key. Các file `.env.example` chỉ chứa giá trị mẫu hoặc key rỗng và có thể commit. Không điền key thật vào `.env.example`.

`npm.cmd run dev` và `npm.cmd run dev:api` nạp `.env` cho .NET qua launcher Node; chạy trực tiếp `dotnet run` không tự nạp file này. Quy ước `__` được .NET ánh xạ thành `:` trong cấu hình ([tài liệu Microsoft](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/)). Launcher dùng [Node `--env-file-if-exists`](https://nodejs.org/download/release/v22.12.0/docs/api/cli.html#--env-file-if-existsfile).

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd run build
```

Endpoint:
- `GET /api/health` trên gateway: trạng thái gateway.
- `GET /api/health/backend` trên gateway: gọi health backend; trả 503 khi backend không khả dụng.
- `GET /api/health` trên .NET: trạng thái backend.

Đây là khung khởi tạo; chưa có database, đăng nhập hoặc nghiệp vụ quản lý thuốc.
Gateway chỉ chuyển tiếp endpoint đã khai báo; các API nghiệp vụ sẽ được bổ sung khi phát triển.

Tài liệu: [React với Vite](https://react.dev/learn/build-a-react-app-from-scratch), [NestJS](https://docs.nestjs.com/first-steps).
