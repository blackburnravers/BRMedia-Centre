import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const router = fs.readFileSync(path.resolve("server/src/api/router.ts"), "utf8");
const protocol = fs.readFileSync(path.resolve("server/src/mixxxProtocol.ts"), "utf8");
const frontend = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-catalogue-m21.js"), "utf8");

test("load API resolves opaque identity server-side and reports runtime capabilities", () => {
  assert.match(router, /\/api\/dj\/mixxx\/load\/capabilities/);
  assert.match(router, /mixxxLoadProvider\.submit/);
  assert.match(router, /mixxxCatalogueProvider\.resolveTrack/);
  assert.doesNotMatch(frontend, /filePath\s*:/);
});

test("additive load schema keeps the browser path-free and uses a private bridge extension", () => {
  assert.match(protocol, /BRMEDIA_MIXXX_LOAD_EXTENSION/);
  assert.match(protocol, /transport: "brmedia-api"/);
  assert.match(protocol, /BRMEDIA_MIXXX_LOAD_SYSEX/);
  assert.match(protocol, /browserPathInput: false/);
  assert.match(protocol, /autoplay: false/);
});

test("artwork route is identity-bound and never exposes a Windows path", () => {
  assert.match(router, /download\|artwork/);
  assert.match(router, /MIXXX_ARTWORK_UNAVAILABLE/);
  const artworkBranch = router.slice(router.indexOf('mixxxTrackMatch[4] === "artwork"'), router.indexOf('mixxxTrackMatch[4] === "download"'));
  assert.doesNotMatch(artworkBranch, /json\([^\n]+filePath|streamFileWithRange/);
});

test("Mixxx load UI never invokes Native loading or selected-row controls", () => {
  assert.match(frontend, /aria-disabled/);
  assert.doesNotMatch(frontend, /LoadSelectedTrack|SelectTrack|BRMediaDjAudioEngine|loadFile\(/);
});

test("M23 Eject controls remain Mixxx-only and wait for authoritative unload feedback", () => {
  const bridge = fs.readFileSync(path.resolve("server/src/mixxxBridge.ts"), "utf8");
  const backend = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  assert.match(bridge, /unloadMatch = url\.pathname\.match/);
  assert.match(bridge, /bridge\.sendUnload/);
  assert.match(bridge, /Playing deck — confirmation required/);
  assert.match(backend, /data-mixxx-eject-deck/);
  assert.match(backend, /state\.playing === true/);
  assert.doesNotMatch(backend.slice(backend.indexOf("mixxx-eject-deck"), backend.indexOf("function renderDeck")), /BRMediaDjAudioEngine|unloadDeck/);
});
