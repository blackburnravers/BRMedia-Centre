import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type StatsEvent = {
  id: string;
  module: string;
  type: string;
  title: string;
  entityType: string;
  entityId: string;
  source: string;
  route: string;
  status: string;
  profileId: string;
  position: number;
  duration: number;
  value: number;
  count: number;
  at: number;
  extra?: Record<string, unknown>;
};

const STATS_EVENTS_PATH = path.resolve(__dirname, "..", "data", "stats-events.jsonl");
const MAX_EVENT_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EVENT_LINES = 12000;

function ensureStatsEventsDir() {
  fs.mkdirSync(path.dirname(STATS_EVENTS_PATH), { recursive: true });
}

function cleanText(value: unknown, max = 180) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function safeNumber(value: unknown, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
}

function cleanExtra(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const output: Record<string, unknown> = {};

  Object.entries(value as Record<string, unknown>)
    .slice(0, 20)
    .forEach(([key, item]) => {
      const safeKey = cleanText(key, 60);
      if (!safeKey) return;

      if (typeof item === "number" || typeof item === "boolean") {
        output[safeKey] = item;
        return;
      }

      if (typeof item === "string") {
        output[safeKey] = cleanText(item, 240);
      }
    });

  return Object.keys(output).length ? output : undefined;
}

