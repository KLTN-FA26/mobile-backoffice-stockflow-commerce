---
description: Jest (jest-expo) + React Native Testing Library — test bắt buộc mỗi module và mỗi loại màn, coverage
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "app/**/*.test.ts"
  - "app/**/*.test.tsx"
  - "src/test/**"
  - "jest.config.js"
  - "scripts/__tests__/**"
  - ".claude/hooks/__tests__/**"
---

# Testing

Nguồn: spec §8.2 (gốc từ `PRODUCTION-FRONTEND-RULES` §11 của web).

Chạy: `pnpm test` (Jest) · `pnpm run test:scripts` (script Node + hook: `node --test`) · gộp trong `pnpm run validate`.

## Công cụ

- **Jest (`jest-expo`) + React Native Testing Library** — dùng Jest matchers có sẵn của RNTL ≥ 12.4 (`@testing-library/jest-native`
  đã ngừng bảo trì). **Không dùng Vitest** (chưa hỗ trợ ổn định transform React Native/Expo).
- Mock tầng `features/*/api.ts` bằng fixture (như `mockReceiptApi` của web); test HTTP client bằng `axios-mock-adapter`.
  App không có mock mode (D5) — fixture chỉ sống trong test.
- Render qua helper trong `src/test/` (provider QueryClient, theme…); route test dùng `expo-router/testing-library`.

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

## Coverage

- `src/lib/domain/**` và `src/features/*/{schemas,lifecycle,selectors}`: **≥ 90%**.
- Component: **≥ 70%**.
- **Không** đặt target cho file route `app/**`.

## Quy tắc viết test

- Test hành vi người dùng thấy, không test implementation detail.
- Query theo role/label (`getByRole`, `getByLabelText`), tránh test-id trừ khi không còn cách nào; `userEvent` thay `fireEvent`.
- Mỗi test phải **fail được** — viết test đỏ trước, code xanh sau (TDD); chạy thấy đỏ rồi mới implement.
- Không `any`, không `@ts-expect-error` để test qua cho nhanh.
- Test script Node (`scripts/__tests__`, `.claude/hooks/__tests__`) dùng `node:test` + `node:assert/strict`; chọn file bằng glob đặt trong
  ngoặc kép (`pnpm run test:scripts` đã cấu hình — Node 22 không nhận đối số thư mục).
- E2E Maestro (P6, ngoài P0): đăng nhập → phiếu nhận; lấy hàng; đóng gói; xếp xe → bàn giao.
