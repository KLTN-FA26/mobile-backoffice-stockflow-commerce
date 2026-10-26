---
description: HTTP client gọi thẳng BE, đăng nhập/phiên, query client, query key factory, invalidation, zod DTO/Input, parse tại biên, BR cite, mọi trạng thái đều có UI
paths:
  - "src/lib/api/**"
  - "src/lib/auth/**"
  - "src/lib/validation/**"
  - "src/features/**/{api,queries,mutations,schemas,errors}.ts"
---

# Data layer

Nguồn: spec §3.1–§3.3, §3.5 (gốc từ `PRODUCTION-FRONTEND-RULES` §2–§4, §8 của web). Hợp đồng BE = `origin/develop` của
`be-backoffice-stockflow-commerce`; **không mock mode** — app luôn gọi BE thật, test dùng fixture (D5).

## HTTP client — `src/lib/api/client.ts` (§3.2)

Một instance axios duy nhất. Component **không** gọi axios trực tiếp; luôn qua `features/<feature>/api.ts`.

| Việc               | Quy định                                                                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseURL`          | `process.env.EXPO_PUBLIC_API_URL` (đã gồm `/api/v1`; `readAppConfig` từ chối URL có đường dẫn không kết thúc `/api/v1`, hoặc có query/fragment → màn lỗi cấu hình, không phải lỗi đăng nhập chung); timeout 15s (`BROWSER_API_TIMEOUT_MS` của web)                                                         |
| Header mỗi request | `Authorization: Bearer <token>` (đọc từ bộ nhớ, nạp từ SecureStore lúc bootstrap) · `Accept-Language: vi` · `X-Correlation-Id: <uuid>` · `User-Agent: StockFlowMobile/<version> (<OS> <version>; <model>)`                                                                                                 |
| **Không gửi**      | `X-Warehouse-Id` (BE không đọc; phạm vi kho do BE xử lý theo phân công — 403 `OUT_OF_DATA_SCOPE`)                                                                                                                                                                                                          |
| Response           | bóc `{ success: true, data }` → `data`; lỗi → `ApiError.from` (`errorCode`, `fieldErrors[]` có `code`, `correlationId`)                                                                                                                                                                                    |
| 401 (trừ login/me) | luồng hết phiên ở dưới (401 của request **không gửi token** bị bỏ qua; mọi `AUTH_ENDPOINTS` — kể cả mục thêm sau này — miễn xử lý 401, nơi gọi tự xử lý); 403 → invalidate quyền (`query-client.ts` copy từ web); 429 → đọc `Retry-After` qua `getRetryAfterSeconds(error)` (`src/lib/api/retry-after.ts`) |
| Secret             | Không có secret nào trong app (không `BFF_ORIGIN_SECRET`); env `EXPO_PUBLIC_*` đều công khai                                                                                                                                                                                                               |

`src/lib/api/error.ts` giữ **verbatim** — đừng thêm logic vào đó (đó là lý do có `retry-after.ts`).

### Idempotency

Copy nguyên `idempotency.ts` của web: header `Idempotency-Key`; **giữ key** khi status 0 / 5xx / 408 / 409 / 423 / 425 / 429;
**bỏ key** khi thành công, lỗi nghiệp vụ đã chốt, hoặc `IDEMPOTENCY_KEY_REUSED`. Body-level `scanId` / `requestId` / `version`
giữ đúng logic web; `requestId` lưu kv-store `session:*` (xem `state-persistence.md`).

## Đăng nhập & phiên (§3.1)

BE không có refresh token (ADR-0006); phiên được BE kiểm tra mỗi request.

| Luồng                | Quy định                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng nhập            | `POST /identity/auth/login` → `GET /identity/me` **với token ứng viên** (header `Authorization` đặt tường minh; token trong bộ nhớ vẫn là của phiên hiện tại). Còn là lần đăng nhập hiện hành → lưu `{ accessToken, expiresAt }` vào **expo-secure-store**, rồi `setAccessToken` + commit `user` vào `auth-store` **trong cùng một tick** (không persist token), rồi `useMyPermissions`. `/me` lỗi hoặc lần đăng nhập bị bỏ → thu hồi token ứng viên (`logout`, fire-and-forget, **không đợi**), chỉ xoá SecureStore nếu nó đang giữ đúng token đó, **không đụng phiên hiện tại**, báo `SESSION_BOOTSTRAP_FAILED` ngay |
| Đăng nhập lại        | Cùng đường trên. Thành công (cùng hoặc khác người dùng) → thu hồi token **cũ** (fire-and-forget). Dữ liệu `session:*` được gắn với người sở hữu: `claimSessionData` xoá khi chủ ≠ người vừa đăng nhập (cả khi chưa có chủ)                                                                                                                                                                                                                                                                                                                                                                                             |
| Mở app               | SecureStore hết hạn → màn đăng nhập; còn hạn → `/me`: 401 → đăng xuất; 5xx / mạng / 503 `AUTHORIZATION_UNAVAILABLE` → màn "Thử lại", **không** đăng xuất. Token còn trong SecureStore mà kv-store không ghi chủ phiên (cài lại app, Keychain iOS giữ token) → coi như đã đăng xuất, xoá token                                                                                                                                                                                                                                                                                                                          |
| Revalidate           | app quay lại foreground → `/me` + refetch quyền; chống race bằng bộ đếm thế hệ như web                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sắp hết hạn          | 15 phút trước `expiresAt` → `SessionExpiryBanner`; hết hạn hoặc 401 → `ReloginSheet` **giữ nguyên màn đang mở** (form/trạm không bị unmount) — N8                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Đăng xuất            | `POST /identity/auth/logout` (lỗi bỏ qua) → xoá SecureStore, `queryClient.clear()`, xoá kv-store `session:*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Lỗi đăng nhập        | `loginErrorMessage` copy web, đọc `errorCode` BE: `UNAUTHORIZED` · `ACCOUNT_NOT_ACTIVE` · `ACCOUNT_TEMPORARILY_LOCKED` · `RATE_LIMITED` (đếm ngược `Retry-After`) · `VALIDATION_FAILED` · mạng                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `mustChangePassword` | bỏ qua như web (G17)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Query client & quyền (§3.3)

