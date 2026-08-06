import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

import {
  convertDjRecording,
  type DjRecordingOutputFormat,
} from "./djRecordingConvert";

import {
  archiveDjRecording,
} from "./djRecordingArchive";
import {
  updateM22ArchiveLink,
  type M22ArchiveLink,
} from "./m22ArchiveLink";

import {
  removeLibraryItem,
} from "./db/library";

import { json } from "./utils/json";

const PROJECT_ROOT =
  fs.existsSync(
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

const RECORDING_ROOT =
  path.join(
    PROJECT_ROOT,
    "server",
    ".uploads",
    "dj-recordings"
  );

type RecordingStatus =
  | "recording"
  | "processing"
  | "saved"
  | "error";

type RecordingArchiveStatus =
  | "pending"
  | "archiving"
  | "archived"
  | "error";

type RecordingSession = {
  id: string;
  title: string;

  captureMimeType:
    string;

  captureExtension:
    string;

  finalMimeType:
    string;

  outputFormat:
    DjRecordingOutputFormat;

  channels: string;
  sampleRate: string;
  mp3Bitrate: string;
  mp3Mode: string;
  wavBitDepth: string;
  flacCompression: string;

  serverFinalise:
    boolean;

  browserSafetyCapture:
    boolean;

  archiveStatus:
    RecordingArchiveStatus;

  archiveDestination:
    string;

  createSessionFolder:
    boolean;

  autoNumberDuplicates:
    boolean;

  txtTracklist:
    boolean;

  timestampJson:
    boolean;

  sessionJson:
    boolean;

  metadataJson:
    boolean;

  saveArtwork:
    boolean;

  artworkDataUrl:
    string;

  mixSetup:
    Record<
      string,
      unknown
    >;

  setPlan:
    Record<
      string,
      unknown
    >;

  recordSetup:
    Record<
      string,
      unknown
    >;

  handoffs:
    Record<
      string,
      unknown
    >;

  archiveRoot:
    string;

  archiveDirectory:
    string;

  archiveFilePath:
    string;

  artworkFilePath:
    string;

  sidecarFiles:
    string[];

  libraryItemId:
    string;

  status:
    RecordingStatus;

  stage: string;
  progress: number;
  error: string;

  uploadedBytes:
    number;

  rawBytes:
    number;

  bytes: number;
  chunks: number;
  createdAt: number;
  updatedAt: number;
  durationMs: number;

  rawFileName:
    string;

  fileName:
    string;
};

const sessions =
  new Map<
    string,
    RecordingSession
  >();

const activeConversions =
  new Set<string>();

let conversionQueue:
  Promise<void> =
  Promise.resolve();
	
let recordingLocalAllowedBases:
  string[] = [];

function ensureRoot() {
  fs.mkdirSync(
    RECORDING_ROOT,
    {
      recursive: true,
    }
  );
}

function safeName(
  value: unknown
) {
  return (
    String(
      value ||
      "BRMedia DJ Recording"
    )
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .slice(
        0,
        120
      ) ||

    "BRMedia DJ Recording"
  );
}

function booleanValue(
  value: unknown,
  fallback: boolean
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value ===
    "string"
  ) {
    return ![
      "0",
      "false",
      "off",
      "no",
    ].includes(
      value
        .trim()
        .toLowerCase()
    );
  }

  return Boolean(
    value
  );
}

function objectValue(
  value: unknown
): Record<
  string,
  unknown
