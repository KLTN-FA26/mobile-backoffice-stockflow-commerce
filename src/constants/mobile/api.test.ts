import { AUTH_ENDPOINTS, USER_AGENT_PRODUCT } from "./api";

describe("mobile api constants", () => {
  it("keeps the identity endpoints from the spec", () => {
    expect(AUTH_ENDPOINTS).toEqual({
      login: "/identity/auth/login",
      me: "/identity/me",
      logout: "/identity/auth/logout",
    });
  });

  it("names the user-agent product", () => {
    expect(USER_AGENT_PRODUCT).toBe("StockFlowMobile");
  });
});
