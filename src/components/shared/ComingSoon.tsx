import { Construction } from "lucide-react-native";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { Badge } from "@/components/ui";

import { StateLayout } from "./StateLayout";

import type { LucideIcon } from "lucide-react-native";

export type ComingSoonProps = {
  title: string;
  icon?: LucideIcon;
  /** Defaults to the general "being developed" line; pass `portPendingDescription` for a screen still being ported. */
  description?: string;
};

/** The whole screen for a feature the web itself marks as in development: no invented workflow. */
export function ComingSoon({
  title,
  icon = Construction,
  description = MOBILE_LABELS.comingSoonDescription,
}: ComingSoonProps) {
  return (
    <StateLayout
      icon={icon}
      title={title}
      description={description}
      aboveTitle={
        <View>
          <Badge label={MOBILE_LABELS.comingSoonTag} />
        </View>
      }
    />
  );
}
