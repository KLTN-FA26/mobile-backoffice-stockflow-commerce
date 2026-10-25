# StockFlow Backoffice (mobile)

Ứng dụng back-office StockFlow cho điện thoại (Expo SDK 58 + Expo Router), port từ web back-office.

## Yêu cầu

- Node 22
- pnpm 10.9 (khai báo trong `packageManager`; không dùng npm/yarn/bun)
- Expo Go SDK 58 trên thiết bị hoặc Android emulator
- BE `be-backoffice-stockflow-commerce` đang chạy với profile `dev`

## Chạy thử

```bash
pnpm install
cp .env.example .env.local
pnpm start
```

Mở bằng Expo Go (quét QR hoặc nhấn `a` để mở trên Android emulator).

`EXPO_PUBLIC_API_URL` đã gồm `/api/v1`:

- Android emulator: `http://10.0.2.2:8080/api/v1` (mặc định trong `.env.example`)
- Máy thật: `http://<IP LAN>:8080/api/v1`

Chạy BE bằng profile `dev` (profile `local` tắt security).

## Lệnh

| Lệnh | Mô tả |
| --- | --- |
| `pnpm start` | `expo start` |
| `pnpm android` | `expo start --android` |
| `pnpm ios` | `expo start --ios` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm export:check` | `expo export` cho android + ios vào `dist/` |
