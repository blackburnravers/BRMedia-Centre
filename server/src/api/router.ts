import fs from "node:fs";
import path from "node:path";
import * as mm from "music-metadata";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "../utils/json";
import { streamFileWithRange } from "../streaming/rangeStream";
import { MixxxWorkflowStore } from "../mixxxWorkflow";
import { MixxxLoadCompatibilityProvider } from "../mixxxLoadCompatibility";
import { mixxxMidiBridge } from "../mixxxBridge";
import {
  listLibrary,
  listHiddenAudioLibraryItems,
  getHiddenAudioLibraryItem,
  addLocalFileToLibraryWithMetadata,
  backfillMissingAudioLibraryMetadata,
  refreshAudioLibraryItemMetadata,
  saveAudioLibraryDjPrep,
  clearAudioLibraryDjPerformanceMetadata,
  restoreHiddenAudioLibraryItem,
  hideLibraryItem,
  isSupportedAudioFile,
  findLibraryItemByLocator,
  getLibraryItem,
  removeLibraryItem,
  syncAudioLibraryFromRoots,
} from "../db/library";
import {
  DEFAULT_WAVEFORM_PEAKS,
  generateWaveformsForTracks,
  getWaveformJobSnapshot,
  normaliseWaveformPeakCount,
  queueWaveformGenerationForItems,
  startWaveformGenerationJob,
  getWaveformJobForTrack,
  deleteWaveformCacheForFile,
  getWaveformCacheHealth,
  getWaveformFailedTrackIds,
  clearWaveformFailedTrackIds,
  clearWaveformCacheForTracks,
  getExistingWaveformCache,
  getWaveformPreparedAssetRegistration,
} from "../waveforms";
import { validateLocalPathAllowed } from "../sources/local/validateLocalPathAllowed";
import { handleCloudRoute } from "../cloud";
import { handleLinkImportRoute } from "../linkImports";
import { getEnabledLibrarySourcePaths } from "../librarySources";
import { appendStatsEvent } from "../statsEvents";
import { handleDjStemsRoute } from "../djStems";
import { handleDjRecordingRoute } from "../djRecording";
import { handleSettingsRoute } from "../settings/routes";
import { handleMixxxMidiRoute } from "../mixxxBridge";
import {
  DJ_ANALYSIS_GENERATION,
  DJ_ANALYSIS_PRODUCTION_APPROVAL,
  djAnalysisQueue,
} from "../djAnalysisQueue";
import { analysisDetails, analysisSummary, appendAnalysisHistory } from "../djM11Integration";
import {
  LibraryCatalogueQueryError,
  LibraryCatalogueQueryService,
  parseLibraryCatalogueQuery,
} from "../libraryCatalogue";
import { getUploadSessionService, handleUploadSessionRoute } from "../uploadSessions";
import { createM22RouteHandler } from "../m22CollectionsSetPlans";
import {
  MixxxCatalogueError,
  MixxxCatalogueProvider,
  parseMixxxCatalogueQuery,
} from "../mixxxCatalogue";
import { m25GridQueue, readM25Grid } from "../mixxxM25Grid";

const libraryCatalogueQueryService = new LibraryCatalogueQueryService();
const uploadSessionService = getUploadSessionService();
const mixxxCatalogueProvider = new MixxxCatalogueProvider();
const handleM22Route = createM22RouteHandler();
const mixxxWorkflowStore = new MixxxWorkflowStore();
const mixxxLoadProvider = new MixxxLoadCompatibilityProvider(
  (identity) => mixxxCatalogueProvider.resolveTrack(identity),
  process.env.BRMEDIA_MIXXX_MUSIC_ROOT || "H:\\Music",
  "2.5.6-m23-compatibility",
  "engine-load-track-v1",
  (deck, canonicalPath, request) => mixxxMidiBridge.sendM23Load(deck, canonicalPath, request.requestId, request.replacePlayingDeck),
);
let mixxxLoadFeedbackSequence = 0;
mixxxMidiBridge.onLoadFeedback((feedback) => {
  if (feedback.state === "accepted") mixxxLoadProvider.accept(feedback.requestId, feedback.deck, feedback.sessionEpoch);
  else if (feedback.state === "loaded") {
    try {
      const pending = mixxxLoadProvider.status(feedback.deck);
      if (pending?.requestId === feedback.requestId && pending.stableIdentity &&
        mixxxLoadProvider.confirmLoaded(feedback.deck, feedback.requestId, pending.stableIdentity,
          feedback.sessionEpoch, ++mixxxLoadFeedbackSequence)) {
        const track = mixxxCatalogueProvider.resolveTrack(pending.stableIdentity);
        const association = findLibraryItemByLocator(track.filePath);
        mixxxMidiBridge.attachLoadedIdentity(feedback.deck, {
          stableIdentity: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          genre: track.genre,
          filename: track.filename,
          artworkUrl: `/api/dj/mixxx/catalogue/${encodeURIComponent(track.id)}/artwork`,
          waveformAssociation: association ? {
            brmediaTrackId: association.id,
            waveformAvailable: association.djWaveformPrepared === true,
            gridAvailable: Number.isFinite(Number(association.djGridBpm)),
          } : null,
        });
      }
    } catch {
      mixxxLoadProvider.fail(feedback.requestId, feedback.deck, feedback.sessionEpoch);
    }
  } else mixxxLoadProvider.fail(feedback.requestId, feedback.deck, feedback.sessionEpoch, feedback.state === "rejected-playing");
});
mixxxMidiBridge.onDeckUnload((deck) => mixxxLoadProvider.unload(deck));

