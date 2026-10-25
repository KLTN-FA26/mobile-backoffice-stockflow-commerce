# P0 — Nền tảng StockFlow Mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền app Expo cho back-office: tooling + quality gate, cơ chế đồng bộ với web, `.claude`, lớp domain copy từ web, auth/phiên gọi thẳng BE, design system, shell 4 tab theo quyền, tab Tài khoản và hạ tầng quét camera — đủ để P1–P5 chỉ còn port feature.

**Architecture:** Expo SDK 58 + Expo Router (route theo file, mỗi tab một Stack), NativeWind 4 với token lấy từ `src/lib/tokens.ts`, TanStack Query + axios gọi thẳng Spring `/api/v1`, zustand + `expo-sqlite/kv-store`. Các file thuần TS của web được copy qua `port-manifest.json` (verbatim/adapted) và được `sync:check` canh lệch.

**Tech Stack:** Expo SDK 58 (RN 0.88, React 19.3, Hermes), expo-router, NativeWind 4.2 + Tailwind 3.4, TanStack Query 5, axios, zod 4, react-hook-form, zustand 5, expo-secure-store, expo-sqlite/kv-store, expo-camera, expo-haptics, expo-audio, @gorhom/bottom-sheet 5, sonner-native, @shopify/flash-list 2, lucide-react-native, Jest (jest-expo) + React Native Testing Library, node:test cho script, pnpm 10.9.

**Spec:** `docs/superpowers/specs/2026-10-25-stockflow-mobile-backoffice-design.md`

## Global Constraints

- Package manager **pnpm 10.9.0** (`packageManager` field), `.npmrc` `node-linker=hoisted`; cấm npm/yarn/bun install.
- Chỉ dùng module có trong **Expo Go SDK 58**; phiên bản native lấy theo `pnpm exec expo install <pkg>` (không tự chọn bản).
- Định danh: tên "StockFlow Backoffice", slug `stockflow-backoffice`, bundle/package `vn.stockflow.backoffice`.
- `EXPO_PUBLIC_API_URL` gồm `/api/v1`; dev Android emulator `http://10.0.2.2:8080/api/v1`; cleartext chỉ ở profile `development`.
- Hợp đồng BE = `origin/develop` của `be-backoffice-stockflow-commerce`; nguồn web = `origin/develop` của `stockflow-ui` (repo ở `STOCKFLOW_WEB_REPO`, mặc định `../stockflow-ui`).
- TypeScript strict, alias `@/*` → `src/*`; cấm `any`, `@ts-ignore`, `!` non-null, `as unknown as` không lý do.
- Không hex trần ngoài `src/lib/tokens.ts`; không gradient; không hồng/magenta/fuchsia; không import `@/lib/mock-data`.
- Không hardcode chuỗi hiển thị: dùng `src/constants/**` (copy web) hoặc `src/constants/mobile/**`.
- Thứ tự import: external → `@/constants` → `@/lib`/`@/hooks` → `@/features` → `@/components` → relative → `import type` cuối; nhóm cách 1 dòng, sort alphabet.
- File feature ≤ 200 dòng, component ≤ 150 dòng, file route trong `app/` ≤ 60 dòng.
- Token (light/dark) đúng bảng spec §4.1; card/nút/ô nhập bo 8px, badge 4px; control 44–52px; vùng chạm ≥ 44pt; `maxFontSizeMultiplier` 1.3; motion 120–180ms.
- Token chỉ lưu ở **expo-secure-store**; dữ liệu khác ở kv-store; dữ liệu phiên tạm namespace `session:`, TTL 24h.
- Không gửi `X-Warehouse-Id`; luôn gửi `Accept-Language: vi`, `X-Correlation-Id`, `User-Agent: StockFlowMobile/<version> (<OS> <version>; <model>)`.
- Commit: conventional, subject viết thường đầu câu, scope trong danh sách spec §8.1, **không** có dòng `Co-Authored-By`/"Generated with".
- Trước khi báo xong một task: chạy lệnh verify của task và dán output thật.
- Chi tiết hoá so với spec (đã đồng bộ vào spec): `.npmrc` `node-linker=hoisted` ngay từ đầu (spec §3.6 cho phép); `Retry-After` đọc qua `getRetryAfterSeconds(error)` để `error.ts` giữ verbatim; token màu chỉ khai báo ở `src/lib/tokens.ts` và áp bằng `vars()` của NativeWind (không biến CSS trong `global.css`); thêm script `sync:add`; tab Tài khoản có mục "Kiểm tra quét mã".

## Review Focus

1. **Token hết hạn giữa lúc đang thao tác** (đang điền form / đang ở trạm): phải hiện sheet đăng nhập lại, màn bên dưới **không unmount**, dữ liệu đang nhập còn nguyên → test ở Task 10 (`expired session keeps screen mounted`) và Task 16 (`ReloginSheet overlays without unmounting children`).
2. **Đăng nhập lại bằng tài khoản khác qua sheet**: cache query, dữ liệu `session:*` của người cũ phải bị xoá, không lộ sang người mới → test ở Task 10 (`reauthenticate with another user clears caches`).
3. **Tải quyền lỗi (503 `AUTHORIZATION_UNAVAILABLE` / mạng)**: hub hiện lỗi "Không tải được quyền truy cập" + Thử lại, không hiện "không có quyền", không đăng xuất → test ở Task 17 (`hub shows permissions error with retry`).
4. **Camera bị từ chối / máy không có camera (emulator)**: `ScanField` vẫn gõ tay + Enter gửi được; màn scanner hiện hướng dẫn mở Cài đặt → test ở Task 19 (`denied permission shows settings prompt`, `typed code submits without camera`).
5. **Bấm Đăng nhập nhiều lần liên tiếp**: chỉ một request login → test ở Task 16 (`double tap sends one login request`).

---

## Cấu trúc file của P0

```
app/
  _layout.tsx                        # polyfills, fonts, splash, AppProviders, ConfigGate, AuthGate
  login.tsx
  (app)/_layout.tsx                  # Stack: (tabs) + scanner (fullScreenModal); ReloginSheet; banners
  (app)/scanner.tsx
  (app)/(tabs)/_layout.tsx           # Tabs, ẩn tab không còn mục
  (app)/(tabs)/{inbound,warehouse,fulfillment}/_layout.tsx · index.tsx (hub) · <route stubs>
  (app)/(tabs)/account/_layout.tsx · index.tsx
src/constants/**                     # verbatim từ web (Task 5)
src/constants/mobile/{index,routes,labels,numbers,storage-keys,api}.ts
src/lib/{config,tokens,utils}.ts
src/lib/platform/{polyfills,storage,session-store,user-agent,react-query-native,feedback-effects}.ts
src/lib/api/client.ts · retry-after.ts · infinite-query.ts   (+ verbatim: error, idempotency, page-schema, load-error, stale-refetch, query-factory, query-client)
src/lib/auth/{token-store,auth-api,auth-store,auth-session,use-auth-lifecycle,use-session-expiry}.ts
src/lib/auth/components/{Can.tsx (verbatim), PermissionBoundary.tsx}
src/lib/auth/{me-permissions,login-error,auth-schemas}.ts     (verbatim)
src/lib/domain/{index,status-map}.ts (verbatim) · lifecycle.ts · status-types.ts (adapted)
src/lib/status-map.ts (adapted) · src/lib/format/** · src/lib/validation/** (verbatim)
src/lib/references/warehouse-options.ts (adapted)
src/lib/store/use-app-store.ts
src/hooks/{use-debounced-value (verbatim), use-list-params, use-prefs, use-scan-feedback, use-theme-colors}.ts
src/providers/{app-providers,theme-provider}.tsx
src/components/ui/{Text,Button,Input,Textarea,Checkbox,Switch,RadioGroup,Badge,Skeleton,Separator,Sheet,index}.tsx
src/components/shared/{Toast,StatusDot,ToneDot,EmptyState,LoadErrorState,InfoRow,Section,RecordCard,ProgressBar,Segmented,RefetchBar,OfflineBanner,ComingSoon,SearchField,FilterChips,FilterSheet,SelectSheet,ConfirmSheet,DateField,QuantityStepper,ListScreen,index}.tsx
src/components/mobile/{ScreenHeader,HubMenu,BottomActionBar,SessionExpiryBanner,ReloginSheet,ConfigErrorScreen,LoginForm,RouteErrorBoundary,AccountScreen}.tsx · nav-config.ts · use-nav-visibility.ts
src/components/mobile/scan/{scan-bus,dedupe}.ts · {ScanField,CameraScanner,ScanFeedbackBanner}.tsx
src/test/{setup.ts,render.tsx,mocks/*}
scripts/{sync-lib,sync-check,sync-add,sync-pull,sync-ack,check-style-bans,generate-scan-tones}.mjs · scripts/__tests__/*.test.mjs
port-manifest.json · app.config.ts · eas.json · babel.config.js · metro.config.js · tailwind.config.js · global.css · nativewind-env.d.ts
jest.config.js · eslint.config.mjs · prettier.config.mjs · commitlint.config.mjs · lint-staged.config.mjs · tsconfig.json · .npmrc · .env.example · README.md
CLAUDE.md · AGENTS.md · .claude/** · .github/workflows/ci.yml
```

---

### Task 1: Scaffold Expo SDK 58 + Expo Router

**Files:**
- Create: `package.json`, `.npmrc`, `tsconfig.json`, `app.config.ts`, `eas.json`, `.env.example`, `babel.config.js`, `metro.config.js`, `app/_layout.tsx`, `app/index.tsx`, `assets/*` (từ template), `README.md`
- Modify: `.gitignore` (thêm `dist/` đã có; thêm `.env.local`)

**Interfaces:**
- Produces: script `pnpm start` (`expo start`), `pnpm typecheck` (`tsc --noEmit`), `pnpm export:check` (`expo export --platform android --platform ios --output-dir dist`); alias `@/*` → `src/*`; entry `expo-router/entry`.

- [ ] **Step 1: Sinh template vào thư mục tạm rồi chuyển vào repo**

```bash
cd D:/FPTU/Capstone/UIDesign
pnpm dlx create-expo-app@latest stockflow-mobile-tmp --template blank-typescript@sdk-58 --no-install
```
Chép mọi file của `stockflow-mobile-tmp` (trừ `.git`, `.gitignore`) vào `stockflow-mobile`, rồi xoá `stockflow-mobile-tmp`. Xoá `App.tsx`, `index.ts` của template.

- [ ] **Step 2: Cấu hình package**

`package.json`: `"name": "stockflow-mobile"`, `"main": "expo-router/entry"`, `"packageManager": "pnpm@10.9.0"`, scripts `start`, `android` (`expo start --android`), `ios` (`expo start --ios`), `typecheck`, `export:check`. `.npmrc`: `node-linker=hoisted`. Cài:

```bash
pnpm install
pnpm exec expo install expo-router expo-linking expo-constants expo-status-bar expo-splash-screen expo-font expo-system-ui react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated react-native-worklets
```

- [ ] **Step 3: `tsconfig.json`, `app.config.ts`, `eas.json`, `.env.example`**

