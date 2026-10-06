# Review `be/m3b-postgres` — APPROVED

Reviewer: PO · 2026-10-06

- `dotnet build` 0 warning; `dotnet test` 132 pass, 1 skip (smoke Postgres cần `PHARMACY_TEST_POSTGRES`)
- Provider qua `Database:Provider`; migration Postgres riêng (`Migrations/Postgres`, history ở schema `pharmacy`), SQLite giữ nguyên migration cũ
- Lỗi trùng khóa độc lập provider (`DatabaseErrors`), sequence atomic, thời điểm lưu UTC
- `.env` được nạp trong app (`EnvironmentFile`), không log giá trị; `.env.example` không chứa bí mật
- Kiểm chứng trên Supabase thật: xem mục dưới

## Kiểm chứng trên Supabase thật (2026-10-06)
- Session pooler (`aws-0-ap-northeast-1`, SSL Require): migrate tạo schema + bảng, seed thành công
- API: 11 sản phẩm đang bán, 4 tài khoản demo, 3 đơn thuốc, dashboard đúng; đăng nhập admin OK
- Khởi động lại: không seed đè (vẫn 11 sản phẩm), không lỗi
- Lưu ý vận hành: `ConnectionStrings__Default` phải nằm trên MỘT dòng; Username dạng `postgres.<project-ref>`