function currentMixxxLoadCapabilities(bridge = mixxxMidiBridge.status()) {
  const runtimeSupported = bridge.arbitraryLoadSupported === true && bridge.effectiveBackend === "mixxx" &&
    bridge.connected === true && bridge.protocolCompatible === true && bridge.heartbeatHealthy === true && bridge.stale !== true;
  return {
    ...mixxxLoadProvider.capabilities,
    arbitraryPathLoad: mixxxLoadProvider.capabilities.arbitraryPathLoad && runtimeSupported,
    deckSpecificLoad: mixxxLoadProvider.capabilities.deckSpecificLoad && runtimeSupported,
    acknowledgement: mixxxLoadProvider.capabilities.acknowledgement && runtimeSupported,
    loadedIdentityFeedback: runtimeSupported,
    supported: mixxxLoadProvider.capabilities.supported && runtimeSupported,
    reason: runtimeSupported ? null : "The running Mixxx runtime or controller mapping does not advertise the M23 arbitrary-load capability.",
  };
}

function getTrackSidecarPaths(filePath: string) {
  const parsed = path.parse(filePath);
  return [
    path.join(parsed.dir, `${parsed.name}.txt`),
    path.join(parsed.dir, `${parsed.name}.cue`),
    path.join(parsed.dir, `${parsed.name}.tracklist.json`),
  ];
}

function getConfiguredAudioLibraryRoots() {
  return getEnabledLibrarySourcePaths("audio");
}