`tsconfig.json` extends `expo/tsconfig.base`, `compilerOptions.strict: true`, `paths: { "@/*": ["./src/*"] }`, include `app`, `src`, `scripts`, `*.d.ts`.
`app.config.ts`: name "StockFlow Backoffice", slug `stockflow-backoffice`, scheme `stockflow`, `ios.bundleIdentifier` và `android.package` = `vn.stockflow.backoffice`, `userInterfaceStyle: "automatic"`, plugin `expo-router`, `version: "0.1.0"`.
`eas.json`: profile `development` (`developmentClient: true`, `distribution: internal`, env `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1`), `preview` (internal APK), `production`.
`.env.example`: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1` + comment "máy thật: http://<IP LAN>:8080/api/v1; BE chạy profile dev (profile local tắt security)".

- [ ] **Step 4: Route tối thiểu**

`app/_layout.tsx` render `<Stack screenOptions={{ headerShown: false }} />`; `app/index.tsx` render `<Text>StockFlow Backoffice</Text>` (tạm, Task 16 thay).

- [ ] **Step 5: Verify**

Run: `pnpm typecheck` → Expected: không lỗi.
Run: `pnpm export:check` → Expected: `Exported: dist` cho android và ios.
Run: `pnpm start` rồi mở bằng Expo Go trên Android emulator → Expected: thấy chữ "StockFlow Backoffice".

- [ ] **Step 6: README + commit**

`README.md`: yêu cầu (Node 22, pnpm 10.9, Expo Go SDK 58), `cp .env.example .env.local`, `pnpm start`, chạy BE profile `dev`.

```bash
git add -A && git commit -m "chore(config): scaffold expo sdk 58 app with expo-router"
```

---

### Task 2: Tooling & quality gates

**Files:**
- Create: `eslint.config.mjs`, `prettier.config.mjs`, `jest.config.js`, `src/test/setup.ts`, `src/test/mocks/{kv-store,secure-store,expo-camera,expo-haptics,expo-audio}.ts`, `src/test/smoke.test.tsx`, `scripts/check-style-bans.mjs`, `scripts/__tests__/check-style-bans.test.mjs`, `scripts/__tests__/eslint-rules.test.mjs`, `commitlint.config.mjs`, `lint-staged.config.mjs`, `.husky/pre-commit`, `.husky/commit-msg`
- Modify: `package.json` (scripts, devDependencies)

**Interfaces:**
- Produces scripts: `lint` (`eslint . --max-warnings 0 && node scripts/check-style-bans.mjs`), `format`, `test` (`jest`), `test:scripts` (`node --test scripts/__tests__ .claude/hooks/__tests__`), `doctor` (`expo-doctor`), `validate` (`typecheck && lint && test && test:scripts && doctor && export:check`; Task 3 chèn `sync:check` ngay sau `test:scripts`).
- Produces: Jest moduleNameMapper `^@/(.*)$` → `<rootDir>/src/$1`, `expo-sqlite/kv-store` → `src/test/mocks/kv-store.ts`; các mock khác đăng ký trong `setup.ts`.
- `check-style-bans.mjs` export `findStyleBans(files: {path: string, content: string}[]): {path: string, line: number, rule: "hex"|"gradient"|"pink"|"mock-data"}[]`; CLI quét `app/`, `src/` (bỏ `src/lib/tokens.ts`, `src/constants/**` verbatim) và exit 1 khi có vi phạm.

- [ ] **Step 1: Cài devDependencies**

```bash
pnpm add -D eslint eslint-config-expo typescript-eslint eslint-plugin-import prettier prettier-plugin-tailwindcss jest jest-expo @testing-library/react-native @types/jest axios-mock-adapter @commitlint/cli @commitlint/config-conventional husky lint-staged expo-doctor
```

- [ ] **Step 2: Viết test cho luật ESLint (fail trước)**

`scripts/__tests__/eslint-rules.test.mjs` dùng `new ESLint({ cwd })` + `lintText(code, { filePath })`:
- `feature importing another feature is an error`: code `import { x } from "@/features/order";` tại `src/features/receipt/a.ts` → có message ruleId `import/no-restricted-paths`.
- `shared component importing lib/api is an error`: `import { api } from "@/lib/api/client";` tại `src/components/shared/X.tsx` → lỗi.
- `route file importing lib is an error (except layouts)`: `import { kv } from "@/lib/platform/storage";` tại `app/(app)/(tabs)/inbound/index.tsx` → lỗi; cùng code tại `app/_layout.tsx` → không lỗi.
- `react-native Text in features is an error`: `import { Text } from "react-native";` tại `src/features/receipt/components/A.tsx` → ruleId `no-restricted-imports`.
- `wrong import order is an error`: `import { cn } from "@/lib/utils";\nimport { UI_LABELS } from "@/constants";` → ruleId `import/order`.
- `explicit any is an error`: `const a: any = 1;` → ruleId `@typescript-eslint/no-explicit-any`.

Run: `node --test scripts/__tests__/eslint-rules.test.mjs` → Expected: FAIL (chưa có config).

- [ ] **Step 3: `eslint.config.mjs`**

Flat config: `eslint-config-expo/flat` + `typescript-eslint` strict-type-unaware; rule `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/no-non-null-assertion: error`, `no-unused-vars` theo web (`argsIgnorePattern/varsIgnorePattern/caughtErrorsIgnorePattern: "^_"`, `ignoreRestSiblings`).
`import/order`: groups `["builtin","external","internal","parent","sibling","index","type"]`, pathGroups theo thứ tự `@/constants{,/**}` → `@/lib/**`, `@/hooks/**` → `@/features/**` → `@/components/**` (group `internal`), `newlines-between: "always"`, `alphabetize: { order: "asc" }`.
`import/no-restricted-paths` zones: mỗi thư mục con của `src/features` (đọc bằng `fs.readdirSync`, bỏ qua nếu chưa có) không được import từ `src/features` khác; `src/components/shared` không import `src/features`, `src/lib/api`; `app/**` (trừ file `_layout.tsx`) không import `src/lib`, `src/hooks`, `src/providers`.
`no-restricted-imports` cho `src/features/**` và `app/**`: `react-native` importNames `Text`, `Pressable`, `TouchableOpacity`, `Button`, `TextInput` (message: dùng `@/components/ui`); mọi file: pattern `@/lib/mock-data`.
Ignore: `dist`, `.expo`, `node_modules`, `android`, `ios`.

- [ ] **Step 4: Prettier, Jest, mock, smoke test**

`prettier.config.mjs` = web (`semi: true, singleQuote: false, trailingComma: "all", printWidth: 100, tabWidth: 2`, plugin `prettier-plugin-tailwindcss`).
`jest.config.js`: preset `jest-expo`, `setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"]`, `testMatch: ["<rootDir>/{app,src}/**/*.test.{ts,tsx}"]`, `transformIgnorePatterns` theo mẫu jest-expo cộng `nativewind|react-native-css-interop|@gorhom/.*|sonner-native|lucide-react-native|@shopify/flash-list|@expo-google-fonts/.*`, `coverageThreshold` cho `src/lib/domain/**`: statements 90, branches 90.
`src/test/mocks/kv-store.ts`: in-memory `Storage` có `getItemSync/setItemSync/removeItemSync/getAllKeysSync/clearSync` (default + named `Storage`). `secure-store.ts`: in-memory `getItemAsync/setItemAsync/deleteItemAsync`. `expo-camera`: `CameraView` render `View` testID `camera-view`, `useCameraPermissions` trả `[permission, request]` điều khiển được từ test qua `__setCameraPermission`. `expo-haptics`, `expo-audio`: `jest.fn()`.
`setup.ts`: `jest.mock` các module trên, `@react-native-community/netinfo` dùng `jest/netinfo-mock.js`, `react-native-reanimated` `setUpTests()`, `react-native-gesture-handler/jestSetup`, `@gorhom/bottom-sheet/mock`, `@shopify/flash-list/jestSetup`.
`src/test/smoke.test.tsx`: `renders text` render `<Text>ok</Text>` (react-native) → `getByText("ok")`.

- [ ] **Step 5: `check-style-bans.mjs` + test**

Test `scripts/__tests__/check-style-bans.test.mjs`: `flags bare hex` (`style={{color:"#FF0000"}}` → rule `hex`), `flags gradient` (`linear-gradient`), `flags pink` (`text-pink-500`), `flags mock-data import`, `allows clean file` (mảng rỗng).

- [ ] **Step 6: commitlint, lint-staged, husky**

`commitlint.config.mjs`: extends conventional; `scope-enum` level 1 với `receipt, inventory, inventory-item, transfer, move, order, picking, packing, shipping, auth, shell, shared, ui, scan, sync, config, deps, ci, rules`.
`lint-staged.config.mjs` = web (`*.{ts,tsx}`: `eslint --fix --max-warnings 0`, `prettier --write`; `*.{json,md,css,mjs}`: `prettier --write`).
`pnpm exec husky init`; `.husky/pre-commit`: `pnpm exec lint-staged`; `.husky/commit-msg`: `pnpm exec commitlint --edit "$1"`.

- [ ] **Step 7: Verify**

Run: `node --test scripts/__tests__` → Expected: tất cả pass.
Run: `pnpm lint && pnpm test && pnpm typecheck` → Expected: 0 lỗi, 0 warning, smoke test pass.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore(config): add eslint, prettier, jest and commit hooks"
```

---

### Task 3: `port-manifest.json` + script đồng bộ với web

**Files:**
- Create: `port-manifest.json`, `scripts/sync-lib.mjs`, `scripts/sync-check.mjs`, `scripts/sync-add.mjs`, `scripts/sync-pull.mjs`, `scripts/sync-ack.mjs`, `scripts/__tests__/sync.test.mjs`
- Modify: `package.json` (scripts `sync:check|sync:add|sync:pull|sync:ack`; thêm `sync:check` vào `validate`)

**Interfaces:**
- `port-manifest.json`: `{ "webRepoEnv": "STOCKFLOW_WEB_REPO", "webRepoDefault": "../stockflow-ui", "webRef": "origin/develop", "files": ManifestEntry[] }`, `ManifestEntry = { source: string; target: string; mode: "verbatim" | "adapted"; sourceBlob: string; note?: string }`.
- `sync-lib.mjs` exports:
  - `readManifest(root: string): Manifest`, `writeManifest(root: string, m: Manifest): void` (sort `files` theo `target`, JSON 2 dấu cách + newline)
  - `resolveWebRepo(root: string, env = process.env): string`
  - `webBlob(repo: string, ref: string, path: string): string` (`git -C repo rev-parse ref:path`)
  - `webContent(repo: string, ref: string, path: string): Buffer` (`git -C repo show ref:path`)
  - `checkEntries(root, manifest, repo): { target: string; problem: "content-differs" | "source-changed" | "source-missing" | "target-missing" }[]`
- CLI: `sync:add <source…> [--target <t>] [--mode verbatim|adapted] [--note "<text>"]` (mặc định target = source, mode = verbatim; ghi file từ web; từ chối nếu target đã có trong manifest); `sync:pull <target…>` (chỉ verbatim: ghi lại nội dung web, cập nhật blob); `sync:ack <target…>` (chỉ adapted: cập nhật blob); `sync:check` (in bảng vấn đề, exit 1 khi có). Không script nào chạy `git fetch`.

- [ ] **Step 1: Test (fail trước)** — `scripts/__tests__/sync.test.mjs` tạo repo git tạm (`mkdtemp`, `git init`, commit `src/a.ts` = `export const A = 1;\n`, tạo ref `origin/develop` bằng `git update-ref refs/remotes/origin/develop HEAD`) và repo mobile tạm có manifest rỗng:
- `add copies verbatim file and records blob`: sau `sync:add src/a.ts` → file mobile == nội dung web, `sourceBlob` == `git rev-parse origin/develop:src/a.ts`.
- `check passes when in sync` → mảng vấn đề rỗng.
- `check flags edited verbatim target`: sửa file mobile → `content-differs`.
- `check flags changed source for adapted entry`: entry adapted, commit đổi `src/a.ts` ở web và cập nhật ref → `source-changed`.
- `pull refreshes verbatim target`: sau thay đổi web, `sync:pull src/a.ts` → nội dung mới, blob mới, check rỗng.
- `ack records new blob for adapted`: → check rỗng.
- `pull refuses adapted entry` và `ack refuses verbatim entry` → exit ≠ 0.
- `check flags missing source` khi source bị xoá ở web.

Run: `node --test scripts/__tests__/sync.test.mjs` → Expected: FAIL.

- [ ] **Step 2: Implement `sync-lib.mjs` + 4 CLI** (dùng `execFileSync("git", [...])`, `encoding` buffer, so sánh byte; chuẩn hoá CRLF→LF trước khi so để Windows `core.autocrlf` không gây lệch giả).

- [ ] **Step 3: Verify** — Run: `node --test scripts/__tests__/sync.test.mjs` → PASS. Tạo `port-manifest.json` rỗng (`files: []`); Run: `pnpm sync:check` → Expected: "port-manifest: 0 file, không có lệch", exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(sync): add port manifest and web sync scripts"
```

---

### Task 4: `.claude`, `CLAUDE.md`, `AGENTS.md`

**Files:**
- Create: `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.claude/launch.json`, `.claude/rules/{feature-architecture,api-conventions,design-tokens,testing,mobile-backoffice,list-screen,shared-components,state-persistence,scanning,web-parity}.md`, `.claude/skills/{zod-br-schema,status-badge,mobile-screen,port-from-web,git-commits}/SKILL.md`, `.claude/commands/{validate,fix-lint,design-check,port,sync-web}.md`, `.claude/agents/{architecture-reviewer,design-reviewer}.md`, `.claude/hooks/{guard-package-manager,guard-protected-files,format-changed-file,remind-validate}.mjs`, `.claude/hooks/__tests__/guard-protected-files.test.mjs`

