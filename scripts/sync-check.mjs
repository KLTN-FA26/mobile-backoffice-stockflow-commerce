#!/usr/bin/env node
// pnpm sync:check — fails when a ported file drifted from the web repo (see sync-lib.mjs).
import { checkEntries, formatProblems, openWeb, runCli } from "./sync-lib.mjs";

runCli("sync:check", ({ root, env }) => {
  const { manifest, repo } = openWeb(root, env);
  const found = checkEntries(root, manifest, repo);
  const count = manifest.files.length;
  if (found.length === 0) {
    console.log(`port-manifest: ${count} file, không có lệch`);
    return;
  }
  for (const line of formatProblems(found)) console.error(line);
  console.error(`port-manifest: ${count} file, ${found.length} lệch`);
  process.exitCode = 1;
});
