#!/usr/bin/env node
/**
 * PreToolUse hook — chặn Claude sửa các file mà CLAUDE.md khai báo là bất khả xâm phạm.
 *
 * Biến luật mềm thành rào cứng (spec §6.1, §9):
 *   - src/components/ui/**   → primitives kiểu shadcn: viết mới thoải mái, nhưng KHOÁ khi đường dẫn đó
 *                              đã nằm trên nhánh `main` (git cat-file -e main:<path>); git lỗi → cho qua
 *   - .env*                  → bí mật (trừ .env.example)
 *   - mọi `target` có `mode: "verbatim"` trong port-manifest.json
 *                            → bản sao y nguyên của web; chỉ `pnpm sync:pull` được ghi
 *
 * exit 2 = chặn tool call, stderr được trả về cho Claude.
 * Hook hỏng (stdin lạ, manifest thiếu/hỏng) thì KHÔNG chặn — không được làm kẹt phiên làm việc.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST_FILE = "port-manifest.json";
const UI_PREFIX = "src/components/ui/";

const toPosix = (value) => value.replaceAll("\\", "/");

/** `a/./b`, `a/../b`, `./a` → dạng chuẩn POSIX; có thể bắt đầu bằng `../` nếu thoát khỏi gốc. */
function normalizeRelative(value) {
  return path.posix.normalize(toPosix(value));
}

/**
 * Đường dẫn tương đối so với `root` (POSIX), hoặc null nếu file nằm ngoài project.
 * Xử lý đường dẫn tương đối, tuyệt đối kiểu Windows (`D:\..`, `D:/..`) và POSIX.
 */
function relativeToRoot(filePath, root) {
  const file = toPosix(filePath);
  const isAbsolute = file.startsWith("/") || /^[A-Za-z]:\//.test(file);
  if (!isAbsolute) {
    const relative = normalizeRelative(file);
    return relative.startsWith("../") || relative === ".." ? null : relative;
  }
  const base = toPosix(root).replace(/\/+$/, "");
  if (!file.toLowerCase().startsWith(`${base.toLowerCase()}/`)) return null;
  return normalizeRelative(file.slice(base.length + 1));
}

function isEnvFile(filePath) {
  const name = toPosix(filePath).split("/").pop()?.toLowerCase() ?? "";
  return (name === ".env" || name.startsWith(".env.")) && name !== ".env.example";
}

/**
 * `relative` (POSIX, so với `root`) đã có trên nhánh `main` của repo ở `root`?
 * Mọi lỗi git (không phải repo, không có `main`, thiếu git, quá hạn) → false = chưa khoá.
 * Bỏ biến GIT_* thừa hưởng (GIT_DIR, GIT_INDEX_FILE…) để không hỏi nhầm repo khác.
 */
function isOnMain(root, relative) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
  );
  const result = spawnSync("git", ["-C", root, "cat-file", "-e", `main:${relative}`], {
    env,
    stdio: "ignore",
    timeout: 5000,
  });
  return result.status === 0;
}

/** Các `target` verbatim trong port-manifest.json (rỗng nếu manifest thiếu hoặc hỏng). */
function verbatimTargets(root) {
  try {
    const raw = readFileSync(path.join(root, MANIFEST_FILE), "utf8").replace(/^\uFEFF/, "");
    const files = JSON.parse(raw)?.files;
    if (!Array.isArray(files)) return [];
    return files
      .filter((entry) => entry?.mode === "verbatim" && typeof entry.target === "string")
      .map((entry) => normalizeRelative(entry.target).toLowerCase());
  } catch {
    return [];
  }
}

/**
 * @param {string} filePath file Claude định sửa (tuyệt đối hoặc tương đối so với `root`)
 * @param {string} root gốc project (thư mục chứa port-manifest.json)
 * @returns {string | null} lý do bị chặn, hoặc null nếu được phép
 */
export function protectedReason(filePath, root) {
  if (isEnvFile(filePath)) {
    return "File .env chứa bí mật. Sửa .env.example nếu cần khai báo biến mới.";
  }

  const relative = relativeToRoot(filePath, root);
  if (relative === null) return null;

  if (relative.toLowerCase().startsWith(UI_PREFIX) && isOnMain(root, relative)) {
    return (
      "src/components/ui/** là primitives kiểu shadcn của dự án — không sửa tay (spec §4.4, §9). " +
      "Primitives bị khoá khi đã vào nhánh main (file này đã có trên main). " +
      "Cần biến thể thì bọc lại trong src/components/shared/ hoặc truyền qua className/token."
    );
  }

  if (verbatimTargets(root).includes(relative.toLowerCase())) {
    return (
      `${relative} là bản sao verbatim của web (port-manifest.json, spec §6.1) — chỉ \`pnpm sync:pull\` được ghi. ` +
      "Muốn đổi nội dung: sửa file ở repo web rồi `pnpm sync:pull " +
      `${relative}\`. ` +
      "Nếu mobile thật sự cần khác web: đổi `mode` sang `adapted` (kèm `note`) trong port-manifest.json " +
      "rồi mới sửa file, sau đó `pnpm sync:ack`. Lỗi lint riêng của file verbatim → thêm " +
      "VERBATIM_OVERRIDES trong eslint.config.mjs, không sửa file."
    );
  }

  return null;
}

/**
 * File này có đang là script được `node` chạy không? So realpath để junction/symlink không làm
 * hook im lặng không chạy; không resolve được → coi là đang chạy (CLI fail closed).
 */
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return true;
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    // Không parse được input thì không chặn — hook hỏng không được làm kẹt phiên làm việc.
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (typeof filePath !== "string" || filePath.length === 0) process.exit(0);

  const root = typeof input?.cwd === "string" && input.cwd.length > 0 ? input.cwd : process.cwd();

  let reason = null;
  try {
    reason = protectedReason(filePath, root);
  } catch {
    process.exit(0);
  }
  if (reason === null) process.exit(0);

  process.stderr.write(
    `BỊ CHẶN: ${filePath}\n\n${reason}\n\n` +
      `Nếu người dùng đã yêu cầu rõ ràng sửa file này, hãy nói với họ rằng hook đang chặn ` +
      `và đề nghị họ tự sửa hoặc tạm tắt hook trong .claude/settings.json.\n`,
  );
  process.exit(2);
}

if (isMainModule()) main();
