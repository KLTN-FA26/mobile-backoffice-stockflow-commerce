import { Pressable } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import type { ColorToken } from "@/lib/tokens";
import type { LucideIcon } from "lucide-react-native";

export type IconButtonVariant = "ghost" | "outline";

export type IconButtonProps = {
  icon: LucideIcon;
  /** Required: an icon says nothing to a screen reader. Vietnamese, from the constants. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * `ghost` (default): the bare icon, tinted while pressed (header back/close, clear buttons);
   * `outline`: a bordered surface, for a button beside a field (camera, eye, − / ＋).
   */
  variant?: IconButtonVariant;
  /**
   * Width and height in px: 44 by default, or the height of the field it sits beside (48, 52). A
   * smaller one keeps 44pt of touch area through `hitSlop`.
   */
  size?: number;
  iconSize?: number;
  iconColor?: ColorToken;
  /** Makes it a toggle (role `togglebutton`) that reports whether it is on. */
  checked?: boolean;
  accessibilityHint?: string;
  /** Position only (a negative margin to line the icon up with the screen edge). */
  className?: string;
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  ghost: "active:bg-bg-muted",
  outline: "border border-border-default bg-bg-surface active:bg-bg-subtle",
};

/** A button that is only an icon: a square of at least 44pt, always named for screen readers. */
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  variant = "ghost",
  size = CONTROL_HEIGHT.md,
  iconSize = 20,
  iconColor = "ink-primary",
  checked,
  accessibilityHint,
  className,
}: IconButtonProps) {
  const colors = useThemeColors();
  const slop = Math.max(0, (CONTROL_HEIGHT.md - size) / 2);

  return (
    <Pressable
      accessibilityRole={checked === undefined ? "button" : "togglebutton"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={checked === undefined ? { disabled } : { disabled, checked }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop > 0 ? slop : undefined}
      style={{ width: size, height: size }}
      className={cn(
        "items-center justify-center rounded-md",
        VARIANT_CLASS[variant],
        disabled && "opacity-50",
        className,
      )}
    >
      <Icon size={iconSize} color={colors[iconColor]} />
    </Pressable>
  );
}
