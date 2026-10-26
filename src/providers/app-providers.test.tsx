import { useQueryClient } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { wireReactQueryToNative } from "@/lib/platform/react-query-native";

import { AppProviders } from "./app-providers";

import type * as ReactModule from "react";
import type * as ReactNativeModule from "react-native";

jest.mock("@/lib/platform/react-query-native", () => ({ wireReactQueryToNative: jest.fn() }));

// The sheet provider and the Toaster as host views (the usual stand-ins render none), so a test
// can see where each sits in the tree. Everything else stays as in src/test/setup.ts.
const SHEET_HOST_ID = "sheet-portal-host";
const TOASTER_ID = "toaster";
jest.mock("@gorhom/bottom-sheet", () => {
  const { createElement } = jest.requireActual<typeof ReactModule>("react");
  const { View } = jest.requireActual<typeof ReactNativeModule>("react-native");
  return {
    ...jest.requireActual<object>("@/test/mocks/gorhom-bottom-sheet"),
    BottomSheetModalProvider: ({ children }: { children: ReactModule.ReactNode }) =>
      createElement(View, { testID: "sheet-portal-host" }, children),
  };
});
jest.mock("sonner-native", () => {
  const { createElement } = jest.requireActual<typeof ReactModule>("react");
  const { View } = jest.requireActual<typeof ReactNativeModule>("react-native");
  return {
    ...jest.requireActual<object>("@/test/mocks/sonner-native"),
    Toaster: () => createElement(View, { testID: "toaster" }),
  };
});

const wire = jest.mocked(wireReactQueryToNative);

// Expo Router's root mounts a SafeAreaProvider above the root layout, and AppProviders' own one
// takes its insets from it. Jest has no native window metrics, so the tests supply that parent.
const WINDOW_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};
const wrapper = ({ children }: { children: ReactModule.ReactNode }) => (
  <SafeAreaProvider initialMetrics={WINDOW_METRICS}>{children}</SafeAreaProvider>
);

type RootViewCheck = { useEnsureGestureHandlerRootView: () => void };

// src/test/setup.ts replaces this hook with a no-op so component tests can render gestures without
// the root layout. Loading the real one here is what lets the test notice a missing root view: it
// throws "GestureDetector must be used as a descendant of GestureHandlerRootView" without one.
const { useEnsureGestureHandlerRootView } = jest.requireActual<RootViewCheck>(
  "react-native-gesture-handler/lib/module/v3/detectors/useEnsureGestureHandlerRootView",
);

function GestureProbe() {
  useEnsureGestureHandlerRootView();
  return <Text>gestures ready</Text>;
}

function QueryClientProbe() {
  const client = useQueryClient();
  return <Text>{client.getDefaultOptions().mutations?.retry === false ? "app client" : "?"}</Text>;
}

beforeEach(() => {
  wire.mockReset();
});

describe("AppProviders", () => {
  it("mounts a real gesture handler root view above the app", async () => {
    await render(
      <AppProviders>
        <GestureProbe />
      </AppProviders>,
      { wrapper },
    );

    expect(screen.getByText("gestures ready")).toBeOnTheScreen();
  });

  it("the gesture check fails without the root view", async () => {
    // Guards the test above: the real check does throw when nothing provides the root view.
    // React logs the render error before rethrowing it.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(render(<GestureProbe />, { wrapper })).rejects.toThrow("GestureHandlerRootView");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("mounts the toaster after the sheet portal host, so toasts draw above open sheets", async () => {
    await render(
      <AppProviders>
        <Text>screen</Text>
      </AppProviders>,
      { wrapper },
    );

    const host = screen.getByTestId(SHEET_HOST_ID);
    const toaster = screen.getByTestId(TOASTER_ID);
    // Not inside the sheet provider, where the portal host renders after it...
    expect(within(host).queryByTestId(TOASTER_ID)).toBeNull();
    // ...but its next sibling, so it is laid out (and drawn) after every sheet.
    expect(toaster.parent).toBe(host.parent);
    const siblings = host.parent?.children ?? [];
    expect(siblings.indexOf(toaster)).toBeGreaterThan(siblings.indexOf(host));
    expect(within(host).getByText("screen")).toBeOnTheScreen();
  });

  it("provides the app query client to the screens", async () => {
    await render(
      <AppProviders>
        <QueryClientProbe />
      </AppProviders>,
      { wrapper },
    );

    expect(screen.getByText("app client")).toBeOnTheScreen();
  });

  it("wires React Query to the app state and network once, and unwires on unmount", async () => {
    const unwire = jest.fn();
    wire.mockReturnValue(unwire);

    const { rerender, unmount } = await render(
      <AppProviders>
        <Text>one</Text>
      </AppProviders>,
      { wrapper },
    );
    await rerender(
      <AppProviders>
        <Text>two</Text>
      </AppProviders>,
    );

    expect(wire).toHaveBeenCalledTimes(1);
    expect(unwire).not.toHaveBeenCalled();

    await unmount();

    expect(unwire).toHaveBeenCalledTimes(1);
  });
});
