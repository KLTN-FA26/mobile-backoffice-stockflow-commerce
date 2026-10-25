import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { makeQueryClient } from "@/lib/api/query-client";

import { useAuthStore } from "./auth-store";
import { useCan } from "./components/Can";
import { hasPermission, isPermissionCode, meKeys } from "./me-permissions";

import type { QueryClient } from "@tanstack/react-query";

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// `gate` holds the permissions response back: renderHook of RNTL 14 runs inside an async act that
// would otherwise let an instant mock resolve before the "loading" state can be asserted.
function mockPermissions(permissions: unknown, gate?: Promise<void>) {
  return jest.spyOn(api, "get").mockImplementation(async (url: string) => {
    await gate;
    if (url === "/identity/me/permissions")
      return { data: { roles: [], permissions, dataScope: "ALL" } };
    throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền");
  });
}

beforeEach(() => {
  useAuthStore.setState({
    user: {
      userId: "u1",
      fullName: "U",
      email: "u@u.vn",
      roles: [],
      username: "test",
      status: "ACTIVE",
      lastLoginAt: null,
    },
    status: "authenticated",
    isAuthenticated: true,
  });
});

afterEach(() => jest.restoreAllMocks());

describe("isPermissionCode / hasPermission", () => {
  it("nhận dạng mã quyền BE, phân biệt với quyền cũ dạng module.action", () => {
    expect(isPermissionCode("procurement-suppliers:CREATE")).toBe(true);
    expect(isPermissionCode("product.create")).toBe(false);
  });

  it("chưa có dữ liệu quyền → coi như không có quyền", () => {
    expect(hasPermission(undefined, "procurement-suppliers:READ")).toBe(false);
  });
});

describe("useCan với mã quyền thật", () => {
  it("đang tải → false (không nháy nút), tải xong → theo /me/permissions", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockPermissions(["procurement-suppliers:READ"], gate);
    const client = makeQueryClient();
    const { result } = await renderHook(
      () => [useCan("procurement-suppliers:READ"), useCan("procurement-suppliers:DELETE")],
      { wrapper: wrapperFor(client) },
    );

    expect(result.current).toEqual([false, false]);
    await act(async () => release());
    await waitFor(() => expect(result.current).toEqual([true, false]));
  });

  it("dữ liệu quyền sai định dạng → không có quyền", async () => {
    mockPermissions("không phải mảng");
    const client = makeQueryClient();
    client.setDefaultOptions({ queries: { retry: false } });
    const { result } = await renderHook(() => useCan("procurement-suppliers:READ"), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() =>
      expect(
        client.getQueryState(
          meKeys.sessionPermissions("u1", useAuthStore.getState().authorizationVersion),
        )?.status,
      ).toBe("error"),
    );
    expect(result.current).toBe(false);
  });
});

describe("tải lại quyền khi gặp 403 (BE PR #39)", () => {
  it("một query khác bị 403 → invalidate /me/permissions", async () => {
    const get = mockPermissions(["procurement-suppliers:READ"]);
    const client = makeQueryClient();
    const wrapper = wrapperFor(client);
    await renderHook(() => useCan("procurement-suppliers:READ"), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    const invalidate = jest.spyOn(client, "invalidateQueries");
    await renderHook(
      () =>
        useQuery({
          queryKey: ["suppliers", "list"],
          queryFn: () => api.get("/suppliers"),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: meKeys.permissions() }),
    );
  });
});
