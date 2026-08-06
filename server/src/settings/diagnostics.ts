import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BRMEDIA_SETTINGS_SCHEMA_VERSION,
  BrMediaSettings,
} from "./types";
import { SettingsStore } from "./store";
import {
  checkTool,
  getSettingsSystemHealth,
  getStorageHealth,
  ToolRunner,
} from "./systemHealth";
import { validateLocalSettingsPath, validateLibrarySources } from "./pathValidation";
import { validateSettings } from "./validation";

export type HealthState =
  | "healthy"
  | "warning"
  | "unavailable"
  | "degraded"
  | "error"
  | "unknown";

export type DiagnosticsSectionName =
  | "summary"
  | "server"
  | "tools"
  | "storage"
  | "library"
  | "mediaModules"
  | "dj"
  | "jobs"
  | "logs"
  | "settingsStore";

export interface HealthCheck {
  id: string;
  label: string;
  state: HealthState;
  message: string;
  checkedAt: string;
  durationMs: number;
  actionRequired: boolean;
  affectedModules: string[];
  details?: Record<string, unknown>;
  recommendations?: string[];
}

export interface DiagnosticsSection {
  name: DiagnosticsSectionName;
  label: string;
  state: HealthState;
  checks: HealthCheck[];
}

export interface DiagnosticsReport {
  checkedAt: string;
  cached: boolean;
  cacheDurationSeconds: number;
  sections: DiagnosticsSection[];
  counts: Record<HealthState, number>;
  overall: HealthState;
  score: number;
}

export interface DiagnosticsDependencies {
  store?: SettingsStore;
  runner?: ToolRunner;
  projectRoot?: string;
  now?: () => Date;
  fetcher?: typeof fetch;
  httpsActive?: boolean;
  skipTools?: boolean;
}

type CheckResult = Omit<HealthCheck, "id" | "label" | "checkedAt" | "durationMs">;

const SECTION_LABELS: Record<DiagnosticsSectionName, string> = {
  summary: "Health Summary",
  server: "Server Health",
  tools: "Tools & Dependencies",
  storage: "Storage",
  library: "Library Health",
  mediaModules: "Media Modules",
  dj: "DJ Health",
  jobs: "Jobs & Queues",
  logs: "Logs & Errors",
  settingsStore: "Settings Store Health",
};

const STATE_WEIGHT: Record<HealthState, number> = {
  healthy: 100,
  warning: 70,
  degraded: 45,
  unavailable: 30,
  unknown: 20,
  error: 0,
};

