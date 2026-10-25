import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";

/**
 * Points React Query's focus and online detection at the native app: focused while the app state
 * is `active`, online unless NetInfo says the connection is down. Returns a cleanup that removes
 * both native listeners and puts the managers back to their defaults.
 */
export function wireReactQueryToNative(): () => void {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (state) => {
      handleFocus(state === "active");
    });
    return () => subscription.remove();
  });

  // `isConnected` is null until NetInfo has probed: that must not pause queries, only a clear
  // `false` does.
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false);
    }),
  );

  return () => {
    // Replacing the setup function runs the previous one's cleanup, which detaches the listeners.
    focusManager.setEventListener(() => undefined);
    onlineManager.setEventListener(() => undefined);
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  };
}
