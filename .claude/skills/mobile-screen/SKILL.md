---
name: mobile-screen
description: Use when building or reviewing a StockFlow Mobile screen — pick one of the five screen types (Hub, Danh sách, Chi tiết, Form, Trạm) and follow its checklist for structure, shared components, states, BottomActionBar, scanning and required tests.
---

# Dựng một màn hình mobile

Nguồn: spec §4.2 (năm loại màn), §4.4 (bộ component), §5 (bản đồ màn), §8.2 (test). Rule chi tiết: `.claude/rules/mobile-backoffice.md`,
`list-screen.md`, `shared-components.md`, `scanning.md`.

## 1. Chọn đúng một loại

| Loại          | Dùng cho                             | Ví dụ trong spec §5                                     |
| ------------- | ------------------------------------ | ------------------------------------------------------- |
| **Hub**       | Danh sách mục con của một tab        | `inbound/index`, `warehouse/index`, `fulfillment/index` |
| **Danh sách** | Bảng web → thẻ + cuộn vô hạn         | `receipts`, `transfers`, `orders`, `picking`            |
| **Chi tiết**  | Xem một bản ghi + thao tác           | `receipts/[id]`, `transfers/[id]`, `orders/[id]`        |
| **Form**      | Tạo/sửa, wizard, dialog nhiều trường | `receipts/create`, `…/count`, `transfers/[id]/dispatch` |
| **Trạm**      | Làm việc liên tục với quét mã        | `picking/[id]`, `packing/[id]`, `loads/[id]`            |

Màn "Tra cứu" (tồn kho), "Xem tài liệu" (biên bản) và `ComingSoon` trong §5 ghép khối từ các loại trên — mô tả riêng của từng màn nằm ở §5, không bịa
thêm loại.

## 2. Checklist chung — mọi màn

- [ ] File route trong `app/` ≤ 60 dòng, chỉ import `@/features/*` + `@/components/*`; logic và JSX nằm trong `src/features/<feature>/components/` (≤ 150 dòng/file).
- [ ] Dùng component đã có (`shared-components.md`) — không viết lại; không `Text`/`Pressable`/`Button`/`TextInput` của `react-native` trong `features/**`, `app/**`.
- [ ] Màu / radius / cỡ chữ chỉ qua token; không hex, gradient, hồng; dark mode đúng (`design-tokens.md`).
- [ ] Chuỗi hiển thị lấy từ `src/constants/**` hoặc `src/constants/mobile/**`; trạng thái chỉ qua `<StatusDot domain status>`.
- [ ] Vùng chạm ≥ 44pt; icon-button có `accessibilityLabel`; `accessibilityRole` đúng; `maxFontSizeMultiplier` ≈ 1.3 cho chữ trong thẻ.
- [ ] Mọi trạng thái có UI (`api-conventions.md` §3.5): skeleton đúng hình, 2 loại rỗng, `LoadErrorState` + "Mã tra cứu", `OfflineBanner`, nút khoá + spinner khi gửi (chặn bấm 2 lần bằng ref).
- [ ] Nút/thao tác gate qua `allowedActions` + `<Can>`, có comment `// Backend phải re-check (BR-xx)`; không rải `if/else` trong JSX.
- [ ] Thông tin hover của web → hiện inline hoặc nhấn giữ (lý do khoá nút, UUID đầy đủ, nhãn gốc).
- [ ] Chọn / lọc / xác nhận / nhập lý do → bottom sheet; form nhiều trường/dòng → màn riêng.
- [ ] Nhóm route có `ErrorBoundary` export.

## 3. Checklist theo loại

### Hub

- [ ] `HubMenu` đọc `NAV_GROUPS`: icon 14–16, nhãn Việt, tooltip tiếng Anh dạng dòng phụ; mục ẩn theo quyền (kể cả `anyPermission`); đang tải/lỗi quyền → ẩn.
- [ ] Mục ComingSoon gắn nhãn "Đang phát triển" và dẫn tới màn `ComingSoon`.
- [ ] Tab không còn mục nào thấy được → ẩn tab.

### Danh sách

- [ ] Đủ các phần của `list-screen.md`: header + sắp xếp, `SearchField`, `FilterChips` → `FilterSheet`, caption "Hiển thị x / tổng", `FlashList` + `RecordCard`, cuộn vô hạn, pull-to-refresh, FAB theo quyền.
- [ ] Filter ở route params (`useListParams`), cùng tên key với web; bộ lọc kho điền sẵn từ kho mặc định.
- [ ] Test: skeleton · 2 loại rỗng · lỗi · cuộn thêm.

### Chi tiết

- [ ] Header = mã bản ghi; thẻ tóm tắt (StatusDot + trường chính); các `Section` dạng card; dòng con dạng thẻ.
- [ ] `BottomActionBar` dính đáy: 1 nút chính + nút phụ/destructive; còn lại trong sheet "Thao tác khác"; **lý do khoá hiện ngay dưới nút**.
- [ ] Terminal state: không có nút mutating, hiện câu "không còn thao tác" tương ứng của web.
- [ ] Hành động phá huỷ / cần lý do → `ConfirmSheet` (`danger`, `requireReason`) với đúng câu chữ web.
- [ ] Test: nút đúng trạng thái + ≥ 3 bộ quyền · `ConfirmSheet`.

### Form

- [ ] Một cột; section card; control 48px; `KeyboardAvoidingView`; ẩn thanh tab; `BottomActionBar` Huỷ / Lưu.
- [ ] react-hook-form + `zodResolver` với **Input schema** (BR refine có cite docs); dòng động = thẻ, sửa trong sheet (`useFieldArray`).
- [ ] Lỗi server map về trường/thẻ qua `ApiError.fieldErrors` (`lines[i].field` → thẻ i); `version` + `OPTIMISTIC_LOCK` đúng như web khi có.
- [ ] Ô mã → `ScanField`; số lượng → `QuantityStepper`; ngày → `DateField`; chọn một có tìm → `SelectSheet`.
- [ ] Test: validate · map lỗi server.

### Trạm

- [ ] Đầu màn: thanh tiến độ + trạng thái; **thẻ việc đang làm** (viền brand) chứa `ScanField` + phản hồi (`ScanFeedback`) + stepper.
- [ ] Danh sách dòng/kiện thu gọn bên dưới, chuyển bằng `Segmented`; `BottomActionBar` hành động chính; ẩn thanh tab.
- [ ] Hàng đợi quét, gửi lại / bỏ qua, danh sách quét lỗi giữ đúng logic web (`scanning.md`); polling chỉ khi màn focus + app foreground.
- [ ] Test: hàng đợi quét · gửi lại/bỏ qua · danh sách quét lỗi · chặn bấm 2 lần.

## 4. Trước khi báo xong

Chạy `/design-check <đường dẫn màn>` và `pnpm run validate`, dán output thật. Màn mới của một module thuộc cùng PR với module đó (`/port`).
