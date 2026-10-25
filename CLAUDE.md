# StockFlow Mobile — CLAUDE.md

## Phạm vi

App React Native **"StockFlow Backoffice"** cho nhân sự back-office/kho làm việc trên điện thoại (Android + iOS). Port các màn **đã có trên web** `stockflow-ui`
thuộc 3 mảng **Nhập hàng · Kho · Thực hiện đơn** (+ tab Tài khoản). Style giống web (Ink + Blue, style Vercel), bố cục tinh chỉnh cho mobile; nghiệp vụ, mã quyền,
action-gating, thông báo lỗi **đồng bộ 1-1 với web**.

- Nghiệp vụ: `D:\FPTU\docs\docs\` (BRD 18 module) — xung đột nghiệp vụ: **docs thắng**.
- Hợp đồng BE: `origin/develop` của `be-backoffice-stockflow-commerce`. Nguồn web: `origin/develop` của `stockflow-ui` (repo ở `STOCKFLOW_WEB_REPO`, mặc định `../stockflow-ui`; chỉ đọc).
- Spec: `docs/superpowers/specs/2026-10-25-stockflow-mobile-backoffice-design.md` · Plan: `docs/superpowers/plans/`. Đọc hàng của module ở spec §5 trước khi làm.
- **Ngoài phạm vi:** storefront; Load plan và Loại xe (nút dẫn sang đó ẩn, ghi chú "thực hiện trên web"); Dashboard; Mua hàng; Master data; Platform; in ấn (chỉ xem trên màn hình);
  mock mode (app luôn gọi BE thật, test dùng fixture); offline queue; push; crash reporting; OTA.

**Stack:** Expo SDK 58 (RN 0.88, React 19.3) + Expo Router · NativeWind 4 · TanStack Query 5 + axios · zod + react-hook-form · zustand (+ `expo-sqlite/kv-store`) ·
expo-secure-store · FlashList · @gorhom/bottom-sheet · sonner-native · lucide-react-native · reanimated · expo-camera/haptics/audio · Jest (`jest-expo`) + RNTL · pnpm 10.9.0.
Chỉ dùng module có trong **Expo Go SDK 58**; phiên bản native lấy theo `pnpm exec expo install <pkg>`, không tự chọn bản.

## Luật chi tiết nằm ở `.claude/rules/` — tự nạp theo file đang sửa

| Rule                      | Áp dụng khi sửa                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature-architecture.md` | `src/features/**`, `app/**` — 7 file + `errors.ts`, ranh giới import (ESLint), giới hạn dòng                                                       |
| `api-conventions.md`      | `src/lib/api/**`, `src/lib/auth/**`, `features/**/{api,queries,mutations,schemas,errors}.ts` — client, phiên, query key, zod, mọi trạng thái có UI |
| `design-tokens.md`        | mọi `.tsx`, `src/lib/tokens.ts` — token, lệnh cấm, dark mode, nâng cấp N1–N10                                                                      |
| `mobile-backoffice.md`    | `app/**`, `features/**/components/**`, `components/mobile/**` — 5 loại màn, BottomActionBar, action-gating                                         |
| `list-screen.md`          | màn Danh sách — SearchField, FilterChips, RecordCard, FlashList, trạng thái                                                                        |
| `shared-components.md`    | `src/components/**` — tra trước khi viết component mới                                                                                             |
| `state-persistence.md`    | hooks, store, platform, auth — route params vs kv-store vs zustand vs SecureStore                                                                  |
| `scanning.md`             | `ScanField`, màn scanner, trạm quét — logic hàng đợi giữ đúng web                                                                                  |
| `web-parity.md`           | `port-manifest.json`, `src/constants/**`, `src/lib/**`, `features/**` — verbatim/adapted, "sửa web trước", G1–G18                                  |
| `testing.md`              | `*.test.*` — lifecycle + action-gating + BR test bắt buộc, coverage                                                                                |

**Xung đột:** nghiệp vụ → docs thắng. Kỹ thuật → spec thắng.

## Luật không được vi phạm

- **pnpm 10.9.0** (`.npmrc` `node-linker=hoisted`) — cấm npm/yarn/bun để cài (hook chặn).
- TypeScript strict, alias `@/*` → `src/*`; cấm `any`, `@ts-ignore`, `!` non-null, `as unknown as` không lý do.
- Không hex trần ngoài `src/lib/tokens.ts`; không gradient; không hồng/magenta/fuchsia; không import `@/lib/mock-data` — `pnpm run lint` bắt.
- Không hardcode chuỗi hiển thị: dùng `src/constants/**` (copy web) hoặc `src/constants/mobile/**`.
- **Không sửa tay** file `verbatim` trong `port-manifest.json`, `src/components/ui/**` (khoá khi file đã có trên `main`), `.env*` trừ `.env.example` (hook chặn sửa; settings cấm đọc `.env`, `.env.local`,
  `.env.{development,production,test}` và bản `.local`). Đổi file verbatim → sửa web rồi `pnpm sync:pull`.
