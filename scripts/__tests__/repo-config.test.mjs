import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (file) => fs.readFileSync(path.join(REPO, file), "utf8");

describe("CI workflow", () => {
  const workflow = read(".github/workflows/ci.yml");

  it("cancels a run that a newer push to the same branch or PR supersedes", () => {
    assert.match(workflow, /^concurrency:\s*$/m);
    assert.match(workflow, /^ {2}group: .*(pull_request\.number|github\.ref)/m);
    assert.match(workflow, /^ {2}cancel-in-progress: true$/m);
  });

  it("keys the group so a PR and a push to another ref never cancel each other", () => {
    const group = workflow.match(/^ {2}group: (.*)$/m)?.[1] ?? "";
    assert.ok(group.includes("github.workflow"), group);
    assert.ok(group.includes("github.event.pull_request.number"), group);
    assert.ok(group.includes("github.ref"), group);
  });

  it("checks out the web repo by its current name, not the old KLTN-FA26/UI redirect", () => {
    assert.match(workflow, /^ +repository: KLTN-FA26\/fe-backoffice-stockflow-commerce$/m);
    assert.doesNotMatch(workflow, /KLTN-FA26\/UI\b/);
  });

  it("reads the public web repo with the workflow token when WEB_REPO_TOKEN is not set", () => {
    // An empty `token` input fails actions/checkout instead of falling back to its default.
    assert.match(workflow, /^ +token: \$\{\{ secrets\.WEB_REPO_TOKEN \|\| github\.token \}\}$/m);
  });
});

describe("launcher", () => {
  it("starts Expo for Expo Go (--go), the default run target", () => {
    const { configurations } = JSON.parse(read(".claude/launch.json"));
    const expo = configurations.find((configuration) => configuration.name === "expo");
    assert.ok(expo, "no expo configuration");
    assert.deepEqual(expo.runtimeArgs.slice(0, 3), ["exec", "expo", "start"]);
    assert.ok(expo.runtimeArgs.includes("--go"), expo.runtimeArgs.join(" "));
  });
});

describe(".gitignore", () => {
  for (const lockfile of ["package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"]) {
    it(`ignores ${lockfile}: pnpm-lock.yaml is the only lockfile`, () => {
      const result = spawnSync("git", ["check-ignore", "--quiet", "--no-index", lockfile], {
        cwd: REPO,
      });
      assert.equal(result.status, 0, `${lockfile} is not ignored`);
    });
  }

  it("does not ignore pnpm-lock.yaml", () => {
    const result = spawnSync("git", ["check-ignore", "--quiet", "--no-index", "pnpm-lock.yaml"], {
      cwd: REPO,
    });
    assert.equal(result.status, 1);
  });
});
