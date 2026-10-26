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

| Thư mục              | Nội dung                                         | Quy tắc                                                                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/`     | Primitives kiểu shadcn, tự viết                  | **Khoá theo từng file: file đã có trên `main` thì KHÔNG sửa tay** (hook `guard-protected-files.mjs` chặn Edit/Write). Primitive **mới** thêm trên nhánh làm việc (file chưa có trên `main`) viết và sửa bình thường tới khi vào `main`; cần biến thể của primitive đã khoá → bọc ở `shared/` |
| `components/shared/` | Dùng chung, **không chứa nghiệp vụ**, nhận props | **Không import `features/*`, `lib/api/*` (trừ hai helper lỗi thuần), `lib/references/*` hay state/hook/hành động của `lib/auth/*`** (ESLint bắt; `import type` từ `lib/auth` thì được). Cần dữ liệu hay quyền → nhận qua props                                                               |
| `components/mobile/` | Shell & thiết bị: header, hub, bottom bar, scan  | Được biết về điện thoại (camera, haptics, phiên đăng nhập, điều hướng)                                                                                                                                                                                                                       |

Ngoại lệ duy nhất cho `lib/api` (R26): `components/shared` được import hai helper lỗi thuần `src/lib/api/error.ts` và `src/lib/api/load-error.ts` (`classifyLoadError`, `LoadErrorKind`, `ApiError.traceId` cho `LoadErrorState`); mọi module khác của `src/lib/api` vẫn bị chặn.

Component riêng của một module nằm ở `src/features/<feature>/components/` (≤ 150 dòng/file).

## Danh mục

| Tầng     | Thành phần                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui`     | `Button` (primary/secondary/ghost/danger; sm 40 · md 44 · lg 52) · `Input` · `Textarea` · `Checkbox` · `Switch` · `RadioGroup` · `Badge` · `Skeleton` · `Separator` · `Text` (cỡ chữ theo token) · `Sheet` (bọc `@gorhom/bottom-sheet`; `dismissible`, `scrollable`) · `FieldFrame` (nhãn + lỗi quanh ô nhập) · `CheckboxBox` · `useInSheet` · `IconButton` (nút chỉ có icon: vuông ≥ 44, `accessibilityLabel` tiếng Việt **bắt buộc**; `ghost` mặc định / `outline` cạnh ô nhập; `size` = chiều cao ô bên cạnh — nhỏ hơn 44 thì tự bù `hitSlop`; `checked` → `togglebutton`)                                                                                                                                                                                                                                                                  |
| `shared` | `StatusDot` · `ToneDot` · `EmptyState` (`no-data`) & `EmptyState` (`no-results`) — **hai** component · `LoadErrorState` · `ListScreen` · `Card` (khung thẻ: bo 8, viền, nền surface, bóng `--sh-sm`; `onPress` → cả thẻ là một nút) · `RecordCard` · `InfoRow` · `Section` · `FilterChips` · `FilterSheet` · `SelectSheet` (có ô tìm) · `ConfirmSheet` (`requireReason`, `danger`) · `DateField` · `SelectField` · `QuantityStepper` · `SearchField` · `RefetchBar` · `OfflineBanner` · `ProgressBar` · `Segmented` · `ComingSoon` · `DetailSkeleton` (chờ tải màn chi tiết/form: hình section) · `ListSkeleton` (chờ tải lần đầu của danh sách: 5 thẻ hình `RecordCard`; `ListScreen` tự dùng, không export qua `index.ts`) · `CenteredSpinner` (chờ giữa hai trạng thái app — xác minh phiên, chọn hub đầu; **không** thay skeleton của màn) |
| `mobile` | `ScreenHeader` · `HubMenu` · `BottomActionBar` · `ScanField` · `CameraScanner` · `ScanFeedbackBanner` · `SessionExpiryBanner` · `ReloginSheet`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Toast: `sonner-native` — helper `toast` ở `shared/Toast.tsx` (**phải nhẹ**: `query-factory` `require` lười nó; đọc to title + mô tả trên iOS), UI `ToastProvider` ở `shared/ToastProvider.tsx`
(`AppProviders` mount; nền / viền / chữ / icon lấy từ token, không có màu của sonner). Icon: `lucide-react-native`. Danh sách: `FlashList`. Overlay: bottom sheet hoặc modal route (`mobile-backoffice.md`).

**Hook dùng chung (`src/hooks`) — tra trước khi viết hook mới:** `useSubmitLatch` (chặn bấm 2 lần) · `useAnnounce` (đọc to cho iOS) · `useListParams` ·
`usePrefs` · `useDebouncedValue` · `useCountdown` · `usePullRefresh` · `useTransientFeedback` · `useScanFeedback` · `useDefaultWarehouseId` · `useThemeColors`.

## Ô nhập & overlay (bottom sheet)

Mọi popover/select/dialog của web là `Sheet` trên mobile (N5). Dùng các thành phần này, đừng tự dựng sheet.

| Thành phần                                                                                    | Dùng khi                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchField { value, onChangeText, placeholder, onSubmit?, trailing? }`                      | Ô tìm đầu danh sách (cao 44, nút xoá, `trailing` cho nút camera quét mã).                                                                                                                                                         |
| `FilterChips { chips, onOpenFilters, activeCount }`                                           | Hàng chip dưới ô tìm: chip "Bộ lọc" + một chip cho mỗi bộ lọc đang bật (chạm để bỏ).                                                                                                                                              |
| `FilterSheet { open, onOpenChange, title, children, onApply, onReset, canReset }`             | Toàn bộ bộ lọc của một danh sách. "Áp dụng" gọi `onApply` rồi tự đóng. Đặt `Input`, `DateField`… thẳng vào `children`.                                                                                                            |
| `SelectSheet<T> { …, options, value, multiple?, searchable?, onSelect }`                      | Thay `<select>`. Chọn một: chọn xong tự đóng. `multiple`: mỗi lần chạm báo danh sách mới, đóng bằng "Xong". `searchable` lọc theo `label`/`description` không dấu. `T` là `string \| number`; danh sách đủ ngắn để cuộn một lượt. |
| `ConfirmSheet { …props như ConfirmDialog của web }`                                           | Xác nhận hành động. `requireReason`, `variant` (mặc định `danger`), `closeOnConfirm` (mặc định `true`), `loading` khoá sheet (không vuốt đóng được), `error` hiện trong sheet.                                                    |
| `SelectField { label, valueText?, placeholder, onPress, error?, hint?, disabled?, loading? }` | Ô chọn trong form (thay `<select>`): cao 48, chevron, mở `SelectSheet` mà màn giữ. Screen reader nghe nhãn → lựa chọn (`accessibilityValue`) → gợi ý / lỗi. `loading` = thanh chờ, chưa mở được.                                  |
| `DateField { label, value, onChange, minimumDate?, maximumDate?, clearable? }`                | Ngày `YYYY-MM-DD`. Android mở hộp thoại, iOS mở lịch ngay dưới ô. Giá trị không phải ngày thật coi như rỗng.                                                                                                                      |
| `QuantityStepper { value, onChange, min?, max?, step?, label, allowNegative? }`               | Số lượng nguyên với nút −/＋ 44×44 (N6); luôn nằm trong `[min, max]` (`min` mặc định 0).                                                                                                                                          |

**Ô nhập trong `Sheet` tự đúng (R30).** `Sheet` cung cấp `SheetContext`; `Input`, `Textarea`, `SearchField` và `QuantityStepper` đọc `useInSheet()` và tự dùng `BottomSheetTextInput`
(sheet nâng lên trên bàn phím) khi nằm trong sheet, `TextInput` thường khi ở ngoài. **Không** có cờ `inSheet`, không có biến thể "Input cho sheet" — chỉ dùng `Input` thường. Component
mới có ô gõ chữ dùng `<TextField>` (từ `@/components/ui`) thay vì import `TextInput` của `react-native`.

**`Sheet`:** `dismissible={false}` khoá vuốt xuống, chạm nền mờ và nút Back của Android (dùng khi một yêu cầu đang chạy; đóng bằng `open` vẫn được). `scrollable` cho nội dung có thể dài hơn
màn hình (danh sách, form, ô lý do + bàn phím): tiêu đề và nội dung cuộn chung, sheet cao tối đa 85% cửa sổ. Không lồng `ScrollView` của riêng mình vào `Sheet`.
Sheet tự lo a11y và chuyển động: nền là token `bg-surface` ẩn khỏi screen reader; mở ra thì iOS đọc tiêu đề, Android chuyển tiêu điểm TalkBack vào tiêu đề
(`SheetTitle`, sau `MOTION_MS.standard`); cả sheet nằm trong một view `accessibilityViewIsModal` (iOS: VoiceOver không chạm tới màn phía sau — RNTL cũng ẩn
màn đó khỏi query, test kiểm màn còn mount thì dùng `includeHiddenElements: true`). Android không có cờ đó: mỗi `Sheet` đang mở báo vào `sheet-a11y`, và
`ScreenBehindSheets` (`AppProviders` bọc các màn) đặt `importantForAccessibility="no-hide-descendants"` + `accessibilityElementsHidden` cho màn phía sau tới khi
sheet cuối cùng đóng (nghiệm thu L3). Di chuyển `MOTION_MS.standard` (180 ms).

`Button`: nhãn **một dòng** (`numberOfLines={1}`) — trên Android chữ co theo bề ngang có `lineHeight` có thể đẩy chữ cuối xuống dòng hai bị cắt ("Đăng xuất" chỉ hiện
"Đăng", nghiệm thu L1). Nhãn dài hơn nút thì bị cắt bằng "…", không xuống dòng: giữ nhãn nút ngắn. `Switch`: núm dùng token `thumb` (nghiệm thu L2).

`LoadErrorState`: `secondaryAction { label, onPress }` thêm một nút `ghost` dưới "Thử lại". `RouteErrorBoundary` dùng nó cho "Về trang đầu" khi màn ném lỗi lúc
render (không phải lỗi tải: `ApiError`/`ZodError` vẫn chỉ có "Thử lại") — `router.replace` hub đầu tiên thấy được rồi `retry()`, vì điều hướng trong cùng stack
đang lỗi không tự xoá lỗi (nghiệm thu L10).

**Nội dung sheet render trong portal** (cuối `BottomSheetModalProvider` ở `AppProviders`), không nằm tại chỗ đặt `<Sheet>`: **đừng dựa vào context của route / form / tab bên trong `Sheet`** —
`useLocalSearchParams`, `useNavigation`, `useFormContext` (react-hook-form `FormProvider`), `BottomTabBarHeightContext`… đều không có ở đó. Cần giá trị nào thì đọc ở màn rồi truyền vào
sheet qua props (giá trị, callback `onSelect`/`onApply`, `control` của form). Context đặt **trên** provider (theme, QueryClient, safe area) vẫn tới được. Test thấy đúng như máy thật: mock
`@gorhom/bottom-sheet` cũng render qua portal và ném lỗi khi thiếu provider — render bằng `renderWithProviders` (đã có provider) hoặc truyền `wrapper: BottomSheetModalProvider`.

## Quy ước chung

- `<StatusDot domain status>` là cách **duy nhất** hiển thị trạng thái (như `StatusBadge` ở web): tone từ `status-map`, nhãn Việt, nhấn giữ hiện nhãn gốc
  `"Nhãn Việt — English"` (N7); screen reader nghe nhãn Việt rồi bản gốc tiếng Anh ở `accessibilityHint`. Không tự tô màu, không viết badge riêng. Thêm trạng thái → skill `status-badge`.
- Hai loại rỗng là hai component (`no-data` ≠ `no-results`).
- Component nhận `tone` / `size` / `variant` qua props; không hardcode nghiệp vụ.
- Màu chỉ qua token (`design-tokens.md`) — dark mode tự đúng; không hex, không `useColorScheme` để chọn màu.
- Nút chỉ có icon → `IconButton` (không tự dựng `Pressable` + icon); khối dạng thẻ → `Card`. Mọi control có `accessibilityRole` đúng; vùng chạm
  ≥ 44pt; chữ trong thẻ có `maxFontSizeMultiplier` ≈ 1.3 (`Text`, `TextField` tự đặt).
- Lỗi / cảnh báo chỉ hiện trên màn (alert, banner) phải được đọc ở iOS (không có live region): `useAnnounce(message)` (`@/hooks/use-announce`) — đã có
  trong `FieldFrame`, `LoginErrorAlert`, `ConfirmSheet`, `RefetchFailedNotice`, `OfflineBanner`. Mặc định chỉ iOS (Android đọc live region của phần tử).
- Nút gửi request: chặn bấm 2 lần bằng `useSubmitLatch({ loading, releaseOn })` (`@/hooks/use-submit-latch`) — khoá từ lúc chạm tới khi `loading` đã
  true rồi false (hoặc một giá trị `releaseOn` đổi). `ConfirmSheet` đã dùng cho mọi confirm; `BottomActionBar.primary` bật bằng `latch: true` (chỉ cho
  hành động có request báo qua `loading`; hành động chỉ điều hướng / mở sheet thì không). Hợp đồng: `loading` phải hiện `true` ít nhất một render trước khi về `false`
  (`isPending` của TanStack thì có); một yêu cầu không bao giờ báo `loading` sẽ khoá tới khi `releaseOn` đổi.
- Motion 120–180ms (`MOTION_MS` ở `src/lib/tokens.ts`) bằng reanimated, tôn trọng Reduce Motion.
- Chuỗi hiển thị lấy từ `src/constants/**` (copy web) hoặc `src/constants/mobile/**` — không gõ tay trong component.
- Cần biến thể của primitive → bọc ở `shared/` hoặc truyền qua `className`/token; **không patch** `components/ui/*` đã merge vào `main`.
