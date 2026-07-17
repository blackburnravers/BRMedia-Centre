import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import type { LibraryItem } from "./db/library";

const DJ_PERFORMANCE_CACHE_DIR = path.join(
  __dirname,
  "..",
  ".cache",
  "dj-performance"
);

const DJ_PERFORMANCE_BITRATE_KBPS = Math.max(
  128,
  Math.min(
    320,
    Number(
      process.env
        .BRMEDIA_DJ_PERFORMANCE_BITRATE_KBPS ||
        256
    ) || 256
  )
);

function resolveDjFfmpegPath() {
  const configured = String(
    process.env.FFMPEG_PATH || ""
  ).trim();

  if (configured) return configured;

  const bundledPath =
    "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";

  if (
    process.platform === "win32" &&
    fs.existsSync(bundledPath)
  ) {
    return bundledPath;
  }

  return process.platform === "win32"
    ? "ffmpeg.exe"
    : "ffmpeg";
}

function ensureDjPerformanceCacheDir() {
  fs.mkdirSync(
    DJ_PERFORMANCE_CACHE_DIR,
    { recursive: true }
  );
}

function safeTrackCachePrefix(
  item: LibraryItem
) {
  const safeId =
    String(item.id || "track")
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )
      .slice(0, 72) ||
    "track";

  const locatorHash = crypto
    .createHash("sha1")
    .update(
      path.resolve(item.locator)
    )
    .digest("hex")
    .slice(0, 12);

  return `${safeId}-${locatorHash}`;
}

function readSourceStat(
  item: LibraryItem
) {
  const stat = fs.statSync(
    item.locator
  );

  if (!stat.isFile()) {
    throw new Error(
      "DJ source is not a file"
    );
  }

  return stat;
}

function getDjPerformanceVersion(
  item: LibraryItem,
  stat = readSourceStat(item)
) {
  return crypto
    .createHash("sha1")
    .update(
      [
        path
          .resolve(item.locator)
          .toLowerCase(),

        stat.size,
        Math.round(stat.mtimeMs),
        DJ_PERFORMANCE_BITRATE_KBPS,
        "aac-m4a-v1",
      ].join(":")
    )
    .digest("hex")
    .slice(0, 18);
}

function getDjPerformancePath(
  item: LibraryItem,
  version: string
) {
  return path.join(
    DJ_PERFORMANCE_CACHE_DIR,

    `${
      safeTrackCachePrefix(item)
    }-${version}.m4a`
  );
}

function removeStaleCopies(
  item: LibraryItem,
  keepPath: string
) {
  ensureDjPerformanceCacheDir();

  const prefix =
    `${safeTrackCachePrefix(item)}-`;

  for (
    const name of fs.readdirSync(
      DJ_PERFORMANCE_CACHE_DIR
    )
  ) {
    if (
      !name.startsWith(prefix) ||
      !name.endsWith(".m4a")
    ) {
      continue;
    }

    const candidate = path.join(
      DJ_PERFORMANCE_CACHE_DIR,
      name
    );

    if (
      path.resolve(candidate) ===
      path.resolve(keepPath)
    ) {
      continue;
    }

    try {
      fs.unlinkSync(candidate);
    } catch {}
  }
}

export type DjPerformanceCopyStatus = {
  ready: boolean;
  path: string;
  url: string;
  version: string;
  bytes: number;
  sourceBytes: number;
  bitrateKbps: number;
  updatedAt: number;
};

export function getDjPerformanceCopyStatus(
  item: LibraryItem
): DjPerformanceCopyStatus {
  const stat =
    readSourceStat(item);

  const version =
    getDjPerformanceVersion(
      item,
      stat
    );

  const outputPath =
    getDjPerformancePath(
      item,
      version
    );

  const ready =
    fs.existsSync(outputPath) &&
    fs.statSync(outputPath).size > 0;

  const outputStat = ready
    ? fs.statSync(outputPath)
    : null;

  return {
    ready,
    path: outputPath,

    url:
      `/dj-performance/` +
      `${encodeURIComponent(
        item.id
      )}?v=${encodeURIComponent(
        version
      )}`,

    version,
    bytes: outputStat?.size || 0,
    sourceBytes: stat.size,
    bitrateKbps:
      DJ_PERFORMANCE_BITRATE_KBPS,

    updatedAt:
      outputStat?.mtimeMs || 0,
  };
}

export async function ensureDjPerformanceCopy(
  item: LibraryItem,
  options: {
    force?: boolean;
  } = {}
): Promise<DjPerformanceCopyStatus> {
  ensureDjPerformanceCacheDir();

  const current =
    getDjPerformanceCopyStatus(
      item
    );

  if (
    current.ready &&
    !options.force
  ) {
    return current;
  }

  removeStaleCopies(
    item,
    current.path
  );

  const temporaryPath =
    `${current.path}.` +
    `${process.pid}.` +
    `${Date.now()}.tmp.m4a`;

  const ffmpegPath =
    resolveDjFfmpegPath();

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    item.locator,
    "-map",
    "0:a:0",
    "-vn",
    "-map_metadata",
    "-1",
    "-c:a",
    "aac",
    "-b:a",
    `${DJ_PERFORMANCE_BITRATE_KBPS}k`,
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    temporaryPath,
  ];

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const child = spawn(
          ffmpegPath,
          args,
          {
            windowsHide: true,
          }
        );

        let stderr = "";

        child.stderr.on(
          "data",
          (chunk: Buffer) => {
            stderr +=
              chunk.toString("utf8");

            if (
              stderr.length > 16_000
            ) {
              stderr =
                stderr.slice(-16_000);
            }
          }
        );

        child.on(
          "error",
          reject
        );

        child.on(
          "close",
          (
            code: number | null
          ) => {
            if (
              code === 0 &&
              fs.existsSync(
                temporaryPath
              )
            ) {
              resolve();
              return;
            }

            reject(
              new Error(
                stderr.trim() ||
                `DJ performance FFmpeg exited ${code}`
              )
            );
          }
        );
      }
    );

    try {
      if (
        fs.existsSync(
          current.path
        )
      ) {
        fs.unlinkSync(
          current.path
        );
      }
    } catch {}

    fs.renameSync(
      temporaryPath,
      current.path
    );

    removeStaleCopies(
      item,
      current.path
    );

    return getDjPerformanceCopyStatus(
      item
    );
  } catch (error) {
    try {
      if (
        fs.existsSync(
          temporaryPath
        )
      ) {
        fs.unlinkSync(
          temporaryPath
        );
      }
    } catch {}

    throw error;
  }
}