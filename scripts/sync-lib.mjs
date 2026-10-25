// Shared logic for the web-sync scripts (sync-check / sync-add / sync-pull / sync-ack).
//
// Pure TypeScript files are copied from the web repo and tracked in port-manifest.json so the two
// never drift silently. The web repo is only ever READ, at the pinned ref (`git rev-parse` and
// `git show`): nothing here fetches, pulls or checks out.
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

/**
 * @typedef {"verbatim" | "adapted"} Mode
 * @typedef {{ source: string, target: string, mode: Mode, sourceBlob: string, note?: string }} ManifestEntry
 * @typedef {{ webRepoEnv: string, webRepoDefault: string, webRef: string, files: ManifestEntry[] }} Manifest
 * @typedef {"content-differs" | "source-changed" | "source-missing" | "target-missing"} Problem
 * @typedef {{ root: string, manifest: Manifest, repo: string }} SyncContext
 */

export const MANIFEST_FILE = "port-manifest.json";
const MODES = ["verbatim", "adapted"];
const MAX_BUFFER = 64 * 1024 * 1024;

/** A failure the user can act on: printed as a one-line message, never as a stack trace. */
export class SyncError extends Error {
  constructor(message) {
    super(message);
    this.name = "SyncError";
  }
}

// ---------------------------------------------------------------------------------------------
// Paths and line endings

/** Normalises a CLI/manifest path to a repo-relative POSIX path, or throws. */
export function toRepoPath(input) {
  const normalized = path.posix.normalize(input.replaceAll("\\", "/"));
  const escapes =
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized) ||
    /^[A-Za-z]:/.test(normalized);
  if (escapes)
    throw new SyncError(`đường dẫn phải nằm trong repo và là đường dẫn tương đối: ${input}`);
  return normalized;
}

/** CRLF -> LF (byte-safe), so Windows `core.autocrlf` cannot cause false differences. */
export function normalizeEol(buffer) {
  return Buffer.from(buffer.toString("latin1").replace(/\r\n/g, "\n"), "latin1");
}

function sameContent(a, b) {
  return normalizeEol(a).equals(normalizeEol(b));
}

// ---------------------------------------------------------------------------------------------
// Manifest

function validateManifest(data) {
  const fail = (where, problem) => {
    throw new SyncError(`${MANIFEST_FILE}: ${where} ${problem}`);
  };
  const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  const isText = (value) => typeof value === "string" && value !== "";

  if (!isRecord(data)) fail("nội dung", "phải là object");
  for (const key of ["webRepoEnv", "webRepoDefault", "webRef"]) {
    if (!isText(data[key])) fail(`"${key}"`, "phải là chuỗi không rỗng");
  }
  if (!Array.isArray(data.files)) fail('"files"', "phải là mảng");

  const targets = new Set();
  data.files.forEach((entry, index) => {
    const where = `files[${index}]`;
    if (!isRecord(entry)) fail(where, "phải là object");
    for (const key of ["source", "target", "sourceBlob"]) {
      if (!isText(entry[key])) fail(`${where}.${key}`, "phải là chuỗi không rỗng");
    }
    if (!MODES.includes(entry.mode)) fail(`${where}.mode`, `phải là ${MODES.join(" | ")}`);
    if (entry.note !== undefined && typeof entry.note !== "string") {
      fail(`${where}.note`, "phải là chuỗi");
    }
    for (const key of ["source", "target"]) {
      if (toRepoPath(entry[key]) !== entry[key]) {
        fail(`${where}.${key}`, `không phải đường dẫn chuẩn trong repo: ${entry[key]}`);
      }
    }
    if (targets.has(entry.target)) fail(where, `trùng target ${entry.target}`);
    targets.add(entry.target);
  });
  return data;
}

/** @returns {Manifest} */
export function readManifest(root) {
  const file = path.join(root, MANIFEST_FILE);
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new SyncError(`không thấy ${MANIFEST_FILE} trong ${root}`);
    throw error;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new SyncError(`${MANIFEST_FILE} không phải JSON hợp lệ: ${error.message}`);
  }
  return validateManifest(data);
}

function canonicalEntry({ source, target, mode, sourceBlob, note }) {
  return { source, target, mode, sourceBlob, ...(note ? { note } : {}) };
}

/** Writes `files` sorted by target, JSON with two-space indent, LF and a trailing newline. */
export function writeManifest(root, manifest) {
  const files = manifest.files
    .map(canonicalEntry)
    .sort((a, b) => (a.target < b.target ? -1 : a.target > b.target ? 1 : 0));
  const { webRepoEnv, webRepoDefault, webRef } = manifest;
  const json = JSON.stringify({ webRepoEnv, webRepoDefault, webRef, files }, null, 2);
  fs.writeFileSync(path.join(root, MANIFEST_FILE), `${json}\n`);
}

function withEntries(manifest, updated) {
  const byTarget = new Map(updated.map((entry) => [entry.target, entry]));
  return { ...manifest, files: manifest.files.map((entry) => byTarget.get(entry.target) ?? entry) };
}

