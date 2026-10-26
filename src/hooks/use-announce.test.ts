import { renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";

import { useAnnounce } from "./use-announce";

import type { AnnounceOptions } from "./use-announce";

type Props = { message: string | null | undefined; options?: AnnounceOptions };

const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
const platform = Platform.OS;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

beforeEach(() => {
  announce.mockReset().mockImplementation(() => undefined);
});

afterEach(() => setPlatform(platform));

async function renderAnnounce(initial: Props) {
  return renderHook(({ message, options }: Props) => useAnnounce(message, options), {
    initialProps: initial,
  });
}

describe("useAnnounce", () => {
  it("says a message once when it shows, and again only when it changes", async () => {
    setPlatform("ios");
    const { rerender } = await renderAnnounce({ message: null });
    expect(announce).not.toHaveBeenCalled();

    await rerender({ message: "Bắt buộc nhập" });
    await rerender({ message: "Bắt buộc nhập" });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith("Bắt buộc nhập");

    await rerender({ message: "Tối đa 20 ký tự" });
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith("Tối đa 20 ký tự");
  });

  it("says a message that is there from the start", async () => {
    setPlatform("ios");
    await renderAnnounce({ message: "Mất kết nối" });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Mất kết nối");
  });

  it("says nothing for no message, an empty one, or one that goes away", async () => {
    setPlatform("ios");
    const { rerender } = await renderAnnounce({ message: undefined });
    await rerender({ message: "" });
    await rerender({ message: "Lỗi" });
    await rerender({ message: null });

    expect(announce).toHaveBeenCalledTimes(1);
  });

  it("says the same message again after it went away and came back", async () => {
    setPlatform("ios");
    const { rerender } = await renderAnnounce({ message: "Lỗi" });
    await rerender({ message: null });
    await rerender({ message: "Lỗi" });

    expect(announce).toHaveBeenCalledTimes(2);
  });

  it("leaves Android to the element's live region unless asked", async () => {
    setPlatform("android");
    const { rerender } = await renderAnnounce({ message: "Lỗi" });
    expect(announce).not.toHaveBeenCalled();

    await rerender({ message: "Chọn kho", options: { android: true } });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Chọn kho");
  });
});
