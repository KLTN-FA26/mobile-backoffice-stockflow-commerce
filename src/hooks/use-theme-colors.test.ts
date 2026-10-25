import { renderHook } from "@testing-library/react-native";
import { useColorScheme } from "react-native";

import { useAppStore } from "@/lib/store/use-app-store";
import { COLOR_TOKENS } from "@/lib/tokens";

import { useThemeColors } from "./use-theme-colors";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedUseColorScheme = jest.mocked(useColorScheme);

beforeEach(() => {
  mockedUseColorScheme.mockReturnValue("light");
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe("useThemeColors", () => {
  it("returns the light hex values by default", async () => {
    const { result } = await renderHook(() => useThemeColors());
    expect(result.current).toEqual(COLOR_TOKENS.light);
  });

  it("returns the dark hex values when the theme is dark", async () => {
    useAppStore.getState().setTheme("dark");
    const { result } = await renderHook(() => useThemeColors());
    expect(result.current).toEqual(COLOR_TOKENS.dark);
  });

  it("follows the system scheme when the theme is system", async () => {
    mockedUseColorScheme.mockReturnValue("dark");
    const { result } = await renderHook(() => useThemeColors());
    expect(result.current).toEqual(COLOR_TOKENS.dark);
  });
});
