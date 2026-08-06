import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import type { LibraryItem } from "./db/library";
import {
  LIBRARY_CATALOGUE_DEFAULT_LIMIT,
  LIBRARY_CATALOGUE_MAX_LIMIT,
  LibraryCatalogueQueryError,
  LibraryCatalogueQueryService,
  compactLibraryItem,
  libraryCatalogueRevision,
  parseLibraryCatalogueQuery,
  queryLibraryCatalogue,
} from "./libraryCatalogue";

function item(index: number, patch: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: `trk_${String(index).padStart(6, "0")}`,
    title: `Track ${String(index).padStart(6, "0")}`,
    artist: `Artist ${index % 37}`,
    source: "local",
    locator: `C:\\DJMixes\\Folder ${index % 5}\\Track ${index}.mp3`,
    mimeType: "audio/mpeg",
    sizeBytes: 5_000_000 + index,
    duration: 180 + (index % 300),
    bpm: 120 + (index % 100),
    key: index % 2 ? "A minor" : "C major",
    hasArtwork: index % 3 === 0,
    sourceOnline: true,
    sourceStatus: "online",
    djWaveformPrepared: index % 2 === 0,
    djWaveformPeakCount: 16384,
    djGridBpm: 120 + (index % 100),
    djGridBaseSet: index % 4 !== 0,
    djGridSource: "grid-analysis-v4-auto-synthetic",
    djGridSegments: Array.from({ length: 32 }, (_, segment) => ({
      id: `segment-${segment}`,
      startTime: segment * 10,
      startBeat: segment * 32,
      bpm: 170,
    })),
    djTempoCandidates: Array.from({ length: 20 }, (_, candidate) => ({
      bpm: 140 + candidate,
      score: 0.8,
    })),
    ...patch,
  };
}

function query(params = "") {
  return parseLibraryCatalogueQuery(new URLSearchParams(params));
}

test("compact catalogue defaults to a bounded first page and excludes paths and large detail", () => {
  const items = Array.from({ length: 120 }, (_, index) => item(index));
  const result = queryLibraryCatalogue(items, query());
  assert.equal(result.items.length, LIBRARY_CATALOGUE_DEFAULT_LIMIT);
  assert.equal(result.offset, 0);
  assert.equal(result.nextOffset, LIBRARY_CATALOGUE_DEFAULT_LIMIT);
  const payload = JSON.stringify(result);
  assert.doesNotMatch(payload, /C:\\\\DJMixes/);
  assert.doesNotMatch(payload, /djGridSegments|djTempoCandidates|locator/);
});

test("query validation rejects invalid and excessive values", () => {
  assert.throws(() => query("offset=-1"), LibraryCatalogueQueryError);
  assert.throws(() => query("limit=0"), LibraryCatalogueQueryError);
  assert.throws(() => query(`limit=${LIBRARY_CATALOGUE_MAX_LIMIT + 1}`), LibraryCatalogueQueryError);
  assert.throws(() => query("sort=__proto__"), LibraryCatalogueQueryError);
  assert.throws(() => query("prep=constructor"), LibraryCatalogueQueryError);
  assert.throws(() => query("search=hello%00world"), LibraryCatalogueQueryError);
  assert.throws(() => query(`search=${"x".repeat(121)}`), LibraryCatalogueQueryError);
});

test("paging has stable ordering with no duplicates or skips", () => {
  const items = Array.from({ length: 125 }, (_, index) =>
    item(index, { title: `Shared title ${index % 4}` })
  );
  const first = queryLibraryCatalogue(items, query("limit=50&sort=title-asc"));
  const second = queryLibraryCatalogue(items, query("limit=50&offset=50&sort=title-asc"));
  const third = queryLibraryCatalogue(items, query("limit=50&offset=100&sort=title-asc"));
  const ids = [...first.items, ...second.items, ...third.items].map((entry) => entry.id);
  assert.equal(ids.length, 125);
  assert.equal(new Set(ids).size, 125);
});

test("search is case-insensitive across title artist and filename", () => {
  const items = [
    item(1, { title: "Northern Lights" }),
    item(2, { artist: "Special ARTIST" }),
    item(3, { locator: "C:\\DJMixes\\Unique File Name.mp3" }),
  ];
  assert.deepEqual(
    queryLibraryCatalogue(items, query("search=NORTHERN")).items.map((entry) => entry.id),
    ["trk_000001"]
  );
  assert.deepEqual(
    queryLibraryCatalogue(items, query("search=special artist")).items.map((entry) => entry.id),
    ["trk_000002"]
  );
  assert.deepEqual(
    queryLibraryCatalogue(items, query("search=unique file")).items.map((entry) => entry.id),
    ["trk_000003"]
  );
});

test("existing preparation and BPM filters combine with deterministic sorting", () => {
  const items = [
    item(1, { title: "B", bpm: 175, djGridBpm: 175, djWaveformPrepared: true, djGridBaseSet: true }),
    item(2, { title: "A", bpm: 130, djGridBpm: 130, djWaveformPrepared: false, djGridBaseSet: false }),
    item(3, { title: "C", bpm: 190, djGridBpm: 190, djWaveformPrepared: true, djGridBaseSet: true }),
  ];
  const result = queryLibraryCatalogue(
    items,
    query("prep=ready&bpm=160-179&sort=title-desc")
  );
  assert.deepEqual(result.items.map((entry) => entry.id), ["trk_000001"]);
});

