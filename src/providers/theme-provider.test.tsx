import { act, render, screen } from "@testing-library/react-native";
import { Appearance, Text, useColorScheme } from "react-native";

import { useAppStore } from "@/lib/store/use-app-store";

import { ThemeProvider, useResolvedScheme } from "./theme-provider";

import type { ReactElement } from "react";

// Under Jest NativeWind's runtime is off (it skips registering components when NODE_ENV is
// "test"), and the real `vars()` returns an opaque object that only that runtime can read. A
// transparent stand-in lets the test see which variables the provider hands down.
jest.mock("nativewind", () => ({
  vars: (variables: Record<string, string>) => ({ ...variables }),
}));

const mockStatusBar = jest.fn((_props: { style?: string }) => null);
jest.mock("expo-status-bar", () => ({
  StatusBar: (props: { style?: string }) => mockStatusBar(props),
}));

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedUseColorScheme = jest.mocked(useColorScheme);

function Probe(): ReactElement {
  return <Text>{useResolvedScheme()}</Text>;
}

async function renderProvider() {
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

/** The style the provider's root View received, flattened into one object. */
function rootStyle(): Record<string, unknown> {
  const root = screen.toJSON();
  if (root === null || Array.isArray(root)) throw new Error("expected a single root node");
  return Object.assign({}, ...[root.props.style].flat(Infinity));
}

beforeEach(() => {
  mockStatusBar.mockClear();
  mockedUseColorScheme.mockReturnValue("light");
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe("ThemeProvider", () => {
  it("uses dark vars when theme is dark", async () => {
    useAppStore.getState().setTheme("dark");
    await renderProvider();
    expect(rootStyle()["--bg-base"]).toBe("14 15 17");
    expect(screen.getByText("dark")).toBeTruthy();
  });

  it("uses light vars when theme is light, whatever the system says", async () => {
    mockedUseColorScheme.mockReturnValue("dark");
    useAppStore.getState().setTheme("light");
    await renderProvider();
    expect(rootStyle()["--bg-base"]).toBe("246 246 246");
    expect(screen.getByText("light")).toBeTruthy();
  });

  it("follows the system scheme when theme is system", async () => {
    mockedUseColorScheme.mockReturnValue("dark");
    await renderProvider();
    expect(rootStyle()["--bg-base"]).toBe("14 15 17");
  });

  it("falls back to light when the system has no scheme", async () => {
    mockedUseColorScheme.mockReturnValue(null);
    await renderProvider();
    expect(rootStyle()["--bg-base"]).toBe("246 246 246");
  });

  it("switches variables when the theme changes", async () => {
    await renderProvider();
    expect(rootStyle()["--ink-primary"]).toBe("26 27 24");

    await act(async () => {
      useAppStore.getState().setTheme("dark");
    });
    expect(rootStyle()["--ink-primary"]).toBe("244 244 241");
  });

  it("shows light status bar content on dark and dark content on light", async () => {
    useAppStore.getState().setTheme("dark");
    await renderProvider();
    expect(mockStatusBar).toHaveBeenLastCalledWith({ style: "light" });

    await act(async () => {
      useAppStore.getState().setTheme("light");
    });
    expect(mockStatusBar).toHaveBeenLastCalledWith({ style: "dark" });
  });

  it("fills the screen", async () => {
    await renderProvider();
    expect(rootStyle().flex).toBe(1);
  });

  it("hands the choice to the native appearance so pickers and alerts match", async () => {
    const setColorScheme = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
    useAppStore.getState().setTheme("dark");
    await renderProvider();
    expect(setColorScheme).toHaveBeenLastCalledWith("dark");

    await act(async () => {
      useAppStore.getState().setTheme("system");
    });
    expect(setColorScheme).toHaveBeenLastCalledWith("unspecified");
    setColorScheme.mockRestore();
  });
});
