---
description: Đồng bộ với web — port-manifest (verbatim/adapted), sync:*, quy tắc "sửa web trước", parity gaps G1–G18
paths:
  - "port-manifest.json"
  - "scripts/sync-*.mjs"
  - "eslint.config.mjs"
  - "src/constants/**"
  - "src/lib/**"
  - "src/features/**"
---

# Đồng bộ với web

Nguồn: spec §6, §7, D7. Nghiệp vụ, mã quyền, action-gating, thông báo lỗi và hằng số **đồng bộ 1-1 với web**; nguồn web = `origin/develop` của
`stockflow-ui` (đọc từ repo ở `STOCKFLOW_WEB_REPO`, mặc định `../stockflow-ui`). Xung đột nghiệp vụ → docs thắng; hợp đồng BE = `origin/develop` của BE.

## Hai chế độ trong `port-manifest.json`

| Mode       | Nghĩa                                              | `pnpm sync:check` kiểm                                                                        | Sửa tay?                |
| ---------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------- |
| `verbatim` | Bản sao y nguyên                                   | Nội dung target == `git show <webRef>:<source>`                                               | **KHÔNG** (hook chặn)   |
| `adapted`  | Bản chuyển thể (đổi import, `vi`→`jest`, thay API) | Blob hiện tại của source tại `webRef` == `sourceBlob` đã ghi; khác → "web đã đổi, cần rà lại" | Có, theo quy trình dưới |

Entry: `{ source, target, mode, sourceBlob, note? }`. `adapted` **phải có `note`** nói rõ đã đổi gì so với web.

## Lệnh

| Lệnh                                                   | Việc                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `pnpm sync:check`                                      | Đọc-only, **không fetch**; liệt kê file lệch (exit ≠ 0). Nằm trong `pnpm run validate` |
| `pnpm sync:add <source…> [--target] [--mode] [--note]` | Thêm file mới vào manifest, copy nội dung web làm điểm xuất phát, ghi `sourceBlob`     |
| `pnpm sync:pull <target…>`                             | Ghi lại file `verbatim` từ web + cập nhật `sourceBlob`                                 |
| `pnpm sync:ack <target…>`                              | Sau khi đã rà và sửa tay file `adapted`, ghi `sourceBlob` mới (không đụng file)        |

Muốn so với web mới nhất: người dùng tự `git fetch` ở repo web — script và agent **không** fetch, không sửa repo web.

## Quy tắc

1. **Sửa web trước rồi `pnpm sync:pull`.** File `verbatim` không sửa tay; hook `guard-protected-files` chặn Edit/Write mọi target `verbatim`, chỉ
   `sync:pull` được ghi. Cần đổi nội dung → thay đổi ở repo web (PR riêng, ngoài session này) → web vào `origin/develop` → `git fetch` → `sync:pull`.
2. **Lint đỏ ở file `verbatim`** vì luật chỉ có ở mobile → **không sửa file**. Thêm một block theo file vào mảng `VERBATIM_OVERRIDES` trong
   `eslint.config.mjs`, kèm 1 dòng lý do (file nào, luật nào, vì sao web được miễn).
3. **Chuyển `verbatim` → `adapted`:** sửa `port-manifest.json` trước (`mode`, `note`), rồi mới sửa file; sửa xong `pnpm sync:ack <target>`.
4. **`sync:check` báo `source-changed` (adapted):** đọc diff phía web (`git -C <repo web> diff <sourceBlob> <webRef>:<source>`), port thay đổi cần thiết vào
   file mobile, rồi `pnpm sync:ack <target>`.
5. **Phạm vi copy (§6.2):** `src/constants/**` toàn bộ = verbatim (giữ cả file load-plan/vehicle-type để `index.ts` y nguyên, không dùng tới); `lib/format`,
   `lib/validation`, `lib/api/{error,idempotency,page-schema,load-error,stale-refetch,query-factory,query-client}`, `lib/domain/lifecycle`, `lib/status-map`,
   `lib/auth/{me-permissions,login-error}`, `lib/references` = verbatim nếu không import API web / `mock-data`, còn lại adapted;
   `features/<in-scope>/{schemas,input-schemas,lifecycle,selectors,errors,status-helpers,…}.ts` = verbatim/adapted theo import;
   `features/*/{api,queries,mutations}.ts` = **adapted** (đổi client, bỏ đường BFF, kv-store thay sessionStorage); test của các file trên = adapted
   (`vi.*` → `jest.*`, giữ nguyên case); component `*.tsx` = **không copy**, viết mới cho RN.
