import { CameraOff } from "lucide-react-native";
import { Linking, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { Button, Text } from "@/components/ui";

export type CameraPermissionPromptProps = {
  /** The system will still show its permission dialog; otherwise only Settings can grant it. */
  canAskAgain: boolean;
  /** The permission hook's request; the prompt goes once the hook reports the answer. */
  onRequest: () => Promise<unknown>;
  /** Back to the field, where the code can be typed. */
  onTypeInstead: () => void;
};

const ICON_SIZE = 32;
const { scan } = MOBILE_LABELS;

/** Nothing more to do when the system will not show its dialog or Settings: the prompt stays. */
function attempt(action: () => Promise<unknown>, what: string) {
  action().catch((error: unknown) => {
    if (__DEV__) console.warn(what, error);
  });
}

/** The camera screen without camera access: ask for it, or send to Settings; typing always works. */
export function CameraPermissionPrompt({
  canAskAgain,
  onRequest,
  onTypeInstead,
}: CameraPermissionPromptProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 justify-center gap-[24px] p-[24px]">
      <View className="items-center gap-[8px]">
        <CameraOff size={ICON_SIZE} color={colors["ink-tertiary"]} />
        <Text variant="title" className="text-center">
          {scan.permissionTitle}
        </Text>
        {canAskAgain ? null : (
          <Text tone="secondary" className="text-center">
            {scan.permissionDenied}
          </Text>
        )}
      </View>
      <View className="gap-[12px]">
        {canAskAgain ? (
          <Button
            label={scan.allowCamera}
            size="lg"
            onPress={() => attempt(onRequest, "Could not ask for the camera")}
          />
        ) : (
          <Button
            label={scan.openSettings}
            size="lg"
            onPress={() => attempt(() => Linking.openSettings(), "Could not open the app settings")}
          />
        )}
        <Button label={scan.typeInstead} variant="secondary" size="lg" onPress={onTypeInstead} />
      </View>
    </View>
  );
}