**Interfaces:**
- `guard-protected-files.mjs` export `protectedReason(filePath: string, root: string): string | null` — chặn `src/components/ui/**`, `.env*` (trừ `.env.example`), và mọi `target` có `mode: "verbatim"` trong `port-manifest.json`; CLI đọc stdin JSON của hook, exit 2 kèm lý do.
- `settings.json`: `includeCoAuthoredBy: false`; permissions allow `pnpm run:*`, `pnpm exec:*`, `pnpm dlx:*`, `pnpm sync:*`, `git status|diff|log|show|branch|stash:*`, `Read(D:/FPTU/Capstone/UIDesign/stockflow-ui/**)`, `Read(D:/FPTU/docs/**)`; deny `Read(./.env)`, `Read(./.env.*)`, `npm install`, `npm ci`, `yarn`; `additionalDirectories` hai repo trên; hooks: PreToolUse Edit/Write → guard-protected-files, Bash/PowerShell → guard-package-manager; PostToolUse Edit/Write → format-changed-file; Stop → remind-validate (kiểm `app/` + `src/`).
- `launch.json`: config `expo` chạy `pnpm exec expo start`, port 8081.

- [ ] **Step 1: Test hook (fail trước)** — `.claude/hooks/__tests__/guard-protected-files.test.mjs`: `blocks components/ui`, `blocks .env.local`, `allows .env.example`, `blocks verbatim manifest target` (manifest tạm có `src/constants/statuses.ts` verbatim), `allows adapted manifest target`, `allows ordinary source file`. Run: `node --test .claude/hooks/__tests__` → FAIL.

- [ ] **Step 2: Implement 4 hook** — `guard-package-manager`, `format-changed-file`, `remind-validate` copy từ web `.claude/hooks/*` rồi chỉnh: đường dẫn kiểm `app` + `src`; câu nhắc dùng `pnpm run validate`. `guard-protected-files` viết theo interface trên. Run test → PASS.

- [ ] **Step 3: Rules** — mỗi file có frontmatter `description` + `globs`, nội dung lấy từ spec (ghi §):
  - `feature-architecture.md` (spec §2.1–2.2; 7 file + `errors.ts`; ranh giới do ESLint bắt)
  - `api-conventions.md` (§3.1–3.3, §3.5; query key factory, invalidation, zod 2 lớp DTO/Input, parse tại biên, BR cite — giữ từ web)
  - `design-tokens.md` (§4.1, §4.3; token chỉ ở `src/lib/tokens.ts`; lệnh cấm)
  - `testing.md` (§8.2)
  - `mobile-backoffice.md` (§4.2 năm loại màn, BottomActionBar, action-gating qua `allowedActions` + `<Can>`, comment `// Backend phải re-check`)
  - `list-screen.md` (§4.2 hàng "Danh sách", §3.5)
  - `shared-components.md` (§4.4, tra trước khi viết mới)
  - `state-persistence.md` (§3.3 bảng ranh giới)
  - `scanning.md` (§3.4)
  - `web-parity.md` (§6–§7; "sửa web trước rồi `sync:pull`")
- [ ] **Step 4: Skills/commands/agents** — `zod-br-schema` copy nguyên từ web; `status-badge` copy rồi đổi bước "thêm trạng thái" thành "sửa `src/lib/status-map.ts` ở web → `pnpm sync:ack src/lib/status-map.ts` sau khi rà"; `git-commits` copy từ BE `.claude/skills/git-commits`; `mobile-screen` (checklist 5 loại màn theo §4.2/§4.4); `port-from-web` (quy trình §10: đọc docs + web feature → chọn file domain → `sync:add` verbatim/adapted → `api.ts`/`queries.ts`/`mutations.ts` adapted → màn theo `mobile-screen` → test bắt buộc §8.2 → `pnpm run validate`); commands `validate` (§8.3), `fix-lint` (copy web), `design-check` (hex/gradient/hồng, StatusDot, vùng chạm, BottomActionBar, primitives, chuỗi hardcode), `port <feature>`, `sync-web`; agents copy web rồi đổi checklist theo rule mobile + kiểm manifest.
- [ ] **Step 5: `CLAUDE.md` + `AGENTS.md`** — phạm vi (3 mảng, bỏ load plan/loại xe/in/mock), stack, bảng rules (file ↔ khi nào áp), luật không được vi phạm (Global Constraints ở trên), quy trình 1 module = 1 PR qua `/port`, bắt buộc `pnpm run validate` + dán output, không trailer công cụ. `AGENTS.md` trỏ cùng bộ rules.
- [ ] **Step 6: Verify** — Run: `pnpm test:scripts` → PASS; `pnpm exec prettier --check CLAUDE.md AGENTS.md ".claude/**/*.md"` → không lỗi.
- [ ] **Step 7: Commit** — `git commit -m "chore(rules): add mobile claude rules, skills, commands and hooks"`

---

### Task 5: Port lớp domain thuần từ web

**Files:**
- Create (qua `sync:add`, verbatim): mọi `src/constants/*.ts` không phải `*.test.ts`; `src/lib/format/{date,money,number,index}.ts`; `src/lib/validation/{primitives,sku}.ts`; `src/lib/domain/{index,status-map}.ts`; `src/lib/api/{error,idempotency,page-schema,load-error}.ts`; `src/lib/auth/{auth-schemas,login-error}.ts`; `src/hooks/use-debounced-value.ts`
- Create (qua `sync:add --mode adapted`): `src/lib/status-map.ts`; `src/lib/domain/lifecycle.ts`; `src/lib/domain/status-types.ts` (source `src/lib/mock-data.ts`); test: `src/lib/format/{money,number}.test.ts`, `src/lib/validation/{primitives,sku}.test.ts`, `src/lib/api/{error,idempotency}.test.ts`, `src/lib/domain/receipt-lifecycle.test.ts`
- Create (mobile): `src/lib/platform/polyfills.ts`, `src/lib/platform/polyfills.test.ts`, `src/lib/utils.ts`, `src/lib/utils.test.ts`, `src/constants/mobile/index.ts` (barrel rỗng ban đầu)

**Interfaces:**
- `status-types.ts` export đúng các type copy từ web `mock-data.ts`: `SemanticTone`, `StatusDomain`, `ProductStatus`, `SkuStatus`, `PoStatus`, `QcStatus`, `InvoiceStatus`, `PutawayStatus`, `MoveTaskStatus`, `RoleName`, `WarehouseId` (kèm `WAREHOUSE_IDS`).
- `lifecycle.ts`, `status-map.ts`: chỉ đổi `from "@/lib/mock-data"` → `from "@/lib/domain/status-types"`; ghi `note` trong manifest.
- `polyfills.ts`: `installCryptoPolyfill(target: { crypto?: Partial<Crypto> } = globalThis): void` — gắn `randomUUID` và `getRandomValues` từ `expo-crypto` khi thiếu, không ghi đè khi đã có.
- `utils.ts`: `cn(...inputs: ClassValue[]): string` (`clsx` + `tailwind-merge` v2).

- [ ] **Step 1: Copy verbatim**

```bash
WEB=../stockflow-ui
for f in $(git -C $WEB ls-tree --name-only origin/develop src/constants/ | grep -v '\.test\.ts$'); do pnpm sync:add "$f"; done
pnpm sync:add src/lib/format/date.ts src/lib/format/money.ts src/lib/format/number.ts src/lib/format/index.ts src/lib/validation/primitives.ts src/lib/validation/sku.ts src/lib/domain/index.ts src/lib/domain/status-map.ts src/lib/api/error.ts src/lib/api/idempotency.ts src/lib/api/page-schema.ts src/lib/api/load-error.ts src/lib/auth/auth-schemas.ts src/lib/auth/login-error.ts src/hooks/use-debounced-value.ts
pnpm add axios zod date-fns ts-pattern clsx tailwind-merge@^2 && pnpm exec expo install expo-crypto
```

- [ ] **Step 2: Copy adapted + sửa import**

```bash
pnpm sync:add src/lib/status-map.ts --mode adapted --note "types từ lib/domain/status-types"
pnpm sync:add src/lib/domain/lifecycle.ts --mode adapted --note "types từ lib/domain/status-types"
pnpm sync:add src/lib/mock-data.ts --target src/lib/domain/status-types.ts --mode adapted --note "chỉ giữ type trạng thái/vai trò/kho"
```
`status-types.ts`: xoá toàn bộ, chỉ giữ các type liệt kê ở Interfaces (chép nguyên khối định nghĩa). Đổi import trong 2 file kia.

- [ ] **Step 3: Port test (adapted)** — `sync:add <web test> --mode adapted --note "vitest→jest"` cho 7 file test; đổi `import { describe, expect, it, vi } from "vitest"` → bỏ (Jest globals), `vi.` → `jest.`; giữ nguyên mọi case.

- [ ] **Step 4: Test mobile (fail trước)** — `polyfills.test.ts`: `installs randomUUID when missing` (target `{}` → `target.crypto.randomUUID()` khớp `/^[0-9a-f-]{36}$/`), `keeps existing randomUUID` (hàm sẵn có không bị thay). `utils.test.ts`: `cn merges conflicting tailwind classes` (`cn("px-2", "px-4")` → `"px-4"`), `cn drops falsy` (`cn("a", false && "b")` → `"a"`). Run: `pnpm test src/lib/platform src/lib/utils` → FAIL; implement → PASS.

- [ ] **Step 5: Verify** — Run: `pnpm test src/lib src/hooks` → Expected: toàn bộ test port từ web PASS. Run: `pnpm sync:check` → 0 lệch. Run: `pnpm typecheck && pnpm lint` → 0 lỗi.

- [ ] **Step 6: Commit** — `git commit -m "feat(sync): port web constants, format, validation and domain layer"`

---

### Task 6: Kiểm chứng `Intl` trên Hermes (spike, thủ công)

**Files:**
- Create tạm: `app/index.tsx` hiển thị bảng probe (khôi phục sau bước 3)
- Create: `docs/hermes-intl-probe.md` (ghi kết quả)

**Interfaces:**
- Consumes: `formatDate`, `formatDateTime`, `formatTime`, `toLocalIsoDate`, `formatMoney`, `formatNumber`, `formatFixed`, `formatPercent`, `formatCompactNumber` (Task 5).

- [ ] **Step 1:** `app/index.tsx` render từng dòng `tên | kết quả runtime | kỳ vọng | OK/LỆCH` với input `iso = "2026-03-14T17:30:05Z"`, kỳ vọng (Node ICU 76, cùng hàm web): `formatDate` "15 thg 3, 2026"; `formatDateTime` "00:30 15 thg 3, 2026"; `formatTime` "00:30:05"; `toLocalIsoDate` "2026-03-15"; `formatMoney(1234567,"VND")` "1.234.567 ₫"; `formatNumber(1234567.5)` "1.234.567,5"; `formatFixed(33.1966,2)` "33,20"; `formatPercent(0.856)` "85,6%"; `formatCompactNumber(1500)` "1,5 N"; `formatMoney(1234.5,"USD")` "$1,234.50".
- [ ] **Step 2:** Chạy trong Expo Go trên Android emulator **và** iPhone; chụp kết quả vào `docs/hermes-intl-probe.md` (bảng nền tảng × hàm).
- [ ] **Step 3: Quyết định** — tất cả OK → giữ verbatim. Có LỆCH ở `lib/format/date.ts` → chuyển file đó sang `adapted` (`sync:add` lại với `--mode adapted` sau khi xoá entry), cài `@date-fns/tz`, tái hiện đúng chuỗi kỳ vọng bằng `format(new TZDate(iso, "Asia/Ho_Chi_Minh"), pattern, { locale: vi })`, thêm test Jest khẳng định đúng các chuỗi kỳ vọng ở Step 1. Lệch ở money/number → xử lý tương tự cho file đó. Khôi phục `app/index.tsx` như cuối Task 1.
- [ ] **Step 4: Verify + commit** — `pnpm test src/lib/format && pnpm sync:check` → PASS; `git commit -m "docs(config): record hermes intl probe results"` (+ thay đổi format nếu có, scope `config`).

---

### Task 7: Lớp platform (config, lưu trữ, token, user-agent, React Query native)

**Files:**
- Create: `src/lib/config.ts`, `src/lib/platform/{storage,session-store,user-agent,react-query-native}.ts`, `src/lib/auth/token-store.ts`, `src/constants/mobile/{storage-keys,numbers,api}.ts` + test cạnh mỗi file
- Modify: `src/constants/mobile/index.ts`

