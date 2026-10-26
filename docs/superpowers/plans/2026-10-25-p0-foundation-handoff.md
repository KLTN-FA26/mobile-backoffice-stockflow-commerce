# P0 — Bàn giao (nền tảng)

Nhánh `feature/p0-foundation` (từ `main` 2ae28d3). 20 task của plan `2026-10-25-p0-foundation.md` đã xong; mỗi task qua implementer + review (spec + chất lượng) + vòng sửa; review tổng toàn nhánh (3 reviewer theo mảng) → 1 đợt sửa → re-review: **không còn lỗi Critical/Important**. `pnpm run validate` (typecheck → lint → test:coverage → test:scripts → sync:check → doctor → export:check) xanh.

Tài liệu này giữ lại những gì trước đây chỉ nằm trong sổ ghi tạm (`.superpowers/`, bị gitignore): việc người dùng cần làm/quyết, việc mang sang P1, và mọi quyết định (ruling) đã đưa ra thay người dùng.

## 1. Nghiệm thu trên thiết bị (người dùng chạy — R6)

Chuẩn bị: BE chạy profile `dev`; `.env.local` chép từ `.env.example` với URL đúng (có `/api/v1`); `pnpm start` (thêm `--clear` sau khi đổi URL).

1. Android emulator (Expo Go): sai mật khẩu → "Tên đăng nhập hoặc mật khẩu không đúng."; đúng → vào hub đầu tiên được thấy.
2. WAREHOUSE_STAFF không có "Đơn hàng"; WAREHOUSE_MANAGER thấy đủ; mục "Đang phát triển" có nhãn (Android và iPhone thật).
3. Tắt mạng → banner "Mất kết nối — thay đổi chưa được lưu" hiện **một lần** dưới header (hub, Tài khoản, màn camera).
4. Tài khoản: Giao diện Tối → toàn app đổi; chọn kho mặc định; Đăng xuất → về màn đăng nhập.
5. iPhone (Expo Go, cùng LAN, URL IP LAN): đăng nhập; "Kiểm tra quét mã" đọc QR và Code128.
6. Spike §3.6: Android tầm trung thật đọc Code128 nhỏ (~3 cm) trong ≤ 2 s; không đạt → ghi mục "Camera" trong `docs/hermes-intl-probe.md`, đưa đánh giá `react-native-vision-camera` vào plan P4.
7. Restart BE khi app đang mở → thao tác → sheet "Phiên đăng nhập đã hết hạn", màn bên dưới giữ nguyên (cả bản nháp đang gõ).
8. Probe Intl Hermes: mở `exp://<IP-LAN>:8081/--/dev-intl-probe` trên Android và iPhone, điền bảng trong `docs/hermes-intl-probe.md`.
9. Đổi người dùng khi đăng nhập lại: sheet đóng gọn (bàn phím ẩn), người mới vào "/" và không thấy màn nào của người trước.
10. Splash/font: khởi động lạnh hiện splash rồi app với font Inter, không nháy font hệ thống/khung trắng (cả 2 theme).
11. Banner phiên/offline không nằm dưới tai thỏ; thanh hành động đáy nằm trên home indicator ngay khung đầu khi ẩn tab bar.
12. Camera: từ chối quyền → "Mở Cài đặt" → bật quyền → quay lại app thì camera hiện; bật lại ô quét dưới modal camera không bật bàn phím Android.
13. VoiceOver/TalkBack với sheet mở (SelectSheet, ConfirmSheet, ReloginSheet): không vuốt ra màn phía sau; tiêu đề sheet đọc một lần khi mở; chạm nền đóng sheet; toast từ thao tác trong sheet vẫn được đọc.
14. Sheet mở/đóng 180 ms; bật Reduce Motion thì không trượt; nền/bo góc sheet đúng ở 2 theme.
15. Toast ở 2 theme (màu nền/viền/chữ/icon), VoiceOver/TalkBack đọc mỗi toast một lần; toast hiện trên sheet đang mở.
16. iOS VoiceOver đọc lỗi trường, lỗi đăng nhập, banner offline, thông báo "không tải lại được" khi xuất hiện.
17. Lỗi render ở màn đăng nhập (ép throw) → màn lỗi đúng theme, "Thử lại" render lại.
18. Tab Tài khoản: ô "Kiểm tra quét mã" không bị bàn phím che (iOS và Android).
19. Đăng nhập: sai mật khẩu rồi bỏ trống → nút con mắt vẫn thẳng hàng với ô.
20. Hub: chạm nhanh 2 lần một mục chỉ mở 1 màn; lỗi tải quyền: "Thử lại" quay và lỗi giữ tới khi có kết quả.
21. Icon/splash vẫn là placeholder của template Expo — thay bằng nhận diện thật sau.
22. EAS dev build Android (tài khoản Expo của người dùng): `pnpm dlx eas-cli@latest login` → `pnpm dlx eas-cli@latest build --profile development --platform android` → cài APK, chạy Metro bằng `pnpm start:dev`, xác nhận mở được dev launcher và gọi BE qua HTTP.
23. Trước lần merge đầu: thêm secret `WEB_REPO_TOKEN` (đọc được `KLTN-FA26/UI`) và theo dõi lần chạy CI đầu (lần cache lạnh có thể ~7 phút cho coverage).
24. Bản preview/production: `eas env:create` cho `EXPO_PUBLIC_API_URL` (HTTPS, có `/api/v1`) ở môi trường preview và production.
25. Bản iOS lên store lần đầu: kiểm tra cảnh báo ITMS-90683 (chuỗi quyền micro) theo ghi chú trong README.

