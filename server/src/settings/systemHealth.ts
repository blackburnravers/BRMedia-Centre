import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SettingsStore } from "./store";
import { validateLocalSettingsPath } from "./pathValidation";

export interface ToolHealth {
  name: string;
  available: boolean;
  executable: string;
  version: string | null;
  checkedAt: string;
  message: string;
  timedOut: boolean;
}

export interface ToolCheckSpec {
  name: string;
  command: string;
  args: string[];
}

export type ToolRunner = (
  spec: ToolCheckSpec,
  timeoutMs: number,
) => Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>;

export interface StorageHealth {
  key: string;
  label: string;
  configured: boolean;
  available: boolean;
  totalBytes: number | null;
  freeBytes: number | null;
  usedBytes: number | null;
  measuredBytes: number | null;
  estimated: boolean;
  message: string;
}

interface RuntimeLibrarySource {
  id: string;
  label: string;
  path: string;
  type: "audio" | "video" | "both";
  enabled: boolean;
  includeSubfolders: boolean;
}

const HEALTH_CACHE_MS = 30_000;
let cachedHealth: { expiresAt: number; value: SettingsSystemHealth } | null = null;

export interface SettingsSystemHealth {
  checkedAt: string;
  tools: ToolHealth[];
  storage: StorageHealth[];
  librarySources: Array<RuntimeLibrarySource & {
    exists: boolean;
    readable: boolean;
    writable: boolean;
    status: string;
  }>;
  server: {
    nodeVersion: string;
    platform: string;
    pid: number;
    uptimeSeconds: number;
    https: "active" | "not-active";
    tailscale: "detected" | "not-detected" | "unknown";
  };
  notes: string[];
}

export const defaultToolRunner: ToolRunner = (spec, timeoutMs) =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let child;
    const finish = (value: { code: number | null; stdout: string; stderr: string; timedOut: boolean }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    try {
      child = spawn(spec.command, spec.args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({ code: null, stdout: "", stderr: error instanceof Error ? error.message : String(error), timedOut: false });
      return;
    }
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      finish({ code: null, stdout, stderr: "Health check timed out.", timedOut: true });
    }, timeoutMs);
    timer.unref?.();
    child.stdout?.on("data", (chunk: Buffer) => { stdout = `${stdout}${chunk.toString()}`.slice(0, 4096); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(0, 4096); });
    child.on("error", (error: Error) => finish({ code: null, stdout, stderr: error.message, timedOut: false }));
    child.on("close", (code: number | null) => finish({ code, stdout, stderr, timedOut: false }));
  });

function safeExecutable(command: string): string {
  return path.basename(command.replace(/^"|"$/g, "")) || "not detected";
}

function safeVersion(output: string): string | null {
  const line = output.split(/\r?\n/).map((part) => part.trim()).find(Boolean);
  return line ? line.replace(/[A-Z]:\\[^\s]+/gi, "[path]").slice(0, 180) : null;
}

export async function checkTool(
  spec: ToolCheckSpec,
  timeoutMs = 1500,
  runner: ToolRunner = defaultToolRunner,
): Promise<ToolHealth> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await runner(spec, timeoutMs);
    const output = `${result.stdout}\n${result.stderr}`.trim();
    const available = result.code === 0 && !result.timedOut;
    return {
      name: spec.name,
      available,
      executable: safeExecutable(spec.command),
      version: available ? safeVersion(output) : null,
      checkedAt,
      message: result.timedOut
        ? "Health check timed out safely."
        : available
          ? "Available."
          : "Unavailable or returned an error.",
      timedOut: result.timedOut,
    };
  } catch {
    return {
      name: spec.name,
      available: false,
      executable: safeExecutable(spec.command),
      version: null,
      checkedAt,
      message: "Unavailable.",
      timedOut: false,
    };
  }
}

function readRuntimeLibrarySources(projectRoot: string): RuntimeLibrarySource[] {
  const sourcePath = path.resolve(projectRoot, "server", "data", "library-sources.json");
  try {
    if (!fs.existsSync(sourcePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as unknown;
    const raw = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { sources?: unknown }).sources)
        ? (parsed as { sources: unknown[] }).sources
        : [];
    return raw.flatMap((entry, index) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
      const item = entry as Record<string, unknown>;
      const type = item.type === "video" || item.type === "both" ? item.type : "audio";
      return [{
        id: typeof item.id === "string" ? item.id : `runtime-${index + 1}`,
        label: typeof item.label === "string" ? item.label : `Library source ${index + 1}`,
        path: typeof item.path === "string" ? item.path : "",
        type,
        enabled: item.enabled !== false,
        includeSubfolders: item.includeSubfolders !== false,
      }];
    });
  } catch {
    return [];
  }
}

function boundedDirectoryUsage(directoryPath: string, maximumEntries = 200): { bytes: number | null; estimated: boolean } {
  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    let bytes = 0;
    entries.slice(0, maximumEntries).forEach((entry) => {
      if (!entry.isFile()) return;
      try { bytes += fs.statSync(path.join(directoryPath, entry.name)).size; } catch {}
    });
    return { bytes, estimated: entries.length > maximumEntries || entries.some((entry) => entry.isDirectory()) };
  } catch {
    return { bytes: null, estimated: false };
  }
}

