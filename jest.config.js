// jest-expo's own pattern plus the ESM-only libraries this app adds. Keep the last two entries:
// the preset needs them so the reanimated plugin and the babel preset are never transformed.
const TRANSFORMED_PACKAGES = [
  ".pnpm",
  "react-native",
  "@react-native",
  "@react-native-community",
  "expo",
  "@expo",
  "@expo-google-fonts/.*",
  "react-navigation",
  "@react-navigation",
  "@sentry/react-native",
  "native-base",
  "standard-navigation",
  "nativewind",
  "react-native-css-interop",
  "@gorhom/.*",
  "sonner-native",
  "lucide-react-native",
  "@shopify/flash-list",
];

/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  // Two entries instead of "{app,src}": on Windows Jest escapes a brace right after <rootDir>.
  testMatch: ["<rootDir>/app/**/*.test.{ts,tsx}", "<rootDir>/src/**/*.test.{ts,tsx}"],
  // Lets reanimated and worklets load their JS (non-native) implementations under Jest.
  resolver: require.resolve("react-native-reanimated/jest/resolver"),
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-sqlite/kv-store$": "<rootDir>/src/test/mocks/kv-store.ts",
    // lucide-react-native's "react-native" export condition points at .mjs files, which Jest always
    // loads as native ESM (never through babel). Its CommonJS build works.
    "^lucide-react-native$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${TRANSFORMED_PACKAGES.join("|")}))`,
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  coverageThreshold: {
    "./src/lib/domain/**": { statements: 90, branches: 90 },
  },
};
