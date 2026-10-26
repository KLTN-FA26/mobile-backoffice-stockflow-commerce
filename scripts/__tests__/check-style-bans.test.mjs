import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { findStyleBans, scanProject } from "../check-style-bans.mjs";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "check-style-bans.mjs",
);

function scan(content, filePath = "src/features/receipt/a.tsx") {
  return findStyleBans([{ path: filePath, content }]);
}

describe("findStyleBans", () => {
  it("flags bare hex", () => {
    assert.deepEqual(scan('const s = { color: "#FF0000" };\n'), [
      { path: "src/features/receipt/a.tsx", line: 1, rule: "hex" },
    ]);
    const short = scan('<View style={{color:"#fff"}} />');
    assert.deepEqual(
      short.map((v) => v.rule),
      ["hex"],
    );
  });

  it("flags gradient", () => {
    const bans = scan('const a = 1;\nconst bg = "linear-gradient(red, blue)";\n');
    assert.deepEqual(bans, [{ path: "src/features/receipt/a.tsx", line: 2, rule: "gradient" }]);
    assert.equal(scan('import { LinearGradient } from "expo-linear-gradient";').length, 1);
  });

  it("flags pink", () => {
    assert.deepEqual(
      scan('<Text className="text-pink-500" />').map((v) => v.rule),
      ["pink"],
    );
    assert.deepEqual(
      scan('const c = "fuchsia";').map((v) => v.rule),
      ["pink"],
    );
    assert.deepEqual(
      scan("bg-magenta-100").map((v) => v.rule),
      ["pink"],
    );
  });

  it("flags mock-data import", () => {
    assert.deepEqual(
      scan('import { rows } from "@/lib/mock-data";\n').map((v) => v.rule),
      ["mock-data"],
    );
    assert.deepEqual(
      scan('const m = require("../lib/mock-data/orders");').map((v) => v.rule),
      ["mock-data"],
    );
  });

  it("allows clean file", () => {
    const clean = [
      'import { Text } from "@/components/ui";',
      'export const A = () => <Text className="text-foreground bg-card">ok</Text>;',
      "",
    ].join("\n");
    assert.deepEqual(scan(clean), []);
  });

  it("reports each rule once per line and keeps line numbers", () => {
    const bans = scan('a\nb\nconst x = "#ff0000", y = "#00ff00";\n');
    assert.deepEqual(bans, [{ path: "src/features/receipt/a.tsx", line: 3, rule: "hex" }]);
  });

  it("ignores comments, issue references and html entities", () => {
    const content = [
      "// uses #123 and a linear-gradient mention",
      "/**",
      " * Pink badge, see #fff",
      " */",
      "const n = 5; // tracked in #456",
      'const e = "&#169; &#x1F600;";',
    ].join("\n");
    assert.deepEqual(scan(content), []);
  });
});

describe("scanProject", () => {
  let root;

  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "stockflow-style-bans-"));
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function write(file, content) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  it("tolerates a project without app/ or src/", () => {
    assert.deepEqual(scanProject(root), []);
  });

  it("skips tokens.ts and the verbatim web constants but scans everything else", () => {
    write(
      "port-manifest.json",
      JSON.stringify({
        files: [
          { target: "src/constants/web.ts", mode: "verbatim" },
          { target: "src/constants/adapted.ts", mode: "adapted" },
          { target: "src/lib/api/error.ts", mode: "verbatim" },
        ],
      }),
    );
    write("src/lib/tokens.ts", 'export const brand = "#0A84FF";\n');
    write("src/constants/web.ts", 'export const c = "#FFFFFF";\n');
    write("src/constants/mobile/colors.ts", 'export const c = "#FFFFFF";\n');
    write("src/constants/adapted.ts", 'export const c = "#FFFFFF";\n');
    write("src/constants/unlisted.ts", 'export const c = "#FFFFFF";\n');
    write("src/lib/api/error.ts", 'export const c = "#FFFFFF";\n');
    write("src/features/receipt/a.tsx", 'export const c = "#FFFFFF";\n');
    write("src/lib/other.ts", 'export const c = "#FFFFFF";\n');
    write("app/(app)/index.tsx", 'export const c = "text-pink-500";\n');
    write("src/features/receipt/data.json", '{ "c": "#FFFFFF" }\n');

    const bans = scanProject(root).map((ban) => `${ban.path}:${ban.line}:${ban.rule}`);
    assert.deepEqual(bans.sort(), [
      "app/(app)/index.tsx:1:pink",
      "src/constants/adapted.ts:1:hex",
      "src/constants/mobile/colors.ts:1:hex",
      "src/constants/unlisted.ts:1:hex",
      "src/features/receipt/a.tsx:1:hex",
      "src/lib/api/error.ts:1:hex",
      "src/lib/other.ts:1:hex",
    ]);
  });

  it("scans every constants file when the manifest is missing or unreadable", () => {
    fs.rmSync(path.join(root, "port-manifest.json"));
    assert.ok(scanProject(root).some((ban) => ban.path === "src/constants/web.ts"));
    write("port-manifest.json", "{ not json");
    assert.ok(scanProject(root).some((ban) => ban.path === "src/constants/web.ts"));
  });

  it("skips node_modules folders", () => {
    write("src/node_modules/pkg/index.js", 'module.exports = "#FFFFFF";\n');
    const bans = scanProject(root).map((ban) => ban.path);
    assert.ok(!bans.some((p) => p.includes("node_modules")), bans.join(", "));
  });

  it("cli exits 1 with violations and 0 without", () => {
    write("src/features/receipt/a.tsx", 'export const c = "#FFFFFF";\n');
    const failing = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
    assert.equal(failing.status, 1, failing.stdout + failing.stderr);
    assert.match(failing.stdout + failing.stderr, /src\/features\/receipt\/a\.tsx:1/);

    const clean = fs.mkdtempSync(path.join(os.tmpdir(), "stockflow-style-bans-clean-"));
    try {
      fs.mkdirSync(path.join(clean, "src"));
      fs.writeFileSync(path.join(clean, "src", "a.ts"), "export const a = 1;\n");
      const output = execFileSync(process.execPath, [SCRIPT], { cwd: clean, encoding: "utf8" });
      assert.match(output, /no style violations/i);
    } finally {
      fs.rmSync(clean, { recursive: true, force: true });
    }
  });
});

describe("cli started through a link", () => {
  it("still runs: a link to the scripts folder must not turn the check into a silent pass", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "stockflow-style-bans-link-"));
    try {
      // A junction works without admin rights on Windows; elsewhere the type is ignored.
      fs.symlinkSync(path.dirname(SCRIPT), path.join(temp, "link"), "junction");
      fs.mkdirSync(path.join(temp, "project", "src"), { recursive: true });
      fs.writeFileSync(path.join(temp, "project", "src", "a.ts"), 'export const c = "#FFFFFF";\n');

      const result = spawnSync(
        process.execPath,
        [path.join(temp, "link", "check-style-bans.mjs")],
        { cwd: path.join(temp, "project"), encoding: "utf8" },
      );
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /src\/a\.ts:1/);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
