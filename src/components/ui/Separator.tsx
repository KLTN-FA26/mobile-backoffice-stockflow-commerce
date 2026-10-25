import { View } from "react-native";

import { cn } from "@/lib/utils";

export type SeparatorProps = {
  className?: string;
};

/** A 1px rule. Purely visual, so screen readers skip it. */
export function Separator({ className }: SeparatorProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("h-px w-full bg-border-default", className)}
    />
  );
}