- Ranh giới: `features/A` không import `features/B`; `components/shared` không import `features/*` hay `lib/api/*`; `app/**` chỉ import `features/*` + `components/*`; `src/constants` là tầng thấp nhất.
- File feature ≤ 200 dòng, component ≤ 150 dòng, file route trong `app/` ≤ 60 dòng.
- Token màu (light/dark) đúng bảng spec §4.1; card/nút/ô nhập bo 8px, badge 4px; control 44–52px; vùng chạm ≥ 44pt; `maxFontSizeMultiplier` 1.3; motion 120–180ms.
- Trạng thái chỉ hiển thị qua `<StatusDot domain status>`, tên trạng thái nguyên văn theo docs/web.
- Token đăng nhập chỉ ở **expo-secure-store**; dữ liệu khác ở kv-store; dữ liệu phiên tạm namespace `session:`, TTL 24h.
- API: `EXPO_PUBLIC_API_URL` gồm `/api/v1` (emulator Android `http://10.0.2.2:8080/api/v1`; cleartext chỉ profile `development`). **Không gửi `X-Warehouse-Id`**;
  luôn gửi `Accept-Language: vi`, `X-Correlation-Id`, `User-Agent: StockFlowMobile/<version> (<OS> <version>; <model>)`.
- Mọi `BR-xx` encode trong zod refine / transition table có comment cite docs; mọi chỗ gate nút/quyền trong UI có `// Backend phải re-check (BR-xx)`.
- Giữ đúng hành vi web ở các điểm lệch G1–G18; không bịa record/nghiệp vụ; màn web "Đang phát triển" → `ComingSoon`.
- Định danh app: tên "StockFlow Backoffice", slug `stockflow-backoffice`, bundle/package `vn.stockflow.backoffice`.

## Quy trình làm việc

Mỗi task = **một module = một PR**, qua `/port <feature>` (skill `port-from-web`): đọc docs + web → chọn file domain → `sync:add` (verbatim/adapted) → `api`/`queries`/`mutations` adapted → màn theo
`mobile-screen` → test bắt buộc → `pnpm run validate`. Feature: `receipt` · `inventory` · `inventory-item` · `transfer` · `move` · `order` · `fulfillment` · `shipping`.

### BẮT BUỘC trước khi báo "xong"

Chạy **`pnpm run validate`** (typecheck → lint → test → test:scripts → sync:check → doctor → export:check) và **dán output thật**.

- **Chưa chạy đủ thì KHÔNG được nói task đã xong.** Không suy đoán "chắc là pass".
- Còn lỗi → phân biệt **lỗi mình gây ra** với **lỗi có sẵn trên baseline** (`git stash -u` → chạy lại → so số lượng). Lỗi của mình → sửa xong mới báo. Lỗi có sẵn → báo người dùng, không tự sửa ngoài phạm vi.
- TDD: viết test đỏ trước, code xanh sau.

### Git

Conventional commit, subject **viết thường** đầu câu, scope thuộc: `receipt` `inventory` `inventory-item` `transfer` `move` `order` `picking` `packing` `shipping` `auth` `shell` `shared` `ui` `scan`
`sync` `config` `deps` `ci` `rules`. **Không** thêm `Co-Authored-By` / "Generated with" / bất kỳ dòng ghi công cụ nào (`includeCoAuthoredBy: false`; xem skill `git-commits`).

## Công cụ có sẵn

| Loại    | Tên                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| Command | `/port <feature>` · `/sync-web` · `/validate` · `/design-check` · `/fix-lint`                                     |
| Agent   | `architecture-reviewer` · `design-reviewer` (read-only)                                                           |
| Skill   | `port-from-web` · `mobile-screen` · `zod-br-schema` · `status-badge` · `git-commits`                              |
| Hook    | `guard-package-manager` (chặn npm/yarn/bun) · `guard-protected-files` · `format-changed-file` · `remind-validate` |
| Script  | `pnpm sync:check` · `sync:add` · `sync:pull` · `sync:ack` — đồng bộ với web qua `port-manifest.json`              |

## Code style bắt buộc

- **Import theo thứ tự:** external → `@/constants` → `@/lib`/`@/hooks` → `@/features` → `@/components` → relative → `import type` (tách riêng, cuối). Nhóm cách nhau 1 dòng trống, trong nhóm sort alphabet (ESLint `import/order`).
- Chưa biết type → `unknown` + narrow / zod parse; `catch (e: unknown)` + type guard. `useMemo`/`useCallback` chỉ khi có bằng chứng profiler.
- Không `Text`/`Pressable`/`Button`/`TextInput`/`TouchableOpacity` của `react-native` trong `features/**` và `app/**` — dùng `@/components/ui`. Danh sách dùng `FlashList`.
- Chuỗi status lấy từ `src/constants/statuses.ts` (nguồn cho zod enum + status-map + lifecycle) — không gõ tay lại.
