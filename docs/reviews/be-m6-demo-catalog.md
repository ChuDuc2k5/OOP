# Review `be/m6-demo-catalog` — APPROVED

Reviewer: PO · 2026-10-06

- Danh mục 44 thuốc + 56 ảnh minh họa tự vẽ (PO soạn `Data/Seed/catalog.json`, `tools/drug-images/generate.py`); dev nhúng EmbeddedResource, seed DB trống đủ 56 thuốc (giữ nguyên 12 thuốc/lô cũ cho test), 103 lô tất định
- Lệnh `-- --seed-demo-catalog`: chỉ thêm thuốc/lô/ảnh còn thiếu, idempotent, chạy xong thoát
- `dotnet build` 0 warning; `dotnet test` 178 pass, 2 skip có chủ đích (chạy ở worktree chính vì Windows Smart App Control chặn DLL test build trong worktree dev)
