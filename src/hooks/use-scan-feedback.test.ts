import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { SCAN_MOBILE_LIMITS } from "@/constants/mobile";

import { useAppStore } from "@/lib/store/use-app-store";

import { __played } from "@/test/mocks/expo-audio";
import { notificationAsync } from "@/test/mocks/expo-haptics";

import { useScanFeedback } from "./use-scan-feedback";

const OK = { tone: "positive", message: "Đã quét PKG-1" } as const;
const WRONG = { tone: "danger", message: "Kiện không thuộc lô giao" } as const;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useAppStore.setState(useAppStore.getInitialState(), true);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/**
 * Follows the hook's own timer (the one set for `positiveFeedbackMs`): React and other libraries
 * set timers of their own inside `act`, so counting every pending timer says nothing.
 */
function watchFeedbackTimer() {
  const set = jest.spyOn(globalThis, "setTimeout");
  const clear = jest.spyOn(globalThis, "clearTimeout");
  return {
    cleared(): boolean {
      const index = set.mock.calls.findIndex(
        ([, ms]) => ms === SCAN_MOBILE_LIMITS.positiveFeedbackMs,
      );
      if (index === -1) throw new Error("the hook set no feedback timer");
      const timer: unknown = set.mock.results[index]?.value;
      return clear.mock.calls.some(([id]) => id === timer);
    },
  };
}

describe("useScanFeedback", () => {
  it("starts empty", async () => {
    const { result } = await renderHook(() => useScanFeedback());

    expect(result.current.feedback).toBeNull();
  });

  it("positive clears after 1500 ms", async () => {
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(OK));
    expect(result.current.feedback).toEqual(OK);

    await act(async () => jest.advanceTimersByTime(SCAN_MOBILE_LIMITS.positiveFeedbackMs - 1));
    expect(result.current.feedback).toEqual(OK);
    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current.feedback).toBeNull();
  });

  it("danger persists until next show", async () => {
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(WRONG));
    await act(async () => jest.advanceTimersByTime(SCAN_MOBILE_LIMITS.positiveFeedbackMs * 10));
    expect(result.current.feedback).toEqual(WRONG);

    await act(async () => result.current.show(OK));
    expect(result.current.feedback).toEqual(OK);
  });

  it("a new show restarts the positive timer, and a danger one cancels it", async () => {
    const { result } = await renderHook(() => useScanFeedback());
    const again = { tone: "positive", message: "Đã quét PKG-2" } as const;

    await act(async () => result.current.show(OK));
    await act(async () => jest.advanceTimersByTime(1000));
    await act(async () => result.current.show(again));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(result.current.feedback).toEqual(again);

    await act(async () => result.current.show(WRONG));
    await act(async () => jest.advanceTimersByTime(SCAN_MOBILE_LIMITS.positiveFeedbackMs));
    expect(result.current.feedback).toEqual(WRONG);
  });

  it("clear removes the feedback and its timer", async () => {
    const timers = watchFeedbackTimer();
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(OK));
    await act(async () => result.current.clear());

    expect(result.current.feedback).toBeNull();
    expect(timers.cleared()).toBe(true);
  });

  it("drops the timer on unmount", async () => {
    const timers = watchFeedbackTimer();
    const { result, unmount } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(OK));
    expect(timers.cleared()).toBe(false);
    await unmount();

    expect(timers.cleared()).toBe(true);
  });

  it("plays the tone and vibrates by tone", async () => {
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(OK));
    expect(__played).toHaveBeenCalledTimes(1);
    expect(notificationAsync).toHaveBeenLastCalledWith("success");

    await act(async () => result.current.show(WRONG));
    expect(__played).toHaveBeenCalledTimes(2);
    expect(notificationAsync).toHaveBeenLastCalledWith("error");
  });

  it("muted skips sound but still vibrates", async () => {
    useAppStore.getState().setMuted(true);
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(WRONG));

    expect(__played).not.toHaveBeenCalled();
    expect(notificationAsync).toHaveBeenCalledWith("error");
  });

  it("vibration off skips the haptic but still plays", async () => {
    useAppStore.getState().setHapticsEnabled(false);
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(OK));

    expect(__played).toHaveBeenCalledTimes(1);
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  it("announces message", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const { result } = await renderHook(() => useScanFeedback());

    await act(async () => result.current.show(WRONG));

    expect(announce).toHaveBeenCalledWith(WRONG.message);
  });
});
