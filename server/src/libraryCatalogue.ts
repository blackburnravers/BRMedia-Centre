import path from "node:path";
import type { LibraryItem } from "./db/library";
import { analysisSummary } from "./djM11Integration";

export const LIBRARY_CATALOGUE_API_VERSION = 1;
export const LIBRARY_CATALOGUE_DEFAULT_LIMIT = 48;
export const LIBRARY_CATALOGUE_MAX_LIMIT = 100;
export const LIBRARY_CATALOGUE_MAX_SEARCH = 120;
export const LIBRARY_CATALOGUE_CACHE_TTL_MS = 30_000;
export const LIBRARY_CATALOGUE_CACHE_MAX_ENTRIES = 64;
export const LIBRARY_CATALOGUE_MAX_DURATION_SECONDS = 15 * 60;

export type LibraryCatalogueSort =
  | "library-order"
  | "title-asc"
  | "title-desc"
  | "artist-asc"
  | "artist-desc"
  | "bpm-asc"
  | "bpm-desc"
  | "duration-asc"
  | "duration-desc"
  | "ready-first";

export type LibraryCataloguePrep =
  | "all"
  | "ready"
  | "refine"
  | "analyse"
  | "unprepared";

export type LibraryCatalogueBpm =
  | "all"
  | "unknown"
  | "120-159"
  | "160-179"
  | "180-199"
  | "200-plus";

export type LibraryCompactItem = {
  id: string;
  title: string;
  artist: string;
  fileName: string;
  mimeType: string | null;
  duration: number | null;
  bpm: number | null;
  bpmSource: "brmedia-analysis" | "embedded" | "imported" | "legacy-cache" | "unknown";
  bpmVerified: boolean;
  key: string | null;
  keySource: "brmedia-analysis" | "embedded" | "imported" | "legacy-cache" | "unknown";
  keyVerified: boolean;
  camelot: string | null;
  hasArtwork: boolean;
  sourceOnline: boolean;
  sourceStatus: "online" | "offline";
  loadEligible: boolean;
  djWaveformPrepared: boolean;
  djWaveformPeakCount: number | null;
  djWaveformUpdatedAt: number | null;
  djGridBpm: number | null;
  djGridRawBpm: number | null;
  djGridDownbeat: number | null;
  djGridBaseSet: boolean;
  djGridLocked: boolean;
  djGridReviewRequired: boolean;
  djGridSource: string | null;
  djGridAnalysisMode: "auto" | "normal" | "dynamic";
  djGridUpdatedAt: number | null;
  djTempoConfidence: number | null;
  djAnalysis: ReturnType<typeof analysisSummary>;
};

type MetadataProvenance = LibraryCompactItem["bpmSource"];

function gridProvenance(item: LibraryItem): MetadataProvenance {
  const source = String(item.djGridSource || "").trim().toLocaleLowerCase();
  if (!source) return "legacy-cache";
  if (source.startsWith("brmedia-analysis-") || source.startsWith("grid-analysis-")) {
    return "brmedia-analysis";
  }
  if (["manual", "tap", "grid-edit", "grid-nudge", "move-one-beat", "set-first-beat"]
    .some((prefix) => source.startsWith(prefix))) {
    return "brmedia-analysis";
  }
  if (source.includes("import")) return "imported";
  return "unknown";
}

function compactProvenance(item: LibraryItem & Record<string, any>) {
  const hasGridBpm = finite(item.djGridBpm) !== null && Number(item.djGridBpm) > 0;
  const hasEmbeddedBpm = finite(item.bpm) !== null && Number(item.bpm) > 0;
  const analysedKey = String(item.djKeyAnalysis?.key || "").trim();
  const embeddedKey = String(item.key || "").trim();
  const bpmSource: MetadataProvenance = hasGridBpm
    ? gridProvenance(item)
    : hasEmbeddedBpm
      ? item.bpmSource === "imported" ? "imported" : "embedded"
      : "unknown";
  const keySource: MetadataProvenance = analysedKey
    ? String(item.djKeyAnalysis?.version || "").startsWith("musical-key-")
      ? "brmedia-analysis"
      : "unknown"
    : embeddedKey
      ? item.keySource === "imported" ? "imported" : "embedded"
      : "unknown";
  return {
    bpmSource,
    bpmVerified: bpmSource === "brmedia-analysis" || bpmSource === "embedded" || bpmSource === "imported",
    keySource,
    keyVerified: keySource === "brmedia-analysis" || keySource === "embedded" || keySource === "imported",
  };
}

