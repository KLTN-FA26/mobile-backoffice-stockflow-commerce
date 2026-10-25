---
description: Chạy sync:check, hiện diff web đã đổi, hướng dẫn sync:pull / sync:ack (không fetch, không sửa repo web)
allowed-tools: Bash(pnpm sync:*), Bash(pnpm run sync:*), Bash(git -C:*), Bash(git status:*), Bash(git diff:*), Read, Grep, Glob
---

Kiểm tra file đã port có lệch repo web không và đề xuất cách đồng bộ. Cơ chế: `.claude/rules/web-parity.md` (spec §6).

## Bước 1 — kiểm tra

```
pnpm sync:check
```

Đọc-only, **không fetch**. Báo "không thấy repo web" hoặc "chưa có ref" → dừng và nhờ người dùng clone `stockflow-ui` vào `../stockflow-ui` (hoặc đặt `STOCKFLOW_WEB_REPO`) / tự `git fetch` ở đó.
Muốn so với web mới nhất thì **người dùng** tự fetch — bạn không fetch, không sửa repo web.

## Bước 2 — xử lý từng dòng lệch

Đọc `port-manifest.json` để biết `mode`, `source`, `sourceBlob`, `note` của từng `target` bị báo.

| Báo                          | Nghĩa                                             | Cách xử lý                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content-differs` (verbatim) | Nội dung khác web (web đã đổi hoặc ai đó sửa tay) | Xem diff dưới. Nếu là web đổi → `pnpm sync:pull <target>`. Nếu là sửa tay → hoàn tác bằng `sync:pull`; muốn giữ khác web thì phải đổi sang `adapted` (sửa `mode`, `note` trong manifest) |
| `source-changed` (adapted)   | Web đã đổi file nguồn kể từ lần port/ack          | Xem diff web, port phần cần thiết vào file mobile (giữ phần đã chuyển thể theo `note`), rồi `pnpm sync:ack <target>`                                                                     |
| `source-missing`             | Nguồn không còn trên web                          | Hỏi người dùng: xoá mục khỏi manifest (và file nếu không còn dùng) hay đổi `source`                                                                                                      |
| `target-missing`             | Thiếu file ở mobile                               | verbatim: `pnpm sync:pull <target>`; adapted: khôi phục file từ git                                                                                                                      |

Xem web đổi gì (đọc-only, repo web ở `../stockflow-ui` hoặc `$STOCKFLOW_WEB_REPO`; `webRef` trong manifest, hiện là `origin/develop`):

```
git -C ../stockflow-ui diff <sourceBlob> origin/develop:<source>     # adapted: web đổi gì kể từ lần port
git -C ../stockflow-ui log --oneline -n 10 origin/develop -- <source> # ai đổi, khi nào
```

Với `verbatim`: so file hiện tại với `git -C ../stockflow-ui show origin/develop:<source>`.

## Bước 3 — báo cáo và xác nhận

- Liệt kê từng `target`: mode, vấn đề, web đổi gì (tóm tắt diff), hành động đề xuất.
- `sync:pull` ghi đè file `verbatim` — chỉ chạy khi người dùng đồng ý hoặc yêu cầu đúng việc đồng bộ. `sync:ack` chỉ chạy **sau khi đã rà** và port xong phần web đổi.
- Sau khi xử lý: chạy lại `pnpm sync:check` (phải "không có lệch") và `pnpm run validate` nếu file đổi ảnh hưởng code (đổi `src/constants/**` có thể làm test/typecheck đỏ).
- Test port từ web hỏng sau khi đồng bộ → so với test tương ứng ở web (có thể cũng đã đổi) trước khi sửa; không xoá hay làm yếu case để test qua.