> {
  return (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as Record<
        string,
        unknown
      >

    : {};
}

function extensionForMime(
  mimeType: string
) {
  const mime =
    String(
      mimeType ||
      ""
    ).toLowerCase();

  if (
    mime.includes(
      "mp4"
    )
  ) {
    return "m4a";
  }

  if (
    mime.includes(
      "ogg"
    )
  ) {
    return "ogg";
  }

  if (
    mime.includes(
      "mpeg"
    )
  ) {
    return "mp3";
  }

  return "webm";
}

function normaliseOutputFormat(
  value: unknown
): DjRecordingOutputFormat {
  const format =
    String(
      value ||
      "mp3"
    ).toLowerCase();

  return [
    "wav",
    "flac",
    "mp3",
    "raw",
  ].includes(format)
    ? format as
        DjRecordingOutputFormat

    : "mp3";
}

function mimeForFormat(
  format:
    DjRecordingOutputFormat,

  captureMimeType =
    "audio/webm"
) {
  if (
    format === "wav"
  ) {
    return "audio/wav";
  }

  if (
    format === "flac"
  ) {
    return "audio/flac";
  }

  if (
    format === "mp3"
  ) {
    return "audio/mpeg";
  }

  return (
    captureMimeType ||
    "application/octet-stream"
  );
}

function extensionForFormat(
  format:
    DjRecordingOutputFormat,

  captureExtension:
    string
) {
  return format === "raw"
    ? captureExtension
    : format;
}

function partPath(
  id: string
) {
  return path.join(
    RECORDING_ROOT,
    `${id}.part`
  );
}

function manifestPath(
  id: string
) {
  return path.join(
    RECORDING_ROOT,
    `${id}.json`
  );
}

function rawPath(
  session:
    RecordingSession
) {
  return path.join(
    RECORDING_ROOT,
    session.rawFileName
  );
}

function finalPath(
  session:
    RecordingSession
) {
  return path.join(
    RECORDING_ROOT,
    session.fileName
  );
}

function fileHasData(
  filePath:
    string
) {
  try {
    return (
      fs.statSync(
        filePath
      ).size > 0
    );
  } catch {
    return false;
  }
}

function saveSession(
  session:
    RecordingSession
) {
  ensureRoot();

  session.updatedAt =
    Date.now();

  sessions.set(
    session.id,
    session
  );

  fs.writeFileSync(
    manifestPath(
      session.id
    ),

    JSON.stringify(
      session,
      null,
      2
    ),

    "utf8"
  );
}

export function updateDjRecordingM22Link(
  recordingId: string,
  link: M22ArchiveLink | null
) {
  const session = readSession(recordingId);
  if (!session) throw new Error("Recording not found");
  if (session.archiveStatus !== "archived" || !session.archiveDirectory) throw new Error("Recording must be archived before linking a Set Plan");
  const result = updateM22ArchiveLink({ recordingId, manifestPath: manifestPath(recordingId), archiveDirectory: session.archiveDirectory }, link);
  session.setPlan = link ? { ...link } : {};
  if (link) session.sidecarFiles = Array.from(new Set([...session.sidecarFiles, path.join(session.archiveDirectory, "set-plan.json"), path.join(session.archiveDirectory, "tracklist.txt")]));
  else session.sidecarFiles = session.sidecarFiles.filter(item => path.resolve(item) !== path.join(path.resolve(session.archiveDirectory), "set-plan.json"));
  saveSession(session);
  return result;
}

function normaliseSession(
  value:
    Partial<
      RecordingSession
    > &
    Record<
      string,
      unknown
    >,

  id: string
): RecordingSession {
  const legacyMimeType =
    String(
      value.captureMimeType ||
      value.finalMimeType ||
      value.mimeType ||
      "audio/webm"
    );

  const captureExtension =
    String(
      value.captureExtension ||
      value.extension ||
      extensionForMime(
        legacyMimeType
      )
    );

  const outputFormat =
    normaliseOutputFormat(
      value.outputFormat ||

      (
        [
          "wav",
          "flac",
          "mp3",
        ].includes(
          String(
            value.extension ||
            ""
          )
        )
          ? value.extension
          : "raw"
      )
    );

  const title =
    safeName(
      value.title
    );

  const timestamp =
    new Date(
      Number(
        value.createdAt
      ) ||
      Date.now()
    )
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      );

  const fileName =
    String(
      value.fileName ||

      `${title} - ${timestamp}.${extensionForFormat(
        outputFormat,
        captureExtension
      )}`
    );

  const rawFileName =
    String(
      value.rawFileName ||

      `${id}.source.${captureExtension}`
    );

  const status =
    [
      "recording",
      "processing",
      "saved",
      "error",
    ].includes(
      String(
        value.status ||
        ""
      )
    )
      ? value.status as
          RecordingStatus

      : "error";

  const legacyBytes =
    Math.max(
      0,

      Number(
        value.bytes
      ) ||
      0
    );

  return {
    id,
    title,
    captureMimeType:
      legacyMimeType,

    captureExtension,

    finalMimeType:
      String(
        value.finalMimeType ||

        mimeForFormat(
          outputFormat,
          legacyMimeType
        )
      ),

    outputFormat,

    channels:
      String(
        value.channels ||
        "stereo"
      ),

    sampleRate:
      String(
        value.sampleRate ||
        "Source/default"
      ),

    mp3Bitrate:
      String(
        value.mp3Bitrate ||
        "320"
      ),

    mp3Mode:
      String(
        value.mp3Mode ||
        "CBR"
      ),

    wavBitDepth:
      String(
        value.wavBitDepth ||
        "24-bit"
      ),

    flacCompression:
      String(
        value.flacCompression ||
        "5 balanced"
      ),

    serverFinalise:
      booleanValue(
        value.serverFinalise,
        outputFormat !==
          "raw"
      ),

    browserSafetyCapture:
      booleanValue(
        value.browserSafetyCapture,
        true
      ),
			
    archiveStatus:
      [
        "pending",
        "archiving",
        "archived",
        "error",
      ].includes(
        String(
          value.archiveStatus ||
          ""
        )
      )
        ? value.archiveStatus as
            RecordingArchiveStatus

        : value.archiveFilePath
          ? "archived"
          : "pending",

    archiveDestination:
      String(
        value.archiveDestination ||
        value.destination ||
        "BRMedia DJ Recordings"
      ),

    createSessionFolder:
      booleanValue(
        value.createSessionFolder,
        true
      ),

    autoNumberDuplicates:
      booleanValue(
        value.autoNumberDuplicates,
        true
      ),

    txtTracklist:
      booleanValue(
        value.txtTracklist,
        true
      ),

    timestampJson:
      booleanValue(
        value.timestampJson,
        true
      ),

    sessionJson:
      booleanValue(
        value.sessionJson,
        true
      ),

    metadataJson:
      booleanValue(
        value.metadataJson,
        true
      ),

    saveArtwork:
      booleanValue(
        value.saveArtwork,
        true
      ),

    artworkDataUrl:
      String(
        value.artworkDataUrl ||
        ""
      ),

    mixSetup:
      objectValue(
        value.mixSetup
      ),

    setPlan:
      objectValue(
        value.setPlan
      ),

    recordSetup:
      objectValue(
        value.recordSetup
      ),

    handoffs:
      objectValue(
        value.handoffs
      ),

    archiveRoot:
      String(
        value.archiveRoot ||
        ""
      ),

    archiveDirectory:
      String(
        value.archiveDirectory ||
        ""
      ),

    archiveFilePath:
      String(
        value.archiveFilePath ||
        ""
      ),

    artworkFilePath:
      String(
        value.artworkFilePath ||
        ""
      ),

    sidecarFiles:
      Array.isArray(
        value.sidecarFiles
      )
        ? value.sidecarFiles
            .map(
              (item) =>
                String(
                  item ||
                  ""
                )
            )
            .filter(
              Boolean
            )

        : [],

    libraryItemId:
      String(
        value.libraryItemId ||
        ""
      ),

    status,

    stage:
      String(
        value.stage ||

        (
          status === "saved"
            ? "ready"

            : status ===
                "processing"
              ? "queued"

              : status
        )
      ),

    progress:
      Math.max(
        0,

        Math.min(
          1,

          Number(
            value.progress
          ) ||

          (
            status ===
            "saved"
              ? 1
              : 0
          )
        )
      ),

    error:
      String(
        value.error ||
        ""
      ),

    uploadedBytes:
      Math.max(
        0,

        Number(
          value.uploadedBytes
        ) ||

        (
          status ===
          "recording"
            ? legacyBytes
            : 0
        )
      ),

    rawBytes:
      Math.max(
        0,

        Number(
          value.rawBytes
        ) ||
        0
      ),

    bytes:
      legacyBytes,

    chunks:
      Math.max(
        0,

        Number(
          value.chunks
        ) ||
        0
      ),

    createdAt:
      Number(
        value.createdAt
      ) ||
      Date.now(),

    updatedAt:
      Number(
        value.updatedAt
      ) ||
      Date.now(),

    durationMs:
      Math.max(
        0,

        Number(
          value.durationMs
        ) ||
        0
      ),

    rawFileName,
    fileName,
  };
}

