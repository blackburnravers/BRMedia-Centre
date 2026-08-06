import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const source = () => fs.readFileSync(
  path.resolve("server/public/shared/resumable-upload.js"), "utf8"
);

test("browser foundation uses standards-based cross-device primitives", () => {
  const client = source();
  assert.match(client, /file instanceof Blob/);
  assert.match(client, /file\.slice\(start, end\)/);
  assert.match(client, /AbortController/);
  assert.match(client, /window\.fetch/);
  assert.doesNotMatch(client, /webkitRequestFileSystem|showOpenFilePicker|FileSystemHandle|navigator\.share/);
});

test("browser client tracks confirmed progress and skips received ranges", () => {
  const client = source();
  assert.match(client, /rangeConfirmed\(start, end\)/);
  assert.match(client, /if \(this\.rangeConfirmed\(start, end\)\) continue/);
  assert.match(client, /confirmedBytes: Number\(this\.session\.receivedBytes\)/);
});

test("browser client retries transient failures with bounded backoff", () => {
  const client = source();
  assert.match(client, /Math\.min\(8, Number\(options\.maxRetries/);
  assert.match(client, /attempt >= this\.maxRetries/);
  assert.match(client, /this\.retryBaseMs \* \(2 \*\* \(attempt - 1\)\)/);
});

test("cancel aborts the active request and finalisation is explicit", () => {
  const client = source();
  assert.match(client, /async cancel\(\)[\s\S]*this\.controller\?\.abort/);
  assert.match(client, /async finalise\(\)/);
  assert.match(client, /completed-transfer/);
  assert.doesNotMatch(client, /library|deck|mixxx|waveform|ffprobe/i);
});

test("resume truthfully requires file reselection when browser cannot retain File", () => {
  const client = source();
  assert.match(client, /Select the original file again to resume this upload/);
  assert.match(client, /requiresFileReselection/);
});

