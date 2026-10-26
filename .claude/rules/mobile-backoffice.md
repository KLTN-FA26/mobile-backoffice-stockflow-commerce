---
description: Năm loại màn (Hub, Danh sách, Chi tiết, Form, Trạm), BottomActionBar, bottom sheet, action-gating qua allowedActions + Can
paths:
  - "app/**"
  - "src/features/**/components/**"
  - "src/features/**/lifecycle.ts"
  - "src/components/mobile/**"
  - "src/constants/mobile/**"
---

# Màn hình back-office trên mobile

Nguồn: spec §2.2, §4.2, §3.3, §5. Style Mode A của web (token: `design-tokens.md`) với bố cục tinh chỉnh cho điện thoại. Mỗi màn dùng
**đúng** endpoint, mã quyền, lifecycle/`allowedActions`, thông báo lỗi và hằng số của web (§5) — ai có quyền thì thấy nút, không giới hạn
theo tên vai trò.

## Năm loại màn

| Loại          | Thay cho (web)                           | Cấu trúc                                                                                                                                                                                                          |
| ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hub**       | Sidebar drill-down                       | Danh sách mục con của nhóm (icon 14–16, nhãn Việt, tooltip tiếng Anh dạng dòng phụ); ẩn theo quyền; mục ComingSoon gắn nhãn "Đang phát triển"                                                                     |
| **Danh sách** | Trang danh sách + DataTable              | Xem `list-screen.md`                                                                                                                                                                                              |
| **Chi tiết**  | Trang chi tiết (cột phải 320px)          | Header = mã bản ghi; thẻ tóm tắt (StatusDot + trường chính); các `Section` dạng card; dòng con dạng thẻ; **`BottomActionBar`** dính đáy; lý do khoá hiện ngay dưới nút                                            |
| **Form**      | Trang form / wizard / FormDialog         | Một cột; section card; control 48px; dòng động = thẻ, sửa trong sheet; lỗi server map về trường/thẻ; `BottomActionBar` Huỷ / Lưu; `KeyboardAvoidingView`                                                          |
| **Trạm**      | Picking detail, packing, load (xl 2 cột) | Thanh tiến độ + trạng thái ở đầu; **thẻ việc đang làm** (viền brand) chứa `ScanField` + phản hồi + stepper; danh sách dòng/kiện thu gọn bên dưới (segment); `BottomActionBar` hành động chính — xem `scanning.md` |

Trước khi dựng màn mới: chọn đúng 1 trong 5 loại rồi chạy checklist skill `mobile-screen`.

## Điều hướng (§2.2)

- Mỗi tab có Stack riêng để thanh tab hiện ở hub và danh sách; **trạm thao tác và form toàn màn ẩn thanh tab**
  (`tabBarStyle: { display: "none" }`) — thêm chỗ và tránh chuyển tab nhầm giữa ca.
- 4 tab: Nhập hàng · Kho · Thực hiện đơn · Tài khoản. Tab không còn mục nào thấy được → ẩn tab (`NAV_GROUPS` ở `src/components/mobile/nav-config.ts`
  giữ đúng item + mã quyền của `BackofficeShell.tsx` web; không đặt trong `src/constants/mobile` vì cần kiểu `PermissionCode` của `@/lib/auth`,
  mà `src/constants` không import gì trong `src/`).
- Chưa biết quyền (đang tải / lỗi tải lần đầu) → giữ đủ tab; hub hiện skeleton hoặc `LoadErrorState kind="permissions"` + "Thử lại".
  Refetch nền lỗi (mỗi lần quay lại foreground) → giữ quyền đã biết, không đổi tab (R39).

## Overlay — sheet hay màn riêng

- Chọn / lọc / xác nhận / nhập lý do → **bottom sheet** (`Sheet` bọc `@gorhom/bottom-sheet`; `SelectSheet`, `FilterSheet`, `ConfirmSheet`).
- Form nhiều trường hoặc nhiều dòng → **màn riêng** (route). Không dùng dialog giữa màn (N5).

## `BottomActionBar` (N3)

- Dính đáy: **1 nút chính** + nút phụ/destructive; các hành động còn lại gom vào sheet "Thao tác khác".
- **Lý do khoá hiện inline** ngay dưới nút bị khoá (không có hover — N7), đúng câu chữ web.
- Trạng thái không còn thao tác → hiện câu tương ứng của web, không để thanh trống.
- Hành động phá huỷ hoặc cần lý do đi qua `ConfirmSheet` (`danger`, `requireReason`) với đúng câu chữ web.

## Action-gating — không rải `if/else` trong JSX

Trạng thái và quyền quyết định nút nào hiện, qua hai lớp:

1. `lifecycle.ts` — transition table chép từ bảng "Chuyển tiếp cho phép" trong docs. Terminal state phải `=== []`, không có nút mutating nào.
2. `allowedActions(status, …)` trả về action descriptor (kèm lý do khoá nếu có) → `BottomActionBar` / sheet "Thao tác khác" render.

Quyền dùng mã `resource:ACTION` qua `<Can>`, `useCan`, `usePermissionChecker` (`PermissionBoundary` viết lại cho RN). Đang tải/lỗi quyền =
không có quyền (ẩn nút, không nháy).

**UI-only** — mọi chỗ gate phải có comment, vì BE mới là nơi quyết định:

```tsx
// Backend phải re-check (BR-xx)
<Can permission={GOODS_RECEIPT_PERMISSIONS.update}>…</Can>
```

## Quy ước khác

- Không `Text`/`Pressable`/`Button`/`TextInput`/`TouchableOpacity` của `react-native` trong `features/**` và `app/**` — dùng `@/components/ui`.
- Chuỗi hiển thị mới của mobile (không có trong constants web) → `src/constants/mobile/**`, không gõ trong component (G18).
- Giữ đúng hành vi web ở các điểm lệch đã ghi (G1–G18 trong `web-parity.md`), kể cả khi trông như lỗi.
- Thông tin web chỉ hiện khi hover → hiện inline hoặc nhấn giữ (N7): lý do khoá nút, UUID đầy đủ, nhãn gốc tiếng Anh của trạng thái.

## Ngoài phạm vi — không port, không bịa

- Tab chỉ gồm Nhập hàng, Kho, Thực hiện đơn (+ Tài khoản). Không Load plan, Loại xe, Dashboard, Mua hàng, Master data, Platform (§1.3).
- Nút dẫn sang load plan (Lập kế hoạch xe, Ước tính xe) **ẩn** và thay bằng ghi chú "… thực hiện trên web" (D3); chuyến xe FTL vẫn thao tác đủ.
- In ấn: chỉ **xem trên màn hình**, ghi chú "In … trên web" (D4).
- Màn web đang "Đang phát triển" (Cất hàng, Kho map & slotting, Gợi ý vị trí) → màn `ComingSoon`, không bịa nghiệp vụ (D2).
