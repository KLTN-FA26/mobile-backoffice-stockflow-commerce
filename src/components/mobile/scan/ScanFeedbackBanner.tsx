import { CircleCheck, CircleX } from "lucide-react-native";
import { View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

import { Text } from "@/components/ui";

import type { ScanFeedback } from "./scan-bus";

const ICON_SIZE = 16;

const TONE = {
  positive: { icon: CircleCheck, iconColor: "dot-positive", border: "border-positive" },
  danger: { icon: CircleX, iconColor: "dot-danger", border: "border-danger" },
} as const;

/**
 * One scan's result, as on the web scan field: icon + message in the tone's colour (never colour
 * alone). An opaque surface, so it reads the same under the field and over the camera picture.
 * Not a live region: `useScanFeedback` already has the screen reader say the message once; the
 * banner stays readable for whoever explores the screen afterwards.
 */
export function ScanFeedbackBanner({ feedback }: { feedback: ScanFeedback }) {
  const colors = useThemeColors();
  const { icon: Icon, iconColor, border } = TONE[feedback.tone];

  return (
    <View
      className={cn(
        "min-h-[44px] flex-row items-center gap-[8px] rounded-md border bg-bg-surface px-[12px] py-[8px]",
        border,
      )}
    >
      <Icon size={ICON_SIZE} color={colors[iconColor]} />
      <Text variant="meta" weight="medium" tone={feedback.tone} className="min-w-0 flex-1">
        {feedback.message}
      </Text>
    </View>
  );
}
