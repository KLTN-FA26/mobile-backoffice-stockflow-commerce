#!/usr/bin/env node
/**
 * Stop hook — nhắc chạy quy trình verify trước khi coi task là xong.
 *
 * CLAUDE.md: "Chưa chạy `pnpm run validate` thì KHÔNG được nói task đã xong.
 * Không suy đoán 'chắc là pass'." (spec §8.3)
 *
 * Hook này KHÔNG tự chạy `pnpm run validate` (mất vài phút, sẽ làm treo phiên).
 * Nó chỉ kiểm tra: có file code trong app/ hoặc src/ đang dirty không? Nếu có và Claude chưa
 * chạy validate trong lượt này → chặn Stop một lần và bắt Claude verify.
 *
 * Chống lặp vô hạn: nếu stop_hook_active = true thì thôi, để Claude dừng.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WATCHED_DIRS = ["app", "src"];
const CODE_FILE = /\.(ts|tsx|css)$/i;

/** stdout của git, KHÔNG trim đầu — dòng porcelain đầu tiên có thể bắt đầu bằng dấu cách. */
function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 15_000 });
  return result.status === 0 ? (result.stdout ?? "").trimEnd() : "";
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }

  // Đã chặn một lần rồi — không chặn nữa, tránh vòng lặp.
  if (input?.stop_hook_active) process.exit(0);

  const projectDir = input?.cwd ?? process.cwd();

  // File code đang thay đổi (staged + unstaged + untracked, liệt kê từng file).
  const status = git(
    ["status", "--porcelain", "--untracked-files=all", "--", ...WATCHED_DIRS],
    projectDir,
  );
  if (!status) process.exit(0);

  const changed = status
    .split(/\r?\n/)
    .map((line) => line.slice(3).split(" -> ").pop()?.trim() ?? "")
    .filter(Boolean);

  // Chỉ quan tâm file code — sửa mỗi .md/.json thì không cần build.
  const codeChanged = changed.filter((file) => CODE_FILE.test(file));
  if (codeChanged.length === 0) process.exit(0);

  const preview = codeChanged.slice(0, 8).join("\n  ");
  const more = codeChanged.length > 8 ? `\n  … và ${codeChanged.length - 8} file nữa` : "";

  process.stderr.write(
    `Có ${codeChanged.length} file code (app/, src/) đang thay đổi chưa commit:\n  ${preview}${more}\n\n` +
      `CLAUDE.md yêu cầu chạy \`pnpm run validate\` trước khi báo xong ` +
      `(typecheck → lint → test → test:scripts → sync:check → doctor → export:check).\n\n` +
      `Nếu ĐÃ chạy và dán output thật trong lượt này → trả lời ngắn gọn là đã verify rồi và dừng lại.\n` +
      `Nếu CHƯA chạy → chạy ngay bây giờ, dán output thật, phân biệt lỗi mình gây ra với lỗi có sẵn trên baseline.\n` +
      `Nếu người dùng chỉ hỏi thông tin / chưa muốn verify → nói rõ là bỏ qua bước này theo yêu cầu của họ.\n`,
  );
  process.exit(2);
}

main();
