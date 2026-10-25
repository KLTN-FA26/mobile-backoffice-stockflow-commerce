import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { lintFeedback } from "../format-changed-file.mjs";

const HOOK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "format-changed-file.mjs",
);

const ESLINT_OUTPUT = [
  "D:\\proj\\src\\a.ts",
  "  1:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any",
  "",
  "✖ 1 problem (1 error, 0 warnings)",
].join("\n");

describe("lintFeedback", () => {
  it("returns a message naming the file and the eslint output when eslint reports errors", () => {
    const message = lintFeedback({ status: 1, output: ESLINT_OUTPUT }, "src/a.ts");
    assert.match(message ?? "", /src\/a\.ts/);
    assert.match(message ?? "", /no-explicit-any/);
    assert.match(message ?? "", /eslint-disable/);
  });

  it("returns null when eslint passes", () => {
    assert.equal(lintFeedback({ status: 0, output: "" }, "src/a.ts"), null);
  });

  it("returns null when eslint or pnpm cannot run", () => {
    for (const result of [
      { status: null, output: "" },
      { status: 2, output: "Oops! Something went wrong! :(\n\nESLint: 9.0.0" },
      { status: 1, output: "'pnpm' is not recognized as an internal or external command" },
      { status: 1, output: "pnpm: command not found" },
      { status: 1, output: " ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command was killed" },
      { status: 1, output: "" },
    ]) {
      assert.equal(lintFeedback(result, "src/a.ts"), null, JSON.stringify(result));
    }
  });
});

describe("format-changed-file CLI", () => {
  function run(input, cwd) {
    return spawnSync(process.execPath, [HOOK], {
      input: typeof input === "string" ? input : JSON.stringify(input),
      encoding: "utf8",
      cwd,
    });
  }

  it("exits 0 without output for bad stdin, a missing path and non-formattable files", () => {
    for (const input of ["not json", "{}", { tool_input: { file_path: "C:/x/archive.zip" } }]) {
      const result = run(input);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(result.stdout, "");
    }
  });

  it("exits 0 for a file outside the project", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "sf-fmt-project-"));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "sf-fmt-outside-"));
    try {
      const file = path.join(outside, "a.ts");
      fs.writeFileSync(file, "const a: any = 1;\n");
      const result = run({ cwd: project, tool_input: { file_path: file } }, project);
      assert.equal(result.status, 0);
      assert.equal(fs.readFileSync(file, "utf8"), "const a: any = 1;\n");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("never blocks when prettier and eslint cannot run in the project", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "sf-fmt-empty-"));
    try {
      const file = path.join(project, "a.ts");
      fs.writeFileSync(file, "export const a: any = 1;\n");
      const result = run({ cwd: project, tool_input: { file_path: file } }, project);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