**Interfaces:**
- `constants/mobile/storage-keys.ts`: `MOBILE_STORAGE_KEYS = { appStore: "stockflow-app", secureSession: "stockflow.session", prefs: (screen: string) => \`stockflow:${screen}:config\` } as const`.
- `constants/mobile/numbers.ts`: `SESSION_LIMITS = { warningBeforeMs: 15 * 60_000, tickMs: 30_000, sessionDataTtlMs: 24 * 60 * 60_000 }`, `SCAN_MOBILE_LIMITS = { dedupeWindowMs: 1500, positiveFeedbackMs: 1500 }`, `UI_LIMITS = { maxFontSizeMultiplier: 1.3, searchDebounceMs: 300 }`.
- `constants/mobile/api.ts`: `AUTH_ENDPOINTS = { login: "/identity/auth/login", me: "/identity/me", logout: "/identity/auth/logout" } as const`, `USER_AGENT_PRODUCT = "StockFlowMobile"`.
- `config.ts`: `readAppConfig(env: Record<string, string | undefined>): { ok: true; apiUrl: string } | { ok: false; reason: "missing" | "invalid" }` (zod `z.url()`, bỏ `/` cuối); `APP_CONFIG = readAppConfig(process.env)`.
- `storage.ts`: `kv: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void; keys(): string[] }` trên `Storage` của `expo-sqlite/kv-store`; `kvStateStorage: StateStorage` (zustand) dùng `kv`.
- `session-store.ts`: `SESSION_PREFIX = "session:"`; `sessionSet<T>(key: string, value: T, now = Date.now()): void`; `sessionGet<T>(key: string, now = Date.now()): T | null` (hết TTL hoặc JSON hỏng → xoá, trả null); `sessionRemove(key: string): void`; `sessionClearAll(): void`.
- `token-store.ts`: `StoredSession = { accessToken: string; expiresAt: number }`; `getAccessToken(): string | null`; `setAccessToken(token: string | null): void` (bộ nhớ); `persistSession(s: StoredSession): Promise<void>`; `loadSession(now = Date.now()): Promise<StoredSession | null>` (thiếu/hết hạn/hỏng → null; hỏng thì xoá); `clearSession(): Promise<void>`.
- `user-agent.ts`: `buildUserAgent(i: { appVersion: string; osName: string; osVersion: string; modelName: string }): string` → `"StockFlowMobile/0.1.0 (Android 14; Pixel 7)"`; `deviceUserAgent(): string` (expo-constants `expoConfig.version`, expo-device).
- `react-query-native.ts`: `wireReactQueryToNative(): () => void` — `focusManager.setEventListener` theo AppState `active`; `onlineManager.setEventListener` theo NetInfo `isConnected`.

- [ ] **Step 1: Test (fail trước)**
  - `config.test.ts`: `missing url` → `{ok:false, reason:"missing"}`; `invalid url` (`"abc"`) → `invalid`; `strips trailing slash` (`"http://10.0.2.2:8080/api/v1/"` → `apiUrl` không có `/` cuối).
  - `session-store.test.ts`: `returns stored value before ttl`; `returns null after 24h` (`now + 24*60*60_000 + 1`); `clearAll removes only session: keys` (key `stockflow-app` còn nguyên).
  - `token-store.test.ts`: `persist then load returns session`; `expired session loads as null`; `corrupt json is deleted`; `clear removes secure item and memory token`.
  - `user-agent.test.ts`: `formats product, version, os and model` → `"StockFlowMobile/0.1.0 (Android 14; Pixel 7)"`.
  - `react-query-native.test.ts`: `app state active marks focused` (mock AppState listener → `focusManager.isFocused()` true/false), `netinfo offline marks offline`.
- [ ] **Step 2:** `pnpm exec expo install expo-secure-store expo-sqlite expo-device @react-native-community/netinfo && pnpm add @tanstack/react-query zustand`; implement; Run: `pnpm test src/lib/config src/lib/platform src/lib/auth/token-store` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(config): add platform storage, secure token store and app config"`

---

### Task 8: HTTP client + `auth-api`

**Files:**
- Create: `src/lib/api/client.ts`, `src/lib/api/client.test.ts`, `src/lib/api/retry-after.ts`, `src/lib/api/retry-after.test.ts`, `src/lib/auth/auth-api.ts`, `src/lib/auth/auth-api.test.ts`

**Interfaces:**
- Consumes: `APP_CONFIG`, `getAccessToken`, `deviceUserAgent`, `ApiError`, `BROWSER_API_TIMEOUT_MS` (`@/constants/auth`), `AUTH_ENDPOINTS`.
- `client.ts`: `api: AxiosInstance` (cùng tên export với web để `me-permissions.ts` verbatim dùng được); `setUnauthorizedHandler(handler: ((error: ApiError) => void) | null): void`.
  - Request: `baseURL = APP_CONFIG.apiUrl` (khi `ok`), `timeout = BROWSER_API_TIMEOUT_MS`, header `Content-Type: application/json`, `Accept-Language: vi`, `X-Correlation-Id: crypto.randomUUID()`, `User-Agent: deviceUserAgent()`, `Authorization: Bearer <token>` khi có token. Không gửi `X-Warehouse-Id`.
  - Response: `{ success: true, data }` → `res.data = data` (giống web). Lỗi → `ApiError.from(err)` + `rememberRetryAfter(apiError, err.response?.headers["retry-after"])`; status 401 mà URL không phải `AUTH_ENDPOINTS.login|me|logout` → gọi handler.
- `retry-after.ts`: `rememberRetryAfter(error: ApiError, header: string | undefined): void`; `getRetryAfterSeconds(error: unknown): number | null` (số giây nguyên, hoặc HTTP-date → giây làm tròn lên, âm → 0).
- `auth-api.ts`: `authTokenSchema = z.object({ accessToken: z.string().min(1), tokenType: z.literal("Bearer"), expiresInSeconds: z.number().int().positive() })`; `type AuthToken`; `loginRequest(input: LoginRequest): Promise<AuthToken>`; `fetchMe(signal?: AbortSignal): Promise<AuthUser>` (`authUserSchema.parse`, schema verbatim web); `logoutRequest(token?: string): Promise<void>` (khi có `token` thì gửi header Bearer đó thay token bộ nhớ).

- [ ] **Step 1: Test (fail trước)** — dùng `axios-mock-adapter` trên `api`:
  - `adds bearer, language, correlation id and user agent` (headers khớp, `X-Correlation-Id` dạng UUID).
  - `omits authorization when no token`; `never sends X-Warehouse-Id`.
  - `unwraps success envelope` (`{success:true,data:{a:1}}` → `res.data` = `{a:1}`).
  - `normalizes error envelope` (400 `{success:false,errorCode:"VALIDATION_FAILED",message:"x",fieldErrors:[{field:"sku",message:"m",code:"C"}],correlationId:"cid"}` → `ApiError` code `VALIDATION_FAILED`, `fieldErrors.sku` = `"m"`, `traceId` = `"cid"`).
  - `network error becomes NETWORK_ERROR status 0`.
  - `401 on business endpoint calls unauthorized handler`; `401 on login/me/logout does not`.
  - `429 exposes retry-after seconds` (header `"30"` → `getRetryAfterSeconds(e)` = 30).
  - `auth-api.test.ts`: `login posts credentials and parses token`; `login rejects malformed token response` (ZodError); `fetchMe parses user and normalizes missing fullName to null`; `logout with explicit token uses that bearer`.
- [ ] **Step 2:** Implement; Run: `pnpm test src/lib/api src/lib/auth/auth-api` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(auth): add direct backend http client and auth api"`

---

### Task 9: Trạng thái auth, quyền, query factory, Toast

**Files:**
- Create: `src/lib/auth/auth-store.ts` + test, `src/components/shared/Toast.tsx` + test
- Create (verbatim qua `sync:add`): `src/lib/auth/me-permissions.ts`, `src/lib/auth/components/Can.tsx`, `src/lib/api/query-client.ts`, `src/lib/api/query-factory.ts`, `src/lib/api/stale-refetch.ts`
- Create (adapted test): `src/lib/api/query-factory.test.tsx`, `src/lib/api/stale-refetch.test.tsx`, `src/lib/auth/me-permissions.test.tsx` (từ web `me-permissions.test.tsx`)
- Create: `src/test/render.tsx`

**Interfaces:**
- `auth-store.ts` (mobile, giữ tên/ngữ nghĩa web cho các file verbatim):
  - `type AuthStatus = "unknown" | "authenticated" | "unauthenticated"`; re-export `type AuthUser`.
  - state: `user: AuthUser | null`, `status`, `bootstrapError: string | null`, `authorizationVersion: number`, `isAuthenticated: boolean`, `sessionExpiresAt: number | null`, `sessionExpired: boolean`.
  - actions: `login(user: AuthUser, expiresAt: number): void` (tăng `revision` + `authorizationVersion`, `sessionExpired=false`), `logout(): void`, `reconcileSession(user: AuthUser): void` (cùng `userId` → chỉ cập nhật profile; khác → `login(user, sessionExpiresAt)`), `beginBootstrap(): void`, `failBootstrap(message: string): void`, `markSessionExpired(): void` (chỉ khi `authenticated`).
  - `getAuthRevision(): number`. Không có impersonation, không có BroadcastChannel.
- `Toast.tsx`: `toast = { success, error, warning, info }(title: string, description?: string): void` qua `sonner-native`; `ToastProvider(): JSX.Element` render `<Toaster position="top-center" />`. (Đường dẫn và export trùng web → `query-factory.ts` verbatim gọi được `require("@/components/shared/Toast")`.)
- `src/test/render.tsx`: `renderWithProviders(ui: ReactElement, opts?: { permissions?: readonly string[]; user?: Partial<AuthUser> | null }): RenderResult & { queryClient: QueryClient }` — QueryClient không retry; khi có `user` thì `useAuthStore.login(user, Date.now()+3_600_000)` và seed `meKeys.sessionPermissions(userId, version)` = `{ roles: [], permissions, dataScope: "WAREHOUSE" }`.

- [ ] **Step 1:** `pnpm add sonner-native` (+ `pnpm exec expo install react-native-svg` nếu chưa có); `pnpm sync:add` 5 file verbatim + 3 test adapted (`@testing-library/react` → `@testing-library/react-native`, `vi` → `jest`).
- [ ] **Step 2: Test mobile (fail trước)** — `auth-store.test.ts`: `login sets authenticated and bumps authorizationVersion`; `reconcile same user keeps version`; `reconcile different user logs in again`; `markSessionExpired only when authenticated`; `logout clears user and expiry`. `Toast.test.tsx`: `toast.success forwards title to sonner-native` (mock `sonner-native`).
- [ ] **Step 3:** Implement; Run: `pnpm test src/lib/auth src/lib/api src/components/shared/Toast` → PASS (gồm test web đã port: `Can`/permission hiển thị theo quyền, factory gọi callback màn hình sau invalidate, stale refetch). Run: `pnpm sync:check` → 0 lệch.
- [ ] **Step 4: Commit** — `git commit -m "feat(auth): add auth store, permission queries and query factory"`

---

### Task 10: Vòng đời phiên (đăng nhập, bootstrap, revalidate, hết phiên, đăng xuất)

**Files:**
- Create: `src/lib/auth/auth-session.ts` + test, `src/lib/auth/use-auth-lifecycle.ts` + test, `src/lib/auth/use-session-expiry.ts` + test

