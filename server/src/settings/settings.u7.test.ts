import assert from "node:assert/strict";
import test from "node:test";
import { buildDiagnosticsReport, diskHealthState, isDiagnosticsSection } from "./diagnostics";
import { DEFAULT_SETTINGS } from "./defaults";
import { validateU7ModuleUpdate } from "./u7Validation";

const missingToolRunner = async () => ({
  code: null,
  stdout: "",
  stderr: "Executable is unavailable.",
  timedOut: false,
});

test("one failing check does not fail the complete report", async () => {
  const report = await buildDiagnosticsReport({
    runner: async () => { throw new Error("simulated dependency failure"); },
    fetcher: async () => { throw new Error("simulated service failure"); },
  });
  const sections = Object.entries(report.sections);
  assert.equal(sections.length, 10);
  assert.ok(sections.some(([, section]) => section.state !== "healthy"));
  assert.ok(sections.some(([, section]) => section.name === "server"));
});

test("missing tools and unreachable qBittorrent are structured, not fatal", async () => {
  const report = await buildDiagnosticsReport({
    runner: missingToolRunner,
    fetcher: async () => { throw new Error("connection refused"); },
  });
  const tools = report.sections.find((section) => section.name === "tools");
  assert.ok(tools);
  assert.ok(["warning", "unavailable", "degraded"].includes(tools.state));
  assert.doesNotThrow(() => JSON.stringify(report));
});

test("diagnostics loading exposes settings-store health", async () => {
  const report = await buildDiagnosticsReport({
    runner: missingToolRunner,
    fetcher: async () => { throw new Error("offline"); },
  });
  assert.ok(report.sections.some((section) => section.name === "settingsStore"));
  assert.equal(DEFAULT_SETTINGS.schemaVersion, 1);
});

test("disk thresholds distinguish healthy, warning and error states", () => {
  assert.equal(diskHealthState(100, 30, 15, 5), "healthy");
  assert.equal(diskHealthState(100, 10, 15, 5), "warning");
  assert.equal(diskHealthState(100, 4, 15, 5), "error");
});

test("diagnostics preferences enforce safe refresh and disk thresholds", () => {
  const tooFast = validateU7ModuleUpdate(
    "diagnostics",
    { automaticRefreshSeconds: 30 },
    { ...DEFAULT_SETTINGS, diagnostics: { ...DEFAULT_SETTINGS.diagnostics, automaticRefreshSeconds: 30 } },
  );
  assert.ok(tooFast.some((error) => error.path === "diagnostics.automaticRefreshSeconds"));

  const crossed = validateU7ModuleUpdate(
    "diagnostics",
    { storageCriticalFreePercent: 20 },
    {
      ...DEFAULT_SETTINGS,
      diagnostics: {
        ...DEFAULT_SETTINGS.diagnostics,
        storageWarningFreePercent: 15,
        storageCriticalFreePercent: 20,
      },
    },
  );
  assert.ok(crossed.some((error) => error.path === "diagnostics.storageCriticalFreePercent"));
});

test("diagnostics section names reject arbitrary path and command input", () => {
  assert.equal(isDiagnosticsSection("server"), true);
  assert.equal(isDiagnosticsSection("../../server"), false);
  assert.equal(isDiagnosticsSection("server;calc.exe"), false);
  assert.equal(isDiagnosticsSection("not-a-section"), false);
});

test("planned DJ integrations are reported without activating them", async () => {
  const report = await buildDiagnosticsReport({
    runner: missingToolRunner,
    fetcher: async () => { throw new Error("offline"); },
  });
  const serialized = JSON.stringify(report.sections.find((section) => section.name === "dj"));
  assert.match(serialized, /Mixxx/i);
  assert.match(serialized, /planned|not implemented|not connected/i);
  assert.match(serialized, /iPhone/i);
});