export function getStorageHealth(
  key: string,
  label: string,
  configuredPath: string,
  projectRoot = process.cwd(),
): StorageHealth {
  if (!configuredPath.trim()) {
    return {
      key, label, configured: false, available: false, totalBytes: null, freeBytes: null,
      usedBytes: null, measuredBytes: null, estimated: false, message: "Not configured.",
    };
  }
  const pathStatus = validateLocalSettingsPath(configuredPath, { requireExisting: true, projectRoot });
  if (!pathStatus.valid || !pathStatus.normalizedPath) {
    return {
      key, label, configured: true, available: false, totalBytes: null, freeBytes: null,
      usedBytes: null, measuredBytes: null, estimated: false, message: pathStatus.message,
    };
  }
  let totalBytes: number | null = null;
  let freeBytes: number | null = null;
  try {
    const probe = fs.statfsSync(pathStatus.normalizedPath);
    const blockSize = Number(probe.bsize || 0);
    totalBytes = blockSize * Number(probe.blocks || 0);
    freeBytes = blockSize * Number(probe.bavail || 0);
  } catch {}
  const measured = boundedDirectoryUsage(pathStatus.normalizedPath);
  return {
    key,
    label,
    configured: true,
    available: true,
    totalBytes,
    freeBytes,
    usedBytes: totalBytes !== null && freeBytes !== null ? Math.max(0, totalBytes - freeBytes) : null,
    measuredBytes: measured.bytes,
    estimated: measured.estimated,
    message: measured.estimated ? "Available; usage is a bounded estimate." : "Available.",
  };
}

export async function getSettingsSystemHealth(
  options: {
    force?: boolean;
    store?: SettingsStore;
    runner?: ToolRunner;
    timeoutMs?: number;
    projectRoot?: string;
    httpsActive?: boolean;
  } = {},
): Promise<SettingsSystemHealth> {
  if (!options.force && cachedHealth && cachedHealth.expiresAt > Date.now()) return cachedHealth.value;
  const projectRoot = options.projectRoot ?? process.cwd();
  const settings = (options.store ?? new SettingsStore()).read().settings;
  const runner = options.runner ?? defaultToolRunner;
  const timeoutMs = options.timeoutMs ?? 1500;
  const ffmpeg = process.env.FFMPEG_PATH || (process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const ffprobe = process.env.FFPROBE_PATH || (process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
  const python = process.env.PYTHON_PATH || (process.platform === "win32" ? "python.exe" : "python3");
  const demucs = process.env.DEMUCS_COMMAND || "demucs";

  const tools = await Promise.all([
    checkTool({ name: "FFmpeg", command: ffmpeg, args: ["-version"] }, timeoutMs, runner),
    checkTool({ name: "FFprobe", command: ffprobe, args: ["-version"] }, timeoutMs, runner),
    checkTool({ name: "Python", command: python, args: ["--version"] }, timeoutMs, runner),
    checkTool({ name: "Demucs", command: demucs, args: ["--help"] }, timeoutMs, runner),
  ]);
  const torrentUrl = settings.torrents.engineUrl;
  let qbittorrentConfigured = false;
  try {
    const parsed = new URL(torrentUrl);
    qbittorrentConfigured = parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {}
  tools.push({
    name: "qBittorrent",
    available: settings.torrents.engineEnabled && qbittorrentConfigured,
    executable: "Web API",
    version: null,
    checkedAt: new Date().toISOString(),
    message: qbittorrentConfigured ? "Integration configured; no service was launched." : "Integration is not configured.",
    timedOut: false,
  });
  tools.push({
    name: "Node.js",
    available: true,
    executable: "node",
    version: process.version,
    checkedAt: new Date().toISOString(),
    message: "Current server runtime.",
    timedOut: false,
  });

  const runtimeSources = readRuntimeLibrarySources(projectRoot);
  const librarySources = runtimeSources.map((source) => {
    const status = validateLocalSettingsPath(source.path, { requireExisting: true, projectRoot });
    return {
      ...source,
      exists: status.exists,
      readable: status.readable,
      writable: status.writable,
      status: status.valid ? "available" : status.code?.toLowerCase() ?? "unavailable",
    };
  });
  const storage = [
    getStorageHealth("temporary", "Temporary storage", settings.storage.temporaryRoot, projectRoot),
    getStorageHealth("cache", "Cache", settings.storage.cacheRoot, projectRoot),
    getStorageHealth("recordingTemporary", "Recording temporary", settings.storage.recordingTemporaryRoot, projectRoot),
    getStorageHealth("recordingArchive", "Recording archive", settings.storage.recordingArchiveRoot, projectRoot),
    getStorageHealth("logs", "Logs", settings.storage.logsRoot, projectRoot),
    getStorageHealth("stemCache", "Stem cache", settings.dj.stems.cacheRoot, projectRoot),
  ];
  const value: SettingsSystemHealth = {
    checkedAt: new Date().toISOString(),
    tools,
    storage,
    librarySources,
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      https: options.httpsActive ? "active" : "not-active",
      tailscale: process.env.TAILSCALE_IP || process.env.TAILSCALE_HOSTNAME ? "detected" : "unknown",
    },
    notes: [
      "Health checks are read-only and bounded.",
      "No library rescan, restart, service launch, or software installation was performed.",
    ],
  };
  if (!options.runner) cachedHealth = { expiresAt: Date.now() + HEALTH_CACHE_MS, value };
  return value;
}
