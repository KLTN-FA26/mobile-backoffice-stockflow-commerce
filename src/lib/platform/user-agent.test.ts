import { buildUserAgent, deviceUserAgent } from "./user-agent";

const mockDevice: { osName: string | null; osVersion: string | null; modelName: string | null } = {
  osName: "Android",
  osVersion: "14",
  modelName: "Pixel 7",
};
const mockConstants: { expoConfig: { version?: string } | null } = {
  expoConfig: { version: "0.1.0" },
};

jest.mock("expo-device", () => ({
  get osName() {
    return mockDevice.osName;
  },
  get osVersion() {
    return mockDevice.osVersion;
  },
  get modelName() {
    return mockDevice.modelName;
  },
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants.expoConfig;
    },
  },
}));

describe("buildUserAgent", () => {
  it("formats product, version, os and model", () => {
    expect(
      buildUserAgent({
        appVersion: "0.1.0",
        osName: "Android",
        osVersion: "14",
        modelName: "Pixel 7",
      }),
    ).toBe("StockFlowMobile/0.1.0 (Android 14; Pixel 7)");
  });
});

describe("deviceUserAgent", () => {
  beforeEach(() => {
    mockDevice.osName = "Android";
    mockDevice.osVersion = "14";
    mockDevice.modelName = "Pixel 7";
    mockConstants.expoConfig = { version: "0.1.0" };
  });

  it("reads the app version and the device", () => {
    expect(deviceUserAgent()).toBe("StockFlowMobile/0.1.0 (Android 14; Pixel 7)");
  });

  it("falls back when the device or config reports nothing", () => {
    mockDevice.osName = null;
    mockDevice.osVersion = null;
    mockDevice.modelName = null;
    mockConstants.expoConfig = null;
    expect(deviceUserAgent()).toBe("StockFlowMobile/0.0.0 (unknown unknown; unknown)");
  });

  it("keeps characters a header cannot carry out of the value", () => {
    mockDevice.modelName = "Điện thoại\r\nX-Evil: 1";
    const userAgent = deviceUserAgent();
    expect(userAgent).toMatch(/^[\x20-\x7e]+$/);
    expect(userAgent).not.toContain("\n");
  });

  it("falls back for a value that is empty once cleaned", () => {
    mockDevice.modelName = "電話";
    expect(deviceUserAgent()).toBe("StockFlowMobile/0.1.0 (Android 14; unknown)");
  });
});
