# StockFlow Backoffice (mobile)

Ứng dụng back-office StockFlow cho điện thoại (Expo SDK 58 + Expo Router), port từ web back-office.

## Yêu cầu

- Node 22 (`.nvmrc`; `engines` yêu cầu `>=22`)
- pnpm 10.9 (khai báo trong `packageManager`; không dùng npm/yarn/bun)
- Expo Go SDK 58 trên thiết bị hoặc Android emulator
- BE `be-backoffice-stockflow-commerce` đang chạy với profile `dev`
- Repo web `stockflow-ui` clone ở `../stockflow-ui` (mọi script `pnpm sync:*` — `check`, `add`, `pull`, `ack` — đọc nó bằng `git`; `validate` và CI chạy `sync:check`, xem "Đồng bộ với web"). Chạy app và Jest thì không cần

## Chạy thử

```bash
pnpm install
cp .env.example .env.local
pnpm start
```

Mở bằng Expo Go (quét QR hoặc nhấn `a` để mở trên Android emulator). `pnpm start`, `pnpm android` và `pnpm ios` luôn truyền `--go`: dự án có
`expo-dev-client`, và nếu thiếu cờ này Expo CLI sẽ mặc định mở dev build thay vì Expo Go. Muốn chạy với dev build dùng `pnpm start:dev`.

`EXPO_PUBLIC_API_URL` đã gồm `/api/v1`:

- Android emulator: `http://10.0.2.2:8080/api/v1` (mặc định trong `.env.example`)
- Máy thật: `http://<IP LAN>:8080/api/v1`

Chạy BE bằng profile `dev` (profile `local` tắt security).

## Chạy trên điện thoại

App luôn gọi BE thật (không có mock mode). Thiếu `EXPO_PUBLIC_API_URL`, hoặc giá trị không phải URL http(s), hoặc đường dẫn không kết thúc bằng `/api/v1` (hay có query/fragment), app hiện
màn "Thiếu cấu hình máy chủ" thay vì mở màn đăng nhập.

`EXPO_PUBLIC_*` được nhúng vào bundle lúc build JS: sau khi sửa `.env.local`, khởi động lại Metro bằng `pnpm start --clear`.

### Android emulator (Expo Go)

1. Chạy BE profile `dev` trên máy dev (cổng 8080).
2. `.env.local` giữ `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1` (`10.0.2.2` là máy dev nhìn từ emulator).
3. `pnpm start`, nhấn `a` để mở Expo Go trên emulator. Expo Go cho phép HTTP thường tới BE dev.

### iPhone hoặc Android thật (Expo Go, cùng mạng LAN)

1. Máy dev và điện thoại cùng mạng Wi-Fi; tường lửa máy dev cho phép cổng 8080 (BE) và 8081 (Metro).
2. Đặt `EXPO_PUBLIC_API_URL=http://<IP LAN máy dev>:8080/api/v1` trong `.env.local` (IP lấy bằng `ipconfig`), rồi `pnpm start --clear`.
3. Mở Expo Go trên điện thoại và quét QR trong terminal (iPhone: quét bằng app Camera, Android: quét trong Expo Go).
4. Đăng nhập, rồi vào tab Tài khoản, mục "Kiểm tra quét mã" để thử camera (QR và Code128).

### Dev build Android (EAS)

Dùng khi cần chạy ngoài Expo Go (ví dụ thử cấu hình native). `eas-cli` không nằm trong `package.json`; chạy bằng `pnpm dlx`
(hoặc cài toàn cục). Hai lệnh dưới cần tài khoản Expo của bạn:

```bash
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest build --profile development --platform android
```

Tải APK từ đường dẫn EAS in ra, kéo vào emulator (hoặc `adb install <file>.apk`), rồi `pnpm start:dev` (`expo start --dev-client`) để mở dev build đã cài.

- Profile `development` (`eas.json`) là bản duy nhất cho phép HTTP thường (`usesCleartextTraffic`, qua plugin `expo-build-properties`
  chỉ khi `EAS_BUILD_PROFILE=development`). Bundle JS của dev build vẫn do Metro phục vụ, nên URL BE lấy từ `.env.local` của máy dev.
