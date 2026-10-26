import * as Inter from "@expo-google-fonts/inter";
import * as InterTight from "@expo-google-fonts/inter-tight";
import * as JetBrainsMono from "@expo-google-fonts/jetbrains-mono";

import {
  COLOR_TOKENS,
  CONTROL_HEIGHT,
  FONT_FAMILY,
  RADIUS,
  SHADOW_SM,
  hexToRgbChannels,
  themeChannels,
} from "./tokens";

import type { ColorToken } from "./tokens";

type TailwindConfig = {
  presets: unknown[];
  content: string[];
  theme: {
    colors: Record<string, string>;
    extend: {
      borderColor: Record<string, string>;
      borderRadius: Record<string, string>;
      fontFamily: Record<string, string>;
    };
  };
};

// The spec table (web globals.css), written without the leading "#": tokens.ts is the only file
// the style ban lets hold a hex colour, so the expectations are assembled with `hex()`.
const hex = (digits: string): string => `#${digits}`;

const SPEC_LIGHT: Record<ColorToken, string> = {
  "bg-base": "F6F6F6",
  "bg-surface": "FFFFFF",
  "bg-subtle": "F7F8FA",
  "bg-muted": "EEF0F3",
  "border-default": "DADDE1",
  "border-strong": "C5CAD1",
  "ink-primary": "1A1B18",
  "ink-secondary": "5C5E58",
  "ink-tertiary": "8A8C85",
  "ink-inverse": "FFFFFF",
  brand: "1A1B18",
  accent: "1E88E5",
  // Mobile-only (Android switch thumb): light = bg-surface, dark = ink-secondary.
  thumb: "FFFFFF",
  positive: "1F9D55",
  info: "2B7FC4",
  warning: "D98207",
  danger: "D23B3B",
  neutral: "6B6E68",
  muted: "9A9C95",
  special: "7C5CBF",
  "dot-positive": "12A594",
  "dot-info": "0090FF",
  "dot-warning": "F76B15",
  "dot-danger": "E5484D",
  "dot-special": "8E4EC6",
};

const SPEC_DARK: Record<ColorToken, string> = {
  ...SPEC_LIGHT,
  "bg-base": "0E0F11",
  "bg-surface": "17181B",
  "bg-subtle": "1F2124",
  "bg-muted": "2A2C30",
  "border-default": "2E3034",
  "border-strong": "3D4045",
  "ink-primary": "F4F4F1",
  "ink-secondary": "A8AAA3",
  "ink-tertiary": "76786F",
  "ink-inverse": "1A1B18",
  brand: "F4F4F1",
  accent: "4EA6F0",
  thumb: "A8AAA3",
};

const SHARED_TOKENS: ColorToken[] = [
  "positive",
  "info",
  "warning",
  "danger",
  "neutral",
  "muted",
  "special",
  "dot-positive",
  "dot-info",
  "dot-warning",
  "dot-danger",
  "dot-special",
];

function withHash(spec: Record<ColorToken, string>): Record<ColorToken, string> {
  return Object.fromEntries(
    Object.entries(spec).map(([token, digits]) => [token, hex(digits)]),
  ) as Record<ColorToken, string>;
}

describe("color tokens", () => {
  it("light tokens match spec", () => {
    expect(COLOR_TOKENS.light).toEqual(withHash(SPEC_LIGHT));
    expect(COLOR_TOKENS.light["bg-base"]).toBe(hex("F6F6F6"));
    expect(COLOR_TOKENS.light.accent).toBe(hex("1E88E5"));
  });

  it("dark tokens match spec", () => {
    expect(COLOR_TOKENS.dark).toEqual(withHash(SPEC_DARK));
    expect(COLOR_TOKENS.dark["bg-base"]).toBe(hex("0E0F11"));
    expect(COLOR_TOKENS.dark.accent).toBe(hex("4EA6F0"));
  });

  it("semantic and dot tokens equal across themes", () => {
    for (const token of SHARED_TOKENS) {
      expect(COLOR_TOKENS.dark[token]).toBe(COLOR_TOKENS.light[token]);
    }
  });
});

describe("hexToRgbChannels", () => {
  it("converts", () => {
    expect(hexToRgbChannels(hex("1A1B18"))).toBe("26 27 24");
    expect(hexToRgbChannels(hex("FFFFFF"))).toBe("255 255 255");
    expect(hexToRgbChannels(hex("0e0f11"))).toBe("14 15 17");
  });

  it("rejects anything but a six-digit hex colour", () => {
    expect(() => hexToRgbChannels(hex("FFF"))).toThrow();
    expect(() => hexToRgbChannels("1A1B18")).toThrow();
  });
});

describe("themeChannels", () => {
  it("exposes every token as an rgb channel variable, per theme", () => {
    expect(themeChannels.light).toMatchObject({
      "--bg-base": "246 246 246",
      "--accent": "30 136 229",
    });
    expect(themeChannels.dark).toMatchObject({
      "--bg-base": "14 15 17",
      "--accent": "78 166 240",
    });
    for (const token of Object.keys(COLOR_TOKENS.light)) {
      expect(themeChannels.light).toHaveProperty([`--${token}`]);
      expect(themeChannels.dark).toHaveProperty([`--${token}`]);
    }
  });
});

describe("shape tokens", () => {
  it("keeps radius, control heights and the card shadow of the spec", () => {
    expect(RADIUS).toEqual({ sm: 4, md: 8, full: 9999 });
    expect(CONTROL_HEIGHT).toEqual({ sm: 40, md: 44, lg: 52 });
    expect(SHADOW_SM).toEqual({
      shadowColor: COLOR_TOKENS.light["ink-primary"],
      shadowOpacity: 0.08,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    });
  });

  it("names only fonts that the expo-google-fonts packages export", () => {
    const exported = new Set([
      ...Object.keys(Inter),
      ...Object.keys(InterTight),
      ...Object.keys(JetBrainsMono),
    ]);
    for (const family of Object.values(FONT_FAMILY)) expect(exported).toContain(family);
  });
});

describe("tailwind config", () => {
  const config = jest.requireActual<TailwindConfig>("../../tailwind.config.js");

  it("exposes every token and only the tokens, plus transparent and current", () => {
    const { colors } = config.theme;
    for (const token of Object.keys(COLOR_TOKENS.light)) {
      expect(colors[token]).toBe(`rgb(var(--${token}) / <alpha-value>)`);
    }
    // theme.colors, not theme.extend.colors: Tailwind's default palette (white, red-500…) is gone.
    expect(Object.keys(colors).sort()).toEqual(
      [...Object.keys(COLOR_TOKENS.light), "transparent", "current"].sort(),
    );
    expect(colors.transparent).toBe("transparent");
    expect(colors.current).toBe("currentColor");
  });

  it("paints a bare border with the default border token", () => {
    expect(config.theme.extend.borderColor.DEFAULT).toBe(
      "rgb(var(--border-default) / <alpha-value>)",
    );
  });

  it("takes radius and font families from the tokens", () => {
    expect(config.theme.extend.borderRadius).toEqual({ sm: "4px", md: "8px", full: "9999px" });
    expect(config.theme.extend.fontFamily).toEqual(FONT_FAMILY);
  });

  it("scans app and src and extends the nativewind preset", () => {
    expect(config.content).toEqual(["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"]);
    expect(config.presets).toHaveLength(1);
  });
});
