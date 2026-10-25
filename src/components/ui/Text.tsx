import { Text as RNText } from "react-native";

import { UI_LIMITS } from "@/constants/mobile";

import { cn } from "@/lib/utils";

import type { TextProps as RNTextProps, TextStyle } from "react-native";

export type TextVariant = "body" | "meta" | "small" | "title" | "display";
export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextTone =
  "primary" | "secondary" | "tertiary" | "inverse" | "danger" | "positive" | "warning" | "info";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: TextTone;
  /** JetBrains Mono: codes, SKUs and anything that must line up in a column. */
  mono?: boolean;
  /** Tabular figures, so digits keep one width and amounts line up. */
  numeric?: boolean;
  className?: string;
};

// Sizes in px on purpose: the stock text sizes (`text-sm` = 14, `text-base` = 16) are not the
// 15 / 13 / 12 / 17 / 22 of the type scale. (NativeWind's rem is 16 here: `inlineRem` in metro.config.js.)
const VARIANT_CLASS: Record<TextVariant, string> = {
  body: "text-[15px] leading-[22px]",
  meta: "text-[13px] leading-[18px]",
  small: "text-[12px] leading-[16px]",
  title: "text-[17px] leading-[24px]",
  display: "text-[22px] leading-[28px]",
};

const DEFAULT_WEIGHT: Record<TextVariant, TextWeight> = {
  body: "regular",
  meta: "regular",
  small: "regular",
  title: "semibold",
  display: "semibold",
};

const SANS_CLASS: Record<TextWeight, string> = {
  regular: "font-sans",
  medium: "font-sansMedium",
  semibold: "font-sansSemibold",
  bold: "font-sansBold",
};

// JetBrains Mono is loaded in regular and semibold only; Inter Tight (display) in semibold and bold.
const MONO_CLASS: Record<TextWeight, string> = {
  regular: "font-mono",
  medium: "font-mono",
  semibold: "font-monoSemibold",
  bold: "font-monoSemibold",
};

const DISPLAY_CLASS: Record<TextWeight, string> = {
  regular: "font-display",
  medium: "font-display",
  semibold: "font-display",
  bold: "font-displayBold",
};

const TONE_CLASS: Record<TextTone, string> = {
  primary: "text-ink-primary",
  secondary: "text-ink-secondary",
  tertiary: "text-ink-tertiary",
  inverse: "text-ink-inverse",
  danger: "text-danger",
  positive: "text-positive",
  warning: "text-warning",
  info: "text-info",
};

const NUMERIC_STYLE: TextStyle = { fontVariant: ["tabular-nums"] };

/** The only text component feature code may use: size, family and colour all come from tokens. */
export function Text({
  variant = "body",
  weight,
  tone = "primary",
  mono = false,
  numeric = false,
  className,
  style,
  maxFontSizeMultiplier = UI_LIMITS.maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const resolvedWeight = weight ?? DEFAULT_WEIGHT[variant];
  const fontClass = mono
    ? MONO_CLASS[resolvedWeight]
    : variant === "display"
      ? DISPLAY_CLASS[resolvedWeight]
      : SANS_CLASS[resolvedWeight];

  return (
    <RNText
      className={cn(VARIANT_CLASS[variant], fontClass, TONE_CLASS[tone], className)}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={numeric ? [NUMERIC_STYLE, style] : style}
      {...rest}
    />
  );
}