**Interfaces:**
- Consumes: `loginRequest`, `fetchMe`, `logoutRequest`, token-store, `sessionClearAll`, `useAuthStore`, `setUnauthorizedHandler`, `AUTH_ERROR_CODES.sessionBootstrapFailed`, `AUTH_UI.bootstrapError` (`@/constants/auth`), `SESSION_LIMITS`.
- `auth-session.ts`:
  - `signIn(input: LoginRequest, now = Date.now()): Promise<void>` — login → `setAccessToken` → `fetchMe`; lỗi `fetchMe` → `logoutRequest(token)` (nuốt lỗi) → `setAccessToken(null)` → ném `new ApiError(0, AUTH_ERROR_CODES.sessionBootstrapFailed, AUTH_UI.bootstrapError)`; thành công → `persistSession({ accessToken, expiresAt: now + expiresInSeconds*1000 })` → `login(user, expiresAt)`. Có khoá chống chạy song song: lần gọi thứ hai khi lần đầu chưa xong trả về cùng Promise.
  - `bootstrapSession(): Promise<void>` — `loadSession()` null → `logout()`; có → `setAccessToken` → `beginBootstrap` → `fetchMe`: thành công `login(user, expiresAt)`; 401 → `clearSession` + `logout`; lỗi khác → `failBootstrap(AUTH_UI.bootstrapError)`. Dedupe + generation/revision guard như web `auth-session.ts`.
  - `revalidateSession(): Promise<void>` — chỉ khi `authenticated`; thành công `reconcileSession`; 401 → `markSessionExpired()`; lỗi khác giữ nguyên UI.
  - `handleUnauthorized(): void` — `authenticated` → `markSessionExpired()`; khác → không làm gì.
  - `reauthenticate(input: LoginRequest, queryClient: QueryClient, now = Date.now()): Promise<"same-user" | "switched-user">` — như `signIn`; cùng `userId` với user cũ → `invalidateQueries()` và trả `"same-user"`; khác → `queryClient.clear()` + `sessionClearAll()` trước khi `login`, trả `"switched-user"`.
  - `signOut(queryClient: QueryClient): Promise<void>` — `logoutRequest()` (nuốt lỗi) → `clearSession` → `setAccessToken(null)` → `sessionClearAll()` → `queryClient.clear()` → `logout()`.
- `use-auth-lifecycle.ts`: `useAuthLifecycle(): { status; bootstrapError; retry(): void }` — mount: `setUnauthorizedHandler(handleUnauthorized)`, `status==="unknown"` → `bootstrapSession()`; AppState `active` → `revalidateSession()` khi authenticated.
- `use-session-expiry.ts`: `useSessionExpiry(nowFn = Date.now): { remainingMs: number | null; warning: boolean; expired: boolean }` — tick `SESSION_LIMITS.tickMs`; `warning` khi `0 < remaining ≤ warningBeforeMs`; khi `expired` lần đầu → `markSessionExpired()`.

- [ ] **Step 1: Test (fail trước)** — mock `auth-api` và token-store:
  - `signIn success persists session and authenticates` (expiresAt = now + 28800*1000).
  - `signIn with failing me logs token out and throws SESSION_BOOTSTRAP_FAILED` (`logoutRequest` gọi với token mới; store vẫn `unauthenticated`; không persist).
  - `concurrent signIn calls hit login once`.
  - `bootstrap without stored session goes unauthenticated`.
  - `bootstrap 401 clears session`; `bootstrap network error keeps unknown with bootstrapError` (không xoá session).
  - `revalidate 401 marks session expired without logging out` (user còn, `sessionExpired` true).
  - **`expired session keeps screen mounted`**: render `<Probe/>` (component có `TextInput` giá trị "draft") trong `renderWithProviders`, gọi `handleUnauthorized()` → probe vẫn còn với giá trị "draft".
  - **`reauthenticate with another user clears caches`**: seed query `["orders","list",{}]` + `sessionSet("x",1)` → reauth với userId khác → query cache rỗng, `sessionGet("x")` null, trả `"switched-user"`.
  - `reauthenticate same user keeps cache and returns same-user`.
  - `signOut clears secure store, session data and cache even when logout request fails`.
  - `use-session-expiry`: `warning at 15 minutes left`, `expired marks session expired`.
- [ ] **Step 2:** Implement; Run: `pnpm test src/lib/auth` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(auth): add session bootstrap, revalidation, expiry and sign out"`

---

### Task 11: Theme, token, font, app store

**Files:**
- Create: `src/lib/tokens.ts` + test, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `src/providers/theme-provider.tsx` + test, `src/hooks/use-theme-colors.ts`, `src/lib/store/use-app-store.ts` + test
- Modify: `babel.config.js` (`["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"`), `metro.config.js` (`withNativeWind(config, { input: "./global.css" })`)

**Interfaces:**
- `tokens.ts`: `type ColorToken = "bg-base" | "bg-surface" | "bg-subtle" | "bg-muted" | "border-default" | "border-strong" | "ink-primary" | "ink-secondary" | "ink-tertiary" | "ink-inverse" | "brand" | "accent" | "positive" | "info" | "warning" | "danger" | "neutral" | "muted" | "special" | "dot-positive" | "dot-info" | "dot-warning" | "dot-danger" | "dot-special"`; `COLOR_TOKENS: Record<"light" | "dark", Record<ColorToken, string>>` (hex, đúng spec §4.1: light `bg-base #F6F6F6 … ink-primary #1A1B18 … brand #1A1B18, accent #1E88E5`; dark `#0E0F11 / #17181B / #1F2124 / #2A2C30 / #2E3034 / #3D4045 / #F4F4F1 / #A8AAA3 / #76786F / #1A1B18`, `brand #F4F4F1`, `accent #4EA6F0`; semantic + dot giống nhau 2 theme); `hexToRgbChannels(hex: string): string` (`"#1A1B18"` → `"26 27 24"`); `themeVars: Record<"light" | "dark", ViewStyle>` (NativeWind `vars({ "--<token>": channels })`); `RADIUS = { sm: 4, md: 8, full: 9999 }`; `CONTROL_HEIGHT = { sm: 40, md: 44, lg: 52 }`; `SHADOW_SM: ViewStyle` (iOS shadowColor ink-primary, opacity 0.08, radius 3, offset y 1; `elevation: 1`); `FONT_FAMILY = { sans: "Inter_400Regular", sansMedium: "Inter_500Medium", sansSemibold: "Inter_600SemiBold", sansBold: "Inter_700Bold", display: "InterTight_600SemiBold", displayBold: "InterTight_700Bold", mono: "JetBrainsMono_400Regular", monoSemibold: "JetBrainsMono_600SemiBold" }`.
- `tailwind.config.js`: `presets: [require("nativewind/preset")]`, `content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"]`, mỗi `ColorToken` → `"rgb(var(--<token>) / <alpha-value>)"`, `borderRadius` theo `RADIUS`, `fontFamily` theo `FONT_FAMILY`. `global.css` chỉ có 3 dòng `@tailwind base; @tailwind components; @tailwind utilities;`.
- `use-app-store.ts`: `useAppStore` (zustand persist, tên `MOBILE_STORAGE_KEYS.appStore`, storage `kvStateStorage`) state `theme: "system" | "light" | "dark"`, `defaultWarehouseId: string | null`, `muted: boolean`, `hapticsEnabled: boolean` + setters `setTheme`, `setDefaultWarehouseId`, `setMuted`, `setHapticsEnabled`; mặc định `system`, `null`, `false`, `true`.
- `theme-provider.tsx`: `ThemeProvider({ children })` — effect `Appearance.setColorScheme(theme === "system" ? "unspecified" : theme)` (để picker/alert native theo cùng giao diện); `scheme = useColorScheme() ?? "light"`; render `<View style={[{ flex: 1 }, themeVars[scheme]]}>` + `StatusBar` theo scheme. Không dùng biến thể `dark:` của Tailwind (màu đã đổi qua biến). `useResolvedScheme(): "light" | "dark"`.
- `use-theme-colors.ts`: `useThemeColors(): Record<ColorToken, string>` (hex theo scheme hiện tại — cho icon, StatusBar).

- [ ] **Step 1: Test (fail trước)** — `tokens.test.ts`: `light tokens match spec` (kiểm 7 giá trị đại diện: `bg-base #F6F6F6`, `bg-surface #FFFFFF`, `ink-primary #1A1B18`, `brand #1A1B18`, `accent #1E88E5`, `danger #D23B3B`, `dot-warning #F76B15`); `dark tokens match spec` (`bg-base #0E0F11`, `ink-primary #F4F4F1`, `accent #4EA6F0`); `semantic and dot tokens equal across themes`; `hexToRgbChannels converts` (`#1A1B18` → `"26 27 24"`); `tailwind config exposes every token` (require `tailwind.config.js`, mọi `ColorToken` có trong `theme.extend.colors`). `use-app-store.test.ts`: `defaults`, `persists theme to kv store`. `theme-provider.test.tsx`: `uses dark vars when theme is dark` (props style chứa biến `--bg-base` = `"14 15 17"`).
- [ ] **Step 2:** `pnpm add nativewind@^4.2.7 tailwindcss@^3.4 && pnpm exec expo install @expo-google-fonts/inter @expo-google-fonts/inter-tight @expo-google-fonts/jetbrains-mono`; implement.
- [ ] **Step 3: Verify** — Run: `pnpm test src/lib/tokens src/lib/store src/providers` → PASS; `pnpm export:check` → OK (NativeWind biên dịch được).
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): add design tokens, nativewind theme and app store"`

---

### Task 12: UI primitives (`src/components/ui`)

**Files:**
- Create: `src/components/ui/{Text,Button,Input,Textarea,Checkbox,Switch,RadioGroup,Badge,Skeleton,Separator,Sheet,index}.tsx` + `src/components/ui/__tests__/primitives.test.tsx`

**Interfaces:**
- `Text`: props `TextProps & { variant?: "body" | "meta" | "small" | "title" | "display"; weight?: "regular" | "medium" | "semibold" | "bold"; tone?: "primary" | "secondary" | "tertiary" | "inverse" | "danger" | "positive" | "warning" | "info"; mono?: boolean; numeric?: boolean; className?: string }` — cỡ 15/13/12/17/22; `numeric` → `fontVariant: ["tabular-nums"]`; `maxFontSizeMultiplier` mặc định `UI_LIMITS.maxFontSizeMultiplier`.
- `Button`: `{ label: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; icon?: LucideIcon; loading?: boolean; disabled?: boolean; accessibilityLabel?: string; className?: string }` — cao `CONTROL_HEIGHT`, bo 8; `loading` → spinner + `accessibilityState.busy` + không gọi `onPress`.
- `Input`: `TextInputProps & { label?: string; error?: string; hint?: string; className?: string }` — cao 48, bo 8, `accessibilityLabel = label`; lỗi hiện dưới ô với `accessibilityRole="alert"`. `Textarea` = `Input` multiline, min-height 96.
- `Checkbox { checked: boolean; onCheckedChange(v: boolean): void; label: string; disabled? }` (role `checkbox`); `Switch { value; onValueChange; label; description? }` (role `switch`); `RadioGroup<T extends string> { options: { value: T; label: string; description?: string }[]; value: T; onValueChange(v: T): void; accessibilityLabel: string }` (role `radiogroup`/`radio`).
- `Badge { label: string; tone?: SemanticTone }` (bo 4); `Skeleton { className? }`; `Separator { className? }`.
- `Sheet { open: boolean; onOpenChange(open: boolean): void; title: string; children: ReactNode; snapPoints?: (string | number)[] }` — `BottomSheetModal` + backdrop; đóng → `onOpenChange(false)`.

- [ ] **Step 1: Test (fail trước)** — `button press calls handler`; `loading button is busy and ignores press`; `disabled button ignores press`; `input shows error as alert` ; `input label is accessibility label`; `checkbox toggles`; `switch toggles`; `radio group selects value`; `sheet renders title when open and not when closed`; `text numeric sets tabular-nums`.
- [ ] **Step 2:** `pnpm exec expo install @gorhom/bottom-sheet && pnpm add lucide-react-native`; implement; Run: `pnpm test src/components/ui` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(ui): add mobile ui primitives"`

---

### Task 13: Shared components — hiển thị

**Files:**
- Create: `src/components/shared/{StatusDot,ToneDot,EmptyState,LoadErrorState,InfoRow,Section,RecordCard,ProgressBar,Segmented,RefetchBar,OfflineBanner,ComingSoon}.tsx`, `src/components/shared/index.ts`, `src/components/shared/__tests__/display.test.tsx`, `src/constants/mobile/labels.ts`

