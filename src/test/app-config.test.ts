import { COLOR_TOKENS } from "@/lib/tokens";

import { createConfig } from "../../app.config";

import type * as AppConfigModule from "../../app.config";
import type { ExpoConfig } from "expo/config";

type PluginEntry = NonNullable<ExpoConfig["plugins"]>[number];

const DEVELOPMENT = { EAS_BUILD_PROFILE: "development" };
const CLEARTEXT_PLUGIN = "expo-build-properties";

/** `"name"` and `["name", options]` both as a list, so the name is always element 0. */
function parts(entry: PluginEntry): readonly unknown[] {
  return typeof entry === "string" ? [entry] : entry;
}

function findPlugin(config: ExpoConfig, name: string): readonly unknown[] | undefined {
  return (config.plugins ?? []).map(parts).find((entry) => entry[0] === name);
}

function pluginsWithout(config: ExpoConfig, name: string): readonly unknown[][] {
  return (config.plugins ?? []).map((entry) => [...parts(entry)]).filter((p) => p[0] !== name);
}

/** The config the way Expo loads it: the default export, evaluated against the real process.env. */
function loadDefaultConfig(profile: string | undefined): ExpoConfig {
  const previous = process.env.EAS_BUILD_PROFILE;
  if (profile === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = profile;
  try {
    let loaded: ExpoConfig | undefined;
    jest.isolateModules(() => {
      loaded = jest.requireActual<typeof AppConfigModule>("../../app.config").default;
    });
    if (loaded === undefined) throw new Error("app.config did not load");
    return loaded;
  } finally {
    if (previous === undefined) delete process.env.EAS_BUILD_PROFILE;
    else process.env.EAS_BUILD_PROFILE = previous;
  }
}

describe("app config: Android cleartext traffic (R7)", () => {
  it("allows cleartext traffic in the development build", () => {
    expect(findPlugin(createConfig(DEVELOPMENT), CLEARTEXT_PLUGIN)).toEqual([
      CLEARTEXT_PLUGIN,
      { android: { usesCleartextTraffic: true } },
    ]);
  });

  it.each([
    ["no EAS profile (local dev server, expo export)", {}],
    ["an empty profile", { EAS_BUILD_PROFILE: "" }],
    ["preview", { EAS_BUILD_PROFILE: "preview" }],
    ["production", { EAS_BUILD_PROFILE: "production" }],
    ["a profile that only starts with development", { EAS_BUILD_PROFILE: "development-2" }],
  ])("does not allow cleartext traffic for %s", (_label, env) => {
    expect(findPlugin(createConfig(env), CLEARTEXT_PLUGIN)).toBeUndefined();
  });

  it("differs from the other builds by that one plugin and nothing else", () => {
    const development = createConfig(DEVELOPMENT);
    const other = createConfig({ EAS_BUILD_PROFILE: "production" });

    expect(pluginsWithout(development, CLEARTEXT_PLUGIN)).toEqual(
      pluginsWithout(other, CLEARTEXT_PLUGIN),
    );
    expect({ ...development, plugins: [] }).toEqual({ ...other, plugins: [] });
    expect(development.plugins).toHaveLength((other.plugins ?? []).length + 1);
  });

  it("reads the profile from process.env when Expo loads the config", () => {
    expect(findPlugin(loadDefaultConfig("development"), CLEARTEXT_PLUGIN)).toBeDefined();
    expect(findPlugin(loadDefaultConfig("production"), CLEARTEXT_PLUGIN)).toBeUndefined();
    expect(findPlugin(loadDefaultConfig(undefined), CLEARTEXT_PLUGIN)).toBeUndefined();
  });
});

describe("app config: plugins (R14) and splash screen", () => {
  let config: ExpoConfig;

  beforeAll(() => {
    config = createConfig({});
  });

  it("lists the router, camera, secure-store, sqlite and splash-screen plugins", () => {
    const names = (config.plugins ?? []).map((entry) => parts(entry)[0]);
    expect(names).toEqual([
      "expo-router",
      "expo-camera",
      "expo-secure-store",
      "expo-sqlite",
      "expo-splash-screen",
    ]);
  });

  it("keeps the camera free of the microphone (iOS store note)", () => {
    expect(findPlugin(config, "expo-camera")?.[1]).toMatchObject({
      microphonePermission: false,
      recordAudioAndroid: false,
    });
  });

  it("takes the splash background from the design tokens, light and dark", () => {
    expect(findPlugin(config, "expo-splash-screen")).toEqual([
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: COLOR_TOKENS.light["bg-base"],
        dark: { backgroundColor: COLOR_TOKENS.dark["bg-base"] },
      },
    ]);
  });

  it("is a phone-first app (spec D1)", () => {
    expect(config.ios?.supportsTablet).toBe(false);
  });

  it("keeps the app identity", () => {
    expect(config.name).toBe("StockFlow Backoffice");
    expect(config.slug).toBe("stockflow-backoffice");
    expect(config.ios?.bundleIdentifier).toBe("vn.stockflow.backoffice");
    expect(config.android?.package).toBe("vn.stockflow.backoffice");
  });
});
