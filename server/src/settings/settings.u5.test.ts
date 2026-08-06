import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./defaults";
import {
  adaptLegacyMediaSettings,
  getMediaModuleCompatibility,
  redactLegacyTorrentCredentials,
} from "./mediaAdapters";
import { SettingsService } from "./service";
import { SettingsStore } from "./store";

const MODULES = [
  "audioPlayer", "videoPlayer", "converter", "tagger", "mastering", "torrents",
] as const;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-settings-u5-"));
  const settingsPath = path.join(root, "settings", "brmedia-settings.json");
  const store = new SettingsStore({ settingsPath, backupPath: `${settingsPath}.lkg` });
  return { root, settingsPath, service: new SettingsService(store) };
}

function digest(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

test("all six media modules load documented defaults without writing", () => {
  const current = fixture();
  try {
    for (const module of MODULES) {
      assert.deepEqual(current.service.readModule(module).data, DEFAULT_SETTINGS[module]);
    }
    assert.equal(fs.existsSync(current.settingsPath), false);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("legacy adapters map supported values and preserve unknown keys", () => {
  const player = adaptLegacyMediaSettings("audioPlayer", {
    savePos: false,
    skipBackSec: 15,
    futurePlayerValue: { enabled: true },
  });
  assert.equal(player.mapped.savePosition, false);
  assert.equal(player.mapped.skipBackSeconds, 15);
  assert.deepEqual(player.unknownLegacy.futurePlayerValue, { enabled: true });

  const video = adaptLegacyMediaSettings("videoPlayer", { pipEnabled: false, futureVideoValue: 9 });
  assert.equal(video.mapped.pictureInPicture, false);
  assert.equal(video.unknownLegacy.futureVideoValue, 9);

  const converter = adaptLegacyMediaSettings("converter", { defaultCrf: "24", futureJobValue: true });
  assert.equal(converter.mapped.crf, "24");
  assert.equal(converter.unknownLegacy.futureJobValue, true);

  const tagger = adaptLegacyMediaSettings("tagger", { artworkMaxSize: 2048, futureTagValue: "keep" });
  assert.equal(tagger.mapped.artworkMaximumSize, 2048);
  assert.equal(tagger.unknownLegacy.futureTagValue, "keep");

  const mastering = adaptLegacyMediaSettings("mastering", { targetLufs: -12, futureMasterValue: 1 });
  assert.equal(mastering.mapped.targetLufs, -12);
  assert.equal(mastering.unknownLegacy.futureMasterValue, 1);

  const torrents = adaptLegacyMediaSettings("torrents", { baseUrl: "http://127.0.0.1:8080", futureTorrentValue: 2 });
  assert.equal(torrents.mapped.engineUrl, "http://127.0.0.1:8080");
  assert.equal(torrents.unknownLegacy.futureTorrentValue, 2);
});

test("valid module updates persist and reload", async () => {
  const current = fixture();
  try {
    assert.equal((await current.service.updateModule("audioPlayer", { autoplay: true })).ok, true);
    assert.equal((await current.service.updateModule("videoPlayer", { playbackRate: 1.25 })).ok, true);
    assert.equal((await current.service.updateModule("converter", { crf: 24 })).ok, true);
    assert.equal((await current.service.updateModule("tagger", { artworkMaximumSize: 2048 })).ok, true);
    assert.equal((await current.service.updateModule("mastering", { targetLufs: -13 })).ok, true);
    assert.equal((await current.service.updateModule("torrents", { engineEnabled: false })).ok, true);

    const reloaded = new SettingsService(new SettingsStore({
      settingsPath: current.settingsPath,
      backupPath: `${current.settingsPath}.lkg`,
    }));
    assert.equal(reloaded.readModule("audioPlayer").data.autoplay, true);
    assert.equal(reloaded.readModule("videoPlayer").data.playbackRate, 1.25);
    assert.equal(reloaded.readModule("converter").data.crf, 24);
    assert.equal(reloaded.readModule("tagger").data.artworkMaximumSize, 2048);
    assert.equal(reloaded.readModule("mastering").data.targetLufs, -13);
    assert.equal(reloaded.readModule("torrents").data.engineEnabled, false);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("invalid media updates leave the settings file unchanged", async () => {
  const current = fixture();
  try {
    await current.service.updateModule("audioPlayer", { autoplay: true });
    const before = fs.readFileSync(current.settingsPath);
    assert.equal((await current.service.updateModule("videoPlayer", { playbackRate: 99 })).ok, false);
    assert.equal((await current.service.updateModule("converter", { audioFormat: "exe" })).ok, false);
    assert.equal((await current.service.updateModule("mastering", { targetLufs: 2 })).ok, false);
    assert.deepEqual(fs.readFileSync(current.settingsPath), before);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("torrent path settings use approved U4 path validation", async () => {
  const current = fixture();
  try {
    const traversal = await current.service.updateModule("torrents", {
      savePath: "C:\\BRMedia\\..\\Windows",
    });
    assert.equal(traversal.ok, false);
    const outside = await current.service.updateModule("torrents", {
      quarantineFolder: "D:\\Unapproved\\Quarantine",
    });
    assert.equal(outside.ok, false);
    assert.equal(fs.existsSync(current.settingsPath), false);
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});

test("torrent credentials are always redacted by the compatibility adapter", () => {
  const safe = redactLegacyTorrentCredentials({
    username: "brmedia",
    password: "never-return-this",
    token: "secret-token",
    baseUrl: "http://127.0.0.1:8080",
  });
  assert.equal(safe.username, "brmedia");
  assert.equal(safe.password, "[REDACTED]");
  assert.equal(safe.token, "[REDACTED]");
  assert.equal(JSON.stringify(safe).includes("never-return-this"), false);
  assert.equal(JSON.stringify(safe).includes("secret-token"), false);
});

test("stable Audio Player, Video Player and processing defaults remain unchanged", () => {
  assert.equal(DEFAULT_SETTINGS.audioPlayer.autoplay, false);
  assert.equal(DEFAULT_SETTINGS.audioPlayer.eqEnabled, false);
  assert.equal(DEFAULT_SETTINGS.audioPlayer.skipBackSeconds, 25);
  assert.equal(DEFAULT_SETTINGS.videoPlayer.resumeEnabled, true);
  assert.equal(DEFAULT_SETTINGS.videoPlayer.autoplayNextPart, true);
  assert.equal(DEFAULT_SETTINGS.videoPlayer.playbackRate, 1);
  assert.equal(DEFAULT_SETTINGS.converter.defaultPreset, "mp3-320");
  assert.equal(DEFAULT_SETTINGS.tagger.defaultSaveMode, "copy");
  assert.equal(DEFAULT_SETTINGS.mastering.defaultPreset, "streaming-clean");
  assert.equal(DEFAULT_SETTINGS.torrents.engineUrl, "http://127.0.0.1:8080");
});

test("compatibility inventory exposes no credential values or destructive actions", () => {
  const inventory = getMediaModuleCompatibility();
  assert.deepEqual(inventory.map((entry) => entry.module), MODULES);
  assert.ok(inventory.every((entry) => entry.runtimeMode === "shared-defaults-with-legacy-runtime"));
  const text = JSON.stringify(inventory);
  assert.equal(/never-return-this|secret-token/i.test(text), false);
  assert.equal(/launch|execute|write media/i.test(text), false);
});

test("opening/read-only settings access does not migrate legacy runtime JSON", () => {
  const files = [
    "server/data/player-runtime-state.json",
    "server/data/torrent-state.json",
  ].filter((file) => fs.existsSync(file));
  const before = new Map(files.map((file) => [file, digest(file)]));
  const current = fixture();
  try {
    for (const module of MODULES) current.service.readModule(module, true);
    getMediaModuleCompatibility();
    assert.equal(fs.existsSync(current.settingsPath), false);
    files.forEach((file) => assert.equal(digest(file), before.get(file)));
  } finally {
    fs.rmSync(current.root, { recursive: true, force: true });
  }
});
