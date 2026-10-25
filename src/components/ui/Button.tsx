import { ActivityIndicator, Pressable } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { Text } from "./Text";

import type { ColorToken } from "@/lib/tokens";
import type { LucideIcon } from "lucide-react-native";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Shows a spinner, reports `busy` and swallows presses until it clears. */
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
};

const VARIANT: Record<
  ButtonVariant,
  { box: string; tone: "inverse" | "primary" | "danger"; icon: ColorToken }
> = {
  primary: {
    box: "border-brand bg-brand active:opacity-80",
    tone: "inverse",
    icon: "ink-inverse",
  },
  secondary: {
    box: "border-border-default bg-bg-surface active:bg-bg-subtle",
    tone: "primary",
    icon: "ink-primary",
  },
  ghost: {
    box: "border-transparent active:bg-bg-muted",
    tone: "primary",
    icon: "ink-primary",
  },
  // Same recipe as the web destructive button: a 10% tint with the tone as text, not a solid fill.
  danger: {
    box: "border-danger/30 bg-danger/10 active:bg-danger/20",
    tone: "danger",
    icon: "danger",
  },
};

const ICON_SIZE = 16;

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  className,
}: ButtonProps) {
  const colors = useThemeColors();
  const style = VARIANT[variant];
  const inactive = disabled || loading;
  const iconColor = colors[style.icon];
  // Controls under 44pt grow their touch area instead of their look.
  const slop = Math.max(0, (CONTROL_HEIGHT.md - CONTROL_HEIGHT[size]) / 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={slop > 0 ? { top: slop, bottom: slop } : undefined}
      onPress={onPress}
      style={{ minHeight: CONTROL_HEIGHT[size] }}
      className={cn(
        "flex-row items-center justify-center gap-[8px] rounded-md border px-[16px]",
        style.box,
        inactive && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={iconColor}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : Icon ? (
        <Icon size={ICON_SIZE} color={iconColor} />
      ) : null}
      <Text weight="medium" tone={style.tone}>
        {label}
      </Text>
    </Pressable>
  );
}
