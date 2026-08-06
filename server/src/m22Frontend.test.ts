import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve("server/public/dj-mixer");
const source = fs.readFileSync(path.join(root, "components/collections-setplans-m22.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const mixxx = fs.readFileSync(path.join(root, "components/mixxx-catalogue-m21.js"), "utf8");

test("M22 runtime is registered after the legacy app so it replaces the demo safely", () => {
  assert.ok(html.indexOf("/dj-mixer/app.js") < html.indexOf("/dj-mixer/components/collections-setplans-m22.js"));
  assert.match(source, /\/api\/dj\/m22/);
  assert.match(source, /brmedia:m22-reconciled/);
});

test("Collection sheet supports search, create, multi-select and existing membership", () => {
  for (const token of ["data-m22-search", "data-m22-create-collection", "data-m22-selected-count", "already added", "[data-dj-library-select]:checked"])
    assert.ok(source.includes(token), `missing ${token}`);
  assert.match(source, /Add to Collection/);
  assert.match(source, /duplicatesSkipped|applyCollections/);
});

test("live view exposes Played, Up Next, lock, Add Again, correction and finalisation", () => {
  for (const token of ["Now Playing", "Played", "Up Next", "is-played", "Add Again", "Correct", "Finalise set", "Unmatched Live Tracks"])
    assert.ok(source.includes(token), `missing ${token}`);
  assert.match(source, /PLAY_THRESHOLD_SECONDS = 15/);
  assert.match(source, /brmedia:dj-audio-state/);
  assert.match(source, /brmedia:mixxx-live-state/);
  assert.match(source, /actualPlayedPosition/);
});

test("touch, safe-area, no-overflow sheet and desktop-accessible buttons are styled", () => {
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /max-width:700px/);
  assert.match(css, /overflow:auto/);
  assert.match(source, /aria-label="Move up"/);
});

test("Mixxx original download and capability-gated loading remain intact", () => {
  assert.match(mixxx, /Download Original/);
  assert.ok(mixxx.includes("catalogue/${encodeURIComponent(track.id)}/download"));
  assert.match(mixxx, /aria-disabled/);
  assert.match(mixxx, /loadCapabilities\?\.supported/);
  assert.match(mixxx, /Tracks load without autoplay/);
});

test("frontend persists active plan and reconciles after background or reload", () => {
  assert.match(source, /brmedia\.m22\.active-plan/);
  assert.match(source, /async function refresh/);
  assert.match(source, /response\.status === 409/);
  assert.match(source, /window\.BRMediaM22/);
});

test("management uses accessible mobile modals without browser prompt or confirm", () => {
  assert.doesNotMatch(source, /\b(?:prompt|confirm|alert)\s*\(/);
  for (const token of ["role=\"dialog\"", "aria-modal=\"true\"", "data-modal-cancel", "data-modal-error", "modalFocus", "popstate", "brM22ModalOpen"])
    assert.ok(source.includes(token) || css.includes(token), `missing ${token}`);
  for (const label of ["Create Collection", "Edit Collection", "Delete Collection?", "Create Set Plan", "Edit Set Plan", "Finalise this Set Plan?", "Correct Played state?", "Detach recording?"])
    assert.ok(source.includes(label), `missing modal ${label}`);
});

test("M22 frontend asset has the production-ready cache version", () => {
  assert.match(html, /collections-setplans-m22\.js\?v=20260801-m22-1-production/);
  assert.doesNotMatch(html, /collections-setplans-m22\.js\?v=20260801-m22-part1/);
});

test("M22.1 coalesces refreshes, throttles catalogue injection and cleans up page lifecycle", () => {
  assert.match(source, /refreshPromise/);
  assert.match(source, /scheduleCatalogueActions/);
  assert.match(source, /catalogueObserver\.disconnect/);
  assert.match(source, /collection-search/);
});

test("runner is never referenced by M22 frontend", () => {
  assert.doesNotMatch(source, /brmedia-runner/i);
});
