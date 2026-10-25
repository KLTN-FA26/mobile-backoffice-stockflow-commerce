import { MOBILE_STORAGE_KEYS } from "./storage-keys";

describe("MOBILE_STORAGE_KEYS", () => {
  it("keeps the fixed keys from the spec", () => {
    expect(MOBILE_STORAGE_KEYS.appStore).toBe("stockflow-app");
    expect(MOBILE_STORAGE_KEYS.secureSession).toBe("stockflow.session");
  });

  it("keeps the session-data owner outside the session: namespace", () => {
    expect(MOBILE_STORAGE_KEYS.sessionOwner).toBe("stockflow:session-owner");
    expect(MOBILE_STORAGE_KEYS.sessionOwner.startsWith("session:")).toBe(false);
  });

  it("builds one prefs key per screen", () => {
    expect(MOBILE_STORAGE_KEYS.prefs("products")).toBe("stockflow:products:config");
    expect(MOBILE_STORAGE_KEYS.prefs("products")).not.toBe(MOBILE_STORAGE_KEYS.prefs("orders"));
  });
});