function readSession(
  id: string
):
  RecordingSession |
  null {
  const cached =
    sessions.get(id);

  if (cached) {
    ensureConversionQueued(
      cached
    );

    return cached;
  }

  try {
    const parsed =
      JSON.parse(
        fs.readFileSync(
          manifestPath(id),
          "utf8"
        )
      ) as
        Partial<
          RecordingSession
        > &
        Record<
          string,
          unknown
        >;

    const session =
      normaliseSession(
        parsed,
        id
      );

    sessions.set(
      id,
      session
    );

    ensureConversionQueued(
      session
    );

    return session;
  } catch {
    return null;
  }
}

function publicSession(
  session:
    RecordingSession
) {
  const savedPath =
    savedRecordingPath(session);

  const partFileHasData =
    fileHasData(
      partPath(session.id)
    );

  const rawFileHasData =
    fileHasData(
      rawPath(session)
    );

  const finalFileHasData =
    fileHasData(
      finalPath(session)
    );

  const conversionActive =
    activeConversions.has(
      session.id
    );

  const updatedAt =
    Number(
      session.updatedAt ||
      session.createdAt ||
      0
    );

  const inactiveForMs =
    updatedAt
      ? Math.max(
          0,
          Date.now() -
          updatedAt
        )
      : 0;

  const stalled =
    (
      session.status ===
        "processing" ||
      session.status ===
        "recording"
    ) &&
    !conversionActive &&
    !partFileHasData &&
    !rawFileHasData &&
    !finalFileHasData &&
    inactiveForMs >=
      60_000;

  const savedFileExists =
    session.status ===
      "saved" &&
    fs.existsSync(savedPath);

  const artworkAvailable =
    Boolean(
      session.artworkFilePath &&
      fs.existsSync(
        session.artworkFilePath
      )
    );

  return {
    id:
      session.id,

    title:
      session.title,

    status:
      session.status,

    stage:
      stalled
        ? "stalled"
        : session.stage,

    stalled,

    conversionActive,

    progress:
      session.progress,

    error:
      stalled
        ? (
            session.error ||
            "This recording session stopped before any usable recording data was saved"
          )
        : session.error,

    outputFormat:
      session.outputFormat,

    finalMimeType:
      session.finalMimeType,

    uploadedBytes:
      session.uploadedBytes,

    rawBytes:
      session.rawBytes,

    bytes:
      session.bytes,

    fileSize:
      savedFileExists
        ? fs.statSync(
            savedPath
          ).size
        : session.bytes,

    chunks:
      session.chunks,

    createdAt:
      session.createdAt,

    updatedAt:
      session.updatedAt,

    durationMs:
      session.durationMs,

    fileName:
      session.fileName,

    archiveStatus:
      session.archiveStatus,

    archiveDirectory:
      session.archiveDirectory,

    artworkAvailable,

    artworkUrl:
      artworkAvailable
        ? `/dj-recordings/${encodeURIComponent(
            session.id
          )}/artwork`
        : "",

    sidecarFiles:
      session.sidecarFiles,

    setPlan:
      session.setPlan,

    libraryItemId:
      session.libraryItemId,

    recoveryAvailable:
      rawFileHasData ||
      (
        session.archiveStatus !==
          "archived" &&
        finalFileHasData
      ),

    handoffUrls:
      session.libraryItemId
        ? {
            player:
              `/player?trackId=${encodeURIComponent(
                session.libraryItemId
              )}`,

            mastering:
              `/mastering?trackId=${encodeURIComponent(
                session.libraryItemId
              )}`,

            converter:
              `/converter?trackId=${encodeURIComponent(
                session.libraryItemId
              )}`,

            tagger:
              `/tagger?trackId=${encodeURIComponent(
                session.libraryItemId
              )}`,

            files:
              `/settings?module=cloud&tab=files&trackId=${encodeURIComponent(
                session.libraryItemId
              )}`,
          }
        : {},

    downloadUrl:
      savedFileExists
        ? `/dj-recordings/${encodeURIComponent(
            session.id
          )}/download`
        : "",
  };
}