- `makeQueryClient` + `QUERY_TIMES` copy từ web: **không retry 4xx**, retry tối đa 2; 403 → refetch `/me/permissions`.
- `focusManager` ← `AppState`; `onlineManager` ← NetInfo. **Không persist cache query.**
- Polling 15s (`SHIPPING_LIMITS.loadPollMs`) ở chuyến xe/biên bản khi `LOADING` — chỉ chạy khi màn đang focus và app foreground.
- Quyền dạng `resource:ACTION`, không gắn theo tên vai trò; copy `me-permissions.ts`, `Can`, `useCan`, `usePermissionChecker`.
  **Chưa biết quyền nào** (đang tải lần đầu, hoặc lỗi tải lần đầu) = **không có quyền**: `Can` ẩn nút (không nháy), `PermissionBoundary` hiện skeleton rồi lỗi
  `permissions` + "Thử lại" (403 thì từ chối). **Đã có quyền trong cache thì refetch lỗi** (401 vì phiên hết hạn, mất mạng, 503) **giữ quyền đã biết** (R55, như R39
  ở hub): màn đang mở và bản nháp của nó không bị unmount. Đổi lại, quyền bị thu hồi vẫn hiện tới lần refetch thành công kế tiếp (chỉ UI; BE re-check). Web chưa làm
  vậy: `Can.tsx` là `adapted` (note trong `port-manifest.json`), trả về `verbatim` khi web sửa theo. Quyết định theo `query.data !== undefined`, không theo `isSuccess`/`isError`.
- **Đừng đặt effect khoá theo `user` hay `authorizationVersion` trong màn đã đăng nhập.** Khi đổi người dùng có một lần commit mà màn của người cũ còn mount trong
  lúc token và `user` đã là của người mới (token mới được đặt ngay trước commit): effect như vậy chạy với dữ liệu lẫn lộn, và màn có polling (`loadPollMs`) có thể gọi bằng
  token mới. Cần phản ứng theo người dùng → làm ở tầng phiên (`src/lib/auth`), đừng làm bằng effect trong màn.
