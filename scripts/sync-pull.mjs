#!/usr/bin/env node
// pnpm sync:pull <target…> — verbatim entries only: rewrites the file from the web repo's pinned
// ref and records the new blob.
import { openWeb, pullEntries, runCli } from "./sync-lib.mjs";

runCli("sync:pull", ({ root, env, args }) => {
  for (const { target, sourceBlob } of pullEntries(openWeb(root, env), args)) {
    console.log(`sync:pull: ${target} @ ${sourceBlob.slice(0, 7)}`);
  }
});
