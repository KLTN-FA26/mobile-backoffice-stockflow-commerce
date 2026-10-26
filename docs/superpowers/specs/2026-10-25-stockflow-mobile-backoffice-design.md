# StockFlow Mobile — Back-office (Nhập hàng · Kho · Thực hiện đơn) — Design Spec

| Mục                       | Giá trị                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ngày                      | 2026-10-25                                                                                                                                                                                            |
| Trạng thái                | Chờ người dùng duyệt spec                                                                                                                                                                             |
| Repo                      | `D:\FPTU\Capstone\UIDesign\stockflow-mobile` (git local, nhánh `main`, chưa có remote)                                                                                                                |
| Nguồn web (FE backoffice) | `D:\FPTU\Capstone\UIDesign\stockflow-ui` — remote `KLTN-FA26/UI`; đối chiếu theo `origin/develop` = `3bae175`; checkout hiện tại `feature/shadcn-date-picker` = `30498cc`                             |
| Nguồn BE                  | `D:\FPTU\Capstone\UIDesign\be-backoffice-stockflow-commerce` — **hợp đồng lấy theo `origin/develop` = `92bcd760`**; working tree local (`2322e785`, 2026-10-13) chậm 483 commit, không dùng làm chuẩn |
| Nghiệp vụ                 | `D:\FPTU\docs\docs\` (BRD 18 module) — xung đột nghiệp vụ: docs thắng                                                                                                                                 |

---

## 1. Mục tiêu, phạm vi và các quyết định đã chốt

### 1.1 Mục tiêu

Xây app React Native cho **nhân sự back-office/kho** làm việc trên điện thoại, port các màn **đã có trên web backoffice** thuộc 3 mảng **Nhập hàng, Kho, Thực hiện đơn** (bỏ Load plan). Yêu cầu:

- Style giống web (Mode A — Ink + Blue, style Vercel), **tinh chỉnh bố cục cho mobile**; mọi nâng cấp style phải có lý do (§4.3).
- Công nghệ gần web nhất có thể; nghiệp vụ, mã quyền, action-gating, thông báo lỗi **đồng bộ 1-1 với web**.
- Chuẩn production: kiến trúc feature, BR truy vết được, test bắt buộc, validate trước khi báo xong.
- `.claude` của web: phần dùng lại được thì dùng lại, phần cần đổi thì làm mới cho mobile (§9).

### 1.2 Quyết định đã chốt trong brainstorming

| #   | Câu hỏi                                                                     | Quyết định                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Thiết bị & quét mã                                                          | Điện thoại **Android + iOS**, quét bằng **camera**, luôn cho gõ tay                                                                                                                          |
| D2  | Màn web đang "Đang phát triển" (Cất hàng, Kho map & slotting, Gợi ý vị trí) | **Giữ mục menu + màn ComingSoon** — đồng bộ với web, không bịa nghiệp vụ                                                                                                                     |
| D3  | Load plan & Loại xe                                                         | **Bỏ màn Loại xe**; **ẩn** mọi nút dẫn sang load plan (Lập kế hoạch xe, Ước tính xe) và thay bằng ghi chú "Thực hiện trên web"; chuyến FTL vẫn thao tác đủ; link kế hoạch hiển thị dạng text |
| D4  | In ấn (nhãn kiện, biên bản bàn giao)                                        | **Chỉ xem trên màn hình**; in thực hiện trên web                                                                                                                                             |
| D5  | Mock mode                                                                   | **Không** — app luôn gọi BE thật; test dùng fixture                                                                                                                                          |
| D6  | Hướng kỹ thuật                                                              | **A — Expo SDK 58 + Expo Router + NativeWind 4**, domain copy từ web kèm `port-manifest` + `sync:check`                                                                                      |
| D7  | Lỗi/thiếu sót đang có trên web                                              | **Giữ đúng hành vi web** (parity), liệt kê ở §7; sửa web trước rồi sync                                                                                                                      |
| D8  | Git                                                                         | `git init` local, chưa remote                                                                                                                                                                |
| D9  | Lưu trữ cục bộ                                                              | `expo-sqlite/kv-store` thay MMKV — chỉ dùng module có trong Expo Go để test iOS từ Windows không cần Mac (chốt 2026-10-25 khi lập plan P0)                                                   |

### 1.3 Ngoài phạm vi

Storefront (Mode B); Load plan; Loại xe; Dashboard; Mua hàng (PO, hoá đơn NCC, đề xuất nhập hàng); Master data; Platform (phân quyền, người dùng); in ấn; mock mode; offline queue; push notification; crash reporting (Sentry); OTA update; đổi mật khẩu / quản lý phiên trên app (BE có API nhưng web không có màn tương ứng).

---

## 2. Kiến trúc

### 2.1 Nguyên tắc (giữ nguyên của web)

1. Nghiệp vụ sống trong `src/features/`; file route trong `app/` chỉ compose (≤ 60 dòng).
2. `src/constants/` là tầng thấp nhất, không import gì khác trong `src/`.
3. Ranh giới import: `features/A` không import `features/B`; `components/shared` không import `features/*` hay `lib/api/*`; `app/**` chỉ import `features/*` + `components/*`. **Mobile enforce bằng ESLint** (`no-restricted-imports`), web chỉ quy ước.
4. Giới hạn kích thước: file feature ≤ 200 dòng, component ≤ 150 dòng.
5. Không `any`, `@ts-ignore`, `!` non-null, `as unknown as` không lý do; `unknown` + narrow / zod parse.
6. Không hardcode chuỗi/số/route/status/query key — dùng constants.
7. Mọi `BR-xx` encode trong zod refine hoặc transition table có comment cite docs.

### 2.2 Cấu trúc thư mục

Mỗi tab có Stack riêng để thanh tab hiện ở hub và danh sách; trạm thao tác và form toàn màn ẩn thanh tab (`tabBarStyle: { display: "none" }`) — thêm chỗ và tránh chuyển tab nhầm giữa ca.

```
stockflow-mobile/
├── app/                                    # Expo Router
│   ├── _layout.tsx                         # providers, fonts, theme, splash, AuthGate
│   ├── login.tsx
│   └── (app)/
│       ├── _layout.tsx                     # Stack gốc: (tabs) + scanner modal
│       ├── scanner.tsx                     # camera modal dùng chung (presentation: fullScreenModal)
│       └── (tabs)/
│           ├── _layout.tsx                 # 4 tab; tab không còn mục nào thấy được → ẩn
│           ├── inbound/                    # Nhập hàng
│           │   ├── _layout.tsx · index.tsx (hub)
│           │   ├── receipts/index.tsx · create.tsx · [id]/index.tsx · [id]/count.tsx
│           │   └── putaway.tsx             # ComingSoon
│           ├── warehouse/                  # Kho
│           │   ├── _layout.tsx · index.tsx (hub)
│           │   ├── inventory/index.tsx · inventory/warehouse/[code].tsx · movements.tsx
│           │   ├── inventory/adjustments/index.tsx · create.tsx · [id].tsx
│           │   ├── inventory-items/index.tsx · [id]/index.tsx · [id]/logistics.tsx · [id]/policy.tsx
│           │   ├── transfers/index.tsx · create.tsx · [id]/index.tsx · [id]/edit.tsx · [id]/dispatch.tsx
│           │   ├── moves.tsx
│           │   └── warehouse-map.tsx · slotting.tsx      # ComingSoon
│           ├── fulfillment/                # Thực hiện đơn
│           │   ├── _layout.tsx · index.tsx (hub)
│           │   ├── orders/index.tsx · [id]/index.tsx · [id]/release.tsx
│           │   ├── picking/index.tsx · [id].tsx
│           │   ├── put-backs.tsx
│           │   ├── packing/index.tsx · [id]/index.tsx · [id]/complete.tsx · [id]/packages/[packageId]/seal.tsx · [id]/packages/[packageId]/label.tsx
│           │   ├── packing/transfers/[id]/index.tsx · complete.tsx · packages/[packageId]/seal.tsx · packages/[packageId]/label.tsx
│           │   ├── shipments/index.tsx · [id].tsx
│           │   └── loads/index.tsx · [id]/index.tsx · [id]/handover.tsx · [id]/manifest.tsx
│           └── account/index.tsx           # Tài khoản
├── src/
│   ├── constants/          # copy verbatim từ web (§6) — KHÔNG sửa tay
│   ├── constants/mobile/   # hằng số chỉ có ở mobile: MOBILE_ROUTES, nhãn mobile, ngưỡng UI (NAV_GROUPS: components/mobile/nav-config.ts)
│   ├── features/
│   │   ├── receipt/ · inventory/ · inventory-item/ · transfer/ · move/
│   │   ├── order/ · fulfillment/ · shipping/
│   │   └── <feature>/{api,schemas,types,queries,mutations,lifecycle,selectors,errors}.ts + components/ + index.ts
│   ├── components/
│   │   ├── ui/             # primitives kiểu shadcn — hook chặn sửa tay
│   │   ├── shared/         # không chứa nghiệp vụ
│   │   └── mobile/         # shell & thiết bị: header, hub, bottom bar, scan
│   ├── lib/
│   │   ├── api/            # client, error, query-client, query-factory, idempotency, page-schema, load-error, stale-refetch
│   │   ├── auth/           # session, token-store, auth-store, me-permissions, Can, PermissionBoundary, login-error
│   │   ├── domain/         # lifecycle (transition tables), status-types
│   │   ├── format/ · validation/ · references/
│   │   ├── store/          # use-app-store (zustand + kv-store)
│   │   └── platform/       # uuid (expo-crypto), storage (kv-store), netinfo, app-state, haptics, sound, device-info
│   ├── hooks/              # use-list-params, use-prefs, use-scan-feedback, use-session-expiry, use-debounced-value
│   ├── providers/          # AppProviders (QueryClient, theme, bottom-sheet, toast, gesture, safe-area)
│   └── test/               # render helpers, fixtures chung, jest setup
├── assets/                 # fonts, icon, splash, âm báo quét
├── scripts/                # sync-check.mjs, sync-pull.mjs, sync-ack.mjs
├── port-manifest.json
├── app.config.ts · eas.json · tailwind.config.js · global.css · metro.config.js · babel.config.js
├── jest.config.js · eslint.config.mjs · prettier.config.mjs · commitlint.config.mjs · lint-staged.config.mjs
├── tsconfig.json · package.json · pnpm-lock.yaml · .npmrc · .env.example
├── CLAUDE.md · AGENTS.md · .claude/
└── docs/superpowers/{specs,plans}/
```

Thư mục `android/` và `ios/` **không commit** (Continuous Native Generation — EAS/prebuild sinh ra).

### 2.3 Stack

| Hạng mục          | Web                          | Mobile                                                                                                                                                              |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | Next 16 App Router           | **Expo SDK 58** (React Native 0.88, React 19.3, Hermes); chỉ dùng module có trong Expo Go → chạy được bằng Expo Go trên Android + iPhone; EAS dev build cho Android |
| Routing           | App Router (file-based)      | **Expo Router** (file-based)                                                                                                                                        |
| Style             | Tailwind v4 + shadcn         | **NativeWind 4** (cú pháp Tailwind v3) + primitives kiểu shadcn tự viết trong `components/ui`                                                                       |
| Server state      | TanStack Query 5             | TanStack Query 5 (giống)                                                                                                                                            |
| HTTP              | axios (qua BFF)              | axios (gọi thẳng BE)                                                                                                                                                |
| Validation / form | zod 4 + react-hook-form      | giống                                                                                                                                                               |
| UI state          | zustand (+ localStorage)     | zustand (+ **`expo-sqlite/kv-store`**)                                                                                                                              |
| Filter state      | nuqs (URL)                   | **route params** (`useListParams`)                                                                                                                                  |
| Lưu token         | Cookie HttpOnly (BFF)        | **expo-secure-store**                                                                                                                                               |
| Danh sách         | DataTable                    | **@shopify/flash-list**                                                                                                                                             |
| Overlay           | Radix Dialog/Popover/Select  | **@gorhom/bottom-sheet** + modal route                                                                                                                              |
| Toast             | sonner                       | **sonner-native**                                                                                                                                                   |
| Icon / motion     | lucide-react / framer-motion | **lucide-react-native** / **react-native-reanimated**                                                                                                               |
| Quét              | keyboard-wedge + Web Audio   | **expo-camera** + **expo-haptics** + **expo-audio**                                                                                                                 |
| Ngày / pattern    | date-fns, ts-pattern         | giống                                                                                                                                                               |
| Test              | Vitest + RTL + MSW           | **Jest (`jest-expo`) + React Native Testing Library** (lý do §8.2)                                                                                                  |
| Package manager   | pnpm 10.9                    | pnpm 10.9                                                                                                                                                           |

Phiên bản cụ thể khoá trong implementation plan P0 theo `expo install` của SDK 58 (không tự chọn bản lệch SDK).

### 2.4 Thay thế API đặc thù web

| Web                                                                  | Mobile                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next/link`, `useRouter`, `usePathname`                              | `expo-router` `Link`, `router`, `useSegments`                                                                                        |
| nuqs `useUrlFilters`                                                 | `useListParams` (đọc/ghi `useLocalSearchParams` + `router.setParams`; cùng tên key `q`, `status`, `page`, `sort`… để deep-link được) |
| `usePageConfig` (localStorage)                                       | `usePrefs` (kv-store), cùng chữ ký `{ config, updateConfig }`, cùng cơ chế merge với default                                         |
| sessionStorage (`requestId` đóng gói, mở chuyến; danh sách quét lỗi) | kv-store namespace `session:*`, xoá khi đăng xuất, TTL 24h (bằng cửa sổ idempotency của BE)                                          |
| `crypto.randomUUID()`                                                | `expo-crypto` `randomUUID()` qua `lib/platform/uuid.ts`                                                                              |
| `navigator.onLine`, window focus                                     | NetInfo → `onlineManager`; AppState → `focusManager`                                                                                 |
| `window.open` (file thiết kế, URL ký)                                | `expo-web-browser` (không cache URL)                                                                                                 |
| `window.print()`                                                     | Không có — chỉ xem (D4)                                                                                                              |
| `<datalist>`                                                         | `SelectSheet` có ô tìm                                                                                                               |
| `title` hover                                                        | Hiện inline hoặc nhấn giữ                                                                                                            |

---

## 3. Hạ tầng

### 3.1 Đăng nhập & phiên (thay BFF của web)

BE: `POST /api/v1/identity/auth/login` (public, giới hạn 5 lần/phút/IP) → `{ accessToken, tokenType: "Bearer", expiresInSeconds }` (mặc định 28800 = 8h). **Không có refresh token** (ADR-0006). Phiên được BE kiểm tra mỗi request (thu hồi có hiệu lực ngay).

**Luồng đăng nhập**

1. `POST /identity/auth/login { username, password }`.
2. `GET /identity/me` với token mới. Lỗi → `POST /identity/auth/logout` bằng token đó (best effort), bỏ token, báo `SESSION_BOOTSTRAP_FAILED` (như BFF web).
3. Lưu `{ accessToken, expiresAt }` vào **expo-secure-store** (tuyệt đối không kv-store/AsyncStorage). `user` vào `auth-store` (zustand, không persist token).
4. `GET /identity/me/permissions` qua React Query (`useMyPermissions`).

**Map lỗi đăng nhập** (copy ngữ nghĩa `lib/auth/login-error.ts` web, đọc `errorCode` BE trực tiếp): `UNAUTHORIZED` (sai tài khoản/mật khẩu — không phân biệt), `ACCOUNT_NOT_ACTIVE`, `ACCOUNT_TEMPORARILY_LOCKED` (khoá 15 phút), `RATE_LIMITED` (đếm ngược theo `Retry-After`), `VALIDATION_FAILED`, mạng.

**Mở app (bootstrap)**: đọc SecureStore → hết hạn → màn đăng nhập; còn hạn → `GET /identity/me`: 401 → đăng xuất; 5xx / mạng / 503 `AUTHORIZATION_UNAVAILABLE` → màn "Thử lại", **không** đăng xuất (quy tắc web `auth-session.ts`).

**Revalidate**: app quay lại foreground → `GET /identity/me` + refetch quyền (thay window focus + BroadcastChannel của web). Chống race bằng bộ đếm thế hệ như web.

**Hết hạn token (nâng cấp N8, có lý do)**: 15 phút trước `expiresAt` → `SessionExpiryBanner` "Phiên sắp hết hạn — đăng nhập lại để không gián đoạn"; khi hết hạn hoặc gặp 401 → **sheet đăng nhập lại giữ nguyên màn đang mở** (form/trạm không bị unmount). Lý do: nhân viên làm theo ca; web có cookie nên không cần, mobile thì token 8h không refresh được.

**Đăng xuất**: `POST /identity/auth/logout` (lỗi bỏ qua) → xoá SecureStore, `queryClient.clear()`, xoá kv-store `session:*`.

`mustChangePassword` trong `/me`: web bỏ qua → mobile bỏ qua (parity, ghi ở §7).

### 3.2 HTTP client (`src/lib/api/client.ts`)

- `baseURL = process.env.EXPO_PUBLIC_API_URL` (đã gồm `/api/v1`); timeout 15s (`BROWSER_API_TIMEOUT_MS` của web).
- Header mỗi request: `Authorization: Bearer <token>` (đọc từ bộ nhớ, nạp từ SecureStore lúc bootstrap); `Accept-Language: vi`; `X-Correlation-Id: <uuid>`; `User-Agent: StockFlowMobile/<version> (<OS> <version>; <model>)` (BE lưu vào phiên).
- **Không gửi `X-Warehouse-Id`** (BE không đọc header này — xác minh trên `origin/develop`). Phạm vi kho do BE xử lý theo phân công người dùng (403 `OUT_OF_DATA_SCOPE`).
- Response: bóc `{ success: true, data }` → `data`; lỗi → `ApiError.from` (copy `lib/api/error.ts` web: `errorCode`, `fieldErrors[]` dạng mảng có `code`, `correlationId`).
- 401 (trừ chính login/me) → luồng hết phiên §3.1. 403 → invalidate quyền (copy `query-client.ts`). 429 → đọc `Retry-After` qua `getRetryAfterSeconds(error)` (`src/lib/api/retry-after.ts`) để `error.ts` giữ verbatim.
- Idempotency: copy nguyên `lib/api/idempotency.ts` (header `Idempotency-Key`, giữ key khi status 0/5xx/408/409/423/425/429, bỏ khi thành công/lỗi đã chốt/`IDEMPOTENCY_KEY_REUSED`). Body-level `scanId` / `requestId` / `version` giữ đúng logic web; `requestId` lưu kv-store `session:*`.
- Không có secret nào trong app (không dùng `BFF_ORIGIN_SECRET`).

Cấu hình môi trường: `app.config.ts` + EAS profile `development` / `preview` / `production`, mỗi profile một `EXPO_PUBLIC_API_URL`. Dev: emulator Android dùng `http://10.0.2.2:8080/api/v1`, máy thật dùng IP LAN; cleartext HTTP chỉ bật ở profile `development` (`expo-build-properties`). Test BE ở profile mặc định/`dev` của Spring (profile `local` tắt security nên `/me` lỗi).

Định danh app: tên **"StockFlow Backoffice"**, slug `stockflow-backoffice`, bundle/package `vn.stockflow.backoffice`.

### 3.3 Query client, quyền, state

- `makeQueryClient` + `QUERY_TIMES` copy từ web: không retry 4xx, retry tối đa 2 lần; 403 → refetch `/me/permissions`.
- `focusManager` ← AppState; `onlineManager` ← NetInfo. Không persist cache query.
- Polling 15s ở chuyến xe/biên bản khi `LOADING` (`SHIPPING_LIMITS.loadPollMs`) chỉ chạy khi màn đang focus và app foreground.
- Quyền: copy `me-permissions.ts`, `Can`, `useCan`, `usePermissionChecker`; viết lại `PermissionBoundary` (RN). Mã quyền dạng `resource:ACTION`, không gắn theo tên vai trò. Đang tải/lỗi = không có quyền (ẩn nút, không nháy).
  **Khác web (R55, nâng cấp N8):** chỉ khi **chưa có** quyền nào; đã có quyền thì refetch lỗi (401 của phiên hết hạn, mạng, 503) giữ quyền đã biết — màn có gate và bản nháp không bị gỡ dưới sheet đăng nhập lại (như thanh điều hướng, R39). `Can` vì vậy thành `adapted`; web nên sửa theo rồi trả về `verbatim`.
- `NAV_GROUPS` mobile (`src/components/mobile/nav-config.ts` — không ở `src/constants/mobile` vì cần kiểu `PermissionCode` của `@/lib/auth`, mà `src/constants` không import gì trong `src/`) giữ đúng item + mã quyền của `BackofficeShell.tsx` web cho 3 nhóm, bỏ Load plan và Loại xe; `anyPermission` cho Tổng quan tồn kho. Tab không còn item thấy được → ẩn tab.

**Ranh giới state (thay `state-persistence.md`)**

| Loại state                                          | Công cụ                                      |
| --------------------------------------------------- | -------------------------------------------- |
| Server data                                         | React Query                                  |
| Filter / search / sort / trang / segment            | Route params (`useListParams`)               |
| Sở thích cá nhân (page size, segment mặc định…)     | kv-store qua `usePrefs`                      |
| UI toàn cục: theme, kho mặc định, tắt tiếng, rung   | zustand persist (kv-store) — `use-app-store` |
| Dữ liệu phiên tạm (`requestId`, danh sách quét lỗi) | kv-store `session:*`                         |
| Form                                                | react-hook-form + zodResolver                |
| Token                                               | **chỉ** expo-secure-store                    |
| UI cục bộ (sheet mở/đóng)                           | `useState`                                   |

**Kho mặc định (nâng cấp N9, có lý do)**: chọn ở tab Tài khoản từ `GET /warehouses?status=ACTIVE&size=200` (cần `warehouse-warehouses:READ`; thiếu quyền → ẩn mục). Chỉ dùng làm **giá trị điền sẵn** cho bộ lọc kho ở Lấy hàng, Trả về kệ, Đóng gói, Lô giao, Chuyến xe — người dùng vẫn đổi được. Lý do: nhân viên thường làm một kho, chọn lại trên từng màn điện thoại tốn thao tác; không đổi hợp đồng API (BE không có endpoint "kho của tôi"). Lưu **theo từng người dùng** (`defaultWarehouseByUser` khoá theo `userId`, đọc qua `useDefaultWarehouseId()`): máy kho dùng chung không được truyền kho của người trước sang người sau; giao diện / âm thanh / rung vẫn theo thiết bị.

### 3.4 Quét mã

- **`ScanField`** (`components/mobile`): ô nhập (gõ tay, Enter để gửi, Esc/✕ xoá) + nút camera; mono, `autoCapitalize="characters"`, `autoCorrect={false}`, cao 52px. Dùng cho mọi chỗ nhập mã: vị trí, SKU/barcode, mã kiện, mã khu QC, LPN.
- **Màn `scanner`** (modal, `expo-camera` `CameraView`): định dạng Code128, Code39, EAN-13/8, UPC-A/E, QR, DataMatrix.
  - Chế độ **một lần**: đọc được → đóng → trả mã về ô gọi.
  - Chế độ **liên tục** (trạm đóng gói, xếp xe): camera mở, mỗi mã đọc được gửi vào hàng đợi của trạm; cùng mã trong 1,5s bỏ qua; phản hồi hiện đè trên camera.
  - Cơ chế trả kết quả: `scan-bus` (module in-memory, không persist) theo `requestId` của lần mở.
  - Từ chối quyền camera → thông báo + nút mở Cài đặt; vẫn gõ tay được.
- **Phản hồi** (`useScanFeedback`): giữ ngữ nghĩa web — đúng: xanh + tự tắt sau 1,5s; sai: đỏ + giữ tới lần quét sau. **Thêm haptics** (đúng: `notificationAsync(Success)`, sai: `notificationAsync(Error)`) — lý do: kho ồn, người dùng không nhìn màn hình. Âm báo qua `expo-audio` (2 file âm ngắn tương ứng 1046Hz/90ms và 220Hz/320ms của web), tôn trọng cờ `muted`. Công tắc âm thanh/rung ở tab Tài khoản (web có cờ nhưng không có UI). Screen reader: `AccessibilityInfo.announceForAccessibility`.
- **Giữ nguyên logic nghiệp vụ của web**:
  - Đóng gói (đơn & chuyển kho): hàng đợi **tuần tự**, `scanId` mới mỗi lần quét; lỗi nghiệp vụ 4xx → đỏ; lỗi tạm thời (status 0, 5xx, `LOCK_TIMEOUT`, `OPTIMISTIC_LOCK`) → dừng hàng đợi, banner "Gửi lại lần quét này" (cùng `scanId`) / "Bỏ qua"; không giới hạn over-pack phía client.
  - Xếp xe: FIFO có khử trùng, `scanId = scanIdFor(loadId, code)`; chỉ báo thành công khi load trả về liệt kê kiện đã lên xe; danh sách quét lỗi lưu kv-store `session:*`; lỗi fatal đổ phần còn lại của hàng đợi vào danh sách lỗi; kiểm tra client: trim, ≤ 48, ASCII in được `/^[\x21-\x7E]+$/`, upper-case.
  - Lấy hàng: mã vị trí / mã hàng phải thuộc danh sách đã tải (layout kho + mã của task) — đúng ràng buộc combobox của web; sai → lỗi tại chỗ, không gửi.

### 3.5 Mọi trạng thái đều có UI (theo §8 PRODUCTION-FRONTEND-RULES)

| Tình huống                     | Mobile                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tải lần đầu                    | Skeleton đúng hình thẻ/section                                                                                                                                                              |
| Refetch nền                    | `RefetchBar` mảnh dưới header                                                                                                                                                               |
| Kéo xuống                      | Pull-to-refresh (thêm cho mobile)                                                                                                                                                           |
| Rỗng — chưa có dữ liệu         | `EmptyState` + CTA (nếu có quyền)                                                                                                                                                           |
| Rỗng — lọc không ra            | `EmptyState` **khác** + "Bỏ bộ lọc"                                                                                                                                                         |
| Trang/offset không còn dữ liệu | "Về đầu danh sách"                                                                                                                                                                          |
| Lỗi                            | `LoadErrorState` theo `classifyLoadError`: `not-found`, `forbidden`, `no-read`, `invalid-data`, `network`, `server`, `permissions` + "Mã tra cứu" (`correlationId`) + "Thử lại" khi phù hợp |
| Mất mạng                       | `OfflineBanner` (NetInfo) "Mất kết nối — thay đổi chưa được lưu"                                                                                                                            |
| Đang gửi mutation              | Nút khoá + spinner; chặn bấm 2 lần bằng ref                                                                                                                                                 |
| Lỗi render                     | `ErrorBoundary` export ở mỗi nhóm route                                                                                                                                                     |

Thông điệp, mã lỗi → câu tiếng Việt: dùng các bảng `*_ERROR_MESSAGES` copy từ web.

### 3.6 Rủi ro kỹ thuật cần kiểm chứng sớm (đầu P0)

| Rủi ro                                                                                                    | Kiểm chứng                                                                              |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Intl.DateTimeFormat` với `timeZone: "Asia/Ho_Chi_Minh"` trên Hermes (web dựa vào cho BR-06, lọc ngày VN) | Test `lib/format/date` chạy trong runtime Hermes (dev build), không chỉ Jest/Node       |
| pnpm + Metro (symlink)                                                                                    | Dùng `.npmrc` `node-linker=hoisted` ngay từ đầu (chốt khi lập plan P0)                  |
| NativeWind 4 (Tailwind v3) vs class Tailwind v4 của web                                                   | Không copy className từ web; viết lại theo token mobile                                 |
| `expo-camera` đọc mã 1D nhỏ trên máy cấu hình thấp                                                        | Spike trên 1 máy Android tầm trung; fallback `react-native-vision-camera` nếu không đạt |
| Rate limit login 5/phút/IP khi nhiều máy chung NAT kho                                                    | Hiển thị `Retry-After`; ghi rủi ro vận hành                                             |

---

## 4. Design system mobile

### 4.1 Token (giữ nguyên Mode A của web)

Khai báo **một lần** trong `src/lib/tokens.ts` (hex, light + dark). `ThemeProvider` áp token thành biến CSS bằng `vars()` của NativeWind; `tailwind.config.js` map mỗi token → `rgb(var(--token) / <alpha-value>)`; `global.css` chỉ chứa các directive `@tailwind`. Hex chỉ được xuất hiện ở `src/lib/tokens.ts`.

| Nhóm                 | Token (light / dark)                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nền                  | `bg.base` `#F6F6F6`/`#0E0F11` · `bg.surface` `#FFFFFF`/`#17181B` · `bg.subtle` `#F7F8FA`/`#1F2124` · `bg.muted` `#EEF0F3`/`#2A2C30`                                          |
| Viền                 | `border.default` `#DADDE1`/`#2E3034` · `border.strong` `#C5CAD1`/`#3D4045`                                                                                                   |
| Chữ                  | `ink.primary` `#1A1B18`/`#F4F4F1` · `ink.secondary` `#5C5E58`/`#A8AAA3` · `ink.tertiary` `#8A8C85`/`#76786F` · `ink.inverse` `#FFFFFF`/`#1A1B18`                             |
| Brand / accent       | `brand` (CTA) `#1A1B18`/`#F4F4F1` · `accent.blue` `#1E88E5`/`#4EA6F0` (info, progress, link phụ)                                                                             |
| Semantic (không đổi) | positive `#1F9D55` · info `#2B7FC4` · warning `#D98207` · danger `#D23B3B` · neutral `#6B6E68` · muted `#9A9C95` · special `#7C5CBF`                                         |
| Chấm / icon công cụ  | `--dot-positive` `#12A594` · `--dot-info` `#0090FF` · `--dot-warning` `#F76B15` · `--dot-danger` `#E5484D` · `--dot-special` `#8E4EC6` (chỉ cho chấm và icon, không làm chữ) |
| Radius               | `sm` 4 (badge) · `md` 8 (card, nút, **ô nhập trên mobile** — N4) · `full`                                                                                                    |
| Bóng                 | `--sh-sm` → RN `shadow*` (iOS) + `elevation: 1` (Android) cho khối dạng card                                                                                                 |
| Spacing              | thang 4px: 2/4/8/12/16/24/32/48; lề màn 16                                                                                                                                   |
| Font                 | Inter (UI), Inter Tight (số lớn), JetBrains Mono (mã, số cần canh cột) qua `@expo-google-fonts/*`; số dùng `fontVariant: ["tabular-nums"]`                                   |
| Cỡ chữ               | body 15 · meta 13 · nhỏ nhất 12 · tiêu đề header 17 · số lớn 22–24                                                                                                           |
| Motion               | 120–180ms, reanimated, tôn trọng Reduce Motion                                                                                                                               |

Dark mode: theo hệ thống mặc định, chọn Sáng/Tối/Hệ thống ở tab Tài khoản (NativeWind `colorScheme`). Lệnh cấm giữ nguyên: không hex trần ngoài file token, không gradient, không hồng/magenta, không trộn caramel (Mode B).

### 4.2 Năm loại màn

| Loại          | Thay cho (web)                                          | Cấu trúc                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Hub**       | Sidebar drill-down                                      | Danh sách mục con của nhóm (icon 14–16, nhãn Việt, tooltip tiếng Anh dạng dòng phụ); ẩn theo quyền; mục ComingSoon gắn nhãn "Đang phát triển"                                                                                                                                                                                                                                                                                        |
| **Danh sách** | Trang danh sách `surface-soft` + DataTable              | Header có tiêu đề + nút sắp xếp; `SearchField` (tìm chính); hàng `FilterChips` (chip "Bộ lọc" mở `FilterSheet`; chip bộ lọc đang bật có ✕ — thay thanh "Cấu hình"); caption "Hiển thị x / tổng"; `FlashList` thẻ `RecordCard` (dòng 1: mã mono + StatusDot; dòng 2: đối tượng liên quan; dòng 3: meta ngày/SL canh phải tabular); cuộn vô hạn theo `hasNext`; pull-to-refresh; nút tạo nổi (extended FAB) góc phải dưới khi có quyền |
| **Chi tiết**  | Trang chi tiết `surface-compact` (cột phải 320px)       | Header = mã bản ghi; thẻ tóm tắt (StatusDot + trường chính); các `Section` dạng card; dòng con dạng thẻ; **`BottomActionBar`** dính đáy: 1 nút chính + nút phụ/destructive, các hành động còn lại trong sheet "Thao tác khác"; lý do khoá hiện ngay dưới nút                                                                                                                                                                         |
| **Form**      | Trang form / wizard / FormDialog                        | Một cột; section card; control 48px; dòng động = thẻ, sửa trong sheet; lỗi server map về trường/thẻ; `BottomActionBar` Huỷ / Lưu; `KeyboardAvoidingView`                                                                                                                                                                                                                                                                             |
| **Trạm**      | Picking detail, packing station, load screen (xl 2 cột) | Thanh tiến độ + trạng thái ở đầu; **thẻ việc đang làm** (viền brand) chứa `ScanField` + phản hồi + stepper; danh sách dòng/kiện thu gọn bên dưới (segment); `BottomActionBar` hành động chính                                                                                                                                                                                                                                        |

Overlay: chọn/lọc/xác nhận/nhập lý do → **bottom sheet**; form nhiều trường hoặc nhiều dòng → **màn riêng** (route).

### 4.3 Điểm nâng cấp so với web (kèm lý do)

| #   | Nâng cấp                                            | Lý do                                                                                                                        |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| N1  | Header hiển thị tiêu đề / mã bản ghi                | Web giấu title vì breadcrumb trên topbar là tiêu đề; mobile không có breadcrumb                                              |
| N2  | Bảng → thẻ + cuộn vô hạn; bỏ chọn cột & page size   | 6–11 cột không đọc được ở bề ngang 360px; chọn cột/page size là sở thích bàn phím-chuột; vẫn giữ caption "Hiển thị x / tổng" |
| N3  | Hành động dính đáy                                  | Web đặt ở cột phải; màn hẹp bị đẩy xuống cuối trang. Đáy màn là vùng ngón cái, luôn thấy                                     |
| N4  | Control 44–52px, ô nhập bo 8px                      | Web 40px cho chuột; chuẩn chạm ≥ 44pt (iOS HIG) / 48dp (Material); bo 4px trông lệch với control cao                         |
| N5  | Bottom sheet thay Popover/Select/Dialog             | Thao tác một tay; dialog 520px không vừa màn                                                                                 |
| N6  | `QuantityStepper` −/＋ cạnh ô số                    | Đeo găng khó gõ bàn phím số; dùng ở kiểm đếm, lấy hàng, quét đóng gói, xuất kho, điều chỉnh                                  |
| N7  | Thông tin chỉ có khi hover → hiện inline / nhấn giữ | Mobile không có hover: lý do khoá nút, UUID đầy đủ, nhãn gốc tiếng Anh của trạng thái (`"Nhãn Việt — English"`)              |
| N8  | Banner sắp hết phiên + đăng nhập lại tại chỗ        | §3.1                                                                                                                         |
| N9  | Kho mặc định                                        | §3.3                                                                                                                         |
| N10 | Haptics + pull-to-refresh                           | Phản hồi khi không nhìn màn; thói quen làm mới trên mobile                                                                   |

### 4.4 Bộ component

| Tầng                                              | Thành phần                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui` (primitives, chặn sửa tay)        | Button (primary/secondary/ghost/danger; sm 40 · md 44 · lg 52), Input, Textarea, Checkbox, Switch, RadioGroup, Badge, Skeleton, Separator, Text (cỡ chữ theo token), Sheet (bọc `@gorhom/bottom-sheet`)                                                                                                                                                                                                        |
| `components/shared` (không nghiệp vụ, nhận props) | StatusDot (tone từ `status-map`, nhãn Việt, nhấn giữ hiện nhãn gốc), ToneDot, EmptyState (`no-data`) & EmptyState (`no-results`) — hai component, LoadErrorState, ListScreen, RecordCard, InfoRow, Section, FilterChips, FilterSheet, SelectSheet (có ô tìm), ConfirmSheet (`requireReason`, `danger`), DateField, QuantityStepper, SearchField, RefetchBar, OfflineBanner, ProgressBar, Segmented, ComingSoon |
| `components/mobile`                               | ScreenHeader, HubMenu, BottomActionBar, ScanField, CameraScanner, ScanFeedback, SessionExpiryBanner, ReloginSheet                                                                                                                                                                                                                                                                                              |

`<StatusDot domain status>` là cách **duy nhất** hiển thị trạng thái (như web). Thêm trạng thái → sửa `status-map.ts` ở **web** rồi sync (§6).

---

## 5. Bản đồ màn hình (web → mobile)

Mỗi màn dùng **đúng** endpoint, mã quyền, lifecycle/`allowedActions`, thông báo lỗi và hằng số của web. Ai có quyền thì thấy nút (không giới hạn theo vai trò).

### 5.1 Tab Nhập hàng

| Route web                | Route mobile                  | Loại       | Chuyển đổi                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/receipts`        | `inbound/receipts`            | Danh sách  | Thẻ: số phiếu, StatusDot `receipt`, số PO (`usePurchaseOrderNumbers` như web), phiếu giao, ngày nhận/xác nhận. Lọc trạng thái (bỏ `Confirmed` — trạng thái chuyển tiếp), khoảng ngày nhận (cảnh báo khi từ > đến; `receivedTo` = 00:00 ngày kế tiếp giờ VN), chip PO từ param `po`; sắp xếp `receivedAt`/`receiptNumber`/`status`. FAB "Tạo phiếu nhận" khi có CREATE + PO READ                                                                                                 |
| `/admin/receipts/create` | `inbound/receipts/create`     | Form       | PO chọn qua `SelectSheet` **có ô tìm** (danh sách PO CONFIRMED/PARTIALLY_RECEIVED, ≤ 200); `ExistingDraftsAlert`; xem trước dòng PO dạng thẻ (SKU, mô tả, đặt / đã nhận / còn mở); số phiếu giao (≤100), ghi chú (≤2000)                                                                                                                                                                                                                                                        |
| `/admin/receipts/[id]`   | `inbound/receipts/[id]`       | Chi tiết   | Thẻ thông tin + 4 số (Số dòng, Tổng SL nhận, Dòng cần QC, Dòng chờ QC); dòng nhận dạng thẻ (luồng 2/3 bước, vị trí, chấm QC); panel QC → sheet; "Chuyển sang khu QC" → sheet với `ScanField` mã khu QC (chuyển cả dòng); "Kết luận QC" → sheet toàn màn (Đạt + Cách ly{SL, khu, lý do} + Không đạt{SL, khu, lý do}, tổng trực tiếp, BR-08); "Xác nhận nhập kho" / "Huỷ phiếu" qua `ConfirmSheet` với đúng câu chữ web; trạng thái không còn thao tác hiện câu tương ứng của web |
| (form kiểm đếm inline)   | `inbound/receipts/[id]/count` | Form       | Mỗi dòng = thẻ (PO line × lô): SKU + "Còn mở X / đặt Y", stepper SL, số lô, hạn dùng (`DateField`), vị trí nhận (`ScanField`, upper-case, mặc định theo dòng 1), ghi chú; "Tách lô", "Xoá"; "+ Thêm dòng {sku}"; cảnh báo vượt SL còn mở; lưu = `PUT …/lines` thay toàn bộ; lỗi `lines[i].field` map về thẻ; chưa lưu → nút Xác nhận ở chi tiết bị khoá với lý do "Lưu kiểm đếm trước khi xác nhận"                                                                             |
| `/admin/putaway`         | `inbound/putaway`             | ComingSoon | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### 5.2 Tab Kho

| Route web                                 | Route mobile                                                | Loại              | Chuyển đổi                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/inventory`                        | `warehouse/inventory`                                       | Tra cứu           | `ScanField` "Mã SKU" (đúng mã, upper-case, chỉ gửi khi submit); cảnh báo tồn thấp toàn hệ thống ở đầu; segment [Tồn theo kho · Giữ chỗ]; thẻ mỗi kho: lưới Tồn thực tế / Khả dụng / Giữ chỗ / Phân bổ / ATP + "Xem chi tiết"; giữ chỗ dạng thẻ + công tắc "Chỉ kho đang xem"; mỗi danh sách cuộn riêng thay pager riêng; offline banner                                                                                                                                         |
| (drill-down kho)                          | `warehouse/inventory/warehouse/[code]`                      | Chi tiết          | Mã kho → id **chỉ** qua danh mục kho (`useWarehouseDirectory`); ATP theo kho; cảnh báo hạn dùng; tồn theo vị trí và lô (sort `expiryDate,asc` do BE)                                                                                                                                                                                                                                                                                                                            |
| `/admin/inventory-items`                  | `warehouse/inventory-items`                                 | Danh sách         | Tìm SKU/mã vạch (có camera); sheet lọc Chính sách (đã/chưa cấu hình) + Điều kiện lưu kho; thẻ: SKU, ĐVT, mã vạch, điều kiện, theo dõi, ToneDot chính sách                                                                                                                                                                                                                                                                                                                       |
| `/admin/inventory-items/[id]`             | `…/inventory-items/[id]` + `[id]/logistics` + `[id]/policy` | Chi tiết + 2 Form | 3 thẻ Logistics / Chính sách tồn / Đánh giá ngưỡng; sửa inline → 2 màn form riêng (UPDATE); gửi `version`; `OPTIMISTIC_LOCK` → nạp lại + thông báo "vừa được người khác cập nhật"; giữ ràng buộc safety ≤ reorder ≤ max, expiry cần LOT/LOT_SERIAL + FEFO, 1..36500 ngày                                                                                                                                                                                                        |
| `/admin/warehouse-map`, `/admin/slotting` | `warehouse/warehouse-map`, `warehouse/slotting`             | ComingSoon        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/admin/transfers`                        | `warehouse/transfers`                                       | Danh sách         | Thẻ: số lệnh, StatusDot `to`, kho nguồn → đích ("CODE · Tên"), hình thức giao, ngày dự kiến; sheet lọc trạng thái (10) + kho nguồn + kho đích (kể cả kho ngừng hoạt động); BE sort cố định; FAB "Tạo lệnh chuyển" khi CREATE                                                                                                                                                                                                                                                    |
| `/admin/transfers/[id]`                   | `…/transfers/[id]` + `[id]/dispatch`                        | Chi tiết + Form   | Thông tin, dòng hàng (yêu cầu / đã xuất / thiếu), mốc thời gian; hành động theo `allowedTransferActions` (four-eyes: người gửi duyệt thấy Duyệt/Từ chối **bị khoá kèm lý do**); Từ chối / Huỷ lệnh bắt buộc lý do ≤ 500; "Xuất kho" → màn form stepper từng dòng (0..yêu cầu, tổng ≥ 1, map `INSUFFICIENT_STOCK` về dòng); "Đóng gói chuyển kho"/"Xem đóng gói" → `fulfillment/packing/transfers/[id]`; **"Lập kế hoạch xe" ẩn** + ghi chú "Lập kế hoạch xe thực hiện trên web" |
| `/admin/transfers/create`, `[id]/edit`    | `…/transfers/create`, `[id]/edit`                           | Form              | Kho nguồn/đích (`SelectSheet`, chỉ kho đang hoạt động), lý do, hình thức giao (segment, mặc định FULL_TRUCKLOAD), ngày dự kiến; dòng (SKU có quét, lô, stepper SL 1..1.000.000; 1..200 dòng; không trùng SKU+lô); BR-01 nguồn ≠ đích; sửa chỉ khi DRAFT, gửi `version`, lỗi stale → nạp lại form                                                                                                                                                                                |
| `/admin/moves`                            | `warehouse/moves`                                           | Form + danh sách  | SKU (`ScanField`) → thẻ tồn theo vị trí, "Chọn làm nguồn" (khoá khi chuyển được = 0); Từ / Đến vị trí (`ScanField`); gợi ý vị trí đích từ layout kho → `SelectSheet` (thay `<datalist>`); stepper SL tối đa = onHand − reserved (BR-04); BR-01 cùng kho, BR-03 vị trí dùng được; `requestId` idempotent; thẻ kết quả; "Các lần chuyển gần đây" (10 dòng)                                                                                                                        |
| `/admin/inventory/adjustments`            | `warehouse/inventory/adjustments`                           | Danh sách         | Lọc SKU, vị trí, trạng thái (chọn một); thẻ: mã, SKU, vị trí, ngày yêu cầu, chênh lệch có dấu (mono), lý do, StatusDot `stock`; FAB "Tạo điều chỉnh" khi `inventory-stock-items:UPDATE`                                                                                                                                                                                                                                                                                         |
| `/admin/inventory/adjustments/[id]`       | `…/adjustments/[id]`                                        | Chi tiết          | 14 trường; chỉ khi `PENDING_APPROVAL`: người yêu cầu có UPDATE → "Rút yêu cầu"; người khác có APPROVE → "Duyệt và ghi sổ" + "Từ chối điều chỉnh" (lý do bắt buộc ≤ 500)                                                                                                                                                                                                                                                                                                         |
| `/admin/inventory/adjustments/create`     | `…/adjustments/create`                                      | Form              | Vị trí, SKU (`ScanField`), lô, chênh lệch (stepper cho phép âm, ≠ 0, ±1.000.000), lý do (8 giá trị, `SelectSheet`), giải thích ≤ 1000; SCRAP/SAMPLE chỉ được giảm; OTHER bắt buộc giải thích                                                                                                                                                                                                                                                                                    |
| `/admin/movements`                        | `warehouse/inventory/movements`                             | Danh sách         | Lọc SKU, vị trí, loại biến động; thẻ: thời điểm, loại, SKU/lô, từ → đến, SL, đổi trạng thái (mã gốc), chứng từ (mã gốc), lý do                                                                                                                                                                                                                                                                                                                                                  |

### 5.3 Tab Thực hiện đơn

| Route web                                      | Route mobile                                                                                | Loại            | Chuyển đổi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/orders`                                | `fulfillment/orders`                                                                        | Danh sách       | Tìm theo mã đơn/người nhận/SĐT; lọc 19 trạng thái; sắp xếp `orderNumber`/`placedAt`/`totalAmount`/`status`; thẻ: mã đơn, StatusDot `order`, người nhận / SĐT, ngày đặt, tổng tiền (theo `currency`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `/admin/orders/[id]`                           | `…/orders/[id]` + `[id]/release`                                                            | Chi tiết + Form | Thẻ trạng thái + thông báo đang giữ; dòng hàng (tiến độ giao); lịch sử (thu gọn); hình thức giao; giao một phần; lô giao (link chi tiết lô); thông tin; tài chính. Nút chính "Release" (form toàn màn: kho xuất, hình thức giao, cảnh báo FTL+COD, `Idempotency-Key`, map lỗi release); "Thao tác khác": Giữ đơn, Gỡ giữ, Ghi giao thất bại, Đóng phần còn lại (phí thoả thuận tuỳ chọn), Huỷ đơn, Bật/tắt giao một phần, Đổi hình thức giao — đúng điều kiện + mã quyền web. **Ô "Ước tính xe" bỏ** + ghi chú "Ước tính xe thực hiện trên web"                                                                                                                                                                                                        |
| `/admin/picking`                               | `fulfillment/picking`                                                                       | Danh sách       | Nhãn phạm vi ("mọi task" / "kiện đang bị giữ do lệch thiết kế" / "task được gán cho bạn"); lọc kho (điền sẵn kho mặc định), trạng thái, người được gán (khi có oversight + assignment UPDATE); thẻ: mã task (8 ký tự), đơn, người được gán ("Tôi"), StatusDot `pick` + `pack`, các mốc giờ; FAB "Tạo task lấy hàng" (sheet: đơn ứng viên có ô tìm + người được gán); "Gán lại" (sheet) khi pick Pending                                                                                                                                                                                                                                                                                                                                                |
| `/admin/picking/[id]`                          | `fulfillment/picking/[id]`                                                                  | Trạm            | Tiến độ "Đã lấy x/y dòng"; thẻ dòng đang làm: "Đến {vị trí}, lấy {SL} × {SKU} · Lô" → `ScanField` vị trí → `ScanField` mã hàng → stepper SL → "Xác nhận dòng" (`Idempotency-Key`) / "Báo thiếu hàng" (sheet: vị trí + số tìm thấy 0..phân bổ−1); "Phân bổ lại" cho người có task-assignment UPDATE; danh sách dòng thu gọn, chạm để đổi dòng đang làm; segment Thông tin task / Dòng đơn; thanh đáy "Bắt đầu lấy hàng" / "Hoàn tất lấy hàng" (đúng điều kiện assignee + `linesComplete`); sau Picked hiện "Mở trạm đóng gói"; cảnh báo hàng chờ trả về kệ / dòng thiếu                                                                                                                                                                                 |
| `/admin/put-backs`                             | `fulfillment/put-backs`                                                                     | Danh sách       | Tìm (lọc client trên ≤ 200 dòng, ghi chú khi bị cắt), lọc kho; thẻ: đơn, SKU, lô, SL đã lấy, vị trí lấy, lấy lúc; "Trả về kệ" → sheet `ScanField` vị trí + gợi ý BIN dùng được (mặc định vị trí lấy nếu dùng được)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `/admin/packing`                               | `fulfillment/packing`                                                                       | Danh sách       | Lọc kho (điền sẵn) + trạng thái (mặc định "Đang chờ"); thẻ: đơn, kho, lấy xong, người lấy, người đóng ("Chưa có ai nhận"/"Bạn"/tên), StatusDot `pack`, kiện "{đã niêm phong}/{tổng}", số lô giao                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `/admin/packing/[id]`                          | `fulfillment/packing/[id]` + `complete` + `packages/[packageId]/seal` + `…/label`           | Trạm + Form     | Thông báo (đang giữ, người khác đang đóng, quản lý hỗ trợ, hàng in chưa về, còn phải thu); chip chọn kiện đang đóng + "Mở kiện mới" (loại kiện, `Idempotency-Key`); quét liên tục (camera) hoặc `ScanField` + stepper "Số lượng mỗi lần quét" (về 1 sau mỗi lần); sheet chọn dòng/lô/serial khi cần; banner gửi lại/bỏ qua; segment [Quét · Dòng hàng · Kiện · Lô giao · Thiết kế]; thao tác kiện (sheet): Xem nhãn (màn xem, không in), Cân đo & niêm phong (form: kg ≤ 3 số lẻ, cm ≤ 2 số lẻ, cờ xoay/dễ vỡ), Mở lại, Huỷ kiện, Bớt hàng; "Hoàn tất đóng gói" (màn: sẵn sàng / đủ đơn / một phần + lý do; kết quả hiện tại chỗ); "Kiểm tra lại thiết kế" (lý do ≤ 1000); file thiết kế mở bằng `expo-web-browser`; `requestId` hoàn tất lưu kv-store |
| `/admin/packing/transfers/[id]`                | `fulfillment/packing/transfers/[id]` + `complete` + `packages/[packageId]/seal` + `…/label` | Trạm + Form     | "Mở phiên đóng gói" (không tự mở); dòng lệnh; quét; "Đóng bộ" (2..99 phần), "Giao nguyên thùng" (quét LPN ≤ 30 → form niêm phong điền sẵn), lý do ép kit khi niêm phong; hoàn tất (đủ / một phần + ghi chú); **"Lập kế hoạch xe" ẩn** + ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/admin/shipments`                             | `fulfillment/shipments`                                                                     | Danh sách       | Mặc định lọc `READY_TO_DISPATCH`; lọc kho (điền sẵn), hãng, trạng thái, tìm mã lô; thẻ: mã lô, đơn, số kiện, COD, hãng, chuyến, StatusDot `shipment`, sẵn sàng lúc; **chế độ chọn nhiều** (nút "Chọn") → thanh "{n} đã chọn · Mở chuyến" (cảnh báo khác kho/khác hãng); "Đổi hãng" trong menu thẻ (READY_TO_DISPATCH, chưa lên chuyến, dispatch UPDATE); ghi chú hãng là bên thứ ba                                                                                                                                                                                                                                                                                                                                                                    |
| `/admin/shipments/[id]`                        | `fulfillment/shipments/[id]`                                                                | Chi tiết        | Thông tin lô, hãng (khoá khi không đổi được), kiện (mã, trạng thái, kg, "Cần in lại nhãn"), lịch sử; nút ghi nhận "Đã giao" / "Giao thất bại" (lý do + ghi chú) / "Hàng hoàn về kho" theo `allowedOutcomes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/admin/loads`                                 | `fulfillment/loads`                                                                         | Danh sách       | Tìm mã chuyến/biển số/mã kế hoạch; lọc trạng thái, hình thức, kho, hãng; thẻ: mã chuyến, hình thức, kế hoạch/xe (**text**), hãng, biển số + tài xế, số lô, kiện đã lên xe (tiến độ), StatusDot, bàn giao lúc; FAB "Mở chuyến" (sheet form mở chuyến: kho, hãng, biển số ≤ 20, tài xế ≤ 120, SĐT ≤ 32; `requestId` kv-store); nút web "Kế hoạch xếp xe" (đang khoá) bỏ                                                                                                                                                                                                                                                                                                                                                                                  |
| `/admin/loads/[id]`                            | `fulfillment/loads/[id]` + `[id]/handover`                                                  | Trạm + Form     | Thông tin chuyến + tiến độ; FTL: thẻ đặt xe (Đặt xe / Sửa / Huỷ đặt xe có lý do / Bắt đầu xếp hàng), thẻ xe của kế hoạch (text), nhắc huỷ xe đã đặt; quét liên tục + danh sách quét lỗi ("Xoá danh sách"); panel dỡ hàng khi có kiện chờ dỡ; thẻ lô giao + kiện (Gỡ khỏi xe, Bỏ lô khỏi chuyến có xác nhận, cảnh báo từ chối bàn giao, link trạm đóng gói khi `LABEL_OUTDATED`); "Thêm lô" (sheet); "Huỷ chuyến" (PARCEL, lý do ≤ 500); "Xác nhận bàn giao" ở đáy, **lý do khoá hiện inline**; bàn giao = màn form (người ký *, biển số khi thiếu, SĐT, mã biên bản giấy, ghi chú, checkbox đã ký *; `version`; lỗi theo lô gắn về thẻ) → sheet "Đã bàn giao"; poll 15s khi LOADING                                                                    |
| `/admin/loads/[id]/manifest`                   | `fulfillment/loads/[id]/manifest`                                                           | Xem tài liệu    | Nội dung biên bản như web (thông tin, bảng lô giao + kiện, tổng, ô ký); quy tắc bản đối soát / thiếu kiện giữ nguyên dưới dạng cảnh báo; ghi chú "In biên bản trên web"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `/admin/vehicle-types`, `/admin/load-plans/**` | —                                                                                           | —               | Không port (D3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 5.4 Màn chỉ có trên mobile

| Màn       | Nội dung                                                                                                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login`   | Logo, tên đăng nhập, mật khẩu (ẩn/hiện), map lỗi §3.1, đếm ngược khi 429                                                                                                                                                         |
| `account` | Họ tên / tài khoản / email / vai trò (hiển thị), kho mặc định, giao diện (Hệ thống / Sáng / Tối), âm thanh quét, rung, **Kiểm tra quét mã** (quét thử để kiểm camera/âm/rung), thời gian phiên còn lại, phiên bản app, Đăng xuất |
| `scanner` | Camera modal (§3.4)                                                                                                                                                                                                              |

---

## 6. Đồng bộ với web (`port-manifest` + `sync:check`)

### 6.1 Cơ chế

`port-manifest.json`:

```json
{
  "webRepoEnv": "STOCKFLOW_WEB_REPO",
  "webRepoDefault": "../stockflow-ui",
  "webRef": "origin/develop",
  "files": [
    {
      "source": "src/constants/statuses.ts",
      "target": "src/constants/statuses.ts",
      "mode": "verbatim",
      "sourceBlob": "<git blob sha>"
    },
    {
      "source": "src/lib/status-map.ts",
      "target": "src/lib/status-map.ts",
      "mode": "adapted",
      "sourceBlob": "<git blob sha>",
      "note": "SemanticTone/StatusDomain lấy từ lib/domain/status-types.ts thay vì lib/mock-data"
    }
  ]
}
```

| Mode       | Nghĩa                                                  | `sync:check` kiểm                                                                             |
| ---------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `verbatim` | Bản sao y nguyên                                       | Nội dung target == `git show <webRef>:<source>`                                               |
| `adapted`  | Bản chuyển thể (đổi import, `vi`→`jest`, thay API web) | Blob hiện tại của source tại `webRef` == `sourceBlob` đã ghi; khác → "web đã đổi, cần rà lại" |

Lệnh:

- `pnpm sync:check` — đọc-only (`git show`, `git rev-parse` trên repo web), **không fetch**; liệt kê file lệch; exit ≠ 0 khi có lệch. Nằm trong `validate`.
- `pnpm sync:add <source…> [--target] [--mode] [--note]` — thêm file mới vào manifest (copy nội dung web làm điểm xuất phát, ghi `sourceBlob`).
- `pnpm sync:pull <target…>` — ghi lại file `verbatim` từ web và cập nhật `sourceBlob`.
- `pnpm sync:ack <target…>` — sau khi đã rà và sửa tay file `adapted`, ghi `sourceBlob` mới.
- Repo web: biến môi trường `STOCKFLOW_WEB_REPO` (mặc định `../stockflow-ui`). Muốn so với web mới nhất thì người dùng tự `git fetch` repo web.

Hook `guard-protected-files` chặn Edit/Write mọi target có `mode: "verbatim"` — chỉ `sync:pull` được ghi.

### 6.2 Phạm vi copy

| Nhóm                                                                                                                                                                                                                                                          | Mode                                                             | Ghi chú                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/constants/**` (toàn bộ)                                                                                                                                                                                                                                  | verbatim                                                         | Thuần dữ liệu, không import gì; giữ cả file load-plan/vehicle-type để `index.ts` y nguyên (không dùng tới). Hằng số chỉ của mobile → `src/constants/mobile/**` |
| `lib/format/*`, `lib/validation/*`, `lib/api/{error,idempotency,page-schema,load-error,stale-refetch,query-factory,query-client}.ts`, `lib/domain/lifecycle.ts`, `lib/status-map.ts`, `lib/auth/{me-permissions,login-error}.ts`, `lib/references/*` cần dùng | verbatim nếu không import API web / `mock-data`; còn lại adapted | Toast trong `query-factory` trỏ sang sonner-native → adapted                                                                                                   |
| `features/<in-scope>/{schemas,input-schemas,*-schemas,lifecycle,*-lifecycle,selectors,*-selectors,errors,*-errors,status-helpers,…}.ts`                                                                                                                       | verbatim / adapted theo import                                   | Quyết định từng file trong plan của giai đoạn tương ứng                                                                                                        |
| `features/<in-scope>/api.ts`, `queries.ts`, `mutations.ts`                                                                                                                                                                                                    | adapted                                                          | Đổi client, bỏ BFF path, kv-store thay sessionStorage                                                                                                          |
| Test của các file trên (`*.test.ts`)                                                                                                                                                                                                                          | adapted                                                          | `vi.*` → `jest.*`, giữ nguyên case                                                                                                                             |
| Component (`*.tsx`)                                                                                                                                                                                                                                           | **không copy**                                                   | Viết mới cho RN theo §4–§5                                                                                                                                     |

---

## 7. Parity gaps (giữ hành vi web, ghi nhận để sửa web trước)

| #   | Khu vực     | Điểm lệch / lỗi trên web                                                                                                                                                | Mobile                                                                                                                             |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Receipt     | Kiểm tra BR-02 (dung sai) và BR-03 (lô/hạn dùng bắt buộc) phía client chưa được nối trong form kiểm đếm (`useCountLinesForm` chỉ truyền `receivedOn`)                   | Giữ như web; BE vẫn chặn                                                                                                           |
| G2  | Receipt     | Tên kết quả QC không thống nhất: panel "Chấp nhận/Từ chối", dialog "Đạt/Không đạt"                                                                                      | Giữ như web                                                                                                                        |
| G3  | Receipt     | Nút "Tạo phiếu nhận" không khoá khi chưa chọn PO (zod báo lỗi)                                                                                                          | Giữ như web                                                                                                                        |
| G4  | Receipt     | `GOODS_RECEIPT_PERMISSIONS.approve` không dùng; chip lọc PO chỉ đọc từ URL, không nơi nào tạo                                                                           | Giữ như web                                                                                                                        |
| G5  | Chung       | Người nhận / người duyệt / `orderId` hiển thị UUID thô (BE không có API tra tên)                                                                                        | Giữ; UUID đầy đủ hiện khi nhấn giữ (N7)                                                                                            |
| G6  | Chung       | Web gửi `X-Warehouse-Id` nhưng không nơi nào set và BE không đọc                                                                                                        | Mobile **không gửi** (không đổi hành vi thực tế)                                                                                   |
| G7  | Transfer    | Xuất kho không invalidate cache tồn kho                                                                                                                                 | Giữ như web                                                                                                                        |
| G8  | Inventory   | Danh sách điều chỉnh hỗ trợ `sort` nhưng không gửi                                                                                                                      | Giữ như web                                                                                                                        |
| G9  | Order       | Huỷ đơn còn gửi field `reason` đã deprecated (BE ưu tiên `reasonCode`/`note`)                                                                                           | Giữ như web                                                                                                                        |
| G10 | Order       | Câu "Bạn chỉ có quyền xem đơn hàng." hiện cả với người đủ quyền ở Returned/Refunded/Partially Refunded/Completed                                                        | Giữ như web                                                                                                                        |
| G11 | Picking     | Bộ lọc trạng thái có SHORT nhưng BE không bao giờ đặt                                                                                                                   | Giữ như web                                                                                                                        |
| G12 | Put-back    | Link số đơn sang picking detail không kiểm `pick-lists:VIEW_PAGE`                                                                                                       | Giữ như web                                                                                                                        |
| G13 | Fulfillment | zod enum strict cho task/pick-line: giá trị BE lạ làm hỏng màn                                                                                                          | Giữ như web                                                                                                                        |
| G14 | Packing     | Trạm đơn bỏ qua tính năng kit của BE (`/package-kits`, `kit`, `labelOutdated`); lý do ép kit không bắt buộc phía client; phiên chuyển kho CANCELLED không có nút mở lại | Giữ như web                                                                                                                        |
| G15 | Shipping    | Câu "không thao tác" của FTL không bao giờ hiện; `removeShipment` gate theo `addShipment`; `shipmentIdsMax` (200) không enforce; `printedAt` không hiển thị             | Giữ như web                                                                                                                        |
| G16 | Picking     | `ReverifyDialog` import nhưng không tới được trên trang picking                                                                                                         | Giữ như web                                                                                                                        |
| G17 | Auth        | `mustChangePassword` của `/me` bị bỏ qua                                                                                                                                | Giữ như web                                                                                                                        |
| G18 | Chuỗi       | Một số chuỗi hardcode trong component web (mục thiết kế/đối chiếu ở đóng gói, header cột shipping, câu xác nhận bỏ lô)                                                  | Mobile đưa vào `src/constants/mobile/` (component mobile viết mới, không được hardcode); đề xuất web chuyển vào constants rồi sync |

**Thiếu sót phía BE (ảnh hưởng phạm vi)**: không có API cất hàng (INBOUND → AVAILABLE); không có API nhận hàng chuyển kho (`IN_TRANSIT → RECEIVED`); không có "kho của tôi"; không có refresh token; BE bỏ qua `X-Warehouse-Id`.

---

## 8. Chất lượng

### 8.1 Công cụ

- **pnpm** (`packageManager: pnpm@10.9.0`), hook chặn npm/yarn/bun.
- **TypeScript strict**, alias `@/*` → `src/*`.
- **ESLint 9 flat** (`eslint-config-expo` + typescript-eslint), `--max-warnings 0`:
  - `import/order` theo đúng nhóm §15.1 của web: external → `@/constants` → `@/lib`/`@/hooks` → `@/features` → `@/components` → relative → `import type` (cuối); nhóm cách 1 dòng, sort alphabet;
  - `no-restricted-imports` cho 3 ranh giới §2.1;
  - cấm import `react-native` `Text`/`Pressable` trực tiếp trong `features/**` (dùng primitives) — giữ đồng nhất giao diện;
  - `@typescript-eslint/no-explicit-any`, `no-non-null-assertion` = error.
- **Prettier** cấu hình như web (semi, double quote, trailing comma all, printWidth 100) + `prettier-plugin-tailwindcss`.
- **commitlint** conventional, scope: `receipt, inventory, inventory-item, transfer, move, order, picking, packing, shipping, auth, shell, shared, ui, scan, sync, config, deps, ci, rules`; **husky + lint-staged**.
- Grep trong CI: hex trần ngoài `src/lib/tokens.ts`; `gradient`; `pink|magenta|fuchsia`; `from "@/lib/mock-data"`.

### 8.2 Test

- **Jest (`jest-expo`) + React Native Testing Library** (dùng Jest matchers có sẵn của RNTL ≥ 12.4; `@testing-library/jest-native` đã ngừng bảo trì). Không dùng Vitest: chưa hỗ trợ ổn định transform React Native/Expo; Jest là chuẩn của Expo.
- Mock tầng `features/*/api.ts` bằng fixture (như `mockReceiptApi` của web); HTTP client test bằng `axios-mock-adapter`.
- Test của file domain copy từ web được port (adapted) — chứng minh parity.
- **Bắt buộc mỗi module** (theo `testing.md` web): lifecycle test (đủ trạng thái, terminal `[]`); action-gating ≥ 3 bộ quyền; mỗi BR-xx một test có cite docs.
- **Bắt buộc theo loại màn**: Danh sách — skeleton, 2 loại rỗng, lỗi, cuộn thêm; Chi tiết — nút đúng trạng thái + quyền, ConfirmSheet; Form — validate + map lỗi server; Trạm — hàng đợi quét, gửi lại/bỏ qua, danh sách quét lỗi, chặn bấm 2 lần.
- Coverage: `lib/domain/**`, `features/*/{schemas,lifecycle,selectors}` ≥ 90%; component ≥ 70%; không đặt target cho file route `app/**`.
- Quy tắc viết test như web: test hành vi, query theo role/label, `userEvent`, test phải fail được trước (TDD), không `any`.
- **E2E Maestro** (P6): đăng nhập → phiếu nhận; lấy hàng; đóng gói; xếp xe → bàn giao — chạy trên emulator nối BE profile `dev`.

### 8.3 `pnpm run validate`

Thứ tự: `typecheck` → `lint` → `test` → `sync:check` → `expo-doctor` → `expo export --platform android --platform ios` (build JS bundle, bắt lỗi import/Metro). Build native (APK/IPA) qua EAS, không nằm trong validate.

Luật giữ nguyên của web: **chưa chạy đủ thì không được báo xong, phải dán output thật**; còn lỗi → phân biệt lỗi do thay đổi hiện tại với lỗi có sẵn trên baseline (`git stash` → chạy lại → so số lượng).

### 8.4 CI (GitHub Actions — bật khi có remote)

- PR: `pnpm install --frozen-lockfile` → `pnpm run validate`; `sync:check` checkout `KLTN-FA26/UI` nhánh `develop` vào `../stockflow-ui` (cần token đọc repo nếu private).
- Merge vào `develop`: tuỳ chọn EAS build `preview` (APK nội bộ), secret `EXPO_TOKEN`.

### 8.5 Accessibility & hiệu năng

- `accessibilityLabel` cho icon-button; `accessibilityRole` đúng; vùng chạm ≥ 44pt; `maxFontSizeMultiplier` ≈ 1.3 cho chữ trong thẻ; tương phản theo token web (chữ ≥ 4.5:1, UI ≥ 3:1).
- `FlashList` cho mọi danh sách; `useMemo`/`useCallback` chỉ khi có bằng chứng profiler (luật web); debounce tìm kiếm 300ms + huỷ request cũ bằng `AbortSignal`.

---

## 9. `.claude` cho mobile

| Web                                                                     | Mobile                            | Thay đổi                                                                                                                                                        |
| ----------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules/feature-architecture.md`                                         | Dùng lại, chỉnh nhẹ               | 7 file + `errors.ts`; `app/**` route ≤ 60 dòng; ranh giới do ESLint bắt; feature folder theo §2.2                                                               |
| `rules/api-conventions.md`                                              | Chỉnh                             | Gọi thẳng BE, auth/phiên §3.1, client §3.2, AppState/NetInfo, kv-store `session:*`; bỏ RSC/`next/dynamic`                                                       |
| `rules/design-tokens.md`                                                | Chỉnh                             | Token §4.1 (nguồn duy nhất `src/lib/tokens.ts`, áp bằng `vars()`), RN shadow/elevation, reanimated, giữ lệnh cấm, bảng N1–N10                                   |
| `rules/testing.md`                                                      | Chỉnh                             | §8.2                                                                                                                                                            |
| `rules/mode-a-backoffice.md`                                            | Viết lại → `mobile-backoffice.md` | Ink+Blue, density mobile, 5 loại màn §4.2, BottomActionBar, action-gating, scan-first                                                                           |
| `rules/data-table-mode-a.md`                                            | Thay → `list-screen.md`           | Mẫu danh sách §4.2                                                                                                                                              |
| `rules/shared-components.md`                                            | Viết lại                          | Danh mục §4.4                                                                                                                                                   |
| `rules/state-persistence.md`                                            | Viết lại                          | Bảng §3.3                                                                                                                                                       |
| `rules/mode-b-storefront.md`                                            | Bỏ                                | Không có storefront                                                                                                                                             |
| —                                                                       | Thêm `rules/scanning.md`          | §3.4                                                                                                                                                            |
| —                                                                       | Thêm `rules/web-parity.md`        | §6, §7, quy tắc "sửa web trước"                                                                                                                                 |
| `skills/zod-br-schema`                                                  | Dùng lại                          | Đường dẫn giữ nguyên                                                                                                                                            |
| `skills/status-badge`                                                   | Chỉnh                             | `status-map.ts` là file copy → thêm trạng thái ở web rồi `sync:pull`                                                                                            |
| `skills/vercel-restyle`                                                 | Bỏ → thêm `skills/mobile-screen`  | Checklist dựng 5 loại màn                                                                                                                                       |
| —                                                                       | Thêm `skills/port-from-web`       | Quy trình port 1 feature: đọc web + docs → chọn file domain → manifest + `sync:pull` → adapted api/queries/mutations → màn theo loại → test bắt buộc → validate |
| `commands/validate`, `fix-lint`                                         | Chỉnh / dùng lại                  | Theo §8.3                                                                                                                                                       |
| `commands/design-check`                                                 | Chỉnh                             | Kiểm hex/gradient/hồng, StatusDot, vùng chạm, BottomActionBar, primitives, chữ hardcode                                                                         |
| `commands/module`                                                       | Thay → `commands/port`            | `/port <feature>` chạy skill `port-from-web`                                                                                                                    |
| `commands/restyle`, `review-pr`                                         | Bỏ                                | `review-pr` gắn CI của web; làm lại khi có CI mobile                                                                                                            |
| —                                                                       | Thêm `commands/sync-web`          | Chạy `sync:check`, hiện diff, hướng dẫn `sync:pull` / `sync:ack`                                                                                                |
| `agents/architecture-reviewer`, `design-reviewer`                       | Chỉnh                             | Checklist mobile + kiểm manifest                                                                                                                                |
| `hooks/guard-package-manager`, `format-changed-file`, `remind-validate` | Dùng lại                          | Chỉnh đường dẫn (`app/`, `src/`)                                                                                                                                |
| `hooks/guard-protected-files`                                           | Chỉnh (mạnh hơn)                  | Chặn `components/ui/*`, `.env*` và mọi target `verbatim` trong manifest                                                                                         |
| `settings.json`                                                         | Chỉnh                             | Allow `pnpm run/exec/dlx`, git đọc; Read repo web + docs; deny `.env*`, `npm install`, `yarn`; `additionalDirectories`: repo web, docs                          |
| `launch.json`                                                           | Chỉnh                             | Expo dev server (`pnpm exec expo start`, cổng 8081)                                                                                                             |
| `CLAUDE.md` (+ `AGENTS.md`)                                             | Viết mới                          | Phạm vi, stack, bảng rules, luật không được vi phạm, quy trình 1 module = 1 PR, validate, code style                                                            |

---

## 10. Lộ trình

Mỗi giai đoạn có implementation plan riêng (`docs/superpowers/plans/`); một module = một PR khi có remote.

| GĐ                         | Nội dung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Điều kiện xong                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0 — Nền tảng**          | Spike rủi ro §3.6; scaffold Expo SDK 58 + tooling (§8.1); `.claude` (§9); `port-manifest` + 4 script sync (check/add/pull/ack); port `constants` + lib domain dùng chung; theme/token/font + dark mode; `components/ui`, `shared`, `mobile`; shell (4 tab, hub theo quyền, header); đăng nhập / bootstrap / revalidate / hết phiên / đăng xuất; tab Tài khoản (kho mặc định, giao diện, âm thanh, rung); HTTP client + query client + quyền; hạ tầng quét (ScanField, scanner, phản hồi); 3 màn ComingSoon | Đăng nhập được BE profile `dev`; hub ẩn/hiện đúng theo quyền; quét camera trả mã về ô; `validate` xanh; chạy bằng Expo Go trên Android (emulator) và iPhone thật; EAS dev build Android cài được |
| **P1 — Nhập hàng**         | Phiếu nhận: danh sách, tạo, chi tiết, kiểm đếm, chuyển QC, kết luận QC                                                                                                                                                                                                                                                                                                                                                                                                                                     | Test parity + bắt buộc đạt; `validate` xanh                                                                                                                                                      |
| **P2 — Kho**               | Tổng quan + drill-down kho; hồ sơ hàng tồn (danh sách, chi tiết, 2 form); lịch sử biến động; điều chỉnh (3 màn); di chuyển nội bộ; chuyển kho (danh sách, chi tiết, tạo, sửa, xuất kho)                                                                                                                                                                                                                                                                                                                    | Như trên                                                                                                                                                                                         |
| **P3 — Thực hiện đơn I**   | Đơn hàng (danh sách, chi tiết, release, mọi thao tác); lấy hàng (danh sách + trạm); trả về kệ                                                                                                                                                                                                                                                                                                                                                                                                              | Như trên                                                                                                                                                                                         |
| **P4 — Thực hiện đơn II**  | Đóng gói: hàng chờ, trạm đơn, trạm chuyển kho, niêm phong, nhãn (xem), hoàn tất                                                                                                                                                                                                                                                                                                                                                                                                                            | Như trên                                                                                                                                                                                         |
| **P5 — Thực hiện đơn III** | Lô giao (danh sách + chi tiết); chuyến xe (danh sách + trạm + bàn giao + biên bản xem)                                                                                                                                                                                                                                                                                                                                                                                                                     | Như trên                                                                                                                                                                                         |
| **P6 — Hoàn thiện**        | Maestro E2E 4 luồng; rà a11y + hiệu năng; EAS `preview` APK; báo cáo parity gaps cập nhật                                                                                                                                                                                                                                                                                                                                                                                                                  | APK nội bộ demo được                                                                                                                                                                             |

Thứ tự theo luồng hàng thật (nhập → lưu kho → xuất); P0 là nền cho mọi giai đoạn sau.