export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  cfg: { localAllowedBases: string[] }
): Promise<boolean> {
  const uploadHandled = await handleUploadSessionRoute(req, res, url, uploadSessionService);
  if (uploadHandled) return true;

  const m22Handled = await handleM22Route(req, res, url);
  if (m22Handled) return true;

  if (req.method === "GET" && url.pathname === "/api/dj/mixxx/catalogue") {
    try {
      const result = mixxxCatalogueProvider.query(parseMixxxCatalogueQuery(url.searchParams), listLibrary());
      res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
      return json(res, 200, result);
    } catch (error) {
      if (error instanceof MixxxCatalogueError) {
        return json(res, error.status, { error: error.message, code: error.code });
      }
      throw error;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/dj/mixxx/load/capabilities") {
    mixxxLoadProvider.expire();
    return json(res, 200, { capabilities: currentMixxxLoadCapabilities(), pending: mixxxLoadProvider.status() });
  }
  if (req.method === "POST" && url.pathname === "/api/dj/mixxx/load") {
    const body = await readJsonBody(req).catch(() => null);
    if (!body) return json(res, 400, { error: "Invalid load request" });
    try {
      const bridge = mixxxMidiBridge.status();
      if (Number.isSafeInteger(bridge.sessionEpoch) && bridge.sessionEpoch > 0) mixxxLoadProvider.beginSession(bridge.sessionEpoch);
      const deck = body.deck === 1 || body.deck === 2 ? body.deck : 1;
      const deckState = deck === 1 ? bridge.deck1 : bridge.deck2;
      const acknowledgement = mixxxLoadProvider.submit(body, {
        bridgeHealthy: bridge.effectiveBackend === "mixxx" && bridge.connected && bridge.protocolCompatible && bridge.heartbeatHealthy && !bridge.stale,
        nativePlaybackActive: bridge.nativePlaybackActive === true,
        deckPlaying: deckState?.playing === true,
        sessionEpoch: bridge.sessionEpoch,
        runtimeLoadSupported: bridge.arbitraryLoadSupported === true,
      });
      return json(res, acknowledgement.accepted ? 202 : acknowledgement.errorCode === "UNSUPPORTED_RUNTIME" ? 409 : 400, { acknowledgement, capabilities: currentMixxxLoadCapabilities(bridge) });
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : "Invalid load request" });
    }
  }

  const mixxxTrackMatch = url.pathname.match(/^\/api\/dj\/mixxx\/catalogue\/(mixxx%3A|mixxx:)(\d+)(\/(download|artwork))?$/i);
  if (mixxxTrackMatch && (req.method === "GET" || req.method === "HEAD")) {
    try {
      const track = mixxxCatalogueProvider.resolveTrack(`mixxx:${mixxxTrackMatch[2]}`);
      if (mixxxTrackMatch[4] === "artwork") {
        const metadata = await mm.parseFile(track.filePath, { duration: false, skipCovers: false });
        const picture = metadata.common.picture?.[0];
        if (!picture?.data?.length || picture.data.length > 10 * 1024 * 1024) {
          return json(res, 404, { error: "Artwork is unavailable for this Mixxx identity", code: "MIXXX_ARTWORK_UNAVAILABLE" });
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", /^image\//i.test(picture.format) ? picture.format : "image/jpeg");
        res.setHeader("Content-Length", String(picture.data.length));
        res.setHeader("Cache-Control", "private, max-age=300");
        if (req.method === "HEAD") res.end(); else res.end(picture.data);
        return true;
      }
      if (mixxxTrackMatch[4] === "download") {
        if (!fs.existsSync(track.filePath) || !fs.statSync(track.filePath).isFile()) {
          return json(res, 404, { error: "Original Mixxx track file is unavailable", code: "MIXXX_FILE_UNAVAILABLE" });
        }
        streamFileWithRange(req, res, track.filePath, {
          asAttachment: true,
          downloadName: track.filename || path.basename(track.filePath),
          cacheControl: "private, no-store",
        });
        return true;
      }
      const { filePath: _privateCanonicalPath, ...publicTrack } = track;
      res.setHeader("Cache-Control", "private, max-age=5");
      return json(res, 200, { track: publicTrack, loading: currentMixxxLoadCapabilities() });
    } catch (error) {
      if (error instanceof MixxxCatalogueError) return json(res, error.status, { error: error.message, code: error.code });
      throw error;
    }
  }

  const mixxxWaveformMatch = url.pathname.match(/^\/api\/dj\/mixxx\/waveform\/(mixxx%3A|mixxx:)(\d+)$/i);
  if (mixxxWaveformMatch && req.method === "GET") {
    try {
      const identity = `mixxx:${mixxxWaveformMatch[2]}`;
      const track = mixxxCatalogueProvider.resolveTrack(identity);
      const association = findLibraryItemByLocator(track.filePath);
      if (!association) return json(res, 404, {
        state: "available", identity, waveform: null, grid: null,
        prepareAction: { available: false, hook: "prepare-waveform" },
      });
      const payload = getExistingWaveformCache(association.locator);
      if (!payload) {
        const job = getWaveformJobForTrack(association.id);
        const item = job?.items.find((candidate) => candidate.id === association.id);
        const state = job?.status === "queued" ? "queued"
          : job?.status === "running" ? "preparing"
            : item?.status === "failed" || job?.status === "done_with_errors" ? "failed"
              : "available";
        return json(res, state === "available" ? 404 : 200, {
          state, identity, brmediaTrackId: association.id,
          waveform: null, grid: null, job,
          error: state === "failed" ? item?.detail || "Waveform preparation failed" : null,
          prepareAction: { available: state === "available" || state === "failed", hook: "prepare-waveform" },
        });
      }
      const gridAvailable = Number.isFinite(Number(association.djGridBpm));
      res.setHeader("Cache-Control", "private, max-age=300");
      return json(res, 200, {
        state: "ready", identity, brmediaTrackId: association.id,
        waveform: {
          formatVersion: payload.multiscale?.formatVersion || null,
          duration: payload.duration, peaks: payload.peaks, bands: payload.bands,
          multiscale: payload.multiscale || null, canonicalAnalysis: payload.analysis || null,
          preparedAsset: payload.preparedAsset, compatibility: payload.compatibility,
        },
        grid: gridAvailable ? {
          state: "ready", bpm: Number(association.djGridBpm),
          downbeat: Number(association.djGridDownbeat) || 0,
          locked: association.djGridLocked === true,
          source: association.djGridSource || null,
          reviewRequired: association.djGridReviewRequired === true,
          resolvedMode: association.djGridResolvedMode || "normal",
          segments: Array.isArray(association.djGridSegments)
            ? association.djGridSegments.slice(0, 256).map((segment) => ({
              id: segment.id, startTime: segment.startTime, startBeat: segment.startBeat,
              bpm: segment.bpm, source: segment.source,
            })) : [],
        } : { state: "not-prepared" },
      });
    } catch (error) {
      if (error instanceof MixxxCatalogueError) return json(res, error.status, {
        state: error.code === "MIXXX_TRACK_NOT_FOUND" ? "track-missing" : "unavailable",
        error: error.message, code: error.code,
      });
      throw error;
    }
  }

  const mixxxWaveformPrepareMatch = url.pathname.match(/^\/api\/dj\/mixxx\/waveform\/(mixxx%3A|mixxx:)(\d+)\/prepare$/i);
  if (mixxxWaveformPrepareMatch && req.method === "POST") {
    try {
      const identity = `mixxx:${mixxxWaveformPrepareMatch[2]}`;
      const track = mixxxCatalogueProvider.resolveTrack(identity);
      const association = findLibraryItemByLocator(track.filePath);
      if (!association) return json(res, 409, {
        error: "Track has no authorised BRMedia catalogue association",
        code: "MIXXX_WAVEFORM_ASSOCIATION_MISSING",
      });
      const existing = getExistingWaveformCache(association.locator);
      if (existing) return json(res, 200, { state: "ready", identity, job: null });
      const job = startWaveformGenerationJob([association], {
        scope: "single", peakCount: DEFAULT_WAVEFORM_PEAKS, force: false, onlyMissing: true,
      });
      return json(res, 202, {
        state: job.status === "running" ? "preparing" : "queued", identity, job,
      });
    } catch (error) {
      if (error instanceof MixxxCatalogueError) return json(res, error.status, {
        error: error.message, code: error.code,
      });
      throw error;
    }
  }

  const mixxxGridMatch = url.pathname.match(/^\/api\/dj\/mixxx\/grid\/(mixxx%3A|mixxx:)(\d+)$/i);
  if (mixxxGridMatch && req.method === "GET") {
    try {
      const identity = `mixxx:${mixxxGridMatch[2]}`;
      const track = mixxxCatalogueProvider.resolveTrack(identity);
      const association = findLibraryItemByLocator(track.filePath);
      if (!association) return json(res, 404, { state: "grid-not-prepared", identity, grid: null, prepareAction: { available: false } });
      const resolved = readM25Grid(association);
      const job = m25GridQueue.snapshot(association.id);
      const jobState = job && typeof job === "object" && "state" in job ? String(job.state) : "";
      const jobError = job && typeof job === "object" && "error" in job ? job.error : null;
      if (!resolved.grid && (jobState === "queued" || jobState === "preparing" || jobState === "failed")) {
        return json(res, 200, { state: jobState === "failed" ? "grid-failed" : `grid-${jobState}`, identity, grid: null, job,
          error: jobState === "failed" ? jobError : null, prepareAction: { available: jobState === "failed" } });
      }
      res.setHeader("Cache-Control", "private, max-age=30");
      return json(res, resolved.grid ? 200 : resolved.state === "grid-not-prepared" ? 404 : 409,
        { state: resolved.state, identity, brmediaTrackId: association.id, grid: resolved.grid, error: resolved.error || null,
          prepareAction: { available: resolved.state === "grid-not-prepared" || resolved.state === "grid-corrupt" } });
    } catch (error) {
      if (error instanceof MixxxCatalogueError) return json(res, error.status, { state: "identity-stale", error: error.message, code: error.code });
      throw error;
    }
  }

  const mixxxGridPrepareMatch = url.pathname.match(/^\/api\/dj\/mixxx\/grid\/(mixxx%3A|mixxx:)(\d+)\/prepare$/i);
  if (mixxxGridPrepareMatch && req.method === "POST") {
    try {
      const identity = `mixxx:${mixxxGridPrepareMatch[2]}`;
      const track = mixxxCatalogueProvider.resolveTrack(identity);
      const association = findLibraryItemByLocator(track.filePath);
      if (!association) return json(res, 409, { state: "grid-failed", identity, error: "Track has no authorised BRMedia association" });
      const existing = readM25Grid(association);
      if (existing.grid) return json(res, 200, { state: existing.state, identity, grid: existing.grid, job: null });
      const queued = m25GridQueue.enqueue(association.id);
      return json(res, 202, { state: queued.job.state === "preparing" ? "grid-preparing" : "grid-queued", identity, job: queued.job, duplicateSuppressed: !queued.added });
    } catch (error) {
      if (error instanceof MixxxCatalogueError) return json(res, error.status, { state: "identity-stale", error: error.message, code: error.code });
      throw error;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/dj/mixxx/workflow/add") {
    const body = await readJsonBody(req).catch(() => null);
    try {
      const identity = String(body?.identity || "");
      mixxxCatalogueProvider.resolveTrack(identity);
      return json(res, 200, mixxxWorkflowStore.add(identity, body?.target, body?.collectionName));
    } catch (error) {
      return json(res, error instanceof MixxxCatalogueError ? error.status : 400, {
        error: error instanceof Error ? error.message : "Invalid workflow action",
      });
    }
  }

  const mixxxHandled = await handleMixxxMidiRoute(req, res, url);
  if (mixxxHandled) return true;

  const settingsHandled = await handleSettingsRoute(req, res, url);
  if (settingsHandled) return true;

  const cloudHandled = await handleCloudRoute(req, res, url, cfg);
  if (cloudHandled) return true;

  const linkImportHandled = await handleLinkImportRoute(req, res, url, cfg);
  if (linkImportHandled) return true;
  const stemsHandled =
    await handleDjStemsRoute(
      req,
      res,
      url,
      cfg
    );

  if (stemsHandled) {
    return true;
  }

  const recordingHandled =
    await handleDjRecordingRoute(
      req,
      res,
      url,
      cfg
    );

  if (recordingHandled) {
    return true;
  }

  // GET /library
  if (req.method === "GET" && url.pathname === "/library/compact") {
    if (!listLibrary().length) {
      syncAudioLibraryFromRoots(getConfiguredAudioLibraryRoots());
    }

    try {
      const query = parseLibraryCatalogueQuery(url.searchParams);
      const result = await libraryCatalogueQueryService.query(listLibrary(), query);
      res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
      res.setHeader("X-BRMedia-Catalogue-Revision", result.revision);
      return json(res, 200, result);
    } catch (error) {
      if (error instanceof LibraryCatalogueQueryError) {
        return json(res, error.status, { error: error.message, code: "INVALID_LIBRARY_QUERY" });
      }
      throw error;
    }
  }

  // Legacy full catalogue remains available for existing callers.
  if (req.method === "GET" && url.pathname === "/library") {
    if (!listLibrary().length) {
      syncAudioLibraryFromRoots(getConfiguredAudioLibraryRoots());
    }
		
    clearAudioLibraryDjPerformanceMetadata();

    const metadataBackfill =
      url.searchParams.get("metadata") === "missing"
        ? await backfillMissingAudioLibraryMetadata()
        : null;

    return json(res, 200, {
      items: listLibrary().map((item) => ({ ...item, djAnalysis: analysisSummary(item) })),
      metadataBackfill,
    });
  }
	
  // GET /library-hidden
  if (req.method === "GET" && url.pathname === "/library-hidden") {
    return json(res, 200, {
      ok: true,
      items: listHiddenAudioLibraryItems(),
    });
  }

  // POST /library/:id/hide
  if (
    req.method === "POST" &&
    url.pathname.startsWith("/library/") &&
    url.pathname.endsWith("/hide")
) {
    const id = decodeURIComponent(
      url.pathname
        .replace("/library/", "")
        .replace(/\/hide$/, "")
        .trim()
    );

    const item = getLibraryItem(id);
    if (!item) {
      return json(res, 404, { error: "Track not found" });
    }

    const allowed = validateLocalPathAllowed(path.resolve(item.locator), cfg.localAllowedBases);
    if (!allowed.ok) {
      return json(res, 403, { error: allowed.reason });
    }

    const hidden = hideLibraryItem(id);
    if (!hidden) {
      return json(res, 404, { error: "Track not found" });
    }

    appendStatsEvent("audio_library_hide", "library", {
      entityType: "audio",
      entityId: hidden.id,
      title: hidden.title || hidden.id,
      status: "done",
      route: "settings",
    });

    return json(res, 200, {
      ok: true,
      item: hidden,
    });
  }

  // POST /library-hidden/:id/restore
  if (
    req.method === "POST" &&
    url.pathname.startsWith("/library-hidden/") &&
    url.pathname.endsWith("/restore")
  ) {
    const id = decodeURIComponent(
      url.pathname
        .replace("/library-hidden/", "")
        .replace(/\/restore$/, "")
        .trim()
    );

    const hidden = getHiddenAudioLibraryItem(id);
    if (!hidden) {
      return json(res, 404, { error: "Removed audio item not found" });
    }

    const allowed = validateLocalPathAllowed(path.resolve(hidden.locator), cfg.localAllowedBases);
    if (!allowed.ok) {
      return json(res, 403, { error: allowed.reason });
    }

    const item = await restoreHiddenAudioLibraryItem(id);
    if (!item) {
      return json(res, 404, { error: "Physical audio file is offline or missing" });
    }

    appendStatsEvent("audio_library_restore", "library", {
      entityType: "audio",
      entityId: item.id,
      title: item.title || item.id,
      status: "done",
      route: "settings",
    });

    return json(res, 200, {
      ok: true,
      item,
    });
  }

  // POST /library/:id/rescan-metadata
  if (
    req.method === "POST" &&
    url.pathname.startsWith("/library/") &&
    url.pathname.endsWith("/rescan-metadata")
  ) {
    const id = decodeURIComponent(
      url.pathname
        .replace("/library/", "")
        .replace(/\/rescan-metadata$/, "")
        .trim()
    );

    const item = getLibraryItem(id);
    if (!item) {
      return json(res, 404, { error: "Track not found" });
    }

    const allowed = validateLocalPathAllowed(path.resolve(item.locator), cfg.localAllowedBases);
    if (!allowed.ok) {
      return json(res, 403, { error: allowed.reason });
    }

    const refreshed = await refreshAudioLibraryItemMetadata(item);
    if (!refreshed) {
      return json(res, 404, { error: "Physical audio file is offline or missing" });
    }

    appendStatsEvent("audio_metadata_rescan", "library", {
      entityType: "audio",
      entityId: refreshed.id,
      title: refreshed.title || refreshed.id,
      status: "done",
      route: "settings",
      extra: {
        duration: refreshed.duration || 0,
      },
    });

    return json(res, 200, {
      ok: true,
      item: refreshed,
    });
  }

  // M11 exposes compact catalogue metadata separately from bounded, lazy detail.
  if (req.method === "GET" && url.pathname.startsWith("/dj-analysis/tracks/")) {
    const id = decodeURIComponent(url.pathname.replace("/dj-analysis/tracks/", "").trim());
    if (!id || id.includes("/")) return json(res, 400, { error: "Invalid track id" });
    const item = getLibraryItem(id);
    if (!item) return json(res, 404, { error: "Track not found" });
    return json(res, 200, { analysis: analysisDetails(item) });
  }

  // M9 persistent analysis queue. No route accepts a path or arbitrary command.
  if (req.method === "GET" && url.pathname === "/dj-analysis/queue") {
    return json(res, 200, djAnalysisQueue.snapshot());
  }

  if (req.method === "POST" && url.pathname === "/dj-analysis/queue/enqueue") {
    const body = (await readJsonBody(req).catch(() => null)) || {};
    const scope = body.scope === "single" ? "single" : body.scope === "selected" ? "selected" : "all";
    const force = body.force === true;
    let result;
    if (scope === "all") {
      if (body.productionApproval !== DJ_ANALYSIS_PRODUCTION_APPROVAL) {
        return json(res, 409, {
          error: "Full-catalogue analysis requires explicit M9 production approval",
          code: "M9_PRODUCTION_APPROVAL_REQUIRED",
          analysisVersion: DJ_ANALYSIS_GENERATION,
        });
      }
      result = djAnalysisQueue.enqueueAll({ force });
    } else {
      const ids = scope === "single" ? [body.id] : body.ids;
      if (!Array.isArray(ids) || !ids.length || ids.length > 500 || ids.some((id) => typeof id !== "string" || !id.trim())) {
        return json(res, 400, { error: "Invalid track selection" });
      }
      result = djAnalysisQueue.enqueue(ids, { force });
    }
    return json(res, 202, result);
  }

  if (req.method === "POST" && url.pathname.startsWith("/dj-analysis/queue/")) {
    const action = url.pathname.replace("/dj-analysis/queue/", "");
    if (action === "start") return json(res, 200, djAnalysisQueue.start());
    if (action === "pause") return json(res, 200, djAnalysisQueue.pause());
    if (action === "resume") return json(res, 200, djAnalysisQueue.resume());
    if (action === "cancel-pending") return json(res, 200, djAnalysisQueue.cancelPending());
    if (action === "retry-failed") return json(res, 202, djAnalysisQueue.retry("failed"));
    if (action === "retry-review-required") return json(res, 202, djAnalysisQueue.retry("review-required"));
    return json(res, 404, { error: "Unknown analysis queue action" });
  }

  // POST /waveforms/generate
  if (req.method === "POST" && url.pathname === "/waveforms/generate") {
    const body = (await readJsonBody(req).catch(() => null)) || {};
    const scope = body.scope === "single" ? "single" : "all";
    const peakCount = normaliseWaveformPeakCount(body.count);
    const force = body.force === true;

    if (scope === "single") {
      if (typeof body.id !== "string" || !body.id.trim()) {
        return json(res, 400, { error: 'Invalid body. Expected { scope: "single", id: string }' });
      }

      const item = getLibraryItem(body.id.trim());
      if (!item) {
        return json(res, 404, { error: "Track not found" });
      }

      const result = await generateWaveformsForTracks([item], {
        peakCount,
        force,
      });

      appendStatsEvent("waveform_generate_done", "server", {
        entityType: "waveform",
        entityId: item.id,
        title: item.title || item.id,
        status: result.failed ? "done_with_errors" : "done",
        route: "server-settings",
        value: result.generated,
        extra: {
          scope,
          peakCount,
          force,
          generated: result.generated,
          skipped: result.skipped,
          failed: result.failed,
        },
      });

      return json(res, 200, {
        scope,
        count: peakCount,
        force,
        ...result,
      });
    }

    const result = await generateWaveformsForTracks(listLibrary(), {
      peakCount,
      force,
      onlyMissing: !force,
    });

    appendStatsEvent("waveform_generate_done", "server", {
      entityType: "waveform",
      title: "Waveform generation",
      status: result.failed ? "done_with_errors" : "done",
      route: "server-settings",
      value: result.generated,
      extra: {
        scope: "all",
        peakCount,
        force,
        generated: result.generated,
        skipped: result.skipped,
        failed: result.failed,
      },
    });

    return json(res, 200, {
      scope: "all",
      count: peakCount,
      force,
      ...result,
    });
  }

  // POST /waveforms/jobs
  if (req.method === "POST" && url.pathname === "/waveforms/jobs") {
    const body = (await readJsonBody(req).catch(() => null)) || {};
    const scope = body.scope === "single"
      ? "single"
      : body.scope === "failed"
        ? "failed"
        : "all";
    const peakCount = normaliseWaveformPeakCount(body.count);
    const force = body.force === true;

    if (scope === "single") {
      if (typeof body.id !== "string" || !body.id.trim()) {
        return json(res, 400, { error: 'Invalid body. Expected { scope: "single", id: string }' });
      }

      const item = getLibraryItem(body.id.trim());
      if (!item) {
        return json(res, 404, { error: "Track not found" });
      }

      const job = startWaveformGenerationJob([item], {
        scope,
        peakCount,
        force,
      });

      appendStatsEvent("waveform_job_started", "server", {
        entityType: "waveform_job",
        entityId: job.id,
        title: item.title || item.id,
        status: "running",
        route: "server-settings",
        value: job.total,
        extra: {
          scope,
          peakCount,
          force,
          total: job.total,
        },
      });

      return json(res, 202, job);
    }

    if (scope === "failed") {
      const failedIds = new Set(getWaveformFailedTrackIds());
      const failedItems = listLibrary().filter((item) => failedIds.has(item.id));

      const job = startWaveformGenerationJob(failedItems, {
        scope: "failed",
        peakCount,
        force: true,
        onlyMissing: false,
      });

      appendStatsEvent("waveform_job_started", "server", {
        entityType: "waveform_job",
        entityId: job.id,
        title: "Retry failed waveforms",
        status: "running",
        route: "server-settings",
        value: job.total,
        extra: {
          scope: "failed",
          peakCount,
          force: true,
          total: job.total,
        },
      });

      return json(res, 202, job);
    }

    const job = startWaveformGenerationJob(listLibrary(), {
      scope: "all",
      peakCount,
      force,
      onlyMissing: !force,
    });

    appendStatsEvent("waveform_job_started", "server", {
      entityType: "waveform_job",
      entityId: job.id,
      title: "Waveform rebuild job",
      status: "running",
      route: "server-settings",
      value: job.total,
      extra: {
        scope: "all",
        peakCount,
        force,
        total: job.total,
      },
    });

    return json(res, 202, job);
  }
	
  // GET /waveforms/health
  if (req.method === "GET" && url.pathname === "/waveforms/health") {
    const peakCount = normaliseWaveformPeakCount(url.searchParams.get("count"));
    return json(res, 200, getWaveformCacheHealth(listLibrary(), peakCount));
  }

  // GET /waveforms/jobs/:id
  if (req.method === "GET" && url.pathname.startsWith("/waveforms/jobs/")) {
    const jobId = decodeURIComponent(url.pathname.replace("/waveforms/jobs/", "").trim());
    if (!jobId) {
      return json(res, 400, { error: "Missing waveform job id" });
    }

    const job = getWaveformJobSnapshot(jobId);
    if (!job) {
      return json(res, 404, { error: "Waveform job not found" });
    }

    return json(res, 200, job);
  }
	
  // DELETE /waveforms/failed
  if (req.method === "DELETE" && url.pathname === "/waveforms/failed") {
    const cleared = clearWaveformFailedTrackIds();

    appendStatsEvent("waveform_failed_clear", "server", {
      entityType: "waveform_admin",
      title: "Failed waveform list cleared",
      status: "done",
      route: "server-settings",
      value: cleared,
    });

    return json(res, 200, { ok: true, cleared });
  }

  // DELETE /waveforms/cache
  if (req.method === "DELETE" && url.pathname === "/waveforms/cache") {
    const deleted = clearWaveformCacheForTracks(listLibrary());
    clearWaveformFailedTrackIds();

    appendStatsEvent("waveform_cache_clear", "server", {
      entityType: "waveform_admin",
      title: "Waveform cache cleared",
      status: "done",
      route: "server-settings",
      value: deleted,
    });

    return json(res, 200, { ok: true, deleted });
  }
	
  // POST /library/:id/dj-performance
  if (
    req.method === "POST" &&
    url.pathname.startsWith(
      "/library/"
    ) &&
    url.pathname.endsWith(
      "/dj-performance"
    )
  ) {
    return json(
      res,
      410,
      {
        ok: false,
        error:
          "DJ performance-copy creation is disabled. BRMedia uses the original audio file only.",
      }
    );
  }
	
  // POST /library/:id/dj-prep
  if (
    req.method === "POST" &&
    url.pathname.startsWith("/library/") &&
    url.pathname.endsWith("/dj-prep")
  ) {
    const id = decodeURIComponent(
      url.pathname
        .replace("/library/", "")
        .replace(/\/dj-prep$/, "")
        .trim()
    );

    if (!id) {
      return json(res, 400, { error: "Missing track id" });
    }

    const body = await readJsonBody(req).catch(() => null);

    if (!body || typeof body !== "object") {
      return json(res, 400, {
        error: "Invalid DJ preparation payload",
      });
    }

    try {
      const currentItem = getLibraryItem(id);
      if (body.stableIdentity) {
        const stableIdentity = String(body.stableIdentity);
        const exactTrack = mixxxCatalogueProvider.resolveTrack(stableIdentity);
        const exactAssociation = findLibraryItemByLocator(exactTrack.filePath);
        if (!exactAssociation || exactAssociation.id !== id) {
          return json(res, 409, { error: "Grid identity no longer matches the loaded track", code: "M25_GRID_IDENTITY_STALE" });
        }
      }
      if (currentItem && String(body.source || "").toLowerCase().startsWith("manual")) {
        appendAnalysisHistory(currentItem, {
          action: "manual-grid-correction", source: String(body.source || "manual").slice(0, 64),
          previousBpm: currentItem.djGridBpm ?? null, nextBpm: Number.isFinite(Number(body.bpm)) ? Number(body.bpm) : null,
          locked: Boolean(body.locked),
        });
      }
      const waveformAsset =
        currentItem && body.waveformPrepared === true
          ? getWaveformPreparedAssetRegistration(
              currentItem.locator,
              normaliseWaveformPeakCount(body.waveformPeakCount)
            )
          : undefined;
      const item =
        saveAudioLibraryDjPrep(
          id,
          {
            ...body,
            ...(waveformAsset ? { waveformAsset } : {}),
          }
        );

      if (!item) {
        return json(
          res,
          404,
          {
            error:
              "Track not found",
          }
        );
      }

      return json(
        res,
        200,
        {
          ok: true,
          item,
          djAnalysis: analysisSummary(item),
        }
      );
    } catch (error: any) {
      if (
        error?.code ===
        "DJ_GRID_LOCKED"
      ) {
        return json(
          res,
          423,
          {
            error:
              "Analysis Lock is on for this track",

            code:
              "DJ_GRID_LOCKED",
          }
        );
      }

      throw error;
    }
  }

  // DELETE /library/:id
  if (req.method === "DELETE" && url.pathname.startsWith("/library/")) {
    const id = decodeURIComponent(url.pathname.replace("/library/", "").trim());
    if (!id) {
      return json(res, 400, { error: "Missing track id" });
    }

    const item = getLibraryItem(id);
    if (!item) {
      return json(res, 404, { error: "Track not found" });
    }

    const filePath = path.resolve(item.locator);
    const allowed = validateLocalPathAllowed(filePath, cfg.localAllowedBases);
    if (!allowed.ok) {
      return json(res, 403, { error: allowed.reason });
    }

    const deletedSidecars: string[] = [];

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      for (const sidecarPath of getTrackSidecarPaths(filePath)) {
        if (!fs.existsSync(sidecarPath)) continue;
        fs.unlinkSync(sidecarPath);
        deletedSidecars.push(sidecarPath);
      }

      const waveformDeleted = deleteWaveformCacheForFile(filePath);
      const removed = removeLibraryItem(id);

      return json(res, 200, {
        ok: true,
        item: removed || item,
        deletedFile: !fs.existsSync(filePath),
        deletedSidecars,
        waveformDeleted,
      });
    } catch (error) {
      return json(res, 500, {
        error: error instanceof Error ? error.message : "Failed to delete file",
      });
    }
  }
	
  // POST /library/import/local
  // body: { "path": "C:\\DJMixes\\mix.mp3", "title": "My Mix" }
  // body: { "path": "C:\\DJMixes\\Folder" }
  if (req.method === "POST" && url.pathname === "/library/import/local") {
    const body = await readJsonBody(req).catch(() => null);

    if (!body || typeof body.path !== "string") {
      return json(res, 400, { error: "Invalid body. Expected { path: string, title?: string }" });
    }

    const inputPath = path.resolve(body.path);
    const allowed = validateLocalPathAllowed(inputPath, cfg.localAllowedBases);

    if (!allowed.ok) {
      return json(res, 403, { error: allowed.reason });
    }

    if (!fs.existsSync(inputPath)) {
      return json(res, 404, { error: "Path does not exist." });
    }

    const stat = fs.statSync(inputPath);

    // Single file import
    if (stat.isFile()) {
      if (!isSupportedAudioFile(inputPath)) {
        return json(res, 400, { error: "Unsupported file type. Supported: mp3, wav, flac, m4a, aac, ogg" });
      }

      const existing = findLibraryItemByLocator(inputPath);
      const item = await addLocalFileToLibraryWithMetadata(
        inputPath,
        typeof body.title === "string" ? body.title : undefined
      );

      const waveformCount = normaliseWaveformPeakCount(body.waveformCount);
      const shouldGenerateWaveforms = body.generateWaveforms !== false;

      if (!existing && shouldGenerateWaveforms) {
        void queueWaveformGenerationForItems([item], {
          peakCount: waveformCount,
          onlyMissing: true,
        });
      }

      return json(res, existing ? 200 : 201, {
        mode: "file",
        added: existing ? 0 : 1,
        skipped: existing ? 1 : 0,
        item,
        waveformQueued: !existing && shouldGenerateWaveforms,
        waveformCount,
      });
    }

    // Folder import (recursive)
    if (stat.isDirectory()) {
      const files = collectSupportedAudioFilesRecursive(inputPath);

      const addedItems = [];
      const skippedItems = [];

      for (const absFile of files) {
        const existing = findLibraryItemByLocator(absFile);
        if (existing) {
          skippedItems.push({
            reason: "duplicate",
            locator: absFile,
            item: existing,
          });
          continue;
        }

        const item = await addLocalFileToLibraryWithMetadata(absFile);
        addedItems.push(item);
      }

      const waveformCount = normaliseWaveformPeakCount(body.waveformCount);
      const shouldGenerateWaveforms = body.generateWaveforms !== false;

      if (addedItems.length && shouldGenerateWaveforms) {
        void queueWaveformGenerationForItems(addedItems, {
          peakCount: waveformCount,
          onlyMissing: true,
        });
      }

      return json(res, 201, {
        mode: "folder",
        folder: inputPath,
        recursive: true,
        added: addedItems.length,
        skipped: skippedItems.length,
        items: addedItems,
        skippedItems,
        waveformQueued: shouldGenerateWaveforms,
        waveformCount,
      });
    }

    return json(res, 400, { error: "Path must be a file or folder." });
  }

  return false;
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });

    req.on("error", reject);
  });
}

function collectSupportedAudioFilesRecursive(rootDir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const abs = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }

      if (entry.isFile() && isSupportedAudioFile(abs)) {
        results.push(abs);
      }
    }
  }

  walk(rootDir);
  return results;
}
