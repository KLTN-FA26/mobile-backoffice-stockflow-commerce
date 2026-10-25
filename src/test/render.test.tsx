import { useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Can } from "@/lib/auth/components/Can";
import { meKeys } from "@/lib/auth/me-permissions";

import { renderWithProviders } from "./render";

function Gate() {
  return (
    <Can permission="procurement-suppliers:READ" fallback={<Text>denied</Text>}>
      <Text>allowed</Text>
    </Can>
  );
}

function ClientProbe() {
  return <Text>{useQueryClient() ? "has-client" : "no-client"}</Text>;
}

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  jest.spyOn(api, "get").mockRejectedValue(new Error("unexpected network call"));
});

afterEach(() => jest.restoreAllMocks());

describe("renderWithProviders", () => {
  it("renders the permissions it was given, without calling the API", async () => {
    await renderWithProviders(<Gate />, { permissions: ["procurement-suppliers:READ"] });

    expect(await screen.findByText("allowed")).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("hides what the permission set does not include", async () => {
    await renderWithProviders(<Gate />, { permissions: ["procurement-suppliers:CREATE"] });

    expect(await screen.findByText("denied")).toBeTruthy();
  });

  it("logs the given user in and seeds the permission query under the new version", async () => {
    const { queryClient } = await renderWithProviders(<Gate />, {
      permissions: ["procurement-suppliers:READ"],
      user: { userId: "u-42", username: "picker" },
    });

    const { user, status, authorizationVersion, sessionExpiresAt } = useAuthStore.getState();
    expect(user).toMatchObject({ userId: "u-42", username: "picker" });
    expect(status).toBe("authenticated");
    expect(sessionExpiresAt).toBeGreaterThan(Date.now());
    expect(
      queryClient.getQueryData(meKeys.sessionPermissions("u-42", authorizationVersion)),
    ).toEqual({ roles: [], permissions: ["procurement-suppliers:READ"], dataScope: "WAREHOUSE" });
  });

  it("signs in a default user when only permissions are given", async () => {
    await renderWithProviders(<Gate />, { permissions: [] });

    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("leaves the store signed out when user is null", async () => {
    await renderWithProviders(<Gate />, {
      user: null,
      permissions: ["procurement-suppliers:READ"],
    });

    expect(useAuthStore.getState().status).toBe("unknown");
    expect(await screen.findByText("denied")).toBeTruthy();
  });

  it("does not touch the auth store when no options are given", async () => {
    await renderWithProviders(<ClientProbe />);

    expect(screen.getByText("has-client")).toBeTruthy();
    expect(useAuthStore.getState()).toMatchObject({ status: "unknown", authorizationVersion: 0 });
  });

  it("gives every render its own QueryClient that does not retry", async () => {
    const first = await renderWithProviders(<ClientProbe />);
    const second = await renderWithProviders(<ClientProbe />);

    expect(first.queryClient).not.toBe(second.queryClient);
    expect(first.queryClient.getDefaultOptions().queries?.retry).toBe(false);
    expect(first.queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
