---
description: Mẫu màn Danh sách — SearchField, FilterChips, RecordCard, FlashList, cuộn vô hạn, pull-to-refresh, FAB, các trạng thái
paths:
  - "app/**/index.tsx"
  - "src/features/**/components/**"
  - "src/components/shared/{ListScreen,RecordCard,FilterChips,FilterSheet,SearchField,SelectSheet,RefetchBar,EmptyState}*"
  - "src/hooks/use-list-params.ts"
  - "src/lib/api/infinite-query.ts"
---

# Màn Danh sách

Nguồn: spec §4.2 (hàng "Danh sách"), §3.5, §2.4. Thay cho trang danh sách + DataTable của web (N2: bảng → thẻ vì 6–11 cột không đọc được ở 360px).

## Cấu trúc (từ trên xuống)

| Phần          | Quy định                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Header        | Tiêu đề + nút sắp xếp (N1: mobile không có breadcrumb)                                                                                    |
| `SearchField` | Ô tìm chính; debounce 300ms + huỷ request cũ bằng `AbortSignal`; ô tìm theo mã/SKU/barcode có nút camera (`ScanField`, xem `scanning.md`) |
| `FilterChips` | Chip "Bộ lọc" mở `FilterSheet`; chip bộ lọc đang bật có ✕ — thay thanh "Cấu hình" của web                                                 |
| Caption       | "Hiển thị x / tổng" (giữ từ web)                                                                                                          |
| `FlashList`   | Thẻ `RecordCard`: dòng 1 mã mono + `StatusDot`; dòng 2 đối tượng liên quan; dòng 3 meta ngày/SL canh phải, tabular                        |
| Cuộn          | Vô hạn theo `hasNext` (`createInfiniteListQuery`); pull-to-refresh                                                                        |
| Nút tạo       | Extended FAB góc phải dưới, **chỉ khi có quyền** (đúng mã quyền của nút tạo trên web)                                                     |

`ListScreen` (`components/shared`) lo skeleton, rỗng, lỗi, cuộn vô hạn, refresh và FAB; nhận dữ liệu qua props — không chứa nghiệp vụ. Danh sách dùng **`FlashList`**
(§8.5), không `FlatList`/`ScrollView` + `map`. Bỏ chọn cột và page size của web (N2).

## State của danh sách

- Filter / search / sort / trang / segment ở **route params** qua `useListParams`, cùng tên key với web (`q`, `status`, `page`, `sort`…) để deep-link
  được. Không lưu filter trong `useState` đơn thuần hay kv-store (xem `state-persistence.md`).
- Sở thích cá nhân (segment mặc định…) → `usePrefs`.
- Bộ lọc kho ở Lấy hàng, Trả về kệ, Đóng gói, Lô giao, Chuyến xe **điền sẵn từ kho mặc định** (N9) — người dùng vẫn đổi được; không gửi `X-Warehouse-Id`.

## Mọi trạng thái đều có UI (§3.5)

| Tình huống               | Cách làm                                                                         |
| ------------------------ | -------------------------------------------------------------------------------- |
| Tải lần đầu              | Skeleton đúng hình `RecordCard` (không spinner giữa màn trắng)                   |
| Refetch nền              | `RefetchBar` mảnh dưới header                                                    |
| Rỗng — chưa có dữ liệu   | `EmptyState` (`no-data`) + CTA nếu có quyền                                      |
| Rỗng — lọc không ra      | `EmptyState` (`no-results`) **khác** + "Bỏ bộ lọc"                               |
| Trang/offset hết dữ liệu | "Về đầu danh sách"                                                               |
| Lỗi                      | `LoadErrorState` theo `classifyLoadError` + "Mã tra cứu" + "Thử lại" khi phù hợp |
| Mất mạng                 | `OfflineBanner`                                                                  |

Chọn nhánh rỗng bằng "có bộ lọc đang bật không" — không gộp hai loại rỗng làm một.

## Test bắt buộc (§8.2)

Skeleton · 2 loại rỗng · lỗi · cuộn thêm. Danh sách có mutation (chọn nhiều, đổi hãng…) thêm test action-gating theo `testing.md`.
