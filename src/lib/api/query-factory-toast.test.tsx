import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { toast as sonner } from "sonner-native";

import { ApiError } from "./error";
import { createMutation } from "./query-factory";

import type { ReactNode } from "react";

// query-factory.ts loads the toast with require("@/components/shared/Toast") inside the callbacks.
// The web suite cannot observe that call (Vitest does not route require through vi.mock); here the
// real Toast module is loaded through the alias and the assertions sit on the sonner-native mock
// (src/test/mocks/sonner-native.ts, registered in src/test/setup.ts).

afterEach(() => jest.clearAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const failure = new ApiError(409, "CONFLICT", "Trạng thái đã thay đổi");
const fails = async (): Promise<void> => {
  throw failure;
};

describe("createMutation toasts (require alias)", () => {
  it("shows the success message through the real Toast module", async () => {
    const useSave = createMutation(async () => "ok", { successMessage: "Đã lưu" });
    const { result } = await renderHook(() => useSave(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(sonner.success).toHaveBeenCalledWith("Đã lưu");
    expect(sonner.error).not.toHaveBeenCalled();
  });

  it("shows no success toast without a successMessage", async () => {
    const useSave = createMutation(async () => "ok");
    const { result } = await renderHook(() => useSave(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(sonner.success).not.toHaveBeenCalled();
  });

  it("shows the error message by default", async () => {
    const useSave = createMutation(fails);
    const { result } = await renderHook(() => useSave(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(undefined).catch(() => undefined);
    });

    expect(sonner.error).toHaveBeenCalledWith("Trạng thái đã thay đổi");
  });

  it("showErrorToast: false suppresses the error toast", async () => {
    const useSave = createMutation(fails, { showErrorToast: false });
    const { result } = await renderHook(() => useSave(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(undefined).catch(() => undefined);
    });

    expect(sonner.error).not.toHaveBeenCalled();
  });
});
