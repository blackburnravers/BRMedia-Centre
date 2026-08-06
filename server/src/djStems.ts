import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

import { getLibraryItem } from "./db/library";
import { validateLocalPathAllowed } from "./sources/local/validateLocalPathAllowed";
import { json } from "./utils/json";

const PROJECT_ROOT = fs.existsSync(
  path.join(
    process.cwd(),
    "server",
    "src"
  )
)
  ? process.cwd()
  : path.resolve(
      __dirname,
      "..",
      ".."
    );

const STEM_CACHE_ROOT =
  path.join(
    PROJECT_ROOT,
    "server",
    ".cache",
    "dj-stems"
  );

const STEM_NAMES = [
  "drums",
  "bass",
  "other",
  "vocals",
] as const;

type StemName =
  (typeof STEM_NAMES)[number];

type StemJobStatus =
  | "queued"
  | "running"
  | "ready"
  | "error";

type StemJob = {
  trackId: string;
  status: StemJobStatus;
  stage: string;
  progress: number;
  error: string;
  startedAt: number;
  updatedAt: number;
};

const stemJobs =
  new Map<
    string,
    StemJob
  >();

let stemQueue:
  Promise<void> =
  Promise.resolve();

function safeTrackId(
  trackId: string
) {
  return String(
    trackId || ""
  )
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    )
    .slice(
      0,
      120
    );
}

function getTrackDirectory(
  trackId: string
) {
  return path.join(
    STEM_CACHE_ROOT,
    safeTrackId(
      trackId
    )
  );
}

function getManifestPath(
  trackId: string
) {
  return path.join(
    getTrackDirectory(
      trackId
    ),
    "manifest.json"
  );
}

function getStemFilePath(
  trackId: string,
  stem: StemName
) {
  return path.join(
    getTrackDirectory(
      trackId
    ),
    `${stem}.flac`
  );
}

function ensureStemRoot() {
  fs.mkdirSync(
    STEM_CACHE_ROOT,
    {
      recursive: true,
    }
  );
}

function readManifest(
  trackId: string
): Record<
  string,
  unknown
> | null {
  try {
    const filePath =
      getManifestPath(
        trackId
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        filePath,
        "utf8"
      )
    );
  } catch {
    return null;
  }
}

function getReadyStemStatus(
  trackId: string
) {
  const manifest =
    readManifest(
      trackId
    );

  const ready =
    Boolean(
      manifest?.ready
    ) &&
    STEM_NAMES.every(
      (stem) =>
        fs.existsSync(
          getStemFilePath(
            trackId,
            stem
          )
        )
    );

  if (!ready) {
    return null;
  }

  const bytes =
    STEM_NAMES.reduce(
      (
        total,
        stem
      ) => {
        try {
          return (
            total +
            fs.statSync(
              getStemFilePath(
                trackId,
                stem
              )
            ).size
          );
        } catch {
          return total;
        }
      },
      0
    );

  return {
    trackId,
    status: "ready",
    stage: "ready",
    progress: 1,
    error: "",
    bytes,

    updatedAt:
      Number(
        manifest?.updatedAt ||
        Date.now()
      ),

    stems:
      Object.fromEntries(
        STEM_NAMES.map(
          (stem) => [
            stem,

            `/library/${encodeURIComponent(
              trackId
            )}/stems/${stem}`,
          ]
        )
      ),
  };
}

export function getDjStemStatus(
  trackId: string
) {
  const ready =
    getReadyStemStatus(
      trackId
    );

  if (ready) {
    return ready;
  }

  const job =
    stemJobs.get(
      trackId
    );

  if (job) {
    return {
      ...job,
      bytes: 0,
      stems: {},
    };
  }

  return {
    trackId,
    status: "missing",
    stage: "not-prepared",
    progress: 0,
    error: "",
    updatedAt: 0,
    bytes: 0,
    stems: {},
  };
}

function updateStemJob(
  trackId: string,
  patch:
    Partial<StemJob>
) {
  const current =
    stemJobs.get(
      trackId
    ) || {
      trackId,
      status:
        "queued" as const,
      stage: "queued",
      progress: 0,
      error: "",
      startedAt:
        Date.now(),
      updatedAt:
        Date.now(),
    };

  const next:
    StemJob = {
    ...current,
    ...patch,
    trackId,
    updatedAt:
      Date.now(),
  };

  stemJobs.set(
    trackId,
    next
  );

  return next;
}

