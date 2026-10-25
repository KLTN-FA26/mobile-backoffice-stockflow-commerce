import { Plus } from "lucide-react-native";
import { View } from "react-native";

import { SHADOW_SM } from "@/lib/tokens";

import { Button } from "@/components/ui";

import type { LucideIcon } from "lucide-react-native";

export type ListFabProps = {
  label: string;
  /** Defaults to a plus: the button creates a record. */
  icon?: LucideIcon;
  onPress: () => void;
};

/** The room a list leaves under its last row so the FAB never covers it: 52 high + 2 x 16. */
export const FAB_CLEARANCE = 84;

/**
 * The extended FAB of a list, bottom right. Render it only for a user who may create the record.
 * The wrapper carries the shadow and a matching fill, so Android's elevation has a surface.
 */
export function ListFab({ label, icon = Plus, onPress }: ListFabProps) {
  return (
    <View className="absolute bottom-4 right-4 rounded-md bg-brand" style={SHADOW_SM}>
      <Button size="lg" icon={icon} label={label} onPress={onPress} />
    </View>
  );
}
