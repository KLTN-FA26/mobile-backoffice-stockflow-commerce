import { Camera } from "lucide-react-native";
import { Pressable } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export type ScanCameraButtonProps = { onPress: () => void; disabled: boolean };

const SIZE = CONTROL_HEIGHT.lg;
const ICON_SIZE = 20;

/** The square camera button beside a scan field, as tall as the field. */
export function ScanCameraButton({ onPress, disabled }: ScanCameraButtonProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={MOBILE_LABELS.scan.openCamera}
      disabled={disabled}
      onPress={onPress}
      style={{ width: SIZE, height: SIZE }}
      className={cn(
        "items-center justify-center rounded-md border border-border-default bg-bg-surface active:bg-bg-subtle",
        disabled && "opacity-50",
      )}
    >
      <Camera size={ICON_SIZE} color={colors["ink-primary"]} />
    </Pressable>
  );
}
