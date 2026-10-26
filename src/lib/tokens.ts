/**
 * Design tokens: the one file in app/ and src/ that may contain a hex colour. Values equal the web
 * back-office (`globals.css`: `:root` for light, `:root[data-theme="dark"]` for dark), Mode A.
 *
 * Components never read the hex values. `ThemeProvider` turns them into CSS variables
 * (`themeChannels`), `tailwind.config.js` maps every token to `rgb(var(--token) / <alpha-value>)`,
 * and icons or the status bar get hex through `useThemeColors()`.
 *
 * Tailwind loads this file in plain Node (it is required by `tailwind.config.js`), and so does
 * `app.config.ts` (through jiti, for the splash background), so it must not import
 * anything that needs React Native at runtime. Types only.
 */
import type { ViewStyle } from "react-native";

export type Scheme = "light" | "dark";

/** Tokens whose value differs between light and dark. */
type ThemedToken =
  | "bg-base"
  | "bg-surface"
  | "bg-subtle"
  | "bg-muted"
  | "border-default"
  | "border-strong"
  | "ink-primary"
  | "ink-secondary"
  | "ink-tertiary"
  | "ink-inverse"
  | "brand"
  | "accent"
  | "thumb";

/** Tokens that keep one value in both themes: the seven status tones and the status dots. */
type SharedToken =
  | "positive"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "muted"
  | "special"
  | "dot-positive"
  | "dot-info"
  | "dot-warning"
  | "dot-danger"
  | "dot-special";

export type ColorToken = ThemedToken | SharedToken;

/** CSS variables as `vars()` takes them, e.g. `{ "--bg-base": "246 246 246" }`. */
export type ThemeVariables = Record<`--${string}`, string>;

const LIGHT_THEMED: Record<ThemedToken, string> = {
  "bg-base": "#F6F6F6",
  "bg-surface": "#FFFFFF",
  "bg-subtle": "#F7F8FA",
  "bg-muted": "#EEF0F3",
  "border-default": "#DADDE1",
  "border-strong": "#C5CAD1",
  "ink-primary": "#1A1B18",
  "ink-secondary": "#5C5E58",
  "ink-tertiary": "#8A8C85",
  "ink-inverse": "#FFFFFF",
  brand: "#1A1B18",
  accent: "#1E88E5",
  thumb: "#FFFFFF",
};

const DARK_THEMED: Record<ThemedToken, string> = {
  "bg-base": "#0E0F11",
  "bg-surface": "#17181B",
  "bg-subtle": "#1F2124",
  "bg-muted": "#2A2C30",
  "border-default": "#2E3034",
  "border-strong": "#3D4045",
  "ink-primary": "#F4F4F1",
  "ink-secondary": "#A8AAA3",
  "ink-tertiary": "#76786F",
  "ink-inverse": "#1A1B18",
  brand: "#F4F4F1",
  accent: "#4EA6F0",
  // Android's switch thumb overhangs its track, so it sits on the card: the surface colour (white in
  // light) would vanish on the dark card. Mobile-only token; both values already exist in the palette.
  thumb: "#A8AAA3",
};

// `dot-*` are brighter than the tones above: they colour dots and tool icons only, never text.
const SHARED: Record<SharedToken, string> = {
  positive: "#1F9D55",
  info: "#2B7FC4",
  warning: "#D98207",
  danger: "#D23B3B",
  neutral: "#6B6E68",
  muted: "#9A9C95",
  special: "#7C5CBF",
  "dot-positive": "#12A594",
  "dot-info": "#0090FF",
  "dot-warning": "#F76B15",
  "dot-danger": "#E5484D",
  "dot-special": "#8E4EC6",
};

export const COLOR_TOKENS: Record<Scheme, Record<ColorToken, string>> = {
  light: { ...LIGHT_THEMED, ...SHARED },
  dark: { ...DARK_THEMED, ...SHARED },
};

const HEX_COLOR = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/** `"#1A1B18"` becomes `"26 27 24"`, the channel form `rgb(var(--token) / <alpha-value>)` needs. */
export function hexToRgbChannels(hex: string): string {
  const match = HEX_COLOR.exec(hex);
  if (match === null) throw new Error(`Expected a #RRGGBB colour, got "${hex}"`);
  return match
    .slice(1)
    .map((pair) => parseInt(pair, 16))
    .join(" ");
}

function toVariables(colors: Record<ColorToken, string>): ThemeVariables {
  return Object.fromEntries(
    Object.entries(colors).map(([token, hex]) => [`--${token}`, hexToRgbChannels(hex)]),
  );
}

/** Every token as `--<token>: "r g b"`, per scheme. `ThemeProvider` hands these to `vars()`. */
export const themeChannels: Record<Scheme, ThemeVariables> = {
  light: toVariables(COLOR_TOKENS.light),
  dark: toVariables(COLOR_TOKENS.dark),
};

export const RADIUS = { sm: 4, md: 8, full: 9999 } as const;

export const CONTROL_HEIGHT = { sm: 40, md: 44, lg: 52 } as const;

/**
 * Motion durations (spec §4.3: 120–180 ms): `standard` for what moves into or out of view (a sheet,
 * a toast arriving), `fast` for what leaves or answers a touch.
 */
export const MOTION_MS = { fast: 120, standard: 180 } as const;

/**
 * Web `--sh-sm` as React Native shadow props (iOS) plus `elevation` (Android), for card-like
 * blocks only. The shadow colour is the dark ink in both themes: a light one would glow on dark.
 */
export const SHADOW_SM: ViewStyle = {
  shadowColor: COLOR_TOKENS.light["ink-primary"],
  shadowOpacity: 0.08,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

/** Family names as `@expo-google-fonts/*` registers them; `useFonts` loads them (root layout). */
export const FONT_FAMILY = {
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemibold: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
  display: "InterTight_600SemiBold",
  displayBold: "InterTight_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoSemibold: "JetBrainsMono_600SemiBold",
} as const;
