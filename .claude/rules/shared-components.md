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

Ngoại lệ duy nhất (R26): `components/shared` được import hai helper lỗi thuần `src/lib/api/error.ts` và `src/lib/api/load-error.ts` (`classifyLoadError`, `LoadErrorKind`, `ApiError.traceId` cho `LoadErrorState`); mọi module khác của `src/lib/api` vẫn bị chặn.

Component riêng của một module nằm ở `src/features/<feature>/components/` (≤ 150 dòng/file).

## Danh mục

| Tầng     | Thành phần                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui`     | `Button` (primary/secondary/ghost/danger; sm 40 · md 44 · lg 52) · `Input` · `Textarea` · `Checkbox` · `Switch` · `RadioGroup` · `Badge` · `Skeleton` · `Separator` · `Text` (cỡ chữ theo token) · `Sheet` (bọc `@gorhom/bottom-sheet`; `dismissible`, `scrollable`) · `FieldFrame` (nhãn + lỗi quanh ô nhập) · `CheckboxBox` · `useInSheet`                                                                                                                                                                                                                                                         |
| `shared` | `StatusDot` · `ToneDot` · `EmptyState` (`no-data`) & `EmptyState` (`no-results`) — **hai** component · `LoadErrorState` · `ListScreen` · `RecordCard` · `InfoRow` · `Section` · `FilterChips` · `FilterSheet` · `SelectSheet` (có ô tìm) · `ConfirmSheet` (`requireReason`, `danger`) · `DateField` · `QuantityStepper` · `SearchField` · `RefetchBar` · `OfflineBanner` · `ProgressBar` · `Segmented` · `ComingSoon` · `DetailSkeleton` (chờ tải màn chi tiết/form: hình section) · `CenteredSpinner` (chờ giữa hai trạng thái app — xác minh phiên, chọn hub đầu; **không** thay skeleton của màn) |
| `mobile` | `ScreenHeader` · `HubMenu` · `BottomActionBar` · `ScanField` · `CameraScanner` · `ScanFeedbackBanner` · `SessionExpiryBanner` · `ReloginSheet`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Toast: `sonner-native`. Icon: `lucide-react-native`. Danh sách: `FlashList`. Overlay: bottom sheet hoặc modal route (`mobile-backoffice.md`).

## Ô nhập & overlay (bottom sheet)

Mọi popover/select/dialog của web là `Sheet` trên mobile (N5). Dùng các thành phần này, đừng tự dựng sheet.

| Thành phần                                                                        | Dùng khi                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchField { value, onChangeText, placeholder, onSubmit?, trailing? }`          | Ô tìm đầu danh sách (cao 44, nút xoá, `trailing` cho nút camera quét mã).                                                                                                                                                         |
| `FilterChips { chips, onOpenFilters, activeCount }`                               | Hàng chip dưới ô tìm: chip "Bộ lọc" + một chip cho mỗi bộ lọc đang bật (chạm để bỏ).                                                                                                                                              |
| `FilterSheet { open, onOpenChange, title, children, onApply, onReset, canReset }` | Toàn bộ bộ lọc của một danh sách. "Áp dụng" gọi `onApply` rồi tự đóng. Đặt `Input`, `DateField`… thẳng vào `children`.                                                                                                            |
| `SelectSheet<T> { …, options, value, multiple?, searchable?, onSelect }`          | Thay `<select>`. Chọn một: chọn xong tự đóng. `multiple`: mỗi lần chạm báo danh sách mới, đóng bằng "Xong". `searchable` lọc theo `label`/`description` không dấu. `T` là `string \| number`; danh sách đủ ngắn để cuộn một lượt. |
| `ConfirmSheet { …props như ConfirmDialog của web }`                               | Xác nhận hành động. `requireReason`, `variant` (mặc định `danger`), `closeOnConfirm` (mặc định `true`), `loading` khoá sheet (không vuốt đóng được), `error` hiện trong sheet.                                                    |
| `DateField { label, value, onChange, minimumDate?, maximumDate?, clearable? }`    | Ngày `YYYY-MM-DD`. Android mở hộp thoại, iOS mở lịch ngay dưới ô. Giá trị không phải ngày thật coi như rỗng.                                                                                                                      |
| `QuantityStepper { value, onChange, min?, max?, step?, label, allowNegative? }`   | Số lượng nguyên với nút −/＋ 44×44 (N6); luôn nằm trong `[min, max]` (`min` mặc định 0).                                                                                                                                          |

**Ô nhập trong `Sheet` tự đúng (R30).** `Sheet` cung cấp `SheetContext`; `Input`, `Textarea`, `SearchField` và `QuantityStepper` đọc `useInSheet()` và tự dùng `BottomSheetTextInput`
(sheet nâng lên trên bàn phím) khi nằm trong sheet, `TextInput` thường khi ở ngoài. **Không** có cờ `inSheet`, không có biến thể "Input cho sheet" — chỉ dùng `Input` thường. Component
mới có ô gõ chữ dùng `<TextField>` (từ `@/components/ui`) thay vì import `TextInput` của `react-native`.

**`Sheet`:** `dismissible={false}` khoá vuốt xuống, chạm nền mờ và nút Back của Android (dùng khi một yêu cầu đang chạy; đóng bằng `open` vẫn được). `scrollable` cho nội dung có thể dài hơn
màn hình (danh sách, form, ô lý do + bàn phím): tiêu đề và nội dung cuộn chung, sheet cao tối đa 85% cửa sổ. Không lồng `ScrollView` của riêng mình vào `Sheet`.

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
