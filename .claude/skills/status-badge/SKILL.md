---
name: status-badge
description: Use when adding a new status value, wiring a status into UI, or debugging wrong status colors in StockFlow Mobile — covers the status-map tone priority, Vietnamese labels, why StatusDot must never be edited, and that status-map is synced from the web repo.
---

# StatusDot & status-map

`<StatusDot>` (`src/components/shared`) là cách **duy nhất** hiển thị trạng thái trên mobile — thay `<StatusBadge>` của web (spec §4.4). Một component
duy nhất xử lý mọi trạng thái của mọi domain: nó tra tone từ map rồi render chấm màu + nhãn Việt.

## Quy tắc số một

Thêm trạng thái mới → **không sửa `StatusDot`**, và **không sửa `status-map.ts` ở mobile cho tới khi web đã đổi**: bảng tone và nhãn là dữ liệu
đồng bộ từ web (spec §6, §9). Sửa component để xử lý một trạng thái cá biệt là phá vỡ thiết kế generic.

## Các file liên quan — đừng nhầm

| File                             | Mode (trong `port-manifest.json`) | Vai trò                                                                                                                                                                                                                                                                         |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/constants/statuses.ts`      | `verbatim`                        | Union/hằng trạng thái nguyên văn theo docs — nguồn cho zod enum, status-map, lifecycle. **Không sửa tay**                                                                                                                                                                       |
| `src/lib/status-map.ts`          | `adapted`                         | **File canonical.** `TONE`, `toneOf()`, `STATUS_LABEL_VI`, `statusLabelVi()` (export); `STATUS_LABEL_VI_BY_DOMAIN` là const **nội bộ**, không export — chỉ đi qua `statusLabelVi()`. Type `SemanticTone`/`StatusDomain` lấy từ `lib/domain/status-types.ts` thay vì `mock-data` |
| `src/lib/domain/status-map.ts`   | `verbatim`                        | Chỉ re-export. Code mới import từ đây. **Không sửa tay**                                                                                                                                                                                                                        |
| `src/lib/domain/status-types.ts` | `adapted`                         | Các type trạng thái / `SemanticTone` / `StatusDomain` mà status-map dùng                                                                                                                                                                                                        |

## Cách dùng

```tsx
<StatusDot domain="order" status="Pending Payment" />
<StatusDot domain="inventory" status="Quarantine" size="md" />
```

Props: `domain` (`StatusDomain`), `status` (string), `size` `"sm" | "md"`. Hiển thị nhãn Việt; **nhấn giữ** hiện `"Nhãn Việt — English Original"`
(N7: mobile không có hover) để đối chiếu với docs và BE. Screen reader nghe `accessibilityLabel` = nhãn Việt, rồi `accessibilityHint` = chuỗi gốc tiếng Anh.

`domain` không dùng để tra tone (`toneOf` chỉ nhận `status`) nhưng **dùng để tra nhãn**: `statusLabelVi(status, domain)` tra bảng riêng theo domain
(`STATUS_LABEL_VI_BY_DOMAIN[domain]`) **trước**, rồi mới tới bảng chung `STATUS_LABEL_VI`; không có ở cả hai thì hiện nguyên `status`. Truyền sai `domain` = sai nhãn.

## Thêm một trạng thái mới — quy trình mobile

**1. Lấy tên nguyên văn từ docs.** Mở module trong `D:\FPTU\docs\docs\`, bảng "Trạng thái / Vòng đời". Chép **chính xác** chuỗi — không dịch,
không đổi hoa thường, không bỏ dấu cách. `"Pending Approval"` chứ không phải `"PendingApproval"`.

**2. Sửa `src/lib/status-map.ts` ở web** (repo `stockflow-ui`, PR riêng — session mobile không sửa repo web): thêm vào đúng nhóm trong `TONE` và
nhãn tiếng Việt vào `STATUS_LABEL_VI` (bảng chung). Nếu cùng một wire value mang nghĩa khác giữa các domain (vd `REJECTED`: PO là "NCC từ chối", điều chỉnh tồn là
"Từ chối") thì **ghi đè theo domain** trong `STATUS_LABEL_VI_BY_DOMAIN` (const nội bộ của file, không export; tone không đổi) thay vì đổi nhãn chung. Nếu là giá trị mới
của union thì thêm vào `src/constants/statuses.ts` ở web.

**3. Đồng bộ về mobile** sau khi web vào `origin/develop` và người dùng đã `git fetch` ở repo web:

```bash
pnpm sync:pull src/constants/statuses.ts        # nếu constants đổi (verbatim)
pnpm sync:check                                  # src/lib/status-map.ts → source-changed
git -C ../stockflow-ui diff <sourceBlob> origin/develop:src/lib/status-map.ts   # xem web đổi gì
# port phần đổi vào src/lib/status-map.ts của mobile (giữ import types từ lib/domain/status-types)
pnpm sync:ack src/lib/status-map.ts              # ghi sourceBlob mới SAU KHI đã rà
```

Nếu union type đổi, cập nhật `src/lib/domain/status-types.ts` (adapted) cho khớp rồi `pnpm sync:ack` file đó nếu manifest báo lệch.
Chạy `pnpm run validate` để chắc `sync:check` xanh.

## Chọn tone nào — thứ tự ưu tiên

Khi một trạng thái có vẻ hợp nhiều tone, áp dụng thứ tự:

```
special > danger > positive > warning > info > muted > neutral
```

| Tone       | Ý nghĩa                                                       | Ví dụ                                            |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------ |
| `special`  | hoàn tiền, sản xuất — tách khỏi positive/info để dễ phân biệt | Refunded, Partially Refunded, In Production      |
| `danger`   | lỗi, huỷ, hết hàng, thất bại                                  | Cancelled, Rejected, Failed, Out of stock        |
| `positive` | thành công, hoàn tất, còn hàng                                | Confirmed, Approved, Completed, Delivered        |
| `warning`  | cảnh báo, chờ, sắp hết                                        | Pending Approval, On Hold, Quarantine, Low stock |
| `info`     | đang tiến hành, thông tin                                     | In Progress, In Transit, Shipped                 |
| `muted`    | đã đóng, terminal, ẩn                                         | Closed, Inactive, Archived, Voided               |
| `neutral`  | nháp, trung tính                                              | Draft, Created, Pending, New                     |

Phân biệt hay nhầm: `Closed` là `muted` (kết thúc bình thường) còn `Cancelled` là `danger` (kết thúc bất thường). `Pending` là `neutral` nhưng
`Pending Approval` là `warning` — vì nó đang chặn một luồng công việc, cần người xử lý.

## Màu chấm

Chấm dùng thang `dot-*` (positive/info/warning/danger/special; `neutral`/`muted` dùng màu status gốc) — xem `design-tokens.md`. Màu `dot-*` **chỉ** cho chấm/icon,
không làm chữ.

## Debug chấm sai màu

1. Trạng thái có trong `TONE` không? Không có → `toneOf()` trả về fallback.
2. Chuỗi khớp **chính xác** chưa? Sai hoa thường hoặc thừa dấu cách là không khớp.
3. Trạng thái có bị liệt kê ở **hai** nhóm tone không? Tone ưu tiên cao hơn thắng (`special > danger > …`, thứ tự `PRIORITY` trong `toneOf`) — xoá bản trùng (ở web, rồi sync).
4. Token `dot-*` / semantic có trong `src/lib/tokens.ts` và `tailwind.config.js` chưa? Thiếu token → chấm mất màu.
5. Sai **nhãn** (không phải màu): `domain` truyền đúng chưa? Có mục ghi đè trong `STATUS_LABEL_VI_BY_DOMAIN[domain]` che nhãn chung không?
6. `pnpm sync:check` có báo `src/lib/status-map.ts` lệch không? Có thể mobile đang giữ bản map cũ.

## Cấm

- Tự tô màu trạng thái trong màn hình thay vì dùng `StatusDot`; viết badge/chấm riêng cho một module.
- Sửa `StatusDot`, hoặc sửa tay `src/constants/statuses.ts` / `src/lib/domain/status-map.ts` (verbatim — hook chặn).
- Sửa `src/lib/status-map.ts` ở mobile mà không có thay đổi tương ứng ở web (sẽ lệch khi web đổi).
- Dịch tên trạng thái trong code hoặc trong docs-facing text — nhãn Việt chỉ sống ở `STATUS_LABEL_VI` / `STATUS_LABEL_VI_BY_DOMAIN`, chuỗi gốc luôn là tiếng Anh theo docs.
