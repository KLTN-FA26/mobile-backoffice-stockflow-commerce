import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ESLint } from "eslint";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { createConfig } = await import(
  pathToFileURL(path.join(REPO_ROOT, "eslint.config.mjs")).href
);

/**
 * The boundary rules (`import/no-restricted-paths`) only fire when the imported file exists,
 * so the tests lint inside a throw-away project that mirrors the real folder layout.
 */
const FIXTURE_FILES = {
  "package.json": "{}",
  "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
  "src/constants/index.ts": "export const UI_LABELS = {};\n",
  "src/features/order/index.ts": "export const x = 1;\n",
  "src/features/receipt/index.ts": "export const y = 1;\n",
  "src/lib/utils.ts": "export const cn = () => '';\n",
  "src/lib/api/client.ts": "export const api = {};\n",
  "src/lib/api/error.ts": "export class ApiError extends Error {}\n",
  "src/lib/api/load-error.ts": "export const classifyLoadError = () => 'server';\n",
  "src/lib/platform/storage.ts": "export const kv = {};\n",
  "src/lib/references/warehouse-options.ts": "export const warehouseOptions = [];\n",
  "src/lib/auth/auth-store.ts": "export const useAuthStore = () => null;\n",
  "src/lib/auth/me-permissions.ts": "export type PermissionCode = string;\n",
  "src/constants/mobile/index.ts": "export const MOBILE_LABELS = {};\n",
  "src/components/shared/.gitkeep": "",
  "src/components/mobile/.gitkeep": "",
  "src/components/ui/.gitkeep": "",
};

let fixtureRoot;
let eslint;

before(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stockflow-eslint-"));
  for (const [file, content] of Object.entries(FIXTURE_FILES)) {
    const target = path.join(fixtureRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  eslint = new ESLint({
    cwd: fixtureRoot,
    overrideConfigFile: true,
    overrideConfig: createConfig(fixtureRoot),
  });
});

after(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

/** A module of exactly `count` lines (what `wc -l` says). */
function linesOf(count) {
  return `export const a = 1;\n${"// filler\n".repeat(count - 1)}`;
}

async function ruleIdsFor(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath: path.join(fixtureRoot, filePath) });
  return result.messages.map((message) => message.ruleId);
}

