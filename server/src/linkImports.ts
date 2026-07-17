import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "./utils/json";
import {
  addLocalFileToLibraryWithMetadata,
  findLibraryItemByLocator,
  isSupportedAudioFile,
} from "./db/library";
import { appendStatsEvent } from "./statsEvents";

type LinkImportStatus = "queued" | "downloading" | "importing" | "complete" | "failed" | "cancelled";

type LinkImportJob = {
  id: string;
  url: string;
  name: string;
  status: LinkImportStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
  savedPath?: string;
  libraryItem?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type LinkImportRouteConfig = {
  localAllowedBases: string[];
};

const LINK_IMPORT_JOB_KEEP_MS = 60 * 60 * 1000;
const linkImportJobs = new Map<string, LinkImportJob>();
const linkImportControllers = new Map<string, AbortController>();

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) return resolve({});

      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

function randomId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitiseFileName(name: string) {
  return (
    String(name || "download")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "download"
  );
}

function getLinkImportDir(cfg: LinkImportRouteConfig) {
  const fromEnv = String(process.env.LINK_IMPORT_DIR || "").trim();

  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }

  const firstAllowed = cfg.localAllowedBases[0];

  if (firstAllowed) {
    const resolved = path.join(path.resolve(firstAllowed), "BRMedia Link Imports");
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }

  const fallback = path.join(process.cwd(), "server", "data", "link-imports");
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

function getHeaderFileName(contentDisposition = "") {
  const raw = String(contentDisposition || "");

  const utfMatch = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].replace(/["]/g, "").trim());
    } catch {
      return utfMatch[1].replace(/["]/g, "").trim();
    }
  }

  const normalMatch = raw.match(/filename="?([^";]+)"?/i);
  if (normalMatch?.[1]) {
    return normalMatch[1].trim();
  }

  return "";
}

function getNameFromUrl(inputUrl: string) {
  try {
    const parsed = new URL(inputUrl);
    const baseName = decodeURIComponent(path.basename(parsed.pathname || ""));
    return baseName && baseName !== "/" ? baseName : "";
  } catch {
    return "";
  }
}

function extensionForContentType(contentType = "") {
  const lower = String(contentType || "").toLowerCase();

  if (lower.includes("audio/mpeg")) return ".mp3";
  if (lower.includes("audio/wav")) return ".wav";
  if (lower.includes("audio/flac")) return ".flac";
  if (lower.includes("audio/mp4")) return ".m4a";
  if (lower.includes("audio/aac")) return ".aac";
  if (lower.includes("audio/ogg")) return ".ogg";
  if (lower.includes("audio/opus")) return ".opus";

  return "";
}

function isProbablySupportedAudio(name = "", contentType = "") {
  const lowerType = String(contentType || "").toLowerCase();

  if (lowerType.startsWith("audio/")) return true;

  const lowerName = String(name || "").toLowerCase();
  return [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus"].some((ext) =>
    lowerName.endsWith(ext)
  );
}

function assertValidDirectUrl(input: string) {
  const raw = String(input || "").trim();

  if (!raw) throw new Error("Paste a direct file URL first.");

  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("That is not a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// direct file links are supported.");
  }

  return parsed.toString();
}

function pruneLinkImportJobs() {
  const cutoff = Date.now() - LINK_IMPORT_JOB_KEEP_MS;

  for (const [id, job] of linkImportJobs.entries()) {
    if (
      (job.status === "complete" ||
        job.status === "failed" ||
        job.status === "cancelled") &&
      job.updatedAt < cutoff
    ) {
      linkImportJobs.delete(id);
    }
  }
}

function listLinkImportJobs() {
  pruneLinkImportJobs();

  return Array.from(linkImportJobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
}

function updateLinkImportJob(id: string, patch: Partial<LinkImportJob>) {
  const existing = linkImportJobs.get(id);
  if (!existing) return null;

  const next: LinkImportJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  linkImportJobs.set(id, next);
  return next;
}

function createLinkImportJob(url: string) {
  const now = Date.now();

  const job: LinkImportJob = {
    id: randomId("linkjob"),
    url,
    name: getNameFromUrl(url) || "Direct URL import",
    status: "queued",
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    message: "Queued",
    createdAt: now,
    updatedAt: now,
  };

  linkImportJobs.set(job.id, job);
  return job;
}

async function writeResponseToFile(
  res: Response,
  destPath: string,
  jobId: string,
  totalBytes = 0
) {
  if (!res.body) {
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    updateLinkImportJob(jobId, {
      downloadedBytes: buffer.length,
      totalBytes: totalBytes || buffer.length,
      percent: 90,
      message: "Download complete",
    });

    return;
  }

  const reader = res.body.getReader();
  const stream = fs.createWriteStream(destPath);
  let downloadedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = Buffer.from(value);
      downloadedBytes += chunk.length;

      if (!stream.write(chunk)) {
        await new Promise<void>((resolve, reject) => {
          stream.once("drain", resolve);
          stream.once("error", reject);
        });
      }

      const percent = totalBytes > 0
        ? Math.max(1, Math.min(88, Math.round((downloadedBytes / totalBytes) * 88)))
        : 35;

      updateLinkImportJob(jobId, {
        downloadedBytes,
        totalBytes,
        percent,
        message: "Downloading media",
      });
    }

    await new Promise<void>((resolve, reject) => {
      stream.once("error", reject);
      stream.end(() => resolve());
    });
  } catch (err) {
    stream.destroy();
    throw err;
  }
}

