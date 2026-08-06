import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./defaults";
import { SETTINGS_METADATA } from "./metadata";
import { SettingsService, redactSensitiveSettings } from "./service";
import { SettingsStore } from "./store";

function tempStore(): { root: string; store: SettingsStore; settingsPath: string; backupPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-settings-u2-"));
  const settingsPath = path.join(root, "settings", "brmedia-settings.json");
  const backupPath = `${settingsPath}.lkg`;
  return {
    root,
    settingsPath,
    backupPath,
    store: new SettingsStore({
      settingsPath,
      backupPath,
      now: () => new Date("2026-07-27T12:00:00.000Z"),
    }),
  };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

test("missing settings return defaults without writing", () => {
  const fixture = tempStore();
  try {
    const snapshot = fixture.store.read();
    assert.deepEqual(snapshot.settings, DEFAULT_SETTINGS);
    assert.equal(snapshot.health.state, "defaults");
    assert.equal(fs.existsSync(fixture.settingsPath), false);
    assert.equal(fs.existsSync(path.dirname(fixture.settingsPath)), false);
  } finally {
    cleanup(fixture.root);
  }
});

test("first valid module update creates, persists, and reloads settings", async () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    const result = await service.updateModule("notifications", { historyLimit: 75 });
    assert.equal(result.ok, true);
    assert.equal(fs.existsSync(fixture.settingsPath), true);
    assert.equal(fixture.store.read().settings.notifications.historyLimit, 75);
    assert.equal(new SettingsStore({
      settingsPath: fixture.settingsPath,
      backupPath: fixture.backupPath,
    }).read().settings.notifications.historyLimit, 75);
  } finally {
    cleanup(fixture.root);
  }
});

test("invalid enum and numeric updates leave the file unchanged", async () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    await service.updateModule("notifications", { historyLimit: 75 });
    const before = fs.readFileSync(fixture.settingsPath);
    const enumResult = await service.updateModule("dj", { engine: { backend: "invalid" } });
    const numberResult = await service.updateModule("server", { port: 70000 });
    assert.equal(enumResult.ok, false);
    assert.equal(numberResult.ok, false);
    assert.deepEqual(fs.readFileSync(fixture.settingsPath), before);
  } finally {
    cleanup(fixture.root);
  }
});

test("unknown fields are preserved across updates", async () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    await service.updateModule("dj", { futureController: { enabled: true } });
    await service.updateModule("notifications", { historyLimit: 80 });
    const parsed = JSON.parse(fs.readFileSync(fixture.settingsPath, "utf8")) as {
      dj: { futureController: { enabled: boolean } };
    };
    assert.equal(parsed.dj.futureController.enabled, true);
    assert.ok(fixture.store.read().unknownSettings.some((item) => item.path === "dj.futureController"));
  } finally {
    cleanup(fixture.root);
  }
});

test("concurrent module updates are serialized without lost changes", async () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    await Promise.all([
      service.updateModule("notifications", { historyLimit: 81 }),
      service.updateModule("backup", { retentionCount: 7 }),
      service.updateModule("dj", { engine: { backend: "mixxx" } }),
    ]);
    const saved = fixture.store.read().settings;
    assert.equal(saved.notifications.historyLimit, 81);
    assert.equal(saved.backup.retentionCount, 7);
    assert.equal(saved.dj.engine.backend, "mixxx");
    assert.equal(saved.metadata.revision, 3);
  } finally {
    cleanup(fixture.root);
  }
});

test("atomic replacement removes temporary files and retains last-known-good", async () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    await service.updateModule("notifications", { historyLimit: 61 });
    const first = fs.readFileSync(fixture.settingsPath, "utf8");
    await service.updateModule("notifications", { historyLimit: 62 });
    assert.equal(JSON.parse(fs.readFileSync(fixture.settingsPath, "utf8")).notifications.historyLimit, 62);
    assert.equal(fs.readFileSync(fixture.backupPath, "utf8"), first);
    assert.deepEqual(
      fs.readdirSync(path.dirname(fixture.settingsPath)).filter((name) => name.endsWith(".tmp")),
      [],
    );
  } finally {
    cleanup(fixture.root);
  }
});

test("corrupt JSON is preserved and backup recovery is read-only", async () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    await service.updateModule("notifications", { historyLimit: 63 });
    const backupBefore = fs.readFileSync(fixture.backupPath);
    fs.writeFileSync(fixture.settingsPath, "{ broken json", "utf8");
    const corruptBefore = fs.readFileSync(fixture.settingsPath);
    const recovered = fixture.store.read();
    assert.equal(recovered.health.state, "recovered-from-backup");
    assert.equal(recovered.settings.notifications.historyLimit, 63);
    assert.deepEqual(fs.readFileSync(fixture.settingsPath), corruptBefore);
    assert.deepEqual(fs.readFileSync(fixture.backupPath), backupBefore);
    assert.equal((await service.updateModule("notifications", { historyLimit: 64 })).ok, false);
    assert.deepEqual(fs.readFileSync(fixture.settingsPath), corruptBefore);
  } finally {
    cleanup(fixture.root);
  }
});

test("corrupt JSON without backup returns defaults without overwriting it", () => {
  const fixture = tempStore();
  try {
    fs.mkdirSync(path.dirname(fixture.settingsPath), { recursive: true });
    fs.writeFileSync(fixture.settingsPath, "{ invalid", "utf8");
    const before = fs.readFileSync(fixture.settingsPath);
    const snapshot = fixture.store.read();
    assert.equal(snapshot.health.state, "invalid");
    assert.equal(snapshot.settings.dj.engine.backend, "brmedia-native");
    assert.deepEqual(fs.readFileSync(fixture.settingsPath), before);
  } finally {
    cleanup(fixture.root);
  }
});

test("sensitive metadata is redacted from browser-safe output", () => {
  const metadata = SETTINGS_METADATA["server.host"];
  const original = metadata.sensitive;
  try {
    metadata.sensitive = true;
    const redacted = redactSensitiveSettings(DEFAULT_SETTINGS);
    assert.equal(redacted.server.host, "[REDACTED]");
    assert.equal(DEFAULT_SETTINGS.server.host, "0.0.0.0");
  } finally {
    metadata.sensitive = original;
  }
});

test("BRMedia Native remains default and future Mixxx remains accepted", () => {
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    assert.equal(service.readModule("dj").data.engine.backend, "brmedia-native");
    assert.equal(service.validateModuleUpdate("dj", { engine: { backend: "mixxx" } }).valid, true);
  } finally {
    cleanup(fixture.root);
  }
});

test("existing BRMedia data and configuration JSON remain unchanged", () => {
  const files = [
    "server/src/config/defaults.json",
    "server/data/library-sources.json",
    "server/data/torrent-state.json",
    "server/data/dj-studio-state.json",
  ].map((file) => path.resolve(process.cwd(), file));
  const digest = (file: string): string =>
    createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const before = new Map(files.map((file) => [file, digest(file)]));
  const fixture = tempStore();
  try {
    const service = new SettingsService(fixture.store);
    service.readAll();
    service.validateModuleUpdate("server", { port: 8788 });
  } finally {
    cleanup(fixture.root);
  }
  files.forEach((file) => assert.equal(digest(file), before.get(file), `${file} was altered`));
});
