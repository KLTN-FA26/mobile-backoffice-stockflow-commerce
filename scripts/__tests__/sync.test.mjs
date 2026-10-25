import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkEntries, readManifest, resolveWebRepo, webBlob, webContent } from "../sync-lib.mjs";

const SCRIPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ENV = "STOCKFLOW_WEB_REPO";
const WEB_REF = "origin/develop";
const A_V1 = "export const A = 1;\n";
const A_V2 = "export const A = 2;\n";

// Per-command config (not `git config`) keeps fixtures independent of the machine's git settings:
// core.autocrlf=false stores CRLF fixtures byte for byte.
const GIT_FIXTURE_CONFIG = [
  "user.name=Test",
  "user.email=test@example.com",
  "commit.gpgsign=false",
  "core.autocrlf=false",
].flatMap((setting) => ["-c", setting]);

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...GIT_FIXTURE_CONFIG, ...args], {
    encoding: "utf8",
  }).trim();
}

/** Applies `changes` (path -> content, `null` deletes), commits, and moves origin/develop unless told not to. */
function webCommit(repo, changes, { moveRef = true } = {}) {
  for (const [file, content] of Object.entries(changes)) {
    const absolute = path.join(repo, file);
    if (content === null) {
      fs.rmSync(absolute);
    } else {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, content);
    }
  }
  git(repo, "add", "-A");
  git(repo, "commit", "--quiet", "--message", "change");
  if (moveRef) git(repo, "update-ref", `refs/remotes/${WEB_REF}`, "HEAD");
}

function makeWebRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "sf-sync-web-"));
  git(repo, "init", "--quiet");
  webCommit(repo, { "src/a.ts": A_V1 });
  return repo;
}

function makeMobileRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sf-sync-mobile-"));
  const manifest = {
    webRepoEnv: WEB_ENV,
    webRepoDefault: "../stockflow-ui",
    webRef: WEB_REF,
    files: [],
  };
  fs.writeFileSync(path.join(root, "port-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return root;
}

let web;
let mobile;

beforeEach(() => {
  web = makeWebRepo();
  mobile = makeMobileRepo();
});

afterEach(() => {
  for (const dir of [web, mobile]) fs.rmSync(dir, { recursive: true, force: true });
});

function run(script, args = [], webRepo = web) {
  return spawnSync(process.execPath, [path.join(SCRIPTS_DIR, `${script}.mjs`), ...args], {
    cwd: mobile,
    encoding: "utf8",
    env: { ...process.env, [WEB_ENV]: webRepo },
  });
}

function succeeds(script, args) {
  const result = run(script, args);
  assert.equal(result.status, 0, `${script} failed:\n${result.stderr}`);
  return result;
}

function fails(script, args, webRepo) {
  const result = run(script, args, webRepo);
  assert.notEqual(result.status, 0, `${script} should have failed:\n${result.stdout}`);
  return result;
}

const readMobile = (file) => fs.readFileSync(path.join(mobile, file), "utf8");
const writeMobile = (file, content) => fs.writeFileSync(path.join(mobile, file), content);
const problems = () => checkEntries(mobile, readManifest(mobile), web);
const webBlobOf = (file) => git(web, "rev-parse", `${WEB_REF}:${file}`);

describe("sync:add", () => {
  it("add copies verbatim file and records blob", () => {
    succeeds("sync-add", ["src/a.ts"]);

    assert.equal(readMobile("src/a.ts"), A_V1);
    assert.deepEqual(readManifest(mobile).files, [
      {
        source: "src/a.ts",
        target: "src/a.ts",
        mode: "verbatim",
        sourceBlob: webBlobOf("src/a.ts"),
      },
    ]);
  });

  it("add honours --target, --mode and --note and keeps the manifest sorted", () => {
    webCommit(web, { "src/b.ts": "export const B = 1;\n" });

    succeeds("sync-add", ["src/b.ts"]);
    succeeds("sync-add", ["src/a.ts", "--target", "src/mobile/a.ts", "--mode", "adapted"]);
    succeeds("sync-add", ["src/a.ts", "--target", "src/aa.ts", "--note", "hai từ"]);

    const files = readManifest(mobile).files;
    assert.deepEqual(
      files.map((entry) => entry.target),
      ["src/aa.ts", "src/b.ts", "src/mobile/a.ts"],
    );
    assert.deepEqual(files[0], {
      source: "src/a.ts",
      target: "src/aa.ts",
      mode: "verbatim",
      sourceBlob: webBlobOf("src/a.ts"),
      note: "hai từ",
    });
    assert.equal(files[2].mode, "adapted");
    assert.equal(readMobile("src/mobile/a.ts"), A_V1);
  });

  it("add writes the manifest with two-space indent, a trailing newline and LF endings", () => {
    succeeds("sync-add", ["src/a.ts"]);

    const raw = readMobile("port-manifest.json");
    assert.match(raw, /^ {2}"webRepoEnv": "STOCKFLOW_WEB_REPO",$/m);
    assert.match(raw, /^ {4}\{$/m);
    assert.ok(raw.endsWith("}\n"));
    assert.ok(!raw.includes("\r"));
  });

  it("add refuses a target that is already in the manifest and writes nothing", () => {
    succeeds("sync-add", ["src/a.ts"]);
    const before = readMobile("port-manifest.json");
    webCommit(web, { "src/b.ts": "export const B = 1;\n" });

    const result = fails("sync-add", ["src/b.ts", "src/a.ts"]);

    assert.match(result.stderr, /src\/a\.ts/);
    assert.equal(readMobile("port-manifest.json"), before);
    assert.equal(fs.existsSync(path.join(mobile, "src/b.ts")), false);
  });

  it("add refuses an existing local file that differs from web", () => {
    fs.mkdirSync(path.join(mobile, "src"));
    writeMobile("src/a.ts", "export const A = 'mine';\n");

    const result = fails("sync-add", ["src/a.ts"]);

    assert.match(result.stderr, /src\/a\.ts/);
    assert.equal(readMobile("src/a.ts"), "export const A = 'mine';\n");
    assert.deepEqual(readManifest(mobile).files, []);
  });

  it("add refuses a source that is missing or is a directory on web", () => {
    assert.match(fails("sync-add", ["src/missing.ts"]).stderr, /src\/missing\.ts/);
    assert.match(fails("sync-add", ["src"]).stderr, /src/);
    assert.deepEqual(readManifest(mobile).files, []);
  });

  it("add rejects bad arguments before touching anything", () => {
    fails("sync-add", []);
    fails("sync-add", ["src/a.ts", "--mode", "bogus"]);
    fails("sync-add", ["src/a.ts", "src/b.ts", "--target", "x.ts"]);
    fails("sync-add", ["../escape.ts"]);
    fails("sync-add", ["src/a.ts", "--target", "../escape.ts"]);
    assert.deepEqual(readManifest(mobile).files, []);
  });

  it("add writes LF even when the web blob has CRLF", () => {
    webCommit(web, { "src/crlf.ts": "export const C = 1;\r\nexport const D = 2;\r\n" });

    succeeds("sync-add", ["src/crlf.ts"]);

    assert.equal(readMobile("src/crlf.ts"), "export const C = 1;\nexport const D = 2;\n");
  });
});

describe("sync:check", () => {
  it("check passes when in sync", () => {
    succeeds("sync-add", ["src/a.ts"]);
    succeeds("sync-add", ["src/a.ts", "--target", "src/adapted.ts", "--mode", "adapted"]);

    assert.deepEqual(problems(), []);
    assert.match(succeeds("sync-check").stdout, /port-manifest: 2 file, không có lệch/);
  });

  it("check passes for an empty manifest", () => {
    assert.deepEqual(problems(), []);
    assert.match(succeeds("sync-check").stdout, /port-manifest: 0 file, không có lệch/);
  });

  it("check flags edited verbatim target", () => {
    succeeds("sync-add", ["src/a.ts"]);
    writeMobile("src/a.ts", "export const A = 99;\n");

    assert.deepEqual(problems(), [{ target: "src/a.ts", problem: "content-differs" }]);
    const result = fails("sync-check");
    assert.match(result.stderr, /src\/a\.ts\s+content-differs/);
    assert.match(result.stderr, /port-manifest: 1 file, 1 lệch/);
  });

  it("check flags changed source for adapted entry", () => {
    succeeds("sync-add", ["src/a.ts", "--mode", "adapted"]);
    webCommit(web, { "src/a.ts": A_V2 });

    assert.deepEqual(problems(), [{ target: "src/a.ts", problem: "source-changed" }]);
    assert.match(fails("sync-check").stderr, /src\/a\.ts\s+source-changed/);
  });

  it("check does not flag local edits of an adapted target", () => {
    succeeds("sync-add", ["src/a.ts", "--mode", "adapted"]);
    writeMobile("src/a.ts", "export const A = 'adapted for mobile';\n");

    assert.deepEqual(problems(), []);
  });

  it("check flags missing source", () => {
    succeeds("sync-add", ["src/a.ts"]);
    succeeds("sync-add", ["src/a.ts", "--target", "src/adapted.ts", "--mode", "adapted"]);
    webCommit(web, { "src/a.ts": null });

    assert.deepEqual(problems(), [
      { target: "src/a.ts", problem: "source-missing" },
      { target: "src/adapted.ts", problem: "source-missing" },
    ]);
    assert.match(fails("sync-check").stderr, /src\/a\.ts\s+source-missing/);
  });

  it("check flags missing target", () => {
    succeeds("sync-add", ["src/a.ts"]);
    fs.rmSync(path.join(mobile, "src/a.ts"));

    assert.deepEqual(problems(), [{ target: "src/a.ts", problem: "target-missing" }]);
  });

  it("check ignores line-ending differences on either side", () => {
    webCommit(web, { "src/crlf.ts": "export const C = 1;\r\nexport const D = 2;\r\n" });
    succeeds("sync-add", ["src/crlf.ts"]);

    writeMobile("src/crlf.ts", "export const C = 1;\r\nexport const D = 2;\r\n");
    assert.deepEqual(problems(), []);

    writeMobile("src/crlf.ts", "export const C = 1;\nexport const D = 2;\n");
    assert.deepEqual(problems(), []);
  });

  it("check reads the pinned ref, not the web checkout", () => {
    succeeds("sync-add", ["src/a.ts"]);
    succeeds("sync-add", ["src/a.ts", "--target", "src/adapted.ts", "--mode", "adapted"]);
    const refBefore = git(web, "rev-parse", WEB_REF);

    webCommit(web, { "src/a.ts": A_V2 }, { moveRef: false });

    assert.deepEqual(problems(), []);
    succeeds("sync-check");
    assert.equal(git(web, "rev-parse", WEB_REF), refBefore);
  });

  it("check explains a missing ref instead of reporting every file as missing", () => {
    succeeds("sync-add", ["src/a.ts"]);
    git(web, "update-ref", "-d", `refs/remotes/${WEB_REF}`);

    const result = fails("sync-check");

    assert.match(result.stderr, /origin\/develop/);
    assert.doesNotMatch(result.stderr, /source-missing/);
  });

  it("check explains a missing web repo", () => {
    const result = fails("sync-check", [], path.join(web, "does-not-exist"));

    assert.match(result.stderr, /STOCKFLOW_WEB_REPO/);
  });
});

describe("sync:pull and sync:ack", () => {
  it("pull refreshes verbatim target", () => {
    succeeds("sync-add", ["src/a.ts"]);
    webCommit(web, { "src/a.ts": A_V2 });
    assert.deepEqual(problems(), [{ target: "src/a.ts", problem: "content-differs" }]);

    succeeds("sync-pull", ["src/a.ts"]);

    assert.equal(readMobile("src/a.ts"), A_V2);
    assert.equal(readManifest(mobile).files[0].sourceBlob, webBlobOf("src/a.ts"));
    assert.deepEqual(problems(), []);
  });

  it("pull also restores a verbatim target that was edited or deleted", () => {
    succeeds("sync-add", ["src/a.ts"]);
    writeMobile("src/a.ts", "export const A = 99;\n");
    succeeds("sync-pull", ["src/a.ts"]);
    assert.equal(readMobile("src/a.ts"), A_V1);

    fs.rmSync(path.join(mobile, "src/a.ts"));
    succeeds("sync-pull", ["src/a.ts"]);
    assert.deepEqual(problems(), []);
  });

  it("ack records new blob for adapted", () => {
    succeeds("sync-add", ["src/a.ts", "--mode", "adapted", "--note", "bỏ phụ thuộc next"]);
    writeMobile("src/a.ts", "export const A = 'adapted';\n");
    webCommit(web, { "src/a.ts": A_V2 });
    assert.deepEqual(problems(), [{ target: "src/a.ts", problem: "source-changed" }]);

    succeeds("sync-ack", ["src/a.ts"]);

    assert.deepEqual(readManifest(mobile).files, [
      {
        source: "src/a.ts",
        target: "src/a.ts",
        mode: "adapted",
        sourceBlob: webBlobOf("src/a.ts"),
        note: "bỏ phụ thuộc next",
      },
    ]);
    assert.equal(readMobile("src/a.ts"), "export const A = 'adapted';\n");
    assert.deepEqual(problems(), []);
  });

  it("pull refuses adapted entry", () => {
    succeeds("sync-add", ["src/a.ts", "--mode", "adapted"]);
    writeMobile("src/a.ts", "export const A = 'adapted';\n");
    webCommit(web, { "src/a.ts": A_V2 });
    const manifestBefore = readMobile("port-manifest.json");

    const result = fails("sync-pull", ["src/a.ts"]);

    assert.match(result.stderr, /sync:ack/);
    assert.equal(readMobile("src/a.ts"), "export const A = 'adapted';\n");
    assert.equal(readMobile("port-manifest.json"), manifestBefore);
  });

  it("ack refuses verbatim entry", () => {
    succeeds("sync-add", ["src/a.ts"]);
    webCommit(web, { "src/a.ts": A_V2 });
    const manifestBefore = readMobile("port-manifest.json");

    const result = fails("sync-ack", ["src/a.ts"]);

    assert.match(result.stderr, /sync:pull/);
    assert.equal(readMobile("port-manifest.json"), manifestBefore);
  });

  it("pull and ack reject unknown targets and change nothing when one target is bad", () => {
    succeeds("sync-add", ["src/a.ts"]);
    webCommit(web, { "src/a.ts": A_V2 });

    assert.match(fails("sync-pull", ["src/a.ts", "src/unknown.ts"]).stderr, /src\/unknown\.ts/);
    assert.equal(readMobile("src/a.ts"), A_V1);
    fails("sync-pull", []);
    fails("sync-ack", ["src/unknown.ts"]);
    fails("sync-ack", []);
  });
});

describe("sync-lib", () => {
  it("webBlob and webContent read the ref, byte for byte", () => {
    assert.equal(webBlob(web, WEB_REF, "src/a.ts"), webBlobOf("src/a.ts"));
    assert.deepEqual(webContent(web, WEB_REF, "src/a.ts"), Buffer.from(A_V1));
    assert.throws(() => webBlob(web, WEB_REF, "src/missing.ts"), /src\/missing\.ts/);
  });

  it("resolveWebRepo prefers the env var and falls back to the manifest default", () => {
    assert.equal(resolveWebRepo(mobile, { [WEB_ENV]: web }), web);
    assert.equal(resolveWebRepo(mobile, {}), path.resolve(mobile, "../stockflow-ui"));
    assert.equal(
      resolveWebRepo(mobile, { [WEB_ENV]: "" }),
      path.resolve(mobile, "../stockflow-ui"),
    );
  });

  it("readManifest rejects malformed manifests with a pointer to the problem", () => {
    const write = (files) =>
      writeMobile(
        "port-manifest.json",
        JSON.stringify({
          webRepoEnv: WEB_ENV,
          webRepoDefault: "../stockflow-ui",
          webRef: WEB_REF,
          files,
        }),
      );
    const entry = { source: "src/a.ts", target: "src/a.ts", mode: "verbatim", sourceBlob: "abc" };

    write([{ ...entry, mode: "copy" }]);
    assert.throws(() => readManifest(mobile), /mode/);
    write([entry, entry]);
    assert.throws(() => readManifest(mobile), /src\/a\.ts/);
    write([{ ...entry, target: "../outside.ts" }]);
    assert.throws(() => readManifest(mobile), /outside\.ts/);
    writeMobile("port-manifest.json", "{ not json");
    assert.throws(() => readManifest(mobile), /port-manifest\.json/);
  });
});
