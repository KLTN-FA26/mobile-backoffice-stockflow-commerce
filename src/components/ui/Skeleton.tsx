import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/utils";

export type SkeletonProps = {
  className?: string;
};

const PULSE_LOW_OPACITY = 0.5;
const PULSE_HALF_CYCLE_MS = 800;

/**
 * A loading placeholder. The slow pulse is a loading signal, not decoration, which is why it is
 * longer than the 120-180ms of a transition; with Reduce Motion on it stays still. Screen readers
 * skip it: the screen that shows skeletons announces that it is loading.
 */
export function Skeleton({ className }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withTiming(PULSE_LOW_OPACITY, { duration: PULSE_HALF_CYCLE_MS }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(opacity);
      opacity.value = 1;
    };
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("rounded-md bg-bg-muted", className)}
      style={animatedStyle}
    />
  );
}
