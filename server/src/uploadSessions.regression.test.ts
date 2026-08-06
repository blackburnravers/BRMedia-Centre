import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8");

test("general uploads remain separate from recording storage and semantics", () => {
  const uploads = read("server/src/uploadSessions.ts");
  const recordings = read("server/src/djRecording.ts");
  assert.match(uploads, /browser-uploads/);
  assert.doesNotMatch(uploads, /dj-recordings|archiveDjRecording|convertDjRecording|addLocalFileToLibrary/);
  assert.match(recordings, /const chunkMatch/);
  assert.match(recordings, /dj-recordings[\s\S]*chunk/);
  assert.match(recordings, /fs\.appendFileSync\(\s*partPath\(id\)/s);
  assert.match(recordings, /fs\.renameSync\(\s*partial,\s*rawPath/s);
});

test("M21-B registers through API router without changing index or Mixxx paths", () => {
  const router = read("server/src/api/router.ts");
  const uploads = read("server/src/uploadSessions.ts");
  assert.match(router, /handleUploadSessionRoute/);
  assert.doesNotMatch(uploads, /mixxx|MIDI|controller mapping/i);
});

test("completed transfer cannot register library media or start analysis", () => {
  const uploads = read("server/src/uploadSessions.ts");
  assert.doesNotMatch(
    uploads,
    /addLocalFileToLibrary|persistAudioLibraryManifest|queueWaveform|ffprobe|djAnalysisQueue|handleDjStems/
  );
});
