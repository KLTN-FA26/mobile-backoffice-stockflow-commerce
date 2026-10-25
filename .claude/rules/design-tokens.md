---
description: Token màu/radius/spacing/font/motion của mobile (nguồn duy nhất src/lib/tokens.ts), lệnh cấm, dark mode, nâng cấp N1–N10 so với web
paths:
  - "app/**/*.tsx"
  - "src/**/*.tsx"
  - "src/lib/tokens.ts"
  - "tailwind.config.js"
  - "global.css"
---

# Design tokens

Nguồn: spec §4.1, §4.3 (Mode A — Ink + Blue, style Vercel của web, tinh chỉnh cho mobile). Mobile **chỉ có một theme** — không có
Mode B / storefront.

## Một nguồn duy nhất

Token khai báo **một lần** trong `src/lib/tokens.ts` (hex, light + dark). `ThemeProvider` áp token thành biến CSS bằng `vars()` của
NativeWind; `tailwind.config.js` map mỗi token → `rgb(var(--token) / <alpha-value>)`; `global.css` chỉ chứa các directive `@tailwind`.
Component dùng class/biến token, đổi scheme **không** bằng cách rẽ nhánh màu trong component. Icon/StatusBar cần hex → `useThemeColors()`.

## Cấm tuyệt đối

`pnpm run lint` chạy `scripts/check-style-bans.mjs` trên `app/` + `src/` và fail khi gặp:

- **Hex trần** ngoài `src/lib/tokens.ts` (`src/constants/**` copy từ web được miễn).
- **Gradient** (`gradient`, `bg-linear-*`, `expo-linear-gradient`…) — nền dùng màu phẳng từ token.
- **Hồng / magenta / fuchsia** ở bất kỳ đâu.
- **Import `@/lib/mock-data`.**

Các điều dưới đây **lint không bắt** — `/design-check` và `design-reviewer` kiểm bằng grep/đọc code:

- Không trộn caramel (Mode B) vào app; blue chỉ là `accent` (info, progress, link phụ), CTA là `brand` (ink).
- Không rẽ nhánh màu theo scheme trong component (mục "Một nguồn duy nhất"); không tự tô màu trạng thái (dùng `StatusDot`).

## Màu (light / dark)

| Nhóm           | Token                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nền            | `bg.base` `#F6F6F6`/`#0E0F11` · `bg.surface` `#FFFFFF`/`#17181B` · `bg.subtle` `#F7F8FA`/`#1F2124` · `bg.muted` `#EEF0F3`/`#2A2C30`                                 |
| Viền           | `border.default` `#DADDE1`/`#2E3034` · `border.strong` `#C5CAD1`/`#3D4045`                                                                                          |
| Chữ            | `ink.primary` `#1A1B18`/`#F4F4F1` · `ink.secondary` `#5C5E58`/`#A8AAA3` · `ink.tertiary` `#8A8C85`/`#76786F` · `ink.inverse` `#FFFFFF`/`#1A1B18`                    |
| Brand / accent | `brand` (CTA) `#1A1B18`/`#F4F4F1` · `accent.blue` `#1E88E5`/`#4EA6F0`                                                                                               |
| Semantic       | positive `#1F9D55` · info `#2B7FC4` · warning `#D98207` · danger `#D23B3B` · neutral `#6B6E68` · muted `#9A9C95` · special `#7C5CBF` — **không đổi giữa hai theme** |
| Chấm / icon    | `dot-positive` `#12A594` · `dot-info` `#0090FF` · `dot-warning` `#F76B15` · `dot-danger` `#E5484D` · `dot-special` `#8E4EC6` — **chỉ** cho chấm và icon công cụ     |

- Màu `dot-*` tươi hơn semantic gốc → **không** dùng làm chữ (không đủ 4.5:1). `neutral`/`muted` dùng nguyên màu gốc.
- Trạng thái chỉ hiển thị qua `<StatusDot domain status>` — không tự tô màu. Khi một trạng thái hợp nhiều tone, ưu tiên
  `special > danger > positive > warning > info > muted > neutral` (đã nằm trong `status-map`; xem skill `status-badge`).
