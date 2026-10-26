import { ChevronLeft } from "lucide-react-native";
import { useContext } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { UI_LABELS } from "@/constants";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";

import { Text } from "@/components/ui";

import type { ReactNode } from "react";

export type ScreenHeaderProps = {
  /** The screen name, or the record code on a detail screen (N1: mobile has no breadcrumb). */
  title: string;
  /** JetBrains Mono, for a record code. */
  titleMono?: boolean;
  /** Shows the back button. */
  onBack?: () => void;
  /** Sits at the right of the title: a sort or scan button. */
  right?: ReactNode;
};

const BACK_ICON_SIZE = 20;
const HEADER_HEIGHT = 52;

/**
 * The top bar of a screen: back, title, an optional action. It takes the status-bar inset itself
 * (the session banner, when shown, has already taken it and passes 0 down).
 */
export function ScreenHeader({ title, titleMono = false, onBack, right }: ScreenHeaderProps) {
  const colors = useThemeColors();
  const insets = useContext(SafeAreaInsetsContext);

  return (
    <View
      style={{ paddingTop: insets?.top ?? 0 }}
      className="border-b border-border-default bg-bg-surface"
    >
      <View
        style={{ minHeight: HEADER_HEIGHT }}
        className="flex-row items-center gap-[4px] px-[16px]"
      >
        {onBack === undefined ? null : (
          // 44 × 44 touch target; the negative margin lines the chevron up with the screen edge.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={UI_LABELS.shell.navBack}
            onPress={onBack}
            style={{ width: CONTROL_HEIGHT.md, height: CONTROL_HEIGHT.md }}
            className="-ml-[12px] items-center justify-center rounded-md active:bg-bg-muted"
          >
            <ChevronLeft size={BACK_ICON_SIZE} color={colors["ink-primary"]} />
          </Pressable>
        )}
        <Text
          variant="title"
          mono={titleMono}
          numberOfLines={1}
          accessibilityRole="header"
          className="min-w-0 flex-1"
        >
          {title}
        </Text>
        {right}
      </View>
    </View>
  );
}
