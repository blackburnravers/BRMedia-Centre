import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const source = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-catalogue-m21.js"), "utf8");
const html = fs.readFileSync(path.resolve("server/public/dj-mixer/performance.html"), "utf8");

test("Mixxx Library is explicit and separate from BRMedia Library", () => {
  assert.match(source, />BRMedia Library</);
  assert.match(source, />Mixxx Library — H:/);
  assert.match(source, /is-mixxx-library-source/);
  assert.match(source, /Mixxx Library — H:\\\\Music/);
  assert.match(source, /Collections \/ Set Plans/);
  assert.match(source, /source: saved\.source \|\| "mixxx"/);
  assert.match(html, /mixxx-catalogue-m21\.js/);
});

test("Mixxx catalogue UI is lazy, bounded and race safe", () => {
  assert.match(source, /PAGE_SIZE = 48/);
  assert.match(source, /AbortController/);
  assert.match(source, /generation !== state\.generation/);
  assert.match(source, /CACHE_TTL_MS/);
  assert.match(source, /URLSearchParams\(\{ folder:/);
  assert.match(source, /search: state\.search, sort: state\.sort/);
});

test("M22.1 catalogue restores search, coalesces requests and bounds scroll work", () => {
  assert.match(source, /search: saved\.search/);
  assert.match(source, /pending\.has\(url\)/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /highlighted\(track\.title/);
  assert.match(source, /observer\.disconnect/);
  assert.match(source, /aria-busy/);
});

test("LAN HTTP Safari can initialise without crypto.randomUUID", () => {
  assert.match(source, /typeof globalThis\.crypto\?\.randomUUID === "function"/);
  assert.match(source, /getRandomValues/);
  assert.match(source, /brmedia-\$\{opaqueId\(\)\}/);
  assert.match(source, /load_\$\{opaqueId\(\)/);
});

test("M23 exposes stable identity with guarded compatible deck loading", () => {
  assert.match(source, /track\.id/);
  assert.match(source, /data-mixxx-load-deck/);
  assert.match(source, /loadCapabilities\?\.supported/);
  assert.doesNotMatch(source, /mixxxCommand|loadTrack|deck-load/);
});

test("Part 2 remembers navigation and exposes bounded views and original download", () => {
  assert.match(source, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(source, /data-mixxx-scope/);
  assert.match(source, /data-mixxx-view/);
  assert.match(source, /Whole library/);
  assert.match(source, /Flat View/);
  assert.match(source, /Recently Added/);
  assert.match(source, /Download Original/);
  assert.match(source, /Checking Mixxx loading capability/);
});

test("Part 2B preserves opaque retryable D1/D2 intents without Native fallback", () => {
  assert.match(source, /catalogueIdentity: identity/);
  assert.match(source, /autoplay: false, replacePlayingDeck: false/);
  assert.match(source, /brmedia\.mixxx\.pendingLoad/);
  assert.match(source, /\/api\/dj\/mixxx\/load/);
  assert.doesNotMatch(source, /BRMediaDjAudioEngine|loadFile\(|data-dj-engine-file/);
});