function readBody(
  req:
    IncomingMessage,

  maxBytes:
    number
): Promise<Buffer> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const chunks:
        Buffer[] = [];

      let total =
        0;

      let finished =
        false;

      const fail = (
        error: Error
      ) => {
        if (finished) {
          return;
        }

        finished =
          true;

        reject(error);
      };

      req.on(
        "data",

        (
          chunk:
            Buffer |
            string
        ) => {
          if (finished) {
            return;
          }

          const buffer =
            Buffer.isBuffer(
              chunk
            )
              ? chunk

              : Buffer.from(
                  chunk
                );

          total +=
            buffer.length;

          if (
            total >
            maxBytes
          ) {
            fail(
              new Error(
                "Recording upload is too large"
              )
            );

            req.destroy();
            return;
          }

          chunks.push(
            buffer
          );
        }
      );

      req.on(
        "end",

        () => {
          if (finished) {
            return;
          }

          finished =
            true;

          resolve(
            Buffer.concat(
              chunks
            )
          );
        }
      );

      req.on(
        "error",
        fail
      );
    }
  );
}

async function readJson(
  req:
    IncomingMessage
) {
  const buffer =
    await readBody(
      req,
      1024 * 1024
    );

  if (!buffer.length) {
    return {} as
      Record<
        string,
        unknown
      >;
  }

  const parsed =
    JSON.parse(
      buffer.toString(
        "utf8"
      )
    );

  return (
    parsed &&
    typeof parsed ===
      "object"
  )
    ? parsed as
        Record<
          string,
          unknown
        >

    : {};
}

async function archiveFinishedRecording(
  session:
    RecordingSession
) {
  if (
    session.archiveStatus ===
      "archived" &&

    session.archiveFilePath &&

    fs.existsSync(
      session.archiveFilePath
    )
  ) {
    session.status =
      "saved";

    session.stage =
      "archived";

    session.progress =
      1;

    session.error =
      "";

    saveSession(
      session
    );

    return;
  }

  const sourcePath =
    finalPath(
      session
    );

  if (
    !fs.existsSync(
      sourcePath
    )
  ) {
    throw new Error(
      "The finished recording file is missing before archive finalisation"
    );
  }

  if (
    !recordingLocalAllowedBases
      .length
  ) {
    throw new Error(
      "BRMedia recording archive roots are not available"
    );
  }

  session.status =
    "processing";

  session.stage =
    "archiving";

  session.progress =
    Math.max(
      0.99,
      session.progress ||
      0
    );

  session.archiveStatus =
    "archiving";

  session.error =
    "";

  saveSession(
    session
  );

  const result =
    await archiveDjRecording(
      {
        id:
          session.id,

        title:
          session.title,

        fileName:
          session.fileName,

        sourcePath,

        outputFormat:
          session.outputFormat,

        finalMimeType:
          session.finalMimeType,

        durationMs:
          session.durationMs,

        createdAt:
          session.createdAt,

        destination:
          session.archiveDestination,

        createSessionFolder:
          session.createSessionFolder,

        autoNumberDuplicates:
          session.autoNumberDuplicates,

        txtTracklist:
          session.txtTracklist,

        timestampJson:
          session.timestampJson,

        sessionJson:
          session.sessionJson,

        metadataJson:
          session.metadataJson,

        saveArtwork:
          session.saveArtwork,

        artworkDataUrl:
          session.artworkDataUrl,

        mixSetup:
          session.mixSetup,

        setPlan:
          session.setPlan,

        recordSetup:
          session.recordSetup,

        handoffs:
          session.handoffs,

        localAllowedBases:
          recordingLocalAllowedBases,
      }
    );

  session.archiveStatus =
    result.archiveStatus;

  session.archiveRoot =
    result.archiveRoot;

  session.archiveDirectory =
    result.archiveDirectory;

  session.archiveFilePath =
    result.archiveFilePath;

  session.artworkFilePath =
    result.artworkFilePath;

  session.sidecarFiles =
    result.sidecarFiles;

  session.libraryItemId =
    result.libraryItemId;

  session.bytes =
    fs.statSync(
      result.archiveFilePath
    ).size;

  session.status =
    "saved";

  session.stage =
    "archived";

  session.progress =
    1;

  session.error =
    "";

  if (
    !session
      .browserSafetyCapture
  ) {
    fs.rmSync(
      rawPath(
        session
      ),
      {
        force: true,
      }
    );
  }

  saveSession(
    session
  );
}

