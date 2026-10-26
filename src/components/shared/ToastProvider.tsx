import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react-native";
import { ActivityIndicator } from "react-native";
import { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Toaster } from "sonner-native";

import { UI_LIMITS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { FONT_FAMILY, MOTION_MS, RADIUS } from "@/lib/tokens";

const ICON_SIZE = 20;

// Top toasts drop in from above and leave upwards; the library skips both under Reduce Motion.
const ANIMATION = {
  enter: FadeInUp.duration(MOTION_MS.standard),
  exit: FadeOutUp.duration(MOTION_MS.fast),
};

/**
 * The sonner-native Toaster, rendered once by `AppProviders`; toasts are fired with `toast` from
 * `./Toast`. It takes the app's tokens (surface, border, ink, the dot colours for its icons)
 * instead of the library's own colours, in the scheme the app is in, and caps font scaling like the
 * rest of the app.
 */
export function ToastProvider() {
  const colors = useThemeColors();

  return (
    <Toaster
      position="top-center"
      maxFontSizeMultiplier={UI_LIMITS.maxFontSizeMultiplier}
      animation={ANIMATION}
      toastOptions={{
        style: {
          backgroundColor: colors["bg-surface"],
          borderColor: colors["border-default"],
          borderWidth: 1,
          borderRadius: RADIUS.md,
        },
        titleStyle: { color: colors["ink-primary"], fontFamily: FONT_FAMILY.sansSemibold },
        descriptionStyle: { color: colors["ink-secondary"], fontFamily: FONT_FAMILY.sans },
      }}
      icons={{
        success: <CircleCheck size={ICON_SIZE} color={colors["dot-positive"]} />,
        error: <CircleX size={ICON_SIZE} color={colors["dot-danger"]} />,
        warning: <TriangleAlert size={ICON_SIZE} color={colors["dot-warning"]} />,
        info: <Info size={ICON_SIZE} color={colors["dot-info"]} />,
        loading: <ActivityIndicator size="small" color={colors["ink-tertiary"]} />,
      }}
    />
  );
}
