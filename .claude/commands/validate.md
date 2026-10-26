---
description: Chạy đủ quy trình verify (pnpm run validate) và phân biệt lỗi mới với lỗi có sẵn trên baseline
allowed-tools: Bash(pnpm run:*), Bash(pnpm test:*), Bash(pnpm sync:check), Bash(git stash:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*)
---

Chạy quy trình verify bắt buộc theo CLAUDE.md (spec §8.3). **Không được suy đoán "chắc là pass".**

## Bước 1 — chạy, đúng thứ tự

```
pnpm run typecheck
pnpm run lint
pnpm run test:coverage
pnpm run test:scripts
pnpm sync:check
pnpm run doctor
pnpm run export:check
```

Hoặc gộp `pnpm run validate` (= đúng 7 lệnh trên, dừng ở lệnh đầu tiên hỏng). Chạy riêng từng lệnh khi cần thấy rõ lệnh nào hỏng.

- `test:coverage` = Jest + coverage; **thiếu ngưỡng là lỗi** (`lib/domain/**` 90/90 từng file, component 70/70 gộp thư mục — `jest.config.js`). Sửa bằng test hành vi cho nhánh chưa phủ, không hạ ngưỡng. `pnpm test` (không coverage) chỉ để chạy nhanh khi đang làm; lần chạy coverage đầu với cache lạnh mất vài phút.

- `lint` = ESLint (`--max-warnings 0`) + `scripts/check-style-bans.mjs` (hex trần, gradient, hồng/magenta, import mock-data); ESLint còn giữ ranh giới import và `max-lines`.
- `sync:check` đọc repo web ở `STOCKFLOW_WEB_REPO` (mặc định `../stockflow-ui`) tại `origin/develop`, **không fetch**. Báo thiếu repo/ref → nhờ người dùng clone/`git fetch`, đừng tự fetch.
- `export:check` = `expo export` cho Android + iOS (build JS bundle, bắt lỗi import/Metro). Build native (APK/IPA) qua EAS, không nằm trong validate.

## Bước 2 — dán output thật

Dán output thật của từng lệnh làm bằng chứng. **Không** mô tả chung chung kiểu "typecheck pass, lint ok". Người đọc phải thấy được con số và dòng lỗi.

## Bước 3 — nếu còn lỗi, phân biệt nguồn gốc

Lỗi mình gây ra hay lỗi đã có sẵn trên baseline? Kiểm chứng:

```
git stash -u               # cất thay đổi của mình (kể cả file mới)
pnpm run <lệnh hỏng>       # chạy lại trên HEAD sạch
git stash pop              # lấy lại thay đổi
```

So số lượng lỗi trước/sau. Rồi:

- **Lỗi mình gây ra** → phải sửa xong mới được báo hoàn thành.
- **Lỗi có sẵn trên baseline** → báo cho người dùng biết, **không tự ý sửa** ngoài phạm vi task.

## Bước 4 — báo cáo

Nêu rõ: lệnh nào pass, lệnh nào fail, bao nhiêu lỗi, lỗi nào là của mình. Nếu tất cả pass thì nói thẳng là pass, không rào đón.

Không dùng `any`, `eslint-disable`, hay `@ts-expect-error` để lách cho qua. File `verbatim` lệch web → `pnpm sync:pull`, không sửa tay.
