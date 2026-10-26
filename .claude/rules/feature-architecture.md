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

ESLint `max-lines` đo số dòng (như `wc -l`, tính cả dòng trống và comment) và **fail** khi vượt: `src/features/**` 200, `src/features/**/components/**`
và `src/components/**` 150, `app/**` 60; test (`*.test.*`, `__tests__/`) không bị đo. Ngoại lệ có tên duy nhất: `src/components/mobile/nav-config.ts`
(bảng điều hướng, một mục mỗi item hub) — hằng `COMPONENT_FILES_OVER_150_LINES` trong `eslint.config.mjs`. Thêm ngoại lệ mới = quyết định có lý do, không
`eslint-disable max-lines`. Vượt giới hạn thì tách file, đừng nén code.

## Ranh giới import — ESLint bắt (`eslint.config.mjs`)

| Cấm                                                                                                                                                                                                                    | Luật ESLint                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `features/A` import `features/B` (đưa phần dùng chung lên `@/lib` hoặc `@/components`)                                                                                                                                 | `import/no-restricted-paths` — một vùng cho mỗi thư mục con feature              |
| `components/shared` import `features/*`, `lib/api/*` (trừ `error.ts`, `load-error.ts`) hoặc `lib/references/*` (shared phải vô nghiệp vụ)                                                                              | `import/no-restricted-paths`                                                     |
| `components/shared` import trạng thái / hook / hành động auth (`@/lib/auth/**`) — nhận qua props; **`import type` thì được**                                                                                           | `@typescript-eslint/no-restricted-imports` (`allowTypeImports`)                  |
| `src/constants/**` import bất kỳ thứ gì khác trong `src/` (tầng thấp nhất)                                                                                                                                             | `import/no-restricted-paths`                                                     |
| `app/**` import `@/lib`, `@/hooks`, `@/providers` — được import `@/features/*`, `@/components/*`, `@/constants/*`. Chỉ `app/_layout.tsx` (layout gốc: config, font, polyfill, provider) được miễn                      | `import/no-restricted-paths` + danh sách có tên `ROUTE_LAYOUTS_WITH_LIB_IMPORTS` |
| `app/**` import thư viện dữ liệu: `@tanstack/react-query`, `axios`, `expo-secure-store`, `zustand` (layout cần thì thêm vào `ROUTE_LAYOUTS_WITH_DATA_LIBS`, kèm lý do; hiện không có)                                  | `@typescript-eslint/no-restricted-imports`                                       |
| `Text`, `Pressable`, `TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback`, `TouchableNativeFeedback`, `Button`, `TextInput` từ `react-native` trong `features/**` và `app/**` — dùng `@/components/ui` | `no-restricted-imports`                                                          |
| `Pressable`, `TouchableOpacity`, `TextInput` (và hai touchable trên) từ `react-native-gesture-handler` trong `features/**` và `app/**` — cùng lý do, cùng chỗ                                                          | `no-restricted-imports`                                                          |
| import `@/lib/mock-data` (app luôn gọi BE thật, không mock mode — D5)                                                                                                                                                  | `no-restricted-imports` + `scripts/check-style-bans.mjs`                         |
| File vượt 200 / 150 / 60 dòng (mục trên)                                                                                                                                                                               | `max-lines`                                                                      |

Thêm feature mới → vùng cấm tự sinh theo tên thư mục. Lint đỏ vì ranh giới là lỗi kiến trúc: sửa cấu trúc,
không `eslint-disable`. Mọi luật trên có ca kiểm trong `scripts/__tests__/eslint-rules.test.mjs` (project giả dựng đúng cấu trúc thư mục);
đổi luật → đổi cả ca kiểm.

## Nguyên tắc nền

- `src/constants/` là tầng thấp nhất — **không import gì** khác trong `src/` (ESLint bắt). Copy từ web (verbatim), không
  sửa tay; hằng số chỉ của mobile → `src/constants/mobile/**` (xem `web-parity.md`).
- Không hardcode chuỗi hiển thị, số, route, status, query key — lấy từ constants.
- Không `any`, `@ts-ignore`, `!` non-null, `as unknown as` không lý do — dùng `unknown` + narrow / zod parse.
- Mọi `BR-xx` encode trong zod refine hoặc transition table có comment cite docs (skill `zod-br-schema`).
- Action-gating và quyền → `mobile-backoffice.md`; ranh giới state → `state-persistence.md`;
  data layer → `api-conventions.md`; test bắt buộc → `testing.md`.