async function completeRawRecording(
  session:
    RecordingSession
) {
  const source =
    rawPath(
      session
    );

  const output =
    finalPath(
      session
    );

  fs.rmSync(
    output,
    {
      force: true,
    }
  );

  if (
    source !==
    output
  ) {
    fs.renameSync(
      source,
      output
    );
  }

  session.outputFormat =
    "raw";

  session.finalMimeType =
    session.captureMimeType;

  session.bytes =
    fs.statSync(
      output
    ).size;

  await archiveFinishedRecording(
    session
  );
}

async function runConversion(
  session:
    RecordingSession
) {
  if (
    activeConversions.has(
      session.id
    )
  ) {
    return;
  }

  activeConversions.add(
    session.id
  );

  try {
    session.status =
      "processing";

    session.stage =
      "converting";

    session.progress =
      Math.max(
        0.03,

        session.progress ||
        0
      );

    session.error =
      "";

    saveSession(
      session
    );

    let lastPersistAt =
      0;

    await convertDjRecording(
      {
        inputPath:
          rawPath(
            session
          ),

        outputPath:
          finalPath(
            session
          ),

        format:
          session.outputFormat,

        title:
          session.title,

        durationMs:
          session.durationMs,

        channels:
          session.channels,

        sampleRate:
          session.sampleRate,

        mp3Bitrate:
          session.mp3Bitrate,

        mp3Mode:
          session.mp3Mode,

        wavBitDepth:
          session.wavBitDepth,

        flacCompression:
          session.flacCompression,

        onProgress(
          progress,
          stage
        ) {
          session.progress =
            progress;

          session.stage =
            stage;

          const now =
            Date.now();

          if (
            progress >= 1 ||
            now -
              lastPersistAt >=
              500
          ) {
            lastPersistAt =
              now;

            saveSession(
              session
            );
          }
        },
      }
    );

    session.finalMimeType =
      mimeForFormat(
        session.outputFormat,
        session.captureMimeType
      );

    session.bytes =
      fs.statSync(
        finalPath(
          session
        )
      ).size;

    await archiveFinishedRecording(
      session
    );
  } catch (
    error
  ) {
    session.status =
      "error";

    session.stage =
      "error";

    session.progress =
      0;

    if (
      session.archiveStatus ===
      "archiving"
    ) {
      session.archiveStatus =
        "error";
    }

    session.error =
      error instanceof
        Error
        ? error.message

        : "Recording finalisation failed";

    saveSession(
      session
    );
  } finally {
    activeConversions.delete(
      session.id
    );
  }
}

function ensureConversionQueued(
  session:
    RecordingSession
) {
  if (
    activeConversions.has(
      session.id
    ) ||

    (
      session.archiveStatus ===
        "archived" &&

      session.archiveFilePath &&

      fs.existsSync(
        session.archiveFilePath
      )
    )
  ) {
    return;
  }

  const finishedFileHasData =
    fileHasData(
      finalPath(
        session
      )
    );

  const rawFileHasData =
    fileHasData(
      rawPath(
        session
      )
    );

  const shouldArchive =
    finishedFileHasData &&
    [
      "processing",
      "saved",
      "error",
    ].includes(
      session.status
    );

  const shouldConvert =
    session.status ===
      "processing" &&
    rawFileHasData;

  if (
    !shouldArchive &&
    !shouldConvert
  ) {
    return;
  }

  if (
    shouldArchive
  ) {
    session.status =
      "processing";

    session.stage =
      "archive-queued";

    session.archiveStatus =
      session.archiveStatus ===
        "archived"
        ? "archived"
        : "pending";

    session.progress =
      Math.max(
        0.99,
        session.progress ||
        0
      );

    saveSession(
      session
    );
  }

  activeConversions.add(
    session.id
  );

  conversionQueue =
    conversionQueue
      .catch(
        () =>
          undefined
      )
      .then(
        async () => {
          activeConversions.delete(
            session.id
          );

          if (
            fileHasData(
              finalPath(
                session
              )
            )
          ) {
            try {
              await archiveFinishedRecording(
                session
              );
            } catch (
              error
            ) {
              session.status =
                "error";

              session.stage =
                "error";

              session.archiveStatus =
                "error";

              session.error =
                error instanceof
                  Error
                  ? error.message
                  : "Recording archive failed";

              saveSession(
                session
              );
            }

            return;
          }

          await runConversion(
            session
          );
        }
      );
}

