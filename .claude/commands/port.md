---
description: Port một module từ web sang mobile theo skill port-from-web (một module = một PR)
argument-hint: <feature> (receipt | inventory | inventory-item | transfer | move | order | fulfillment | shipping)
allowed-tools: Bash(pnpm run:*), Bash(pnpm exec:*), Bash(pnpm sync:*), Bash(pnpm test:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git branch:*), Bash(git -C:*), Read, Write, Edit, Grep, Glob
---

Port module `$1` từ web sang mobile bằng skill **`port-from-web`** (spec §10). Đọc skill đó và làm đúng quy trình trong đó.

## Trước khi bắt đầu

1. `$1` phải thuộc danh sách feature trong `argument-hint` (spec §2.2). Không thuộc → dừng, nói rõ và hỏi người dùng. **Không** port Load plan, Loại xe, Dashboard, Mua hàng,
   Master data, Platform, storefront (spec §1.3).
2. Tìm hàng của `$1` ở spec §5 (`docs/superpowers/specs/2026-10-25-stockflow-mobile-backoffice-design.md`) và implementation plan của giai đoạn tương ứng trong
   `docs/superpowers/plans/`; làm theo plan.
3. Đọc `.claude/rules/web-parity.md` (manifest, `verbatim` vs `adapted`), `feature-architecture.md`, `api-conventions.md`, `testing.md`, và skill `mobile-screen`.
4. Đọc docs nghiệp vụ của module trong `D:\FPTU\docs\docs\` — union type trạng thái, field name, `BR-xx`. Không bịa.
5. `pnpm sync:check` để biết baseline đồng bộ; thiếu repo web hoặc ref → nhờ người dùng clone / `git fetch` (không tự fetch, không sửa repo web).

## Ràng buộc

- **Cấm** sửa tay file `verbatim`, sửa `src/components/ui/**`, đổi tên field / tên trạng thái so với web, gộp hai module vào một feature, hardcode chuỗi hiển thị.
- Giữ đúng hành vi web ở các điểm lệch đã ghi (G1–G18) — không tự sửa.
- Giả định chưa chốt → comment `// ASSUMPTION (open-question Xn)` ngay tại code.
- Viết test đỏ trước, code xanh sau; test bắt buộc theo `testing.md`.

## Kết thúc

Chạy `/validate`. Chỉ báo xong khi có output thật của `pnpm run validate` và không còn lỗi do mình gây ra. Commit conventional (scope thuộc danh sách), không trailer công cụ.
Một module = một PR.
