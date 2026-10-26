---
description: Audit vi phạm design system mobile — hex/gradient/hồng, StatusDot, vùng chạm, BottomActionBar, primitives, chuỗi hardcode
argument-hint: [đường dẫn hoặc feature, bỏ trống = quét toàn bộ app/ và src/]
allowed-tools: Grep, Glob, Read, Bash(node scripts/check-style-bans.mjs), Bash(git diff:*), Bash(git status:*)
---

Audit `${1:-app/ và src/}` xem có vi phạm design system mobile không. **Read-only — chỉ báo cáo, không tự sửa.**

Đối chiếu `.claude/rules/design-tokens.md`, `mobile-backoffice.md`, `list-screen.md`, `shared-components.md`, `scanning.md`.

## Cần tìm

**0. Chạy trước:** `node scripts/check-style-bans.mjs` (cùng bộ kiểm với `pnpm run lint`) — mọi dòng nó báo là vi phạm chắc chắn.

**1. Hex trần** — hex chỉ được ở `src/lib/tokens.ts` (và các file `verbatim` copy từ web trong `src/constants/`; `src/constants/mobile/**` cũng bị kiểm): grep `#[0-9a-fA-F]{3,8}` và `rgb\(|rgba\(|hsl\(` trong `app/`, `src/` (trừ file token).

**2. Gradient** — `gradient`, `bg-linear-`, `bg-radial-`, `LinearGradient`, `expo-linear-gradient`.

**3. Màu hồng/magenta/fuchsia** — `pink`, `magenta`, `fuchsia`. Và caramel (Mode B) lọt vào: `caramel`, `A9682F`, `C98D4E`.

**4. Không dùng `StatusDot`** — JSX render trạng thái mà tự tô màu / tự viết badge / hiện chuỗi status thô thay vì `<StatusDot domain status>`.
Tìm className hoặc style tô màu (`bg-green`, `bg-red`, `text-green`, `color: …`) cạnh biến tên `status`; `Badge` dùng để hiện trạng thái. Nhãn trạng thái phải là nhãn Việt từ `status-map`,
chuỗi gốc tiếng Anh nguyên văn.

**5. Vùng chạm** — `Pressable`/icon-button không có chiều cao ≥ 44 và không có `hitSlop` bù; control cao dưới 44 (Button `sm` 40 chỉ ổn khi có `hitSlop`);
icon-button thiếu `accessibilityLabel`; control thiếu `accessibilityRole`.

**6. `BottomActionBar`** — màn Chi tiết / Form / Trạm có hành động chính nằm ngoài `BottomActionBar`; hơn 1 nút chính; hành động phụ không gom vào sheet "Thao tác khác";
nút bị khoá mà **không** hiện lý do inline ngay dưới nút; nút gate quyền thiếu comment `// Backend phải re-check`.

**7. Primitives** — trong `src/features/**` và `app/**`: import `Text`, `Pressable`, `TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback`, `Button`, `TextInput` từ `react-native` hoặc `Pressable`/`TouchableOpacity`/`TextInput` từ `react-native-gesture-handler` (phải dùng `@/components/ui`);
`FlatList`/`ScrollView + map` cho danh sách (phải `FlashList`); tự dựng `TextInput` nhập mã thay vì `ScanField`; viết lại component đã có trong `shared-components.md` (tự dựng `Pressable` + icon thay vì `IconButton`, khung thẻ thay vì `Card`, ô chọn thay vì `SelectField`);
edit vào file `src/components/ui/**` đã có trên `main` (primitive mới thêm trên nhánh thì được).

**8. Chuỗi hardcode** — chữ hiển thị gõ thẳng trong `.tsx` (JSX text, `title=`, `label=`, `placeholder=`, `accessibilityLabel=`, `toast(...)`) thay vì lấy từ
`src/constants/**` hoặc `src/constants/mobile/**`; route/status/query key viết tay.

**9. Hình khối & chuyển động** — `borderRadius` ngoài {4 (badge), 8 (card/nút/ô nhập), full}; thiếu cặp `shadow*` (iOS) + `elevation: 1` (Android) ở khối card, hoặc bóng nặng hơn `--sh-sm`;
animation `duration` ngoài 120–180ms (dùng `MOTION_MS`); không tôn trọng Reduce Motion; cỡ chữ ngoài thang (body 15 · meta 13 · nhỏ nhất 12 · header 17 · số lớn 22–24);
chữ trong thẻ thiếu `maxFontSizeMultiplier` ≈ 1.3.

**10. Số liệu thiếu tabular** — cột/dòng tiền, số lượng, ngày canh phải mà không có `fontVariant: ["tabular-nums"]`; mã định danh (SKU, số phiếu, mã kiện) không dùng font mono.

**11. Dark mode** — rẽ nhánh màu theo `useColorScheme` trong component thay vì dùng token; màu sáng hardcode.

**12. Trạng thái UI thiếu** — màn Danh sách thiếu skeleton / `EmptyState` hai loại / `LoadErrorState` / `RefetchBar` / pull-to-refresh; gộp hai loại rỗng làm một.

**13. Nâng cấp style không có lý do** — thay đổi giao diện không nằm trong bảng N1–N10 của `design-tokens.md`.

## Báo cáo

Liệt kê mỗi vi phạm dạng `file.tsx:42 — mô tả — token/component đúng phải dùng`.
Xếp theo mức nặng: hex/gradient/hồng/mock-data (chắc chắn, `lint` đã chặn) > thiếu `StatusDot` > primitives/ranh giới > `BottomActionBar` > vùng chạm > chuỗi hardcode > hình khối/chữ > còn lại.
Phân biệt **vi phạm chắc chắn** (có luật viết rõ trong rules) với **góp ý**. Nếu sạch thì nói rõ đã quét những gì và không thấy vi phạm.