**Interfaces:**
- `constants/mobile/labels.ts`: `MOBILE_LABELS` gồm tối thiểu: `offline: "Mất kết nối — thay đổi chưa được lưu"`, `traceId: "Mã tra cứu"`, `retry: "Thử lại"`, `comingSoonTag: "Đang phát triển"`, `comingSoonTitle: "Đang phát triển"`, `comingSoonDescription: "Tính năng này đang được phát triển trên hệ thống."`, `portPendingDescription: "Màn hình đang được chuyển sang ứng dụng di động."`, `clearFilters: "Bỏ bộ lọc"`, `noResultsTitle: "Không tìm thấy kết quả"`, `refetching: "Đang tải lại"`, `notFoundTitle: "Không tìm thấy dữ liệu"`, `loadPlanOnWeb: "Lập kế hoạch xe thực hiện trên web"`, `estimateOnWeb: "Ước tính xe thực hiện trên web"`, `printOnWeb: "In trên web"` (các nhóm khác bổ sung ở task sau).
- `StatusDot { domain: StatusDomain; status: string; size?: "sm" | "md" }` — chấm màu `dot-*` theo `toneOf(status)` (neutral/muted dùng màu status gốc như web), nhãn `statusLabelVi(status, domain) ?? status`; nhấn giữ → Tooltip/inline hiện `"{nhãn Việt} — {status}"` (N7); `accessibilityLabel` = chuỗi đó.
- `ToneDot { tone: SemanticTone; label: string }`.
- `EmptyStateNoData { title: string; description?: string; action?: { label: string; onPress(): void } }`; `EmptyStateNoResults { onClearFilters(): void; title?: string }` (mặc định `MOBILE_LABELS.noResultsTitle` + nút `clearFilters`) — hai component riêng.
- `LoadErrorState { kind: LoadErrorKind; title?: string; description?: string; traceId?: string; onRetry?: () => void }` — copy mặc định từ `UI_LABELS.loadError` (`network*`, `invalidData*`, `server*`, `forbiddenTitle`, `noReadTitle`, `permissions*`); `not-found` mặc định `MOBILE_LABELS.notFoundTitle` ("Không tìm thấy dữ liệu"), feature truyền `title` riêng khi có; "Thử lại" chỉ cho `network | server | invalid-data | permissions`; hiện `"{MOBILE_LABELS.traceId}: {traceId}"`.
- `InfoRow { label: string; value: ReactNode; mono?: boolean }`; `Section { title: string; action?: ReactNode; children }` (card bo 8 + `SHADOW_SM`); `RecordCard { title: string; titleMono?: boolean; status?: ReactNode; subtitle?: ReactNode; meta?: ReactNode; metaRight?: ReactNode; onPress?(): void; accessibilityLabel?: string }`; `ProgressBar { value: number; max: number; accessibilityLabel: string }`; `Segmented<T extends string> { options: { value: T; label: string }[]; value: T; onValueChange(v: T): void }`; `RefetchBar { visible: boolean }`; `OfflineBanner` (tự đọc NetInfo `useNetInfo`); `ComingSoon { title: string; icon?: LucideIcon; description?: string }`.

- [ ] **Step 1: Test (fail trước)** — `status dot shows vietnamese label` (`domain="receipt" status="In QC"` → "Đang kiểm QC"); `status dot falls back to raw status`; `status dot long press reveals english original`; `no-data and no-results are different components` (no-results có nút "Bỏ bộ lọc" gọi `onClearFilters`); `load error network shows retry and trace id`; `load error forbidden has no retry`; `offline banner shows when disconnected` (netinfo mock `isConnected:false`); `record card is pressable with label`; `progress bar exposes value` (`accessibilityValue.now`); `coming soon shows tag text`.
- [ ] **Step 2:** Implement; Run: `pnpm test src/components/shared` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(shared): add status, empty, error and card components"`

---

### Task 14: Shared components — nhập liệu & overlay

**Files:**
- Create: `src/components/shared/{SearchField,FilterChips,FilterSheet,SelectSheet,ConfirmSheet,DateField,QuantityStepper}.tsx`, `src/components/shared/__tests__/inputs.test.tsx`
- Modify: `src/components/shared/index.ts`, `src/constants/mobile/labels.ts` (`search`, `filter: "Bộ lọc"`, `apply: "Áp dụng"`, `reset: "Đặt lại"`, `cancel: "Huỷ"`, `confirm: "Xác nhận"`, `reasonLabel: "Lý do"`, `searchPlaceholder: "Tìm…"`)

**Interfaces:**
- `SearchField { value: string; onChangeText(v: string): void; placeholder: string; onSubmit?(): void; trailing?: ReactNode }` (cao 44, icon tìm màu `dot-info`, nút xoá).
- `FilterChips { chips: { key: string; label: string; onClear(): void }[]; onOpenFilters(): void; activeCount: number }` — chip đầu "Bộ lọc" (+ số khi `activeCount>0`), chip đang bật có ✕ (`accessibilityLabel` "Bỏ {label}").
- `FilterSheet { open; onOpenChange; title: string; children: ReactNode; onApply(): void; onReset(): void; canReset: boolean }` — footer "Đặt lại" trái (mờ khi `!canReset`), "Áp dụng" phải.
- `SelectSheet<T> { open; onOpenChange; title: string; options: { value: T; label: string; description?: string; disabled?: boolean }[]; value: T | T[] | null; multiple?: boolean; searchable?: boolean; onSelect(v: T | T[]): void; emptyText?: string }` — `searchable` lọc theo `label`/`description` không dấu, không phân biệt hoa thường.
- `ConfirmSheet` — props đúng tên web `ConfirmDialog`: `open, onOpenChange, title, description, confirmLabel?, cancelLabel?, requireReason?, reasonLabel?, reasonMaxLength?, onConfirm(reason?: string), variant?: "danger" | "default", loading?, closeOnConfirm? (mặc định true), error?: ReactNode, children?`; nút xác nhận khoá khi `requireReason` và lý do trim rỗng hoặc `loading`.
- `DateField { label: string; value: string | null /* YYYY-MM-DD */; onChange(v: string | null): void; minimumDate?: string; maximumDate?: string; clearable?: boolean; error?: string }` — `@react-native-community/datetimepicker`, hiển thị bằng `formatDate`.
- `QuantityStepper { value: number; onChange(v: number): void; min?: number; max?: number; step?: number; label: string; allowNegative?: boolean }` — nút −/＋ 44×44, ô số giữa (bàn phím số, chỉ nhận số nguyên, có dấu khi `allowNegative`), kẹp trong `[min,max]`.

- [ ] **Step 1: Test (fail trước)** — `search clears with button`; `filter chip clear calls onClear`; `filter sheet reset disabled when nothing to reset`; `select sheet search ignores vietnamese diacritics` ("kho ha noi" khớp "Kho Hà Nội"); `select sheet multiple toggles values`; `confirm sheet requires reason before confirming`; `confirm sheet passes trimmed reason`; `confirm sheet stays open when closeOnConfirm false`; `quantity stepper clamps to max and min`; `quantity stepper rejects non-integer input`; `date field clear sets null`.
- [ ] **Step 2:** `pnpm exec expo install @react-native-community/datetimepicker`; implement; Run: `pnpm test src/components/shared` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(shared): add search, filter, select, confirm, date and quantity inputs"`

---

### Task 15: Hạ tầng danh sách

**Files:**
- Create: `src/lib/api/infinite-query.ts` + test, `src/hooks/use-list-params.ts` + test, `src/hooks/use-prefs.ts` + test, `src/components/shared/ListScreen.tsx` + `__tests__/ListScreen.test.tsx`

**Interfaces:**
- `infinite-query.ts`: `createInfiniteListQuery<TItem, TParams extends Record<string, unknown>>(keys: QueryKeys<TParams>, fetcher: (params: TParams & { page: number; size: number }, signal?: AbortSignal) => Promise<PaginatedResponse<TItem>>, size?: number)` → hook `(params: TParams, options?: { enabled?: boolean }) => { items: TItem[]; totalElements: number | null; ...UseInfiniteQueryResult }` — `initialPageParam: 0`, `getNextPageParam: last.hasNext ? last.page + 1 : undefined`, key `[...keys.list(params), "infinite"]`, `QUERY_TIMES.list`, size mặc định `PAGE_SIZE.md`.
- `use-list-params.ts`: `useListParams<T extends Record<string, string | string[]>>(defaults: T): { params: T; debouncedQ: string; setParam<K extends keyof T>(k: K, v: T[K]): void; setParams(p: Partial<T>): void; reset(): void; activeFilterCount: number }` — đọc `useLocalSearchParams`, mảng lưu dạng chuỗi nối dấu phẩy (như nuqs web), ghi bằng `router.setParams`; `debouncedQ` từ key `q` qua `useDebouncedValue(…, UI_LIMITS.searchDebounceMs)`; `activeFilterCount` = số key khác default (trừ `q`).
- `use-prefs.ts`: `usePrefs<T>(key: string, defaultConfig: T, merge: (stored: Partial<T>, fallback: T) => T): { config: T; setConfig(v: T): void; updateConfig(fn: (c: T) => T): void }` — đọc đồng bộ `kv` lúc khởi tạo (không nháy), chỉ ghi khi gọi setter, JSON hỏng → default.
- `ListScreen<TItem>`: `{ status: "pending" | "error" | "success"; items: TItem[]; renderItem(item: TItem): ReactElement; keyExtractor(item: TItem): string; header?: ReactNode; caption?: string; hasActiveFilters: boolean; emptyNoData: { title: string; description?: string; action?: {label; onPress} }; onClearFilters(): void; error?: unknown; onRetry?(): void; hasNextPage: boolean; isFetchingNextPage: boolean; onEndReached(): void; isRefetching: boolean; onRefresh(): void; fab?: { label: string; icon?: LucideIcon; onPress(): void } }` — `FlashList`; `pending` → 5 skeleton thẻ; `error` → `LoadErrorState` theo `classifyLoadError(error)` + traceId; rỗng → `EmptyStateNoResults` nếu `hasActiveFilters` ngược lại `EmptyStateNoData`; `RefetchBar` khi `isRefetching`; footer spinner khi `isFetchingNextPage`; pull-to-refresh gọi `onRefresh`.

- [ ] **Step 1: Test (fail trước)** — `infinite query flattens pages and stops when hasNext false` (fetcher 2 trang); `infinite query exposes totalElements from first page`; `list params parse comma arrays` (dùng `renderRouter` từ `expo-router/testing-library`, URL `/x?status=A,B` → `["A","B"]`); `setParam writes route params`; `activeFilterCount ignores q`; `prefs reads stored value synchronously`; `prefs merges missing fields with default`; `prefs corrupt json falls back`; ListScreen: `pending shows skeletons`, `error shows retry`, `empty without filters shows no-data`, `empty with filters shows no-results`, `end reached requests next page`, `fab renders when provided`.
- [ ] **Step 2:** `pnpm exec expo install @shopify/flash-list`; implement; Run: `pnpm test src/lib/api/infinite-query src/hooks src/components/shared/__tests__/ListScreen` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(shared): add list screen, list params and infinite query"`

---

### Task 16: App shell — providers, root layout, đăng nhập, đăng nhập lại

**Files:**
- Create: `src/providers/app-providers.tsx`, `src/components/mobile/{ConfigErrorScreen,LoginForm,ReloginSheet,SessionExpiryBanner}.tsx` + `src/components/mobile/__tests__/auth-ui.test.tsx`, `app/login.tsx`, `app/(app)/_layout.tsx`
- Modify: `app/_layout.tsx`, `app/index.tsx` (redirect), `src/constants/mobile/labels.ts`

