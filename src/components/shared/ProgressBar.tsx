import { View } from "react-native";

export type ProgressBarProps = {
  value: number;
  max: number;
  /** What is being counted, e.g. "Đã lấy 3 trên 10": the bar itself has no text. */
  accessibilityLabel: string;
};

/** A thin determinate bar (blue is the accent for progress). The value is clamped to 0..max. */
export function ProgressBar({ value, max, accessibilityLabel }: ProgressBarProps) {
  const now = max > 0 ? Math.min(Math.max(value, 0), max) : 0;
  const percent = max > 0 ? (now / max) * 100 : 0;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now }}
      className="h-2 w-full overflow-hidden rounded-full bg-bg-muted"
    >
      <View className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </View>
  );
}
