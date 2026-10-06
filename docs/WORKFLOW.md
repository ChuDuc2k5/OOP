# Quy trình làm việc nhóm (AI team)

| Vai trò | Ai | Phạm vi được sửa |
|---|---|---|
| PO / PM / Reviewer | Claude Code | `docs/`, `README.md`, merge vào `main` |
| Backend dev (.NET C#) | ChatGPT Codex | chỉ `backend/` (+ đề xuất sửa `docs/API_CONTRACT.md` qua PO) |
| Frontend dev (React/Next.js) | Antigravity | chỉ `frontend/` |

## 1. Nhánh

- `main`: chỉ PO merge. Không ai push thẳng lên `main`.
- Mỗi milestone một nhánh, tách từ `main` mới nhất:
  - Backend: `be/m1-foundation`, `be/m2-catalog-inventory`, `be/m3-prescription-cart-order`, `be/m4-sale-payment-checkout`, `be/m5-hardening`
  - Frontend: `fe/m1-foundation`, `fe/m2-customer`, `fe/m3-backoffice`, `fe/m4-polish`
- Sửa theo review: commit tiếp **trên cùng nhánh**, push lại. Không force-push sau khi đã báo PO review.
- Trước khi báo "xong": `git fetch origin && git merge origin/main` (hoặc rebase) để nhánh không xung đột.

## 2. Commit

Conventional Commits, tiếng Anh hoặc Việt đều được, có mã function khi liên quan:
```
feat(be): F006 add batch import endpoint
fix(fe): F017 keep QR snapshot after settings change
test(be): TC-18 FEFO allocation across batches
```

## 3. Định nghĩa "Xong" (DoD) — PO chỉ review khi đủ

**Backend**
- [ ] `dotnet build backend/Pharmacy.sln` không lỗi, không warning mới nghiêm trọng
- [ ] `dotnet test backend/Pharmacy.sln` xanh; có test cho các TC của milestone (tên test chứa mã TC, vd `TC18_Fefo_SplitsAcrossBatches`)
- [ ] Endpoint đúng `docs/API_CONTRACT.md` (URL, DTO, mã lỗi)
- [ ] Quyền kiểm tra ở server; không nghiệp vụ trong Controller
- [ ] Chạy được: `dotnet run --project backend/src/Pharmacy.Api` → DB tự migrate + seed khi trống
- [ ] Cập nhật `backend/README.md` (chạy/test) và mục "Đã làm" trong `docs/TASKS_BACKEND.md`

**Frontend**
- [ ] `npm run build` và `npm run lint` trong `frontend/` không lỗi
- [ ] Gọi đúng endpoint/DTO theo contract; xử lý `ApiError` (hiển thị `errors` dưới ô nhập, `title` ở toast)
- [ ] Giao diện tiếng Việt, VND, `dd/MM/yyyy`; dùng được ở 1366 px và 390 px
- [ ] Ẩn nút theo role/cờ server (`canPay`, `canCancel`, `canCheckout`) — nhưng không dựa vào ẩn nút để bảo mật
- [ ] Cập nhật `frontend/README.md` và mục "Đã làm" trong `docs/TASKS_FRONTEND.md`

## 4. Báo xong & review

1. Dev push nhánh, báo người dùng: *"Nhánh `be/m1-foundation` sẵn sàng review"* + tóm tắt + cách test.
2. Người dùng chuyển cho PO (Claude). PO: fetch → build → test → chạy thử → đọc diff theo checklist.
3. Kết quả:
   - **Approved** → PO merge `--no-ff` vào `main`, push. Dev bắt đầu milestone kế tiếp từ `main` mới.
   - **Changes requested** → PO ghi `docs/reviews/<nhánh>.md` (trên `main`) với danh sách việc phải sửa, mức độ `BLOCKER` / `MAJOR` / `MINOR`. Dev sửa hết BLOCKER + MAJOR rồi báo lại.

## 5. Khi contract chưa rõ / cần đổi

Dev **không tự đổi** URL/DTO. Ghi câu hỏi vào cuối file task của mình (mục "Câu hỏi cho PO") hoặc báo người dùng; PO trả lời và cập nhật `docs/API_CONTRACT.md`.
FE được phép dùng **mock** (`NEXT_PUBLIC_USE_MOCK=true`) khi BE chưa có endpoint, nhưng mock phải đúng shape trong contract.
