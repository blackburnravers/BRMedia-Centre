import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./defaults";
import { SETTINGS_METADATA } from "./metadata";
import { validateSettings } from "./validation";

function copyDefaults(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Record<string, unknown>;
}

function objectAt(root: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = root[key];
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("default settings conform to the schema", () => {
  const result = validateSettings(DEFAULT_SETTINGS);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.unknownSettings, []);
});

test("invalid enum values are rejected", () => {
  const candidate = copyDefaults();
  objectAt(objectAt(candidate, "dj"), "engine").backend = "not-an-engine";

  const result = validateSettings(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) =>
    error.path === "dj.engine.backend" && error.code === "INVALID_ENUM"
  ));
});

test("numeric limits are enforced", () => {
  const candidate = copyDefaults();
  objectAt(candidate, "server").port = 70000;
  objectAt(objectAt(candidate, "dj"), "mixer").crossfaderDefaultPosition = -1;

  const result = validateSettings(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) =>
    error.path === "server.port" && error.code === "ABOVE_MAXIMUM"
  ));
  assert.ok(result.errors.some((error) =>
    error.path === "dj.mixer.crossfaderDefaultPosition" && error.code === "BELOW_MINIMUM"
  ));
});

test("unknown fields are preserved and reported", () => {
  const candidate = copyDefaults();
  const dj = objectAt(candidate, "dj");
  dj.futureController = { enabled: true, model: "future" };

  const result = validateSettings(candidate);
  assert.equal(result.valid, true);
  assert.deepEqual(
    objectAt(objectAt(result.value, "dj"), "futureController"),
    { enabled: true, model: "future" },
  );
  assert.deepEqual(
    objectAt(objectAt(result.unknown, "dj"), "futureController"),
    { enabled: true, model: "future" },
  );
  assert.ok(result.unknownSettings.some((entry) => entry.path === "dj.futureController"));
});

test("DJ Mixer defaults contain every required namespace", () => {
  const requiredSections = [
    "studio", "engine", "decks", "mixer", "waveform", "grid", "analysis",
    "sync", "quantize", "loops", "beatJump", "fx", "stems", "recording",
    "recordingArchive", "audioRouting", "performanceUi",
  ];

  assert.deepEqual(Object.keys(DEFAULT_SETTINGS.dj), requiredSections);
  requiredSections.forEach((section) => {
    assert.ok(Object.keys(DEFAULT_SETTINGS.dj[section as keyof typeof DEFAULT_SETTINGS.dj]).length > 0);
  });
});

test("BRMedia Native remains the default and Mixxx is allowed", () => {
  assert.equal(DEFAULT_SETTINGS.dj.engine.backend, "brmedia-native");
  assert.deepEqual(
    SETTINGS_METADATA["dj.engine.backend"].allowedValues,
    ["brmedia-native", "mixxx"],
  );

  const candidate = copyDefaults();
  objectAt(objectAt(candidate, "dj"), "engine").backend = "mixxx";
  assert.equal(validateSettings(candidate).valid, true);
});

test("U1 validation is pure and does not alter its input", () => {
  const candidate = copyDefaults();
  const before = JSON.stringify(candidate);
  validateSettings(candidate);
  assert.equal(JSON.stringify(candidate), before);
});
test("validation does not alter existing settings or configuration files", () => {
  const existingSettingsFiles = [
    "server/src/config/defaults.json",
    "server/data/library-sources.json",
    "server/data/torrent-state.json",
    "server/data/dj-studio-state.json",
  ].map((file) => path.resolve(process.cwd(), file));

  const digest = (file: string): string =>
    createHash("sha256").update(fs.readFileSync(file)).digest("hex");

  const before = new Map(existingSettingsFiles.map((file) => [file, digest(file)]));
  validateSettings(copyDefaults());

  existingSettingsFiles.forEach((file) => {
    assert.equal(digest(file), before.get(file), `${file} was altered`);
  });
});