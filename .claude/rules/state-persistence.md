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

| Loại state                                          | Công cụ                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| Server data                                         | **React Query**                                  |
| Filter / search / sort / trang / segment            | **Route params** (`useListParams`)               |
| Sở thích cá nhân (page size, segment mặc định…)     | **kv-store** qua `usePrefs`                      |
| UI toàn cục: theme, kho mặc định, tắt tiếng, rung   | **zustand persist** (kv-store) — `use-app-store` |
| Dữ liệu phiên tạm (`requestId`, danh sách quét lỗi) | **kv-store** namespace `session:*`               |
| Form                                                | react-hook-form + `zodResolver`                  |
| Token                                               | **chỉ** `expo-secure-store`                      |
| UI cục bộ (sheet mở/đóng)                           | `useState`                                       |

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
(không ghi lúc mount); JSON hỏng → default. **Đừng tự viết lại** logic đọc/ghi.

## zustand — `use-app-store`

Theme (Sáng/Tối/Hệ thống), kho mặc định, tắt tiếng, rung — persist qua kv-store. `auth-store` **không persist token**. `scan-bus` (kết quả quét) là zustand
**không persist**.

- **Kho mặc định (N9)** chỉ là giá trị **điền sẵn** cho bộ lọc kho; không đổi hợp đồng API, không gửi `X-Warehouse-Id`.

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
