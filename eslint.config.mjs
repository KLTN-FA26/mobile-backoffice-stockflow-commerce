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
  importNames: ["Text", "Pressable", "TouchableOpacity", "Button", "TextInput"],
  message: "Dùng thành phần tương ứng trong @/components/ui thay vì primitive của react-native.",
};

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
      files: ["app/**/*.{ts,tsx}"],
      ignores: ["app/**/_layout.tsx"],
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
          { paths: [NO_RN_PRIMITIVES], patterns: [NO_MOCK_DATA_PATTERN] },
        ],
      },
    },
    ...VERBATIM_OVERRIDES,
  ]);
}

export default createConfig(import.meta.dirname);