6. **Hằng số chỉ của mobile** (`MOBILE_ROUTES`, `NAV_GROUPS`, nhãn mobile, ngưỡng UI) → `src/constants/mobile/**` (không thuộc manifest). Không thêm vào
   `src/constants/*.ts` verbatim.
7. **Giữ hành vi web ở các điểm lệch (D7).** Muốn sửa → đề xuất sửa web trước, rồi sync. Mobile **không** tự sửa.
8. Thiếu sót phía BE (không phải lỗi mobile): không có API cất hàng, nhận hàng chuyển kho, "kho của tôi", refresh token; BE bỏ qua `X-Warehouse-Id`.

## Parity gaps — giữ đúng như web, đừng "sửa"

| #   | Khu vực     | Điểm lệch trên web                                                                                                                                    | Mobile                                                                            |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| G1  | Receipt     | Form kiểm đếm chưa nối BR-02 (dung sai) và BR-03 (lô/hạn dùng) phía client                                                                            | Giữ; BE vẫn chặn                                                                  |
| G2  | Receipt     | Tên kết quả QC không thống nhất: panel "Chấp nhận/Từ chối", dialog "Đạt/Không đạt"                                                                    | Giữ                                                                               |
| G3  | Receipt     | Nút "Tạo phiếu nhận" không khoá khi chưa chọn PO (zod báo lỗi)                                                                                        | Giữ                                                                               |
| G4  | Receipt     | `GOODS_RECEIPT_PERMISSIONS.approve` không dùng; chip lọc PO chỉ đọc từ URL                                                                            | Giữ                                                                               |
| G5  | Chung       | Người nhận / người duyệt / `orderId` hiển thị UUID thô (BE không có API tra tên)                                                                      | Giữ; UUID đầy đủ hiện khi nhấn giữ (N7)                                           |
| G6  | Chung       | Web gửi `X-Warehouse-Id` nhưng không nơi nào set và BE không đọc                                                                                      | **Không gửi**                                                                     |
| G7  | Transfer    | Xuất kho không invalidate cache tồn kho                                                                                                               | Giữ                                                                               |
| G8  | Inventory   | Danh sách điều chỉnh hỗ trợ `sort` nhưng không gửi                                                                                                    | Giữ                                                                               |
| G9  | Order       | Huỷ đơn còn gửi field `reason` đã deprecated                                                                                                          | Giữ                                                                               |
| G10 | Order       | Câu "Bạn chỉ có quyền xem đơn hàng." hiện cả với người đủ quyền ở Returned/Refunded/Partially Refunded/Completed                                      | Giữ                                                                               |
| G11 | Picking     | Bộ lọc trạng thái có SHORT nhưng BE không bao giờ đặt                                                                                                 | Giữ                                                                               |
| G12 | Put-back    | Link số đơn sang picking detail không kiểm `pick-lists:VIEW_PAGE`                                                                                     | Giữ                                                                               |
| G13 | Fulfillment | zod enum strict cho task/pick-line: giá trị BE lạ làm hỏng màn                                                                                        | Giữ                                                                               |
| G14 | Packing     | Trạm đơn bỏ qua tính năng kit của BE; lý do ép kit không bắt buộc phía client; phiên chuyển kho CANCELLED không có nút mở lại                         | Giữ                                                                               |
| G15 | Shipping    | Câu "không thao tác" của FTL không bao giờ hiện; `removeShipment` gate theo `addShipment`; `shipmentIdsMax` không enforce; `printedAt` không hiển thị | Giữ                                                                               |
| G16 | Picking     | `ReverifyDialog` import nhưng không tới được trên trang picking                                                                                       | Giữ                                                                               |
| G17 | Auth        | `mustChangePassword` của `/me` bị bỏ qua                                                                                                              | Giữ                                                                               |
| G18 | Chuỗi       | Một số chuỗi hardcode trong component web                                                                                                             | Mobile đưa vào `src/constants/mobile/`; đề xuất web chuyển vào constants rồi sync |