- Profile `development` đặt sẵn `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1` (emulator) cho phần build native.
- `developmentClient: true` dùng gói `expo-dev-client` (đã có trong `package.json`). Gói này chỉ ảnh hưởng dev build; Expo Go vẫn là cách chạy mặc định
  (spec D9: chỉ dùng module chạy được trong Expo Go), nên các script `start`, `android`, `ios` có `--go`.

### Bản preview và production

Hai profile này không chứa URL BE trong repo. Chúng đọc `EXPO_PUBLIC_API_URL` từ biến môi trường EAS cùng tên (`"environment": "preview"`
và `"production"` trong `eas.json`). Người dùng tự tạo, URL phải là HTTPS và gồm `/api/v1`:

```bash
pnpm dlx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --visibility plaintext
pnpm dlx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --visibility plaintext
```

Thiếu biến, app build ra chỉ hiện màn cấu hình lỗi ("Thiếu cấu hình máy chủ") chứ không crash. Preview và production không bật HTTP thường.

### Lần build iOS đầu tiên lên App Store

`expo-camera` cấu hình `microphonePermission: false` (app chỉ đọc mã vạch, không quay video), nhưng `expo-camera` và `expo-audio`
vẫn link API micro. Lần tải lên App Store đầu tiên có thể bị báo ITMS-90683 (thiếu purpose string, ví dụ `NSMicrophoneUsageDescription`): người làm bản iOS
đầu tiên cần kiểm tra và quyết định cách xử lý, đừng đổi cấu hình camera trước khi biết kết quả.

## Lệnh

| Lệnh                 | Mô tả                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `pnpm start`         | `expo start --go` (Expo Go)                                        |
| `pnpm start:dev`     | `expo start --dev-client` (dev build)                              |
| `pnpm android`       | `expo start --android --go`                                        |
| `pnpm ios`           | `expo start --ios --go`                                            |
| `pnpm typecheck`     | `tsc --noEmit`                                                     |
| `pnpm lint`          | ESLint (0 warning) + `scripts/check-style-bans.mjs`                |
| `pnpm format`        | Prettier ghi đè `app`, `src`, `scripts`                            |
| `pnpm test`          | Jest (`jest-expo`), không coverage, chạy nhanh khi đang làm        |
| `pnpm test:coverage` | Jest + coverage + ngưỡng (cái `validate` và CI chạy)               |
| `pnpm test:scripts`  | `node --test` cho `scripts/__tests__` và `.claude/hooks/__tests__` |
| `pnpm sync:check`    | So file đã port với repo web, đọc-only (xem "Đồng bộ với web")     |
| `pnpm sync:add`      | Thêm file mới từ web vào `port-manifest.json`                      |
| `pnpm sync:pull`     | Ghi lại file `verbatim` từ web                                     |
| `pnpm sync:ack`      | Xác nhận đã rà file `adapted` sau khi web đổi                      |
| `pnpm run doctor`    | `expo-doctor` (cần mạng)                                           |
| `pnpm export:check`  | `expo export` cho android + ios vào `dist/`                        |
| `pnpm run validate`  | Chạy tất cả kiểm tra ở trên theo thứ tự (xem "Validate")           |

## Validate

`pnpm run validate` là cổng trước khi báo xong một thay đổi và là việc CI chạy. Nó chạy lần lượt, dừng ở bước lỗi đầu tiên:

1. `typecheck`: `tsc --noEmit`, 0 lỗi.
2. `lint`: ESLint với `--max-warnings 0`, rồi `scripts/check-style-bans.mjs` (không hex trần ngoài `src/lib/tokens.ts`, không gradient,
   không hồng/magenta/fuchsia, không import `@/lib/mock-data`).
3. `test:coverage`: toàn bộ Jest kèm coverage; **thiếu ngưỡng là lỗi** (bên dưới).
4. `test:scripts`: test `node:test` của script đồng bộ, lint-staged và hook `.claude`.
5. `sync:check`: file đã port khớp repo web; kết thúc bằng "không có lệch".
6. `doctor`: `expo-doctor`, cần mạng.
7. `export:check`: `expo export` android + ios ra `dist/` (thư mục này không commit).