## 2. Chờ người dùng quyết (R53 — cấu hình quyền của Claude Code, không cho subagent tự sửa)

- **Hook bảo vệ dùng đường dẫn tương đối** trong `.claude/settings.json` (`.claude/hooks/…mjs`): sau một lệnh `cd`, hook không tìm thấy script và **mặc định cho qua** (chặn verbatim, khoá `components/ui`, chặn sửa `.env`, chặn npm/yarn/bun đều tắt). Đề xuất: lệnh hook dùng `$CLAUDE_PROJECT_DIR`, và trong hook lấy gốc repo từ `CLAUDE_PROJECT_DIR ?? input.cwd`; thêm test chạy từ thư mục con.
- **`guard-package-manager` còn lọt**: `npm uninstall/ci/update/audit fix`, `npm.cmd`, `cmd /c npm …`, tiền tố biến môi trường (`CI=1 npm ci`), `bun i/a`, here-string `<<<`. (`expo-doctor` vẫn bắt lockfile lạ khi validate.)
- **Quyền trong `.claude/settings.json`**: luật chặn đọc `.env*` là tương đối theo thư mục hiện tại; các đường dẫn `D:/…` chỉ đúng trên máy này; `Bash(pnpm dlx:*)` tự duyệt mọi gói; `git branch:*`/`git stash:*` gồm cả `-D`/`drop`; matcher hook nên thêm `MultiEdit|NotebookEdit`.
- **Khoá `components/ui` (R8)** chỉ so với `main` local.
- **`CLAUDE.md`/`AGENTS.md`** còn ghi "`app/**` chỉ import features + components" (lint cho phép thêm `constants/*`) và chưa nhắc coverage trong `validate`.

## 3. Mang sang P1 (đã ghi vào `.claude/rules`)

- Màn danh sách đầu tiên: adapter infinite query → `ListScreen` (thử lại `fetchNextPage()` khi trang sau lỗi, phát lại end-reached sau khi tải lại, khử trùng dòng theo key giữa các trang).
- Màn trạm/form: ẩn tab bar bằng `tabBarStyle: { display: "none", height: 0 }`; quyết định hành vi mutation khi offline (TanStack tạm dừng) trước trạm đầu tiên; không chạy effect theo `user`/`authorizationVersion`.
- Trạm quét liên tục (P3/P4): trên iOS, `fullScreenModal` che SessionExpiryBanner/ReloginSheet khi quét lâu.
- Đề xuất web áp dụng R55 (giữ quyền đã biết khi refetch lỗi) để `Can.tsx` trở lại verbatim.
- Ghi chú nhỏ còn lại (R62): `useSubmitLatch` nên bọc `action` trong try/catch và nhả khi settle; banner offline đọc một lần cho mỗi header đang mount trên iOS; toast không focus được bằng VoiceOver khi sheet mở (vẫn được đọc); nhãn "verbatim" trong `eslint.config.mjs` còn liệt kê `Can.tsx`; catalogue thiếu `QuantityStepper` `disabled/error` và `Input` `trailing`; spec dòng 158 còn nhắc `lib/platform/uuid`; dòng "Đăng xuất" trong `api-conventions.md` ghi sai thứ tự (code xoá local trước).
- `tsconfig` đang nạp kiểu `jest`/`node` cho toàn dự án; `BottomActionBar` chưa có dòng "không còn thao tác".

## 4. Các ruling đã quyết thay người dùng (theo thứ tự; "nếu sai thì tốn gì")

