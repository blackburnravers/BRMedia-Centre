import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export type DjRecordingOutputFormat =
  | "wav"
  | "flac"
  | "mp3"
  | "raw";

export type DjRecordingConversionSpec = {
  inputPath: string;
  outputPath: string;
  format: DjRecordingOutputFormat;
  title: string;
  durationMs: number;
  channels: string;
  sampleRate: string;
  mp3Bitrate: string;
  mp3Mode: string;
  wavBitDepth: string;
  flacCompression: string;
  onProgress?: (
    progress: number,
    stage: string
  ) => void;
};

function resolveFfmpegPath() {
  const configured =
    String(
      process.env.FFMPEG_PATH ||
      ""
    ).trim();

  if (configured) {
    return configured;
  }

  const bundled =
    "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";

  if (
    process.platform === "win32" &&
    fs.existsSync(bundled)
  ) {
    return bundled;
  }

  return process.platform === "win32"
    ? "ffmpeg.exe"
    : "ffmpeg";
}

function parseSampleRate(
  value: string
) {
  const normalised =
    String(value || "")
      .toLowerCase();

  if (
    normalised.includes("96")
  ) {
    return "96000";
  }

  if (
    normalised.includes("48")
  ) {
    return "48000";
  }

  if (
    normalised.includes("44.1") ||
    normalised.includes("441")
  ) {
    return "44100";
  }

  return "";
}

function getChannelArgs(
  value: string
) {
  const mode =
    String(value || "stereo")
      .toLowerCase();

  if (mode === "mono") {
    return [
      "-ac",
      "1",
    ];
  }

  if (mode === "dual-mono") {
    return [
      "-af",
      "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1",
      "-ac",
      "2",
    ];
  }

  if (mode === "left-only") {
    return [
      "-af",
      "pan=mono|c0=c0",
      "-ac",
      "1",
    ];
  }

  if (mode === "right-only") {
    return [
      "-af",
      "pan=mono|c0=c1",
      "-ac",
      "1",
    ];
  }

  return [
    "-ac",
    "2",
  ];
}

function getFormatArgs(
  spec: DjRecordingConversionSpec
) {
  if (
    spec.format === "wav"
  ) {
    const depth =
      String(
        spec.wavBitDepth ||
        "24-bit"
      ).toLowerCase();

    const codec =
      depth.includes("32")
        ? "pcm_f32le"

        : depth.includes("16")
          ? "pcm_s16le"

          : "pcm_s24le";

    return [
      "-c:a",
      codec,
    ];
  }

  if (
    spec.format === "flac"
  ) {
    const compressionMatch =
      String(
        spec.flacCompression ||
        "5"
      ).match(/\d+/);

    const compression =
      Math.max(
        0,

        Math.min(
          12,

          Number(
            compressionMatch?.[0] ||
            5
          )
        )
      );

    return [
      "-c:a",
      "flac",
      "-compression_level",
      String(compression),
    ];
  }

  const mode =
    String(
      spec.mp3Mode ||
      "CBR"
    ).toLowerCase();

  if (
    mode.includes("vbr")
  ) {
    return [
      "-c:a",
      "libmp3lame",
      "-q:a",

      mode.includes("high")
        ? "0"
        : "3",
    ];
  }

  const bitrate =
    Math.max(
      64,

      Math.min(
        320,

        Number(
          String(
            spec.mp3Bitrate ||
            "320"
          ).match(/\d+/)?.[0] ||
          320
        )
      )
    );

  return [
    "-c:a",
    "libmp3lame",
    "-b:a",
    `${bitrate}k`,
  ];
}

function parseProgressSeconds(
  output: string
) {
  const microseconds =
    output.match(
      /(?:^|\n)out_time_ms=(\d+)/
    );

  if (microseconds) {
    return (
      Number(
        microseconds[1]
      ) /
      1_000_000
    );
  }

  const timestamp =
    output.match(
      /(?:^|\n)out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/
    );

  if (!timestamp) {
    return 0;
  }

  return (
    Number(
      timestamp[1]
    ) *
      3600 +

    Number(
      timestamp[2]
    ) *
      60 +

    Number(
      timestamp[3]
    )
  );
}

export function convertDjRecording(
  spec: DjRecordingConversionSpec
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      if (
        spec.format === "raw"
      ) {
        fs.rmSync(
          spec.outputPath,
          {
            force: true,
          }
        );

        fs.renameSync(
          spec.inputPath,
          spec.outputPath
        );

        spec.onProgress?.(
          1,
          "ready"
        );

        resolve();
        return;
      }

      fs.mkdirSync(
        path.dirname(
          spec.outputPath
        ),
        {
          recursive: true,
        }
      );

      fs.rmSync(
        spec.outputPath,
        {
          force: true,
        }
      );

      const sampleRate =
        parseSampleRate(
          spec.sampleRate
        );

      const args = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        spec.inputPath,
        "-map_metadata",
        "-1",
        "-vn",

        ...getChannelArgs(
          spec.channels
        ),

        ...(
          sampleRate
            ? [
                "-ar",
                sampleRate,
              ]
            : []
        ),

        ...getFormatArgs(
          spec
        ),

        "-metadata",
        `title=${spec.title}`,
        "-progress",
        "pipe:1",
        "-nostats",
        spec.outputPath,
      ];

      const child =
        spawn(
          resolveFfmpegPath(),
          args,
          {
            windowsHide: true,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          }
        );

      let progressOutput =
        "";

      let stderr =
        "";

      spec.onProgress?.(
        0.05,
        "converting"
      );

      child.stdout.on(
        "data",

        (
          chunk: Buffer
        ) => {
          progressOutput +=
            chunk.toString(
              "utf8"
            );

          const seconds =
            parseProgressSeconds(
              progressOutput
            );

          const durationSeconds =
            Math.max(
              0.001,

              spec.durationMs /
              1000
            );

          const progress =
            Math.max(
              0.05,

              Math.min(
                0.98,

                seconds /
                durationSeconds
              )
            );

          spec.onProgress?.(
            progress,
            "converting"
          );

          if (
            progressOutput.length >
            8192
          ) {
            progressOutput =
              progressOutput.slice(
                -4096
              );
          }
        }
      );

      child.stderr.on(
        "data",

        (
          chunk: Buffer
        ) => {
          stderr +=
            chunk.toString(
              "utf8"
            );

          if (
            stderr.length >
            12000
          ) {
            stderr =
              stderr.slice(
                -8000
              );
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
          code
        ) => {
          if (
            code === 0 &&

            fs.existsSync(
              spec.outputPath
            ) &&

            fs.statSync(
              spec.outputPath
            ).size > 0
          ) {
            spec.onProgress?.(
              1,
              "ready"
            );

            resolve();
            return;
          }

          fs.rmSync(
            spec.outputPath,
            {
              force: true,
            }
          );

          reject(
            new Error(
              stderr.trim() ||

              `FFmpeg exited with code ${code}`
            )
          );
        }
      );
    }
  );
}