import fs from "node:fs";
import path from "node:path";

export type LibrarySourceType = "audio" | "video" | "both";

export type LibrarySource = {
  id: string;
  label: string;
  path: string;
  type: LibrarySourceType;
  enabled: boolean;
  watch: boolean;
  includeSubfolders: boolean;
  defaultAudioTarget: boolean;
  defaultVideoTarget: boolean;
  createdAt: number;
  updatedAt: number;
};

type LibrarySourcesStore = {
  version: number;
  updatedAt: number;
  sources: LibrarySource[];
};

const LIBRARY_SOURCES_PATH = path.resolve(__dirname, "..", "data", "library-sources.json");

function splitPathList(value: string | undefined, fallback = "") {
  return String(value || fallback || "")
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normaliseSourcePath(value: unknown) {
  return path.resolve(String(value || "").trim());
}

function sourcePathKey(value: unknown) {
  return normaliseSourcePath(value).toLowerCase();
}

function normaliseSourceType(value: unknown): LibrarySourceType {
  const type = String(value || "").trim().toLowerCase();
  if (type === "video") return "video";
  if (type === "both") return "both";
  return "audio";
}

function sourceSupportsType(source: Pick<LibrarySource, "type">, type: "audio" | "video") {
  return source.type === "both" || source.type === type;
}

function defaultSourceLabel(sourcePath: string, type: LibrarySourceType) {
  const clean = String(sourcePath || "").replace(/[\\/]+$/, "");
  const name = path.basename(clean) || clean || "Library source";
  const prefix = type === "both" ? "Media" : type === "video" ? "Video" : "Audio";
  return `${prefix} · ${name}`;
}

function makeSourceId() {
  return `source_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureLibrarySourcesDir() {
  fs.mkdirSync(path.dirname(LIBRARY_SOURCES_PATH), { recursive: true });
}

function buildInitialLibrarySources(): LibrarySource[] {
  const now = Date.now();
  const map = new Map<string, LibrarySource>();
  const audioRoots = splitPathList(process.env.BRMEDIA_AUDIO_DIRS, "H:\\Music;C:\\DJMixes");
  const videoRoots = splitPathList(process.env.BRMEDIA_VIDEO_DIRS || process.env.VIDEO_LIBRARY_DIRS, "C:\\Videos");

  const add = (sourcePath: string, type: "audio" | "video", index: number) => {
    const resolved = normaliseSourcePath(sourcePath);
    const key = sourcePathKey(resolved);
    const existing = map.get(key);

    if (existing) {
      existing.type = existing.type === type ? existing.type : "both";
      if (type === "audio" && index === 0) existing.defaultAudioTarget = true;
      if (type === "video" && index === 0) existing.defaultVideoTarget = true;
      existing.label = defaultSourceLabel(resolved, existing.type);
      return;
    }

    map.set(key, {
      id: makeSourceId(),
      label: defaultSourceLabel(resolved, type),
      path: resolved,
      type,
      enabled: true,
      watch: true,
      includeSubfolders: true,
      defaultAudioTarget: type === "audio" && index === 0,
      defaultVideoTarget: type === "video" && index === 0,
      createdAt: now,
      updatedAt: now,
    });
  };

  audioRoots.forEach((sourcePath, index) => add(sourcePath, "audio", index));
  videoRoots.forEach((sourcePath, index) => add(sourcePath, "video", index));

  return normaliseDefaultTargets(Array.from(map.values()));
}

function normaliseDefaultTargets(input: LibrarySource[]) {
  const sources = input.map((source) => ({ ...source }));

  (["audio", "video"] as const).forEach((type) => {
    const enabled = sources.filter((source) => source.enabled && sourceSupportsType(source, type));
    const flag = type === "audio" ? "defaultAudioTarget" : "defaultVideoTarget";
    let selected = false;

    enabled.forEach((source) => {
      if (!source[flag] || selected) {
        source[flag] = false;
        return;
      }

      selected = true;
    });

    if (!selected && enabled[0]) enabled[0][flag] = true;
  });

  return sources;
}

function sanitiseLibrarySource(raw: any, existing?: LibrarySource): LibrarySource {
  const now = Date.now();
  const sourcePath = normaliseSourcePath(raw?.path ?? existing?.path ?? "");

  if (!String(raw?.path ?? existing?.path ?? "").trim()) {
    throw new Error("Choose a folder path.");
  }

  if (fs.existsSync(sourcePath)) {
    const stat = fs.statSync(sourcePath);

    if (!stat.isDirectory()) {
      throw new Error("Library source must be a folder, not a file.");
    }
  }

  const type = normaliseSourceType(raw?.type ?? existing?.type);
  const label = String(raw?.label ?? existing?.label ?? "").trim().slice(0, 100) || defaultSourceLabel(sourcePath, type);

  return {
    id: String(existing?.id || raw?.id || makeSourceId()),
    label,
    path: sourcePath,
    type,
    enabled: raw?.enabled === undefined ? existing?.enabled !== false : raw.enabled !== false,
    watch: raw?.watch === undefined ? existing?.watch !== false : raw.watch !== false,
    includeSubfolders: raw?.includeSubfolders === undefined ? existing?.includeSubfolders !== false : raw.includeSubfolders !== false,
    defaultAudioTarget: sourceSupportsType({ type }, "audio") && (raw?.defaultAudioTarget === undefined ? !!existing?.defaultAudioTarget : raw.defaultAudioTarget === true),
    defaultVideoTarget: sourceSupportsType({ type }, "video") && (raw?.defaultVideoTarget === undefined ? !!existing?.defaultVideoTarget : raw.defaultVideoTarget === true),
    createdAt: Number(existing?.createdAt || raw?.createdAt || now),
    updatedAt: Number(raw?.updatedAt || existing?.updatedAt || now),
  };
}

function writeLibrarySourcesStore(sources: LibrarySource[]) {
  ensureLibrarySourcesDir();

  const payload: LibrarySourcesStore = {
    version: 1,
    updatedAt: Date.now(),
    sources: normaliseDefaultTargets(sources),
  };

  fs.writeFileSync(LIBRARY_SOURCES_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function readLibrarySourcesStore(): LibrarySourcesStore {
  try {
    if (!fs.existsSync(LIBRARY_SOURCES_PATH)) {
      return writeLibrarySourcesStore(buildInitialLibrarySources());
    }

    const parsed = JSON.parse(fs.readFileSync(LIBRARY_SOURCES_PATH, "utf8"));
    const rawSources = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.sources) ? parsed.sources : [];
    const sources = rawSources
      .map((raw: any) => {
        try {
          return sanitiseLibrarySource(raw);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as LibrarySource[];

    return {
      version: Number(parsed?.version || 1),
      updatedAt: Number(parsed?.updatedAt || 0),
      sources: normaliseDefaultTargets(sources),
    };
  } catch {
    return writeLibrarySourcesStore(buildInitialLibrarySources());
  }
}

function getStorageStats(sourcePath: string) {
  try {
    const statfsSync = (fs as any).statfsSync;
    if (typeof statfsSync !== "function") return {};

    const root = path.parse(sourcePath).root || sourcePath;
    const stat = statfsSync(root);
    const blockSize = Number(stat.bsize || stat.frsize || 0);
    const totalBytes = blockSize * Number(stat.blocks || 0);
    const freeBytes = blockSize * Number(stat.bavail ?? stat.bfree ?? 0);

    return {
      totalBytes,
      freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
    };
  } catch {
    return {};
  }
}

export function getLibrarySources() {
  return readLibrarySourcesStore().sources;
}

export function getLibrarySourcesWithStatus() {
  return getLibrarySources().map((source) => {
    const online = fs.existsSync(source.path);
    let readable = false;
    let writable = false;

    if (online) {
      try {
        fs.accessSync(source.path, fs.constants.R_OK);
        readable = true;
      } catch {}

      try {
        fs.accessSync(source.path, fs.constants.W_OK);
        writable = true;
      } catch {}
    }

    return {
      ...source,
      online,
      readable,
      writable,
      status: online ? (readable ? "online" : "unreadable") : "offline",
      ...getStorageStats(source.path),
    };
  });
}

export function getEnabledLibrarySourcePaths(type?: "audio" | "video") {
  const sources = getLibrarySources()
    .filter((source) => source.enabled && (!type || sourceSupportsType(source, type)));

  if (type) {
    const defaultFlag = type === "audio" ? "defaultAudioTarget" : "defaultVideoTarget";
    sources.sort((left, right) => Number(right[defaultFlag]) - Number(left[defaultFlag]));
  }

  return sources.map((source) => source.path);
}

export function getAllEnabledLibrarySourcePaths() {
  return getEnabledLibrarySourcePaths();
}

export function getDefaultLibrarySourcePath(type: "audio" | "video") {
  const sources = getLibrarySources().filter((source) => source.enabled && sourceSupportsType(source, type));
  const preferred = sources.find((source) => type === "audio" ? source.defaultAudioTarget : source.defaultVideoTarget);

  return preferred?.path || sources[0]?.path || "";
}

export function upsertLibrarySource(raw: any) {
  const store = readLibrarySourcesStore();
  const requestedId = String(raw?.id || "").trim();
  const existing = requestedId ? store.sources.find((source) => source.id === requestedId) : undefined;
  const next = { ...sanitiseLibrarySource(raw, existing), updatedAt: Date.now() };
  const duplicate = store.sources.find((source) => source.id !== next.id && sourcePathKey(source.path) === sourcePathKey(next.path));

  let sources: LibrarySource[];
  let saved: LibrarySource;

  if (duplicate && !existing) {
    const mergedType: LibrarySourceType = duplicate.type === next.type ? duplicate.type : "both";

    saved = {
      ...sanitiseLibrarySource({
        ...duplicate,
        ...next,
        id: duplicate.id,
        type: mergedType,
        defaultAudioTarget: duplicate.defaultAudioTarget || next.defaultAudioTarget,
        defaultVideoTarget: duplicate.defaultVideoTarget || next.defaultVideoTarget,
      }, duplicate),
      updatedAt: Date.now(),
    };

    sources = store.sources.map((source) => source.id === duplicate.id ? saved : source);
  } else {
    if (duplicate) {
      throw new Error("That folder is already saved as a BRMedia library source.");
    }

    saved = next;
    sources = existing
      ? store.sources.map((source) => source.id === existing.id ? saved : source)
      : [...store.sources, saved];
  }

  if (saved.defaultAudioTarget) {
    sources = sources.map((source) => ({
      ...source,
      defaultAudioTarget: source.id === saved.id,
    }));
  }

  if (saved.defaultVideoTarget) {
    sources = sources.map((source) => ({
      ...source,
      defaultVideoTarget: source.id === saved.id,
    }));
  }

  const written = writeLibrarySourcesStore(sources);

  return {
    source: written.sources.find((source) => source.id === saved.id) || saved,
    sources: written.sources,
  };
}

export function getLibrarySourceById(id: string) {
  return getLibrarySources().find((source) => source.id === id) || null;
}

export function removeLibrarySource(id: string) {
  const store = readLibrarySourcesStore();
  const existing = store.sources.find((source) => source.id === id);

  if (!existing) {
    throw new Error("Library source not found.");
  }

  const written = writeLibrarySourcesStore(store.sources.filter((source) => source.id !== id));

  return {
    removed: existing,
    sources: written.sources,
  };
}

function listWindowsDriveRoots() {
  if (process.platform !== "win32") {
    return [path.parse(process.cwd()).root || "/"];
  }

  const drives: string[] = [];

  for (let code = 65; code <= 90; code += 1) {
    const drive = `${String.fromCharCode(code)}:\\`;

    try {
      if (fs.existsSync(drive)) drives.push(drive);
    } catch {}
  }

  return drives;
}

export function browseServerFolders(rawPath = "") {
  const requested = String(rawPath || "").trim();
  const drives = listWindowsDriveRoots();

  if (!requested) {
    return {
      ok: true,
      mode: "drives",
      currentPath: "",
      parentPath: "",
      drives: drives.map((drive) => ({
        name: drive,
        path: drive,
        kind: "drive",
      })),
      folders: [],
    };
  }

  const currentPath = normaliseSourcePath(requested);

  if (!fs.existsSync(currentPath)) {
    throw new Error("That folder is offline or does not exist on the BRMedia server PC.");
  }

  if (!fs.statSync(currentPath).isDirectory()) {
    throw new Error("Choose a folder, not a file.");
  }

  const folders = fs.readdirSync(currentPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(currentPath, entry.name),
      kind: "folder",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const root = path.parse(currentPath).root;
  const parentPath = currentPath === root ? "" : path.dirname(currentPath);

  return {
    ok: true,
    mode: "folders",
    currentPath,
    parentPath,
    drives: drives.map((drive) => ({
      name: drive,
      path: drive,
      kind: "drive",
    })),
    folders,
  };
}