function runProcess(
  command: string,
  args: string[],
  cwd?: string
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const child =
        spawn(
          command,
          args,
          {
            cwd,
            windowsHide:
              true,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          }
        );

      let stdout = "";
      let stderr = "";

      child.stdout.on(
        "data",
        (chunk) => {
          stdout +=
            String(
              chunk || ""
            );
        }
      );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr +=
            String(
              chunk || ""
            );
        }
      );

      child.on(
        "error",
        reject
      );

      child.on(
        "close",
        (code) => {
          if (code === 0) {
            resolve();
            return;
          }

          reject(
            new Error(
              (
                stderr ||
                stdout ||
                `${command} exited with code ${code}`
              )
                .trim()
                .slice(
                  -4000
                )
            )
          );
        }
      );
    }
  );
}

function findFileRecursive(
  root: string,
  targetName: string
): string | null {
  if (
    !fs.existsSync(root)
  ) {
    return null;
  }

  for (
    const entry
    of fs.readdirSync(
      root,
      {
        withFileTypes:
          true,
      }
    )
  ) {
    const absolute =
      path.join(
        root,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      const found =
        findFileRecursive(
          absolute,
          targetName
        );

      if (found) {
        return found;
      }

      continue;
    }

    if (
      entry.isFile() &&
      entry.name
        .toLowerCase() ===
        targetName
          .toLowerCase()
    ) {
      return absolute;
    }
  }

  return null;
}

async function runDemucs(
  sourcePath: string,
  outputDirectory: string
) {
  const configured =
    String(
      process.env
        .DEMUCS_PYTHON ||
      ""
    ).trim();

  const commands =
    configured
      ? [
          {
            command:
              configured,
            prefix: [],
          },
        ]

      : [
          {
            command: "py",
            prefix: ["-3"],
          },

          {
            command:
              "python",
            prefix: [],
          },
        ];

  const failures:
    string[] = [];

  for (
    const candidate
    of commands
  ) {
    try {
      await runProcess(
        candidate.command,
        [
          ...candidate.prefix,
          "-m",
          "demucs",
          "--name",
          "htdemucs",
          "--out",
          outputDirectory,
          sourcePath,
        ]
      );

      return;
    } catch (
      error: any
    ) {
      failures.push(
        String(
          error?.message ||
          error
        )
      );
    }
  }

  throw new Error(
    failures
      .filter(Boolean)
      .join("\n") ||
    "Could not start Demucs"
  );
}

