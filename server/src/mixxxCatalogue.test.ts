import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import type { LibraryItem } from "./db/library";
import {
  defaultMixxxDatabasePath,
  MixxxCatalogueError,
  MixxxCatalogueProvider,
  parseMixxxCatalogueQuery,
} from "./mixxxCatalogue";

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-mixxx-catalogue-"));
  const databasePath = path.join(directory, "mixxxdb.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE track_locations (
      id INTEGER PRIMARY KEY, location TEXT, filename TEXT, directory TEXT,
      filesize INTEGER, fs_deleted INTEGER, needs_verification INTEGER
    );
    CREATE TABLE library (
      id INTEGER PRIMARY KEY, artist TEXT, title TEXT, album TEXT, year TEXT,
      genre TEXT, location INTEGER, comment TEXT, duration REAL, bpm REAL,
      wavesummaryhex BLOB, datetime_added TEXT, mixxx_deleted INTEGER,
      header_parsed INTEGER, key TEXT, beats BLOB, keys BLOB,
      coverart_source INTEGER, coverart_type INTEGER, coverart_location TEXT,
      coverart_hash INTEGER, rating INTEGER, color INTEGER
    );
    CREATE TABLE track_analysis (id INTEGER PRIMARY KEY, track_id INTEGER);
  `);
  const location = database.prepare("INSERT INTO track_locations VALUES (?, ?, ?, ?, ?, 0, 0)");
  const library = database.prepare("INSERT INTO library VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const rows = [
    [11, "H:\\Music\\Hardcore\\Alpha.mp3", "Alpha.mp3", "H:\\Music\\Hardcore", "Alpha", "Artist B", 175],
    [12, "H:\\Music\\Hardcore\\Sub\\Beta.flac", "Beta.flac", "H:\\Music\\Hardcore\\Sub", "Beta", "Artist A", 180],
    [13, "H:\\Music\\Trance\\Gamma.mp3", "Gamma.mp3", "H:\\Music\\Trance", "Gamma", "Artist C", 140],
  ] as const;
  for (const [id, filePath, filename, folder, title, artist, bpm] of rows) {
    location.run(id, filePath, filename, folder, 12345);
    library.run(id, artist, title, "Album", "2024", "Genre", id, `Comment ${title}`, 180 + id, bpm,
      id === 11 ? Buffer.from([1]) : null, "2026-08-01 00:00:00", 1, id === 11 ? "8A" : "",
      id === 11 ? Buffer.from([1]) : null, null, id === 11 ? 1 : 0, 0, "", 0, id === 11 ? 4 : null, id === 11 ? 16744192 : null);
  }
  database.prepare("INSERT INTO track_analysis VALUES (1, 11)").run();
  database.close();
  return { databasePath, provider: new MixxxCatalogueProvider(databasePath, "H:\\Music") };
}

const query = (value = "") => parseMixxxCatalogueQuery(new URLSearchParams(value));

test("Mixxx catalogue browses immediate folders without flattening tracks", () => {
  const { provider } = fixture();
  const root = provider.query(query());
  assert.deepEqual(root.folders.map((folder) => folder.name), ["Hardcore", "Trance"]);
  assert.equal(root.items.length, 0);
  const hardcore = provider.query(query("folder=Hardcore"));
  assert.deepEqual(hardcore.folders.map((folder) => folder.name), ["Sub"]);
  assert.deepEqual(hardcore.items.map((item) => item.id), ["mixxx:11"]);
});

test("Mixxx catalogue identity and metadata survive paging and sorting", () => {
  const { provider } = fixture();
  const result = provider.query(query("folder=Hardcore&search=a&sort=artist-asc&limit=1"));
  assert.equal(result.total, 2);
  assert.equal(result.items[0].id, "mixxx:12");
  assert.equal(result.items[0].filename, "Beta.flac");
  assert.equal(result.nextOffset, 1);
  const second = provider.query(query("folder=Hardcore&search=a&sort=artist-asc&limit=1&offset=1"));
  assert.equal(second.items[0].id, "mixxx:11");
});

test("Mixxx catalogue exposes nullable truth and exact BRMedia cache association", () => {
  const { provider } = fixture();
  const association: LibraryItem = {
    id: "trk_alpha", source: "local", locator: "H:\\Music\\Hardcore\\Alpha.mp3", title: "Alpha",
    djWaveformPrepared: true, djGridBpm: 175,
  };
  const result = provider.query(query("folder=Hardcore"), [association]);
  const alpha = result.items[0];
  assert.equal("filePath" in alpha, false);
  assert.equal(alpha.relativePath, "Hardcore/Alpha.mp3");
  assert.equal(alpha.waveformAssociation?.brmediaTrackId, "trk_alpha");
  assert.equal(alpha.waveformAssociation?.waveformAvailable, false);
  assert.equal(alpha.analysed, true);
  assert.equal(alpha.prepared, true);
  const beta = provider.query(query("folder=Hardcore/Sub")).items[0];
  assert.equal(beta.key, null);
  assert.equal(beta.waveformAssociation, null);
});

test("Mixxx catalogue rejects traversal, oversized pages and unknown sorting", () => {
  assert.throws(() => query("folder=../Windows"), MixxxCatalogueError);
  assert.throws(() => query("limit=101"), MixxxCatalogueError);
  assert.throws(() => query("sort=constructor"), MixxxCatalogueError);
});

test("stable identity resolves one read-only track for loading preparation and download", () => {
  const { provider } = fixture();
  const track = provider.resolveTrack("mixxx:11");
  assert.equal(track.filePath, "H:\\Music\\Hardcore\\Alpha.mp3");
  assert.equal(track.rating, 4);
  assert.equal(track.color, 16744192);
  assert.throws(() => provider.resolveTrack("mixxx:constructor"), MixxxCatalogueError);
  assert.throws(() => provider.resolveTrack("mixxx:999"), MixxxCatalogueError);
});

test("Mixxx catalogue provider opens the source strictly read-only", () => {
  const source = fs.readFileSync(path.resolve("server/src/mixxxCatalogue.ts"), "utf8");
  assert.match(source, /new DatabaseSync\(this\.databasePath, \{ readOnly: true \}\)/);
  assert.match(source, /PRAGMA query_only=ON/);
  assert.doesNotMatch(source, /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|REPLACE\s+INTO|VACUUM\s*;|ANALYZE\s*;)\b/i);
});

test("default catalogue follows the interactive project profile before a service account", () => {
  const previous = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = "C:\\Users\\service\\AppData\\Local";
  try {
    assert.match(defaultMixxxDatabasePath(), /Rosegrove Chippy[\\/]AppData[\\/]Local[\\/]Mixxx[\\/]mixxxdb\.sqlite$/i);
  } finally {
    if (previous === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previous;
  }
});