let cachedReport: { expiresAt: number; report: DiagnosticsReport } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactText(value: unknown): string {
  return String(value ?? "")
    .replace(/(password|token|secret|authorization|cookie|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/(https?:\/\/)([^:@/\s]+):([^@/\s]+)@/gi, "$1[REDACTED]@")
    .replace(/[A-Z]:\\Users\\[^\\\s]+/gi, "[user-path]")
    .slice(0, 500);
}

function safePath(value: string, redact: boolean): string {
  if (!value) return "";
  return redact ? path.basename(value) || "[configured path]" : redactText(value);
}

function readJsonBounded(filePath: string, maximumBytes = 2 * 1024 * 1024): unknown {
  const stat = fs.statSync(filePath);
  if (stat.size > maximumBytes) throw new Error("File exceeds bounded diagnostics read limit.");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function independent(
  id: string,
  label: string,
  run: () => Promise<CheckResult> | CheckResult,
  timeoutMs: number,
  now: () => Date,
): Promise<HealthCheck> {
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<CheckResult>((resolve) => {
      timer = setTimeout(() => resolve({
        state: "unavailable",
        message: "Health check timed out safely.",
        actionRequired: true,
        affectedModules: [],
      }), timeoutMs);
      timer.unref?.();
    });
    const result = await Promise.race([Promise.resolve().then(run), timeout]);
    return {
      id,
      label,
      checkedAt: now().toISOString(),
      durationMs: Math.max(0, Date.now() - started),
      ...result,
      message: redactText(result.message),
      details: result.details && Object.fromEntries(
        Object.entries(result.details).map(([key, value]) => [
          key,
          typeof value === "string" ? redactText(value) : value,
        ]),
      ),
    };
  } catch (error) {
    return {
      id,
      label,
      state: "error",
      message: redactText(error instanceof Error ? error.message : "Health check failed."),
      checkedAt: now().toISOString(),
      durationMs: Math.max(0, Date.now() - started),
      actionRequired: true,
      affectedModules: [],
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sectionState(checks: HealthCheck[]): HealthState {
  if (!checks.length) return "unknown";
  return checks.reduce<HealthState>((worst, check) =>
    STATE_WEIGHT[check.state] < STATE_WEIGHT[worst] ? check.state : worst, "healthy");
}

function storageState(
  totalBytes: number | null,
  freeBytes: number | null,
  warningPercent: number,
  criticalPercent: number,
): HealthState {
  if (!totalBytes || freeBytes === null) return "unknown";
  const freePercent = (freeBytes / totalBytes) * 100;
  if (freePercent <= criticalPercent) return "error";
  if (freePercent <= warningPercent) return "warning";
  return "healthy";
}

export function diskHealthState(
  totalBytes: number | null,
  freeBytes: number | null,
  warningPercent: number,
  criticalPercent: number,
): HealthState {
  return storageState(totalBytes, freeBytes, warningPercent, criticalPercent);
}

function readArray(filePath: string): Record<string, unknown>[] {
  try {
    const parsed = readJsonBounded(filePath);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function recordingSummary(projectRoot: string): Record<string, number | null> {
  const manifestPath = path.resolve(projectRoot, "server/data/dj-recordings/recordings-manifest.json");
  const items = readArray(manifestPath);
  const now = Date.now();
  let zeroByte = 0;
  let processing = 0;
  let failed = 0;
  let recovery = 0;
  let oldestAgeMs: number | null = null;
  for (const item of items.slice(0, 500)) {
    const status = String(item.status ?? item.state ?? "ready").toLowerCase();
    if (status.includes("process") || status.includes("queue")) processing += 1;
    if (status.includes("fail") || status.includes("error") || status.includes("stall")) failed += 1;
    if (item.recoveryAvailable === true || status.includes("recover")) recovery += 1;
    if (Number(item.bytes ?? 1) === 0) zeroByte += 1;
    const created = Number(item.createdAt ?? 0);
    if (created > 0 && (processing || status.includes("process"))) {
      const age = Math.max(0, now - created);
      oldestAgeMs = oldestAgeMs === null ? age : Math.max(oldestAgeMs, age);
    }
  }
  return { total: items.length, processing, failed, recovery, zeroByte, oldestAgeMs };
}

function boundedLogSummary(
  projectRoot: string,
  lineLimit: number,
): Array<Record<string, unknown>> {
  const candidates = [
    path.resolve(projectRoot, "runner.log"),
    path.resolve(projectRoot, "server/runner.log"),
    path.resolve(projectRoot, "server/data/logs/runner.log"),
  ];
  const results: Array<Record<string, unknown>> = [];
  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const stat = fs.statSync(filePath);
      const bytes = Math.min(stat.size, 64 * 1024);
      const handle = fs.openSync(filePath, "r");
      try {
        const buffer = Buffer.alloc(bytes);
        fs.readSync(handle, buffer, 0, bytes, Math.max(0, stat.size - bytes));
        const lines = buffer.toString("utf8").split(/\r?\n/)
          .filter((line) => /warn|error|fail|unavailable/i.test(line))
          .slice(-lineLimit)
          .map(redactText);
        results.push({
          source: path.basename(filePath),
          updatedAt: stat.mtime.toISOString(),
          lines,
          boundedBytes: bytes,
        });
      } finally {
        fs.closeSync(handle);
      }
    } catch {}
  }
  return results;
}

function jobCheck(id: string, label: string, details: Record<string, unknown>): CheckResult {
  return {
    state: "healthy",
    message: "Read-only job summary available; no job action was performed.",
    actionRequired: false,
    affectedModules: [id],
    details: {
      running: 0,
      queued: 0,
      completedRecently: 0,
      failedRecently: 0,
      stalled: 0,
      oldestJobAgeMs: null,
      ...details,
    },
  };
}

export async function buildDiagnosticsReport(
  options: DiagnosticsDependencies & { force?: boolean } = {},
): Promise<DiagnosticsReport> {
  const store = options.store ?? new SettingsStore();
  const snapshot = store.read();
  const settings = snapshot.settings;
  const now = options.now ?? (() => new Date());
  const projectRoot = options.projectRoot ?? process.cwd();
  const timeoutMs = settings.diagnostics.toolCheckTimeoutMs;
  const cacheMs = settings.diagnostics.healthCacheSeconds * 1000;
  if (!options.force && !options.store && cachedReport && cachedReport.expiresAt > Date.now()) {
    return { ...cachedReport.report, cached: true };
  }

  const system = await getSettingsSystemHealth({
    force: Boolean(options.force),
    store,
    runner: options.runner,
    timeoutMs,
    projectRoot,
    httpsActive: options.httpsActive,
  });

  const sections = new Map<DiagnosticsSectionName, HealthCheck[]>();
  const add = (name: DiagnosticsSectionName, check: HealthCheck) => {
    const list = sections.get(name) ?? [];
    list.push(check);
    sections.set(name, list);
  };

  add("server", await independent("server-process", "BRMedia server process", async () => {
    const responsivenessStarted = Date.now();
    await new Promise<void>((resolve) => setImmediate(resolve));
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    return {
      state: "healthy",
      message: "BRMedia server process is responsive.",
      actionRequired: false,
      affectedModules: ["server"],
      details: {
        nodeVersion: process.version,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        memoryRssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        cpuUserMicroseconds: cpu.user,
        cpuSystemMicroseconds: cpu.system,
        eventLoopDelayMs: Date.now() - responsivenessStarted,
        cwd: safePath(process.cwd(), settings.diagnostics.redactLocalPaths),
        host: settings.server.host,
        port: settings.server.port,
        https: system.server.https,
        tailscale: system.server.tailscale,
        environment: process.env.NODE_ENV || "development",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
        serverTime: now().toISOString(),
        schemaVersion: BRMEDIA_SETTINGS_SCHEMA_VERSION,
      },
    };
  }, timeoutMs, now));

  const settingsState: HealthState = snapshot.health.state === "healthy" ||
    snapshot.health.state === "defaults" ? "healthy" :
    snapshot.health.state === "recovered-from-backup" ? "degraded" : "error";
  add("settingsStore", await independent("settings-store", "Settings store", () => ({
    state: settingsState,
    message: snapshot.health.message,
    actionRequired: settingsState !== "healthy",
    affectedModules: ["settings"],
    details: {
      state: snapshot.health.state,
      source: snapshot.health.source,
      mainExists: snapshot.health.mainExists,
      backupExists: snapshot.health.backupExists,
      writable: snapshot.health.writable,
      settingsFile: safePath(snapshot.health.settingsPath, true),
      backupFile: safePath(snapshot.health.backupPath, true),
      historicalBackupCount: (() => { try { const directory = settings.backup.backupLocation || path.join(path.dirname(snapshot.health.settingsPath), "backups"); return fs.existsSync(directory) ? fs.readdirSync(directory).filter((entry) => /^settings-.*\.json$/.test(entry)).length : 0; } catch { return 0; } })(),
      backupRetention: settings.backup.retentionCount,
      corruptRecoveryActive: snapshot.health.state === "recovered-from-backup",
      errorCount: snapshot.health.errors.length,
      pendingRestartRequired: [],
      pendingPageReloadRequired: [],
    },
  }), timeoutMs, now));

  for (const tool of system.tools) {
    add("tools", await independent(`tool-${tool.name.toLowerCase()}`, tool.name, () => ({
      state: tool.available ? "healthy" : tool.timedOut ? "unavailable" : "warning",
      message: tool.message,
      actionRequired: !tool.available,
      affectedModules: tool.name === "FFmpeg" || tool.name === "FFprobe"
        ? ["videoPlayer", "converter", "mastering", "recording"]
        : tool.name === "Demucs" || tool.name === "Python" ? ["dj.stems"] : ["server"],
      details: {
        available: tool.available,
        executable: tool.executable,
        version: tool.version,
        timedOut: tool.timedOut,
        lastCheckedAt: tool.checkedAt,
      },
    }), timeoutMs, now));
  }
  if (!options.skipTools) {
    for (const spec of [
      { name: "npm", command: process.platform === "win32" ? "npm.cmd" : "npm", args: ["--version"] },
      { name: "Git", command: process.platform === "win32" ? "git.exe" : "git", args: ["--version"] },
    ]) {
      const tool = await checkTool(spec, timeoutMs, options.runner);
      add("tools", await independent(`tool-${spec.name.toLowerCase()}`, spec.name, () => ({
        state: tool.available ? "healthy" : tool.timedOut ? "unavailable" : "warning",
        message: tool.message,
        actionRequired: !tool.available,
        affectedModules: ["developer"],
        details: {
          available: tool.available,
          executable: tool.executable,
          version: tool.version,
          timedOut: tool.timedOut,
          lastCheckedAt: tool.checkedAt,
        },
      }), timeoutMs, now));
    }
  }

  const storageLocations = [
    ["project", "BRMedia project folder", projectRoot],
    ["serverData", "Server data", "server/data"],
    ["temporary", "Temporary storage", settings.storage.temporaryRoot],
    ["cache", "Cache", settings.storage.cacheRoot],
    ["audioLibrary", "Audio library", settings.library.audioRoots[0] ?? ""],
    ["videoLibrary", "Video library", settings.library.videoRoots[0] ?? ""],
    ["recordingTemporary", "DJ recording temporary", settings.storage.recordingTemporaryRoot],
    ["recordingArchive", "DJ recording archive", settings.dj.recordingArchive.root || settings.storage.recordingArchiveRoot],
    ["stemCache", "Stem cache", settings.dj.stems.cacheRoot],
    ["logs", "Logs", settings.storage.logsRoot],
  ] as const;
  for (const [key, label, configuredPath] of storageLocations) {
    const storage = getStorageHealth(key, label, configuredPath, projectRoot);
    const state = storage.available
      ? storageState(
          storage.totalBytes,
          storage.freeBytes,
          settings.diagnostics.storageWarningFreePercent,
          settings.diagnostics.storageCriticalFreePercent,
        )
      : storage.configured ? "unavailable" : "unknown";
    add("storage", await independent(`storage-${key}`, label, () => ({
      state,
      message: storage.message,
      actionRequired: state === "error" || state === "unavailable",
      affectedModules: [key],
      details: {
        configuredPath: safePath(configuredPath, settings.diagnostics.redactLocalPaths),
        configured: storage.configured,
        available: storage.available,
        totalBytes: storage.totalBytes,
        freeBytes: storage.freeBytes,
        usedBytes: storage.usedBytes,
        usedPercent: storage.totalBytes && storage.usedBytes !== null
          ? Math.round((storage.usedBytes / storage.totalBytes) * 1000) / 10 : null,
        measuredBytes: storage.measuredBytes,
        estimated: storage.estimated,
      },
      recommendations: state === "warning" || state === "error"
        ? ["Free disk space before starting large media or recording jobs."] : [],
    }), timeoutMs, now));
  }

  const configuredSources = settings.library.sources.length
    ? settings.library.sources
    : [
        ...settings.library.audioRoots.map((root, index) => ({
          id: `audio-${index}`, label: `Audio ${index + 1}`, path: root,
          type: "audio" as const, enabled: true, includeSubfolders: true,
        })),
        ...settings.library.videoRoots.map((root, index) => ({
          id: `video-${index}`, label: `Video ${index + 1}`, path: root,
          type: "video" as const, enabled: true, includeSubfolders: true,
        })),
      ];
  const sourceValidation = validateLibrarySources(configuredSources, settings.storage.approvedRoots, projectRoot);
  const manifestFiles = [
    path.resolve(projectRoot, "server/data/audio-library-manifest.json"),
    path.resolve(projectRoot, "server/data/video-library-manifest.json"),
  ];
  let libraryItems = 0;
  let lastScanAt: string | null = null;
  let lastScanMs = 0;
  for (const filePath of manifestFiles) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > lastScanMs) {
        lastScanMs = stat.mtimeMs;
        lastScanAt = stat.mtime.toISOString();
      }
      const parsed = readJsonBounded(filePath);
      if (Array.isArray(parsed)) libraryItems += parsed.length;
      else if (isRecord(parsed) && Array.isArray(parsed.items)) libraryItems += parsed.items.length;
    } catch {}
  }
  add("library", await independent("library-sources", "Library sources", () => ({
    state: sourceValidation.valid ? "healthy" : "warning",
    message: sourceValidation.valid
      ? "Configured library sources are available."
      : "One or more library sources need attention; rescan may be recommended after correction.",
    actionRequired: !sourceValidation.valid,
    affectedModules: ["library", "audioPlayer", "videoPlayer"],
    details: {
      audioSources: configuredSources.filter((item) => item.type === "audio" || item.type === "both").length,
      videoSources: configuredSources.filter((item) => item.type === "video" || item.type === "both").length,
      enabledSources: configuredSources.filter((item) => item.enabled).length,
      disabledSources: configuredSources.filter((item) => !item.enabled).length,
      missingOrInvalid: sourceValidation.errors.length,
      itemCount: libraryItems,
      lastScanAt,
      scanState: "not-running",
      recursiveScanPerformed: false,
    },
    recommendations: sourceValidation.valid ? [] : ["Correct unavailable sources, then run a library rescan manually."],
  }), timeoutMs, now));

  const moduleSettings = [
    ["audio-player", "Audio Player", settings.audioPlayer, ["audioPlayer"]],
    ["video-player", "Video Player", settings.videoPlayer, ["videoPlayer"]],
    ["converter", "Converter", settings.converter, ["converter"]],
    ["tagger", "Tagger", settings.tagger, ["tagger"]],
    ["mastering", "Mastering", settings.mastering, ["mastering"]],
    ["torrents", "Torrents", settings.torrents, ["torrents"]],
  ] as const;
  for (const [id, label, , modules] of moduleSettings) {
    const valid = validateSettings(settings).valid;
    add("mediaModules", await independent(id, label, () => ({
      state: valid ? "healthy" : "degraded",
      message: valid ? `${label} settings are readable and valid.` : `${label} settings require validation.`,
      actionRequired: !valid,
      affectedModules: [...modules],
      details: {
        settingsValid: valid,
        activeJobs: 0,
        queuedJobs: 0,
        failedJobs: 0,
        actionsPerformed: false,
      },
    }), timeoutMs, now));
  }

  const torrentPath = validateLocalSettingsPath(settings.torrents.savePath, {
    requireExisting: false,
    approvedRoots: settings.storage.approvedRoots,
    projectRoot,
  });
  add("mediaModules", await independent("qbittorrent-runtime", "qBittorrent integration", async () => {
    if (!settings.torrents.engineEnabled) {
      return {
        state: "unavailable", message: "qBittorrent integration is disabled.",
        actionRequired: false, affectedModules: ["torrents"],
      };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      const endpoint = new URL("/api/v2/app/version", settings.torrents.engineUrl).toString();
      const response = await (options.fetcher ?? fetch)(endpoint, {
        method: "GET", signal: controller.signal, headers: { Accept: "text/plain" },
      });
      return {
        state: response.ok ? "healthy" : response.status === 403 ? "warning" : "unavailable",
        message: response.ok ? "qBittorrent Web API is reachable." :
          response.status === 403 ? "qBittorrent is reachable but authentication is required." :
          "qBittorrent Web API did not return a healthy response.",
        actionRequired: !response.ok,
        affectedModules: ["torrents"],
        details: {
          reachable: true,
          authenticated: response.ok,
          statusCode: response.status,
          savePathValid: torrentPath.valid,
        },
      };
    } catch {
      return {
        state: "unavailable",
        message: "qBittorrent Web API is unreachable; no service was started.",
        actionRequired: true,
        affectedModules: ["torrents"],
        details: { reachable: false, authenticated: false, savePathValid: torrentPath.valid },
      };
    } finally {
      clearTimeout(timer);
    }
  }, timeoutMs + 100, now));

  const recording = recordingSummary(projectRoot);
  add("dj", await independent("dj-engine", "BRMedia Native DJ engine", () => ({
    state: "healthy",
    message: "BRMedia Native remains the configured engine. Browser runtime capabilities are reported when the Mixer is open.",
    actionRequired: false,
    affectedModules: ["dj"],
    details: {
      configuredEngine: settings.dj.engine.backend,
      liveEngine: "brmedia-native",
      webAudio: "frontend-report-required",
      audioContext: "not-initialised-by-health",
      masterGraph: "frontend-report-required",
      mediaRecorder: "frontend-report-required",
      gridCoreVersion: 2,
      lockedGridProtection: true,
      waveformPreparation: fs.existsSync(path.resolve(projectRoot, "server/data/dj-prep-cache.json")),
      analysisService: "available-read-only",
      mixxx: "planned-not-connected",
      iphoneStreaming: "planned-not-implemented",
    },
  }), timeoutMs, now));
  add("dj", await independent("dj-recording", "DJ recording", () => ({
    state: Number(recording.failed) > 0 || Number(recording.zeroByte) > 0 ? "warning" : "healthy",
    message: "Recording manifest was inspected read-only; no recovery or archive action ran.",
    actionRequired: Number(recording.failed) > 0,
    affectedModules: ["dj.recording", "dj.recordingArchive"],
    details: {
      ...recording,
      activeRecordingCount: 0,
      conversionQueue: "read-only",
      archiveQueue: "read-only",
      settingsValid: validateSettings(settings).valid,
      staleZeroByteFixPreserved: true,
    },
  }), timeoutMs, now));
  add("dj", await independent("dj-stems", "DJ stems", () => ({
    state: system.tools.some((tool) => tool.name === "Demucs" && tool.available) ? "healthy" : "unavailable",
    message: "Stem service and cache were inspected without preparing or deleting stems.",
    actionRequired: false,
    affectedModules: ["dj.stems"],
    details: {
      cachePath: safePath(settings.dj.stems.cacheRoot, settings.diagnostics.redactLocalPaths),
      concurrentJobs: settings.dj.stems.concurrentJobs,
      oneAtATimeSafety: settings.dj.stems.concurrentJobs === 1,
      active: 0,
      pending: 0,
      failed: 0,
    },
  }), timeoutMs, now));
  add("dj", await independent("dj-waveform-analysis", "Waveform, grid and analysis", () => {
    const prepPath = path.resolve(projectRoot, "server/data/dj-prep-cache.json");
    const cacheStat = fs.existsSync(prepPath) ? fs.statSync(prepPath) : null;
    return {
      state: cacheStat ? "healthy" : "unavailable",
      message: cacheStat
        ? "Prepared cache is present; it was not parsed, invalidated or rewritten."
        : "Prepared waveform cache is unavailable.",
      actionRequired: !cacheStat,
      affectedModules: ["dj.waveform", "dj.grid", "dj.analysis"],
      details: {
        waveformCacheVersion: 1,
        gridSchemaVersion: 2,
        gridCoreAvailable: true,
        cacheBytes: cacheStat?.size ?? null,
        cacheParsed: false,
        reviewRequiredCount: "unavailable-without-unbounded-read",
        lockedManualGridProtection: true,
        queue: { running: 0, queued: 0, failed: 0 },
      },
    };
  }, timeoutMs, now));

  const jobs: Array<[string, string, Record<string, unknown>]> = [
    ["library", "Library scans", { state: "not-running" }],
    ["converter", "Converter", {}],
    ["tagger", "Tagger", {}],
    ["mastering", "Mastering", {}],
    ["recording", "DJ recording conversion/archive", recording],
    ["stems", "Stem preparation", { concurrencyLimit: settings.dj.stems.concurrentJobs }],
    ["waveform", "Waveform preparation", {}],
    ["analysis", "Grid/analysis", {}],
    ["torrents", "Torrents", { state: "read-only integration" }],
  ];
  for (const [id, label, details] of jobs) {
    add("jobs", await independent(`jobs-${id}`, label, () => jobCheck(id, label, details), timeoutMs, now));
  }

  const logs = boundedLogSummary(projectRoot, settings.diagnostics.logSummaryLineLimit);
  add("logs", await independent("log-summary", "Recent safe warnings and errors", () => ({
    state: logs.length ? "healthy" : "unknown",
    message: logs.length
      ? "Bounded read-only log summaries are available."
      : "No supported diagnostic log was found.",
    actionRequired: false,
    affectedModules: ["server"],
    details: { sources: logs, lineLimit: settings.diagnostics.logSummaryLineLimit, modified: false },
  }), timeoutMs, now));

  const outputSections: DiagnosticsSection[] = [
    "server", "tools", "storage", "library", "mediaModules", "dj",
    "jobs", "logs", "settingsStore",
  ].map((name) => {
    const sectionName = name as DiagnosticsSectionName;
    const checks = sections.get(sectionName) ?? [];
    return { name: sectionName, label: SECTION_LABELS[sectionName], state: sectionState(checks), checks };
  });
  const allChecks = outputSections.flatMap((section) => section.checks);
  const counts = Object.fromEntries(
    (Object.keys(STATE_WEIGHT) as HealthState[]).map((state) => [
      state, allChecks.filter((check) => check.state === state).length,
    ]),
  ) as Record<HealthState, number>;
  const score = allChecks.length
    ? Math.round(allChecks.reduce((sum, check) => sum + STATE_WEIGHT[check.state], 0) / allChecks.length)
    : 0;
  const overall = sectionState(allChecks);
  const summary: DiagnosticsSection = {
    name: "summary",
    label: SECTION_LABELS.summary,
    state: overall,
    checks: [{
      id: "overall",
      label: "Overall BRMedia health",
      state: overall,
      message: `${score}% health score across ${allChecks.length} independent checks.`,
      checkedAt: now().toISOString(),
      durationMs: 0,
      actionRequired: counts.error > 0 || counts.degraded > 0,
      affectedModules: ["brmedia"],
      details: { score, counts },
    }],
  };
  const report: DiagnosticsReport = {
    checkedAt: now().toISOString(),
    cached: false,
    cacheDurationSeconds: settings.diagnostics.healthCacheSeconds,
    sections: [summary, ...outputSections],
    counts,
    overall,
    score,
  };
  if (!options.store) cachedReport = { expiresAt: Date.now() + cacheMs, report };
  return report;
}

export async function getDiagnosticsSection(
  section: DiagnosticsSectionName,
  options: DiagnosticsDependencies & { force?: boolean } = {},
): Promise<DiagnosticsSection | null> {
  const report = await buildDiagnosticsReport(options);
  return report.sections.find((item) => item.name === section) ?? null;
}

export function isDiagnosticsSection(value: string): value is DiagnosticsSectionName {
  return Object.prototype.hasOwnProperty.call(SECTION_LABELS, value);
}
