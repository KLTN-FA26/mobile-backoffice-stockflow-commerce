import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { protectedReason } from "../guard-protected-files.mjs";

const HOOK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "guard-protected-files.mjs",
);

const VERBATIM_TARGET = "src/constants/statuses.ts";
const ADAPTED_TARGET = "src/lib/status-map.ts";
const LOCKED_UI_FILE = "src/components/ui/Button.tsx";
const NEW_UI_FILE = "src/components/ui/Text.tsx";

// Per-command config keeps the fixture independent of the machine's git settings.
const GIT_FIXTURE_CONFIG = [
  "core.autocrlf=false",
  "commit.gpgsign=false",
  "user.name=Test",
  "user.email=test@example.com",
].flatMap((setting) => ["-c", setting]);

/**
 * The environment without inherited GIT_* variables (GIT_DIR, GIT_INDEX_FILE…) or the session's
 * CLAUDE_PROJECT_DIR (it would point the hook at the real repo instead of the fixture).
 */
function cleanEnv(extra = {}) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith("GIT_") && key !== "CLAUDE_PROJECT_DIR",
    ),
  );
  return { ...env, ...extra };
}

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...GIT_FIXTURE_CONFIG, ...args], {
    encoding: "utf8",
    env: cleanEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function writeFile(root, relative, content = "export {};\n") {
  const file = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function commitAll(root, message) {
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "--message", message);
}

function writeManifest(root, files) {
  const manifest = {
    webRepoEnv: "STOCKFLOW_WEB_REPO",
    webRepoDefault: "../stockflow-ui",
    webRef: "origin/develop",
    files,
  };
  fs.writeFileSync(path.join(root, "port-manifest.json"), JSON.stringify(manifest, null, 2));
}

function entry(target, mode) {
  return { source: target, target, mode, sourceBlob: "0".repeat(40) };
}

let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sf-guard-"));
  git(root, "init", "--quiet");
  git(root, "symbolic-ref", "HEAD", "refs/heads/main");
  writeManifest(root, [entry(VERBATIM_TARGET, "verbatim"), entry(ADAPTED_TARGET, "adapted")]);
  writeFile(root, LOCKED_UI_FILE);
  commitAll(root, "main with a ui primitive");
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("protectedReason", () => {
  it("blocks components/ui once the file is on main", () => {
    const reason = protectedReason(path.join(root, ...LOCKED_UI_FILE.split("/")), root);
    assert.match(reason ?? "", /components\/ui/);
    assert.match(reason ?? "", /main/);
  });

  it("allows a components/ui path that is absent from main", () => {
    assert.equal(protectedReason(path.join(root, ...NEW_UI_FILE.split("/")), root), null);
  });

  it("allows a components/ui file that only exists on a feature branch", () => {
    git(root, "checkout", "--quiet", "-b", "feature/ui");
    writeFile(root, NEW_UI_FILE);
    commitAll(root, "add primitive on the feature branch");
    assert.equal(protectedReason(path.join(root, ...NEW_UI_FILE.split("/")), root), null);
    assert.notEqual(protectedReason(path.join(root, ...LOCKED_UI_FILE.split("/")), root), null);
  });

  it("blocks once that file is merged into main", () => {
    git(root, "checkout", "--quiet", "-b", "feature/ui");
    writeFile(root, NEW_UI_FILE);
    commitAll(root, "add primitive");
    git(root, "checkout", "--quiet", "main");
    git(root, "merge", "--quiet", "--ff-only", "feature/ui");
    assert.notEqual(protectedReason(path.join(root, ...NEW_UI_FILE.split("/")), root), null);
  });

  it("allows components/ui when git cannot answer (not a repo, no main branch)", () => {
    const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), "sf-guard-norepo-"));
    try {
      assert.equal(
        protectedReason(path.join(notRepo, ...LOCKED_UI_FILE.split("/")), notRepo),
        null,
      );
    } finally {
      fs.rmSync(notRepo, { recursive: true, force: true });
    }

    git(root, "branch", "--move", "trunk");
    assert.equal(protectedReason(path.join(root, ...LOCKED_UI_FILE.split("/")), root), null);
  });

  it("is not fooled by inherited GIT_* variables", () => {
    const saved = { GIT_DIR: process.env.GIT_DIR, GIT_WORK_TREE: process.env.GIT_WORK_TREE };
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "sf-guard-elsewhere-"));
    process.env.GIT_DIR = path.join(elsewhere, ".git");
    process.env.GIT_WORK_TREE = elsewhere;
    try {
      assert.notEqual(protectedReason(path.join(root, ...LOCKED_UI_FILE.split("/")), root), null);
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it("blocks .env.local", () => {
    assert.match(protectedReason(path.join(root, ".env.local"), root) ?? "", /\.env/);
  });

  it("blocks .env itself and a nested .env.production", () => {
    assert.notEqual(protectedReason(path.join(root, ".env"), root), null);
    assert.notEqual(protectedReason(path.join(root, "apps", ".env.production"), root), null);
  });

  it("allows .env.example", () => {
    assert.equal(protectedReason(path.join(root, ".env.example"), root), null);
  });

  it("blocks verbatim manifest target", () => {
    const reason = protectedReason(path.join(root, "src", "constants", "statuses.ts"), root);
    assert.match(reason ?? "", /sync:pull/);
    assert.match(reason ?? "", /statuses\.ts/);
  });

  it("allows adapted manifest target", () => {
    assert.equal(protectedReason(path.join(root, "src", "lib", "status-map.ts"), root), null);
  });

  it("allows ordinary source file", () => {
    for (const file of [
      "src/features/receipt/api.ts",
      "src/components/shared/StatusDot.tsx",
      "src/components/uikit/Box.tsx",
      "app/login.tsx",
      "port-manifest.json",
      "docs/.env.example",
    ]) {
      assert.equal(protectedReason(path.join(root, ...file.split("/")), root), null, file);
    }
  });

  it("normalises relative, backslash and forward-slash absolute paths", () => {
    const forwardRoot = root.replaceAll("\\", "/");
    for (const file of [
      "src/constants/statuses.ts",
      "src\\constants\\statuses.ts",
      "./src/constants/statuses.ts",
      "src/lib/../constants/statuses.ts",
      `${forwardRoot}/src/constants/statuses.ts`,
      path.join(root, "src", "constants", "statuses.ts"),
    ]) {
      assert.notEqual(protectedReason(file, root), null, file);
    }
    assert.notEqual(protectedReason("src\\components\\ui\\Button.tsx", root), null);
    assert.notEqual(protectedReason(`${forwardRoot}/${LOCKED_UI_FILE}`, root), null);
    assert.notEqual(protectedReason(".\\.env.local", root), null);
  });

  it("matches targets stored with backslashes in the manifest", () => {
    writeManifest(root, [entry("src\\constants\\numbers.ts", "verbatim")]);
    assert.notEqual(protectedReason(path.join(root, "src", "constants", "numbers.ts"), root), null);
  });

  it("does not guard project rules for a path outside the project root", () => {
    const outside = path.join(os.tmpdir(), "elsewhere", "src", "constants", "statuses.ts");
    assert.equal(protectedReason(outside, root), null);
  });

  it("never blocks on a missing manifest", () => {
    fs.rmSync(path.join(root, "port-manifest.json"));
    assert.equal(protectedReason(path.join(root, "src", "constants", "statuses.ts"), root), null);
  });

  it("never blocks on a malformed manifest", () => {
    for (const content of [
      "{ not json",
      "null",
      '{"files": 3}',
      '{"files": [null, 7, {"mode": "verbatim"}]}',
    ]) {
      fs.writeFileSync(path.join(root, "port-manifest.json"), content);
      assert.equal(
        protectedReason(path.join(root, "src", "constants", "statuses.ts"), root),
        null,
        content,
      );
    }
  });

  it("still blocks components/ui and .env when the manifest is malformed", () => {
    fs.writeFileSync(path.join(root, "port-manifest.json"), "{ not json");
    assert.notEqual(protectedReason(path.join(root, ...LOCKED_UI_FILE.split("/")), root), null);
    assert.notEqual(protectedReason(path.join(root, ".env"), root), null);
  });
});

