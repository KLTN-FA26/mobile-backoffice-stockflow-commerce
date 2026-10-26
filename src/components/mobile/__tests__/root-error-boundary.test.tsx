/**
 * The root layout's error boundary, in a file of its own: rendering `ThemeProvider` (expo-status-bar)
 * after `renderRouter` has run in the same file never settles under Jest, and the navigation tests
 * render the router.
 */
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { UI_LABELS } from "@/constants";
import { MOBILE_LABELS } from "@/constants/mobile";

import { ApiError } from "@/lib/api/error";

import { ErrorBoundary } from "../../../../app/_layout";

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));

// Expo Router mounts a SafeAreaProvider above the root layout; Jest has no window metrics.
const WINDOW_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

describe("root error boundary", () => {
  it("the root layout's error boundary brings its own providers", async () => {
    // What no deeper boundary catches (the login screen, the gates) replaces the root layout,
    // AppProviders included: the boundary must still show, themed, with its retry.
    const retry = jest.fn(async () => undefined);
    const user = userEvent.setup();
    await render(
      <SafeAreaProvider initialMetrics={WINDOW_METRICS}>
        <ErrorBoundary error={new ApiError(0, "NETWORK_ERROR", "x")} retry={retry} />
      </SafeAreaProvider>,
    );

    expect(await screen.findByText(UI_LABELS.loadError.networkTitle)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
