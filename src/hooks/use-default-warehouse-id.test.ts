import { act, renderHook } from "@testing-library/react-native";

import { useAuthStore } from "@/lib/auth/auth-store";
import { useAppStore } from "@/lib/store/use-app-store";

import { useDefaultWarehouseId } from "./use-default-warehouse-id";

import type { AuthUser } from "@/lib/auth/auth-store";

const HOUR_MS = 3_600_000;
const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice Nguyễn",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};
const BOB: AuthUser = { ...ALICE, userId: "u-bob", username: "bob", fullName: "Bob Trần" };

const signIn = (user: AuthUser) => useAuthStore.getState().login(user, Date.now() + HOUR_MS);

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe("useDefaultWarehouseId", () => {
  it("is null while signed out, even when somebody saved a default earlier", async () => {
    useAppStore.getState().setDefaultWarehouse(ALICE.userId, "wh-a");

    const { result } = await renderHook(() => useDefaultWarehouseId());

    expect(result.current).toBeNull();
  });

  it("is null for a signed-in user who chose none", async () => {
    signIn(ALICE);

    const { result } = await renderHook(() => useDefaultWarehouseId());

    expect(result.current).toBeNull();
  });

  it("reads the signed-in user's own entry, not another user's", async () => {
    useAppStore.getState().setDefaultWarehouse(ALICE.userId, "wh-a");
    useAppStore.getState().setDefaultWarehouse(BOB.userId, "wh-b");
    signIn(BOB);

    const { result } = await renderHook(() => useDefaultWarehouseId());

    expect(result.current).toBe("wh-b");
  });

  it("follows the user switch and the store, in the same render", async () => {
    signIn(ALICE);
    const seen: (string | null)[] = [];
    const { result } = await renderHook(() => {
      const id = useDefaultWarehouseId();
      seen.push(id);
      return id;
    });

    await act(async () => useAppStore.getState().setDefaultWarehouse(ALICE.userId, "wh-a"));
    expect(result.current).toBe("wh-a");

    // Bob signs in on the same phone: he must never see Alice's warehouse, not even for one render.
    const rendersWithAlicesChoice = seen.length;
    await act(async () => signIn(BOB));
    expect(result.current).toBeNull();
    expect(seen.slice(rendersWithAlicesChoice)).not.toContain("wh-a");

    await act(async () => useAppStore.getState().setDefaultWarehouse(BOB.userId, "wh-b"));
    expect(result.current).toBe("wh-b");

    await act(async () => signIn(ALICE));
    expect(result.current).toBe("wh-a");

    await act(async () => useAuthStore.getState().logout());
    expect(result.current).toBeNull();
  });
});
