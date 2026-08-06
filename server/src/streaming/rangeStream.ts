import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

type StreamOpts = {
  mimeType?: string;
  downloadName?: string;
  asAttachment?: boolean;
  maxChunkBytes?: number;
  cacheControl?: string;
  etag?: string;
  onAborted?: () => void;
};

export function streamFileWithRange(
  req: IncomingMessage,
  res: ServerResponse,
  absPath: string,
  opts?: StreamOpts
) {
  const stat = fs.statSync(absPath);
  const total = stat.size;
  const range = req.headers.range;
  const mime = opts?.mimeType ?? guessMime(absPath);
  const method = String(req.method || "GET").toUpperCase();
  const maxChunkBytes = Math.max(0, Number(opts?.maxChunkBytes || 0));

  const pipeRange = (
    start: number,
    end: number
  ) => {
    const stream =
      fs.createReadStream(
        absPath,
        {
          start,
          end,

          highWaterMark:
            512 * 1024,
        }
      );

    const cleanup = () => {
      req.off(
        "aborted",
        closeStream
      );

      res.off(
        "close",
        closeStream
      );

      res.off(
        "error",
        closeStream
      );
    };

    const closeStream = () => {
      cleanup();
      try {
        opts?.onAborted?.();
      } catch {}

      if (!stream.destroyed) {
        try {
          stream.destroy();
        } catch {}
      }
    };

    /*
      IncomingMessage "close" can fire after
      the request has completed while the
      response file is still being streamed.

      Only an actual aborted request should
      cancel the source file stream.
    */
    req.once(
      "aborted",
      closeStream
    );

    res.once(
      "close",
      closeStream
    );

    res.once(
      "error",
      closeStream
    );

    stream.on(
      "error",
      (err) => {
        cleanup();

        if (!res.headersSent) {
          res.statusCode = 500;

          res.end(
            "Stream error"
          );

          return;
        }

        try {
          res.destroy(err);
        } catch {}
      }
    );

    stream.once(
      "end",
      cleanup
    );

    stream.once(
      "close",
      cleanup
    );

    stream.pipe(res);
  };

  res.setHeader(
    "Content-Type",
    mime
  );

  res.setHeader(
    "Accept-Ranges",
    "bytes"
  );

  res.setHeader(
    "Cache-Control",
    opts?.cacheControl ||
    "no-store"
  );

  if (opts?.etag) {
    res.setHeader(
      "ETag",
      opts.etag
    );

    if (
      !range &&
      req.headers[
        "if-none-match"
      ] === opts.etag
    ) {
      res.statusCode = 304;
      res.end();
      return;
    }
  }

  if (opts?.asAttachment) {
    const fallbackName = path.basename(absPath);
    const safeName = (opts.downloadName || fallbackName).replace(/"/g, "");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  }

  if (method === "HEAD" && !range) {
    res.statusCode = 200;
    res.setHeader("Content-Length", String(total));
    res.end();
    return;
  }

  if (!range) {
    if (maxChunkBytes > 0 && total > maxChunkBytes) {
      const start = 0;
      const end = Math.min(total - 1, maxChunkBytes - 1);
      const chunkSize = end - start + 1;

      res.statusCode = 206;
      res.setHeader("Content-Length", String(chunkSize));
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);

      if (method === "HEAD") {
        res.end();
        return;
      }

      pipeRange(start, end);
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Length", String(total));

    if (method === "HEAD") {
      res.end();
      return;
    }

    pipeRange(0, total - 1);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${total}`);
    res.end();
    return;
  }

  const startStr = match[1];
  const endStr = match[2];

  let start: number;
  let end: number;
  if (!startStr && endStr) {
    const suffixLength = Number(endStr);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      res.statusCode = 416;
      res.setHeader("Content-Range", `bytes */${total}`);
      res.end();
      return;
    }
    start = Math.max(0, total - suffixLength);
    end = total - 1;
  } else {
    start = Number(startStr);
    end = endStr ? Number(endStr) : total - 1;
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < 0 ||
    start > end ||
    start >= total
  ) {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${total}`);
    res.end();
    return;
  }

  end = Math.min(end, total - 1);
  if (maxChunkBytes > 0 && end - start + 1 > maxChunkBytes) {
    end = Math.min(total - 1, start + maxChunkBytes - 1);
  }

  const chunkSize = end - start + 1;

  res.statusCode = 206;
  res.setHeader("Content-Length", String(chunkSize));
  res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);

  if (method === "HEAD") {
    res.end();
    return;
  }

  pipeRange(start, end);
}

function guessMime(p: string): string {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".flac":
      return "audio/flac";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".ogg":
      return "audio/ogg";
    case ".opus":
      return "audio/opus";
    case ".mp4":
      return "video/mp4";
    case ".mkv":
      return "video/x-matroska";
    default:
      return "application/octet-stream";
  }
}
