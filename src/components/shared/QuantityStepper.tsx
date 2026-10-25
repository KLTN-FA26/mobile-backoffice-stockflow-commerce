import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { MOBILE_LABELS, UI_LIMITS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { TextField } from "@/components/ui";

import type { LucideIcon } from "lucide-react-native";

export type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** Defaults to 0, or to no lower limit with `allowNegative`. */
  min?: number;
  max?: number;
  step?: number;
  /** What is being counted: names the field and both buttons for a screen reader. */
  label: string;
  allowNegative?: boolean;
};

const UNSIGNED = /^\d*$/;
const SIGNED = /^-?\d*$/;
// Room for any real quantity; keeps a pasted string of digits from becoming 1e21.
const MAX_CHARS = 12;
const BUTTON_CLASS =
  "items-center justify-center rounded-md border border-border-default bg-bg-surface";

type StepButtonProps = {
  icon: LucideIcon;
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function StepButton({ icon: Icon, label, disabled, onPress }: StepButtonProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ width: CONTROL_HEIGHT.md, height: CONTROL_HEIGHT.md }}
      className={cn(BUTTON_CLASS, "active:bg-bg-subtle", disabled && "opacity-50")}
    >
      <Icon size={18} color={colors["ink-primary"]} />
    </Pressable>
  );
}

/**
 * A whole number with a − and a ＋ button either side (N6), for gloved hands that miss the number
 * pad. Typing works too; the value always stays within `[min, max]`.
 */
export function QuantityStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  allowNegative = false,
}: QuantityStepperProps) {
  // While the field has focus it shows what was typed, which may be empty or a lone "-".
  const [draft, setDraft] = useState<string | null>(null);
  // The last number typing reported. When `value` arrives as that, the caller is echoing the edit;
  // any other new value (a scan, a reset) comes from outside and replaces what is typed. Adjusted
  // while rendering, as React advises for state that follows a prop.
  const [typedValue, setTypedValue] = useState<number | null>(null);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (value !== typedValue) setDraft(null);
  }

  const lower = allowNegative ? (min ?? -Infinity) : Math.max(min ?? 0, 0);
  const upper = max ?? Infinity;
  const clamp = (n: number) => Math.min(upper, Math.max(lower, n));

  const commit = (next: number) => {
    setDraft(null);
    if (next !== value) onChange(next);
  };

  const handleText = (text: string) => {
    // Not a whole number (a point, a letter, a stray space): leave the field as it was.
    if (!(allowNegative ? SIGNED : UNSIGNED).test(text)) return;
    setDraft(text);
    if (text === "" || text === "-") return;
    // `|| 0` turns "-0" into 0.
    const typed = Number.parseInt(text, 10) || 0;
    const next = clamp(typed);
    setTypedValue(next);
    if (next !== value) onChange(next);
    // A number above the limit shows as the limit. One below it is left alone until the field
    // loses focus: "1" on the way to "15" must not jump to a minimum of 5.
    if (typed > upper) setDraft(String(next));
  };

  return (
    <View className="flex-row items-center gap-[8px]">
      <StepButton
        icon={Minus}
        label={MOBILE_LABELS.decrease(label)}
        disabled={value <= lower}
        onPress={() => commit(clamp(value - step))}
      />
      <TextField
        accessibilityLabel={label}
        value={draft ?? String(value)}
        onChangeText={handleText}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        keyboardType={
          allowNegative
            ? Platform.select({ ios: "numbers-and-punctuation", default: "numeric" })
            : "number-pad"
        }
        maxLength={MAX_CHARS}
        selectTextOnFocus
        maxFontSizeMultiplier={UI_LIMITS.maxFontSizeMultiplier}
        style={{ height: CONTROL_HEIGHT.md, fontVariant: ["tabular-nums"] }}
        className="min-w-[72px] rounded-md border border-border-default bg-bg-surface px-[8px] text-center font-mono text-[15px] text-ink-primary"
      />
      <StepButton
        icon={Plus}
        label={MOBILE_LABELS.increase(label)}
        disabled={value >= upper}
        onPress={() => commit(clamp(value + step))}
      />
    </View>
  );
}
