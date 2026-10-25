#!/usr/bin/env node
// pnpm sync:ack <target…> — adapted entries only: after porting a web change by hand, records the
// current web blob so sync:check stops flagging it. The target file is not touched.
import { ackEntries, openWeb, runCli } from "./sync-lib.mjs";

runCli("sync:ack", ({ root, env, args }) => {
  for (const { target, sourceBlob } of ackEntries(openWeb(root, env), args)) {
    console.log(`sync:ack: ${target} @ ${sourceBlob.slice(0, 7)}`);
  }
});
