#!/usr/bin/env node
/**
 * PostToolUse hook — format + autofix riêng file Claude vừa sửa.
 *
 * Chạy prettier rồi eslint --fix trên MỘT file, không quét cả app/ + src/ —
 * giữ độ trễ ở mức vài trăm ms mỗi lần Edit.
 *
 * Không trùng husky: lint-staged chạy lúc commit trên staged files;
 * hook này chạy ngay lúc sửa nên lỗi format không tích lại tới cuối phiên.
 *
 * Format hỏng, prettier/eslint/pnpm không chạy được → exit 0 (không được chặn công việc).
 * Chỉ khi eslint chạy được và còn lỗi chưa tự sửa: ghi lỗi ra stderr và exit 2 — stdout của
 * PostToolUse không hiện cho Claude, còn stderr của exit 2 thì có — để Claude tự sửa ngay.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORMATTABLE = /\.(ts|tsx|css|mjs|json|md)$/i;
const LINTABLE = /\.(ts|tsx)$/i;
const SKIP = /(^|\/)(node_modules|\.expo|dist|coverage)\/|(^|\/)pnpm-lock\.yaml$/i;

const useShell = process.platform === "win32"; // Windows cần shell để resolve pnpm.cmd

/** Với shell, spawn nối args bằng dấu cách — bọc đường dẫn có ký tự đặc biệt cho an toàn. */
const quote = (arg) => (useShell && /[^\w@%+=:,./\\-]/.test(arg) ? `"${arg}"` : arg);

/** Dấu hiệu pnpm/eslint không chạy được (khác với "eslint chạy và báo lỗi"). */
const NOT_RUNNABLE =
  /is not recognized as an internal or external command|command not found|ERR_PNPM_|Command "[^"]+" not found|ENOENT/i;

/** Chạy lệnh qua pnpm exec, trả về { status, output }. */
function run(args, cwd) {
  const result = spawnSync("pnpm", ["exec", ...args.map(quote)], {
    cwd,
    encoding: "utf8",
    shell: useShell,
    timeout: 30_000,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

/**
 * Thông điệp gửi Claude khi eslint chạy được và còn lỗi (exit code 1 + có output); ngược lại null.
 * Exit code 2 (lỗi cấu hình/crash), không có status (timeout/spawn lỗi) và lỗi của pnpm/shell
 * không phải "lỗi trong code" nên không chặn.
 * @param {{ status: number | null, output: string }} result
 * @param {string} relative đường dẫn file (tương đối project) để hiển thị
 */
export function lintFeedback(result, relative) {
  if (result.status !== 1 || !result.output || NOT_RUNNABLE.test(result.output)) return null;
  return (
    `eslint còn lỗi chưa tự sửa được ở ${relative}:\n${result.output}\n\n` +
    `Sửa ngay trước khi đi tiếp. Không dùng \`any\` hay \`eslint-disable\` để lách.\n`
  );
}

/** Có đang là script được `node` chạy không (so realpath, qua junction/symlink vẫn đúng). */
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
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path;
  const projectDir = input?.cwd ?? process.cwd();

  if (typeof filePath !== "string") process.exit(0);
  if (!FORMATTABLE.test(filePath)) process.exit(0);

  // Chỉ xử lý file nằm trong project.
  const relative = path.relative(projectDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);
  if (SKIP.test(relative.replaceAll("\\", "/"))) process.exit(0);

  run(["prettier", "--write", filePath], projectDir);

  if (LINTABLE.test(filePath)) {
    const lint = run(["eslint", "--fix", "--max-warnings", "0", filePath], projectDir);
    const feedback = lintFeedback(lint, relative);
    if (feedback) {
      // PostToolUse: stderr + exit 2 hiện cho Claude (stdout thì không) — để nó tự sửa phần eslint không fix được.
      process.stderr.write(feedback);
      process.exit(2);
    }
  }

  process.exit(0);
}

if (isMainModule()) main();
