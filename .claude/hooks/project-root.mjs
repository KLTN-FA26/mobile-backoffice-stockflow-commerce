/**
 * Gốc project cho các hook.
 *
 * `cwd` trong input của hook là thư mục hiện tại của phiên — đổi theo mỗi lệnh `cd`, nên tính đường dẫn
 * tương đối từ nó sẽ sai (file verbatim không còn bị chặn, git status nhìn sai thư mục). Claude Code đặt
 * `CLAUDE_PROJECT_DIR` cho mọi hook và giá trị này không đổi theo `cd` → ưu tiên nó.
 *
 * @param {unknown} input JSON hook đọc từ stdin
 * @param {Record<string, string | undefined>} [env]
 * @returns {string}
 */
export function projectRoot(input, env = process.env) {
  const fromEnv = env.CLAUDE_PROJECT_DIR;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  const fromInput =
    typeof input === "object" && input !== null && "cwd" in input ? input.cwd : undefined;
  if (typeof fromInput === "string" && fromInput.length > 0) return fromInput;
  return process.cwd();
}