- R0 — Làm trên nhánh `feature/p0-foundation` ngay trong checkout chính (plan dùng `../stockflow-ui` tương đối) — nếu sai: chuyển sang worktree sau.
- R1 — `test:scripts` = `node --test scripts/__tests__` (T4 nối thêm hooks) — không tốn gì.
- R2 — File verbatim vi phạm luật lint riêng của mobile → override theo file trong `eslint.config.mjs`, không sửa file — luật đó không áp lên file chép (web vẫn lint).
- R3 — Đổi verbatim → adapted = sửa `mode` + `note` trong manifest rồi mới sửa file — không tốn gì.
- R4 — `MOBILE_ROUTES` tạo ở T16, T17 chỉ dùng — không tốn gì.
- R5 — T16 tạo route Tài khoản tạm (tên + Đăng xuất) để redirect có đích — vài dòng bỏ đi.
- R6 — Bước cần thiết bị là nghiệm thu của người dùng; T6 thành probe thuần + route dev + tài liệu chờ chạy — kết quả Intl/camera chưa được xác nhận tới khi người dùng chạy.
- R7 — Cleartext HTTP Android chỉ cho bản dev build, cấu hình ở T20 — dev build trước T20 không gọi được BE http.
- R8 — Hook khoá `components/ui/**` chỉ khi file đã có trên `main` — primitive sửa tự do trong P0.
- R9 — Chặn đọc đúng các file env thật, `.env.example` vẫn đọc/sửa được — tên env lạ không bị chặn đọc.
- R10 — Gộp các lỗi hook cho qua/chặn nhầm vào vòng sửa T4 — thêm một vòng review.
- R11 — lint-staged bỏ qua file verbatim — không tốn gì.
- R12 — File verbatim lỗi typecheck TS 6 → adapted tối thiểu + note, không `ts-ignore` — thêm file adapted cần soát khi web đổi.
- R13 — Chấp nhận việc dời import do lint trong `lifecycle.ts` (adapted) — diff với web lớn hơn chút.
- R14 — Plugin cấu hình secure-store/sqlite thêm ở T20 — dev build trước T20 thiếu cấu hình native.
- R15 — `persistSession` chỉ lưu `{accessToken, expiresAt}`; config chỉ nhận http/https — thêm một vòng review.
- R16 — `.gitattributes` `* text=auto eol=lf` — không tốn gì.
- R17 — `afterEach` toàn cục reset auth store và mock lưu trữ — không tốn gì.
- R18 — Đăng xuất ưu tiên xoá cục bộ trước, gọi logout BE sau (không chờ) — phiên phía server có thể sống tới 8h nếu lệnh thu hồi không tới (máy không còn giữ token).
- R19 — Ghi chủ sở hữu dữ liệu `session:*`; người khác đăng nhập thì xoá — cùng người giữ requestId cũ tới TTL 24h.
- R20 — 401 của token cũ bị bỏ qua; `renewSession` nguyên tử; vài sửa test — thêm một vòng review.
- R21 — Khoá nút trong ReloginSheet khi đang đăng nhập lại (sửa gốc để review tổng — đã làm ở R56) — hiếm khi lẫn phiên.
- R22 — NativeWind `inlineRem: 16` — mọi utility theo rem lệch ~14% nếu sai.
- R23 — Ô nhập trong Sheet dùng `BottomSheetTextInput` — không tốn gì.
- R24 — Badge giữ công thức của web (tương phản thấp như web) — vài chữ badge < 4.5:1.
- R25 — Lỗi ô nhập đưa vào `accessibilityHint`; test cố định kích thước primitive — thêm một vòng review.
- R26 — `components/shared` được import `lib/api/error.ts` và `load-error.ts` (chỉ hiển thị) — không tốn gì.
- R27 — Gộp các lỗi nhỏ T13 (cột trạng thái, SlotText, chú thích) — thêm một vòng review.
- R28 — `Sheet.dismissible`; ConfirmSheet khoá khi đang chạy — không tốn gì.
- R29 — `Sheet.scrollable` (ScrollView trực tiếp, cao tối đa 85%) — có thể lộ lỗi gorhom trên máy.
- R30 — Sheet cung cấp context; ô nhập tự chọn input của sheet — thêm một vòng review.
- R31 — `activeFilterCount` không tính `q` và `sort` — thay đổi chỉ sort không hiện trạng thái "không có kết quả" (đúng).
- R32 — Spinner kéo-làm-mới chỉ cho lần kéo; chặn end-reached khi đang tải lại — thêm một vòng review.
- R33 — Cài `react-hook-form` + `@hookform/resolvers` (bản web) — một dependency để gỡ nếu sai.
- R34 — Nhãn đã có nguyên văn trong hằng số web thì dùng lại, không chép vào `MOBILE_LABELS` — đổi một import.
- R35 — Đổi người dùng khi đăng nhập lại → reset điều hướng về "/" — một lần remount.
- R36 — Lớp đã đăng nhập tự quản đồng hồ hết hạn phiên (không dựa banner) — refactor nhỏ.
- R37 — Gộp lỗi nhỏ T16 (onSuccess ngoài try, cảnh báo font, banner đọc một lần, toast trên sheet) — thêm một vòng review.
- R38 — `MOBILE_ROUTES.start = "/"` thay chuỗi "/" — không tốn gì.
- R39 — Nav chỉ báo lỗi quyền khi chưa có dữ liệu; refetch lỗi giữ quyền đã biết — quyền bị thu hồi còn hiện tới lần refetch thành công (BE vẫn kiểm).
- R40 — Gộp lỗi nhỏ T17 (inset theo tab bar, gộp className, CenteredSpinner, tài liệu nav-config) — thêm một vòng review.
- R41 — Kho mặc định lưu theo từng `userId`; theme/âm/rung theo thiết bị — người dùng chọn lại một lần sau nâng cấp.
- R42 — Gộp lỗi nhỏ T18 (test phiên, test đăng xuất, định dạng vào hằng số, nút xác nhận không đỏ) — thêm một vòng review.
- R43 — Cài `expo-asset` (expo-doctor yêu cầu cho expo-audio) — không tốn gì.
- R44 — `ScanField` `pending` chỉ hiện spinner và vẫn gửi (như web); `disabled` chặn — trạm phải tự chặn bấm 2 lần trong hàng đợi.
- R45 — Bộ khử trùng quét trượt cửa sổ theo mỗi lần thấy mã: mã giữ trước camera chỉ tính một lần — hàng giống nhau cần rời khung 1,5 s.
- R46 — Camera đọc lại quyền khi app quay lại foreground — không tốn gì.
- R47 — `ScanField` bị `disabled` bỏ cả mã từ camera — trạm tắt giữa chừng mất mã nó không cần.
- R48 — Gộp lỗi nhỏ T19 (một scanner mỗi ô, parity ScanInput web, hook phản hồi dùng chung, đường dẫn file âm) — thêm một vòng review.
- R49 — Cài `expo-dev-client`; `start/android/ios` dùng `--go` (Expo Go mặc định), thêm `start:dev` — một dependency và một script.
- R50 — Bỏ `WAREHOUSE_IDS` thời mock khỏi `status-types.ts` (adapted) thay vì loại khỏi coverage — thêm lại khi soát sync nếu cần.
- R51 — Khai báo `jiti@1.21.7` vì `app.config.ts` import trực tiếp — không tốn gì.
- R52 — Review tổng chia 3 reviewer theo mảng (diff 1,3 MB không vừa một reviewer) — lỗi xuyên mảng có thể lọt (đã giảm bằng rủi ro chéo được nêu tên).
- R53 — Thay đổi `.claude/settings.json`, hook, `CLAUDE.md`/`AGENTS.md` để người dùng duyệt — guardrail còn yếu sau `cd` tới khi duyệt.
- R54 — Coverage thành cổng merge (domain 90/90 theo file, components 70 tổng thư mục; features thêm ở PR feature đầu) — validate chậm hơn.
- R55 — `Can` (verbatim → adapted) và `PermissionBoundary` giữ quyền đã biết khi refetch lỗi — quyền bị thu hồi còn hiện tới lần refetch thành công (BE vẫn kiểm).
- R56 — Đăng nhập lại giữ token hiện tại tới khi commit, chỉ dọn token của chính lần thử, thu hồi không chờ, bỏ qua 401 không token, xoá dữ liệu phiên không chủ, đăng xuất token lưu mà không có chủ — thay đổi `auth-session` (có test).
- R57 — Kiểm tra zod khi đọc store/prefs đã lưu; hỏng thì về mặc định — không tốn gì.
- R58 — Mock gorhom render qua portal như thư viện — vài test phải truyền prop thay vì context.
- R59 — Gộp lỗi nhỏ ui/infra vào đợt sửa tổng (primitive khoá khi lên `main`) — đợt sửa lớn hơn.
- R60 — Để P1: adapter ListScreen + khử trùng, ghi chú BottomActionBar, kiểu global tsconfig — làm cùng màn đầu tiên cần.
- R61 — Đợt sửa tổng chạy 3 fixer tuần tự từ một danh sách, rồi một re-review — tốn thêm điều phối.
- R62 — Gác các lỗi nhỏ còn lại của re-review (mục 3) — một sheet xác nhận ở P1 có thể kẹt tới khi mở lại.