// ---------------------------------------------------------------------------------------------
// Reading the web repo (read-only git)

function runGit(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], {
    maxBuffer: MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function pickWebRepo(root, manifest, env) {
  const fromEnv = env[manifest.webRepoEnv];
  return path.resolve(root, fromEnv || manifest.webRepoDefault);
}

/** The web repo path: env var named by the manifest if set, else the manifest default. */
export function resolveWebRepo(root, env = process.env) {
  return pickWebRepo(root, readManifest(root), env);
}

/** Blob id of `path` at `ref`, or null when the path is not there (`rev-parse` exits 1). */
function findWebBlob(repo, ref, filePath) {
  try {
    return runGit(repo, ["rev-parse", "--verify", "--quiet", `${ref}:${filePath}`])
      .toString("utf8")
      .trim();
  } catch (error) {
    if (error.status === 1) return null;
    throw error;
  }
}

export function webBlob(repo, ref, filePath) {
  const blob = findWebBlob(repo, ref, filePath);
  if (blob === null) {
    throw new SyncError(`không thấy ${filePath} trong ${ref} của repo web (${repo})`);
  }
  return blob;
}

/** @returns {Buffer} */
export function webContent(repo, ref, filePath) {
  return runGit(repo, ["show", `${ref}:${filePath}`]);
}

/** Like `webBlob`, but also refuses a directory: only files can be ported. */
function webFile(repo, ref, filePath) {
  const blob = webBlob(repo, ref, filePath);
  if (runGit(repo, ["cat-file", "-t", blob]).toString("utf8").trim() !== "blob") {
    throw new SyncError(`${filePath} trong ${ref} là thư mục, chỉ port được file`);
  }
  return { blob, content: normalizeEol(webContent(repo, ref, filePath)) };
}

/**
 * Loads the manifest and checks that the web repo and its pinned ref are present, so a missing
 * clone or ref is reported once instead of as a problem on every file.
 * @returns {SyncContext}
 */
export function openWeb(root, env = process.env) {
  const manifest = readManifest(root);
  const repo = pickWebRepo(root, manifest, env);
  if (!fs.existsSync(repo)) {
    throw new SyncError(
      `không thấy repo web ở ${repo}; clone stockflow-ui vào đó hoặc đặt biến ${manifest.webRepoEnv}`,
    );
  }
  try {
    runGit(repo, ["rev-parse", "--verify", "--quiet", `${manifest.webRef}^{commit}`]);
  } catch (error) {
    if (error.status !== 1) throw error;
    throw new SyncError(
      `repo web ${repo} chưa có ref ${manifest.webRef}; tự chạy git fetch ở đó (script sync không fetch)`,
    );
  }
  return { root, manifest, repo };
}

// ---------------------------------------------------------------------------------------------
// check

/** @returns {Problem | null} the first thing wrong with `entry`, or null when it is in sync. */
function findProblem(root, repo, ref, entry) {
  const blob = findWebBlob(repo, ref, entry.source);
  if (blob === null) return "source-missing";
  const targetFile = path.join(root, entry.target);
  if (!fs.existsSync(targetFile)) return "target-missing";
  if (entry.mode === "adapted") return blob === entry.sourceBlob ? null : "source-changed";
  return sameContent(fs.readFileSync(targetFile), webContent(repo, ref, entry.source))
    ? null
    : "content-differs";
}

/**
 * verbatim: the target must equal the web file at the ref. adapted: the web file must still be the
 * blob recorded when it was last ported or acknowledged (the target itself is free to differ).
 * @returns {{ target: string, problem: Problem }[]}
 */
export function checkEntries(root, manifest, repo) {
  const found = [];
  for (const entry of manifest.files) {
    const problem = findProblem(root, repo, manifest.webRef, entry);
    if (problem) found.push({ target: entry.target, problem });
  }
  return found;
}

const HINTS = {
  "content-differs": (target) =>
    `khác bản web (sửa tay hoặc web đã đổi); ghi lại từ web: pnpm sync:pull ${target}`,
  "source-changed": (target) => `nguồn web đã đổi; port thay đổi rồi chạy: pnpm sync:ack ${target}`,
  "source-missing": () => "nguồn không còn trên web; xoá mục khỏi manifest hoặc đổi source",
  "target-missing": (target) =>
    `thiếu file; verbatim: pnpm sync:pull ${target}, adapted: khôi phục file`,
};

/** @returns {string[]} one aligned line per problem, with the command that fixes it. */
export function formatProblems(found) {
  const targetWidth = Math.max(...found.map(({ target }) => target.length));
  const problemWidth = Math.max(...found.map(({ problem }) => problem.length));
  return found.map(
    ({ target, problem }) =>
      `${target.padEnd(targetWidth)}  ${problem.padEnd(problemWidth)}  ${HINTS[problem](target)}`,
  );
}

// ---------------------------------------------------------------------------------------------
// add / pull / ack

function writeTarget(root, target, content) {
  const file = path.join(root, target);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** @returns {{ sources: string[], target?: string, mode: Mode, note?: string }} */
export function parseAddArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        target: { type: "string" },
        mode: { type: "string", default: "verbatim" },
        note: { type: "string" },
      },
    });
  } catch (error) {
    if (typeof error.code === "string" && error.code.startsWith("ERR_PARSE_ARGS")) {
      throw new SyncError(error.message);
    }
    throw error;
  }
  const { values, positionals } = parsed;
  if (positionals.length === 0) {
    throw new SyncError(
      'dùng: sync:add <source…> [--target <t>] [--mode verbatim|adapted] [--note "<text>"]',
    );
  }
  if (!MODES.includes(values.mode)) {
    throw new SyncError(`--mode phải là ${MODES.join(" hoặc ")}, nhận được: ${values.mode}`);
  }
  if (values.target !== undefined && positionals.length > 1) {
    throw new SyncError("--target chỉ dùng được với một source");
  }
  return {
    sources: positionals.map(toRepoPath),
    target: values.target === undefined ? undefined : toRepoPath(values.target),
    mode: values.mode,
    note: values.note,
  };
}

