/**
 * Regressions found in the Android emulator acceptance run (2026-10-26, report
 * `docs/superpowers/plans/2026-10-26-p0-acceptance-android.md`): L1 clipped button label, L2 dark
 * switch thumb, L3 screen readers behind an open sheet.
 */
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

import { useAppStore } from "@/lib/store/use-app-store";
import { COLOR_TOKENS, MOTION_MS } from "@/lib/tokens";

import { Button, Sheet, Switch, Text } from "@/components/ui";
import { SCREEN_BEHIND_SHEETS_TEST_ID, ScreenBehindSheets } from "@/components/ui/sheet-a11y";

import { ThemeProvider } from "@/providers/theme-provider";

import type { Scheme } from "@/lib/tokens";

function withPlatform(os: "android" | "ios", run: () => Promise<void>): Promise<void> {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
  return run().finally(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => original });
  });
}

afterEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe("L1 button label", () => {
  it("button label stays on one line, so Android never hides a wrapped last word", async () => {
    // On Android a label that hugs its width and has a line height wrapped "Đăng xuất" onto a
    // second, clipped line ("Đăng" alone was visible). One line renders the whole label.
    await render(<Button label="Đăng xuất" onPress={jest.fn()} />);

    expect(screen.getByText("Đăng xuất")).toHaveProp("numberOfLines", 1);
  });
});

describe("L2 switch thumb", () => {
  // The native switch is drawn only (hidden from screen readers); its host gets `thumbColor` as
  // `thumbTintColor`.
  function thumbOf() {
    const native = screen
      .getAllByRole("switch", { includeHiddenElements: true })
      .find((node) => node.props.thumbTintColor !== undefined);
    return native?.props.thumbTintColor;
  }

  it.each<[Scheme]>([["light"], ["dark"]])(
    "switch thumb uses the thumb token in %s, never the card surface it sits on",
    async (scheme) => {
      useAppStore.getState().setTheme(scheme);
      await render(
        <ThemeProvider>
          <Switch label="Âm thanh khi quét" value onValueChange={jest.fn()} />
        </ThemeProvider>,
      );

      expect(thumbOf()).toBe(COLOR_TOKENS[scheme].thumb);
    },
  );

  it("thumb token stands out from the card in both themes", () => {
    expect(COLOR_TOKENS.dark.thumb).not.toBe(COLOR_TOKENS.dark["bg-surface"]);
    expect(COLOR_TOKENS.light.thumb).toBe(COLOR_TOKENS.light["bg-surface"]);
  });
});

function SheetHarness({ initial = false }: { initial?: boolean }) {
  const [open, setOpen] = useState(initial);
  const [second, setSecond] = useState(false);
  return (
    <ScreenBehindSheets>
      <Text>Màn phía sau</Text>
      <Button label="Mở" onPress={() => setOpen(true)} />
      <Button label="Mở thêm" onPress={() => setSecond(true)} />
      <Sheet open={open} onOpenChange={setOpen} title="Chọn kho">
        <Button label="Đóng" onPress={() => setOpen(false)} />
      </Sheet>
      <Sheet open={second} onOpenChange={setSecond} title="Lọc">
        <Button label="Đóng lọc" onPress={() => setSecond(false)} />
      </Sheet>
    </ScreenBehindSheets>
  );
}

function screenBehind() {
  return screen.getByTestId(SCREEN_BEHIND_SHEETS_TEST_ID, { includeHiddenElements: true });
}

describe("L3 screen readers and an open sheet", () => {
  it("screen behind an open sheet is hidden from screen readers and comes back when it closes", async () => {
    const user = userEvent.setup();
    await render(<SheetHarness />, { wrapper: BottomSheetModalProvider });
    expect(screenBehind()).toHaveProp("importantForAccessibility", "auto");
    expect(screenBehind()).toHaveProp("accessibilityElementsHidden", false);

    await user.press(screen.getByRole("button", { name: "Mở" }));
    expect(screen.getByRole("header", { name: "Chọn kho" })).toBeTruthy();
    expect(screenBehind()).toHaveProp("importantForAccessibility", "no-hide-descendants");
    expect(screenBehind()).toHaveProp("accessibilityElementsHidden", true);
    // The sheet itself, drawn in the portal after the screens, stays readable.
    expect(screen.getByRole("button", { name: "Đóng" })).toBeTruthy();

    await user.press(screen.getByRole("button", { name: "Đóng" }));
    expect(screenBehind()).toHaveProp("importantForAccessibility", "auto");
  });

  it("screen stays hidden until the last of two open sheets closes", async () => {
    const user = userEvent.setup();
    await render(<SheetHarness initial />, { wrapper: BottomSheetModalProvider });
    // Readers no longer see the screen while the first sheet is open; a finger still reaches it.
    await user.press(screen.getByRole("button", { name: "Mở thêm", includeHiddenElements: true }));
    expect(screenBehind()).toHaveProp("importantForAccessibility", "no-hide-descendants");

    // The second sheet is now the modal one, so readers skip the first; close it by touch.
    await user.press(screen.getByRole("button", { name: "Đóng", includeHiddenElements: true }));
    expect(screenBehind()).toHaveProp("importantForAccessibility", "no-hide-descendants");

    await user.press(screen.getByRole("button", { name: "Đóng lọc" }));
    expect(screenBehind()).toHaveProp("importantForAccessibility", "auto");
  });

  it("on android a sheet moves TalkBack's focus to its title instead of announcing it", () =>
    withPlatform("android", async () => {
      jest.useFakeTimers();
      const focus = jest
        .spyOn(AccessibilityInfo, "sendAccessibilityEvent")
        .mockImplementation(() => undefined);
      const announce = jest
        .spyOn(AccessibilityInfo, "announceForAccessibility")
        .mockImplementation(() => undefined);
      // Both may already be jest mocks from the global setup: start from no calls.
      focus.mockClear();
      announce.mockClear();
      try {
        await render(<SheetHarness initial />, { wrapper: BottomSheetModalProvider });
        expect(screen.getByRole("header", { name: "Chọn kho" })).toBeTruthy();
        expect(focus).not.toHaveBeenCalled();

        await act(() => jest.advanceTimersByTime(MOTION_MS.standard));

        expect(focus).toHaveBeenCalledTimes(1);
        expect(focus).toHaveBeenCalledWith(expect.anything(), "focus");
        expect(announce).not.toHaveBeenCalled();
      } finally {
        focus.mockRestore();
        announce.mockRestore();
        jest.useRealTimers();
      }
    }));

  it("on ios a sheet announces its title and leaves focus to VoiceOver's modal handling", () =>
    withPlatform("ios", async () => {
      jest.useFakeTimers();
      const focus = jest
        .spyOn(AccessibilityInfo, "sendAccessibilityEvent")
        .mockImplementation(() => undefined);
      const announce = jest
        .spyOn(AccessibilityInfo, "announceForAccessibility")
        .mockImplementation(() => undefined);
      // Both may already be jest mocks from the global setup: start from no calls.
      focus.mockClear();
      announce.mockClear();
      try {
        await render(<SheetHarness initial />, { wrapper: BottomSheetModalProvider });
        await act(() => jest.advanceTimersByTime(MOTION_MS.standard));

        expect(announce).toHaveBeenCalledWith("Chọn kho");
        expect(focus).not.toHaveBeenCalled();
      } finally {
        focus.mockRestore();
        announce.mockRestore();
        jest.useRealTimers();
      }
    }));
});
