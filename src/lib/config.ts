import { z } from "zod";

export type AppConfig = { ok: true; apiUrl: string } | { ok: false; reason: "missing" | "invalid" };

// Only http(s): `new URL("localhost:8080/api/v1")` parses with the scheme "localhost:", and
// `javascript:`, `ftp:` or `mailto:` are URLs too, but none of them is an API base.
const apiUrlSchema = z.url({ protocol: /^https?$/ });

/** `EXPO_PUBLIC_API_URL` đã gồm `/api/v1`; bỏ `/` cuối để ghép đường dẫn không bị `//`. */
export function readAppConfig(env: Record<string, string | undefined>): AppConfig {
  const raw = env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return { ok: false, reason: "missing" };
  if (!apiUrlSchema.safeParse(raw).success) return { ok: false, reason: "invalid" };
  return { ok: true, apiUrl: raw.replace(/\/+$/, "") };
}

// Expo inlines EXPO_PUBLIC_* only for the literal `process.env.EXPO_PUBLIC_X` expression; passing
// the whole `process.env` object would be empty in a production bundle.
export const APP_CONFIG = readAppConfig({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
