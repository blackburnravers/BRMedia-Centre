"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const cacheDirectory = path.resolve("server/.cache/waveforms");
const databasePath = process.env.BRMEDIA_MIXXX_DB_PATH || "C:\\BRMediaMixxxCompatibilityProfile\\mixxxdb.sqlite";
const identities = new Map();
let corrupt = 0;
for (const name of fs.readdirSync(cacheDirectory)) {
  if (!name.endsWith(".json")) continue;
  try {
    const text = fs.readFileSync(path.join(cacheDirectory, name), "utf8");
    const match = text.match(/"pathIdentity"\s*:\s*("(?:\\.|[^"\\])*")/);
    if (match) identities.set(String(JSON.parse(match[1])).replace(/\\/g, "/").toLowerCase(), name);
  } catch { corrupt += 1; }
}
const database = new DatabaseSync(databasePath, { readOnly: true });
const rows = database.prepare(`
  SELECT l.id, lower(replace(tl.location, '\\', '/')) AS identity
  FROM library l JOIN track_locations tl ON l.location = tl.id
  WHERE COALESCE(l.mixxx_deleted, 0) = 0 AND COALESCE(tl.fs_deleted, 0) = 0
`).all();
database.close();
const matches = rows.filter((row) => identities.has(String(row.identity)));
const authorisedMatches = matches.filter((row) => String(row.identity).startsWith("h:/music/"));
console.log(JSON.stringify({ cacheFiles: identities.size, corrupt, activeMixxxTracks: rows.length,
  exactIdentityLinks: matches.length, authorisedHMusicLinks: authorisedMatches.length,
  sample: matches.slice(0, 20).map((row) => ({ id: `mixxx:${row.id}`, identity: row.identity, cache: identities.get(String(row.identity)) })) }, null, 2));