/**
 * Copies each source from the web ref into the mobile repo and records it. Everything is checked
 * before the first file is written, so a refused entry leaves nothing half-added.
 * @param {SyncContext} context
 * @returns {ManifestEntry[]} the entries added
 */
export function addEntries({ root, manifest, repo }, { sources, target, mode, note }) {
  const taken = new Set(manifest.files.map((entry) => entry.target));
  const planned = sources.map((source) => {
    const entryTarget = target ?? source;
    if (taken.has(entryTarget)) {
      throw new SyncError(`${entryTarget} đã có trong ${MANIFEST_FILE}`);
    }
    taken.add(entryTarget);
    const { blob, content } = webFile(repo, manifest.webRef, source);
    const existing = path.join(root, entryTarget);
    if (fs.existsSync(existing) && !sameContent(fs.readFileSync(existing), content)) {
      throw new SyncError(`${entryTarget} đã tồn tại và khác bản web; không ghi đè`);
    }
    const entry = canonicalEntry({ source, target: entryTarget, mode, sourceBlob: blob, note });
    return { content, entry };
  });
  for (const { content, entry } of planned) writeTarget(root, entry.target, content);
  const added = planned.map(({ entry }) => entry);
  writeManifest(root, { ...manifest, files: [...manifest.files, ...added] });
  return added;
}

/** Entries for `targets`, which must exist in the manifest and have the mode `command` works on. */
function selectEntries(manifest, targets, command) {
  if (targets.length === 0) throw new SyncError(`dùng: sync:${command} <target…>`);
  const required = command === "pull" ? "verbatim" : "adapted";
  const other = command === "pull" ? "ack" : "pull";
  return [...new Set(targets.map(toRepoPath))].map((target) => {
    const entry = manifest.files.find((candidate) => candidate.target === target);
    if (!entry) throw new SyncError(`${target} không có trong ${MANIFEST_FILE}`);
    if (entry.mode !== required) {
      throw new SyncError(
        `${target} là mục ${entry.mode}, lệnh này chỉ dùng cho mục ${required}; dùng sync:${other}`,
      );
    }
    return entry;
  });
}

/**
 * verbatim only: rewrites each target from the web ref and records the new blob.
 * @param {SyncContext} context
 * @returns {ManifestEntry[]} the refreshed entries
 */
export function pullEntries({ root, manifest, repo }, targets) {
  const fresh = selectEntries(manifest, targets, "pull").map((entry) => {
    const { blob, content } = webFile(repo, manifest.webRef, entry.source);
    return { content, entry: { ...entry, sourceBlob: blob } };
  });
  for (const { content, entry } of fresh) writeTarget(root, entry.target, content);
  const refreshed = fresh.map(({ entry }) => entry);
  writeManifest(root, withEntries(manifest, refreshed));
  return refreshed;
}

/**
 * adapted only: records the current web blob as reviewed; the target file is left alone.
 * @param {SyncContext} context
 * @returns {ManifestEntry[]} the acknowledged entries
 */
export function ackEntries({ root, manifest, repo }, targets) {
  const acknowledged = selectEntries(manifest, targets, "ack").map((entry) => ({
    ...entry,
    sourceBlob: webBlob(repo, manifest.webRef, entry.source),
  }));
  writeManifest(root, withEntries(manifest, acknowledged));
  return acknowledged;
}

// ---------------------------------------------------------------------------------------------
// CLI

/** Runs a CLI body from the repo root (pnpm's cwd); a SyncError becomes `<name>: message`, exit 1. */
export function runCli(name, run) {
  try {
    run({ root: process.cwd(), env: process.env, args: process.argv.slice(2) });
  } catch (error) {
    if (!(error instanceof SyncError)) throw error;
    console.error(`${name}: ${error.message}`);
    process.exitCode = 1;
  }
}
