import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { projectRoot } from "../project-root.mjs";

describe("projectRoot", () => {
  it("prefers CLAUDE_PROJECT_DIR over the session cwd from the hook input", () => {
    const root = projectRoot({ cwd: "D:/repo/src" }, { CLAUDE_PROJECT_DIR: "D:/repo" });
    assert.equal(root, "D:/repo");
  });

  it("falls back to the input cwd when CLAUDE_PROJECT_DIR is missing or empty", () => {
    assert.equal(projectRoot({ cwd: "D:/repo" }, {}), "D:/repo");
    assert.equal(projectRoot({ cwd: "D:/repo" }, { CLAUDE_PROJECT_DIR: "" }), "D:/repo");
  });

  it("falls back to the process cwd when neither is usable", () => {
    for (const input of [undefined, null, {}, { cwd: "" }, { cwd: 3 }]) {
      assert.equal(projectRoot(input, {}), process.cwd(), JSON.stringify(input));
    }
  });
});
