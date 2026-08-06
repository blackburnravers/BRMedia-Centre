import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..", "..");
const loader = fs.readFileSync(
  path.join(root, "server/public/dj-mixer/components/guest-native-loader.js"), "utf8"
);
const engine = fs.readFileSync(
  path.join(root, "server/public/dj-mixer/engine/audio-engine.js"), "utf8"
);
const upload = fs.readFileSync(
  path.join(root, "server/public/dj-mixer/guest-upload.js"), "utf8"
);

test("guest loader uses the native deck, aborts stale work, commits leases, and never autoplays", () => {
  assert.match(loader, /BRMediaDjAudioEngine\?\.getDeck/);
  assert.match(loader, /new AbortController/);
  assert.match(loader, /generations/);
  assert.match(loader, /\/commit/);
  assert.match(loader, /release\(lease, "failed-load"\)/);
  assert.match(loader, /decodeAudioData\(arrayBuffer\)/);
  assert.match(loader, /decodedBuffer/);
  assert.match(loader, /next\.guestTrackId !== intent\.guest\.id/);
  assert.doesNotMatch(loader, /\.play\(/);
  assert.match(loader, /skipWaveform: true/);
  assert.ok(
    loader.indexOf(".decodeAudioData(arrayBuffer)") <
      loader.indexOf("await deck.loadFile(file"),
    "guest bytes must decode before the existing deck source is replaced"
  );
  assert.ok(
    loader.indexOf("const committed = await commit(lease)") <
      loader.indexOf('release(old, "replacement")'),
    "old guest lease must survive until the replacement commits"
  );
  assert.match(loader, /aria-live="polite"/);
});

test("playing replacement confirms, cancellation releases only the new lease, and eject unloads", () => {
  assert.match(loader, /before\.isPlaying/);
  assert.match(loader, /window\.confirm/);
  assert.match(loader, /cancelled-replacement/);
  assert.match(loader, /unloadDeck/);
  assert.match(loader, /brmedia:dj-deck-eject/);
});

test("engine exposes separate guest identity and generation-safe unload", () => {
  assert.match(engine, /this\.sourceKind/);
  assert.match(engine, /this\.guestTrackId/);
  assert.match(engine, /waveformLoadGeneration \+= 1/);
  assert.match(engine, /BRMEDIA_PLAYING_DECK_REPLACEMENT_REQUIRED/);
  assert.match(engine, /guest-no-analysis-v1/);
  assert.match(engine, /options\.decodedBuffer/);
});

test("guest upload exposes mobile D1/D2 reservation actions without filesystem paths", () => {
  assert.match(upload, /reserveAndOpenDeck\("d1"\)/);
  assert.match(upload, /reserveAndOpenDeck\("d2"\)/);
  assert.match(upload, /sessionStorage/);
  assert.doesNotMatch(upload, /[A-Z]:\\\\|privateFilePath/);
});
