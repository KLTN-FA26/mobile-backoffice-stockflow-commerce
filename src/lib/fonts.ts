// One import per weight: the package index would bundle all 18 weights of each family.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { InterTight_600SemiBold } from "@expo-google-fonts/inter-tight/600SemiBold";
import { InterTight_700Bold } from "@expo-google-fonts/inter-tight/700Bold";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono/600SemiBold";

import { FONT_FAMILY } from "./tokens";

type FontFamilyName = (typeof FONT_FAMILY)[keyof typeof FONT_FAMILY];

/** The font file behind every `FONT_FAMILY` name, for `useFonts` in the root layout. */
export const APP_FONTS: Record<FontFamilyName, number> = {
  [FONT_FAMILY.sans]: Inter_400Regular,
  [FONT_FAMILY.sansMedium]: Inter_500Medium,
  [FONT_FAMILY.sansSemibold]: Inter_600SemiBold,
  [FONT_FAMILY.sansBold]: Inter_700Bold,
  [FONT_FAMILY.display]: InterTight_600SemiBold,
  [FONT_FAMILY.displayBold]: InterTight_700Bold,
  [FONT_FAMILY.mono]: JetBrainsMono_400Regular,
  [FONT_FAMILY.monoSemibold]: JetBrainsMono_600SemiBold,
};