test("duration visibility preserves known-duration under-15-minute behaviour", () => {
  const items = [
    item(1, { duration: undefined }),
    item(2, { duration: 0 }),
    item(3, { duration: 899.9 }),
    item(4, { duration: 900 }),
  ];
  const result = queryLibraryCatalogue(items, query());
  assert.deepEqual(result.items.map((entry) => entry.id), ["trk_000003"]);
});

test("compact metadata reports embedded BPM and key without claiming preparation", () => {
  const compact = compactLibraryItem(item(1, {
    bpm: 174,
    key: "A minor",
    djGridBpm: null,
    djGridSource: undefined,
    djWaveformPrepared: false,
  }));
  assert.equal(compact.bpm, 174);
  assert.equal(compact.bpmSource, "embedded");
  assert.equal(compact.keySource, "embedded");
  assert.equal(compact.bpmVerified, true);
  assert.equal(compact.djWaveformPrepared, false);
});

test("BRMedia tempo and key analysis have explicit trusted provenance", () => {
  const compact = compactLibraryItem(item(2, {
    bpm: null,
    key: "",
    djGridBpm: 208.4,
    djGridSource: "brmedia-analysis-m10-v1",
    djKeyAnalysis: {
      key: "C#",
      confidence: .7,
      source: "verified-chroma",
      version: "musical-key-chroma-m10-v1",
    },
  }));
  assert.equal(compact.bpm, 208.4);
  assert.equal(compact.bpmSource, "brmedia-analysis");
  assert.equal(compact.key, "C#");
  assert.equal(compact.keySource, "brmedia-analysis");
  assert.equal(compact.keyVerified, true);
});

test("unknown legacy grid provenance is exposed as unverified", () => {
  const compact = compactLibraryItem(item(3, {
    bpm: null,
    djGridBpm: 170,
    djGridSource: "mystery-cache-v1",
  }));
  assert.equal(compact.bpmSource, "unknown");
  assert.equal(compact.bpmVerified, false);
});

test("compact rows safely fall back through artist and filename fields", () => {
  const withoutArtist = compactLibraryItem(item(4, { artist: "", albumArtist: "", album: "" }));
  assert.equal(withoutArtist.artist, "Library audio");

  const filenameOnly = compactLibraryItem(item(5, {
    title: "",
    artist: "",
    albumArtist: "",
    album: "",
    locator: "C:\\DJMixes\\Filename Only.mp3",
  }));
  assert.equal(filenameOnly.title, "Filename Only");
  assert.equal(filenameOnly.fileName, "Filename Only.mp3");
});

test("missing and malformed optional metadata does not fabricate BPM or key", () => {
  const compact = compactLibraryItem(item(6, {
    bpm: null,
    key: "",
    djGridBpm: null,
    djGridSource: undefined,
    djWaveformPrepared: false,
    djKeyAnalysis: { key: null, confidence: null, source: "", version: "" },
  }));
  assert.equal(compact.bpm, null);
  assert.equal(compact.key, null);
  assert.equal(compact.bpmSource, "unknown");
  assert.equal(compact.keySource, "unknown");
});

test("temporary guest-shaped catalogue rows retain safe source fallbacks", () => {
  const guest = compactLibraryItem(item(7, {
    title: "Guest upload",
    artist: "",
    albumArtist: "",
    album: "",
    bpm: null,
    key: "",
    djGridBpm: null,
    djWaveformPrepared: false,
  }));
  assert.equal(guest.artist, "Library audio");
  assert.equal(guest.bpm, null);
  assert.equal(guest.loadEligible, true);
});

test("catalogue revision changes only when compact summary changes", () => {
  const original = compactLibraryItem(item(1));
  const sameSummary = compactLibraryItem(item(1, {
    djGridSegments: [{ id: "changed-detail", startTime: 1, startBeat: 1, bpm: 171 }],
  }));
  assert.equal(libraryCatalogueRevision([original]), libraryCatalogueRevision([sameSummary]));
  const changed = { ...original, title: "Changed title" };
  assert.notEqual(libraryCatalogueRevision([original]), libraryCatalogueRevision([changed]));
});

test("bounded warm cache deduplicates concurrent identical queries and invalidates by revision", async () => {
  const service = new LibraryCatalogueQueryService(60_000, 2);
  const items = Array.from({ length: 100 }, (_, index) => item(index));
  const parsed = query("search=track&limit=20");
  await Promise.all([
    service.query(items, parsed),
    service.query(items, parsed),
    service.query(items, parsed),
  ]);
  assert.equal(service.diagnostics().calculationCount, 1);
  await service.query(items, parsed);
  assert.equal(service.diagnostics().calculationCount, 1);
  await service.query(
    items.map((entry, index) => index === 0 ? { ...entry, title: "Revision changed" } : entry),
    parsed
  );
  assert.equal(service.diagnostics().calculationCount, 2);
});

test("10,000-track synthetic first page stays compact and query work remains bounded", () => {
  const items = Array.from({ length: 10_000 }, (_, index) => item(index));
  const started = performance.now();
  const result = queryLibraryCatalogue(items, query("search=artist%2012&limit=48"));
  const elapsedMs = performance.now() - started;
  const payloadBytes = Buffer.byteLength(JSON.stringify(result));
  assert.ok(result.items.length <= 48);
  assert.ok(payloadBytes < 100_000, `compact payload was ${payloadBytes} bytes`);
  assert.ok(elapsedMs < 5_000, `synthetic query took ${elapsedMs.toFixed(1)} ms`);
});