export function normaliseStatsEvent(input: any, fallbackModule = "server"): StatsEvent | null {
  if (!input || typeof input !== "object") return null;

  const module = cleanText(input.module || fallbackModule || "server", 48) || "server";
  const type = cleanText(input.type || input.event || "event", 64) || "event";

  const entityId = cleanText(
    input.entityId ||
    input.trackId ||
    input.videoId ||
    input.jobId ||
    input.id ||
    "",
    180
  );

  const entityType = cleanText(
    input.entityType ||
    (input.trackId ? "audio" : input.videoId ? "video" : ""),
    48
  );

  return {
    id:
      cleanText(input.id, 120) ||
      `stats_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
    module,
    type,
    title: cleanText(
      input.title ||
      input.name ||
      input.sourceTitle ||
      input.fileName ||
      "",
      240
    ),
    entityType,
    entityId,
    source: cleanText(input.source || "", 100),
    route: cleanText(input.route || "", 140),
    status: cleanText(input.status || "", 80),
    profileId: cleanText(input.profileId || "", 160),
    position: Math.max(0, safeNumber(input.position)),
    duration: Math.max(0, safeNumber(input.duration)),
    value: safeNumber(input.value),
    count: Math.max(1, Math.round(safeNumber(input.count, 1))),
    at: Math.max(0, safeNumber(input.at, Date.now())) || Date.now(),
    extra: cleanExtra(input.extra),
  };
}

function trimStatsEventsIfNeeded() {
  try {
    if (!fs.existsSync(STATS_EVENTS_PATH)) return;
    if (fs.statSync(STATS_EVENTS_PATH).size <= MAX_EVENT_FILE_BYTES) return;

    const lines = fs
      .readFileSync(STATS_EVENTS_PATH, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-MAX_EVENT_LINES);

    fs.writeFileSync(
      STATS_EVENTS_PATH,
      lines.length ? `${lines.join("\n")}\n` : "",
      "utf8"
    );
  } catch {}
}

function readStatsEventLines(limit = 5000) {
  try {
    if (!fs.existsSync(STATS_EVENTS_PATH)) return [] as StatsEvent[];

    const safeLimit = Math.max(
      1,
      Math.min(MAX_EVENT_LINES, Number(limit || 5000))
    );

    return fs
      .readFileSync(STATS_EVENTS_PATH, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-safeLimit)
      .map((line: string) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as StatsEvent[];
  } catch {
    return [] as StatsEvent[];
  }
}

export function getStatsEventsStatus() {
  const relativePath = "server/data/stats-events.jsonl";

  if (!fs.existsSync(STATS_EVENTS_PATH)) {
    return {
      ok: true,
      exists: false,
      path: relativePath,
      sizeBytes: 0,
      totalLines: 0,
      validLines: 0,
      malformedLines: 0,
      maxFileBytes: MAX_EVENT_FILE_BYTES,
      maxLines: MAX_EVENT_LINES,
      checkedAt: Date.now(),
      lastEvent: null as StatsEvent | null,
    };
  }

  try {
    const stat = fs.statSync(STATS_EVENTS_PATH);
    const lines = fs
      .readFileSync(STATS_EVENTS_PATH, "utf8")
      .split(/\r?\n/)
      .filter(Boolean);

    let validLines = 0;
    let malformedLines = 0;
    let lastEvent: StatsEvent | null = null;

    lines.forEach((line) => {
      try {
        const parsed = JSON.parse(line);

        if (!parsed || typeof parsed !== "object") {
          malformedLines += 1;
          return;
        }

        validLines += 1;
        lastEvent = parsed as StatsEvent;
      } catch {
        malformedLines += 1;
      }
    });

    return {
      ok: malformedLines === 0,
      exists: true,
      path: relativePath,
      sizeBytes: stat.size,
      totalLines: lines.length,
      validLines,
      malformedLines,
      maxFileBytes: MAX_EVENT_FILE_BYTES,
      maxLines: MAX_EVENT_LINES,
      checkedAt: Date.now(),
      lastEvent,
    };
  } catch (err: any) {
    return {
      ok: false,
      exists: true,
      path: relativePath,
      sizeBytes: 0,
      totalLines: 0,
      validLines: 0,
      malformedLines: 0,
      maxFileBytes: MAX_EVENT_FILE_BYTES,
      maxLines: MAX_EVENT_LINES,
      checkedAt: Date.now(),
      lastEvent: null as StatsEvent | null,
      error: cleanText(
        err?.message ||
        err ||
        "Unable to inspect Stats event log",
        240
      ),
    };
  }
}

export function appendStatsEvents(input: any, fallbackModule = "server") {
  const rawEvents: any[] = Array.isArray(input?.events)
    ? input.events
    : Array.isArray(input)
      ? input
      : [input];

  const events = rawEvents
    .map((event: any) => normaliseStatsEvent(event, fallbackModule))
    .filter(Boolean) as StatsEvent[];

  if (!events.length) {
    return {
      ok: true,
      saved: 0,
      events: [] as StatsEvent[],
    };
  }

  ensureStatsEventsDir();

  fs.appendFileSync(
    STATS_EVENTS_PATH,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    "utf8"
  );

  trimStatsEventsIfNeeded();

  return {
    ok: true,
    saved: events.length,
    events,
  };
}

export function appendStatsEvent(type: string, module: string, payload: any = {}) {
  return appendStatsEvents(
    {
      ...payload,
      type,
      module,
    },
    module
  ).events[0] || null;
}

export function appendStatsEventOnce(
  type: string,
  module: string,
  payload: any = {},
  dedupeWindowMs = 30 * 24 * 60 * 60 * 1000
) {
  const entityId = cleanText(
    payload?.entityId ||
    payload?.trackId ||
    payload?.videoId ||
    payload?.jobId ||
    "",
    180
  );

  const since = Date.now() - Math.max(0, Number(dedupeWindowMs || 0));

  const duplicate = readStatsEventLines(MAX_EVENT_LINES).some((event) => (
    event.type === type &&
    event.module === module &&
    event.entityId === entityId &&
    event.at >= since
  ));

  if (duplicate) return null;

  return appendStatsEvent(type, module, payload);
}

export function readRecentStatsEvents(limit = 250) {
  return readStatsEventLines(limit).reverse();
}

function eventWeight(event: StatsEvent) {
  return Math.max(1, Number(event.count || 1));
}

function countBy(items: StatsEvent[], getter: (event: StatsEvent) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = cleanText(getter(item), 120) || "unknown";

    counts.set(
      key,
      (counts.get(key) || 0) + eventWeight(item)
    );
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function topEntities(
  items: StatsEvent[],
  entityType: string,
  wantedTypes: string[]
) {
  const counts = new Map<
    string,
    {
      label: string;
      value: number;
      entityId: string;
    }
  >();

  items.forEach((event) => {
    if (
      event.entityType !== entityType ||
      !wantedTypes.includes(event.type)
    ) {
      return;
    }

    const key = event.entityId || event.title;
    if (!key) return;

    const existing = counts.get(key) || {
      label: event.title || key,
      value: 0,
      entityId: event.entityId || "",
    };

    existing.value += eventWeight(event);
    counts.set(key, existing);
  });

  return Array.from(counts.values())
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 12);
}

function buildDailyTimeline(items: StatsEvent[], days = 14) {
  const now = new Date();

  const rows: {
    label: string;
    value: number;
    at: number;
  }[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);

    const start = date.getTime();
    const end = start + 24 * 60 * 60 * 1000;

    rows.push({
      label: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      value: items
        .filter((event) => event.at >= start && event.at < end)
        .reduce((sum, event) => sum + eventWeight(event), 0),
      at: start,
    });
  }

  return rows;
}

export function buildStatsEventsSummary(limit = 5000, profileId = "") {
  const allEvents = readStatsEventLines(limit);

  const events = profileId
    ? allEvents.filter((event) => event.profileId === profileId)
    : allEvents;

  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;

  const countType = (...wanted: string[]) =>
    events
      .filter((event) => wanted.includes(event.type))
      .reduce((sum, event) => sum + eventWeight(event), 0);

  return {
    ok: true,
    profileId,
    total: events.reduce((sum, event) => sum + eventWeight(event), 0),

    today: events
      .filter((event) => event.at >= todayStart)
      .reduce((sum, event) => sum + eventWeight(event), 0),

    last7Days: events
      .filter((event) => event.at >= weekStart)
      .reduce((sum, event) => sum + eventWeight(event), 0),

    modules: countBy(events, (event) => event.module),
    types: countBy(events, (event) => event.type),

    timeline: buildDailyTimeline(events, 14),

    topAudio: topEntities(
      events,
      "audio",
      ["play", "ended", "favourite_add"]
    ),

    topVideo: topEntities(
      events,
      "video",
      ["play", "ended", "favourite_add"]
    ),

    metrics: {
      audioPlays: events
        .filter((event) => event.module === "player" && event.type === "play")
        .reduce((sum, event) => sum + eventWeight(event), 0),

      audioCompleted: events
        .filter((event) => event.module === "player" && event.type === "ended")
        .reduce((sum, event) => sum + eventWeight(event), 0),

      videoPlays: events
        .filter((event) => event.module === "video" && event.type === "play")
        .reduce((sum, event) => sum + eventWeight(event), 0),

      videoCompleted: events
        .filter((event) => event.module === "video" && event.type === "ended")
        .reduce((sum, event) => sum + eventWeight(event), 0),

      favouriteAdds: countType("favourite_add"),
      favouriteRemoves: countType("favourite_remove"),
      audioSkips: countType("skip_next", "skip_previous"),
      audioSeeks: events
        .filter((event) => event.module === "player" && event.type === "seek")
        .reduce((sum, event) => sum + eventWeight(event), 0),
      videoSeeks: events
        .filter((event) => event.module === "video" && event.type === "seek")
        .reduce((sum, event) => sum + eventWeight(event), 0),
      bookmarkAdds: countType("bookmark_add"),
      bookmarkRemoves: countType("bookmark_remove", "bookmark_clear"),
      playlistCreates: countType("playlist_create"),
      playlistImports: countType("playlist_import"),
      playlistRenames: countType("playlist_rename"),
      playlistDeletes: countType("playlist_delete"),
      playlistTrackAdds: countType("playlist_track_add"),
      playlistTrackRemoves: countType("playlist_track_remove"),
      videoPartSwitches: countType("part_switch", "part_autoplay"),
      videoCopyCompleted: countType("mp4_copy_done"),
      videoCopyErrors: countType("mp4_copy_error"),
      videoCopyCancelled: countType("mp4_copy_cancelled"),
      queueAdds: countType("queue_add"),
      queueRemoves: countType("queue_remove"),
      queueClears: countType("queue_clear"),
      deviceHandoffs: countType("device_handoff", "send_to_device"),
      profileLogins: countType("profile_login"),
      profileSyncs: countType("profile_sync"),
      uploads: countType("media_upload"),
      importCompleted: countType("direct_import_done", "cloud_import_done"),
      importFailed: countType("direct_import_error", "cloud_import_error"),
      importCancelled: countType("direct_import_cancelled"),
      torrentAdds: countType("torrent_add", "torrent_upload"),
      torrentCompleted: countType("torrent_download_done"),
      torrentTransfers: countType("torrent_transfer_done"),
      torrentTransferErrors: countType("torrent_transfer_error"),
      converterJobs: countType("converter_job_started"),
      converterCompleted: countType("converter_job_done"),
      converterErrors: countType("converter_job_error"),
      converterCancelled: countType("converter_job_cancelled"),
      masteringJobs: countType("mastering_job_started"),
      masteringCompleted: countType("mastering_job_done"),
      masteringErrors: countType("mastering_job_error"),
      masteringCancelled: countType("mastering_job_cancelled"),
      taggerSaves: countType("tagger_tags_saved", "tagger_copy_written"),
      torrentScans: countType("torrent_scan_done", "torrent_scan_warning"),
      torrentScanWarnings: countType("torrent_scan_warning"),
      defenderScans: countType("defender_scan_done", "defender_scan_warning"),
      defenderWarnings: countType("defender_scan_warning"),
      torrentNotifications: countType("torrent_notification"),
      quarantineAdds: countType("quarantine_add"),
      quarantineRestores: countType("quarantine_restore"),
      quarantineDeletes: countType("quarantine_delete"),
      backupExports: countType("backup_export"),
      backupRestores: countType("backup_restore"),
      audioRescans: countType("audio_rescan"),
      videoRescans: countType("video_rescan"),
      videoMetadataRebuilds: countType("video_metadata_rebuild"),
      waveformJobs: countType("waveform_job_started"),
      waveformCompleted: countType("waveform_job_done"),
      waveformGenerated: events
        .filter((event) => event.type === "waveform_job_done")
        .reduce((sum, event) => sum + Math.max(0, Number(event.value || 0)), 0),
      waveformFailures: countType("waveform_job_error"),
      waveformCacheClears: countType("waveform_cache_clear"),
      waveformFailedClears: countType("waveform_failed_clear"),
      serverStarts: countType("server_started"),
      watchdogRecoveries: countType("watchdog_recovery"),
      watchdogHealthRecoveries: countType("watchdog_health_recovered"),
      recordedFailures: countType(
        "direct_import_error",
        "cloud_import_error",
        "torrent_transfer_error",
        "converter_job_error",
        "mastering_job_error",
        "torrent_scan_warning",
        "defender_scan_warning",
        "quarantine_error",
        "waveform_job_error"
      ),
      recordedCancellations: countType(
        "direct_import_cancelled",
        "converter_job_cancelled",
        "mastering_job_cancelled"
      ),
    },

    recent: [...events]
      .slice(-120)
      .reverse(),
  };
}

export function buildProfileStatsSummary(profileId: string, limit = 5000) {
  return buildStatsEventsSummary(limit, cleanText(profileId, 160));
}