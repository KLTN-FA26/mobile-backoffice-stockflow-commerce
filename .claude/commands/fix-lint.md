---
description: Sửa hết lỗi lint và typecheck, không dùng any hay eslint-disable để lách
allowed-tools: Bash(pnpm run:*), Bash(pnpm exec:*), Bash(git stash:*), Bash(git diff:*), Bash(git status:*), Read, Edit, Grep, Glob
---

Sửa lỗi lint + typecheck trong `${1:-app và src}`.

## Quy trình

1. Chạy `pnpm run typecheck` và `pnpm run lint` — xem toàn bộ lỗi trước khi sửa gì.
2. Nếu lỗi nhiều, phân loại trước: lỗi do thay đổi gần đây hay lỗi có sẵn trên baseline? Kiểm chứng bằng `git stash -u` → chạy lại → `git stash pop`.
3. Sửa từng nhóm lỗi một, chạy lại sau mỗi nhóm để chắc không tạo lỗi mới.
4. Chạy `pnpm run lint` lần cuối — phải 0 warning (`--max-warnings 0`) và `check-style-bans` sạch.

## Cấm lách

Những cách này bị cấm vì chúng giấu lỗi thay vì sửa:

- `any` — dùng `unknown` + narrow, hoặc khai đúng type từ `z.infer`.
- `eslint-disable` / `eslint-disable-next-line` — trừ khi có lý do kỹ thuật thật, và phải kèm comment giải thích tại sao.
- `@ts-expect-error` / `@ts-ignore`, và `!` non-null assertion.
- Ép kiểu `as X` / `as unknown as` để dập tắt lỗi — chỉ dùng khi thực sự biết rõ hơn compiler và có comment.

## Ranh giới

- Lỗi ranh giới import (`import/no-restricted-paths`, `no-restricted-imports`) là **lỗi kiến trúc**: sửa cấu trúc (đưa phần dùng chung lên `@/lib` / `@/components`), không tắt luật.
- Lỗi lint nằm trong file `verbatim` của `port-manifest.json`: **không sửa file** (hook chặn). Thêm override theo file vào `VERBATIM_OVERRIDES` trong `eslint.config.mjs`
  kèm 1 dòng lý do — xem `.claude/rules/web-parity.md`.
- Hex trần / gradient / hồng: chuyển sang token trong `src/lib/tokens.ts`, không né bằng cách đổi cách viết.

Chỉ sửa lỗi lint/type. **Không** nhân tiện refactor, đổi tên, hay "dọn dẹp" thêm — việc đó làm diff khó review và vượt phạm vi task.

Nếu một lỗi cần đổi kiến trúc mới sửa được, dừng lại và báo cho người dùng thay vì tự quyết.
