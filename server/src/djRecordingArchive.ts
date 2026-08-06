import fs from "node:fs";
import path from "node:path";

import {
  addLocalFileToLibraryWithMetadata,
} from "./db/library";

import {
  validateLocalPathAllowed,
} from "./sources/local/validateLocalPathAllowed";

export type DjRecordingArchiveInput = {
  id: string;
  title: string;
  fileName: string;
  sourcePath: string;
  outputFormat: string;
  finalMimeType: string;
  durationMs: number;
  createdAt: number;

  destination?: string;
  archiveRoot?: string;
  createSessionFolder?: boolean;
  autoNumberDuplicates?: boolean;

  txtTracklist?: boolean;
  timestampJson?: boolean;
  sessionJson?: boolean;
  metadataJson?: boolean;
  saveArtwork?: boolean;

  artworkDataUrl?: string;

  mixSetup?:
    Record<
      string,
      unknown
    >;

  setPlan?:
    Record<
      string,
      unknown
    >;

  recordSetup?:
    Record<
      string,
      unknown
    >;

  handoffs?:
    Record<
      string,
      unknown
    >;

  localAllowedBases:
    string[];
};

export type DjRecordingArchiveResult = {
  archiveStatus:
    "archived";

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
};

function splitPathList(
  value: string
) {
  return String(
    value ||
    ""
  )
    .split(
      /[;\r\n]+/
    )
    .map(
      (
        item
      ) =>
        item.trim()
    )
    .filter(
      Boolean
    );
}

function safeSegment(
  value: unknown,
  fallback =
    "BRMedia DJ Recording"
) {
  return (
    String(
      value ||
      fallback
    )
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .replace(
        /[. ]+$/g,
        ""
      )
      .trim()
      .slice(
        0,
        120
      ) ||

    fallback
  );
}

function safeRelativePath(
  value: unknown
) {
  const pieces =
    String(
      value ||
      ""
    )
      .split(
        /[\\/]+/
      )
      .map(
        (
          item
        ) =>
          safeSegment(
            item,
            ""
          )
      )
      .filter(
        Boolean
      );

  return pieces.length
    ? path.join(
        ...pieces
      )

    : "BRMedia DJ Recordings";
}

function getDefaultAudioRoot(
  allowedBases:
    string[]
) {
  const configured =
    splitPathList(
      process.env
        .BRMEDIA_AUDIO_DIRS ||
      ""
    );

  const candidates = [
    ...configured,
    ...allowedBases,
    "C:\\DJMixes",
  ]
    .map(
      (
        item
      ) =>
        path.resolve(
          item
        )
    )
    .filter(
      Boolean
    );

  return (
    candidates.find(
      (
        item
      ) => {
        try {
          return (
            fs.existsSync(
              item
            ) &&

            fs.statSync(
              item
            ).isDirectory()
          );
        } catch {
          return false;
        }
      }
    ) ||

    candidates[0] ||

    path.resolve(
      "BRMedia DJ Recordings"
    )
  );
}

export function resolveDjRecordingArchiveRoot(
  destination:
    unknown,

  allowedBases:
    string[]
) {
  const requested =
    String(
      destination ||
      ""
    ).trim();

  /*
    An absolute destination is accepted only
    when it sits inside a server-approved
    local storage root.
  */
  if (
    requested &&
    path.isAbsolute(
      requested
    )
  ) {
    const resolved =
      path.resolve(
        requested
      );

    const allowed =
      validateLocalPathAllowed(
        resolved,
        allowedBases
      );

    if (
      allowed.ok
    ) {
      return resolved;
    }
  }

  /*
    A normal name such as:

    BRMedia DJ Recordings

    is placed beneath the first configured
    BRMedia audio-library folder.
  */
  return path.join(
    getDefaultAudioRoot(
      allowedBases
    ),

    safeRelativePath(
      requested ||
      "BRMedia DJ Recordings"
    )
  );
}

