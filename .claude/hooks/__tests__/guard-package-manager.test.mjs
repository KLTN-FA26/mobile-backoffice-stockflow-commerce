import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { blockedSuggestion } from "../guard-package-manager.mjs";

const HOOK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "guard-package-manager.mjs",
);

const blocked = (command) => assert.notEqual(blockedSuggestion(command), null, command);
const allowed = (command) => assert.equal(blockedSuggestion(command), null, command);

describe("blockedSuggestion", () => {
  it("blocks package-manager invocations at a command position", () => {
    for (const command of [
      "npm install x",
      "npm i",
      "npm ci",
      "npm run lint",
      "npm test",
      "yarn add b",
      "yarn",
      "bun install",
      "cd a && yarn add b",
      "cd a; npm install",
      "pnpm run lint | npm install",
      "(npm install)",
      "echo hi\nnpm install x",
      "FOO=1 && npm install",
      "echo $(npm install x)",
      "echo `yarn add x`",
    ]) {
      blocked(command);
    }
  });

  it("allows pnpm and read-only mentions", () => {
    for (const command of [
      "pnpm install",
      "pnpm add zod",
      "pnpm run validate",
      "pnpm exec expo install expo-camera",
      "pnpm dlx create-expo-app",
      "npx expo --version",
      'grep "npm install" README.md',
      "grep -rn yarn docs",
      "echo npm install",
    ]) {
      allowed(command);
    }
  });

  it("ignores package-manager words inside quoted strings", () => {
    allowed('git commit -m "note; yarn add x"');
    allowed("git commit -m 'note; npm install'");
    allowed('echo "a && npm install b"');
    allowed("echo 'a | bun install'");
    allowed('git commit -m "it\\"s; yarn add x"');
    allowed("Write-Output 'done; npm install'");
  });

  it("ignores package-manager words inside heredoc bodies", () => {
    allowed("git commit -F - <<'EOF'\nfix the thing\n\nnote; npm install\nEOF");
    allowed("cat <<EOF\nfirst line; yarn add x\nEOF");
    allowed("cat <<-EOF\n\tbody; bun install\n\tEOF");
    allowed('cat <<"DOC"\n; npm install\nDOC');
    allowed("cat > f <<'EOF'\n; npm install\nEOF\nls");
  });

  it("ignores package-manager words inside PowerShell here-strings", () => {
    allowed("git commit -m @'\nfix; npm install\n'@");
    allowed('$m = @"\nnote; yarn add x\n"@\ngit commit -m $m');
  });

  it("still blocks a real command that follows a heredoc or a quoted string", () => {
    blocked("cat <<'EOF'\nbody\nEOF\nnpm install x");
    blocked('echo "ok"; npm install x');
    blocked("git commit -m 'msg' && yarn add x");
    blocked("cat <<EOF | npm install\nbody\nEOF");
  });

  it("still blocks a package manager passed to a shell as a quoted command", () => {
    blocked('bash -c "npm install x"');
    blocked("sh -c 'yarn add x'");
    blocked('powershell -Command "npm install x"');
    blocked('echo "$(npm install x)"');
  });

  it("does not hang or throw on unterminated quotes and heredocs", () => {
    allowed("echo 'unterminated; npm install");
    allowed('echo "unterminated; npm install');
    allowed("cat <<EOF\nnever closed; npm install");
    allowed("");
  });
});

describe("guard-package-manager CLI", () => {
  function run(command) {
    const input = JSON.stringify({ tool_name: "Bash", tool_input: { command } });
    return spawnSync(process.execPath, [HOOK], { input, encoding: "utf8" });
  }

  it("exits 2 with a suggestion for a blocked command", () => {
    const result = run("npm install x");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /BỊ CHẶN/);
    assert.match(result.stderr, /pnpm/);
  });

  it("exits 0 for an allowed command, bad stdin and a missing command", () => {
    assert.equal(run('git commit -m "note; yarn add x"').status, 0);
    assert.equal(
      spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" }).status,
      0,
    );
    assert.equal(spawnSync(process.execPath, [HOOK], { input: "{}", encoding: "utf8" }).status, 0);
  });

  it("still blocks when started through a symlink or junction", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-pm-link-"));
    try {
      const link = path.join(dir, "hooks-link");
      fs.symlinkSync(path.dirname(HOOK), link, "junction");
      const input = JSON.stringify({ tool_input: { command: "yarn add x" } });
      const result = spawnSync(process.execPath, [path.join(link, "guard-package-manager.mjs")], {
        input,
        encoding: "utf8",
      });
      assert.equal(result.status, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
