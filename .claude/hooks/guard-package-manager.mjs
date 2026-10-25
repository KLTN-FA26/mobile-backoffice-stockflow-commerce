#!/usr/bin/env node
/**
 * PreToolUse hook (Bash/PowerShell) — ép dùng pnpm.
 *
 * CLAUDE.md: dự án dùng pnpm 10.9.0 (`packageManager`, pnpm-lock.yaml, `.npmrc`
 * node-linker=hoisted) — KHÔNG npm/yarn/bun để cài hay chạy script. Phiên bản module native
 * lấy theo `pnpm exec expo install <pkg>`, không tự chọn bản.
 *
 * Chặn npm install / yarn / bun install và gợi ý lệnh pnpm tương đương.
 * `npx` được cho qua (không ghi lockfile).
 *
 * Chỉ xét tên chương trình ở VỊ TRÍ LỆNH: chuỗi trong dấu nháy, thân heredoc (`<<EOF`) và
 * here-string PowerShell (`@' … '@`) bị che trước khi khớp, nên `git commit -m "…; yarn add x"`
 * hay heredoc chứa `; npm install` không bị chặn oan. Lệnh truyền cho shell (`bash -c "…"`)
 * và `$(…)` bên trong nháy kép vẫn được kiểm.
 */

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Chỉ khớp khi tên chương trình đứng ở ĐẦU MỘT LỆNH — đầu chuỗi, hoặc sau
 * `;` `&&` `||` `|` `(` `{` `\n`, backtick hay `$(`.
 */
const CMD_START = String.raw`(?:^|[\n;|&(){\`]|&&|\|\||\$\()\s*`;

/** @type {{ pattern: RegExp, suggest: string }[]} */
const BLOCKED = [
  {
    pattern: new RegExp(CMD_START + String.raw`npm\s+(install|i|add|ci)\b`),
    suggest:
      "pnpm install  (thêm dependency: `pnpm add <pkg>`; module native: `pnpm exec expo install <pkg>`)",
  },
  {
    pattern: new RegExp(
      CMD_START +
        String.raw`npm\s+(run\s+)?(start|android|ios|lint|test|typecheck|validate|format|doctor|export:check|sync:\w+)\b`,
    ),
    suggest: "pnpm run <script>  (xem mục scripts trong package.json)",
  },
  {
    pattern: new RegExp(CMD_START + String.raw`yarn\b`),
    suggest: "pnpm — dự án chỉ có pnpm-lock.yaml, yarn.lock bị cấm",
  },
  {
    pattern: new RegExp(CMD_START + String.raw`bun\s+(install|add|run)\b`),
    suggest: "pnpm — dự án khai báo packageManager: pnpm@10.9.0",
  },
];

/** Ngay trước dấu nháy là `bash -c`, `sh -c`, `pwsh -Command`… → nội dung nháy là một lệnh thật. */
const SHELL_COMMAND_FLAG =
  /(?:^|[\s;&|(])(?:(?:ba|z|da)?sh|pwsh|powershell)(?:\.exe)?\s+(?:-[a-z]+\s+)*-(?:[a-z]*c|command)\s*$/i;
const HEREDOC_OPERATOR = /^<<-?[ \t]*(?:'([^'\n]+)'|"([^"\n]+)"|\\?([A-Za-z_]\w*))/;

/** Vị trí `)` đóng của `$(` mở ở `open` (đếm lồng nhau), hoặc -1. */
function findClosingParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")" && (depth -= 1) === 0) return i;
  }
  return -1;
}

/** Bỏ thân heredoc đang chờ, bắt đầu từ `from` (ngay sau dấu xuống dòng); trả về vị trí sau dòng kết thúc. */
function skipHeredocBodies(text, from, tags) {
  let pos = from;
  for (const tag of tags) {
    while (pos < text.length) {
      const lineEnd = text.indexOf("\n", pos);
      const line = text.slice(pos, lineEnd === -1 ? text.length : lineEnd);
      pos = lineEnd === -1 ? text.length : lineEnd + 1;
      if (line.trim() === tag) break;
    }
  }
  return pos;
}

/**
 * Che nội dung trong dấu nháy, heredoc và here-string. Phần cần kiểm tiếp (lệnh con `$(…)` trong
 * nháy kép, đối số của `bash -c`) được nối vào cuối, sau dấu xuống dòng, để khớp như lệnh thường.
 */
export function maskNonCommands(text) {
  let out = "";
  const extra = [];
  const pendingHeredocs = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if ((char === "\\" || char === "`") && (next === '"' || next === "'")) {
      out += "_";
      i += 2;
    } else if (char === "\n" && pendingHeredocs.length > 0) {
      out += "\n";
      i = skipHeredocBodies(text, i + 1, pendingHeredocs.splice(0));
    } else if (char === "<" && next === "<" && text[i + 2] !== "<") {
      const match = HEREDOC_OPERATOR.exec(text.slice(i));
      if (match) {
        pendingHeredocs.push(match[1] ?? match[2] ?? match[3]);
        i += match[0].length;
      } else {
        out += char;
        i += 1;
      }
    } else if (
      char === "@" &&
      (next === "'" || next === '"') &&
      /^[ \t]*\r?\n/.test(text.slice(i + 2))
    ) {
      const close = text.slice(i + 2).search(next === "'" ? /\r?\n'@/ : /\r?\n"@/);
      out += `""`;
      i = close === -1 ? text.length : i + 2 + close + 3 + (text[i + 2 + close] === "\r" ? 1 : 0);
    } else if (char === "'") {
      const end = text.indexOf("'", i + 1);
      const stop = end === -1 ? text.length : end;
      if (SHELL_COMMAND_FLAG.test(out)) extra.push(text.slice(i + 1, stop));
      out += "''";
      i = stop + 1;
    } else if (char === '"') {
      let j = i + 1;
      let body = "";
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\" && j + 1 < text.length) {
          j += 2;
        } else if (text[j] === "$" && text[j + 1] === "(") {
          const close = findClosingParen(text, j + 1);
          const stop = close === -1 ? text.length : close;
          extra.push(text.slice(j + 2, stop));
          j = stop + 1;
        } else {
          body += text[j];
          j += 1;
        }
      }
      if (SHELL_COMMAND_FLAG.test(out)) extra.push(body);
      out += '""';
      i = j + 1;
    } else {
      out += char;
      i += 1;
    }
  }

  return extra.reduce((all, piece) => `${all}\n${maskNonCommands(piece)}`, out);
}

/** Gợi ý lệnh pnpm tương đương nếu `command` gọi npm/yarn/bun ở vị trí lệnh, ngược lại null. */
export function blockedSuggestion(command) {
  const masked = maskNonCommands(command);
  return BLOCKED.find((rule) => rule.pattern.test(masked))?.suggest ?? null;
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
    process.exit(0);
  }

  const command = input?.tool_input?.command;
  if (typeof command !== "string" || command.length === 0) process.exit(0);

  const suggest = blockedSuggestion(command);
  if (suggest === null) process.exit(0);

  process.stderr.write(
    `BỊ CHẶN: lệnh này dùng package manager sai.\n\n` +
      `  ${command}\n\n` +
      `Dự án dùng pnpm (packageManager: pnpm@10.9.0, có pnpm-lock.yaml, .npmrc node-linker=hoisted). ` +
      `npm/yarn/bun làm lệch lockfile và phiên bản native của Expo SDK.\n\n` +
      `Dùng thay thế: ${suggest}\n`,
  );
  process.exit(2);
}

if (isMainModule()) main();
