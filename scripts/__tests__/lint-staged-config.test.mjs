import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { createConfig, withoutVerbatimTargets } from "../../lint-staged.config.mjs";

const VERBATIM = "src/constants/labels.ts";
const ADAPTED = "src/lib/status-map.ts";
const ORDINARY = "src/lib/utils.ts";
const TS_GLOB = "*.{ts,tsx}";
const OTHER_GLOB = "*.{json,md,css,mjs}";

let root;

function entry(target, mode) {
  return { source: target, target, mode, sourceBlob: "0".repeat(40) };
}

// lint-staged hands the tasks absolute paths.
function staged(...targets) {
  return targets.map((target) => path.join(root, ...target.split("/")));
}

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sf-lint-staged-"));
  const manifest = {
    webRepoEnv: "STOCKFLOW_WEB_REPO",
    webRepoDefault: "../stockflow-ui",
    webRef: "origin/develop",
    files: [entry(VERBATIM, "verbatim"), { ...entry(ADAPTED, "adapted"), note: "types" }],
  };
  fs.writeFileSync(path.join(root, "port-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
});

after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("withoutVerbatimTargets", () => {
  it("drops a verbatim target and keeps ordinary and adapted files", () => {
    const files = staged(VERBATIM, ORDINARY, ADAPTED);
    assert.deepEqual(withoutVerbatimTargets(files, root), staged(ORDINARY, ADAPTED));
  });

  it("drops a verbatim target given with backslashes", () => {
    const [file] = staged(VERBATIM);
    assert.deepEqual(withoutVerbatimTargets([file.replaceAll("/", path.sep)], root), []);
  });
});

describe("lint-staged config", () => {
  const config = createConfig(root);

  it("runs eslint and prettier on ordinary ts files only", () => {
    const commands = config[TS_GLOB](staged(VERBATIM, ORDINARY));
    assert.equal(commands.length, 2);
    assert.match(commands[0], /^eslint --fix --max-warnings 0 /);
    assert.match(commands[1], /^prettier --write /);
    for (const command of commands) {
      assert.ok(command.includes(ORDINARY.replace("src/lib/", "")));
      assert.ok(!command.includes("labels.ts"));
    }
  });

  it("runs nothing when every staged file is verbatim", () => {
    assert.deepEqual(config[TS_GLOB](staged(VERBATIM)), []);
    assert.deepEqual(config[OTHER_GLOB](staged(VERBATIM)), []);
  });

  it("runs prettier on ordinary non-ts files", () => {
    const [file] = staged("docs/readme.md");
    assert.deepEqual(config[OTHER_GLOB]([file]), [`prettier --write "${file}"`]);
  });
});
