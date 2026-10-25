# StockFlow Mobile — Codex project instructions

## Phạm vi

App React Native **"StockFlow Backoffice"** cho nhân sự back-office/kho làm việc trên điện thoại (Android + iOS). Port các màn đã có trên web `stockflow-ui` thuộc 3 mảng
**Nhập hàng · Kho · Thực hiện đơn** (+ tab Tài khoản). Nghiệp vụ đồng bộ 1-1 với web; nguồn nghiệp vụ `D:\FPTU\docs\docs\` (xung đột nghiệp vụ: docs thắng).
Spec: `docs/superpowers/specs/2026-10-25-stockflow-mobile-backoffice-design.md`; plan: `docs/superpowers/plans/`.

**Ngoài phạm vi:** storefront; Load plan và Loại xe (nút dẫn sang đó ẩn, ghi chú "thực hiện trên web"); Dashboard; Mua hàng; Master data; Platform; in ấn (chỉ xem); mock mode;
offline queue; push; crash reporting; OTA.

**Stack:** Expo SDK 58 (RN 0.88, React 19.3) + Expo Router · NativeWind 4 · TanStack Query 5 + axios · zod + react-hook-form · zustand (+ `expo-sqlite/kv-store`) · expo-secure-store ·
FlashList · @gorhom/bottom-sheet · sonner-native · lucide-react-native · reanimated · expo-camera/haptics/audio · Jest (`jest-expo`) + RNTL · pnpm 10.9.0.

Hướng dẫn trực tiếp của người dùng luôn ưu tiên hơn quy ước trong file này và các skill. Nếu một skill hoặc rule khiến công việc phải dừng, đổi hướng, hoặc cần xin phép, nêu rõ file và chỉ dẫn liên quan.

## Luật theo phạm vi file

Trước khi sửa file khớp phạm vi dưới đây, đọc toàn bộ rule tương ứng trong `.claude/rules/`. Đây là nguồn dùng chung cho Claude Code và Codex; không tạo bản sao để tránh drift.

| Rule                      | Áp dụng khi sửa                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `feature-architecture.md` | `src/features/**`, `app/**`: 7 file + `errors.ts`, ranh giới import, giới hạn dòng                        |
| `api-conventions.md`      | `src/lib/api/**`, `src/lib/auth/**`, `features/**/{api,queries,mutations,schemas,errors}.ts`              |
| `design-tokens.md`        | mọi `.tsx`, `src/lib/tokens.ts`: token, lệnh cấm, dark mode, nâng cấp N1–N10                              |
| `mobile-backoffice.md`    | `app/**`, `features/**/components/**`, `components/mobile/**`: 5 loại màn, BottomActionBar, action-gating |
| `list-screen.md`          | màn Danh sách                                                                                             |
| `shared-components.md`    | `src/components/**`: tra trước khi viết component mới                                                     |
| `state-persistence.md`    | hooks, store, platform, auth: route params vs kv-store vs zustand vs SecureStore                          |
| `scanning.md`             | `ScanField`, màn scanner, trạm quét                                                                       |
| `web-parity.md`           | `port-manifest.json`, `src/constants/**`, `src/lib/**`, `features/**`: verbatim/adapted, G1–G18           |
| `testing.md`              | test, test config và test infrastructure                                                                  |

**Xung đột:** nghiệp vụ → docs thắng. Kỹ thuật/giao diện → spec mobile thắng.

## Luật không được vi phạm

- Dự án chỉ dùng **pnpm 10.9.0**. Không chạy `npm install`, `npm ci`, yarn hoặc bun. Chỉ dùng module có trong Expo Go SDK 58; phiên bản native theo `pnpm exec expo install <pkg>`.
- TypeScript strict, alias `@/*` → `src/*`. Không `any`, `@ts-ignore`, `!` non-null, hoặc `as unknown as` không lý do.
- Không hex trần ngoài `src/lib/tokens.ts`, không gradient, không hồng/magenta/fuchsia, không import `@/lib/mock-data` (`pnpm run lint` kiểm).
- Không hardcode chuỗi hiển thị: dùng `src/constants/**` (copy web) hoặc `src/constants/mobile/**`.
- Không sửa tay file `verbatim` trong `port-manifest.json`, `src/components/ui/**` (khoá khi file đã có trên `main`), hoặc `.env*` (trừ `.env.example`); không đọc `.env`, `.env.local`, `.env.{development,production,test}` và bản `.local` (chứa bí mật). Đổi file verbatim: sửa web rồi `pnpm sync:pull`.
- Ranh giới: `features/A` không import `features/B`; `components/shared` không import `features/*` hay `lib/api/*`; `app/**` chỉ import `features/*` + `components/*`. File feature ≤ 200 dòng, component ≤ 150, route ≤ 60.
- Token màu theo bảng spec §4.1; bo 8px (card/nút/ô nhập), 4px (badge); control 44–52px; vùng chạm ≥ 44pt; `maxFontSizeMultiplier` 1.3; motion 120–180ms. Trạng thái chỉ qua `<StatusDot domain status>`.
- Token đăng nhập chỉ ở expo-secure-store; dữ liệu khác ở kv-store; dữ liệu phiên tạm namespace `session:`, TTL 24h.
- Không gửi `X-Warehouse-Id`; luôn gửi `Accept-Language: vi`, `X-Correlation-Id`, `User-Agent: StockFlowMobile/<version> (<OS> <version>; <model>)`. `EXPO_PUBLIC_API_URL` gồm `/api/v1`.
- Mọi `BR-xx` trong zod refine / transition table có comment cite docs; chỗ gate quyền trong UI có `// Backend phải re-check (BR-xx)`.
- Giữ đúng hành vi web ở các điểm lệch G1–G18; không bịa record/nghiệp vụ.

## Quy trình làm việc

Mỗi task = một module = một PR. Quy trình port nằm ở `.claude/skills/port-from-web/SKILL.md` (đọc và làm theo; lệnh `/port <feature>` là lối vào của Claude Code):
đọc docs + web → `pnpm sync:add` → `api`/`queries`/`mutations` adapted → màn theo `.claude/skills/mobile-screen/SKILL.md` → test bắt buộc → `pnpm run validate`.

Trước khi báo hoàn thành thay đổi code, chạy **`pnpm run validate`** (typecheck → lint → test → test:scripts → sync:check → doctor → export:check) và dán output thật. Không tuyên bố pass khi chưa có output
thật. Nếu còn lỗi, phân biệt lỗi do thay đổi hiện tại với lỗi có sẵn trên baseline; không tự sửa lỗi ngoài phạm vi. Viết test đỏ trước, code xanh sau.

Commit: conventional, subject viết thường đầu câu, scope thuộc danh sách trong `commitlint.config.mjs`. **Không** thêm `Co-Authored-By`, "Generated with" hay dòng ghi công cụ nào (xem `.claude/skills/git-commits/SKILL.md`).

Playbook dùng chung nằm ở `.claude/`: skills `port-from-web`, `mobile-screen`, `zod-br-schema`, `status-badge`, `git-commits`; checklist review read-only `.claude/agents/architecture-reviewer.md`,
`.claude/agents/design-reviewer.md`; quy trình lệnh `.claude/commands/{validate,fix-lint,design-check,port,sync-web}.md`. Chỉ giao việc cho subagent khi người dùng yêu cầu review/delegation.

## Code style bắt buộc

- Import theo thứ tự: external → `@/constants` → `@/lib`/`@/hooks` → `@/features` → `@/components` → relative → `import type` riêng ở cuối. Tách nhóm bằng một dòng trống, sort alphabet trong nhóm.
- Chưa biết type → `unknown` + narrow/zod parse; `catch (error: unknown)` + type guard.
- Không `Text`/`Pressable`/`Button`/`TextInput`/`TouchableOpacity` của `react-native` trong `features/**` và `app/**`; dùng `@/components/ui`. Danh sách dùng `FlashList`.
- Status lấy nguyên văn từ `src/constants/statuses.ts`; không gõ lại chuỗi ở nhiều nơi.
