import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { Skeleton } from "@/components/ui";

export const SKELETON_CARD_TEST_ID = "list-skeleton-card";

const SKELETON_COUNT = 5;
const CARD_CLASS = "gap-2 rounded-md border border-border-default bg-bg-surface p-4";

/** The shape of a `RecordCard`: code and status on top, the related party, then date and quantity. */
function SkeletonCard() {
  return (
    <View testID={SKELETON_CARD_TEST_ID} className={CARD_CLASS}>
      <View className="flex-row items-center justify-between gap-3">
        <Skeleton className="h-[18px] w-1/3" />
        <Skeleton className="h-[14px] w-1/5" />
      </View>
      <Skeleton className="h-[14px] w-2/3" />
      <View className="flex-row items-center justify-between gap-3">
        <Skeleton className="h-[14px] w-1/4" />
        <Skeleton className="h-[14px] w-1/5" />
      </View>
    </View>
  );
}

/**
 * What a list shows on its first load: card-shaped placeholders, not a spinner on a blank screen.
 * The skeletons are hidden from screen readers, so this block says that it is loading.
 */
export function ListSkeleton() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={MOBILE_LABELS.loading}
      accessibilityState={{ busy: true }}
      className="gap-2 px-4 pt-2"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}
