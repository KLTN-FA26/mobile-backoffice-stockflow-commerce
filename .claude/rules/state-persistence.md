---
description: Ranh giới state — React Query, route params, kv-store (usePrefs), zustand, session:*, SecureStore, form
paths:
  - "src/hooks/**"
  - "src/lib/store/**"
  - "src/lib/platform/**"
  - "src/lib/auth/**"
  - "app/**"
  - "src/features/**/components/**"
---

# State — lưu ở đâu

Nguồn: spec §3.3 (bảng ranh giới), §2.4, §3.1, §3.2. Thay `state-persistence.md` của web (nuqs / `usePageConfig` / localStorage).

## Bảng ranh giới

| Loại state                                             | Công cụ                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Server data                                            | **React Query**                                              |
| Filter / search / sort / trang / segment               | **Route params** (`useListParams`)                           |
| Sở thích cá nhân (page size, segment mặc định…)        | **kv-store** qua `usePrefs`                                  |
| UI toàn cục: theme, tắt tiếng, rung (theo máy)         | **zustand persist** (kv-store) — `use-app-store`             |
| Kho mặc định (theo **từng người dùng**, khoá `userId`) | **zustand persist** — `use-app-store.defaultWarehouseByUser` |
| Dữ liệu phiên tạm (`requestId`, danh sách quét lỗi)    | **kv-store** namespace `session:*`                           |
| Form                                                   | react-hook-form + `zodResolver`                              |
| Token                                                  | **chỉ** `expo-secure-store`                                  |
| UI cục bộ (sheet mở/đóng)                              | `useState`                                                   |

"kv-store" = `expo-sqlite/kv-store` (D9; không MMKV, không AsyncStorage). Truy cập qua `src/lib/platform/storage.ts`, không gọi trực tiếp từ component.

## Chọn nơi lưu — câu hỏi quyết định

> Mở lại **đúng deep-link này** thì có phải thấy cùng thứ không?

- **Có** → route params. Filter, search, trạng thái, sort, segment. Dùng **cùng tên key với web** (`q`, `status`, `page`, `sort`…) để deep-link được.
- **Không**, là sở thích cá nhân trên máy này → `usePrefs` (page size, segment mặc định).
- Dùng chung toàn app và phải sống qua lần mở sau → zustand persist `use-app-store`.

## Route params — `useListParams`

Đọc/ghi qua `useLocalSearchParams` + `router.setParams`. Thay `nuqs` / `useUrlFilters` của web. Search debounce 300ms. Chi tiết mẫu danh sách: `list-screen.md`.

## kv-store — `usePrefs`

Cùng chữ ký với `usePageConfig` của web: `{ config, updateConfig }`, **merge với default** để schema đổi không làm vỡ màn. Chỉ ghi khi gọi setter
(không ghi lúc mount); JSON hỏng → default. **Đừng tự viết lại** logic đọc/ghi. `merge` nhận `(stored: Record<string, unknown>, fallback)` — bản lưu có thể thiếu trường,
dư trường cũ hoặc sai kiểu (bản app cũ, bản ghi hỏng), nên `merge` phải **kiểm từng trường** (zod hoặc kiểm kiểu) và giữ giá trị của `fallback` khi trường không hợp lệ;
không ép kiểu `as Partial<T>`.

## zustand — `use-app-store`

Theme (Sáng/Tối/Hệ thống), tắt tiếng, rung — **theo máy**, người đăng nhập sau thấy lại. Kho mặc định — **theo người dùng**. Tất cả persist qua kv-store.
`auth-store` **không persist token**. `scan-bus` (kết quả quét, `src/components/mobile/scan/scan-bus.ts`) là module pub/sub in-memory, **không persist**.

- **Kho mặc định (N9)** chỉ là giá trị **điền sẵn** cho bộ lọc kho; không đổi hợp đồng API, không gửi `X-Warehouse-Id`.
- Lưu **theo người dùng**: `defaultWarehouseByUser: Record<userId, warehouseId>`, ghi bằng `setDefaultWarehouse(userId, warehouseId | null)` (`null` xoá khoá). Lý do: trên máy kho
  dùng chung, người đăng nhập sau không được thừa hưởng kho của người trước (và có thể không có quyền với kho đó).
- Màn hình **chỉ đọc qua `useDefaultWarehouseId()`** (`src/hooks/use-default-warehouse-id.ts`, `string | null`; `null` khi chưa đăng nhập hoặc chưa chọn). Không đọc
  `defaultWarehouseByUser` trực tiếp, không tự lấy `userId` rồi tra bảng. Id có thể trỏ tới kho đã ngừng hoạt động — màn có danh sách kho đối chiếu với danh sách đó.
- **Dữ liệu persist được kiểm khi đọc** (R57): `use-app-store` có `merge` dùng schema zod, từng trường chỉ giữ khi hợp lệ, ngược lại lấy mặc định (theme chỉ nhận
  `system`/`light`/`dark`; `defaultWarehouseByUser` phải là `Record<string, string>`; khoá lạ bị bỏ; JSON hỏng → mặc định, không ném lỗi). Thêm trường persist → thêm vào
  schema đó và một ca "bản ghi hỏng" trong `use-app-store.test.ts`.
- Đổi hình dạng state persist → tăng `version` và viết `migrate` (hiện `version: 1`; bản 0 có `defaultWarehouseId` dùng chung toàn máy, bị bỏ vì không biết của ai).

## `session:*` — dữ liệu phiên tạm

- Ví dụ: `requestId` của bước đóng gói/hoàn tất/mở chuyến, danh sách quét lỗi ở xếp xe (thay `sessionStorage` của web).
- **TTL 24h** (bằng cửa sổ idempotency của BE). **Xoá khi đăng xuất** cùng `queryClient.clear()` và SecureStore.

## Token

Chỉ `expo-secure-store` (`{ accessToken, expiresAt }`); bản đang dùng giữ trong bộ nhớ. **Tuyệt đối không** kv-store / AsyncStorage / zustand persist / log.

## Cấm

- Filter/search/trạng thái chỉ sống trong `useState` — mất khi điều hướng, không deep-link được.
- Lưu server data vào kv-store hoặc persist cache query — đó là việc của React Query (cache query **không persist**).
- Đặt token ngoài SecureStore; đọc token từ kv-store.
- Viết lại logic đọc/ghi kv-store thay vì dùng `usePrefs`.
