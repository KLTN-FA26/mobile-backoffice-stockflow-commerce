---
description: Quét mã — ScanField, màn scanner (một lần / liên tục), phản hồi, hàng đợi quét giữ đúng logic web
paths:
  - "src/components/mobile/{ScanField,CameraScanner,ScanFeedback}*"
  - "src/hooks/use-scan-feedback.ts"
  - "src/lib/platform/{haptics,sound}*"
  - "app/(app)/scanner.tsx"
  - "src/features/**/components/**"
---

# Quét mã

Nguồn: spec §3.4 (D1: Android + iOS, quét bằng **camera**, luôn cho gõ tay).

## `ScanField` — mọi chỗ nhập mã

`components/mobile/ScanField`: ô nhập (gõ tay, Enter để gửi, Esc/✕ xoá) + nút camera. Mono, `autoCapitalize="characters"`, `autoCorrect={false}`,
cao 52px. Dùng cho **mọi** chỗ nhập mã: vị trí, SKU/barcode, mã kiện, mã khu QC, LPN. Không tự dựng `TextInput` mã riêng.

## Màn `scanner` — `app/(app)/scanner.tsx`

Modal toàn màn (`presentation: fullScreenModal`), `expo-camera` `CameraView`; định dạng: Code128, Code39, EAN-13/8, UPC-A/E, QR, DataMatrix.

| Chế độ       | Dùng ở                | Hành vi                                                                                                       |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Một lần**  | `ScanField` thường    | đọc được → đóng → trả mã về ô gọi                                                                             |
| **Liên tục** | trạm đóng gói, xếp xe | camera mở, mỗi mã đọc được vào hàng đợi của trạm; **cùng mã trong 1,5s bỏ qua**; phản hồi hiện đè trên camera |

- Trả kết quả qua `scan-bus` (zustand, không persist) theo `requestId` của lần mở — không truyền callback qua route params.
- Từ chối quyền camera → thông báo + nút mở Cài đặt; **vẫn gõ tay được**.

## Phản hồi — `useScanFeedback`

- Giữ ngữ nghĩa web: **đúng** = xanh + tự tắt sau 1,5s; **sai** = đỏ + giữ tới lần quét sau.
- Thêm haptics (N10): đúng `notificationAsync(Success)`, sai `notificationAsync(Error)` — kho ồn, người dùng không nhìn màn hình.
- Âm báo qua `expo-audio` (2 file âm ngắn: đúng 1046Hz/90ms, sai 220Hz/320ms), tôn trọng cờ `muted`; công tắc âm thanh/rung ở tab Tài khoản.
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

Hàng đợi quét · gửi lại / bỏ qua · danh sách quét lỗi · chặn bấm 2 lần (ref). Tab Tài khoản có mục **"Kiểm tra quét mã"** để thử camera/âm/rung.