function savedRecordingPath(
  session:
    RecordingSession
) {
  if (
    session.archiveFilePath &&
    fs.existsSync(
      session.archiveFilePath
    )
  ) {
    return session
      .archiveFilePath;
  }

  return finalPath(
    session
  );
}

function listRecordingSessions() {
  ensureRoot();

  return fs
    .readdirSync(
      RECORDING_ROOT,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(
          ".json"
        )
    )
    .map(
      (entry) =>
        readSession(
          entry.name.slice(
            0,
            -5
          )
        )
    )
    .filter(
      (session):
        session is
          RecordingSession =>
        Boolean(
          session
        )
    )
    .sort(
      (a, b) =>
        b.createdAt -
        a.createdAt
    );
}

function deleteArchivedFiles(
  session:
    RecordingSession
) {
  if (
    session.libraryItemId
  ) {
    removeLibraryItem(
      session.libraryItemId
    );
  }

  const canRemoveSessionFolder =
    session.createSessionFolder &&
    session.archiveDirectory &&
    session.archiveRoot &&
    path.resolve(
      session.archiveDirectory
    ) !==
      path.resolve(
        session.archiveRoot
      );

  if (
    canRemoveSessionFolder
  ) {
    fs.rmSync(
      session.archiveDirectory,
      {
        recursive: true,
        force: true,
      }
    );

    return;
  }

  [
    session.archiveFilePath,
    session.artworkFilePath,
    ...session.sidecarFiles,
  ]
    .filter(
      Boolean
    )
    .forEach(
      (filePath) => {
        fs.rmSync(
          filePath,
          {
            force: true,
          }
        );
      }
    );
}

function streamSavedRecording(
  req:
    IncomingMessage,

  res:
    ServerResponse,

  session:
    RecordingSession
) {
  const filePath =
    savedRecordingPath(
      session
    );

  if (
    session.status !==
      "saved" ||

    !fs.existsSync(
      filePath
    )
  ) {
    return json(
      res,
      404,
      {
        error:
          "Recording is not saved",
      }
    );
  }

  const size =
    fs.statSync(
      filePath
    ).size;

  res.statusCode =
    200;

  res.setHeader(
    "Content-Type",

    session.finalMimeType ||
    "application/octet-stream"
  );

  res.setHeader(
    "Content-Length",
    String(size)
  );

  res.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  res.setHeader(
    "Content-Disposition",

    `attachment; filename="${session.fileName.replace(
      /"/g,
      ""
    )}"`
  );

  if (
    req.method ===
    "HEAD"
  ) {
    res.end();
    return true;
  }

  fs.createReadStream(
    filePath
  ).pipe(res);

  return true;
}

function streamRecordingArtwork(
  req:
    IncomingMessage,

  res:
    ServerResponse,

  session:
    RecordingSession
) {
  const filePath =
    session.artworkFilePath;

  if (
    !filePath ||
    !fs.existsSync(filePath)
  ) {
    return json(
      res,
      404,
      {
        error:
          "Recording artwork is not available",
      }
    );
  }

  const extension =
    path
      .extname(filePath)
      .toLowerCase();

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : "image/jpeg";

  const size =
    fs.statSync(filePath).size;

  res.statusCode =
    200;

  res.setHeader(
    "Content-Type",
    mimeType
  );

  res.setHeader(
    "Content-Length",
    String(size)
  );

  res.setHeader(
    "Cache-Control",
    "private, max-age=300"
  );

  if (
    req.method ===
      "HEAD"
  ) {
    res.end();
    return true;
  }

  fs
    .createReadStream(filePath)
    .pipe(res);

  return true;
}

