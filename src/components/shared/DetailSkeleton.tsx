import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { Skeleton } from "@/components/ui";

const SECTION_COUNT = 2;
const ROWS_PER_SECTION = 4;
const CARD_CLASS = "gap-3 rounded-md border border-border-default bg-bg-surface p-4";

/** A `Section`: its title, then label / value rows. */
function SkeletonSection() {
  return (
    <View className={CARD_CLASS}>
      <Skeleton className="h-[18px] w-2/5" />
      {Array.from({ length: ROWS_PER_SECTION }, (_, index) => (
        <View key={index} className="flex-row items-center justify-between gap-3">
          <Skeleton className="h-[14px] w-1/3" />
          <Skeleton className="h-[14px] w-2/5" />
        </View>
      ))}
    </View>
  );
}

/**
 * What a detail or form screen shows on its first load: section-shaped placeholders (the mobile
 * counterpart of the web `PageSkeleton variant="detail"`). Screen readers hear "loading" once.
 */
export function DetailSkeleton() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={MOBILE_LABELS.loading}
      accessibilityState={{ busy: true }}
      className="gap-3 px-4 pt-4"
    >
      {Array.from({ length: SECTION_COUNT }, (_, index) => (
        <SkeletonSection key={index} />
      ))}
    </View>
  );
}
