import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";
import { Toaster, toast as sonner } from "sonner-native";

import { UI_LIMITS } from "@/constants/mobile";

import { useAppStore } from "@/lib/store/use-app-store";
import { COLOR_TOKENS, MOTION_MS, RADIUS } from "@/lib/tokens";

import { toast } from "./Toast";
import { ToastProvider } from "./ToastProvider";

import type { ToasterProps } from "sonner-native";

// sonner-native is replaced by src/test/mocks/sonner-native.ts (registered in src/test/setup.ts).

const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
const platform = Platform.OS;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

beforeEach(() => {
  jest.clearAllMocks();
  announce.mockImplementation(() => undefined);
});

afterEach(() => {
  setPlatform(platform);
  useAppStore.setState(useAppStore.getInitialState(), true);
});

/** The props of the last Toaster render. */
function toasterProps(): ToasterProps {
  const props = jest.mocked(Toaster).mock.lastCall?.[0];
  if (props === undefined) throw new Error("the Toaster was not rendered");
  return props as ToasterProps;
}

describe("toast", () => {
  it("toast.success forwards title to sonner-native", () => {
    toast.success("Đã lưu");

    expect(sonner.success).toHaveBeenCalledTimes(1);
    expect(sonner.success).toHaveBeenCalledWith("Đã lưu");
  });

  it.each([["success"], ["error"], ["warning"], ["info"]] as const)(
    "toast.%s uses the matching sonner-native variant and passes the description",
    (tone) => {
      toast[tone]("Tiêu đề", "Chi tiết");

      expect(sonner[tone]).toHaveBeenCalledWith("Tiêu đề", { description: "Chi tiết" });
      const others = (["success", "error", "warning", "info"] as const).filter((t) => t !== tone);
      for (const other of others) expect(sonner[other]).not.toHaveBeenCalled();
    },
  );

  it("a toast is spoken on iOS, which has no live regions", () => {
    setPlatform("ios");
    toast.error("Không lưu được");
    toast.info("Đã đồng bộ", "3 phiếu");

    expect(announce).toHaveBeenNthCalledWith(1, "Không lưu được");
    expect(announce).toHaveBeenNthCalledWith(2, "Đã đồng bộ. 3 phiếu");
  });

  it("a toast is left to its live region on Android", () => {
    setPlatform("android");
    toast.error("Không lưu được");

    expect(announce).not.toHaveBeenCalled();
  });
});

describe("ToastProvider", () => {
  it("renders the sonner-native toaster at the top centre, capped for font scaling", async () => {
    await render(<ToastProvider />);

    expect(toasterProps().position).toBe("top-center");
    expect(toasterProps().maxFontSizeMultiplier).toBe(UI_LIMITS.maxFontSizeMultiplier);
  });

  it("styles the toast and its icons from the tokens of the scheme in effect", async () => {
    await act(async () => useAppStore.setState({ theme: "dark" }));
    await render(<ToastProvider />);
    const dark = COLOR_TOKENS.dark;

    const { style, titleStyle, descriptionStyle } = toasterProps().toastOptions ?? {};
    expect(style).toEqual(
      expect.objectContaining({
        backgroundColor: dark["bg-surface"],
        borderColor: dark["border-default"],
        borderRadius: RADIUS.md,
      }),
    );
    expect(titleStyle).toEqual(expect.objectContaining({ color: dark["ink-primary"] }));
    expect(descriptionStyle).toEqual(expect.objectContaining({ color: dark["ink-secondary"] }));
    const icons = toasterProps().icons ?? {};
    for (const tone of ["success", "error", "warning", "info", "loading"] as const) {
      expect(icons[tone]).toBeDefined();
    }
  });

  it("moves toasts in and out within 120-180 ms", async () => {
    await render(<ToastProvider />);

    const { enter, exit } = toasterProps().animation ?? {};
    const duration = (builder: unknown) =>
      typeof builder === "object" && builder !== null && "getDuration" in builder
        ? (builder as { getDuration: () => number }).getDuration()
        : undefined;
    expect(duration(enter)).toBe(MOTION_MS.standard);
    expect(duration(exit)).toBe(MOTION_MS.fast);
  });
});
