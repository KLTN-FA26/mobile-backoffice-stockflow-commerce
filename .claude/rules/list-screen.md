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

## Phải làm khi dựng màn Danh sách đầu tiên (đã quyết, chưa có code — P1)

`ListScreen` nhận `status`, `items`, `onRetry`, `onEndReached`… từ **một adapter của màn** (chuyển `useInfiniteQuery` + `useListParams` thành props). Màn đầu tiên
viết adapter đó và **phải** xử lý ba điểm sau (chưa có chỗ nào làm — đừng để lọt):

1. **Thử lại của `RefetchFailedNotice`** (hàng dưới danh sách khi tải trang kế/refetch lỗi nhưng còn dòng): gọi `fetchNextPage()` khi `isFetchNextPageError`,
   ngược lại mới `refetch()`. Truyền thẳng `refetch` làm `onRetry` thì lỗi tải trang kế sẽ tải lại **trang đầu** và làm mất vị trí cuộn.
2. **`onEndReached` của FlashList chỉ bắn khi chạm đáy, không bắn lại nếu đáy vẫn ở đó.** `ListScreen` bỏ qua sự kiện này khi đang `isRefetching` /
   `isFetchingNextPage` / dữ liệu giữ chỗ (để `fetchNextPage` không huỷ lần reload đang chạy) — nên sự kiện tới đúng lúc reload bị nuốt và danh sách đứng ở đáy
   mà không tải thêm. Adapter phải **phát lại**: khi lần tải kết thúc mà `hasNextPage` còn và danh sách vẫn đang ở đáy → gọi `fetchNextPage()` một lần.
3. **Khử trùng dòng giữa các trang theo khoá** (`keyExtractor` / `getItemId`): trang offset chồng nhau khi dữ liệu đổi giữa hai lần tải, nên hai trang có thể
   cùng một id; React/FlashList cảnh báo trùng khoá và dòng nhân đôi. Làm phẳng `pages` rồi lọc theo id (giữ lần xuất hiện đầu) trước khi đưa vào `items`.

Cũng ở adapter: ánh xạ trạng thái query → `status` (`isPending`/`isError`/`isSuccess`; query bị tắt vì không có quyền đọc thì **không** dùng `ListScreen` — xem
`ListScreenProps`), và dựng `params` thành object **ổn định** (tính lại mỗi render làm `queryKey` đổi theo tham chiếu nếu không cẩn thận). FAB tránh mép an toàn
là việc của màn chủ.

## Test bắt buộc (§8.2)

Skeleton · 2 loại rỗng · lỗi · cuộn thêm. Danh sách có mutation (chọn nhiều, đổi hãng…) thêm test action-gating theo `testing.md`.