describe("architecture boundaries", () => {
  it("feature importing another feature is an error", async () => {
    const ids = await ruleIdsFor(
      'import { x } from "@/features/order";\nexport const a = x;\n',
      "src/features/receipt/a.ts",
    );
    assert.ok(ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("feature importing itself is allowed", async () => {
    const ids = await ruleIdsFor(
      'import { y } from "@/features/receipt";\nexport const a = y;\n',
      "src/features/receipt/a.ts",
    );
    assert.ok(!ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("shared component importing lib/api is an error", async () => {
    const ids = await ruleIdsFor(
      'import { api } from "@/lib/api/client";\nexport const X = api;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("shared component importing the pure load-error helper is allowed", async () => {
    const load = await ruleIdsFor(
      'import { classifyLoadError } from "@/lib/api/load-error";\nexport const X = classifyLoadError;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(!load.includes("import/no-restricted-paths"), load.join(", "));

    const error = await ruleIdsFor(
      'import { ApiError } from "@/lib/api/error";\nexport const X = ApiError;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(!error.includes("import/no-restricted-paths"), error.join(", "));
  });

  it("shared component importing the api client is still an error next to the exception", async () => {
    const ids = await ruleIdsFor(
      'import { classifyLoadError } from "@/lib/api/load-error";\nimport { api } from "@/lib/api/client";\nexport const X = [classifyLoadError, api];\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("route file importing lib is an error (except the root layout)", async () => {
    const code = 'import { kv } from "@/lib/platform/storage";\nexport default kv;\n';
    const inRoute = await ruleIdsFor(code, "app/(app)/(tabs)/inbound/index.tsx");
    assert.ok(inRoute.includes("import/no-restricted-paths"), inRoute.join(", "));

    const inRootLayout = await ruleIdsFor(code, "app/_layout.tsx");
    assert.ok(!inRootLayout.includes("import/no-restricted-paths"), inRootLayout.join(", "));
  });

  it("a nested layout importing lib, hooks or providers is an error", async () => {
    // Only the root layout wires config, fonts and providers; a layout further down is a screen shell.
    const code = 'import { kv } from "@/lib/platform/storage";\nexport default kv;\n';
    for (const file of [
      "app/(app)/_layout.tsx",
      "app/(app)/(tabs)/_layout.tsx",
      "app/(app)/(tabs)/inbound/_layout.tsx",
    ]) {
      const ids = await ruleIdsFor(code, file);
      assert.ok(ids.includes("import/no-restricted-paths"), `${file}: ${ids.join(", ")}`);
    }
  });

  it("a nested layout importing constants is allowed", async () => {
    const code =
      'import { MOBILE_LABELS } from "@/constants/mobile";\nexport default MOBILE_LABELS;\n';
    const ids = await ruleIdsFor(code, "app/(app)/(tabs)/_layout.tsx");
    assert.ok(!ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("shared component importing a feature is an error", async () => {
    const ids = await ruleIdsFor(
      'import { x } from "@/features/order";\nexport const X = x;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("shared component importing the reference data is an error", async () => {
    const ids = await ruleIdsFor(
      'import { warehouseOptions } from "@/lib/references/warehouse-options";\nexport const X = warehouseOptions;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("shared component importing auth state is an error, auth types are allowed", async () => {
    const value = await ruleIdsFor(
      'import { useAuthStore } from "@/lib/auth/auth-store";\nexport const X = useAuthStore;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(value.includes("@typescript-eslint/no-restricted-imports"), value.join(", "));

    const inline = await ruleIdsFor(
      'import { type PermissionCode, useAuthStore } from "@/lib/auth/auth-store";\nexport const X: PermissionCode = useAuthStore;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(inline.includes("@typescript-eslint/no-restricted-imports"), inline.join(", "));

    const type = await ruleIdsFor(
      'import type { PermissionCode } from "@/lib/auth/me-permissions";\nexport type X = PermissionCode;\n',
      "src/components/shared/X.tsx",
    );
    assert.ok(!type.includes("@typescript-eslint/no-restricted-imports"), type.join(", "));
  });

  it("mobile components may use auth state, only shared ones may not", async () => {
    const ids = await ruleIdsFor(
      'import { useAuthStore } from "@/lib/auth/auth-store";\nexport const X = useAuthStore;\n',
      "src/components/mobile/X.tsx",
    );
    assert.ok(!ids.includes("@typescript-eslint/no-restricted-imports"), ids.join(", "));
  });
});

describe("the constants layer", () => {
  it("constants importing from lib or features is an error", async () => {
    for (const code of [
      'import { cn } from "@/lib/utils";\nexport const a = cn;\n',
      'import { x } from "@/features/order";\nexport const a = x;\n',
      'import { useAuthStore } from "@/lib/auth/auth-store";\nexport const a = useAuthStore;\n',
    ]) {
      for (const file of ["src/constants/labels.ts", "src/constants/mobile/labels.ts"]) {
        const ids = await ruleIdsFor(code, file);
        assert.ok(ids.includes("import/no-restricted-paths"), `${file}: ${ids.join(", ")}`);
      }
    }
  });

  it("constants importing other constants is allowed", async () => {
    const ids = await ruleIdsFor(
      'import { UI_LABELS } from "@/constants";\nimport { MOBILE_LABELS } from "@/constants/mobile";\nexport const a = [UI_LABELS, MOBILE_LABELS];\n',
      "src/constants/mobile/labels.ts",
    );
    assert.ok(!ids.includes("import/no-restricted-paths"), ids.join(", "));
  });

  it("everything else may import constants", async () => {
    const code = 'import { UI_LABELS } from "@/constants";\nexport const a = UI_LABELS;\n';
    for (const file of [
      "src/lib/a.ts",
      "src/components/shared/A.tsx",
      "src/features/receipt/a.ts",
    ]) {
      const ids = await ruleIdsFor(code, file);
      assert.ok(!ids.includes("import/no-restricted-paths"), `${file}: ${ids.join(", ")}`);
    }
  });
});

describe("ui primitives and banned imports", () => {
  const code = 'import { Text } from "react-native";\nexport const A = Text;\n';

  it("react-native Text in features is an error", async () => {
    const ids = await ruleIdsFor(code, "src/features/receipt/components/A.tsx");
    assert.ok(ids.includes("no-restricted-imports"), ids.join(", "));
  });

  it("react-native Text in routes is an error", async () => {
    const ids = await ruleIdsFor(code, "app/(app)/(tabs)/inbound/index.tsx");
    assert.ok(ids.includes("no-restricted-imports"), ids.join(", "));
  });

  it("react-native Text in components/ui is allowed", async () => {
    const ids = await ruleIdsFor(code, "src/components/ui/text.tsx");
    assert.ok(!ids.includes("no-restricted-imports"), ids.join(", "));
  });

  it("react-native touchables other than TouchableOpacity are errors too", async () => {
    for (const name of [
      "TouchableHighlight",
      "TouchableWithoutFeedback",
      "TouchableNativeFeedback",
    ]) {
      const source = `import { ${name} } from "react-native";\nexport const A = ${name};\n`;
      for (const file of [
        "src/features/receipt/components/A.tsx",
        "app/(app)/(tabs)/inbound/index.tsx",
      ]) {
        const ids = await ruleIdsFor(source, file);
        assert.ok(ids.includes("no-restricted-imports"), `${name} in ${file}: ${ids.join(", ")}`);
      }
    }
  });

  it("gesture-handler's Pressable, TouchableOpacity and TextInput are errors in features and routes", async () => {
    for (const name of ["Pressable", "TouchableOpacity", "TextInput"]) {
      const source = `import { ${name} } from "react-native-gesture-handler";\nexport const A = ${name};\n`;
      for (const file of [
        "src/features/receipt/components/A.tsx",
        "app/(app)/(tabs)/inbound/index.tsx",
      ]) {
        const ids = await ruleIdsFor(source, file);
        assert.ok(ids.includes("no-restricted-imports"), `${name} in ${file}: ${ids.join(", ")}`);
      }
    }
  });

  it("gesture-handler's gestures stay allowed, and so is its Pressable in components/ui", async () => {
    const gesture = await ruleIdsFor(
      'import { GestureDetector } from "react-native-gesture-handler";\nexport const A = GestureDetector;\n',
      "src/features/receipt/components/A.tsx",
    );
    assert.ok(!gesture.includes("no-restricted-imports"), gesture.join(", "));

    const ui = await ruleIdsFor(
      'import { Pressable } from "react-native-gesture-handler";\nexport const A = Pressable;\n',
      "src/components/ui/A.tsx",
    );
    assert.ok(!ui.includes("no-restricted-imports"), ui.join(", "));
  });

  it("routes and layouts may not import data libraries, features and libs may", async () => {
    for (const source of [
      "@tanstack/react-query",
      "axios",
      "expo-secure-store",
      "zustand",
      "zustand/middleware",
    ]) {
      const code = `import * as lib from "${source}";\nexport default lib;\n`;
      for (const file of ["app/(app)/(tabs)/inbound/index.tsx", "app/(app)/_layout.tsx"]) {
        const ids = await ruleIdsFor(code, file);
        assert.ok(
          ids.includes("@typescript-eslint/no-restricted-imports"),
          `${source} in ${file}: ${ids.join(", ")}`,
        );
      }
      for (const file of ["src/features/receipt/a.ts", "src/lib/a.ts"]) {
        const ids = await ruleIdsFor(code, file);
        assert.ok(
          !ids.includes("@typescript-eslint/no-restricted-imports"),
          `${source} in ${file}: ${ids.join(", ")}`,
        );
      }
    }
  });

  it("routes keep the mock-data ban next to the data libraries", async () => {
    const ids = await ruleIdsFor(
      'import { rows } from "@/lib/mock-data";\nexport default rows;\n',
      "app/(app)/(tabs)/inbound/index.tsx",
    );
    assert.ok(ids.includes("no-restricted-imports"), ids.join(", "));
  });

  it("lib/mock-data import is an error everywhere", async () => {
    const mock = 'import { rows } from "@/lib/mock-data";\nexport const a = rows;\n';
    const ids = await ruleIdsFor(mock, "src/components/ui/text.tsx");
    assert.ok(ids.includes("no-restricted-imports"), ids.join(", "));
  });
});

describe("import order and typescript strictness", () => {
  it("wrong import order is an error", async () => {
    const ids = await ruleIdsFor(
      'import { cn } from "@/lib/utils";\nimport { UI_LABELS } from "@/constants";\nexport const a = [cn, UI_LABELS];\n',
      "src/features/receipt/b.ts",
    );
    assert.ok(ids.includes("import/order"), ids.join(", "));
  });

  it("order external, constants, lib, features, components, relative, type passes", async () => {
    const code = [
      'import { View } from "react-native";',
      "",
      'import { UI_LABELS } from "@/constants";',
      "",
      'import { cn } from "@/lib/utils";',
      "",
      'import { y } from "@/features/receipt";',
      "",
      'import { Button } from "@/components/ui/button";',
      "",
      'import { helper } from "./helper";',
      "",
      'import type { Foo } from "@/lib/types";',
      "",
      "export const a: Foo = [View, UI_LABELS, cn, y, Button, helper];",
      "",
    ].join("\n");
    const ids = await ruleIdsFor(code, "src/features/receipt/c.tsx");
    assert.ok(!ids.includes("import/order"), ids.join(", "));
  });

  it("explicit any is an error", async () => {
    const ids = await ruleIdsFor("export const a: any = 1;\n", "src/lib/a.ts");
    assert.ok(ids.includes("@typescript-eslint/no-explicit-any"), ids.join(", "));
  });

  it("non-null assertion is an error", async () => {
    const ids = await ruleIdsFor(
      "const m = new Map<string, number>();\nexport const a = m.get('k')!;\n",
      "src/lib/a.ts",
    );
    assert.ok(ids.includes("@typescript-eslint/no-non-null-assertion"), ids.join(", "));
  });
});

describe("file length", () => {
  const limits = [
    { where: "a feature file", file: "src/features/receipt/long.ts", limit: 200 },
    { where: "a component", file: "src/components/shared/Long.tsx", limit: 150 },
    {
      where: "a feature's component",
      file: "src/features/receipt/components/Long.tsx",
      limit: 150,
    },
    { where: "a route file", file: "app/(app)/(tabs)/inbound/long.tsx", limit: 60 },
  ];

  for (const { where, file, limit } of limits) {
    it(`${where} may have ${limit} lines and not ${limit + 1}`, async () => {
      const ok = await ruleIdsFor(linesOf(limit), file);
      assert.ok(!ok.includes("max-lines"), ok.join(", "));
      const tooLong = await ruleIdsFor(linesOf(limit + 1), file);
      assert.ok(tooLong.includes("max-lines"), tooLong.join(", "));
    });
  }

  it("nav-config is the one named exception in components", async () => {
    const nav = await ruleIdsFor(linesOf(400), "src/components/mobile/nav-config.ts");
    assert.ok(!nav.includes("max-lines"), nav.join(", "));
    const other = await ruleIdsFor(linesOf(400), "src/components/mobile/other-config.ts");
    assert.ok(other.includes("max-lines"), other.join(", "));
  });

  it("tests and the rest of src are not limited", async () => {
    for (const file of [
      "src/components/shared/__tests__/Long.test.tsx",
      "src/features/receipt/long.test.ts",
      "src/lib/long.ts",
      "src/constants/long.ts",
    ]) {
      const ids = await ruleIdsFor(linesOf(400), file);
      assert.ok(!ids.includes("max-lines"), `${file}: ${ids.join(", ")}`);
    }
  });
});

describe("createConfig", () => {
  it("tolerates a project without src/features", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "stockflow-eslint-empty-"));
    try {
      assert.doesNotThrow(() => createConfig(empty));
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});
