---
description: Danh mục component theo ba tầng ui / shared / mobile — tra trước khi viết mới, quy ước chung
paths:
  - "src/components/**"
  - "src/features/**/components/**"
  - "app/**"
---

# Component dùng chung

Nguồn: spec §4.4. **Trước khi viết component mới, tra bảng này.** Viết lại thứ đã có là nguyên nhân số một khiến giao diện lệch giữa các module.

## Ba tầng — đừng nhầm

| Thư mục              | Nội dung                                         | Quy tắc                                                                                                                                                           |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/`     | Primitives kiểu shadcn, tự viết                  | **KHÔNG sửa tay khi đã vào `main`** — hook `guard-protected-files.mjs` chặn Edit/Write file đã có trên `main`; primitive mới trên nhánh làm việc viết bình thường |
| `components/shared/` | Dùng chung, **không chứa nghiệp vụ**, nhận props | **Không import `features/*` hay `lib/api/*`** (ESLint bắt)                                                                                                        |
| `components/mobile/` | Shell & thiết bị: header, hub, bottom bar, scan  | Được biết về điện thoại (camera, haptics, phiên đăng nhập, điều hướng)                                                                                            |

Component riêng của một module nằm ở `src/features/<feature>/components/` (≤ 150 dòng/file).

## Danh mục

| Tầng     | Thành phần                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui`     | `Button` (primary/secondary/ghost/danger; sm 40 · md 44 · lg 52) · `Input` · `Textarea` · `Checkbox` · `Switch` · `RadioGroup` · `Badge` · `Skeleton` · `Separator` · `Text` (cỡ chữ theo token) · `Sheet` (bọc `@gorhom/bottom-sheet`)                                                                                                                                                                               |
| `shared` | `StatusDot` · `ToneDot` · `EmptyState` (`no-data`) & `EmptyState` (`no-results`) — **hai** component · `LoadErrorState` · `ListScreen` · `RecordCard` · `InfoRow` · `Section` · `FilterChips` · `FilterSheet` · `SelectSheet` (có ô tìm) · `ConfirmSheet` (`requireReason`, `danger`) · `DateField` · `QuantityStepper` · `SearchField` · `RefetchBar` · `OfflineBanner` · `ProgressBar` · `Segmented` · `ComingSoon` |
| `mobile` | `ScreenHeader` · `HubMenu` · `BottomActionBar` · `ScanField` · `CameraScanner` · `ScanFeedback` · `SessionExpiryBanner` · `ReloginSheet`                                                                                                                                                                                                                                                                              |

Toast: `sonner-native`. Icon: `lucide-react-native`. Danh sách: `FlashList`. Overlay: bottom sheet hoặc modal route (`mobile-backoffice.md`).

## Quy ước chung

- `<StatusDot domain status>` là cách **duy nhất** hiển thị trạng thái (như `StatusBadge` ở web): tone từ `status-map`, nhãn Việt, nhấn giữ hiện nhãn gốc
  `"Nhãn Việt — English"` (N7). Không tự tô màu, không viết badge riêng. Thêm trạng thái → skill `status-badge`.
- Hai loại rỗng là hai component (`no-data` ≠ `no-results`).
- Component nhận `tone` / `size` / `variant` qua props; không hardcode nghiệp vụ.
- Màu chỉ qua token (`design-tokens.md`) — dark mode tự đúng; không hex, không `useColorScheme` để chọn màu.
- Icon-button có `accessibilityLabel`; mọi control có `accessibilityRole` đúng; vùng chạm ≥ 44pt; chữ trong thẻ có `maxFontSizeMultiplier` ≈ 1.3.
- Motion 120–180ms bằng reanimated, tôn trọng Reduce Motion.
- Chuỗi hiển thị lấy từ `src/constants/**` (copy web) hoặc `src/constants/mobile/**` — không gõ tay trong component.
- Cần biến thể của primitive → bọc ở `shared/` hoặc truyền qua `className`/token; **không patch** `components/ui/*` đã merge vào `main`.
