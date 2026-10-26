---
description: Quét mã — ScanField, màn scanner (một lần / liên tục), phản hồi, hàng đợi quét giữ đúng logic web
paths:
  - "src/components/mobile/scan/**"
  - "src/lib/platform/feedback-effects.ts"
  - "src/hooks/use-scan-feedback.ts"
  - "src/hooks/use-transient-feedback.ts"
  - "app/(app)/scanner.tsx"
  - "src/features/**/components/**"
---

# Quét mã

Nguồn: spec §3.4 (D1: Android + iOS, quét bằng **camera**, luôn cho gõ tay).

## `ScanField` — mọi chỗ nhập mã

`components/mobile/scan/ScanField`: ô nhập (gõ tay, Enter để gửi, Esc/✕ xoá) + nút camera. Mono, `autoCapitalize="characters"`, `autoCorrect={false}`,
cao 52px. Dùng cho **mọi** chỗ nhập mã: vị trí, SKU/barcode, mã kiện, mã khu QC, LPN. Không tự dựng `TextInput` mã riêng.

- Enter → `trim()` → `normalize?` → rỗng thì bỏ qua → `onSubmit(code)` + xoá ô; bàn phím và focus giữ nguyên cho mã kế tiếp. Nút ✕ (nhãn "Xoá mã")
  hiện khi ô có chữ; Esc chỉ có ở bàn phím cứng.
- `pending` **chỉ** hiện vòng quay ("Đang xử lý…"): Enter vẫn gửi (và xoá ô), nút camera vẫn dùng được — như `ScanInput` web (chỉ truyền
  `disabled` cho `useScanInput`): máy quét gõ liên tục, mã tới lúc đang xử lý được gửi chứ không dính vào mã sau; hàng đợi/chống trùng là việc của trạm (R44).
- `disabled`: khoá ô (`editable={false}`), Enter và nút camera không làm gì, và mã từ camera đang mở cũng **bị bỏ** — ô khoá thì không nhận mã nào (R47).
  Ô hết khoá → tự lấy lại focus (như `useScanInput` web) để mã kế tiếp của máy quét không rơi mất; focus lúc mount là việc của `autoFocus`.
- `maxLength` và `hint` như `ScanInput` web: `hint` hiện dưới ô (chữ phụ) khi chưa có kết quả quét; có kết quả thì kết quả thế chỗ.
- Mã từ camera đi cùng đường `trim` → `normalize` → `onSubmit`.
- Chạm camera lần hai khi scanner của ô này chưa đóng → không mở thêm (R48): `CameraScanner` báo đóng qua `scan-bus`
  (`publishScannerClosed`, lúc unmount — mọi cách đóng: nút, mã đầu tiên, vuốt/back), nên ô không cần biết navigator.
- `feedback` hiện dưới ô (`ScanFeedbackBanner`) và, khi camera liên tục đang mở, được chuyển sang camera (`publishScanFeedback`) mỗi khi là object mới.
- Tối đa **một** đăng ký `scan-bus` cho mỗi ô: mở camera lần nữa thay đăng ký cũ; unmount thì huỷ; chế độ một lần huỷ sau mã đầu tiên.
- **Không đặt `ScanField` trong `Sheet`** (khi `__DEV__`, `useWarnInSheet` ghi `console.warn`): camera mở route toàn màn đè lên sheet, logic bàn phím
  của sheet xê dịch ô trong lúc máy quét gõ, và trạm giữ ô quét ngay trên màn (thẻ việc đang làm). Cần nhập mã → đặt `ScanField` trên màn, sheet chỉ để
  chọn / lọc / xác nhận.

## Màn `scanner` — `app/(app)/scanner.tsx`

Modal toàn màn (`presentation: fullScreenModal`), `expo-camera` `CameraView`; định dạng: Code128, Code39, EAN-13/8, UPC-A/E, QR, DataMatrix.

| Chế độ       | Dùng ở                | Hành vi                                                                                                                               |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Một lần**  | `ScanField` thường    | đọc được → đóng → trả mã về ô gọi                                                                                                     |
| **Liên tục** | trạm đóng gói, xếp xe | camera mở, mỗi mã đọc được vào hàng đợi của trạm; **cùng mã thấy lại trong 1,5s bỏ qua** (cửa sổ trượt); phản hồi hiện đè trên camera |

- Trả kết quả qua `scan-bus` (module in-memory, không persist) theo `requestId` của lần mở — không truyền callback qua route params.
- Params: `requestId` (bắt buộc), `mode` (`single` | `continuous`, mặc định `single`), `title` (mặc định "Mở camera quét mã"). Thiếu `requestId` hoặc
  `mode` lạ → không render, đóng ngay (quay lại; mở bằng link mà không có màn phía sau → về `/`). Dùng `navigation` của màn, không dùng `router`
  imperative trong lần render đầu (chưa sẵn sàng khi scanner là màn đầu tiên).
- Một lần: `onBarcodeScanned` có thể báo nhiều khung hình trước khi màn đóng → chặn bằng ref, chỉ mã đầu được gửi và `onClose` chạy một lần.
- Liên tục: lọc trùng theo **từng mã** (`createScanDeduper`), cửa sổ **trượt**: mỗi lần camera thấy mã — nhận hay bỏ — đều tính lại 1,5s, nên mã giữ trước
  camera chỉ tính **một lần** và chỉ được nhận lại khi đã ra khỏi khung ≥ 1,5s (R45: đóng gói không giới hạn over-pack phía client, đếm lại mỗi 1,5s sẽ
  sinh dòng ảo). Phản hồi đúng tự tắt sau 1,5s, sai giữ tới kết quả sau.