- Tương phản: chữ ≥ 4.5:1, UI ≥ 3:1 (§8.5).

## Hình khối, chữ, chuyển động

| Hạng mục  | Giá trị                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Radius    | `sm` 4 (badge) · `md` 8 (card, nút, **ô nhập trên mobile** — N4) · `full`                                                                    |
| Bóng      | `--sh-sm` → RN `shadow*` (iOS) + `elevation: 1` (Android), chỉ cho khối dạng card                                                            |
| Spacing   | thang 4px: 2/4/8/12/16/24/32/48; lề màn 16                                                                                                   |
| Control   | cao 44–52px (Button `sm` 40 · `md` 44 · `lg` 52; control thấp hơn 44 phải bù `hitSlop`); vùng chạm ≥ 44pt                                    |
| Font      | Inter (UI) · Inter Tight (số lớn) · JetBrains Mono (mã, số cần canh cột) qua `@expo-google-fonts/*`; số dùng `fontVariant: ["tabular-nums"]` |
| Cỡ chữ    | body 15 · meta 13 · nhỏ nhất 12 · tiêu đề header 17 · số lớn 22–24; `maxFontSizeMultiplier` ≈ 1.3 cho chữ trong thẻ                          |
| Motion    | 120–180ms, `react-native-reanimated`, tôn trọng Reduce Motion; tránh hiệu ứng trang trí                                                      |
| Dark mode | theo hệ thống mặc định; chọn Sáng / Tối / Hệ thống ở tab Tài khoản (NativeWind `colorScheme`); **cả hai theme đều phải đúng**                |
| A11y      | `accessibilityLabel` cho mọi icon-button, `accessibilityRole` đúng; mã/SKU/số lượng/tiền dùng mono hoặc tabular-nums, canh phải trong thẻ    |

Không all-caps cho nhãn thường. Icon: `lucide-react-native` (14–16 ở mục hub).

## Nâng cấp so với web — mọi nâng cấp mới phải có lý do (§1.1)

| #   | Nâng cấp                                            | Lý do                                                                                 |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| N1  | Header hiển thị tiêu đề / mã bản ghi                | Web giấu title vì breadcrumb là tiêu đề; mobile không có breadcrumb                   |
| N2  | Bảng → thẻ + cuộn vô hạn; bỏ chọn cột & page size   | 6–11 cột không đọc được ở 360px; vẫn giữ caption "Hiển thị x / tổng"                  |
| N3  | Hành động dính đáy (`BottomActionBar`)              | Đáy màn là vùng ngón cái, luôn thấy                                                   |
| N4  | Control 44–52px, ô nhập bo 8px                      | Chuẩn chạm ≥ 44pt (iOS) / 48dp (Material); bo 4px lệch với control cao                |
| N5  | Bottom sheet thay Popover/Select/Dialog             | Thao tác một tay; dialog 520px không vừa màn                                          |
| N6  | `QuantityStepper` −/＋ cạnh ô số                    | Đeo găng khó gõ bàn phím số                                                           |
| N7  | Thông tin chỉ có khi hover → hiện inline / nhấn giữ | Mobile không có hover: lý do khoá nút, UUID đầy đủ, nhãn gốc tiếng Anh của trạng thái |
| N8  | Banner sắp hết phiên + đăng nhập lại tại chỗ        | Token 8h không refresh được, nhân viên làm theo ca                                    |
| N9  | Kho mặc định                                        | Chọn lại kho trên từng màn tốn thao tác; chỉ là giá trị điền sẵn                      |
| N10 | Haptics + pull-to-refresh                           | Phản hồi khi không nhìn màn; thói quen làm mới trên mobile                            |

Thay đổi style vượt các mục trên mà không có lý do ghi được = lỗi `design-reviewer`.
