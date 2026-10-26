import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { isMainModule } from "../is-main-module.mjs";

const SCRIPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HELPER_URL = pathToFileURL(path.join(SCRIPTS_DIR, "is-main-module.mjs")).href;

let dir;

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "stockflow-main-module-"));
  fs.mkdirSync(path.join(dir, "real"));
  fs.writeFileSync(
    path.join(dir, "real", "probe.mjs"),
    `import { isMainModule } from ${JSON.stringify(HELPER_URL)};\nconsole.log(String(isMainModule(import.meta.url)));\n`,
  );
  fs.writeFileSync(
    path.join(dir, "importer.mjs"),
    `await import(${JSON.stringify(pathToFileURL(path.join(dir, "real", "probe.mjs")).href)});\n`,
  );
  // A junction works without admin rights on Windows; elsewhere the type is ignored (plain symlink).
  fs.symlinkSync(path.join(dir, "real"), path.join(dir, "link"), "junction");
});

after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function run(...args) {
  const result = spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

describe("isMainModule", () => {
  it("is true for the script node was started with", () => {
    assert.equal(run(path.join(dir, "real", "probe.mjs")), "true");
  });

  it("is true when node was started through a link to the script's folder", () => {
    // Node resolves the link for import.meta.url, so a plain path/URL comparison says "imported".
    assert.equal(run(path.join(dir, "link", "probe.mjs")), "true");
  });

  it("is false for a module that another script imports", () => {
    assert.equal(run(path.join(dir, "importer.mjs")), "false");
  });

  it("is false when there is no script (node -e)", () => {
    const code = `import { isMainModule } from ${JSON.stringify(HELPER_URL)}; console.log(String(isMainModule(${JSON.stringify(HELPER_URL)})));`;
    assert.equal(run("--input-type=module", "-e", code), "false");
  });

  it("is true when a path cannot be resolved, so a CLI still runs", () => {
    assert.equal(
      isMainModule(
        pathToFileURL(path.join(dir, "missing.mjs")).href,
        path.join(dir, "missing.mjs"),
      ),
      true,
    );
  });
});
