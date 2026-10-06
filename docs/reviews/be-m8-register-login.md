# Review `be/m8-register-login` — APPROVED

Reviewer: PO · 2026-10-06
- D10: `POST /api/auth/register` tạo User rồi đăng nhập luôn (cookie + XSRF mới), trả `201 Me`; lỗi validate/trùng không đăng nhập; role gửi lên vẫn chỉ tạo User
- Gom logic đăng nhập vào `SignIn(account)` dùng chung cho register/login
- `dotnet test` 189 pass, 2 skip có chủ đích