function dateStamp(
  timestamp:
    number
) {
  const date =
    new Date(
      Number(
        timestamp
      ) ||
      Date.now()
    );

  return [
    date.getFullYear(),

    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}

function ensureUniqueDirectory(
  requestedPath:
    string,

  autoNumber:
    boolean
) {
  if (
    !fs.existsSync(
      requestedPath
    )
  ) {
    return requestedPath;
  }

  if (
    !autoNumber
  ) {
    return requestedPath;
  }

  for (
    let index = 2;
    index < 1000;
    index += 1
  ) {
    const candidate =
      `${requestedPath} (${index})`;

    if (
      !fs.existsSync(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return (
    `${requestedPath} (${Date.now()})`
  );
}

function ensureUniqueFile(
  requestedPath:
    string,

  autoNumber:
    boolean
) {
  if (
    !fs.existsSync(
      requestedPath
    )
  ) {
    return requestedPath;
  }

  if (
    !autoNumber
  ) {
    fs.rmSync(
      requestedPath,
      {
        force: true,
      }
    );

    return requestedPath;
  }

  const parsed =
    path.parse(
      requestedPath
    );

  for (
    let index = 2;
    index < 1000;
    index += 1
  ) {
    const candidate =
      path.join(
        parsed.dir,

        `${parsed.name} (${index})${parsed.ext}`
      );

    if (
      !fs.existsSync(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return path.join(
    parsed.dir,

    `${parsed.name} (${Date.now()})${parsed.ext}`
  );
}

function moveFile(
  sourcePath:
    string,

  destinationPath:
    string
) {
  fs.mkdirSync(
    path.dirname(
      destinationPath
    ),
    {
      recursive: true,
    }
  );

  try {
    /*
      A normal rename is quick because it
      does not copy the whole recording.
    */
    fs.renameSync(
      sourcePath,
      destinationPath
    );
  } catch (
    error: any
  ) {
    /*
      EXDEV means the temporary and permanent
      folders are on different drives.

      In that case BRMedia copies the file and
      removes the temporary original afterwards.
    */
    if (
      error?.code !==
      "EXDEV"
    ) {
      throw error;
    }

    fs.copyFileSync(
      sourcePath,
      destinationPath
    );

    fs.rmSync(
      sourcePath,
      {
        force: true,
      }
    );
  }
}

function writeJsonFile(
  filePath:
    string,

  value:
    unknown
) {
  fs.writeFileSync(
    filePath,

    JSON.stringify(
      value,
      null,
      2
    ),

    "utf8"
  );
}

function readTrackRows(
  setPlan:
    Record<
      string,
      unknown
    > |
    undefined
) {
  return Array.isArray(
    setPlan?.tracks
  )
    ? setPlan.tracks
        .filter(
          (
            item
          ) =>
            item &&
            typeof item ===
              "object"
        ) as
          Record<
            string,
            unknown
          >[]

    : [];
}

function trackTimestampSeconds(
  track:
    Record<
      string,
      unknown
    >
) {
  const candidates = [
    track.timestampSeconds,
    track.timestamp,
    track.startSeconds,
    track.startTime,
    track.time,
  ];

  for (
    const value
    of candidates
  ) {
    const number =
      Number(
        value
      );

    if (
      Number.isFinite(
        number
      ) &&
      number >= 0
    ) {
      return number;
    }
  }

  return null;
}

function formatTimestamp(
  seconds:
    number |
    null
) {
  if (
    seconds === null
  ) {
    return "";
  }

  const whole =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    );

  const hours =
    Math.floor(
      whole /
      3600
    );

  const minutes =
    Math.floor(
      (
        whole %
        3600
      ) /
      60
    );

  const remainder =
    whole %
    60;

  return hours > 0
    ? `${String(
        hours
      ).padStart(
        2,
        "0"
      )}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        remainder
      ).padStart(
        2,
        "0"
      )}`

    : `${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        remainder
      ).padStart(
        2,
        "0"
      )}`;
}

function buildTracklistText(
  input:
    DjRecordingArchiveInput
) {
  const rows =
    readTrackRows(
      input.setPlan
    );

  const lines = [
    input.title,
    "",
  ];

  if (
    !rows.length
  ) {
    lines.push(
      "No Set Plan tracks were saved for this recording."
    );

    return (
      `${lines.join(
        "\r\n"
      )}\r\n`
    );
  }

  rows.forEach(
    (
      track,
      index
    ) => {
      const title =
        safeSegment(
          track.title ||
          track.name ||
          track.fileName,

          `Track ${index + 1}`
        );

      const artist =
        String(
          track.artist ||
          ""
        ).trim();

      const timestamp =
        formatTimestamp(
          trackTimestampSeconds(
            track
          )
        );

      lines.push(
        `${
          timestamp
            ? `${timestamp}  `
            : ""
        }${index + 1}. ${
          artist
            ? `${artist} - `
            : ""
        }${title}`
      );
    }
  );

  return (
    `${lines.join(
      "\r\n"
    )}\r\n`
  );
}

function decodeArtworkDataUrl(
  dataUrl:
    unknown
) {
  const match =
    String(
      dataUrl ||
      ""
    ).match(
      /^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/
    );

  if (
    !match
  ) {
    return null;
  }

  const extension =
    match[1].includes(
      "png"
    )
      ? "png"

      : match[1].includes(
          "webp"
        )
        ? "webp"

        : "jpg";

  return {
    extension,

    buffer:
      Buffer.from(
        match[2],
        "base64"
      ),
  };
}

export async function archiveDjRecording(
  input:
    DjRecordingArchiveInput
):
  Promise<
    DjRecordingArchiveResult
  > {
  const archiveRoot =
    path.resolve(
      input.archiveRoot ||

      resolveDjRecordingArchiveRoot(
        input.destination,
        input.localAllowedBases
      )
    );

  /*
    Check the permanent folder again before
    writing anything. This prevents a saved
    Record Setup from escaping the approved
    audio folders.
  */
  const allowed =
    validateLocalPathAllowed(
      archiveRoot,
      input.localAllowedBases
    );

  if (
    !allowed.ok
  ) {
    throw new Error(
      `Recording archive folder is not allowed: ${allowed.reason}`
    );
  }

  fs.mkdirSync(
    archiveRoot,
    {
      recursive: true,
    }
  );

  const createSessionFolder =
    input.createSessionFolder !==
    false;

  const autoNumberDuplicates =
    input.autoNumberDuplicates !==
    false;

  /*
    Example result:

    C:\DJMixes\BRMedia DJ Recordings\
    2026-07-23 - The Hardcore Medley EP001\
  */
  const sessionDirectory =
    createSessionFolder
      ? ensureUniqueDirectory(
          path.join(
            archiveRoot,

            `${dateStamp(
              input.createdAt
            )} - ${safeSegment(
              input.title
            )}`
          ),

          autoNumberDuplicates
        )

      : archiveRoot;

  fs.mkdirSync(
    sessionDirectory,
    {
      recursive: true,
    }
  );

  const requestedFileName =
    safeSegment(
      input.fileName,

      `${safeSegment(
        input.title
      )}.${safeSegment(
        input.outputFormat,
        "mp3"
      )}`
    );

  const archiveFilePath =
    ensureUniqueFile(
      path.join(
        sessionDirectory,
        requestedFileName
      ),

      autoNumberDuplicates
    );

  /*
    The finished FFmpeg output now moves from
    server/.uploads into permanent storage.
  */
  moveFile(
    path.resolve(
      input.sourcePath
    ),

    archiveFilePath
  );

  const sidecarFiles:
    string[] = [];

  let artworkFilePath =
    "";

  const trackRows =
    readTrackRows(
      input.setPlan
    );

  if (
    input.txtTracklist !==
    false
  ) {
    const filePath =
      path.join(
        sessionDirectory,
        "tracklist.txt"
      );

    fs.writeFileSync(
      filePath,
      buildTracklistText(
        input
      ),
      "utf8"
    );

    sidecarFiles.push(
      filePath
    );
  }

  if (
    input.timestampJson !==
    false
  ) {
    const filePath =
      path.join(
        sessionDirectory,
        "timestamps.json"
      );

    writeJsonFile(
      filePath,
      {
        version: 1,

        recordingId:
          input.id,

        title:
          input.title,

        durationMs:
          input.durationMs,

        tracks:
          trackRows.map(
            (
              track,
              index
            ) => ({
              order:
                index + 1,

              ...track,

              timestampSeconds:
                trackTimestampSeconds(
                  track
                ),
            })
          ),
      }
    );

    sidecarFiles.push(
      filePath
    );
  }

  if (
    input.metadataJson !==
    false
  ) {
    const filePath =
      path.join(
        sessionDirectory,
        "metadata.json"
      );

    writeJsonFile(
      filePath,
      {
        version: 1,

        recordingId:
          input.id,

        title:
          input.title,

        outputFormat:
          input.outputFormat,

        finalMimeType:
          input.finalMimeType,

        durationMs:
          input.durationMs,

        createdAt:
          input.createdAt,

        mixSetup:
          input.mixSetup ||
          {},
      }
    );

    sidecarFiles.push(
      filePath
    );
  }

  const artwork =
    input.saveArtwork !==
    false
      ? decodeArtworkDataUrl(
          input.artworkDataUrl
        )

      : null;

  if (
    artwork?.buffer.length
  ) {
    artworkFilePath =
      path.join(
        sessionDirectory,

        `artwork.${artwork.extension}`
      );

    fs.writeFileSync(
      artworkFilePath,
      artwork.buffer
    );

    sidecarFiles.push(
      artworkFilePath
    );
  }

  /*
    Register the permanent file with the
    normal BRMedia audio library.

    The returned ID is what lets the archive
    open Player, Tagger, Mastering, Converter
    and View Files directly.
  */
  const libraryItem =
    await addLocalFileToLibraryWithMetadata(
      archiveFilePath,
      input.title
    );

  if (
    input.sessionJson !==
    false
  ) {
    const filePath =
      path.join(
        sessionDirectory,
        "session.json"
      );

    writeJsonFile(
      filePath,
      {
        version: 1,

        recordingId:
          input.id,

        title:
          input.title,

        createdAt:
          input.createdAt,

        durationMs:
          input.durationMs,

        outputFormat:
          input.outputFormat,

        finalMimeType:
          input.finalMimeType,

        audioFile:
          path.basename(
            archiveFilePath
          ),

        artworkFile:
          artworkFilePath
            ? path.basename(
                artworkFilePath
              )
            : "",

        libraryItemId:
          libraryItem.id,

        sidecars:
          sidecarFiles.map(
            (
              filePath
            ) =>
              path.basename(
                filePath
              )
          ),

        mixSetup:
          input.mixSetup ||
          {},

        setPlan:
          input.setPlan ||
          {},

        recordSetup:
          input.recordSetup ||
          {},

        handoffs:
          input.handoffs ||
          {},
      }
    );

    sidecarFiles.push(
      filePath
    );
  }

  return {
    archiveStatus:
      "archived",

    archiveRoot,

    archiveDirectory:
      sessionDirectory,

    archiveFilePath,

    artworkFilePath,

    sidecarFiles,

    libraryItemId:
      String(
        libraryItem.id ||
        ""
      ),
  };
}