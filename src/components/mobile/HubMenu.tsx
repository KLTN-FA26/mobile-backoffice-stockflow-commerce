import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";
import { PERMISSION_UI } from "@/constants/permissions";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

import { Card } from "@/components/shared/Card";
import { LoadErrorState } from "@/components/shared/LoadErrorState";
import { Badge, Skeleton, Text } from "@/components/ui";

import { ScreenHeader } from "./ScreenHeader";
import { useNavVisibility } from "./use-nav-visibility";

import type { MobileNavGroup, MobileNavItem } from "./nav-config";

export type HubMenuProps = { groupKey: MobileNavGroup["key"] };

const ICON_SIZE = 16;
const SKELETON_ROWS = 3;
const CARD_MARGIN = "mx-[16px] mt-[16px]";

function HubItem({ item, last }: { item: MobileNavItem; last: boolean }) {
  const colors = useThemeColors();
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityRole="button"
      // The item alone as the name; the tag and the web tooltip (second line) as the hint.
      accessibilityLabel={item.label}
      accessibilityHint={[item.comingSoon ? MOBILE_LABELS.comingSoonTag : null, item.tooltip]
        .filter(Boolean)
        .join(". ")}
      // `navigate`, not `push`: a second tap before the screen is up does not stack it twice.
      onPress={() => router.navigate(item.href)}
      className={cn(
        "min-h-[56px] flex-row items-center gap-[12px] px-[16px] py-[12px] active:bg-bg-subtle",
        !last && "border-b border-border-default",
      )}
    >
      <Icon size={ICON_SIZE} color={colors["ink-secondary"]} />
      <View className="min-w-0 flex-1 gap-[2px]">
        <View className="flex-row flex-wrap items-center gap-[8px]">
          <Text weight="medium">{item.label}</Text>
          {item.comingSoon ? <Badge label={MOBILE_LABELS.comingSoonTag} /> : null}
        </View>
        <Text variant="meta" tone="secondary">
          {item.tooltip}
        </Text>
      </View>
      <ChevronRight size={ICON_SIZE} color={colors["ink-tertiary"]} />
    </Pressable>
  );
}

/** Menu-row placeholders; screen readers hear "loading" once, not each row. */
function HubSkeleton() {
  return (
    <Card
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={MOBILE_LABELS.loading}
      accessibilityState={{ busy: true }}
      className={CARD_MARGIN}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View key={index} className="flex-row items-center gap-[12px] px-[16px] py-[14px]">
          <Skeleton className="h-[16px] w-[16px]" />
          <View className="flex-1 gap-[6px]">
            <Skeleton className="h-[14px] w-1/2" />
            <Skeleton className="h-[12px] w-1/3" />
          </View>
        </View>
      ))}
    </Card>
  );
}

function HubBody({ groupKey }: HubMenuProps) {
  const { status, groups, retry, retrying } = useNavVisibility();

  if (status === "pending") return <HubSkeleton />;
  // Not knowing the permissions is not "no permission": say so, offer a retry, hide nothing.
  if (status === "error") {
    return <LoadErrorState kind="permissions" onRetry={retry} retrying={retrying} />;
  }

  const items = groups.find(({ group }) => group.key === groupKey)?.items ?? [];
  // Only reachable for a moment: a tab left with no item is hidden and its open hub moves away.
  if (items.length === 0) {
    return (
      <LoadErrorState
        kind="forbidden"
        title={PERMISSION_UI.deniedTitle}
        description={PERMISSION_UI.deniedDescription}
      />
    );
  }

  return (
    <ScrollView contentContainerClassName="pb-[16px]">
      <Card className={CARD_MARGIN}>
        {items.map((item, index) => (
          <HubItem key={item.key} item={item} last={index === items.length - 1} />
        ))}
      </Card>
    </ScrollView>
  );
}

/**
 * A tab's home (the web sidebar group, drilled into): the items this user may open, each with its
 * English web tooltip as a second line and "Đang phát triển" on screens still in development.
 * UI-only gating — Backend phải re-check every screen an item opens.
 */
export function HubMenu({ groupKey }: HubMenuProps) {
  return (
    <View className="flex-1 bg-bg-base">
      <ScreenHeader title={MOBILE_LABELS.tabs[groupKey]} />
      <HubBody groupKey={groupKey} />
    </View>
  );
}
