import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "./error";
import { createMutation } from "./query-factory";

import type { ReactNode } from "react";

// Toast trong factory nạp bằng require() động (tránh import vòng) — các test ở đây kiểm invalidate
// + thứ tự callback, không kiểm toast (toast: query-factory-toast.test.tsx, chỉ có ở mobile).

afterEach(() => jest.restoreAllMocks());

const KEY = ["things"] as const;

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

describe("createMutation — callback truyền vào hook không đè hành vi của factory", () => {
  it("onSuccess của hook: factory vẫn invalidate, rồi gọi callback màn hình", async () => {
    const useSave = createMutation(async (n: number) => n * 2, {
      invalidate: [KEY],
      successMessage: "Đã lưu",
    });
    const onSuccess = jest.fn();
    const { invalidate, wrapper } = setup();
    const { result } = await renderHook(() => useSave({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(21);
    });

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: KEY }));
    expect(onSuccess).toHaveBeenCalledWith(42, 21, undefined, expect.anything());
  });

  it("onError của hook: callback màn hình chạy, không invalidate", async () => {
    const failure = new ApiError(409, "CONFLICT", "Conflicting state");
    const useSave = createMutation(
      async (): Promise<void> => {
        throw failure;
      },
      { invalidate: [KEY] },
    );
    const onError = jest.fn();
    const { invalidate, wrapper } = setup();
    const { result } = await renderHook(() => useSave({ onError }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(undefined).catch(() => undefined);
    });

    expect(onError).toHaveBeenCalledWith(failure, undefined, undefined, expect.anything());
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("callback màn hình chạy SAU invalidate của factory", async () => {
    const calls: string[] = [];
    const useSave = createMutation(async () => "ok", { invalidate: [KEY] });
    const { invalidate, wrapper } = setup();
    invalidate.mockImplementation(async () => {
      calls.push("invalidate");
    });
    const { result } = await renderHook(() => useSave({ onSuccess: () => calls.push("screen") }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(calls).toEqual(["invalidate", "screen"]);
  });
});
