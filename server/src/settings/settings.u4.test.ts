import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SETTINGS_METADATA } from "./metadata";
import {
  validateLibrarySources,
  validateLocalSettingsPath,
} from "./pathValidation";
import { SettingsService } from "./service";
import { SettingsStore } from "./store";
import {
  checkTool,
  getSettingsSystemHealth,
  getStorageHealth,
  ToolRunner,
} from "./systemHealth";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-settings-u4-"));
  const settingsPath = path.join(root, "settings", "brmedia-settings.json");
  const store = new SettingsStore({ settingsPath, backupPath: `${settingsPath}.lkg` });
  return { root, settingsPath, store, service: new SettingsService(store) };
}

function digest(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

test("valid Windows paths are accepted without creating them", () => {
  const result = validateLocalSettingsPath("D:\\BRMedia\\Audio", { requireExisting: false });
  assert.equal(result.valid, true);
  assert.equal(result.normalizedPath, "D:\\BRMedia\\Audio");
  assert.equal(result.exists, false);
});

test("traversal and unsupported network paths are rejected", () => {
  assert.equal(validateLocalSettingsPath("C:\\Media\\..\\Windows").code, "TRAVERSAL");
  assert.equal(validateLocalSettingsPath("\\\\server\\share").code, "NETWORK_PATH");
});

test("missing paths return structured status", () => {
  const result = validateLocalSettingsPath("Z:\\BRMedia\\DefinitelyMissing");
  assert.equal(result.valid, false);
  assert.equal(result.code, "MISSING");
  assert.equal(result.exists, false);
  assert.equal(typeof result.message, "string");
});

test("duplicate sources and invalid source types are rejected", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-source-"));
  try {
    const result = validateLibrarySources([
      { id: "one", label: "One", path: directory, type: "audio", enabled: true, includeSubfolders: true },
      { id: "two", label: "Two", path: directory, type: "documents", enabled: true, includeSubfolders: true },
    ], []);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((item) => item.code === "DUPLICATE_SOURCE"));
    assert.ok(result.errors.some((item) => item.code === "INVALID_SOURCE_TYPE"));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("tool checks time out safely and redact executable paths", async () => {
  const runner: ToolRunner = async () => ({
    code: null, stdout: "", stderr: "C:\\Private\\secret.exe failed", timedOut: true,
  });
  const result = await checkTool({
    name: "Private Tool",
    command: "C:\\Private\\secret.exe",
    args: ["--version"],
  }, 5, runner);
  assert.equal(result.available, false);
  assert.equal(result.timedOut, true);
  assert.equal(result.executable, "secret.exe");
  assert.equal(JSON.stringify(result).includes("C:\\Private"), false);
});

test("missing FFmpeg and Demucs are unavailable rather than throwing", async () => {
  const runner: ToolRunner = async () => ({
    code: null, stdout: "", stderr: "not found", timedOut: false,
  });
  const ffmpeg = await checkTool({ name: "FFmpeg", command: "missing-ffmpeg", args: ["-version"] }, 10, runner);
  const demucs = await checkTool({ name: "Demucs", command: "missing-demucs", args: ["--help"] }, 10, runner);
  assert.equal(ffmpeg.available, false);
  assert.equal(demucs.available, false);
});

test("storage health handles inaccessible paths safely", () => {
  const result = getStorageHealth("missing", "Missing", "Z:\\NoAccess\\Missing");
  assert.equal(result.available, false);
  assert.equal(result.totalBytes, null);
  assert.equal(typeof result.message, "string");
});

test("invalid updates do not alter the settings file", async () => {
  const current = fixture();
  try {
    await current.service.updateModule("server", { port: 8788 });
    const before = fs.readFileSync(current.settingsPath);
    const invalid = await current.service.updateModule("server", { publicBaseUrl: "file:///private" });
    assert.equal(invalid.ok, false);
    assert.deepEqual(fs.readFileSync(current.settingsPath), before);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("valid Server and Library Sources updates persist and reload", async () => {
  const current = fixture();
  const libraryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-library-"));
  try {
    assert.equal((await current.service.updateModule("server", {
      host: "127.0.0.1",
      port: 8790,
      publicBaseUrl: "https://media.example.test",
    })).ok, true);
    assert.equal((await current.service.updateModule("library", {
      audioRoots: [libraryDirectory],
      sources: [{
        id: "test-audio",
        label: "Test audio",
        path: libraryDirectory,
        type: "audio",
        enabled: true,
        includeSubfolders: true,
      }],
    })).ok, true);
    const reloaded = new SettingsStore({
      settingsPath: current.settingsPath,
      backupPath: `${current.settingsPath}.lkg`,
    }).read().settings;
    assert.equal(reloaded.server.port, 8790);
    assert.equal(reloaded.library.sources[0].type, "audio");
  } finally {
    fs.rmSync(libraryDirectory, { recursive: true, force: true });
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("health is read-only and performs no automatic rescan or restart", async () => {
  const watched = [
    "server/data/library-sources.json",
    "server/data/audio-library-manifest.json",
    "server/data/video-library-manifest.json",
    "server/data/player-runtime-state.json",
  ].map((file) => path.resolve(process.cwd(), file));
  const before = new Map(watched.map((file) => [file, digest(file)]));
  const current = fixture();
  const runner: ToolRunner = async () => ({ code: null, stdout: "", stderr: "missing", timedOut: false });
  try {
    const health = await getSettingsSystemHealth({
      force: true,
      store: current.store,
      runner,
      timeoutMs: 5,
    });
    assert.ok(health.notes.some((note) => note.includes("No library rescan")));
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
  watched.forEach((file) => assert.equal(digest(file), before.get(file), `${file} changed`));
});

test("browser-safe output continues to redact sensitive settings", () => {
  const current = fixture();
  const metadata = SETTINGS_METADATA["server.publicBaseUrl"];
  const original = metadata.sensitive;
  try {
    metadata.sensitive = true;
    assert.equal(current.service.readModule("server", true).data.publicBaseUrl, "[REDACTED]");
  } finally {
    metadata.sensitive = original;
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});
