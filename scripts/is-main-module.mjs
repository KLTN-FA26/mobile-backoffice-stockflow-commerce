// Shared by the scripts that are both a CLI and a module a test imports: "is this file the script node was started
// with?". Copy of the logic in .claude/hooks (those files cannot be imported from here).
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * True when `moduleUrl` (pass `import.meta.url`) is the script node was started with. Both sides go through
 * `realpathSync`: node resolves a symlink or junction for `import.meta.url` but leaves `process.argv[1]` as typed,
 * so comparing URLs would make a CLI started through a link do nothing and exit 0. A path that cannot be resolved
 * counts as "running" so a CLI fails loudly instead of silently doing nothing.
 * @param {string} moduleUrl
 * @param {string | undefined} [argv1]
 */
export function isMainModule(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return true;
  }
}
