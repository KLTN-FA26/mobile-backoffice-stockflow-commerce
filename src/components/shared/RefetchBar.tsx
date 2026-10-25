import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { MOBILE_LABELS } from "@/constants/mobile";

import type { LayoutChangeEvent } from "react-native";

export type RefetchBarProps = {
  visible: boolean;
};

const SEGMENT_FRACTION = 0.4;
// A loading signal, not a transition: slower than the 120-180ms of UI motion on purpose.
const SWEEP_MS = 1100;

function ActiveBar() {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const segment = width * SEGMENT_FRACTION;

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [progress, reduceMotion]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -segment + progress.value * (width + segment) }],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={MOBILE_LABELS.refetching}
      accessibilityState={{ busy: true }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      className="h-full w-full bg-accent/20"
    >
      {reduceMotion ? (
        // Reduce Motion: a still bar says "busy" without the sweep.
        <View className="h-full w-full bg-accent" />
      ) : (
        <Animated.View className="h-full bg-accent" style={[{ width: segment }, sweepStyle]} />
      )}
    </View>
  );
}

/**
 * The thin line under a header while data reloads in the background. It always takes its 2px, so
 * the content below does not jump when it appears.
 */
export function RefetchBar({ visible }: RefetchBarProps) {
  return <View className="h-[2px] w-full overflow-hidden">{visible ? <ActiveBar /> : null}</View>;
}
