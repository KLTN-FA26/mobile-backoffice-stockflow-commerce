#!/usr/bin/env node
// Fails when app/ or src/ break the visual rules: bare hex colours, gradients, pink/magenta/fuchsia
// and imports of the mock-data module. Run from the repo root (`pnpm lint` does).
import fs from "node:fs";
import path from "node:path";

import { isMainModule } from "./is-main-module.mjs";

const SCAN_DIRS = ["app", "src"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// Tokens are declared once, in this file. The web constants copied verbatim (port-manifest.json) are the other
// exemption: they cannot be edited here, so a hex in one is the web's to fix. Everything else in src/constants,
// src/constants/mobile included, is checked like any other file.
const TOKENS_FILE = "src/lib/tokens.ts";
const VERBATIM_CONSTANTS_ROOT = "src/constants/";

const HEX_COLOR =
  /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?!\w)/;

const RULES = [
  { rule: "hex", pattern: HEX_COLOR, hint: "màu hex trần, dùng token trong src/lib/tokens.ts" },
  {
    rule: "gradient",
    pattern: /gradient|\bbg-(?:linear|radial|conic)-/i,
    hint: "không dùng gradient",
  },
  { rule: "pink", pattern: /pink|fuchsia|magenta/i, hint: "không dùng màu hồng/magenta/fuchsia" },
  {
    rule: "mock-data",
    pattern: /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'`][^"'`\n]*mock-data/,
    hint: "không import @/lib/mock-data",
  },
];

/** Replaces comment text with spaces so line numbers survive and `#123` in a comment is not hex. */
function blankComments(source) {
  let out = "";
  let quote = null;
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];
    if (quote) {
      out += char;
      if (char === "\\" && next !== undefined) {
        out += next;
        i += 2;
        continue;
      }
      if (char === quote || (char === "\n" && quote !== "`")) quote = null;
      i += 1;
    } else if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i += 1;
      }
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else {
      if (char === '"' || char === "'" || char === "`") quote = char;
      out += char;
      i += 1;
    }
  }
  return out;
}

/**
 * @param {{ path: string, content: string }[]} files
 * @returns {{ path: string, line: number, rule: "hex" | "gradient" | "pink" | "mock-data" }[]}
 */
export function findStyleBans(files) {
  const bans = [];
  for (const { path: filePath, content } of files) {
    blankComments(content)
      .split("\n")
      .forEach((line, index) => {
        for (const { rule, pattern } of RULES) {
          if (pattern.test(line)) bans.push({ path: filePath, line: index + 1, rule });
        }
      });
  }
  return bans;
}

/** Manifest targets under src/constants/ with mode "verbatim"; empty when the manifest cannot be read. */
function readVerbatimConstants(rootDir) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "port-manifest.json"), "utf8"));
    return new Set(
      manifest.files
        .filter(
          (entry) => entry.mode === "verbatim" && entry.target.startsWith(VERBATIM_CONSTANTS_ROOT),
        )
        .map((entry) => entry.target),
    );
  } catch {
    return new Set();
  }
}

function collectFiles(rootDir, relativeDir, exempt) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...collectFiles(rootDir, relativePath, exempt));
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name)) && !exempt.has(relativePath)) {
      files.push(relativePath);
    }
  }
  return files;
}

/** Scans `app/` and `src/` under `rootDir`; folders that do not exist yet are skipped. */
export function scanProject(rootDir) {
  const exempt = new Set([TOKENS_FILE, ...readVerbatimConstants(rootDir)]);
  const files = SCAN_DIRS.flatMap((dir) => collectFiles(rootDir, dir, exempt)).map(
    (relativePath) => ({
      path: relativePath,
      content: fs.readFileSync(path.join(rootDir, relativePath), "utf8"),
    }),
  );
  return findStyleBans(files);
}

function main() {
  const bans = scanProject(process.cwd());
  if (bans.length === 0) {
    console.log("check-style-bans: no style violations.");
    return;
  }
  const hints = Object.fromEntries(RULES.map(({ rule, hint }) => [rule, hint]));
  for (const { path: filePath, line, rule } of bans) {
    console.error(`${filePath}:${line}  [${rule}] ${hints[rule]}`);
  }
  console.error(`check-style-bans: ${bans.length} violation(s).`);
  process.exitCode = 1;
}

if (isMainModule(import.meta.url)) main();
