import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SETTINGS = JSON.parse(fs.readFileSync(path.join(REPO, ".claude", "settings.json"), "utf8"));
const PLACEHOLDER = "${CLAUDE_PROJECT_DIR}";
const HOOK_PREFIX = `${PLACEHOLDER}/.claude/hooks/`;

/** Every command hook handler registered in .claude/settings.json, with its event name. */
function commandHooks() {
  return Object.entries(SETTINGS.hooks ?? {}).flatMap(([event, groups]) =>
    groups.flatMap((group) =>
      group.hooks
        .filter((hook) => hook.type === "command")
        .map((hook) => ({ event, matcher: group.matcher, hook })),
    ),
  );
}

/** What Claude Code's exec form runs: the placeholder substituted into each args element. */
function resolvedArgs(hook) {
  return hook.args.map((arg) => arg.replaceAll(PLACEHOLDER, REPO));
}

describe(".claude/settings.json hooks", () => {
  it("registers the four project hooks", () => {
    const scripts = commandHooks().map(({ hook }) => path.basename(hook.args?.[0] ?? ""));
    assert.deepEqual(scripts.sort(), [
      "format-changed-file.mjs",
      "guard-package-manager.mjs",
      "guard-protected-files.mjs",
      "remind-validate.mjs",
    ]);
  });

  it("runs every hook script through node in exec form from ${CLAUDE_PROJECT_DIR}", () => {
    // A cwd-relative path breaks after any `cd`: node exits 1 (non-blocking) and the guard lets the call through.
    for (const { event, hook } of commandHooks()) {
      assert.equal(hook.command, "node", event);
      assert.equal(hook.args.length, 1, event);
      assert.ok(hook.args[0].startsWith(HOOK_PREFIX), `${event}: ${hook.args[0]}`);
      assert.ok(fs.existsSync(resolvedArgs(hook)[0]), `${event}: ${resolvedArgs(hook)[0]} exists`);
    }
  });

  it("blocks an edit of a verbatim file when the session cwd is a subdirectory", () => {
    const guard = commandHooks().find(({ hook }) =>
      hook.args[0].endsWith("guard-protected-files.mjs"),
    );
    assert.ok(guard);
    const subdir = path.join(REPO, "src");
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
    );
    const result = spawnSync(guard.hook.command, resolvedArgs(guard.hook), {
      input: JSON.stringify({
        cwd: subdir,
        tool_name: "Edit",
        tool_input: { file_path: path.join(REPO, "src", "constants", "statuses.ts") },
      }),
      encoding: "utf8",
      cwd: subdir,
      env: { ...env, CLAUDE_PROJECT_DIR: REPO },
    });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /sync:pull/);
  });
});
