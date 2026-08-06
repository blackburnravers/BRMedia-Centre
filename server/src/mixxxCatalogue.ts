import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getExistingWaveformCache } from "./waveforms";
import type { LibraryItem } from "./db/library";

export const MIXXX_CATALOGUE_DEFAULT_LIMIT = 48;
export const MIXXX_CATALOGUE_MAX_LIMIT = 100;
export const MIXXX_CATALOGUE_MAX_SEARCH = 120;
export const MIXXX_CATALOGUE_FOLDER_CACHE_MS = 30_000;

export type MixxxCatalogueSort =
  | "title-asc" | "title-desc"
  | "artist-asc" | "artist-desc"
  | "folder-asc" | "folder-desc"
  | "duration-asc" | "duration-desc"
  | "date-added-asc" | "date-added-desc"
  | "bpm-asc" | "bpm-desc"
  | "key-asc" | "key-desc"
  | "filename-asc" | "filename-desc";

export type MixxxCatalogueQuery = {
  folder: string;
  offset: number;
  limit: number;
  search: string;
  sort: MixxxCatalogueSort;
  scope: "folder" | "library";
  view: "folder" | "flat" | "recently-added";
};

export class MixxxCatalogueError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "MIXXX_CATALOGUE_INVALID") {
    super(message);
  }
}

const SORT_SQL: Record<MixxxCatalogueSort, string> = {
  "title-asc": "LOWER(COALESCE(l.title, tl.filename, '')) ASC",
  "title-desc": "LOWER(COALESCE(l.title, tl.filename, '')) DESC",
  "artist-asc": "LOWER(COALESCE(l.artist, '')) ASC",
  "artist-desc": "LOWER(COALESCE(l.artist, '')) DESC",
  "folder-asc": "LOWER(COALESCE(tl.directory, '')) ASC",
  "folder-desc": "LOWER(COALESCE(tl.directory, '')) DESC",
  "duration-asc": "COALESCE(l.duration, 9223372036854775807) ASC",
  "duration-desc": "COALESCE(l.duration, -1) DESC",
  "date-added-asc": "COALESCE(l.datetime_added, '') ASC",
  "date-added-desc": "COALESCE(l.datetime_added, '') DESC",
  "bpm-asc": "COALESCE(l.bpm, 9223372036854775807) ASC",
  "bpm-desc": "COALESCE(l.bpm, -1) DESC",
  "key-asc": "LOWER(COALESCE(NULLIF(l.key, ''), '~~~~')) ASC",
  "key-desc": "LOWER(COALESCE(l.key, '')) DESC",
  "filename-asc": "LOWER(COALESCE(tl.filename, '')) ASC",
  "filename-desc": "LOWER(COALESCE(tl.filename, '')) DESC",
};

