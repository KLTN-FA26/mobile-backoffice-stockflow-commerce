import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO, "node_modules", "@commitlint", "cli", "cli.js");

// The scopes CLAUDE.md allows.
const SCOPES = [
  "receipt",
  "inventory",
  "inventory-item",
  "transfer",
  "move",
  "order",
  "picking",
  "packing",
  "shipping",
  "auth",
  "shell",
  "shared",
  "ui",
  "scan",
  "sync",
  "config",
  "deps",
  "ci",
  "rules",
];

function lint(message) {
  return spawnSync(process.execPath, [CLI, "--config", path.join(REPO, "commitlint.config.mjs")], {
    cwd: REPO,
    input: message,
    encoding: "utf8",
  });
}

describe("commitlint config", () => {
  it("allows exactly the scopes CLAUDE.md lists, as an error (level 2)", async () => {
    const { default: config } = await import(
      pathToFileURL(path.join(REPO, "commitlint.config.mjs")).href
    );
    const [level, applicable, scopes] = config.rules["scope-enum"];
    assert.equal(level, 2);
    assert.equal(applicable, "always");
    assert.deepEqual([...scopes].sort(), [...SCOPES].sort());
  });

  it("accepts a commit with an allowed scope and one without a scope", () => {
    for (const subject of ["fix(shared): keep the subject lower case", "chore: keep it lower"]) {
      const result = lint(`${subject}\n`);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
  });

  it("rejects a scope outside the list instead of warning about it", () => {
    const result = lint("fix(billing): keep the subject lower case\n");
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /scope must be one of/);
  });
});
