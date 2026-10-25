import { render } from "@testing-library/react-native";
import { Toaster, toast as sonner } from "sonner-native";

import { ToastProvider, toast } from "./Toast";

// sonner-native is replaced by src/test/mocks/sonner-native.ts (registered in src/test/setup.ts).

afterEach(() => jest.clearAllMocks());

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
});

describe("ToastProvider", () => {
  it("renders the sonner-native toaster at the top centre", async () => {
    await render(<ToastProvider />);

    expect(Toaster).toHaveBeenCalled();
    expect(jest.mocked(Toaster).mock.calls[0]?.[0]).toEqual({ position: "top-center" });
  });
});
