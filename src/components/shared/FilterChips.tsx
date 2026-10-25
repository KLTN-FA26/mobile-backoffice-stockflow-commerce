import { SlidersHorizontal, X } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { Text } from "@/components/ui";

export type FilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

export type FilterChipsProps = {
  /** One per filter that is on. */
  chips: FilterChip[];
  onOpenFilters: () => void;
  /** Shown on the first chip when above zero. */
  activeCount: number;
};

const ICON_SIZE = 14;
const CHIP_HEIGHT = 36;
// A 36px chip gets a 4px slop above and below to reach the 44pt touch area. The slop must sit inside
// the scroll view (touches outside a parent's bounds never arrive), so the row pads by the same 4px.
const CHIP_SLOP = { top: 4, bottom: 4 } as const;
const ROW_PADDING = CHIP_SLOP.top;
const CHIP_CLASS = "flex-row items-center gap-[6px] rounded-full border px-[12px]";

/**
 * The row under the search box: a "Bộ lọc" chip that opens the filters, then one chip for each
 * filter that is on. Tapping an active chip takes that filter off.
 */
export function FilterChips({ chips, onOpenFilters, activeCount }: FilterChipsProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, alignItems: "center", paddingVertical: ROW_PADDING }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={MOBILE_LABELS.filter}
        accessibilityValue={activeCount > 0 ? { text: String(activeCount) } : undefined}
        hitSlop={CHIP_SLOP}
        onPress={onOpenFilters}
        style={{ minHeight: CHIP_HEIGHT }}
        className={`${CHIP_CLASS} border-border-default bg-bg-surface active:bg-bg-subtle`}
      >
        <SlidersHorizontal size={ICON_SIZE} color={colors["ink-primary"]} />
        <Text variant="meta" weight="medium">
          {MOBILE_LABELS.filter}
        </Text>
        {activeCount > 0 ? (
          <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-[4px]">
            <Text variant="small" weight="semibold" tone="inverse" numeric>
              {activeCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          accessibilityRole="button"
          accessibilityLabel={MOBILE_LABELS.removeFilter(chip.label)}
          hitSlop={CHIP_SLOP}
          onPress={chip.onClear}
          style={{ minHeight: CHIP_HEIGHT }}
          className={`${CHIP_CLASS} max-w-[240px] border-border-default bg-bg-muted active:bg-bg-subtle`}
        >
          <Text variant="meta" weight="medium" numberOfLines={1} className="shrink">
            {chip.label}
          </Text>
          <X size={ICON_SIZE} color={colors["ink-secondary"]} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
