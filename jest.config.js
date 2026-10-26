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
  // Route files in app/ stay thin (no tests there); route tests live in src/**/__tests__ and mount the
  // routes with renderRouter. "app/" is not a test root on purpose.
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  // Lets reanimated and worklets load their JS (non-native) implementations under Jest.
  resolver: require.resolve("react-native-reanimated/jest/resolver"),
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-sqlite/kv-store$": "<rootDir>/src/test/mocks/kv-store.ts",
    "\\.css$": "<rootDir>/src/test/mocks/style-sheet.ts",
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
  // Coverage is part of the merge gate (`pnpm test:coverage`, run by `pnpm run validate` and CI). Only the
  // sets with a spec target are measured, so a number here is never diluted by files nobody asked to cover:
  //   - src/lib/domain/**: >= 90% statements and branches PER FILE (the glob key applies to each file);
  //   - src/components/: >= 70% statements and branches over the whole DIRECTORY (a directory key is an
  //     aggregate).
  // The first feature PR adds ./src/features/*/{schemas,lifecycle,selectors}.ts at 90/90 here (and the
  // matching collectCoverageFrom entry): see .claude/rules/testing.md. Never lower a value to pass.
  collectCoverageFrom: [
    "src/lib/domain/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!**/*.test.{ts,tsx}",
    "!**/__tests__/**",
    "!**/*.d.ts",
  ],
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    "./src/lib/domain/**": { statements: 90, branches: 90 },
    "./src/components/": { statements: 70, branches: 70 },
  },
};
