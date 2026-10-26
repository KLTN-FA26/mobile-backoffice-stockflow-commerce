import { z } from "zod";

export type AppConfig = { ok: true; apiUrl: string } | { ok: false; reason: "missing" | "invalid" };

// Only http(s): `new URL("localhost:8080/api/v1")` parses with the scheme "localhost:", and
// `javascript:`, `ftp:` or `mailto:` are URLs too, but none of them is an API base.
const apiUrlSchema = z.url({ protocol: /^https?$/ });

// The base the client appends `/identity/...` to: it ends with the API version, behind an optional
// path prefix (a gateway), with no query or fragment. Checked on the string (the scheme already
// passed `apiUrlSchema`): React Native's `URL` does not implement every getter.
const API_BASE = /^[^:]+:\/\/[^/?#]+(?:\/[^/?#]+)*\/api\/v1$/;

/**
 * `EXPO_PUBLIC_API_URL` đã gồm `/api/v1`; bỏ `/` cuối để ghép đường dẫn không bị `//`. A url
 * without that base is invalid: every request would reach the wrong path, and the login would fail
 * as if the password were wrong instead of showing the configuration error.
 */
export function readAppConfig(env: Record<string, string | undefined>): AppConfig {
  const raw = env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return { ok: false, reason: "missing" };
  if (!apiUrlSchema.safeParse(raw).success) return { ok: false, reason: "invalid" };
  const apiUrl = raw.replace(/\/+$/, "");
  if (!API_BASE.test(apiUrl)) return { ok: false, reason: "invalid" };
  return { ok: true, apiUrl };
}

// Expo inlines EXPO_PUBLIC_* only for the literal `process.env.EXPO_PUBLIC_X` expression; passing
// the whole `process.env` object would be empty in a production bundle.
export const APP_CONFIG = readAppConfig({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