export async function handleDjRecordingRoute(
  req:
    IncomingMessage,

  res:
    ServerResponse,

  url: URL,

  cfg: {
    localAllowedBases:
      string[];
  }
): Promise<boolean> {
  recordingLocalAllowedBases =
    Array.from(
      new Set(
        cfg.localAllowedBases
          .map(
            (item) =>
              path.resolve(
                item
              )
          )
      )
    );

  if (
    req.method ===
      "GET" &&

    url.pathname ===
      "/dj-recordings"
  ) {
    return json(
      res,
      200,
      {
        items:
          listRecordingSessions()
            .map(
              publicSession
            ),
      }
    );
  }
	
  if (
    req.method ===
      "POST" &&

    url.pathname ===
      "/dj-recordings/session"
  ) {
    ensureRoot();

    let body:
      Record<
        string,
        unknown
      > = {};

    try {
      body =
        await readJson(
          req
        );
    } catch {
      body = {};
    }

    const id =
      `${Date.now().toString(
        36
      )}-${crypto
        .randomBytes(5)
        .toString("hex")}`;

    const captureMimeType =
      String(
        body.mimeType ||
        "audio/webm"
      ).slice(
        0,
        100
      );

    const captureExtension =
      extensionForMime(
        captureMimeType
      );

    const serverFinalise =
      booleanValue(
        body.serverFinalise,
        true
      );

    const requestedFormat =
      normaliseOutputFormat(
        body.outputFormat
      );

    const outputFormat =
      serverFinalise
        ? requestedFormat
        : "raw";

    const title =
      safeName(
        body.title
      );

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );

    const outputExtension =
      extensionForFormat(
        outputFormat,
        captureExtension
      );

    const session:
      RecordingSession = {
      id,
      title,
      captureMimeType,
      captureExtension,

      finalMimeType:
        mimeForFormat(
          outputFormat,
          captureMimeType
        ),

      outputFormat,

      channels:
        String(
          body.channels ||
          "stereo"
        ),

      sampleRate:
        String(
          body.sampleRate ||
          "Source/default"
        ),

      mp3Bitrate:
        String(
          body.mp3Bitrate ||
          "320"
        ),

      mp3Mode:
        String(
          body.mp3Mode ||
          "CBR"
        ),

      wavBitDepth:
        String(
          body.wavBitDepth ||
          "24-bit"
        ),

      flacCompression:
        String(
          body.flacCompression ||
          "5 balanced"
        ),

      serverFinalise,

      browserSafetyCapture:
        booleanValue(
          body.browserSafetyCapture,
          true
        ),
				
      archiveStatus:
        "pending",

      archiveDestination:
        String(
          body.archiveDestination ||
          body.destination ||
          "BRMedia DJ Recordings"
        ),

      createSessionFolder:
        booleanValue(
          body.createSessionFolder,
          true
        ),

      autoNumberDuplicates:
        booleanValue(
          body.autoNumberDuplicates,
          true
        ),

      txtTracklist:
        booleanValue(
          body.txtTracklist,
          true
        ),

      timestampJson:
        booleanValue(
          body.timestampJson,
          true
        ),

      sessionJson:
        booleanValue(
          body.sessionJson,
          true
        ),

      metadataJson:
        booleanValue(
          body.metadataJson,
          true
        ),

      saveArtwork:
        booleanValue(
          body.saveArtwork,
          true
        ),

      artworkDataUrl:
        String(
          body.artworkDataUrl ||
          ""
        ),

      mixSetup:
        objectValue(
          body.mixSetup
        ),

      setPlan:
        objectValue(
          body.setPlan
        ),

      recordSetup:
        objectValue(
          body.recordSetup
        ),

      handoffs:
        objectValue(
          body.handoffs
        ),

      archiveRoot:
        "",

      archiveDirectory:
        "",

      archiveFilePath:
        "",

      artworkFilePath:
        "",

      sidecarFiles:
        [],

      libraryItemId:
        "",

      status:
        "recording",

      stage:
        "recording",

      progress:
        0,

      error:
        "",

      uploadedBytes:
        0,

      rawBytes:
        0,

      bytes:
        0,

      chunks:
        0,

      createdAt:
        Date.now(),

      updatedAt:
        Date.now(),

      durationMs:
        0,

      rawFileName:
        `${id}.source.${captureExtension}`,

      fileName:
        `${title} - ${timestamp}.${outputExtension}`,
    };

    fs.writeFileSync(
      partPath(id),
      Buffer.alloc(0)
    );

    saveSession(
      session
    );

    return json(
      res,
      201,
      publicSession(
        session
      )
    );
  }

  const downloadMatch =
    url.pathname.match(
      /^\/dj-recordings\/([^/]+)\/download$/
    );

  if (
    downloadMatch &&

    (
      req.method ===
        "GET" ||

      req.method ===
        "HEAD"
    )
  ) {
    const session =
      readSession(
        decodeURIComponent(
          downloadMatch[1]
        )
      );

    return session
      ? streamSavedRecording(
          req,
          res,
          session
        )

      : json(
          res,
          404,
          {
            error:
              "Recording not found",
          }
        );
  }
	
  const artworkMatch =
    url.pathname.match(
      /^\/dj-recordings\/([^/]+)\/artwork$/
    );

  if (
    artworkMatch &&
    (
      req.method ===
        "GET" ||
      req.method ===
        "HEAD"
    )
  ) {
    const session =
      readSession(
        decodeURIComponent(
          artworkMatch[1]
        )
      );

    return session
      ? streamRecordingArtwork(
          req,
          res,
          session
        )
      : json(
          res,
          404,
          {
            error:
              "Recording not found",
          }
        );
  }

  const chunkMatch =
    url.pathname.match(
      /^\/dj-recordings\/([^/]+)\/chunk$/
    );

  if (
    chunkMatch &&

    req.method ===
      "POST"
  ) {
    const id =
      decodeURIComponent(
        chunkMatch[1]
      );

    const session =
      readSession(id);

    if (!session) {
      return json(
        res,
        404,
        {
          error:
            "Recording session not found",
        }
      );
    }

    if (
      session.status !==
      "recording"
    ) {
      return json(
        res,
        409,
        {
          error:
            "Recording session is already closed",
        }
      );
    }

    try {
      const chunk =
        await readBody(
          req,
          32 *
          1024 *
          1024
        );

      if (
        chunk.length
      ) {
        fs.appendFileSync(
          partPath(id),
          chunk
        );

        session.uploadedBytes +=
          chunk.length;

        session.bytes =
          session.uploadedBytes;

        session.chunks +=
          1;

        saveSession(
          session
        );
      }

      return json(
        res,
        200,
        publicSession(
          session
        )
      );
    } catch (
      error
    ) {
      return json(
        res,
        400,
        {
          error:
            error instanceof
              Error
              ? error.message

              : "Could not save recording chunk",
        }
      );
    }
  }

  const finaliseMatch =
    url.pathname.match(
      /^\/dj-recordings\/([^/]+)\/finalise$/
    );

  if (
    finaliseMatch &&

    req.method ===
      "POST"
  ) {
    const id =
      decodeURIComponent(
        finaliseMatch[1]
      );

    const session =
      readSession(id);

    if (!session) {
      return json(
        res,
        404,
        {
          error:
            "Recording session not found",
        }
      );
    }

    if (
      session.status ===
        "saved" ||

      session.status ===
        "processing"
    ) {
      return json(
        res,

        session.status ===
        "saved"
          ? 200
          : 202,

        publicSession(
          session
        )
      );
    }

    let body:
      Record<
        string,
        unknown
      > = {};

    try {
      body =
        await readJson(
          req
        );
    } catch {
      body = {};
    }

    const partial =
      partPath(id);

    if (
      !fs.existsSync(
        partial
      ) ||

      fs.statSync(
        partial
      ).size <= 0
    ) {
      return json(
        res,
        400,
        {
          error:
            "No recording audio was received",
        }
      );
    }

    fs.rmSync(
      rawPath(
        session
      ),
      {
        force: true,
      }
    );

    fs.renameSync(
      partial,
      rawPath(
        session
      )
    );

    session.rawBytes =
      fs.statSync(
        rawPath(
          session
        )
      ).size;

    session.uploadedBytes =
      session.rawBytes;

    session.bytes =
      session.rawBytes;

    session.durationMs =
      Math.max(
        0,

        Number(
          body.durationMs
        ) ||
        0
      );

    session.error =
      "";

    if (
      !session
        .serverFinalise ||

      session.outputFormat ===
        "raw"
    ) {
      await completeRawRecording(
        session
      );

      return json(
        res,
        200,
        publicSession(
          session
        )
      );
    }

    session.status =
      "processing";

    session.stage =
      "queued";

    session.progress =
      0.02;

    saveSession(
      session
    );

    ensureConversionQueued(
      session
    );

    return json(
      res,
      202,
      publicSession(
        session
      )
    );
  }
	
  const recoverMatch =
    url.pathname.match(
      /^\/dj-recordings\/([^/]+)\/recover$/
    );

  if (
    recoverMatch &&
    req.method ===
      "POST"
  ) {
    const id =
      decodeURIComponent(
        recoverMatch[1]
      );

    const session =
      readSession(id);

    if (!session) {
      return json(
        res,
        404,
        {
          error:
            "Recording session not found",
        }
      );
    }

    if (
      activeConversions.has(id) ||
      session.status ===
        "processing"
    ) {
      return json(
        res,
        202,
        publicSession(session)
      );
    }

    const finishedHasData =
      fileHasData(
        finalPath(session)
      );

    const rawHasData =
      fileHasData(
        rawPath(session)
      );

    if (
      !finishedHasData &&
      !rawHasData
    ) {
      return json(
        res,
        409,
        {
          error:
            "No recoverable recording audio remains on the server",
        }
      );
    }

    session.status =
      "processing";

    session.stage =
      finishedHasData
        ? "archive-queued"
        : "queued";

    session.progress =
      finishedHasData
        ? Math.max(
            0.99,
            session.progress || 0
          )
        : 0.02;

    session.archiveStatus =
      finishedHasData
        ? "pending"
        : session.archiveStatus;

    session.error =
      "";

    saveSession(session);
    ensureConversionQueued(session);

    return json(
      res,
      202,
      publicSession(session)
    );
  }

  const sessionMatch =
    url.pathname.match(
      /^\/dj-recordings\/([^/]+)$/
    );

  if (
    sessionMatch &&

    req.method ===
      "GET"
  ) {
    const session =
      readSession(
        decodeURIComponent(
          sessionMatch[1]
        )
      );

    return session
      ? json(
          res,
          200,
          publicSession(
            session
          )
        )

      : json(
          res,
          404,
          {
            error:
              "Recording not found",
          }
        );
  }

  if (
    sessionMatch &&

    req.method ===
      "DELETE"
  ) {
    const id =
      decodeURIComponent(
        sessionMatch[1]
      );

    const session =
      readSession(id);

    if (!session) {
      return json(
        res,
        404,
        {
          error:
            "Recording not found",
        }
      );
    }

    if (
      activeConversions.has(
        id
      )
    ) {
      return json(
        res,
        409,
        {
          error:
            "Wait for the active recording conversion to finish before deleting it",
        }
      );
    }
		
    deleteArchivedFiles(
      session
    );

    fs.rmSync(
      partPath(id),
      {
        force: true,
      }
    );

    fs.rmSync(
      rawPath(
        session
      ),
      {
        force: true,
      }
    );

    fs.rmSync(
      finalPath(
        session
      ),
      {
        force: true,
      }
    );

    fs.rmSync(
      manifestPath(id),
      {
        force: true,
      }
    );

    sessions.delete(id);

    return json(
      res,
      200,
      {
        ok: true,
        id,
      }
    );
  }

  return false;
}
