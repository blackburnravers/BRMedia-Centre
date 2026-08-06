import { execFileSync } from "node:child_process";
import path from "node:path";

export type MixxxTaskState = "missing" | "disabled" | "waiting-for-logon" | "ready" | "running" | "unknown";

export interface MixxxTaskStatus {
  state: MixxxTaskState;
  lastRunAt: string | null;
  lastResult: number | null;
  lastRunOutcome: "never-run" | "succeeded" | "failed" | "running" | "unknown";
  missedRuns: number;
  delaySeconds: number | null;
  retryCount: number | null;
  retryDelaySeconds: number | null;
  executable: string | null;
}

const fallback: MixxxTaskStatus = {
  state: "unknown", lastRunAt: null, lastResult: null, lastRunOutcome: "unknown",
  missedRuns: 0, delaySeconds: null, retryCount: null, retryDelaySeconds: null, executable: null,
};
let cache: { at: number; value: MixxxTaskStatus } | null = null;

function numberArgument(args: string, name: string) {
  const match = args.match(new RegExp(`(?:^|\\s)-${name}\\s+(\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

export function parseMixxxTaskStatus(value: Record<string, unknown>): MixxxTaskStatus {
  if (value.missing === true) return { ...fallback, state: "missing", lastRunOutcome: "never-run" };
  const rawState = String(value.state || "").toLowerCase();
  const enabled = value.enabled !== false;
  const lastResult = Number.isInteger(value.lastResult) ? Number(value.lastResult) : null;
  const rawLastRun = typeof value.lastRunAt === "string" ? value.lastRunAt : "";
  const neverRun = lastResult === 267011;
  const lastRunAt = !neverRun && rawLastRun ? rawLastRun : null;
  const state: MixxxTaskState = !enabled ? "disabled"
    : rawState === "running" ? "running"
      : rawState === "ready" && neverRun ? "waiting-for-logon"
        : rawState === "ready" ? "ready" : "unknown";
  const outcome = state === "running" ? "running"
    : neverRun ? "never-run"
      : lastResult === 0 ? "succeeded"
        : lastResult === null ? "unknown" : "failed";
  const args = typeof value.arguments === "string" ? value.arguments : "";
  const executableMatch = args.match(/(?:^|\s)-Executable\s+"([^"]+)"/i);
  return {
    state, lastRunAt, lastResult, lastRunOutcome: outcome,
    missedRuns: Number.isInteger(value.missedRuns) ? Math.max(0, Number(value.missedRuns)) : 0,
    delaySeconds: numberArgument(args, "DelaySeconds"),
    retryCount: numberArgument(args, "RetryCount"),
    retryDelaySeconds: numberArgument(args, "RetryDelaySeconds"),
    executable: executableMatch ? path.win32.basename(executableMatch[1]) : "automatic-discovery",
  };
}

export function readMixxxTaskStatus(now = Date.now()): MixxxTaskStatus {
  if (process.platform !== "win32") return fallback;
  if (cache && now - cache.at < 10_000) return cache.value;
  const command = [
    "$t=Get-ScheduledTask -ErrorAction SilentlyContinue|Where-Object{$_.TaskPath -eq '\\' -and $_.TaskName -eq 'BRMedia Mixxx Startup'}|Select-Object -First 1;",
    "if(!$t){[ordered]@{missing=$true}|ConvertTo-Json -Compress;exit};",
    "$i=Get-ScheduledTaskInfo -TaskName 'BRMedia Mixxx Startup';",
    "[ordered]@{state=[string]$t.State;enabled=$t.State -ne 'Disabled';",
    "lastRunAt=$i.LastRunTime.ToString('o');lastResult=$i.LastTaskResult;",
    "missedRuns=$i.NumberOfMissedRuns;arguments=$t.Actions[0].Arguments}|ConvertTo-Json -Compress",
  ].join("");
  try {
    const executable = `${process.env.SystemRoot || "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    const text = execFileSync(executable, ["-NoProfile", "-NonInteractive", "-Command", command],
      { encoding: "utf8", timeout: 5000, windowsHide: true }).replace(/^\uFEFF/, "").trim();
    const value = parseMixxxTaskStatus(JSON.parse(text));
    cache = { at: now, value };
    return value;
  } catch {
    cache = { at: now, value: fallback };
    return fallback;
  }
}
