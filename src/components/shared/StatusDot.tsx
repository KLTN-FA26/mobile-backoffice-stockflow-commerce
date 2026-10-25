import { useState } from "react";
import { View } from "react-native";
import { GestureDetector, useLongPressGesture } from "react-native-gesture-handler";

import { statusLabelVi, toneOf } from "@/lib/status-map";

import { Text } from "@/components/ui";

import { ToneDot } from "./ToneDot";

import type { DotSize } from "./ToneDot";
import type { StatusDomain } from "@/lib/domain/status-types";

export type StatusDotProps = {
  domain: StatusDomain;
  status: string;
  size?: DotSize;
};

/** Lets a test find the long-press gesture (`getByGestureTestId`); the library ignores it outside tests. */
export const STATUS_DOT_GESTURE_ID = "status-dot-long-press";

/**
 * The one way to show a record status (like the web `StatusDot`): the tone comes from the status
 * map, the label is Vietnamese. The web puts the English original in a hover title; a phone has no
 * hover, so a long press shows the original inline as "nhãn Việt — status" (N7), and the screen
 * reader gets the same string as the label.
 *
 * The long press is a gesture-handler gesture, not a `Pressable`: a `Pressable` takes the JS
 * responder even when it only has `onLongPress`, so a quick tap on the status would never reach
 * the `RecordCard` around it. The gesture leaves taps to the parent and, once it activates, cancels
 * the parent's press (so a long press reveals the label instead of opening the record).
 */
export function StatusDot({ domain, status, size = "sm" }: StatusDotProps) {
  const [revealed, setRevealed] = useState(false);
  const longPress = useLongPressGesture({
    runOnJS: true,
    testID: STATUS_DOT_GESTURE_ID,
    onActivate: () => setRevealed((shown) => !shown),
  });
  const labelVi = statusLabelVi(status, domain);
  const dot = <ToneDot tone={toneOf(status)} label={labelVi ?? status} size={size} />;

  // Nothing to reveal when the status has no Vietnamese label: it is its own original.
  if (labelVi === undefined) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={status} className="self-start">
        {dot}
      </View>
    );
  }

  const title = `${labelVi} — ${status}`;
  return (
    <View className="gap-1 self-start">
      <GestureDetector gesture={longPress}>
        <View accessible accessibilityRole="text" accessibilityLabel={title}>
          {dot}
        </View>
      </GestureDetector>
      {revealed ? (
        <Text variant="small" tone="secondary">
          {title}
        </Text>
      ) : null}
    </View>
  );
}
