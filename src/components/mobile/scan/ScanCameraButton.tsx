import { Camera } from "lucide-react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { CONTROL_HEIGHT } from "@/lib/tokens";

import { IconButton } from "@/components/ui";

export type ScanCameraButtonProps = { onPress: () => void; disabled: boolean };

/** The square camera button beside a scan field, as tall as the field. */
export function ScanCameraButton({ onPress, disabled }: ScanCameraButtonProps) {
  return (
    <IconButton
      variant="outline"
      icon={Camera}
      size={CONTROL_HEIGHT.lg}
      accessibilityLabel={MOBILE_LABELS.scan.openCamera}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
