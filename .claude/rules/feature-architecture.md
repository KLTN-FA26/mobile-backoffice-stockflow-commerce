---
description: Cấu trúc feature folder, ranh giới import (ESLint bắt), giới hạn kích thước file
paths:
  - "src/features/**"
  - "src/components/shared/**"
  - "app/**"
---

# Kiến trúc feature

Nguồn: spec §2.1–§2.2. **Nghiệp vụ sống trong `src/features/`.** File route trong `app/` chỉ compose
màn hình, không chứa logic.

## Feature folder — 7 file + `errors.ts`

```
src/features/<feature>/
├── api.ts          # gọi BE qua @/lib/api/client: listX, getX, submitX…
├── schemas.ts      # zod: XDto (từ BE) + XCreateInput (form, kèm BR refine cite docs)
├── types.ts        # chỉ z.infer từ schemas — KHÔNG khai interface tay
├── queries.ts      # useXs(params), useX(id), key factory
├── mutations.ts    # useSubmitX()… kèm bản đồ invalidate
├── lifecycle.ts    # X_TRANSITIONS + allowedActions(...) — chép từ bảng "Chuyển tiếp cho phép" của docs
├── selectors.ts    # computeXStats(list)… — PURE, không side effect
├── errors.ts       # mã lỗi BE → câu tiếng Việt (bảng *_ERROR_MESSAGES)
├── components/     # component cấp màn hình, tách nhỏ
└── index.ts        # public API của feature
```

- Feature của app (§2.2): `receipt` · `inventory` · `inventory-item` · `transfer` · `move` · `order` ·
  `fulfillment` · `shipping`. Không tạo feature ngoài danh sách này khi chưa có quyết định mới.
- Vượt giới hạn dòng thì tách file theo đúng tên web đang dùng để port được (§6.2):
  `input-schemas.ts`, `*-lifecycle.ts`, `*-selectors.ts`, `*-errors.ts`, `status-helpers.ts`.
- Component (`*.tsx`) viết mới cho RN theo `mobile-backoffice.md` — **không copy** từ web.

## Giới hạn kích thước — vượt là phải tách

| Loại                              | Tối đa   |
| --------------------------------- | -------- |
| File feature                      | 200 dòng |
| Component                         | 150 dòng |
| File route trong `app/` (`*.tsx`) | 60 dòng  |

ESLint chưa đo số dòng — `architecture-reviewer` kiểm (`wc -l`).

## Ranh giới import — ESLint bắt (`eslint.config.mjs`)

| Cấm                                                                                                                                       | Luật ESLint                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `features/A` import `features/B` (đưa phần dùng chung lên `@/lib` hoặc `@/components`)                                                    | `import/no-restricted-paths` — một vùng cho mỗi thư mục con feature |
| `components/shared` import `features/*` hoặc `lib/api/*` (shared phải vô nghiệp vụ)                                                       | `import/no-restricted-paths`                                        |
| `app/**` import `@/lib`, `@/hooks`, `@/providers` — chỉ `@/features/*` + `@/components/*` (`_layout.tsx` được miễn để gắn provider)       | `import/no-restricted-paths`                                        |
| `Text`, `Pressable`, `TouchableOpacity`, `Button`, `TextInput` từ `react-native` trong `features/**` và `app/**` — dùng `@/components/ui` | `no-restricted-imports`                                             |
| import `@/lib/mock-data` (app luôn gọi BE thật, không mock mode — D5)                                                                     | `no-restricted-imports` + `scripts/check-style-bans.mjs`            |

Thêm feature mới → vùng cấm tự sinh theo tên thư mục. Lint đỏ vì ranh giới là lỗi kiến trúc: sửa cấu trúc,
không `eslint-disable`.

## Nguyên tắc nền

- `src/constants/` là tầng thấp nhất — **không import gì** khác trong `src/`. Copy từ web (verbatim), không
  sửa tay; hằng số chỉ của mobile → `src/constants/mobile/**` (xem `web-parity.md`).
- Không hardcode chuỗi hiển thị, số, route, status, query key — lấy từ constants.
- Không `any`, `@ts-ignore`, `!` non-null, `as unknown as` không lý do — dùng `unknown` + narrow / zod parse.
- Mọi `BR-xx` encode trong zod refine hoặc transition table có comment cite docs (skill `zod-br-schema`).
- Action-gating và quyền → `mobile-backoffice.md`; ranh giới state → `state-persistence.md`;
  data layer → `api-conventions.md`; test bắt buộc → `testing.md`.
