import fs from "node:fs";
import path from "node:path";

import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import { configs as tseslintConfigs } from "typescript-eslint";

/**
 * Files copied verbatim from the web app cannot be edited, so a rule they trip is relaxed here
 * with a file-scoped flat-config block. Adding one is a single entry, e.g.
 *
 *   { files: ["src/lib/api/error.ts"], rules: { "import/order": "off" } },
 *
 * Every entry needs a one-line reason (which file, which rule, why the web code is exempt).
 */
const VERBATIM_OVERRIDES = [
  // verbatim từ web — sửa ở web rồi sync:pull
  // idempotency.ts: import/order — web để dòng trống giữa hai `import type`, mobile gom mọi type import vào một nhóm.
  { files: ["src/lib/api/idempotency.ts"], rules: { "import/order": "off" } },
  // query-factory.ts: import/order — web viết hai khối import không cách dòng trống; no-non-null-assertion — `fetcher(id!, signal)` đã được chặn bởi `enabled: !!id`.
  {
    files: ["src/lib/api/query-factory.ts"],
    rules: { "import/order": "off", "@typescript-eslint/no-non-null-assertion": "off" },
  },
  // stale-refetch.ts: import/order — web đặt `import type` của react-query trước `./query-factory`, mobile sort type import theo alphabet.
  { files: ["src/lib/api/stale-refetch.ts"], rules: { "import/order": "off" } },
  // Can.tsx: import/order — web đặt `import type` của react trước `../me-permissions`, mobile sort type import theo alphabet.
  { files: ["src/lib/auth/components/Can.tsx"], rules: { "import/order": "off" } },
];

const IGNORES = ["dist/", ".expo/", "node_modules/", "android/", "ios/", "coverage/"];

const TS_FILES = ["**/*.{ts,tsx}"];
const FEATURE_AND_ROUTE_FILES = ["src/features/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"];

const IMPORT_GROUPS = ["builtin", "external", "internal", "parent", "sibling", "index", "type"];

// Sit between `external` and the remaining `internal` imports, in this order.
const IMPORT_PATH_GROUPS = [
  { pattern: "@/constants{,/**}", group: "internal", position: "before" },
  { pattern: "@/{lib,hooks}/**", group: "internal", position: "before" },
  { pattern: "@/features/**", group: "internal", position: "before" },
  { pattern: "@/components/**", group: "internal", position: "before" },
];

const NO_MOCK_DATA_PATTERN = {
  group: ["@/lib/mock-data", "@/lib/mock-data/**"],
  message: "Không import dữ liệu mock vào app; lấy dữ liệu qua API client hoặc fixture của test.",
};

const NO_RN_PRIMITIVES = {
  name: "react-native",
  importNames: [
    "Text",
    "Pressable",
    "TouchableOpacity",
    "TouchableHighlight",
    "TouchableWithoutFeedback",
    "TouchableNativeFeedback",
    "Button",
    "TextInput",
  ],
  message: "Dùng thành phần tương ứng trong @/components/ui thay vì primitive của react-native.",
};

// gesture-handler re-exports the same primitives; importing them from there would dodge the rule above.
const NO_GESTURE_HANDLER_PRIMITIVES = {
  name: "react-native-gesture-handler",
  importNames: [
    "Pressable",
    "TouchableOpacity",
    "TouchableHighlight",
    "TouchableWithoutFeedback",
    "TextInput",
  ],
  message: "Dùng thành phần tương ứng trong @/components/ui thay vì primitive của gesture-handler.",
};

// Route files only compose screens; fetching, caching and persisted state live in lib/ and features/.
// A layout that genuinely needs one of these goes in ROUTE_LAYOUTS_WITH_DATA_LIBS below, with the reason.
const DATA_LIBS = ["@tanstack/react-query", "axios", "expo-secure-store", "zustand"];
const NO_DATA_LIBS_IN_ROUTES_MESSAGE =
  "File route không tự lấy dữ liệu hay giữ state; đưa vào @/features, @/components hoặc @/lib.";
const NO_DATA_LIBS_IN_ROUTES = {
  paths: DATA_LIBS.map((name) => ({ name, message: NO_DATA_LIBS_IN_ROUTES_MESSAGE })),
  patterns: [
    { group: DATA_LIBS.map((name) => `${name}/**`), message: NO_DATA_LIBS_IN_ROUTES_MESSAGE },
  ],
};

// Named exemptions. Each entry is a deliberate decision: add one only with a reason on its line.
// app/_layout.tsx: the root layout wires the config, fonts, crypto polyfill and AppProviders at startup.
const ROUTE_LAYOUTS_WITH_LIB_IMPORTS = ["app/_layout.tsx"];
// Layouts that may import a data library. None today.
const ROUTE_LAYOUTS_WITH_DATA_LIBS = [];
// src/components/mobile/nav-config.ts: the navigation table, one entry per hub item (same list as the web sidebar).
const COMPONENT_FILES_OVER_150_LINES = ["src/components/mobile/nav-config.ts"];

