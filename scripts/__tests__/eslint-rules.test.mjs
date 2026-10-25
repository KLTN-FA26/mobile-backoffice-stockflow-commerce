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
  "src/components/shared/.gitkeep": "",
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

  it("route file importing lib is an error (except layouts)", async () => {
    const code = 'import { kv } from "@/lib/platform/storage";\nexport default kv;\n';
    const inRoute = await ruleIdsFor(code, "app/(app)/(tabs)/inbound/index.tsx");
    assert.ok(inRoute.includes("import/no-restricted-paths"), inRoute.join(", "));

    const inLayout = await ruleIdsFor(code, "app/_layout.tsx");
    assert.ok(!inLayout.includes("import/no-restricted-paths"), inLayout.join(", "));
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