**Interfaces:**
- Consumes: `signIn`, `reauthenticate`, `signOut`, `useAuthLifecycle`, `useSessionExpiry`, `loginErrorMessage` (verbatim), `getRetryAfterSeconds`, `APP_CONFIG`, `ThemeProvider`, `ToastProvider`, `wireReactQueryToNative`, `makeQueryClient`, `installCryptoPolyfill`, `FONT_FAMILY`.
- `MOBILE_LABELS` bổ sung: `appName: "StockFlow Backoffice"`, `login: { title: "Đăng nhập", username: "Tên đăng nhập", password: "Mật khẩu", submit: "Đăng nhập", showPassword: "Hiện mật khẩu", retryIn: (s: number) => \`Thử lại sau ${s} giây\` }`, `relogin: { title: "Phiên đăng nhập đã hết hạn", description: "Đăng nhập lại để tiếp tục — màn hình hiện tại được giữ nguyên.", signOut: "Đăng xuất" }`, `sessionExpiry: { warning: (m: number) => \`Phiên sắp hết hạn (còn ${m} phút) — đăng nhập lại để không gián đoạn\`, action: "Đăng nhập lại" }`, `config: { title: "Thiếu cấu hình máy chủ", description: "Đặt EXPO_PUBLIC_API_URL (gồm /api/v1) rồi khởi động lại ứng dụng." }`, `bootstrap: { verifying: "Đang xác minh phiên đăng nhập" }`.
- `app-providers.tsx`: `AppProviders({ children })` = `GestureHandlerRootView` → `SafeAreaProvider` → `ThemeProvider` → `QueryClientProvider (makeQueryClient)` → `BottomSheetModalProvider` → children + `ToastProvider`; effect `wireReactQueryToNative()`.
- `app/_layout.tsx`: import `@/lib/platform/polyfills` (gọi `installCryptoPolyfill()`) đầu file; `SplashScreen.preventAutoHideAsync()`; `useFonts` 8 font `FONT_FAMILY`; `<ConfigGate config={APP_CONFIG}>` (`ConfigGate({ config, children })`: `ok === false` → `ConfigErrorScreen`); bên trong `AppProviders` + `AuthGate`: dùng `useAuthLifecycle` — `unknown` + không lỗi → màn `MOBILE_LABELS.bootstrap.verifying`; `unknown` + lỗi → `AUTH_UI.bootstrapError` + nút `AUTH_UI.retry`; còn lại render `Stack` với `<Stack.Protected guard={status === "authenticated"}>` bọc `(app)` và `<Stack.Protected guard={status === "unauthenticated"}>` bọc `login` (route được bảo vệ của Expo Router — không tự viết redirect vòng).
- `app/index.tsx`: `<Redirect href={MOBILE_ROUTES.hubs.account} />` (Task 17 đổi sang `firstVisibleHref`).
- `LoginForm { onSignedIn(): void }` — react-hook-form + `zodResolver(loginRequestSchema)`; submit chặn bấm 2 lần bằng ref; lỗi → `loginErrorMessage(error)`; `RATE_LIMITED` có `getRetryAfterSeconds` → nút khoá + đếm ngược `MOBILE_LABELS.login.retryIn(s)`.
- `ReloginSheet` — hiện khi `useAuthStore(s => s.sessionExpired)`; form như `LoginForm` gọi `reauthenticate`; `"switched-user"` → `router.replace` về hub đầu tiên thấy được (Task 17 cung cấp `firstVisibleHref`; trước đó dùng `MOBILE_ROUTES.hubs.account`); nút "Đăng xuất" → `signOut`. Render **chồng lên** children (không thay thế).
- `SessionExpiryBanner` — dùng `useSessionExpiry`, hiện khi `warning`, nút "Đăng nhập lại" mở `ReloginSheet` (đặt cờ local).

- [ ] **Step 1: Test (fail trước)** — `config error screen when api url missing` (`<ConfigGate config={{ ok:false, reason:"missing" }}>` → thấy `MOBILE_LABELS.config.title`); `login submits trimmed username and navigates`; **`double tap sends one login request`** (2 lần `press` nhanh → `signIn` gọi 1 lần); `wrong password shows UNAUTHORIZED copy` ("Tên đăng nhập hoặc mật khẩu không đúng."); `rate limited disables submit with countdown` (`Retry-After: 30` → "Thử lại sau 30 giây"); `bootstrap failure shows retry not login`; **`ReloginSheet overlays without unmounting children`** (child có `TextInput` "draft" → bật `sessionExpired` → sheet hiện, child còn "draft"); `relogin as another user navigates to first hub`; `expiry banner shows remaining minutes`.
- [ ] **Step 2:** Implement; Run: `pnpm test src/components/mobile` → PASS; `pnpm typecheck && pnpm lint` → 0 lỗi.
- [ ] **Step 3: Commit** — `git commit -m "feat(shell): add providers, auth gate, login and relogin sheet"`

---

### Task 17: Điều hướng — tab, hub theo quyền, route stub

**Files:**
- Create: `src/constants/mobile/routes.ts`, `src/components/mobile/{nav-config.ts,use-nav-visibility.ts,HubMenu.tsx,ScreenHeader.tsx,BottomActionBar.tsx}`, `src/lib/auth/components/PermissionBoundary.tsx`, `src/components/mobile/__tests__/navigation.test.tsx`, `app/(app)/(tabs)/_layout.tsx`, `app/(app)/(tabs)/{inbound,warehouse,fulfillment}/{_layout,index}.tsx`, route stub cho mọi mục nav (danh sách ở dưới)
- Modify: `src/constants/mobile/labels.ts` (`tabs: { inbound: "Nhập hàng", warehouse: "Kho", fulfillment: "Thực hiện đơn", account: "Tài khoản" }`)

**Interfaces:**
- `MOBILE_ROUTES` (`as const`): `login "/login"`; `hubs { inbound "/inbound", warehouse "/warehouse", fulfillment "/fulfillment", account "/account" }`; `receipts.list "/inbound/receipts"`; `putaway "/inbound/putaway"`; `inventory { overview "/warehouse/inventory", movements "/warehouse/inventory/movements", adjustments "/warehouse/inventory/adjustments" }`; `inventoryItems.list "/warehouse/inventory-items"`; `warehouseMap "/warehouse/warehouse-map"`; `slotting "/warehouse/slotting"`; `transfers.list "/warehouse/transfers"`; `moves "/warehouse/moves"`; `orders.list "/fulfillment/orders"`; `picking.list "/fulfillment/picking"`; `putBacks "/fulfillment/put-backs"`; `packing.list "/fulfillment/packing"`; `shipments.list "/fulfillment/shipments"`; `loads.list "/fulfillment/loads"`; `scanner "/scanner"`.
- `nav-config.ts`: `MobileNavItem = { key: string; label: string; tooltip: string; href: string; icon: LucideIcon; permission?: PermissionCode; anyPermission?: readonly PermissionCode[]; comingSoon?: boolean }`; `MobileNavGroup = { key: "inbound" | "warehouse" | "fulfillment"; title: string; icon: LucideIcon; items: MobileNavItem[] }`; `NAV_GROUPS` đúng thứ tự + mã quyền web (`BackofficeShell.tsx` `origin/develop`):
  - inbound: Phiếu nhận ("Goods receipts", `GOODS_RECEIPT_PERMISSIONS.viewPage`); Cất hàng ("Putaway", `comingSoon`).
  - warehouse: `INVENTORY_LABELS.overviewTitle` ("Inventory Overview", `anyPermission [INVENTORY_OVERVIEW_PERMISSIONS.stockRead, INVENTORY_OVERVIEW_PERMISSIONS.reservationRead]`); Hồ sơ hàng tồn (`INVENTORY_ITEM_PERMISSIONS.viewPage`); Kho map & slotting (`comingSoon`); Gợi ý vị trí (`comingSoon`); `UI_LABELS.transfer.pageTitle` (`TRANSFER_PERMISSIONS.viewPage`); Di chuyển nội bộ (`INVENTORY_PERMISSIONS.stockUpdate`); Điều chỉnh tồn (`INVENTORY_PERMISSIONS.adjustmentRead`); Lịch sử biến động (`INVENTORY_PERMISSIONS.movementRead`).
  - fulfillment: Đơn hàng (`ORDER_PERMISSIONS.viewPage`); Lấy hàng (`FULFILLMENT_PICK_PERMISSIONS.viewPage`); Đóng gói (`FULFILLMENT_PACKAGE_PERMISSIONS.viewPage`); `PUT_BACK_LABELS.title` (`FULFILLMENT_PICKING_PERMISSIONS.read`); `UI_LABELS.shipping.shipments.title` (`SHIPMENT_PERMISSIONS.viewPage`); `UI_LABELS.shipping.loads.title` (`SHIPMENT_PERMISSIONS.viewPage`).
- `use-nav-visibility.ts`: `canSeeNavItem(item, can: (c: PermissionCode) => boolean): boolean` (không khai quyền → luôn thấy; `anyPermission` → có ít nhất một); `useNavVisibility(): { status: "pending" | "error" | "ready"; groups: { group: MobileNavGroup; items: MobileNavItem[] }[]; firstVisibleHref: string; retry(): void }` — `pending`/`error` → `groups` trả đủ nhóm (không ẩn tab khi chưa biết quyền), `ready` → bỏ nhóm không còn item; `firstVisibleHref` = hub đầu còn item, không có → `MOBILE_ROUTES.hubs.account`.
- `PermissionBoundary { permissions: readonly PermissionCode[]; mode?: "all" | "any"; children; variant?: "list" | "detail" }` — như web: chờ → skeleton; lỗi không phải 403 → `LoadErrorState kind="permissions"` + retry; thiếu → `PERMISSION_UI.deniedTitle/deniedDescription`.
- `HubMenu { groupKey }` — `pending` → skeleton; **`error` → `LoadErrorState kind="permissions"` + Thử lại**; `ready` → danh sách item (icon 16, nhãn, dòng phụ `tooltip`, `Badge` "Đang phát triển" khi `comingSoon`), chạm → `router.push(href)`.
- `ScreenHeader { title: string; titleMono?: boolean; onBack?(): void; right?: ReactNode }`; `BottomActionBar { primary?: ButtonProps; secondary?: ButtonProps[]; disabledReason?: string; more?: { label: string; onPress(): void } }` — `disabledReason` hiện inline dưới nút chính (N7), tôn trọng safe area.
- `(tabs)/_layout.tsx`: `Tabs` 4 màn; nhóm không có trong `groups` (khi `ready`) → `href: null`; Tài khoản luôn hiện.
- `ErrorBoundary` (spec §3.5): `src/components/mobile/RouteErrorBoundary.tsx` `RouteErrorBoundary({ error, retry }: ErrorBoundaryProps)` → `LoadErrorState kind={classifyLoadError(error)} onRetry={retry}`; mỗi `_layout.tsx` của `inbound`, `warehouse`, `fulfillment`, `account` có `export { RouteErrorBoundary as ErrorBoundary }`.
- Modify `app/index.tsx`: `<Redirect href={firstVisibleHref} />` (chờ `status !== "pending"`).
- Route stub (`ComingSoon`): `comingSoon` item → `title` = label, `description` = `MOBILE_LABELS.comingSoonDescription`; item chưa port → `description` = `MOBILE_LABELS.portPendingDescription`. File: `inbound/{receipts/index,putaway}.tsx`, `warehouse/{inventory/index,inventory/movements,inventory/adjustments/index,inventory-items/index,warehouse-map,slotting,transfers/index,moves}.tsx`, `fulfillment/{orders/index,picking/index,put-backs,packing/index,shipments/index,loads/index}.tsx`.

- [ ] **Step 1: Test (fail trước)** — 3 bộ quyền (theo seed BE trong web `mock-user-grants.ts`):
  - `warehouse staff sees receipts but no orders` (quyền: `procurement-goods-receipts:VIEW_PAGE`, `fulfillment-pick-lists:VIEW_PAGE`, `fulfillment-packages:VIEW_PAGE`, `fulfillment-picking:READ`, `fulfillment-shipments:VIEW_PAGE`, `inventory-stock-items:READ`, `inventory-stock-items:UPDATE` → hub Thực hiện đơn không có "Đơn hàng", có "Lấy hàng").
  - `order coordinator sees orders` (thêm `sales-orders:VIEW_PAGE`).
  - `user without any fulfillment code hides the fulfillment tab` (`groups` không có `fulfillment`, `firstVisibleHref` = hub đầu còn lại).
  - `inventory overview visible with reservation read only` (`anyPermission`).
  - `coming soon items show tag`.
  - **`hub shows permissions error with retry`** (query quyền lỗi 503 `AUTHORIZATION_UNAVAILABLE` → thấy "Không tải được quyền truy cập" + "Thử lại", không thấy `PERMISSION_UI.deniedTitle`).
  - `pending permissions keep all tabs` ; `bottom action bar shows disabled reason inline`; `route error boundary renders retry` (render `RouteErrorBoundary` với `new ApiError(0,"NETWORK_ERROR","x")` → nút "Thử lại" gọi `retry`).
- [ ] **Step 2:** Implement; Run: `pnpm test src/components/mobile src/lib/auth/components` → PASS.
- [ ] **Step 3: Verify thủ công** — Expo Go: đăng nhập tài khoản WAREHOUSE_STAFF của BE `dev` → không có "Đơn hàng"; tài khoản WAREHOUSE_MANAGER → thấy đủ.
- [ ] **Step 4: Commit** — `git commit -m "feat(shell): add permission-aware tabs, hubs and route stubs"`

---

### Task 18: Tab Tài khoản

**Files:**
- Create (adapted): `src/lib/references/warehouse-options.ts` (`sync:add --mode adapted --note "params dạng object thay URLSearchParams; bỏ warehouseId khỏi key directory"`)
- Create: `src/components/mobile/AccountScreen.tsx`, `src/components/mobile/__tests__/AccountScreen.test.tsx`, `app/(app)/(tabs)/account/{_layout,index}.tsx`
- Modify: `src/constants/mobile/labels.ts` (`account: { title: "Tài khoản", defaultWarehouse: "Kho mặc định", defaultWarehouseHint: "Điền sẵn bộ lọc kho ở Lấy hàng, Trả về kệ, Đóng gói, Lô giao, Chuyến xe — vẫn đổi được.", noWarehouse: "Chưa chọn", theme: "Giao diện", themeSystem: "Theo hệ thống", themeLight: "Sáng", themeDark: "Tối", sound: "Âm thanh khi quét", haptics: "Rung khi quét", sessionRemaining: (h: number, m: number) => \`Phiên còn ${h} giờ ${m} phút\`, version: "Phiên bản", signOut: "Đăng xuất", signOutConfirm: "Đăng xuất khỏi thiết bị này?" }`)