async function prepareStemsNow(
  trackId: string,
  sourcePath: string
) {
  ensureStemRoot();

  const finalDirectory =
    getTrackDirectory(
      trackId
    );

  const workingDirectory =
    path.join(
      STEM_CACHE_ROOT,

      `.working-${safeTrackId(
        trackId
      )}-${Date.now()}`
    );

  fs.rmSync(
    workingDirectory,
    {
      recursive: true,
      force: true,
    }
  );

  fs.mkdirSync(
    workingDirectory,
    {
      recursive: true,
    }
  );

  updateStemJob(
    trackId,
    {
      status: "running",
      stage: "separating",
      progress: 0.08,
      error: "",
    }
  );

  try {
    await runDemucs(
      sourcePath,
      workingDirectory
    );

    updateStemJob(
      trackId,
      {
        stage:
          "encoding-lossless",
        progress: 0.76,
      }
    );

    fs.rmSync(
      finalDirectory,
      {
        recursive: true,
        force: true,
      }
    );

    fs.mkdirSync(
      finalDirectory,
      {
        recursive: true,
      }
    );

    const ffmpeg =
      String(
        process.env
          .FFMPEG_PATH ||
        "ffmpeg"
      ).trim();

    for (
      let index = 0;
      index <
        STEM_NAMES.length;
      index += 1
    ) {
      const stem =
        STEM_NAMES[index];

      const generatedWav =
        findFileRecursive(
          workingDirectory,
          `${stem}.wav`
        );

      if (!generatedWav) {
        throw new Error(
          `Demucs did not create ${stem}.wav`
        );
      }

      await runProcess(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          generatedWav,
          "-compression_level",
          "8",

          getStemFilePath(
            trackId,
            stem
          ),
        ]
      );

      updateStemJob(
        trackId,
        {
          progress:
            0.76 +
            (
              (
                index + 1
              ) /
              STEM_NAMES.length
            ) *
            0.2,
        }
      );
    }

    fs.writeFileSync(
      getManifestPath(
        trackId
      ),

      JSON.stringify(
        {
          version: 1,
          trackId,
          sourcePath,
          ready: true,
          model:
            "htdemucs",
          format: "flac",
          stems:
            STEM_NAMES,
          updatedAt:
            Date.now(),
        },
        null,
        2
      ),

      "utf8"
    );

    updateStemJob(
      trackId,
      {
        status: "ready",
        stage: "ready",
        progress: 1,
        error: "",
      }
    );
  } catch (
    error: any
  ) {
    fs.rmSync(
      finalDirectory,
      {
        recursive: true,
        force: true,
      }
    );

    const message =
      String(
        error?.message ||
        "Stem separation failed"
      );

    updateStemJob(
      trackId,
      {
        status: "error",
        stage: "error",
        progress: 0,

        error:
          /No module named demucs|not recognized|ENOENT/i
            .test(
              message
            )
            ? "Demucs is not installed. Run: py -3 -m pip install -U demucs"
            : message,
      }
    );
  } finally {
    fs.rmSync(
      workingDirectory,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

function queueStemPreparation(
  trackId: string,
  sourcePath: string
) {
  const existing =
    stemJobs.get(
      trackId
    );

  if (
    existing &&
    (
      existing.status ===
        "queued" ||
      existing.status ===
        "running"
    )
  ) {
    return existing;
  }

  const queued =
    updateStemJob(
      trackId,
      {
        status: "queued",
        stage: "queued",
        progress: 0,
        error: "",
        startedAt:
          Date.now(),
      }
    );

  stemQueue =
    stemQueue
      .catch(
        () => {}
      )
      .then(
        () =>
          prepareStemsNow(
            trackId,
            sourcePath
          )
      );

  return queued;
}

function streamStem(
  req: IncomingMessage,
  res: ServerResponse,
  trackId: string,
  stem: StemName
) {
  const filePath =
    getStemFilePath(
      trackId,
      stem
    );

  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return json(
      res,
      404,
      {
        error:
          "Stem is not prepared",
      }
    );
  }

  const stat =
    fs.statSync(
      filePath
    );

  res.statusCode = 200;

  res.setHeader(
    "Content-Type",
    "audio/flac"
  );

  res.setHeader(
    "Content-Length",
    String(
      stat.size
    )
  );

  res.setHeader(
    "Cache-Control",
    "private, max-age=86400"
  );

  if (
    req.method === "HEAD"
  ) {
    res.end();
    return true;
  }

  fs.createReadStream(
    filePath
  ).pipe(res);

  return true;
}

export async function handleDjStemsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  cfg: {
    localAllowedBases:
      string[];
  }
): Promise<boolean> {
  const streamMatch =
    url.pathname.match(
      /^\/library\/([^/]+)\/stems\/(drums|bass|other|vocals)$/
    );

  if (
    streamMatch &&
    (
      req.method === "GET" ||
      req.method === "HEAD"
    )
  ) {
    return streamStem(
      req,
      res,

      decodeURIComponent(
        streamMatch[1]
      ),

      streamMatch[2] as
        StemName
    );
  }

  const routeMatch =
    url.pathname.match(
      /^\/library\/([^/]+)\/stems$/
    );

  if (!routeMatch) {
    return false;
  }

  const trackId =
    decodeURIComponent(
      routeMatch[1]
    );

  const item =
    getLibraryItem(
      trackId
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

  if (
    req.method === "GET"
  ) {
    return json(
      res,
      200,

      getDjStemStatus(
        trackId
      )
    );
  }

  if (
    req.method === "POST"
  ) {
    const sourcePath =
      path.resolve(
        item.locator
      );

    const allowed =
      validateLocalPathAllowed(
        sourcePath,

        cfg.localAllowedBases
      );

    if (!allowed.ok) {
      return json(
        res,
        403,
        {
          error:
            allowed.reason,
        }
      );
    }

    if (
      !fs.existsSync(
        sourcePath
      )
    ) {
      return json(
        res,
        404,
        {
          error:
            "Original track file is offline",
        }
      );
    }

    const ready =
      getReadyStemStatus(
        trackId
      );

    if (ready) {
      return json(
        res,
        200,
        ready
      );
    }

    return json(
      res,
      202,

      queueStemPreparation(
        trackId,
        sourcePath
      )
    );
  }

  if (
    req.method === "DELETE"
  ) {
    fs.rmSync(
      getTrackDirectory(
        trackId
      ),
      {
        recursive: true,
        force: true,
      }
    );

    stemJobs.delete(
      trackId
    );

    return json(
      res,
      200,
      {
        ok: true,
        trackId,
        status: "missing",
      }
    );
  }

  return false;
}