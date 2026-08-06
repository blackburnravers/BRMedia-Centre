import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const app = () => fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");
const api = () => fs.readFileSync(path.resolve("server/src/api/router.ts"), "utf8");
const library = () => fs.readFileSync(path.resolve("server/src/db/library.ts"), "utf8");

test("Library warm open uses bounded query cache and avoids duplicate fetches", () => {
  const source = app();
  assert.match(source, /DJ_LIBRARY_CATALOGUE_TTL_MS/);
  assert.match(source, /djLibraryCatalogueCache/);
  assert.match(source, /DJ_LIBRARY_WARM_CACHE_MAX/);
  assert.match(source, /djLibraryCatalogueCache\.pending/);
  assert.match(source, /djLibraryCatalogueCache\.queryKey ===\s*queryKey/);
  assert.match(source, /queryAbort\?\s*\.abort/);
});

test("Library first useful render uses compact route and does not request waveform health", () => {
  const source = app();
  const request = source.indexOf("`/library/compact?${queryKey}`");
  const render = source.indexOf("renderDjPerformanceLibrary(", request);
  assert.ok(request >= 0 && render > request);
  assert.doesNotMatch(source.slice(request, render), /waveforms\/health/);
});

test("Library keeps duration heading and bounds initial DOM rows to one page", () => {
  const source = app();
  assert.match(source, /DJ_LIBRARY_MAX_DURATION_SECONDS\s*=\s*15 \* 60/);
  assert.match(source, /DJ_LIBRARY_PAGE_SIZE\s*=\s*48/);
  assert.match(source, /filtered\.slice\(\s*0,\s*240\s*\)/);
});

test("Compact library route uses persisted memory snapshot and does not start processing", () => {
  const source = api();
  const start = source.indexOf('url.pathname === "/library/compact"');
  const end = source.indexOf("// Legacy full catalogue", start);
  const route = source.slice(start, end);
  assert.match(route, /libraryCatalogueQueryService\.query\(listLibrary\(\), query\)/);
  assert.doesNotMatch(
    route,
    /backfillMissingAudioLibraryMetadata|queueWaveform|generateWaveform|djAnalysisQueue|handleDjStems|handleDjRecording/
  );
});

test("Library sync structurally handles add, change, delete and duplicate prevention", () => {
  const source = library();
  const start = source.indexOf("export function syncAudioLibraryFromRoots");
  const end = source.indexOf("export function removeLibraryItemsUnderRoot", start);
  const sync = source.slice(start, end);
  assert.match(sync, /findLibraryItemByLocator/);
  assert.match(sync, /statSync/);
  assert.match(sync, /library\.delete/);
  assert.match(sync, /discovered\.has/);
  assert.match(sync, /addedItems/);
  assert.match(sync, /relocationCandidates/);
  assert.match(sync, /migratedItems/);
  assert.match(sync, /path\.basename\(item\.locator\).*item\.sizeBytes/s);
  assert.match(sync, /syncAudioLibraryFromRootsYielding/);
  assert.match(sync, /setImmediate/);
  assert.match(sync, /removedItems/);
});

test("Library source contains no automatic production processing on catalogue open", () => {
  const source = app();
  const start = source.indexOf("`/library/compact?${queryKey}`");
  const end = source.indexOf("return items;", start);
  const loadPath = source.slice(start, end);
  assert.doesNotMatch(loadPath, /waveforms\/generate|dj-prep|rescan-metadata|analyse|stems|recording/i);
});