**Interfaces:**
- Consumes: `useAuthStore`, `useAppStore`, `useWarehouseOptions` (adapted: `fetchActiveWarehouseOptions` gửi `params: { page: 0, size: PAGE_SIZE.masterData, status: "ACTIVE", sort: "name,asc" }`), `useCan(WAREHOUSE_PERMISSIONS.read)`, `useSessionExpiry`, `signOut`, `SelectSheet`, `RadioGroup`, `Switch`, `ConfirmSheet`.
- `AccountScreen()` — hiển thị `fullName ?? username`, `username`, `email`, `roles` (nối dấu phẩy); mục Kho mặc định chỉ khi có `warehouse-warehouses:READ` (SelectSheet có tìm, "CODE · Tên"); Giao diện (RadioGroup 3 lựa chọn); 2 Switch âm thanh (`muted` đảo nghĩa) / rung; thời gian phiên còn lại; phiên bản (`Constants.expoConfig.version`); Đăng xuất qua `ConfirmSheet` → `signOut(queryClient)`.

- [ ] **Step 1: Test (fail trước)** — `shows user identity`; `hides default warehouse without warehouse read`; `selecting warehouse stores default id`; `theme radio updates store`; `sound switch toggles muted`; `sign out asks for confirmation then signs out`; `warehouse options request uses object params` (axios-mock-adapter khớp `status=ACTIVE&size=200&page=0&sort=name,asc`).
- [ ] **Step 2:** Implement; Run: `pnpm test src/components/mobile/__tests__/AccountScreen src/lib/references` → PASS; `pnpm sync:check` → 0 lệch.
- [ ] **Step 3: Commit** — `git commit -m "feat(shell): add account tab with default warehouse, theme and sign out"`

---

### Task 19: Hạ tầng quét mã

**Files:**
- Create: `scripts/generate-scan-tones.mjs` + `scripts/__tests__/generate-scan-tones.test.mjs`, `assets/sounds/{scan-ok,scan-error}.wav`, `src/lib/platform/feedback-effects.ts`, `src/components/mobile/scan/{scan-bus.ts,dedupe.ts,ScanField.tsx,CameraScanner.tsx,ScanFeedbackBanner.tsx}` + `__tests__/scan.test.tsx`, `src/hooks/use-scan-feedback.ts` + test, `app/(app)/scanner.tsx`
- Modify: `app/(app)/_layout.tsx` (đăng ký `scanner` `presentation: "fullScreenModal"`), `src/constants/mobile/labels.ts` (`scan: { openCamera: "Mở camera quét mã", typeHint: "Quét hoặc nhập mã rồi bấm Enter", close: "Đóng", permissionTitle: "Cần quyền camera để quét mã", permissionDenied: "Bạn đã tắt quyền camera. Mở Cài đặt để bật lại, hoặc nhập mã bằng tay.", openSettings: "Mở Cài đặt", typeInstead: "Nhập tay", testTitle: "Kiểm tra quét mã", testHint: "Quét thử một mã để kiểm tra camera, âm báo và rung.", lastCode: "Mã vừa đọc" }`), `app.config.ts` (plugin `expo-camera` với `cameraPermission: "StockFlow cần camera để quét mã vạch và mã QR."`), `src/components/mobile/AccountScreen.tsx` (thêm section "Kiểm tra quét mã": `ScanField` `cameraMode="single"` → hiện `"{lastCode}: {code}"` + `show({ tone: "positive", message: code })` — công cụ tự kiểm thiết bị cho nhân viên kho, cũng là chỗ nghiệm thu quét của P0)

**Interfaces:**
- `generate-scan-tones.mjs`: `makeToneWav({ frequency: number; durationMs: number; sampleRate?: number; amplitude?: number }): Buffer` (PCM 16-bit mono, mặc định 44100 Hz, biên độ 0.08, giảm tuyến tính về 0); CLI ghi `scan-ok.wav` (1046 Hz, 90 ms) và `scan-error.wav` (220 Hz, 320 ms).
- `scan-bus.ts`: `createScanRequestId(): string`; `publishScan(requestId: string, code: string): void`; `subscribeScan(requestId: string, listener: (code: string) => void): () => void`; `publishScanFeedback(requestId: string, feedback: ScanFeedback): void`; `subscribeScanFeedback(requestId: string, listener: (f: ScanFeedback) => void): () => void`; `type ScanFeedback = { tone: "positive" | "danger"; message: string }`.
- `dedupe.ts`: `createScanDeduper(windowMs = SCAN_MOBILE_LIMITS.dedupeWindowMs): (code: string, now?: number) => boolean` (trả `false` khi cùng mã trong cửa sổ).
- `feedback-effects.ts`: `playScanTone(tone: "positive" | "danger"): void` (expo-audio `createAudioPlayer`, lười tạo 1 lần/âm, `seekTo(0)` rồi `play()`, nuốt lỗi); `scanHaptic(tone): void` (`Haptics.notificationAsync(Success|Error)`, nuốt lỗi).
- `use-scan-feedback.ts`: `useScanFeedback(): { feedback: ScanFeedback | null; show(f: ScanFeedback): void; clear(): void }` — `positive` tự xoá sau `SCAN_MOBILE_LIMITS.positiveFeedbackMs`; `danger` giữ tới lần `show` sau; mỗi lần `show`: âm thanh nếu `!muted`, rung nếu `hapticsEnabled`, `AccessibilityInfo.announceForAccessibility(message)`.
- `ScanField { label: string; placeholder: string; onSubmit(code: string): void; normalize?: (code: string) => string; cameraMode?: "single" | "continuous"; disabled?: boolean; pending?: boolean; feedback?: ScanFeedback | null; autoFocus?: boolean }` — mono, `autoCapitalize="characters"`, `autoCorrect={false}`, cao 52; Enter → trim (+ `normalize`) → bỏ qua nếu rỗng → `onSubmit` + xoá ô; nút camera → `router.push({ pathname: MOBILE_ROUTES.scanner, params: { requestId, mode: cameraMode ?? "single", title: label } })` + `subscribeScan(requestId, onSubmit)`; với `continuous` chuyển `feedback` sang `publishScanFeedback`.
- `CameraScanner { requestId: string; mode: "single" | "continuous"; title: string; onClose(): void }` — `useCameraPermissions`; chưa cấp → nút xin quyền; bị từ chối và `!canAskAgain` → `permissionDenied` + "Mở Cài đặt" (`Linking.openSettings`) + "Nhập tay" (`onClose`); `CameraView barcodeScannerSettings.barcodeTypes = ["code128","code39","ean13","ean8","upc_a","upc_e","qr","datamatrix"]`; `single` → mã đầu tiên → `publishScan` → `onClose`; `continuous` → mỗi mã qua deduper → `publishScan`, hiển thị `ScanFeedbackBanner` nhận từ `subscribeScanFeedback`.
- `app/(app)/scanner.tsx`: đọc params → `CameraScanner` với `onClose = router.back`.

- [ ] **Step 1: Test (fail trước)** — `generate-scan-tones.test.mjs`: `wav header is riff pcm mono 16-bit`, `sample count matches duration` (90 ms × 44100 = 3969 mẫu). `scan.test.tsx`: **`typed code submits without camera`** (gõ " ab-12 " + submit → `onSubmit("AB-12")` với `normalize` upper-case; ô rỗng sau đó); `empty input is ignored`; `scan bus delivers to matching request only`; `deduper ignores same code within 1500 ms and accepts after`; `single mode publishes first code and closes`; `continuous mode publishes deduped codes and stays open`; **`denied permission shows settings prompt`** (`__setCameraPermission({ granted:false, canAskAgain:false })` → thấy "Mở Cài đặt" và "Nhập tay"). `use-scan-feedback.test.ts`: `positive clears after 1500 ms` (fake timers), `danger persists until next show`, `muted skips sound but still vibrates`, `announces message`.
- [ ] **Step 2:** `pnpm exec expo install expo-camera expo-haptics expo-audio`; `node scripts/generate-scan-tones.mjs`; implement; Run: `node --test scripts/__tests__/generate-scan-tones.test.mjs && pnpm test src/components/mobile/scan src/hooks/use-scan-feedback` → PASS.
- [ ] **Step 3: Verify thủ công** — Tab Tài khoản → "Kiểm tra quét mã": (a) Android emulator: gõ mã + Enter → hiện "Mã vừa đọc: …", có rung/âm (nếu bật); bấm camera trên emulator không có camera → thấy hướng dẫn quyền/không đọc được, "Nhập tay" quay lại. (b) iPhone qua Expo Go: quét một QR và một mã Code128 in sẵn → màn camera tự đóng, ô hiện đúng mã. Thêm test `account scan check shows last code` vào `AccountScreen.test.tsx`.
- [ ] **Step 4: Commit** — `git commit -m "feat(scan): add scan field, camera scanner and scan feedback"`

---

### Task 20: Kiểm tra tổng, CI, nghiệm thu P0

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (mục "Chạy trên điện thoại", "Validate", "Đồng bộ với web")

**Interfaces:**
- `ci.yml`: trigger `pull_request` + `push` nhánh `develop`/`main`; job `validate` (ubuntu, Node 22, `pnpm/action-setup` 10.9.0, checkout repo này + `actions/checkout` repo `KLTN-FA26/UI` ref `develop` vào `../stockflow-ui` với `token: ${{ secrets.WEB_REPO_TOKEN }}` và `fetch-depth: 0`, rồi `git -C ../stockflow-ui update-ref refs/remotes/origin/develop HEAD`; `pnpm install --frozen-lockfile`; `pnpm run validate`). Không có job EAS (thêm khi có `EXPO_TOKEN`).

- [ ] **Step 1: Validate đầy đủ** — Run: `pnpm run validate` → Expected: typecheck 0 lỗi; lint 0 lỗi/0 warning; jest toàn bộ PASS; `test:scripts` PASS; `sync:check` "không có lệch"; `expo-doctor` không lỗi; `expo export` OK. Dán output thật.
- [ ] **Step 2: Coverage** — Run: `pnpm test --coverage --collectCoverageFrom='src/lib/domain/**'` → Expected: statements/branches ≥ 90%.
- [ ] **Step 3: Nghiệm thu thủ công trên thiết bị** (BE chạy profile `dev`, `.env.local` đúng URL):
  1. Expo Go Android emulator: đăng nhập sai → "Tên đăng nhập hoặc mật khẩu không đúng."; đăng nhập đúng → vào hub đầu tiên.
  2. WAREHOUSE_STAFF: không có "Đơn hàng"; WAREHOUSE_MANAGER: đủ mục; mục "Đang phát triển" có nhãn.
  3. Tắt mạng → banner "Mất kết nối — thay đổi chưa được lưu".
  4. Tài khoản: đổi Giao diện Tối → toàn app đổi màu; chọn kho mặc định; Đăng xuất → về màn đăng nhập.
  5. iPhone (Expo Go, cùng mạng LAN, URL IP LAN): đăng nhập + "Kiểm tra quét mã" đọc được QR và Code128.
  5b. Spike spec §3.6: một máy Android tầm trung thật quét mã Code128 khổ nhỏ (~3 cm) — đọc được trong ≤ 2 giây. Không đạt → ghi vào `docs/hermes-intl-probe.md` (mục "Camera") và đưa đánh giá `react-native-vision-camera` vào plan P4 (không đổi ở P0).
  6. Restart BE trong lúc app mở (nếu BE không cấu hình `JWT_PRIVATE_KEY*` thì token mất hiệu lực) → thao tác tiếp → hiện sheet "Phiên đăng nhập đã hết hạn", màn bên dưới giữ nguyên.
- [ ] **Step 4: EAS dev build Android** — người dùng đăng nhập Expo (`pnpm exec eas login` — bước của người dùng), rồi `pnpm exec eas build --profile development --platform android` → cài APK lên emulator, mở được.
- [ ] **Step 5: Commit** — `git commit -m "ci(ci): add validate workflow and p0 run guide"`