- **Mutation tạm dừng khi offline — cần quyết định trước trạm đầu tiên (P3/P4).** `networkMode` mặc định của TanStack là `online`: mutation gọi lúc `onlineManager`
  (← NetInfo) báo mất mạng **không gửi** mà giữ `isPending`, nút quay cho tới khi có mạng. Với form/trạm cần chọn một: (a) chặn gửi khi offline (nút khoá + "Mất kết nối —
  thay đổi chưa được lưu"), hay (b) `networkMode: "always"` để lỗi mạng hiện ngay và trạm dùng "Gửi lại lần quét này". Chưa chọn thì không gắn mutation nào của trạm vào app.

## Query key factory & invalidation

Key theo feature qua `createQueryKeys(root)` (`src/lib/api/query-factory.ts`) — không viết key chuỗi tay:

```ts
export const receiptKeys = createQueryKeys<ListGoodsReceiptParams>("goods-receipts");
// receiptKeys.all · .list(params) · .detail(id)
```

- Root dùng chung giữa feature nằm ở `SHARED_QUERY_ROOTS` (`src/constants/query-roots.ts`): feature **không import chéo**,
  nên feature gây thay đổi invalidate qua root đó, feature sở hữu dữ liệu build key dưới đúng root.
- Mỗi mutation khai báo rõ nó invalidate cái gì (`createMutation(fn, { invalidate: [...], successMessage })`), theo liên kết module
  trong docs. Ví dụ xác nhận phiếu nhận đổi cả tồn kho và trạng thái PO → invalidate cả `receiptKeys` lẫn root tồn kho / PO.

### Callback của mutation — đặt ở đâu

Invalidate + toast thuộc về **factory**, không lặp lại ở component. Callback của màn hình chỉ làm việc của màn hình:

| Việc                                                                | Đặt ở                                              |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| Chỉ áp cho **một lần gọi** (đóng sheet này, điều hướng)             | `mutate(vars, { onSuccess, onSettled })` — ưu tiên |
| Áp cho **mọi lần gọi** của hook trên màn (map lỗi server về trường) | `useXxx({ onError })`                              |

`createMutation` gọi callback màn hình **sau** handler của nó, nên không ghi đè invalidate/toast. Đừng gọi lại
`invalidateQueries`/toast thành công trong component; muốn map lỗi inline thay toast lỗi mặc định → `showErrorToast: false`.
`query-factory.ts` là `verbatim`: nó `require` lười `@/components/shared/Toast` lúc cần toast, và mobile cung cấp module đó bằng `sonner-native` — nên `Toast.tsx` phải
**nhẹ** (chỉ helper `toast`; UI nằm ở `ToastProvider.tsx`), vì lần toast đầu tiên nạp nó ngay trong lúc mutation chạy.

## Zod — hai lớp schema, KHÔNG trộn

| Lớp   | Tên                            | Việc                                           |
| ----- | ------------------------------ | ---------------------------------------------- |
| DTO   | `XDto`                         | Hình dạng dữ liệu **từ backend** về, chỉ shape |
| Input | `XCreateInput`, `XUpdateInput` | Dữ liệu **form gửi đi**, kèm BR refine         |

- `types.ts` chỉ `z.infer` từ schemas — không khai interface tay.
- **Parse tại biên:** parse **một lần** ở `api.ts` ngay khi nhận response; không parse rải rác trong component. Dữ liệu vào React Query
  đã là kiểu đã validate. Parse fail → `invalid-data` (bug contract, kèm "Mã tra cứu").
- Dùng lại `src/lib/validation/primitives.ts` (`vnd`, `money`, `intQty`, `isoDate`, `barcode`, `locationCode`…); không viết regex
  tiền/ngày/mã riêng ở từng feature.
- **BR traceable — bắt buộc:** mọi `BR-xx` encode vào zod refine hoặc transition table phải có comment cite docs
  (`// BR-05 (docs 02-purchase-order §4): …`). Thiếu cite = chưa làm. Chi tiết: skill `zod-br-schema`.

## Forms

react-hook-form + `zodResolver`, luôn dùng Input schema. Dòng động → `useFieldArray` (dòng = thẻ, sửa trong sheet).
Lỗi server map về trường/thẻ qua `ApiError.fieldErrors` (`lines[i].field` → thẻ thứ i). Ô nhập mã → `ScanField` (`scanning.md`).

## Mọi trạng thái đều có UI (§3.5)

| Tình huống               | Mobile                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tải lần đầu              | Skeleton đúng hình thẻ/section — không spinner giữa màn trắng                                                                                                                                     |
| Refetch nền              | `RefetchBar` mảnh dưới header                                                                                                                                                                     |
| Kéo xuống                | Pull-to-refresh                                                                                                                                                                                   |
| Rỗng — chưa có dữ liệu   | `EmptyState` (`no-data`) + CTA nếu có quyền                                                                                                                                                       |
| Rỗng — lọc không ra      | `EmptyState` (`no-results`) **khác** + "Bỏ bộ lọc"                                                                                                                                                |
| Trang/offset hết dữ liệu | "Về đầu danh sách"                                                                                                                                                                                |
| Lỗi                      | `LoadErrorState` theo `classifyLoadError`: `not-found`, `forbidden`, `no-read`, `invalid-data`, `network`, `server`, `permissions` + "Mã tra cứu" (`correlationId`) + "Thử lại" khi phù hợp       |
| Mất mạng                 | `OfflineBanner` (NetInfo) "Mất kết nối — thay đổi chưa được lưu" — gắn **một lần** trong `ScreenHeader`, dưới thanh tiêu đề (màn không tự mount thêm)                                             |
| Đang gửi mutation        | Nút khoá + spinner; chặn bấm 2 lần bằng `useSubmitLatch` (khoá từ lúc chạm — `isPending` của TanStack chỉ tới sau một render; `ConfirmSheet` đã dùng, `BottomActionBar.primary` bật bằng `latch`) |
| Lỗi render               | `ErrorBoundary` export ở mỗi nhóm route; gốc: `app/_layout.tsx` export `RootErrorBoundary` (tự bọc `AppProviders`, vì lỗi ở gốc thay cả layout gốc, provider theme nằm trong đó)                  |

Hai loại rỗng là **hai component khác nhau** — đừng gộp. Mã lỗi → câu tiếng Việt: dùng các bảng `*_ERROR_MESSAGES` copy từ web.

## Format tiền / ngày / số — MỘT chỗ

Qua `src/lib/format/*` (copy từ web); không định nghĩa formatter trong màn hình. Tiền **luôn lấy `currency` của record**, không
hardcode VND. Số lượng kèm `uom`. Ngày: timezone `Asia/Ho_Chi_Minh`, `vi-VN` (rủi ro Hermes: spec §3.6). Lookup tên qua `src/lib/references/*`,
không `.find()` rải rác trong component.
