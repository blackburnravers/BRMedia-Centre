import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readMixxxStartupStatus } from "./mixxxBridge";

const root = path.resolve(__dirname, "..", "..");
const startup = fs.readFileSync(path.join(root, "tools", "windows", "mixxx-startup.ps1"), "utf8");
const installer = fs.readFileSync(path.join(root, "tools", "windows", "install-mixxx-startup.ps1"), "utf8");
const disable = fs.readFileSync(path.join(root, "tools", "windows", "disable-mixxx-startup.ps1"), "utf8");
const frontend = fs.readFileSync(path.join(root, "server", "public", "dj-mixer", "components", "mixxx-backend-m3.js"), "utf8");
const runner = fs.readFileSync(path.join(root, "tools", "windows", "brmedia-runner.ps1"), "utf8");

test("M16 startup handles disabled, existing, missing, launch, and bounded health states", () => {
  assert.match(startup, /if \(!\$Enabled\)/);
  assert.match(startup, /Test-MixxxProcess/);
  assert.match(startup, /process already running; no launch attempted/);
  assert.match(startup, /Find-MixxxExecutable/);
  assert.match(startup, /executable-missing/);
  assert.match(startup, /Start-Process -FilePath \$resolved -PassThru/);
  assert.match(startup, /Write-MixxxState "already-running"/);
  assert.match(startup, /launch-failed/);
  assert.match(startup, /process-running-bridge-unavailable/);
  assert.match(startup, /for \(\$attempt = 1; \$attempt -le \$RetryCount; \$attempt\+\+\)/);
  assert.match(startup, /Start-Sleep -Seconds \$DelaySeconds/);
  assert.match(startup, /connected/);
});

test("M16 executable discovery is ordered and avoids a user-specific hard-coded path", () => {
  const explicit = startup.indexOf("$Executable");
  const environment = startup.indexOf("$env:BRMEDIA_MIXXX_EXE");
  const registry = startup.indexOf("App Paths\\mixxx.exe");
  const programFiles = startup.indexOf("$env:ProgramFiles");
  assert.ok(explicit >= 0 && environment > explicit && registry > environment && programFiles > registry);
  assert.doesNotMatch(startup, /Rosegrove|Users\\/i);
});

test("M16 registration is idempotent, interactive, single-instance, and independent", () => {
  assert.match(installer, /Register-ScheduledTask[\s\S]*-Force/);
  assert.match(installer, /-AtLogOn/);
  assert.match(installer, /-LogonType Interactive/);
  assert.match(installer, /-RunLevel Limited/);
  assert.match(installer, /-MultipleInstances IgnoreNew/);
  assert.doesNotMatch(installer, /RestartCount|Start-ScheduledTask/);
  assert.match(disable, /Disable-ScheduledTask/);
  assert.match(disable, /Unregister-ScheduledTask/);
  assert.match(installer, /if \(\$status\.state -eq "disabled"\)/);
  assert.doesNotMatch(disable, /Stop-Process|mixxx\.exe/);
  assert.doesNotMatch(runner, /mixxx-startup|Start-Process.*mixxx/i);
});

test("M16 status reader redacts paths and reports truthful final state", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m16-status-"));
  fs.writeFileSync(path.join(directory, "mixxx-startup-status.json"), `\uFEFF${JSON.stringify({
    state: "process-running-bridge-unavailable",
    updatedAt: "2026-07-29T10:00:00.000Z",
    retryCount: 12,
    processRunning: true,
    bridgeHealthy: false,
    executable: "C:\\Secret\\Mixxx\\mixxx.exe",
  })}`);
  const status = readMixxxStartupStatus(directory);
  assert.equal(status.state, "process-running-bridge-unavailable");
  assert.equal(status.retryCount, 12);
  assert.equal(status.executable, "mixxx.exe");
  assert.equal(JSON.stringify(status).includes("Secret"), false);
  assert.equal(readMixxxStartupStatus(path.join(directory, "missing")).state, "unknown");
});

test("M16 frontend uses one bounded reconnect generation and preserves native fallback", () => {
  assert.match(frontend, /reconnectGeneration/);
  assert.match(frontend, /if \(reconnectTimer \|\| effectiveBackend !== "mixxx"\) return/);
  assert.match(frontend, /reconnectAttempt >= 6/);
  assert.match(frontend, /Math\.min\(8000, 500 \* \(2 \*\*/);
  assert.match(frontend, /cancelReconnect\(\)/);
  assert.match(frontend, /native-active-reconnect-blocked/);
  assert.match(frontend, /native-fallback/);
  assert.match(frontend, /setExternalAuthority\?\.\(false\)/);
  assert.match(frontend, /setTimeout\(monitor, 2000\)/);
  assert.match(frontend, /payload\?\.bridge\?\.connected !== true/);
  assert.match(frontend, /payload\?\.bridge\?\.protocolCompatible !== true/);
  assert.match(frontend, /payload\?\.bridge\?\.heartbeatHealthy !== true/);
  assert.doesNotMatch(frontend.slice(frontend.indexOf("function beginReconnect"), frontend.indexOf("function schedulePolling")), /transport|\/play|\/cue/);
});

test("M16 status health actively refreshes the bridge before reporting", () => {
  const bridgeSource = fs.readFileSync(path.join(root, "server", "src", "mixxxBridge.ts"), "utf8");
  assert.match(bridgeSource, /url\.pathname === `\$\{root\}\/status`[\s\S]*bridge: bridge\.refresh\(\)/);
  assert.match(bridgeSource, /status\.connected && status\.protocolCompatible && status\.heartbeatHealthy/);
});
