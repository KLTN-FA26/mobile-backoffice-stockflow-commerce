# Kiểm chứng `Intl` trên Hermes

## Mục đích

Các hàm định dạng ngày/tiền/số của web (`src/lib/format/{date,money,number}.ts`) được copy **verbatim** (`port-manifest.json`, `mode: "verbatim"`).
Chúng dựa vào `Intl` với `timeZone: "Asia/Ho_Chi_Minh"` và locale `vi-VN`. Node (ICU 76) cho ra đúng chuỗi mong muốn, nhưng Hermes trên điện thoại
có thể định dạng khác (hoặc ném lỗi). Spike này chạy cùng các hàm đó trên thiết bị thật và so với kỳ vọng.

Phần tự động (đã xong, chạy trên Node trong Jest): `src/lib/format/intl-probe.ts` + `intl-probe.test.ts` — 10 ca, mọi ca phải khớp.
Phần thủ công (**chờ chạy** — thuộc nghiệm thu người dùng, Task 20): chạy màn probe trên Android và iPhone rồi điền bảng bên dưới.

## Cách chạy

1. `pnpm start` (Expo dev server, mặc định cổng 8081).
2. Mở **Expo Go** (SDK 58) trên thiết bị rồi mở đường dẫn tới màn probe:
   - iPhone / Android thật (cùng mạng LAN với máy dev): `exp://<LAN-IP>:8081/--/dev-intl-probe`
   - Android emulator: nhấn `a` trong Expo CLI để mở app, rồi mở `exp://10.0.2.2:8081/--/dev-intl-probe`
     (ví dụ `adb shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8081/--/dev-intl-probe"`).
3. Màn **Kiểm tra Intl (Hermes)** liệt kê từng hàm: tên, `Thực tế`, `Kỳ vọng`, và `OK` / `LỆCH`. Dòng thứ hai (ngay dưới tiêu đề) cho biết nền tảng + phiên bản (`android 34`, `ios 18.x`); dòng thứ ba là số ca khớp (`n/10 OK`).
   Chữ chọn/sao chép được. Ca ném lỗi hiện `THROW: <message>` và tính là `LỆCH`.
4. Chụp màn hình, ghi chuỗi **Thực tế** của mỗi hàm vào cột tương ứng trong bảng (ghi `OK` nếu khớp kỳ vọng, hoặc chuỗi thực tế nếu `LỆCH`).

Màn chỉ có ở bản dev (`__DEV__`); bản release chuyển hướng về `/`. Dừng dev server sau khi chạy xong.

Khi so sánh, khoảng trắng không ngắt (U+00A0) và khoảng trắng hẹp không ngắt (U+202F) được coi như dấu cách thường — các phiên bản ICU chỉ khác nhau ở điểm này
(ví dụ `1.234.567 ₫` có thể dùng U+00A0 trước `₫`).

## Kết quả

Đầu vào `iso = "2026-03-14T17:30:05Z"` (= 00:30:05 ngày 15/3/2026 theo giờ Việt Nam). Kỳ vọng lấy từ Node ICU 76, cùng hàm web.

| Hàm                           | Kỳ vọng                | Android (Hermes) | iPhone (Hermes) |
| ----------------------------- | ---------------------- | ---------------- | --------------- |
| `formatDate(iso)`             | `15 thg 3, 2026`       | OK               | chờ chạy        |
| `formatDateTime(iso)`         | `00:30 15 thg 3, 2026` | OK               | chờ chạy        |
| `formatTime(iso)`             | `00:30:05`             | OK               | chờ chạy        |
| `toLocalIsoDate(iso)`         | `2026-03-15`           | OK               | chờ chạy        |
| `formatMoney(1234567, "VND")` | `1.234.567 ₫`          | OK               | chờ chạy        |
| `formatNumber(1234567.5)`     | `1.234.567,5`          | OK               | chờ chạy        |
| `formatFixed(33.1966, 2)`     | `33,20`                | OK               | chờ chạy        |
| `formatPercent(0.856)`        | `85,6%`                | OK               | chờ chạy        |
| `formatCompactNumber(1500)`   | `1,5 N`                | OK               | chờ chạy        |
| `formatMoney(1234.5, "USD")`  | `$1,234.50`            | OK               | chờ chạy        |

Thiết bị đã chạy: Android emulator Pixel_6 — 10/10 OK (API level 37, Android 17, 2026-10-26) · iPhone — _chờ chạy_ (iOS: …) · Expo Go: 58.0.5 (Android).

## Quyết định theo kết quả

- **Tất cả `OK` trên cả hai nền tảng** → giữ `src/lib/format/*` ở `verbatim`; không đổi gì.
- **Có `LỆCH` ở `date.ts`** (`formatDate`, `formatDateTime`, `formatTime`, `toLocalIsoDate`) → chuyển file đó sang `adapted` theo R3:
  1. Sửa `port-manifest.json` trước (`mode: "adapted"` + `note` nói rõ đã đổi gì), rồi mới sửa file; xong chạy `pnpm sync:ack src/lib/format/date.ts`.
  2. Cài `@date-fns/tz` bằng `pnpm exec expo install @date-fns/tz` (nếu không có trong danh sách expo thì `pnpm add @date-fns/tz`).
  3. Tái hiện đúng chuỗi kỳ vọng bằng `format(new TZDate(iso, "Asia/Ho_Chi_Minh"), pattern, { locale: vi })` (`vi` từ `date-fns/locale`).
  4. Thêm test Jest khẳng định đúng các chuỗi kỳ vọng ở bảng trên (cùng input `2026-03-14T17:30:05Z`).
- **Có `LỆCH` ở `money.ts` / `number.ts`** (`formatMoney`, `formatNumber`, `formatFixed`, `formatPercent`, `formatCompactNumber`) → xử lý tương tự cho file đó:
  chuyển sang `adapted`, thay phần phụ thuộc `Intl` bằng cách định dạng thủ công, thêm test Jest pin đúng các chuỗi kỳ vọng.
- **Có `THROW`** (ví dụ `RangeError` vì thiếu `timeZone` hoặc `notation: "compact"`) → xử lý như `LỆCH` cho file chứa hàm đó.

## Camera

_Để trống — kết quả spike camera/quét mã (Task 20) ghi ở đây._
