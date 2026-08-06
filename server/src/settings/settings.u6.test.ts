import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS, DJ_BEAT_JUMP_SIZES, DJ_LOOP_LENGTHS } from "./defaults";
import {
  adaptLegacyDjSettings,
  getDjApplyMode,
  getDjCompatibility,
} from "./djAdapters";
import { SettingsService } from "./service";
import { SettingsStore } from "./store";
import { validateSettings } from "./validation";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-settings-u6-"));
  const settingsPath = path.join(root, "settings", "brmedia-settings.json");
  const store = new SettingsStore({ settingsPath, backupPath: `${settingsPath}.lkg` });
  return { root, settingsPath, service: new SettingsService(store) };
}

function digest(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const DJ_DATA_FILES = [
  "server/data/dj-prep-cache.json",
  "server/data/dj-recordings.json",
  "server/data/dj-studio-state.json",
  "server/data/dj-recordings/recordings-manifest.json",
].filter((file) => fs.existsSync(file));

test("BRMedia Native remains default; Mixxx stays schema-valid but cannot activate", async () => {
  assert.equal(DEFAULT_SETTINGS.dj.engine.backend, "brmedia-native");
  const future = structuredClone(DEFAULT_SETTINGS);
  future.dj.engine.backend = "mixxx";
  assert.equal(validateSettings(future).valid, true);

  const current = fixture();
  try {
    const result = await current.service.updateModule("dj", { engine: { backend: "mixxx" } });
    assert.equal(result.ok, true);
    assert.equal(current.service.readModule("dj").data.engine.backend, "mixxx");
    assert.equal(getDjApplyMode("dj.engine.backend"), "page-reload-required");
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("opening DJ Settings performs no migration, write or live-state mutation", () => {
  const current = fixture();
  const deckState = { playing: true, trackId: "active-d1", sync: true, gain: 0.82 };
  const mixerState = { crossfader: 31, master: 0.91, fxWet: 0.42 };
  const deckBefore = structuredClone(deckState);
  const mixerBefore = structuredClone(mixerState);
  try {
    current.service.readModule("dj", true);
    getDjCompatibility();
    assert.equal(fs.existsSync(current.settingsPath), false);
    assert.deepEqual(deckState, deckBefore);
    assert.deepEqual(mixerState, mixerBefore);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("valid DJ updates persist, reload and return structured application modes", async () => {
  const current = fixture();
  try {
    const result = await current.service.updateModule("dj", {
      mixer: { doubleTapReset: false },
      waveform: { showMinuteMarkers: false },
      sync: { enabledByDefault: true },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.requirements.applicationModes["next-session"]?.includes("dj.mixer.doubleTapReset"));
    }
    const reloaded = new SettingsService(new SettingsStore({
      settingsPath: current.settingsPath,
      backupPath: `${current.settingsPath}.lkg`,
    }));
    assert.equal(reloaded.readModule("dj").data.mixer.doubleTapReset, false);
    assert.equal(reloaded.readModule("dj").data.waveform.showMinuteMarkers, false);
    assert.equal(reloaded.readModule("dj").data.sync.enabledByDefault, true);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("invalid DJ values leave the store unchanged", async () => {
  const current = fixture();
  try {
    await current.service.updateModule("dj", { mixer: { masterLevelPercent: 90 } });
    const before = fs.readFileSync(current.settingsPath);
    assert.equal((await current.service.updateModule("dj", { mixer: { masterLevelPercent: 900 } })).ok, false);
    assert.equal((await current.service.updateModule("dj", { waveform: { renderQuality: "cinema" } })).ok, false);
    assert.deepEqual(fs.readFileSync(current.settingsPath), before);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("unknown DJ legacy fields are preserved by the compatibility adapter", () => {
  const adapted = adaptLegacyDjSettings({
    target: "d2",
    amount: 0.4,
    sort: "bpm-desc",
    futureDeckPreference: { slip: true },
  });
  assert.equal(adapted.mapped["fx.defaultTarget"], "d2");
  assert.equal(adapted.mapped["fx.defaultDryWet"], 0.4);
  assert.equal(adapted.mapped["performanceUi.librarySort"], "bpm-desc");
  assert.deepEqual(adapted.unknownLegacy.futureDeckPreference, { slip: true });
});

test("unsupported loop and Beat Jump sizes are rejected", async () => {
  const current = fixture();
  try {
    assert.deepEqual(DEFAULT_SETTINGS.dj.loops.availableLengths, [...DJ_LOOP_LENGTHS]);
    assert.deepEqual(DEFAULT_SETTINGS.dj.beatJump.availableSizes, [...DJ_BEAT_JUMP_SIZES]);
    assert.equal((await current.service.updateModule("dj", {
      loops: { availableLengths: [3, 4] },
    })).ok, false);
    assert.equal((await current.service.updateModule("dj", {
      beatJump: { availableSizes: [3, 8] },
    })).ok, false);
    assert.equal(fs.existsSync(current.settingsPath), false);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("recording archive and stem paths use U4 validation", async () => {
  const current = fixture();
  try {
    assert.equal((await current.service.updateModule("dj", {
      recordingArchive: { root: "server/data/dj-recordings/final" },
    })).ok, true);
    const before = fs.readFileSync(current.settingsPath);
    assert.equal((await current.service.updateModule("dj", {
      recordingArchive: { root: "C:\\Media\\..\\Windows" },
    })).ok, false);
    assert.equal((await current.service.updateModule("dj", {
      stems: { cacheRoot: "D:\\Unapproved\\Stems" },
    })).ok, false);
    assert.deepEqual(fs.readFileSync(current.settingsPath), before);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("DJ safety defaults and numeric mixer limits remain intact", () => {
  assert.equal(DEFAULT_SETTINGS.dj.decks.deck1Colour, "orange");
  assert.equal(DEFAULT_SETTINGS.dj.decks.deck2Colour, "blue");
  assert.equal(DEFAULT_SETTINGS.dj.fx.killAlwaysForcesDry, true);
  assert.equal(DEFAULT_SETTINGS.dj.fx.defaultDryWet, 0.58);
  assert.equal(DEFAULT_SETTINGS.dj.stems.concurrentJobs, 1);
  assert.equal(DEFAULT_SETTINGS.dj.performanceUi.preserveSingleViewport, true);
  assert.equal(DEFAULT_SETTINGS.dj.performanceUi.allowMainPageScroll, false);
  assert.equal(validateSettings({
    ...structuredClone(DEFAULT_SETTINGS),
    dj: {
      ...structuredClone(DEFAULT_SETTINGS.dj),
      mixer: { ...DEFAULT_SETTINGS.dj.mixer, eqBoostDb: 99 },
    },
  }).valid, false);
});

test("future Mixxx and iPhone streaming sections are planned/unavailable", async () => {
  const inventory = getDjCompatibility();
  assert.equal(inventory.find((entry) => entry.section === "mixxx")?.applyMode, "planned/unavailable");
  assert.equal(inventory.find((entry) => entry.section === "audioRouting")?.applyMode, "planned/unavailable");
  const current = fixture();
  try {
    const result = await current.service.updateModule("dj", {
      audioRouting: { mode: "iphone-only" },
    });
    assert.equal(result.ok, false);
    assert.equal(fs.existsSync(current.settingsPath), false);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("DJ settings access leaves grid, waveform, cue, recording, archive and stem data untouched", () => {
  const before = new Map(DJ_DATA_FILES.map((file) => [file, digest(file)]));
  const current = fixture();
  try {
    current.service.readModule("dj", true);
    getDjCompatibility();
    DJ_DATA_FILES.forEach((file) => assert.equal(digest(file), before.get(file)));
    assert.equal(getDjApplyMode("dj.decks.keyLockDefault"), "next-track-load");
    assert.equal(getDjApplyMode("dj.recording.format"), "next-session");
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("existing DJ pages required by U6 remain present", () => {
  [
    "server/public/dj-mixer/index.html",
    "server/public/dj-mixer/performance.html",
    "server/public/dj-mixer/app.js",
    "server/public/dj-mixer/engine/audio-engine.js",
    "server/public/dj-mixer/engine/spectral-waveform.js",
  ].forEach((file) => assert.equal(fs.existsSync(file), true, file));
});
