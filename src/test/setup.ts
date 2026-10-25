import "react-native-gesture-handler/jestSetup";
import { notifyManager, timeoutManager } from "@tanstack/react-query";
import { setUpTests } from "react-native-reanimated";

import type * as KvStoreMock from "./mocks/kv-store";
import type * as SecureStoreMock from "./mocks/secure-store";
import type * as ApiClientModule from "@/lib/api/client";
import type * as AuthStoreModule from "@/lib/auth/auth-store";
import type * as TokenStoreModule from "@/lib/auth/token-store";
import type * as TestingLibrary from "@testing-library/react-native";

setUpTests();

// react-native-gesture-handler 3 needs two more stand-ins under Jest than its own jestSetup gives
// (checked against 3.3.0, which Jest loads from `lib/module/`):
// - loading it queues a call for the UI runtime holder, which the JS-only worklets that Jest uses
//   throws for, failing the whole test file ("getUIRuntimeHolder is not supported on web");
// - `GestureDetector` throws without a `GestureHandlerRootView` above it, and tests render
//   components, not the root layout (which mounts the real one).
jest.mock(
  "react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings",
  () => ({
    installUIRuntimeBindings: () => undefined,
  }),
);
jest.mock(
  "react-native-gesture-handler/lib/module/v3/detectors/useEnsureGestureHandlerRootView",
  () => ({
    useEnsureGestureHandlerRootView: () => undefined,
  }),
);

// TanStack Query keeps a gcTime timer (5 minutes) for every unobserved query and mutation. Unref
// them, so that a finished test file does not hold its Jest worker open. They stay real timers:
// fake timers and advanceTimersByTime behave as usual.
function unref(timer: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

// By default TanStack Query tells React about state changes from a setTimeout(0), which can land
// after an async act() has returned ("not wrapped in act(...)" warnings). Run them at once.
notifyManager.setScheduler((callback) => callback());

timeoutManager.setTimeoutProvider({
  setTimeout: (callback, delay) => unref(setTimeout(callback, delay)),
  clearTimeout: (timer) => clearTimeout(timer),
  setInterval: (callback, delay) => unref(setInterval(callback, delay)),
  clearInterval: (timer) => clearInterval(timer),
});

// Libraries that later tasks install are registered as virtual mocks, so this file loads (and the
// mock activates by itself) whether or not the package is in node_modules yet. The factories only
// run when something imports the library.
jest.mock("expo-secure-store", () => jest.requireActual("./mocks/secure-store"), { virtual: true });
jest.mock("expo-camera", () => jest.requireActual("./mocks/expo-camera"), { virtual: true });
jest.mock("expo-haptics", () => jest.requireActual("./mocks/expo-haptics"), { virtual: true });
jest.mock("expo-audio", () => jest.requireActual("./mocks/expo-audio"), { virtual: true });
jest.mock(
  "@react-native-community/netinfo",
  () => jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock.js"),
  { virtual: true },
);
// The library's own mock with a BottomSheetModal that can be closed (see the file for why).
jest.mock("@gorhom/bottom-sheet", () => jest.requireActual("./mocks/gorhom-bottom-sheet"), {
  virtual: true,
});
jest.mock("sonner-native", () => jest.requireActual("./mocks/sonner-native"), { virtual: true });
jest.mock(
  "@react-native-community/datetimepicker",
  () => jest.requireActual("./mocks/datetimepicker"),
  { virtual: true },
);

// FlashList ships a setup script that registers its own mock; run it once the package exists.
function isInstalled(moduleName: string): boolean {
  try {
    require.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
}

if (isInstalled("@shopify/flash-list/jestSetup")) {
  jest.requireActual("@shopify/flash-list/jestSetup");
}

// No session outlives its test: signed-out store, no 401 handler, no token in memory, empty secure
// store and kv-store. Loaded lazily (never at the top of this file): a module imported here would
// be cached before a test file's own jest.mock (e.g. of `@/lib/config`) could take effect.
// This hook runs before RNTL's own auto-cleanup, so it unmounts first: resetting the store under a
// still-mounted tree would re-render it outside act(). `pure` registers no hooks of its own.
afterEach(async () => {
  await jest.requireActual<typeof TestingLibrary>("@testing-library/react-native/pure").cleanup();
  const { useAuthStore } = jest.requireActual<typeof AuthStoreModule>("@/lib/auth/auth-store");
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  jest.requireActual<typeof ApiClientModule>("@/lib/api/client").setUnauthorizedHandler(null);
  jest.requireActual<typeof TokenStoreModule>("@/lib/auth/token-store").setAccessToken(null);
  jest.requireActual<typeof SecureStoreMock>("./mocks/secure-store").__clear();
  jest.requireActual<typeof KvStoreMock>("./mocks/kv-store").Storage.clearSync();
});
