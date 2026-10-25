---
name: port-from-web
description: Use when porting one feature module (receipt, inventory, transfer, order, …) from the web back-office to StockFlow Mobile — read docs and web feature, choose domain files, register them in port-manifest, adapt api/queries/mutations, build screens, write the mandatory tests, validate.
---

# Port một module từ web

Nguồn: spec §10 (lộ trình), §5 (bản đồ màn), §6 (đồng bộ), §8.2 (test). **Một module = một PR.** Chạy qua `/port <feature>`.
Feature hợp lệ: `receipt` · `inventory` · `inventory-item` · `transfer` · `move` · `order` · `fulfillment` · `shipping` — ngoài danh sách thì dừng và hỏi.

## 0. Chuẩn bị

- Một nhánh riêng cho module; có implementation plan của giai đoạn trong `docs/superpowers/plans/` — làm theo plan, không tự đổi phạm vi.
- Repo web ở `STOCKFLOW_WEB_REPO` (mặc định `../stockflow-ui`); nguồn là **`origin/develop`**, không phải nhánh đang checkout. Repo web chỉ **đọc**; người dùng tự `git fetch`.
  `pnpm sync:check` phải chạy được (nếu báo thiếu ref → nhờ người dùng fetch).

## 1. Đọc trước khi viết

1. Hàng tương ứng ở spec §5: route web → route mobile, loại màn, "chuyển đổi" từng màn; spec §7 (gap G1–G18 liên quan).
2. Docs nghiệp vụ của module trong `D:\FPTU\docs\docs\`: bảng trạng thái, "Chuyển tiếp cho phép", danh sách `BR-xx`. Docs thắng khi xung đột nghiệp vụ.
3. Feature web ở `origin/develop` — đọc bằng `git -C ../stockflow-ui ls-tree -r --name-only origin/develop src/features/<feature>` và
   `git -C ../stockflow-ui show origin/develop:<path>`.

## 2. Chọn file domain và đưa vào manifest

Phân loại từng file `src/features/<feature>/*` của web (spec §6.2):

| File                                                                                                                                    | Cách port                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `schemas`, `input-schemas`, `*-schemas`, `lifecycle`, `*-lifecycle`, `selectors`, `*-selectors`, `errors`, `*-errors`, `status-helpers` | `verbatim` nếu không import API web (`next/*`, `nuqs`, `mock-data`, localStorage, `@/components/*`); ngược lại `adapted` |
| `api.ts`, `queries.ts`, `mutations.ts`                                                                                                  | **`adapted`** — đổi client, bỏ đường BFF, kv-store thay sessionStorage                                                   |
| `*.test.ts` của các file trên                                                                                                           | `adapted` — `vi.*` → `jest.*`, **giữ nguyên case**                                                                       |
| Component `*.tsx`                                                                                                                       | **Không copy** — viết mới cho RN (bước 4)                                                                                |

```bash
pnpm sync:add src/features/<f>/schemas.ts src/features/<f>/lifecycle.ts …                    # verbatim (mặc định)
pnpm sync:add src/features/<f>/api.ts --mode adapted --note "client mobile, không BFF"        # adapted
```

- File `verbatim` **không sửa tay**. Lint đỏ vì luật chỉ có ở mobile → thêm block vào `VERBATIM_OVERRIDES` trong `eslint.config.mjs` (kèm 1 dòng lý do).
- Cần đổi một file `verbatim` → chuyển sang `adapted` trong `port-manifest.json` (`mode`, `note`) rồi mới sửa. Xem `.claude/rules/web-parity.md`.

## 3. `api.ts` / `queries.ts` / `mutations.ts` (adapted)

Giữ **y nguyên**: endpoint, params, parse DTO tại biên, mã quyền, idempotency (`Idempotency-Key`, `scanId`, `requestId`, `version`), invalidation map, thông báo lỗi. Chỉ đổi:

- Client → `@/lib/api/client` (gọi thẳng BE, không đường BFF; không `X-Warehouse-Id`).
- Danh sách → `createInfiniteListQuery`; key qua `createQueryKeys`; toast → `sonner-native` (qua factory).
- `sessionStorage` → kv-store `session:*` (`requestId`, danh sách quét lỗi); `crypto.randomUUID()` → `lib/platform/uuid`.
- Mutation đặt invalidate/toast ở factory, không lặp ở component (`api-conventions.md`).

## 4. Dựng màn

Theo skill **`mobile-screen`**: chọn loại màn từng route ở §5, file route ≤ 60 dòng compose từ `@/features/<f>`, component trong `features/<f>/components/`. Chuỗi mới của mobile →
`src/constants/mobile/**`. Nút dẫn sang load plan ẩn + ghi chú "thực hiện trên web"; in ấn chỉ xem; màn "Đang phát triển" → `ComingSoon`.

## 5. Test bắt buộc (§8.2) — viết đỏ trước

- Lifecycle: đủ trạng thái, terminal `[]`. Action-gating: ≥ 3 bộ quyền. Mỗi `BR-xx` một test có cite docs.
- Theo loại màn: Danh sách (skeleton, 2 loại rỗng, lỗi, cuộn thêm) · Chi tiết (nút đúng trạng thái + quyền, `ConfirmSheet`) · Form (validate, map lỗi server) · Trạm (hàng đợi quét, gửi lại/bỏ qua, danh sách quét lỗi, chặn bấm 2 lần).
- Test port từ web chạy xanh với case nguyên vẹn. Coverage `features/*/{schemas,lifecycle,selectors}` ≥ 90%, component ≥ 70%.

## 6. Hoàn tất

1. `pnpm run validate` — typecheck → lint → test → test:scripts → sync:check → doctor → export:check. **Dán output thật.**
2. Chạy `/design-check` và `architecture-reviewer` trên module; sửa lỗi do mình gây ra.
3. Commit conventional, subject viết thường, scope thuộc danh sách (`receipt`, `inventory`, `inventory-item`, `transfer`, `move`, `order`, `picking`, `packing`, `shipping`, `sync`, …), **không** trailer công cụ (skill `git-commits`).
