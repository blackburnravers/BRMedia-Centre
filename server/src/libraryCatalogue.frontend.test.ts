import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const source = () =>
  fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");

test("browser opens the compact paginated route instead of the legacy full catalogue", () => {
  const app = source();
  assert.match(app, /\/library\/compact\?\$\{queryKey\}/);
  assert.doesNotMatch(
    app.slice(
      app.indexOf("const performDjLibraryCatalogueRefresh"),
      app.indexOf("const openDjPerformanceLibrary")
    ),
    /fetch\(["']\/library["']/
  );
});

test("catalogue queries are abortable generation protected and deduplicated", () => {
  const app = source();
  assert.match(app, /queryAbort\?\s*\.abort/);
  assert.match(app, /\+\+djLibraryCatalogueCache\s*\.queryGeneration/);
  assert.match(app, /generation !==\s*djLibraryCatalogueCache\s*\.queryGeneration/);
  assert.match(app, /djLibraryCatalogueCache\.queryKey ===\s*queryKey/);
  assert.match(app, /error\?\.name ===\s*"AbortError"/);
});

test("search filter and sort reset to page zero and page controls stay bounded", () => {
  const app = source();
  assert.match(app, /DJ_LIBRARY_PAGE_SIZE = 48/);
  assert.match(app, /DJ_LIBRARY_QUERY_DEBOUNCE_MS = 180/);
  assert.match(app, /data-dj-library-page="previous"/);
  assert.match(app, /data-dj-library-page="next"/);
  assert.match(app, /refreshDjLibraryCatalogue\(\s*sheet,\s*\{\s*offset: 0/s);
});

test("visible rows preserve stable item IDs for independent D1 and D2 actions", () => {
  const app = source();
  assert.match(app, /data-dj-library-track="\$\{escapeDjLibraryAttr\(\s*getDjLibraryItemId\(item\)/s);
  assert.match(app, /data-dj-library-load="d1"/);
  assert.match(app, /data-dj-library-load="d2"/);
  assert.match(app, /loadButton\.closest\(\s*"\[data-dj-library-track\]"\s*\).*dataset\.djLibraryTrack/s);
  assert.match(app, /loadLibraryItemIntoDeck\(\s*loadButton\.dataset\s*\.djLibraryLoad === "d2"\s*\?\s*"d2"\s*:\s*"d1",\s*item/s);
});

test("analysis detail is lazy independently abortable and stale protected", () => {
  const app = source();
  assert.match(app, /detailAbort\?\s*\.abort/);
  assert.match(app, /\+\+djLibraryCatalogueCache\.detailGeneration/);
  assert.match(app, /signal: detailController\.signal/);
  assert.match(app, /row\.dataset\.djLibraryTrack !== itemId/);
});

test("closing the library aborts catalogue and detail work", () => {
  const app = source();
  const closeStart = app.indexOf("const closeDjPerformanceLibrary");
  const closeEnd = app.indexOf("const formatDjLibraryBytes", closeStart);
  const close = app.slice(closeStart, closeEnd);
  assert.match(close, /queryAbort\?\s*\.abort/);
  assert.match(close, /detailAbort\?\s*\.abort/);
});

test("Library v2 has expandable filters stable skeletons retry and provenance labels", () => {
  const app = source();
  assert.match(app, /data-dj-library-filter-sheet/);
  assert.match(app, /data-dj-library-active-filters/);
  assert.match(app, /brDjLibrarySkeleton/);
  assert.match(app, /data-dj-library-retry/);
  assert.match(app, /is-deck-loaded/);
  assert.match(app, /safeItem\.bpmVerified === true/);
  assert.match(app, /safeItem\.keyVerified === true/);
  assert.match(app, /"Analysed"/);
  assert.match(app, /"Tagged"/);
  assert.match(app, /"Unverified"/);
});

test("provenance presentation is row scoped and missing values are null safe", () => {
  const app = source();
  const helperStart = app.indexOf("const getDjLibraryMetadataPresentation");
  const helperEnd = app.indexOf("const isDjLibraryManualGrid", helperStart);
  const filterStart = app.indexOf("const filteredEntries");
  const filterEnd = app.indexOf("const filtered =", filterStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  assert.match(app.slice(helperStart, helperEnd), /const sourceLabel/);
  assert.match(app.slice(helperStart, helperEnd), /item && typeof item === "object"/);
  assert.doesNotMatch(app.slice(filterStart, filterEnd), /sourceLabel|visibleBpm|visibleKey/);
});

test("malformed page entries and row failures cannot strand skeletons", () => {
  const app = source();
  assert.match(app, /rawItems\.filter/);
  assert.match(app, /Ignored malformed item at page index/);
  assert.match(app, /Could not render catalogue row/);
  assert.match(app, /Track unavailable/);
  assert.match(app, /setDjLibraryErrorState/);
  assert.match(app, /list\.innerHTML = `\s*<div class="brDjLibraryState brDjLibraryErrorState"/s);
});

test("zero-selection batch state stays compact while Select filtered remains available", () => {
  const app = source();
  assert.match(app, /batch\.dataset\.hasSelection/);
  assert.match(app, /data-dj-library-select-visible/);
  assert.doesNotMatch(app, /batch\.hidden = actionableSelected\.length === 0/);
});

test("Library metadata rendering never reads Mixxx live BPM", () => {
  const app = source();
  const start = app.indexOf("const renderDjPerformanceLibrary");
  const end = app.indexOf("const performDjLibraryCatalogueRefresh", start);
  const render = app.slice(start, end);
  assert.doesNotMatch(render, /mixxx|liveBpm|file_bpm/i);
});