// File length (CLAUDE.md): features 200, components 150, route files 60 — counted like `wc -l`.
const MAX_LINES = { features: 200, components: 150, routes: 60 };
const TEST_FILES = ["**/*.test.{ts,tsx}", "**/__tests__/**"];

function listFeatureNames(rootDir) {
  const featuresDir = path.join(rootDir, "src", "features");
  if (!fs.existsSync(featuresDir)) return [];
  return fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function featureZones(rootDir) {
  return listFeatureNames(rootDir).map((name) => ({
    target: `./src/features/${name}`,
    from: "./src/features",
    except: [`./${name}`],
    message:
      "Feature không được import feature khác; đưa phần dùng chung lên @/lib hoặc @/components.",
  }));
}

export function createConfig(rootDir) {
  return defineConfig([
    globalIgnores(IGNORES),
    { files: TS_FILES, extends: [tseslintConfigs.strict] },
    ...expoConfig,
    {
      settings: {
        "import/resolver": {
          typescript: { project: path.join(rootDir, "tsconfig.json") },
        },
      },
      rules: {
        "import/order": [
          "error",
          {
            groups: IMPORT_GROUPS,
            pathGroups: IMPORT_PATH_GROUPS,
            pathGroupsExcludedImportTypes: ["builtin", "external", "object", "type"],
            "newlines-between": "always",
            alphabetize: { order: "asc" },
          },
        ],
        "no-restricted-imports": ["error", { patterns: [NO_MOCK_DATA_PATTERN] }],
      },
    },
    {
      files: TS_FILES,
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            ignoreRestSiblings: true,
          },
        ],
      },
    },
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        "import/no-restricted-paths": [
          "error",
          {
            basePath: rootDir,
            zones: [
              ...featureZones(rootDir),
              {
                target: "./src/components/shared",
                from: "./src/features",
                message: "Component dùng chung không được biết về feature hay API client.",
              },
              {
                // The constants layer is the lowest: it holds data and may only see itself.
                target: "./src/constants",
                from: "./src",
                except: ["./constants"],
                message:
                  "src/constants là tầng thấp nhất; không import từ @/lib, @/components, @/features hay @/hooks.",
              },
              {
                target: "./src/components/shared",
                from: "./src/lib/references",
                message: "Component dùng chung không được biết về dữ liệu tham chiếu của feature.",
              },
              {
                // The pure error helpers are the one exception (R26): display needs
                // `classifyLoadError`, `LoadErrorKind` and `ApiError.traceId`. Every other api module stays out.
                target: "./src/components/shared",
                from: "./src/lib/api",
                except: ["./error.ts", "./load-error.ts"],
                message: "Component dùng chung không được biết về feature hay API client.",
              },
            ],
          },
        ],
      },
    },
    {
      // Auth state, session actions and permission hooks belong to screens; a shared component takes what
      // it needs as props. Types are allowed (they cost nothing at runtime and keep props honest).
      files: ["src/components/shared/**/*.{ts,tsx}"],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/lib/auth", "@/lib/auth/**"],
                allowTypeImports: true,
                message:
                  "Component dùng chung không đọc trạng thái hay hook auth; nhận qua props (import type thì được).",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["app/**/*.{ts,tsx}"],
      ignores: ROUTE_LAYOUTS_WITH_LIB_IMPORTS,
      rules: {
        "import/no-restricted-paths": [
          "error",
          {
            basePath: rootDir,
            zones: [
              {
                target: "./app",
                from: ["./src/lib", "./src/hooks", "./src/providers"],
                message: "File route chỉ ghép màn hình từ @/features; logic nằm ngoài app/.",
              },
            ],
          },
        ],
      },
    },
    {
      files: FEATURE_AND_ROUTE_FILES,
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [NO_RN_PRIMITIVES, NO_GESTURE_HANDLER_PRIMITIVES],
            patterns: [NO_MOCK_DATA_PATTERN],
          },
        ],
      },
    },
    {
      files: ["app/**/*.{ts,tsx}"],
      ignores: ROUTE_LAYOUTS_WITH_DATA_LIBS,
      rules: { "@typescript-eslint/no-restricted-imports": ["error", NO_DATA_LIBS_IN_ROUTES] },
    },
    {
      files: ["src/features/**/*.{ts,tsx}"],
      ignores: TEST_FILES,
      rules: { "max-lines": ["error", MAX_LINES.features] },
    },
    {
      // A feature's own components (screen-level pieces) are components: 150, not the feature file limit.
      files: ["src/features/**/components/**/*.{ts,tsx}"],
      ignores: TEST_FILES,
      rules: { "max-lines": ["error", MAX_LINES.components] },
    },
    {
      files: ["src/components/**/*.{ts,tsx}"],
      ignores: [...TEST_FILES, ...COMPONENT_FILES_OVER_150_LINES],
      rules: { "max-lines": ["error", MAX_LINES.components] },
    },
    { files: ["app/**/*.{ts,tsx}"], rules: { "max-lines": ["error", MAX_LINES.routes] } },
    ...VERBATIM_OVERRIDES,
  ]);
}

export default createConfig(import.meta.dirname);
