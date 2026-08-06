"use strict";

const path = require("node:path");
const { spawn } = require("node:child_process");
const readline = require("node:readline");

const root = __dirname;
const node = path.join(root, "runtime", "node-v22.17.1-win-x64", "node.exe");
const child = spawn(node, [path.join(root, "sidecar-lifecycle-probe.cjs")], { cwd: root, stdio: ["pipe", "pipe", "inherit"], windowsHide: true });
const startedAt = Date.now();
let acknowledged = false, readyPid = 0, cycles = 0, forced = false;
const output = readline.createInterface({ input: child.stdout });
const requestCycle = id => child.stdin.write(`${JSON.stringify({ type: "cycle", id })}\n`);
output.on("line", line => {
  const message = JSON.parse(line);
  if (message.type === "ready") { readyPid = message.pid; requestCycle(1); }
  if (message.type === "cycle-ack") {
    cycles += 1;
    if (cycles === 25) child.stdin.write(`${JSON.stringify({ type: "shutdown" })}\n`);
    else requestCycle(cycles + 1);
  }
  if (message.type === "shutdown-ack") {
    acknowledged = message.pid === child.pid && message.peers === 0;
    // Keep the IPC pipe open through the bounded grace period. The production
    // parent owns this one exact child and closes it only after acknowledgement.
  }
});
const grace = setTimeout(() => {
  if (child.exitCode === null) { forced = true; child.kill(); }
}, 3000);
child.once("exit", (code, signal) => {
  clearTimeout(grace);
  output.close();
  process.stdout.write(`${JSON.stringify({ parentPid: process.pid, childPid: child.pid, readyPid, cycles, acknowledged, forced,
    code, signal, elapsedMs: Date.now() - startedAt, exactPidMatched: readyPid === child.pid })}\n`);
});