- Quyền: đang tải → màn trống; chưa cấp, còn hỏi được → "Cho phép dùng camera" + "Nhập tay"; bị từ chối hẳn → câu hướng dẫn + "Mở Cài đặt"
  (`Linking.openSettings`) + "Nhập tay"; **vẫn gõ tay được**. Hook của expo chỉ đọc quyền lúc mount → khi chưa cấp, đọc lại (`getPermission`, phần tử thứ ba)
  mỗi lần app về foreground (`AppState` `"active"`), bỏ lắng nghe khi đã cấp/unmount (R46).
- Nút "Đóng" luôn ở header. Modal phủ cả `SessionExpiryBanner` (banner trao inset trên = 0 cho màn bên dưới) nên `CameraScanner` tự đo mép trên
  bằng `SafeAreaView` native.
- Plugin `expo-camera` trong `app.config.ts`: chỉ quyền camera (`microphonePermission: false`, `recordAudioAndroid: false`) — app không quay video.
  **Bản iOS đầu tiên lên App Store phải kiểm ITMS-90683** (thiếu purpose string kiểu `NSMicrophoneUsageDescription` vì `expo-camera`/`expo-audio` vẫn link API micro): xem
  README, mục "Lần build iOS đầu tiên lên App Store". Đừng đổi cấu hình camera trước khi biết kết quả.
- **Quyết định còn mở cho trạm quét liên tục (P3/P4).** Trên iOS, `presentation: "fullScreenModal"` phủ cả `SessionExpiryBanner` lẫn `ReloginSheet` (cả hai nằm ở
  layout `(app)` bên dưới). Trong một ca quét liên tục dài, phiên có thể hết hạn (hoặc 401) mà người dùng không thấy gì cho tới khi đóng camera — mã quét tiếp theo
  sẽ lỗi 401. Trước khi làm trạm đóng gói / xếp xe chọn một: báo hết phiên **ngay trong `CameraScanner`** (đọc `useSessionExpiry` như `SessionExpiryBanner`), hay đóng camera và trả về
  trạm khi phiên sắp hết. Mới ghi nhận ở iOS; kiểm cả Android khi có trạm đầu tiên.

## Phản hồi — `useScanFeedback`

- Giữ ngữ nghĩa web: **đúng** = xanh + tự tắt sau 1,5s; **sai** = đỏ + giữ tới lần quét sau.
- Thêm haptics (N10): đúng `notificationAsync(Success)`, sai `notificationAsync(Error)` — kho ồn, người dùng không nhìn màn hình.
- Âm báo qua `expo-audio` (2 file âm ngắn: đúng 1046Hz/90ms, sai 220Hz/320ms — `assets/sounds/*.wav`, sinh bằng `scripts/generate-scan-tones.mjs`),
  tôn trọng cờ `muted`; công tắc âm thanh/rung ở tab Tài khoản. Cờ đọc lúc quét (`useAppStore.getState()`).
- Âm và rung nằm ở `src/lib/platform/feedback-effects.ts` (fire-and-forget, nuốt lỗi, chỉ log khi `__DEV__`); component chỉ dùng qua `useScanFeedback`.
- Nhịp hiển thị (đúng tắt sau 1,5s, sai giữ) nằm ở một chỗ: `useTransientFeedback` (`src/hooks/use-transient-feedback.ts`), dùng chung cho
  `useScanFeedback` và phản hồi đè trên camera liên tục.
- Screen reader: `AccessibilityInfo.announceForAccessibility`.

## Giữ nguyên logic nghiệp vụ của web

Không "cải tiến" các quy tắc dưới đây — chúng là parity (xem `web-parity.md`):

| Trạm                        | Quy tắc                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đóng gói (đơn & chuyển kho) | Hàng đợi **tuần tự**, `scanId` mới mỗi lần quét. Lỗi nghiệp vụ 4xx → đỏ. Lỗi tạm thời (status 0, 5xx, `LOCK_TIMEOUT`, `OPTIMISTIC_LOCK`) → **dừng hàng đợi**, banner "Gửi lại lần quét này" (cùng `scanId`) / "Bỏ qua". Không giới hạn over-pack phía client                                       |
| Xếp xe                      | FIFO có khử trùng, `scanId = scanIdFor(loadId, code)`. Chỉ báo thành công khi load trả về liệt kê kiện đã lên xe. Danh sách quét lỗi lưu kv-store `session:*`; lỗi fatal đổ phần còn lại của hàng đợi vào danh sách lỗi. Kiểm tra client: trim, ≤ 48, ASCII in được `/^[\x21-\x7E]+$/`, upper-case |
| Lấy hàng                    | Mã vị trí / mã hàng phải thuộc danh sách đã tải (layout kho + mã của task); sai → lỗi tại chỗ, **không gửi**                                                                                                                                                                                       |
| Tra cứu tồn kho             | "Mã SKU" đúng mã, upper-case, chỉ gửi khi submit                                                                                                                                                                                                                                                   |

## Test bắt buộc cho màn Trạm (§8.2)

Hàng đợi quét · gửi lại / bỏ qua · danh sách quét lỗi · chặn bấm 2 lần (`useSubmitLatch`). Tab Tài khoản có mục **"Kiểm tra quét mã"** để thử camera/âm/rung.
