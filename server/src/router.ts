import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "../utils/json";
import {
  listLibrary,
  addLocalFileToLibrary,
  isSupportedAudioFile,
  findLibraryItemByLocator,
} from "../db/library";
import { validateLocalPathAllowed } from "../sources/local/validateLocalPathAllowed";

export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  cfg: { localAllowedBases: string[] }
): Promise<boolean> {
  // GET /library
  if (req.method === "GET" && url.pathname === "/library") {
    return json(res, 200, { items: listLibrary() });
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
      const item = addLocalFileToLibrary(
        inputPath,
        typeof body.title === "string" ? body.title : undefined
      );

      return json(res, existing ? 200 : 201, {
        mode: "file",
        added: existing ? 0 : 1,
        skipped: existing ? 1 : 0,
        item,
      });
    }

    // Folder import
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(inputPath, { withFileTypes: true });

      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(inputPath, entry.name))
        .filter((abs) => isSupportedAudioFile(abs));

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

        const item = addLocalFileToLibrary(absFile);
        addedItems.push(item);
      }

      return json(res, 201, {
        mode: "folder",
        folder: inputPath,
        added: addedItems.length,
        skipped: skippedItems.length,
        items: addedItems,
        skippedItems,
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