Coverage là một phần của cổng merge. Ngưỡng đặt trong `jest.config.js` và chỉ đo các tập có target: `src/lib/domain/**` ≥ 90% statements và branches **từng file**;
`src/components/` ≥ 70% statements và branches **gộp cả thư mục**. Khi feature đầu tiên vào, thêm `src/features/*/{schemas,lifecycle,selectors}.ts` ≥ 90% (xem
`.claude/rules/testing.md`). Bảng theo file in ra khi chạy `pnpm test:coverage`; báo cáo HTML ở `coverage/lcov-report/index.html` (`coverage/` không commit). Lần chạy đầu
với cache Jest lạnh mất vài phút, các lần sau khoảng 1,5 phút.

CI (`.github/workflows/ci.yml`) chạy `pnpm run validate` cho mỗi pull request và mỗi lần push vào `develop` hoặc `main`; một push mới vào cùng PR hoặc nhánh huỷ lần chạy
đang dở (`concurrency`). Job checkout thêm
repo web `KLTN-FA26/UI` (nhánh `develop`) làm thư mục anh em của repo này (xem "Đồng bộ với web"), nên repo cần secret `WEB_REPO_TOKEN`
(quyền đọc repo web). **PR từ fork không nhận secret** (GitHub không gửi `WEB_REPO_TOKEN` cho workflow của fork), nên bước checkout repo web sẽ lỗi và CI đỏ ở đó: người
có quyền ghi đẩy nhánh đó lên repo này (hoặc chạy `pnpm run validate` ở máy dev) để có kết quả CI thật. Chưa có job EAS; thêm khi có `EXPO_TOKEN`.

## Đồng bộ với web

Nghiệp vụ, mã quyền, action-gating, thông báo lỗi và hằng số đồng bộ 1-1 với web. Nguồn là nhánh `origin/develop` của `stockflow-ui`,
đọc từ thư mục trong biến môi trường `STOCKFLOW_WEB_REPO` (mặc định `../stockflow-ui`):

```bash
STOCKFLOW_WEB_REPO=/duong/dan/stockflow-ui pnpm sync:check
```

Trong PowerShell: `$env:STOCKFLOW_WEB_REPO = "D:/duong/dan/stockflow-ui"; pnpm sync:check`.

Mỗi file đã port có một mục trong `port-manifest.json` (`source`, `target`, `mode`, `sourceBlob`):

- `verbatim`: bản sao y nguyên của file web. **Không sửa tay**; `sync:check` báo lệch nếu nội dung khác web.
- `adapted`: bản chuyển thể (đổi import, `vi.*` thành `jest.*`, thay API). Có `note` nói rõ đã đổi gì; `sync:check` báo lệch khi web đổi file nguồn.

| Lệnh                                                   | Việc                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm sync:check`                                      | Liệt kê file lệch kèm lệnh xử lý (exit khác 0 nếu có lệch)                        |
| `pnpm sync:add <source…> [--target] [--mode] [--note]` | Copy file từ web, ghi vào manifest                                                |
| `pnpm sync:pull <target…>`                             | Ghi lại file `verbatim` từ web                                                    |
| `pnpm sync:ack <target…>`                              | Sau khi đã rà và port tay thay đổi của file `adapted`, ghi nhận blob web hiện tại |

**Sửa web trước.** Muốn đổi nội dung một file `verbatim`: sửa ở repo web (PR riêng), chờ vào `origin/develop`, rồi `git fetch` ở repo web và
`pnpm sync:pull <target>`. Các điểm web hiện lệch nghiệp vụ (G1 đến G18 trong `.claude/rules/web-parity.md`) được giữ đúng như web; muốn
sửa thì đề xuất sửa web trước.

**Trên CI**, `actions/checkout` không cho `path` ra khỏi `$GITHUB_WORKSPACE`, nên repo mobile không thể nằm ở gốc workspace với repo web ở
`../stockflow-ui`. Workflow vì vậy checkout repo mobile vào `stockflow-mobile/` và repo web vào `stockflow-ui/` (hai thư mục anh em trong
workspace), chạy mọi bước từ `stockflow-mobile/`, và đặt `STOCKFLOW_WEB_REPO` trỏ tới `stockflow-ui/`.
Từ gốc repo mobile, `../stockflow-ui` vẫn đúng là repo web, giống máy dev.

Các script chỉ đọc repo web bằng `git rev-parse` và `git show`: chúng không fetch, pull hay checkout. Muốn so với web mới nhất, tự chạy
`git fetch` trong `../stockflow-ui`. Báo "không thấy repo web" hoặc "chưa có ref origin/develop" nghĩa là chưa clone hoặc chưa fetch repo đó.