describe("guard-protected-files CLI", () => {
  function run(stdin, { script = HOOK, env = cleanEnv() } = {}) {
    return spawnSync(process.execPath, [script], { input: stdin, encoding: "utf8", env });
  }

  function editInput(file) {
    return JSON.stringify({
      cwd: root,
      tool_name: "Edit",
      tool_input: { file_path: path.join(root, ...file.split("/")) },
    });
  }

  it("exits 2 with the reason on stderr for a protected file", () => {
    const result = run(editInput(VERBATIM_TARGET));
    assert.equal(result.status, 2);
    assert.match(result.stderr, /BỊ CHẶN/);
    assert.match(result.stderr, /sync:pull/);
  });

  it("exits 2 for a components/ui file that is on main, 0 for a new one", () => {
    assert.equal(run(editInput(LOCKED_UI_FILE)).status, 2);
    assert.equal(run(editInput(NEW_UI_FILE)).status, 0);
  });

  it("exits 0 for components/ui when git is not installed or not on PATH", () => {
    const noGit = fs.mkdtempSync(path.join(os.tmpdir(), "sf-guard-nogit-"));
    try {
      const env = cleanEnv({ PATH: noGit, Path: noGit });
      assert.equal(run(editInput(LOCKED_UI_FILE), { env }).status, 0);
    } finally {
      fs.rmSync(noGit, { recursive: true, force: true });
    }
  });

  it("still blocks when the session cwd is a subdirectory (root from CLAUDE_PROJECT_DIR)", () => {
    const subdir = path.join(root, "src");
    const input = JSON.stringify({
      cwd: subdir,
      tool_name: "Edit",
      tool_input: { file_path: path.join(root, ...VERBATIM_TARGET.split("/")) },
    });
    const result = spawnSync(process.execPath, [HOOK], {
      input,
      encoding: "utf8",
      cwd: subdir,
      env: cleanEnv({ CLAUDE_PROJECT_DIR: root }),
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /sync:pull/);
  });

  it("exits 0 for an ordinary file", () => {
    const result = run(editInput("src/features/receipt/api.ts"));
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
  });

  it("exits 0 on unparseable stdin or a missing file_path", () => {
    assert.equal(run("not json").status, 0);
    assert.equal(run("").status, 0);
    assert.equal(run(JSON.stringify({ cwd: root, tool_input: {} })).status, 0);
  });

  it("still blocks when started through a symlink or junction", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-guard-link-"));
    try {
      const link = path.join(dir, "hooks-link");
      fs.symlinkSync(path.dirname(HOOK), link, "junction");
      const result = run(editInput(VERBATIM_TARGET), {
        script: path.join(link, "guard-protected-files.mjs"),
      });
      assert.equal(result.status, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