function integer(value: string | null, fallback: number, name: string) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) throw new MixxxCatalogueError(`Invalid ${name}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new MixxxCatalogueError(`Invalid ${name}`);
  return parsed;
}

function cleanSearch(value: string | null) {
  const search = String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
  if (search.length > MIXXX_CATALOGUE_MAX_SEARCH) {
    throw new MixxxCatalogueError(`Search must be ${MIXXX_CATALOGUE_MAX_SEARCH} characters or fewer`);
  }
  if (/[\u0000-\u001f\u007f]/.test(search)) throw new MixxxCatalogueError("Search contains unsupported control characters");
  return search;
}

function cleanFolder(value: string | null) {
  const folder = String(value || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!folder) return "";
  const pieces = folder.split("/");
  if (pieces.some((piece) => !piece || piece === "." || piece === ".." || /[\u0000-\u001f\u007f:]/.test(piece))) {
    throw new MixxxCatalogueError("Invalid Mixxx folder");
  }
  return pieces.join("/");
}

export function parseMixxxCatalogueQuery(params: URLSearchParams): MixxxCatalogueQuery {
  const limit = integer(params.get("limit"), MIXXX_CATALOGUE_DEFAULT_LIMIT, "limit");
  if (limit < 1 || limit > MIXXX_CATALOGUE_MAX_LIMIT) {
    throw new MixxxCatalogueError(`Limit must be between 1 and ${MIXXX_CATALOGUE_MAX_LIMIT}`);
  }
  const sort = String(params.get("sort") || "title-asc") as MixxxCatalogueSort;
  if (!Object.prototype.hasOwnProperty.call(SORT_SQL, sort)) {
    throw new MixxxCatalogueError("Unsupported sort");
  }
  return {
    folder: cleanFolder(params.get("folder")),
    offset: integer(params.get("offset"), 0, "offset"),
    limit,
    search: cleanSearch(params.get("search")),
    sort,
    scope: params.get("scope") === "library" ? "library" : "folder",
    view: params.get("view") === "flat" || params.get("view") === "recently-added"
      ? params.get("view") as "flat" | "recently-added" : "folder",
  };
}

export function defaultMixxxDatabasePath() {
  const explicit = String(process.env.BRMEDIA_MIXXX_DB_PATH || "").trim();
  if (explicit) return path.resolve(explicit);
  const configuredProfile = String(process.env.BRMEDIA_MIXXX_PROFILE || "").trim();
  const moduleDirectory = path.resolve(__dirname);
  const windowsProfile = moduleDirectory.match(/^([A-Za-z]:[\\/]Users[\\/][^\\/]+)/i)?.[1]
    || process.cwd().match(/^([A-Za-z]:[\\/]Users[\\/][^\\/]+)/i)?.[1]
    || "";
  const wslProfile = moduleDirectory.match(/^\/mnt\/([a-z])\/Users\/([^/]+)/i);
  const projectProfile = windowsProfile || (wslProfile ? `${wslProfile[1].toUpperCase()}:\\Users\\${wslProfile[2]}` : "");
  if (projectProfile) {
    return path.join(projectProfile, "AppData", "Local", "Mixxx", "mixxxdb.sqlite");
  }
  const candidates = [
    configuredProfile ? path.join(configuredProfile, "Mixxx", "mixxxdb.sqlite") : "",
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Mixxx", "mixxxdb.sqlite") : "",
  ].filter(Boolean);
  const existing = candidates.filter((candidate, index) => candidates.indexOf(candidate) === index && fs.existsSync(candidate));
  existing.sort((left, right) => fs.statSync(right).size - fs.statSync(left).size);
  return existing[0] || candidates[0] || "";
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function nullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function year(value: unknown) {
  const text = nullableString(value);
  if (!text) return null;
  const match = text.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function windowsKey(value: string) {
  return path.win32.resolve(value).toLocaleLowerCase();
}

export class MixxxCatalogueProvider {
  private folderCache: { databaseMtime: number; expiresAt: number; directories: string[] } | null = null;

  constructor(
    readonly databasePath = defaultMixxxDatabasePath(),
    readonly musicRoot = String(process.env.BRMEDIA_MIXXX_MUSIC_ROOT || "H:\\Music").trim(),
  ) {}

  private open() {
    if (!this.databasePath || !fs.existsSync(this.databasePath)) {
      throw new MixxxCatalogueError("Mixxx catalogue is unavailable", 503, "MIXXX_CATALOGUE_UNAVAILABLE");
    }
    const database = new DatabaseSync(this.databasePath, { readOnly: true });
    database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=1500");
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('library','track_locations')").all();
    if (tables.length !== 2) {
      database.close();
      throw new MixxxCatalogueError("Unsupported Mixxx catalogue schema", 503, "MIXXX_SCHEMA_UNSUPPORTED");
    }
    return database;
  }

  private absoluteFolder(folder: string) {
    const root = path.win32.resolve(this.musicRoot);
    const absolute = folder ? path.win32.resolve(root, ...folder.split("/")) : root;
    const relative = path.win32.relative(root, absolute);
    if (relative.startsWith("..") || path.win32.isAbsolute(relative)) throw new MixxxCatalogueError("Folder is outside the Mixxx music root");
    return absolute;
  }

  resolveTrack(identity: string) {
    const match = /^mixxx:(\d+)$/.exec(String(identity || ""));
    if (!match) throw new MixxxCatalogueError("Invalid Mixxx track identity", 400, "MIXXX_TRACK_INVALID");
    const database = this.open();
    try {
      const row = database.prepare(`
        SELECT l.id, l.title, l.artist, l.album, l.genre, l.comment, l.year,
          l.duration, l.bpm, l.key, l.datetime_added, l.rating, l.color,
          tl.location, tl.filename, tl.directory
        FROM library l JOIN track_locations tl ON l.location = tl.id
        WHERE l.id = ? AND COALESCE(l.mixxx_deleted, 0) = 0
          AND COALESCE(tl.fs_deleted, 0) = 0 LIMIT 1
      `).get(Number(match[1])) as any;
      if (!row) throw new MixxxCatalogueError("Mixxx track not found", 404, "MIXXX_TRACK_NOT_FOUND");
      const filePath = String(row.location || path.win32.join(String(row.directory || ""), String(row.filename || "")));
      const root = path.win32.resolve(this.musicRoot);
      const relative = path.win32.relative(root, path.win32.resolve(filePath));
      if (relative.startsWith("..") || path.win32.isAbsolute(relative)) {
        throw new MixxxCatalogueError("Mixxx track is outside the configured music root", 403, "MIXXX_TRACK_OUTSIDE_ROOT");
      }
      return {
        id: `mixxx:${row.id}`, mixxxTrackId: Number(row.id), filePath,
        filename: nullableString(row.filename), folder: nullableString(row.directory),
        title: nullableString(row.title), artist: nullableString(row.artist), album: nullableString(row.album),
        genre: nullableString(row.genre), comments: nullableString(row.comment), year: year(row.year),
        duration: nullableNumber(row.duration), bpm: Number(row.bpm) > 0 ? Number(row.bpm) : null,
        key: nullableString(row.key), rating: nullableNumber(row.rating), color: nullableNumber(row.color),
        dateAdded: nullableString(row.datetime_added),
      };
    } finally { database.close(); }
  }

  private folders(database: DatabaseSync, databaseMtime: number) {
    const now = Date.now();
    if (this.folderCache && this.folderCache.databaseMtime === databaseMtime && this.folderCache.expiresAt > now) {
      return this.folderCache.directories;
    }
    const root = path.win32.resolve(this.musicRoot);
    const rows = database.prepare(`
      SELECT DISTINCT tl.directory AS directory
      FROM track_locations tl
      JOIN library l ON l.location = tl.id
      WHERE COALESCE(l.mixxx_deleted, 0) = 0
        AND COALESCE(tl.fs_deleted, 0) = 0
        AND (replace(tl.directory, '/', '\\') = ? COLLATE NOCASE OR substr(replace(tl.directory, '/', '\\'), 1, length(?) + 1) = (? || '\\') COLLATE NOCASE)
    `).all(root, root, root) as Array<{ directory: string }>;
    const directories = rows.map((row) => String(row.directory || "")).filter(Boolean);
    this.folderCache = { databaseMtime, expiresAt: now + MIXXX_CATALOGUE_FOLDER_CACHE_MS, directories };
    return directories;
  }

  query(query: MixxxCatalogueQuery, brmediaItems: LibraryItem[] = []) {
    const database = this.open();
    try {
      const databaseMtime = fs.statSync(this.databasePath).mtimeMs;
      const absoluteFolder = this.absoluteFolder(query.folder);
      const root = path.win32.resolve(this.musicRoot);
      const search = query.search ? `%${escapeLike(query.search)}%` : "";
      const where = ["COALESCE(l.mixxx_deleted, 0) = 0", "COALESCE(tl.fs_deleted, 0) = 0"];
      const parameters: Array<string | number> = [];

      if (query.scope === "library") {
        where.push("(replace(tl.directory, '/', '\\') = ? COLLATE NOCASE OR substr(replace(tl.directory, '/', '\\'), 1, length(?) + 1) = (? || '\\') COLLATE NOCASE)");
        parameters.push(root, root, root);
      } else if (query.search || query.view !== "folder") {
        where.push("(replace(tl.directory, '/', '\\') = ? COLLATE NOCASE OR substr(replace(tl.directory, '/', '\\'), 1, length(?) + 1) = (? || '\\') COLLATE NOCASE)");
        parameters.push(absoluteFolder, absoluteFolder, absoluteFolder);
      } else {
        where.push("replace(tl.directory, '/', '\\') = ? COLLATE NOCASE");
        parameters.push(absoluteFolder);
      }
      if (query.search) {
        where.push(`(
          COALESCE(l.title, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
          COALESCE(l.artist, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
          COALESCE(tl.filename, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
          COALESCE(l.album, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
          COALESCE(tl.directory, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
          COALESCE(l.comment, '') LIKE ? ESCAPE '\\' COLLATE NOCASE
        )`);
        parameters.push(search, search, search, search, search, search);
      }

      const whereSql = where.join(" AND ");
      const total = Number((database.prepare(`SELECT COUNT(*) AS total FROM library l JOIN track_locations tl ON l.location = tl.id WHERE ${whereSql}`).get(...parameters) as any).total || 0);
      const rows = database.prepare(`
        SELECT l.id, l.title, l.artist, l.album, l.genre, l.comment, l.year,
          l.duration, l.bpm, l.key, l.datetime_added, l.header_parsed, l.rating, l.color,
          l.wavesummaryhex IS NOT NULL AS has_wave_summary,
          l.beats IS NOT NULL AS has_beats,
          l.keys IS NOT NULL AS has_keys,
          l.coverart_source, l.coverart_type, l.coverart_location, l.coverart_hash,
          tl.location, tl.filename, tl.directory,
          EXISTS(SELECT 1 FROM track_analysis ta WHERE ta.track_id = l.id LIMIT 1) AS has_analysis
        FROM library l
        JOIN track_locations tl ON l.location = tl.id
        WHERE ${whereSql}
        ORDER BY ${query.view === "recently-added" ? SORT_SQL["date-added-desc"] : SORT_SQL[query.sort]}, l.id ASC
        LIMIT ? OFFSET ?
      `).all(...parameters, query.limit, query.offset) as any[];

      const brmediaByPath = new Map(brmediaItems.map((item) => [windowsKey(item.locator), item]));
      const items = rows.map((row) => {
        const filePath = String(row.location || path.win32.join(String(row.directory || ""), String(row.filename || "")));
        const association = brmediaByPath.get(windowsKey(filePath));
        const relativePath = path.win32.relative(root, path.win32.resolve(filePath)).replace(/\\/g, "/");
        return {
          id: `mixxx:${row.id}`,
          mixxxTrackId: Number(row.id),
          relativePath,
          filename: nullableString(row.filename),
          folder: nullableString(path.posix.dirname(relativePath) === "." ? "" : path.posix.dirname(relativePath)),
          duration: nullableNumber(row.duration),
          title: nullableString(row.title),
          artist: nullableString(row.artist),
          album: nullableString(row.album),
          genre: nullableString(row.genre),
          comments: nullableString(row.comment),
          year: year(row.year),
          bpm: Number(row.bpm) > 0 ? Number(row.bpm) : null,
          key: nullableString(row.key),
          dateAdded: nullableString(row.datetime_added),
          rating: nullableNumber(row.rating),
          color: nullableNumber(row.color),
          artworkAvailable: Boolean(Number(row.coverart_source) > 0 || Number(row.coverart_type) > 0 || nullableString(row.coverart_location) || Number(row.coverart_hash) > 0),
          analysed: Boolean(Number(row.has_analysis) || Number(row.has_beats) || Number(row.has_keys) || Number(row.bpm) > 0 || nullableString(row.key)),
          prepared: Boolean(Number(row.has_wave_summary) && (Number(row.has_beats) || Number(row.bpm) > 0)),
          waveformAssociation: association ? {
            brmediaTrackId: association.id,
            waveformAvailable: Boolean(getExistingWaveformCache(association.locator)),
            gridAvailable: Number.isFinite(Number(association.djGridBpm)),
          } : null,
        };
      });

      const childFolders = new Map<string, { name: string; folder: string }>();
      for (const directory of this.folders(database, databaseMtime)) {
        const relative = path.win32.relative(absoluteFolder, path.win32.resolve(directory));
        if (!relative || relative.startsWith("..") || path.win32.isAbsolute(relative)) continue;
        const name = relative.split(path.win32.sep)[0];
        if (!name) continue;
        const child = query.folder ? `${query.folder}/${name}` : name;
        childFolders.set(name.toLocaleLowerCase(), { name, folder: child.replace(/\\/g, "/") });
      }

      return {
        apiVersion: 1,
        source: "mixxx-library",
        readOnly: true,
        root: { name: path.win32.basename(root) || root, path: "" },
        folder: query.folder,
        parentFolder: query.folder.includes("/") ? query.folder.slice(0, query.folder.lastIndexOf("/")) : query.folder ? "" : null,
        folders: query.view === "folder" && !query.search
          ? Array.from(childFolders.values()).sort((a, b) => a.name.localeCompare(b.name)) : [],
        items,
        offset: query.offset,
        limit: query.limit,
        total,
        nextOffset: query.offset + items.length < total ? query.offset + items.length : null,
        search: query.search,
        sort: query.sort,
        scope: query.scope,
        view: query.view,
        databaseMtime,
      };
    } finally {
      database.close();
    }
  }
}
