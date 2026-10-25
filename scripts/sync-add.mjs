#!/usr/bin/env node
// pnpm sync:add <source…> [--target <t>] [--mode verbatim|adapted] [--note "<text>"]
// Copies files from the web repo's pinned ref and records them in port-manifest.json.
import { addEntries, openWeb, parseAddArgs, runCli } from "./sync-lib.mjs";

runCli("sync:add", ({ root, env, args }) => {
  const request = parseAddArgs(args);
  for (const { target, mode, sourceBlob } of addEntries(openWeb(root, env), request)) {
    console.log(`sync:add: ${target} (${mode}) @ ${sourceBlob.slice(0, 7)}`);
  }
});
