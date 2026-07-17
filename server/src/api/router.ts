import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "../utils/json";
import {
  listLibrary,
  listHiddenAudioLibraryItems,
  getHiddenAudioLibraryItem,
  addLocalFileToLibraryWithMetadata,
  backfillMissingAudioLibraryMetadata,
  refreshAudioLibraryItemMetadata,
  saveAudioLibraryDjPrep,
  saveAudioLibraryDjPerformance,
  restoreHiddenAudioLibraryItem,
  hideLibraryItem,
  isSupportedAudioFile,
  findLibraryItemByLocator,
  getLibraryItem,
  removeLibraryItem,
  syncAudioLibraryFromRoots,
} from "../db/library";
import {
  generateWaveformsForTracks,
  getWaveformJobSnapshot,
  normaliseWaveformPeakCount,
  queueWaveformGenerationForItems,
  startWaveformGenerationJob,
  deleteWaveformCacheForFile,
  getWaveformCacheHealth,
  getWaveformFailedTrackIds,
  clearWaveformFailedTrackIds,
  clearWaveformCacheForTracks,
} from "../waveforms";
import { validateLocalPathAllowed } from "../sources/local/validateLocalPathAllowed";
import { handleCloudRoute } from "../cloud";
import { handleLinkImportRoute } from "../linkImports";
import { getEnabledLibrarySourcePaths } from "../librarySources";
import { appendStatsEvent } from "../statsEvents";
import { ensureDjPerformanceCopy } from "../djPerformance";

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
  const cloudHandled = await handleCloudRoute(req, res, url, cfg);
  if (cloudHandled) return true;

  const linkImportHandled = await handleLinkImportRoute(req, res, url, cfg);
  if (linkImportHandled) return true;

  // GET /library
  if (req.method === "GET" && url.pathname === "/library") {
    if (!listLibrary().length) {
      syncAudioLibraryFromRoots(getConfiguredAudioLibraryRoots());
    }

    const metadataBackfill =
      url.searchParams.get("metadata") === "missing"
        ? await backfillMissingAudioLibraryMetadata()
        : null;

    return json(res, 200, {
      items: listLibrary(),
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
    const id = decodeURIComponent(
      url.pathname
        .replace("/library/", "")
        .replace(
          /\/dj-performance$/,
          ""
        )
        .trim()
    );

    if (!id) {
      return json(
        res,
        400,
        {
          error:
            "Missing track id",
        }
      );
    }

    const item =
      getLibraryItem(id);

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

    const allowed =
      validateLocalPathAllowed(
        path.resolve(
          item.locator
        ),
        cfg.localAllowedBases
      );

    if (!allowed.ok) {
      return json(
        res,
        403,
        {
          error: allowed.reason,
        }
      );
    }

    const body =
      (
        await readJsonBody(req)
          .catch(() => null)
      ) || {};

    try {
      const copy =
        await ensureDjPerformanceCopy(
          item,
          {
            force:
              body.force === true,
          }
        );

      const updated =
        saveAudioLibraryDjPerformance(
          id,
          {
            prepared: copy.ready,
            bytes: copy.bytes,

            sourceBytes:
              copy.sourceBytes,

            bitrateKbps:
              copy.bitrateKbps,

            version:
              copy.version,

            updatedAt:
              copy.updatedAt,
          }
        );

      appendStatsEvent(
        "dj_performance_copy_ready",
        "library",
        {
          entityType: "audio",
          entityId: item.id,

          title:
            item.title ||
            item.id,

          status: "done",
          route: "dj-mixer",
          value: copy.bytes,

          extra: {
            sourceBytes:
              copy.sourceBytes,

            bitrateKbps:
              copy.bitrateKbps,

            version:
              copy.version,
          },
        }
      );

      return json(
        res,
        200,
        {
          ok: true,

          copy: {
            ready: copy.ready,
            url: copy.url,
            bytes: copy.bytes,

            sourceBytes:
              copy.sourceBytes,

            bitrateKbps:
              copy.bitrateKbps,

            version:
              copy.version,

            updatedAt:
              copy.updatedAt,
          },

          item:
            updated || item,
        }
      );
    } catch (error: any) {
      return json(
        res,
        500,
        {
          error:
            "DJ performance copy failed",

          detail: String(
            error?.message ||
            error
          ),
        }
      );
    }
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
      const item =
        saveAudioLibraryDjPrep(
          id,
          body
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