export type LibraryCatalogueQuery = {
  offset: number;
  limit: number;
  search: string;
  sort: LibraryCatalogueSort;
  prep: LibraryCataloguePrep;
  bpm: LibraryCatalogueBpm;
  availability: "all" | "online" | "offline";
};

export class LibraryCatalogueQueryError extends Error {
  readonly status = 400;
}

const SORTS = new Set<LibraryCatalogueSort>([
  "library-order", "title-asc", "title-desc", "artist-asc", "artist-desc",
  "bpm-asc", "bpm-desc", "duration-asc", "duration-desc", "ready-first",
]);
const PREP_FILTERS = new Set<LibraryCataloguePrep>([
  "all", "ready", "refine", "analyse", "unprepared",
]);
const BPM_FILTERS = new Set<LibraryCatalogueBpm>([
  "all", "unknown", "120-159", "160-179", "180-199", "200-plus",
]);
const AVAILABILITY_FILTERS = new Set(["all", "online", "offline"]);

function finite(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeInteger(value: string | null, fallback: number, name: string) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) throw new LibraryCatalogueQueryError(`Invalid ${name}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new LibraryCatalogueQueryError(`Invalid ${name}`);
  }
  return number;
}

function normaliseSearch(value: string | null) {
  const search = String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
  if (search.length > LIBRARY_CATALOGUE_MAX_SEARCH) {
    throw new LibraryCatalogueQueryError(
      `Search must be ${LIBRARY_CATALOGUE_MAX_SEARCH} characters or fewer`
    );
  }
  if (/[\u0000-\u001f\u007f]/.test(search)) {
    throw new LibraryCatalogueQueryError("Search contains unsupported control characters");
  }
  return search.toLocaleLowerCase();
}

export function parseLibraryCatalogueQuery(params: URLSearchParams): LibraryCatalogueQuery {
  const offset = nonNegativeInteger(params.get("offset"), 0, "offset");
  const requestedLimit = nonNegativeInteger(
    params.get("limit"),
    LIBRARY_CATALOGUE_DEFAULT_LIMIT,
    "limit"
  );
  if (requestedLimit < 1 || requestedLimit > LIBRARY_CATALOGUE_MAX_LIMIT) {
    throw new LibraryCatalogueQueryError(
      `Limit must be between 1 and ${LIBRARY_CATALOGUE_MAX_LIMIT}`
    );
  }

  const sort = String(params.get("sort") || "title-asc") as LibraryCatalogueSort;
  const prep = String(params.get("prep") || "all") as LibraryCataloguePrep;
  const bpm = String(params.get("bpm") || "all") as LibraryCatalogueBpm;
  const availability = String(params.get("availability") || "all") as
    LibraryCatalogueQuery["availability"];

  if (!SORTS.has(sort)) throw new LibraryCatalogueQueryError("Unsupported sort");
  if (!PREP_FILTERS.has(prep)) throw new LibraryCatalogueQueryError("Unsupported prep filter");
  if (!BPM_FILTERS.has(bpm)) throw new LibraryCatalogueQueryError("Unsupported BPM filter");
  if (!AVAILABILITY_FILTERS.has(availability)) {
    throw new LibraryCatalogueQueryError("Unsupported availability filter");
  }

  return {
    offset,
    limit: requestedLimit,
    search: normaliseSearch(params.get("search")),
    sort,
    prep,
    bpm,
    availability,
  };
}

export function compactLibraryItem(item: LibraryItem): LibraryCompactItem {
  const analysis = analysisSummary(item);
  const provenance = compactProvenance(item);
  const duration = finite(item.duration);
  const bpm = finite(item.djGridBpm ?? item.bpm);
  const sourceOnline = item.sourceOnline !== false && item.sourceStatus !== "offline";

  return {
    id: String(item.id),
    title: String(item.title || path.parse(item.locator || "").name || "Untitled track"),
    artist: String(item.artist || item.albumArtist || item.album || "Library audio"),
    fileName: path.basename(String(item.locator || "")),
    mimeType: item.mimeType ? String(item.mimeType) : null,
    duration: duration !== null && duration > 0 ? duration : null,
    bpm: bpm !== null && bpm > 0 ? bpm : null,
    bpmSource: provenance.bpmSource,
    bpmVerified: provenance.bpmVerified,
    key: analysis.key,
    keySource: provenance.keySource,
    keyVerified: provenance.keyVerified,
    camelot: analysis.camelot,
    hasArtwork: item.hasArtwork === true,
    sourceOnline,
    sourceStatus: sourceOnline ? "online" : "offline",
    loadEligible: sourceOnline,
    djWaveformPrepared: item.djWaveformPrepared === true,
    djWaveformPeakCount: finite(item.djWaveformPeakCount),
    djWaveformUpdatedAt: finite(item.djWaveformUpdatedAt),
    djGridBpm: bpm !== null && bpm > 0 ? bpm : null,
    djGridRawBpm: finite(item.djGridRawBpm),
    djGridDownbeat: finite(item.djGridDownbeat),
    djGridBaseSet: item.djGridBaseSet === true,
    djGridLocked: item.djGridLocked === true,
    djGridReviewRequired: item.djGridReviewRequired === true,
    djGridSource: item.djGridSource ? String(item.djGridSource) : null,
    djGridAnalysisMode:
      item.djGridAnalysisMode === "normal" || item.djGridAnalysisMode === "dynamic"
        ? item.djGridAnalysisMode
        : "auto",
    djGridUpdatedAt: finite(item.djGridUpdatedAt),
    djTempoConfidence: finite(item.djTempoConfidence),
    djAnalysis: analysis,
  };
}

function isPerformanceTrack(item: LibraryCompactItem) {
  const mime = String(item.mimeType || "").toLocaleLowerCase();
  const looksAudio =
    !mime ||
    mime.startsWith("audio/") ||
    /\.(mp3|m4a|aac|wav|flac|ogg|opus|aiff?|alac)$/i.test(item.fileName);
  return Boolean(
    looksAudio &&
    item.duration !== null &&
    item.duration > 0 &&
    item.duration < LIBRARY_CATALOGUE_MAX_DURATION_SECONDS
  );
}

function preparationRank(item: LibraryCompactItem) {
  const precise = isPrecisionReady(item);
  if (item.djWaveformPrepared && item.bpm && precise) return 0;
  if (item.djWaveformPrepared && item.bpm) return 2;
  if (item.djWaveformPrepared) return 3;
  return 4;
}

function isManualGrid(item: LibraryCompactItem) {
  const source = String(item.djGridSource || "").trim().toLocaleLowerCase();
  return [
    "manual", "tap", "shrink", "stretch", "x2", "/2", "grid-edit",
    "grid-nudge", "move-one-beat", "set-first-beat", "manual-segment",
    "delete-segment",
  ].some((prefix) => source.startsWith(prefix));
}

function isPrecisionReady(item: LibraryCompactItem) {
  if (!item.bpm) return false;
  if (isManualGrid(item)) return true;
  return String(item.djGridSource || "")
    .trim()
    .toLocaleLowerCase()
    .startsWith(`grid-analysis-v4-${item.djGridAnalysisMode}-`);
}

function matchesPrep(item: LibraryCompactItem, prep: LibraryCataloguePrep) {
  if (prep === "all") return true;
  const prepared = item.djWaveformPrepared;
  const precise = isPrecisionReady(item);
  if (prep === "ready") return prepared && Boolean(item.bpm) && precise;
  if (prep === "refine") return prepared && Boolean(item.bpm) && !precise;
  if (prep === "analyse") return prepared && !item.bpm;
  return !prepared;
}

function matchesBpm(item: LibraryCompactItem, bpm: LibraryCatalogueBpm) {
  if (bpm === "all") return true;
  if (bpm === "unknown") return !item.bpm;
  if (!item.bpm) return false;
  if (bpm === "120-159") return item.bpm >= 120 && item.bpm < 160;
  if (bpm === "160-179") return item.bpm >= 160 && item.bpm < 180;
  if (bpm === "180-199") return item.bpm >= 180 && item.bpm < 200;
  return item.bpm >= 200;
}

function textCompare(left: unknown, right: unknown) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    sensitivity: "base",
  });
}

function numberCompare(left: unknown, right: unknown) {
  return (Number(left) || 0) - (Number(right) || 0);
}

function compareItems(
  left: { item: LibraryCompactItem; index: number },
  right: { item: LibraryCompactItem; index: number },
  sort: LibraryCatalogueSort
) {
  const a = left.item;
  const b = right.item;
  let result = 0;
  switch (sort) {
    case "library-order": result = left.index - right.index; break;
    case "title-desc": result = textCompare(b.title, a.title); break;
    case "artist-asc": result = textCompare(a.artist, b.artist); break;
    case "artist-desc": result = textCompare(b.artist, a.artist); break;
    case "bpm-asc": result = numberCompare(a.bpm || 999, b.bpm || 999); break;
    case "bpm-desc": result = numberCompare(b.bpm, a.bpm); break;
    case "duration-asc": result = numberCompare(a.duration, b.duration); break;
    case "duration-desc": result = numberCompare(b.duration, a.duration); break;
    case "ready-first": result = preparationRank(a) - preparationRank(b); break;
    case "title-asc":
    default: result = textCompare(a.title, b.title); break;
  }
  return result || textCompare(a.id, b.id);
}

function hashRevisionText(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function libraryCatalogueRevision(items: LibraryCompactItem[]) {
  const signature = items.map((item) => [
    item.id, item.title, item.artist, item.fileName, item.duration, item.bpm,
    item.key, item.camelot, item.hasArtwork, item.sourceStatus,
    item.djWaveformPrepared, item.djGridBaseSet, item.djGridLocked,
    item.djGridReviewRequired, item.djGridSource, item.djGridAnalysisMode,
    item.djGridUpdatedAt, item.djTempoConfidence,
  ].join("\u001f")).join("\u001e");
  return `m21a-${items.length}-${hashRevisionText(signature)}`;
}

export function queryLibraryCatalogue(items: LibraryItem[], query: LibraryCatalogueQuery) {
  const compact = items.map(compactLibraryItem);
  const revision = libraryCatalogueRevision(compact);
  const filtered = compact
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (!isPerformanceTrack(item)) return false;
      if (query.availability !== "all" && item.sourceStatus !== query.availability) return false;
      if (!matchesPrep(item, query.prep) || !matchesBpm(item, query.bpm)) return false;
      if (!query.search) return true;
      return `${item.title}\n${item.artist}\n${item.fileName}`
        .normalize("NFKC")
        .toLocaleLowerCase()
        .includes(query.search);
    })
    .sort((left, right) => compareItems(left, right, query.sort));

  const page = filtered.slice(query.offset, query.offset + query.limit).map(({ item }) => item);
  const nextOffset = query.offset + page.length;
  return {
    apiVersion: LIBRARY_CATALOGUE_API_VERSION,
    revision,
    items: page,
    total: filtered.length,
    offset: query.offset,
    limit: query.limit,
    nextOffset: nextOffset < filtered.length ? nextOffset : null,
    hasMore: nextOffset < filtered.length,
  };
}

type CacheEntry = {
  expiresAt: number;
  value: ReturnType<typeof queryLibraryCatalogue>;
};

export class LibraryCatalogueQueryService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<ReturnType<typeof queryLibraryCatalogue>>>();
  private calculationCount = 0;

  constructor(
    private readonly ttlMs = LIBRARY_CATALOGUE_CACHE_TTL_MS,
    private readonly maxEntries = LIBRARY_CATALOGUE_CACHE_MAX_ENTRIES
  ) {}

  async query(items: LibraryItem[], query: LibraryCatalogueQuery) {
    const compact = items.map(compactLibraryItem);
    const revision = libraryCatalogueRevision(compact);
    const key = JSON.stringify([revision, query]);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;
    if (cached) this.cache.delete(key);

    const existing = this.pending.get(key);
    if (existing) return existing;

    const pending = Promise.resolve().then(() => {
      this.calculationCount += 1;
      const value = queryLibraryCatalogue(items, query);
      this.cache.set(key, { expiresAt: Date.now() + this.ttlMs, value });
      while (this.cache.size > this.maxEntries) {
        const oldest = this.cache.keys().next().value;
        if (oldest === undefined) break;
        this.cache.delete(oldest);
      }
      return value;
    }).finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, pending);
    return pending;
  }

  diagnostics() {
    return {
      cacheEntries: this.cache.size,
      pendingEntries: this.pending.size,
      calculationCount: this.calculationCount,
    };
  }
}
