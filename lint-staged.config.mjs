import path from "node:path";

import { readManifest } from "./scripts/sync-lib.mjs";

/**
 * Files copied verbatim from web are written only by `pnpm sync:pull`; a formatter or `eslint --fix`
 * would make them differ from web, so staged verbatim targets are left out of every task.
 * lint-staged hands the tasks absolute paths; the manifest lists repo-relative POSIX ones.
 */
export function withoutVerbatimTargets(files, root) {
  const verbatim = new Set(
    readManifest(root)
      .files.filter((entry) => entry.mode === "verbatim")
      .map((entry) => entry.target),
  );
  return files.filter((file) => !verbatim.has(path.relative(root, file).split(path.sep).join("/")));
}

function runOnEditable(commands, root) {
  return (files) => {
    const editable = withoutVerbatimTargets(files, root);
    if (editable.length === 0) return [];
    const args = editable.map((file) => `"${file}"`).join(" ");
    return commands.map((command) => `${command} ${args}`);
  };
}

/** @returns {import("lint-staged").Configuration} */
export function createConfig(root) {
  return {
    "*.{ts,tsx}": runOnEditable(["eslint --fix --max-warnings 0", "prettier --write"], root),
    "*.{json,md,css,mjs}": runOnEditable(["prettier --write"], root),
  };
}

export default createConfig(import.meta.dirname);
