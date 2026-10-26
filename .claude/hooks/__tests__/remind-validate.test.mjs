import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "remind-validate.mjs",
);

const GIT_FIXTURE_CONFIG = [
  "core.autocrlf=false",
  "commit.gpgsign=false",
  "user.name=Test",
  "user.email=test@example.com",
].flatMap((setting) => ["-c", setting]);

/** The environment without inherited GIT_* variables or the session's CLAUDE_PROJECT_DIR. */
function cleanEnv(extra = {}) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toUpperCase().startsWith("GIT_") && key !== "CLAUDE_PROJECT_DIR",
    ),
  );
  return { ...env, ...extra };
}

function git(cwd, ...args) {
  execFileSync("git", ["-C", cwd, ...GIT_FIXTURE_CONFIG, ...args], {
    env: cleanEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sf-remind-"));
  git(root, "init", "--quiet");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(root, "docs", "notes.md"), "notes\n");
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "--message", "init");
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function run(input, { cwd = root, env = cleanEnv() } = {}) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf8",
    cwd,
    env,
  });
}

describe("remind-validate CLI", () => {
  it("exits 0 when no code file changed", () => {
    assert.equal(run({ cwd: root }).status, 0);
  });

  it("exits 2 naming the changed code file", () => {
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    const result = run({ cwd: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /src\/a\.ts/);
  });

  it("finds the change when the session cwd is a subdirectory (CLAUDE_PROJECT_DIR)", () => {
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    const subdir = path.join(root, "docs");
    const result = run(
      { cwd: subdir },
      { cwd: subdir, env: cleanEnv({ CLAUDE_PROJECT_DIR: root }) },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /src\/a\.ts/);
  });

  it("does not block twice in a row", () => {
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    assert.equal(run({ cwd: root, stop_hook_active: true }).status, 0);
  });
});