async function runLinkImportJob(jobId: string, inputUrl: string, cfg: LinkImportRouteConfig) {
  const controller = new AbortController();
  linkImportControllers.set(jobId, controller);

  try {
    updateLinkImportJob(jobId, {
      status: "downloading",
      percent: 2,
      message: "Opening direct link",
    });

    const res = await fetch(inputUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "BRMedia-Centre/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }

    const contentType = String(res.headers.get("content-type") || "");
    const contentDisposition = String(res.headers.get("content-disposition") || "");
    const totalBytes = Number(res.headers.get("content-length") || 0);

    let fileName =
      getHeaderFileName(contentDisposition) ||
      getNameFromUrl(res.url || inputUrl) ||
      getNameFromUrl(inputUrl) ||
      `brmedia-import-${Date.now()}`;

    if (!path.extname(fileName)) {
      fileName += extensionForContentType(contentType) || ".mp3";
    }

    fileName = sanitiseFileName(fileName);

    if (!isProbablySupportedAudio(fileName, contentType)) {
      throw new Error("Only direct audio file links can be imported here right now.");
    }

    const importDir = getLinkImportDir(cfg);
    const destPath = path.join(importDir, fileName);

    updateLinkImportJob(jobId, {
      name: fileName,
      totalBytes,
      message: "Downloading media",
    });

    if (!fs.existsSync(destPath)) {
      await writeResponseToFile(res, destPath, jobId, totalBytes);
    } else {
      const stat = fs.statSync(destPath);

      updateLinkImportJob(jobId, {
        downloadedBytes: stat.size,
        totalBytes: stat.size,
        percent: 88,
        message: "File already downloaded",
      });
    }

    if (!isSupportedAudioFile(destPath)) {
      throw new Error("Downloaded file type is not supported by BRMedia yet.");
    }

    updateLinkImportJob(jobId, {
      status: "importing",
      percent: 94,
      savedPath: destPath,
      message: "Importing media",
    });

    const existing = findLibraryItemByLocator(destPath);
    const item = existing || await addLocalFileToLibraryWithMetadata(destPath);

    const stat = fs.statSync(destPath);

    updateLinkImportJob(jobId, {
      status: "complete",
      percent: 100,
      downloadedBytes: stat.size,
      totalBytes: stat.size,
      savedPath: destPath,
      libraryItem: item,
      message: existing ? "Media already in library" : "Media imported",
    });

    appendStatsEvent("direct_import_done", "imports", {
      entityType: "audio",
      entityId: item?.id || jobId,
      title: fileName,
      status: "done",
      route: "settings",
      value: stat.size,
      source: "direct_url",
    });
  } catch (err: any) {
    const cancelled = String(err?.name || "").toLowerCase() === "aborterror";

    updateLinkImportJob(jobId, {
      status: cancelled ? "cancelled" : "failed",
      percent: 100,
      error: cancelled ? "Cancelled" : String(err?.message || err),
      message: cancelled ? "Cancelled" : "Failed",
    });

    appendStatsEvent(
      cancelled
        ? "direct_import_cancelled"
        : "direct_import_error",
      "imports",
      {
        entityType: "audio",
        entityId: jobId,
        title: inputUrl,
        status: cancelled ? "cancelled" : "error",
        route: "settings",
        source: "direct_url",
      }
    );
  } finally {
    linkImportControllers.delete(jobId);
  }
}

function startLinkImportJob(inputUrl: string, cfg: LinkImportRouteConfig) {
  const safeUrl = assertValidDirectUrl(inputUrl);
  const job = createLinkImportJob(safeUrl);

  void runLinkImportJob(job.id, safeUrl, cfg);

  return job;
}

function cancelLinkImportJob(jobId: string) {
  const controller = linkImportControllers.get(jobId);

  if (controller) {
    controller.abort();
  }

  const job = updateLinkImportJob(jobId, {
    status: "cancelled",
    percent: 100,
    message: "Cancelled",
    error: "Cancelled",
  });

  return !!job;
}

export async function handleLinkImportRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  cfg: LinkImportRouteConfig
): Promise<boolean> {
  if (req.method === "GET" && url.pathname === "/imports/link/jobs") {
    return json(res, 200, {
      ok: true,
      jobs: listLinkImportJobs(),
    });
  }

  if (req.method === "POST" && url.pathname === "/imports/link/start") {
    const body = await readJsonBody(req).catch(() => null);
    const inputUrl = String(body?.url || "").trim();

    try {
      const job = startLinkImportJob(inputUrl, cfg);
      return json(res, 202, { ok: true, job });
    } catch (err: any) {
      return json(res, 400, {
        error: "Direct URL import failed",
        detail: String(err?.message || err),
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/imports/link/cancel") {
    const body = await readJsonBody(req).catch(() => null);
    const jobId = String(body?.jobId || "").trim();

    if (!jobId) {
      return json(res, 400, { error: "Missing link import job id" });
    }

    const cancelled = cancelLinkImportJob(jobId);
    return json(res, 200, { ok: true, cancelled });
  }

  return false;
}