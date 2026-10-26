---
description: Jest (jest-expo) + React Native Testing Library — test bắt buộc mỗi module và mỗi loại màn, coverage
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "src/test/**"
  - "jest.config.js"
  - "scripts/__tests__/**"
  - ".claude/hooks/__tests__/**"
---

# Testing

Nguồn: spec §8.2 (gốc từ `PRODUCTION-FRONTEND-RULES` §11 của web).

Chạy: `pnpm test` (Jest, nhanh, không coverage) · `pnpm run test:coverage` (Jest + coverage + ngưỡng) · `pnpm run test:scripts`
(script Node + hook: `node --test`). `pnpm run validate` (và CI) chạy `test:coverage` chứ không chạy `test`.

## Công cụ

- **Jest (`jest-expo`) + React Native Testing Library** — dùng Jest matchers có sẵn của RNTL ≥ 12.4 (`@testing-library/jest-native`
  đã ngừng bảo trì). **Không dùng Vitest** (chưa hỗ trợ ổn định transform React Native/Expo).
- Mock tầng `features/*/api.ts` bằng fixture (như `mockReceiptApi` của web); test HTTP client bằng `axios-mock-adapter`.
  App không có mock mode (D5) — fixture chỉ sống trong test.
- Render qua helper trong `src/test/` (`renderWithProviders`: `makeQueryClient()` của app với `retry: false`, theme, provider của sheet…).
- **Route test nằm ở `src/**/__tests__/`** và mount route bằng `renderRouter` (`expo-router/testing-library`). `app/**` không phải
  gốc test của Jest (`testMatch` chỉ có `src/**`): file route mỏng, không có test riêng — hành vi nằm ở màn trong `features/`/`components/`.
- **Sheet mở thì màn phía sau bị ẩn khỏi query** (container của sheet là `accessibilityViewIsModal`, RNTL áp quy tắc như VoiceOver). Test
  muốn khẳng định màn vẫn mount dưới sheet phải truyền `{ includeHiddenElements: true }`.
- **Đừng trộn `renderRouter` với render `AppProviders`/`ThemeProvider` trong cùng một file test** — sau `renderRouter`, `ThemeProvider`
  (expo-status-bar) không bao giờ settle (findBy/press/cleanup treo). Tách file (ví dụ `root-error-boundary.test.tsx`).
- Module mà code `lib/` `require` lười lúc gọi (ví dụ `@/components/shared/Toast` trong `query-factory`) phải nhẹ: `lucide-react-native`
  mất ~6 giây để nạp dưới Jest và làm test đầu tiên chạm nó quá 5 giây.

## Port test của web — chứng minh parity

Test của file domain copy từ web được port (`adapted`): `vi.*` → `jest.*`, **giữ nguyên từng case**. Đừng xoá hay làm yếu case để test qua.

## Bắt buộc cho MỖI module

1. **Lifecycle test** — mọi trạng thái trong bảng docs có mặt, terminal state `=== []`.
2. **Action-gating test** — ít nhất **3 bộ quyền** khác nhau (ví dụ: không quyền, quyền xem, quyền thao tác); terminal state không render nút
   mutating nào.
3. **Mỗi `BR-xx` một test**, có comment cite docs (`// BR-08 (docs …)`).

## Bắt buộc theo loại màn

| Loại màn  | Test bắt buộc                                                             |
| --------- | ------------------------------------------------------------------------- |
| Danh sách | skeleton · 2 loại rỗng (chưa có dữ liệu ≠ lọc không ra) · lỗi · cuộn thêm |
| Chi tiết  | nút đúng trạng thái + quyền · `ConfirmSheet`                              |
| Form      | validate · map lỗi server về trường/thẻ                                   |
| Trạm      | hàng đợi quét · gửi lại/bỏ qua · danh sách quét lỗi · chặn bấm 2 lần      |

## Coverage — là một phần của cổng merge

`pnpm run validate` và CI chạy `pnpm run test:coverage`; Jest **fail** khi thiếu ngưỡng. Cấu hình ở `jest.config.js`:
`collectCoverageFrom` chỉ gồm các tập có target (không để file ngoài tập làm loãng số), `coverageThreshold`:

| Tập                                                  | Ngưỡng                              | Cách tính                                   |
| ---------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| `./src/lib/domain/**`                                | statements **90** · branches **90** | **từng file** (key là glob)                 |
| `./src/components/` (ui, shared, mobile, con của nó) | statements **70** · branches **70** | **gộp cả thư mục** (key là thư mục, có `/`) |

- **Không** đặt target cho file route `app/**`.
- Chưa có `src/features` thì **chưa** có key cho nó. **PR feature đầu tiên** thêm vào `jest.config.js`: key
  `./src/features/*/{schemas,lifecycle,selectors}.ts` ở **90/90 (từng file)** và cùng glob đó vào `collectCoverageFrom`
  (`schemas`/`lifecycle`/`selectors` có thể là file hoặc thư mục `*.ts` — chọn glob khớp cấu trúc thật của feature).
- Số liệu trượt xuống dưới ngưỡng → **viết thêm test hành vi** cho nhánh chưa phủ; **không** hạ ngưỡng, không thêm file vào `coveragePathIgnorePatterns`
  để qua. Xem chi tiết theo file: `pnpm run test:coverage` (bảng text) hoặc `coverage/lcov-report/index.html` (thư mục `coverage/` bị git/eslint bỏ qua).
- Chạy coverage lần đầu (cache Jest lạnh) mất vài phút; lần sau ~1,5 phút.

## Quy tắc viết test

- Test hành vi người dùng thấy, không test implementation detail.
- Query theo role/label (`getByRole`, `getByLabelText`), tránh test-id trừ khi không còn cách nào; `userEvent` thay `fireEvent`.
- Mỗi test phải **fail được** — viết test đỏ trước, code xanh sau (TDD); chạy thấy đỏ rồi mới implement.
- Không `any`, không `@ts-expect-error` để test qua cho nhanh.
- Test script Node (`scripts/__tests__`, `.claude/hooks/__tests__`) dùng `node:test` + `node:assert/strict`; chọn file bằng glob đặt trong
  ngoặc kép (`pnpm run test:scripts` đã cấu hình — Node 22 không nhận đối số thư mục).
- E2E Maestro (P6, ngoài P0): đăng nhập → phiếu nhận; lấy hàng; đóng gói; xếp xe → bàn giao.
