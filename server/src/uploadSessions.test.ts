import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, test } from "node:test";
import type { IncomingMessage } from "node:http";
import {
  UPLOAD_MAX_ACTIVE_SESSIONS,
  UPLOAD_MAX_CHUNK_SIZE,
  UPLOAD_TERMINAL_RETENTION_MS,
  UploadError,
  UploadSessionService,
  compactReceivedRanges,
  defaultUploadRoots,
  hasFullCoverage,
  missingRanges,
  receivedBytes,
  safeUploadFilename,
} from "./uploadSessions";

const temporaryRoots: string[] = [];

afterEach(() => {
  while (temporaryRoots.length) {
    const root = temporaryRoots.pop();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }
});

function service(options: {
  now?: () => number;
  freeBytes?: () => number;
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21b-"));
  temporaryRoots.push(root);
  return new UploadSessionService(
    defaultUploadRoots(root),
    options.now,
    options.freeBytes
  );
}

function create(
  upload: UploadSessionService,
  totalSize = 1024 * 1024,
  extra: Record<string, unknown> = {}
) {
  return upload.create({
    filename: "Guest Track's Mix.v1.mp3",
    totalSize,
    mimeType: "audio/mpeg",
    lastModified: 123456789,
    preferredChunkSize: 256 * 1024,
    ...extra,
  });
}

function request(body: Buffer, pieces = 1) {
  const size = Math.ceil(body.length / pieces);
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < body.length; offset += size) {
    chunks.push(body.subarray(offset, Math.min(body.length, offset + size)));
  }
  return Readable.from(chunks) as IncomingMessage;
}

test("filename validation preserves safe Unicode and rejects Windows/path hazards", () => {
  assert.equal(safeUploadFilename("Rhys' Mix.édition.mp3"), "Rhys' Mix.édition.mp3");
  for (const name of ["", ".", "..", "CON", "nul.mp3", "../track.mp3", "C:\\track.mp3", "\\\\server\\x.mp3", "track.mp3:evil", "bad\u0000.mp3", "trailing. "]) {
    assert.throws(() => safeUploadFilename(name), UploadError);
  }
});

test("session creation returns opaque credentials without exposing local paths", () => {
  const upload = service();
  const first = create(upload);
  const second = create(upload);
  assert.match(first.session.id, /^[a-f0-9]{48}$/);
  assert.notEqual(first.session.id, second.session.id);
  assert.ok(first.token.length >= 40);
  const body = JSON.stringify(first);
  assert.doesNotMatch(body, /\.part|validation-staging|[A-Z]:\\/i);
  assert.equal(first.session.state, "created");
});

test("session creation validates size hash storage and concurrency limits", () => {
  assert.throws(() => create(service(), 0), /positive integer/);
  assert.throws(() => create(service(), -1), /positive integer/);
  assert.throws(() => create(service(), 3 * 1024 * 1024 * 1024), /upload limit/);
  assert.throws(() => create(service(), 1024, { hashAlgorithm: "md5", expectedHash: "a" }), /SHA-256/);
  assert.throws(() => create(service({ freeBytes: () => 1 }), 1024), /enough server storage/);
  const upload = service();
  for (let index = 0; index < UPLOAD_MAX_ACTIVE_SESSIONS; index += 1) create(upload, 1024);
  assert.throws(() => create(upload, 1024), /Too many uploads/);
});

test("range helpers preserve gaps and do not double count", () => {
  const ranges = [
    { start: 256, end: 512, sha256: "a" },
    { start: 0, end: 256, sha256: "b" },
    { start: 768, end: 1024, sha256: "c" },
  ];
  assert.equal(receivedBytes(ranges), 768);
  assert.deepEqual(missingRanges(ranges, 1024), [{ start: 512, end: 768 }]);
  assert.equal(hasFullCoverage(ranges, 1024), false);
  assert.deepEqual(compactReceivedRanges(ranges), [
    { start: 0, end: 512 },
    { start: 768, end: 1024 },
  ]);
});

test("chunks support sequential out-of-order retry and conflict detection", async () => {
  const upload = service();
  const created = create(upload, 3 * 256 * 1024);
  const chunkA = Buffer.alloc(256 * 1024, 0x11);
  const chunkB = Buffer.alloc(256 * 1024, 0x22);
  const chunkC = Buffer.alloc(256 * 1024, 0x33);
  await upload.writeChunk(created.session.id, created.token, 256 * 1024, chunkB.length, request(chunkB, 8));
  await upload.writeChunk(created.session.id, created.token, 0, chunkA.length, request(chunkA, 8));
  const duplicate = await upload.writeChunk(
    created.session.id, created.token, 0, chunkA.length, request(chunkA, 4)
  );
  assert.equal(duplicate.duplicate, true);
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, 128 * 1024, chunkA.length, request(chunkA)),
    /overlaps/
  );
  const final = await upload.writeChunk(
    created.session.id, created.token, 512 * 1024, chunkC.length, request(chunkC)
  );
  assert.equal(final.session.receivedBytes, 3 * 256 * 1024);
  assert.equal(final.session.remainingBytes, 0);
});

test("chunk validation rejects bad ranges lengths hashes and wrong credentials", async () => {
  const upload = service();
  const created = create(upload, 512 * 1024);
  const small = Buffer.alloc(1024);
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, -1, small.length, request(small)),
    /range/
  );
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, 0, small.length, request(small)),
    /final chunk/
  );
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, 0, UPLOAD_MAX_CHUNK_SIZE + 1, request(small)),
    /exceeds/
  );
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, 256 * 1024, 300 * 1024, request(Buffer.alloc(300 * 1024))),
    /beyond/
  );
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, 0, 256 * 1024, request(small)),
    /length/
  );
  await assert.rejects(
    upload.writeChunk(created.session.id, "wrong", 0, 256 * 1024, request(Buffer.alloc(256 * 1024))),
    /not found/
  );
});

test("cancellation is idempotent and rejects later writes and finalisation", async () => {
  const upload = service();
  const created = create(upload, 256 * 1024);
  assert.equal(upload.cancel(created.session.id, created.token).state, "cancelled");
  assert.equal(upload.cancel(created.session.id, created.token).state, "cancelled");
  await assert.rejects(
    upload.writeChunk(
      created.session.id, created.token, 0, 256 * 1024, request(Buffer.alloc(256 * 1024))
    ),
    /no longer accepts/
  );
  await assert.rejects(upload.finalise(created.session.id, created.token), /cannot be finalised/);
});

test("finalisation requires full coverage and atomically promotes without library work", async () => {
  const upload = service();
  const created = create(upload, 512 * 1024);
  const first = Buffer.alloc(256 * 1024, 1);
  const second = Buffer.alloc(256 * 1024, 2);
  await upload.writeChunk(created.session.id, created.token, 0, first.length, request(first));
  await assert.rejects(upload.finalise(created.session.id, created.token), /missing ranges/);
  await upload.writeChunk(created.session.id, created.token, first.length, second.length, request(second));
  const completed = await upload.finalise(created.session.id, created.token);
  assert.equal(completed.state, "completed");
  assert.equal(completed.completedTransfer, true);
  assert.equal(upload.status(created.session.id, created.token).state, "completed");
  assert.equal((upload.diagnostics() as any).finalisationSuccesses, 1);
  assert.doesNotMatch(JSON.stringify(completed), /completedPath|partPath|locator/);
  await assert.rejects(
    upload.writeChunk(created.session.id, created.token, 0, first.length, request(first)),
    /no longer accepts/
  );
  assert.equal((await upload.finalise(created.session.id, created.token)).state, "completed");
});

test("optional SHA-256 succeeds and mismatch retains an unpromoted failed transfer", async () => {
  const body = Buffer.alloc(256 * 1024, 0x5a);
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const valid = service();
  const validSession = create(valid, body.length, { expectedHash: digest, hashAlgorithm: "sha256" });
  await valid.writeChunk(validSession.session.id, validSession.token, 0, body.length, request(body));
  assert.equal((await valid.finalise(validSession.session.id, validSession.token)).state, "completed");

  const invalid = service();
  const invalidSession = create(invalid, body.length, {
    expectedHash: "0".repeat(64), hashAlgorithm: "sha256",
  });
  await invalid.writeChunk(invalidSession.session.id, invalidSession.token, 0, body.length, request(body));
  await assert.rejects(invalid.finalise(invalidSession.session.id, invalidSession.token), /integrity/);
  assert.equal(invalid.status(invalidSession.session.id, invalidSession.token).state, "failed");
});

test("restart recovery restores paused and completed sessions and isolates corrupt metadata", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21b-recovery-"));
  temporaryRoots.push(root);
  const roots = defaultUploadRoots(root);
  const first = new UploadSessionService(roots);
  const active = create(first, 512 * 1024);
  await first.writeChunk(
    active.session.id, active.token, 0, 256 * 1024, request(Buffer.alloc(256 * 1024))
  );
  const complete = create(first, 256 * 1024);
  await first.writeChunk(
    complete.session.id, complete.token, 0, 256 * 1024, request(Buffer.alloc(256 * 1024))
  );
  await first.finalise(complete.session.id, complete.token);
  fs.writeFileSync(path.join(roots.metadata, "broken.json"), "{", "utf8");
  const recoveryStarted = performance.now();
  const recovered = new UploadSessionService(roots);
  const recoveryMs = performance.now() - recoveryStarted;
  assert.equal(recovered.status(active.session.id, active.token).state, "paused");
  assert.equal(recovered.status(complete.session.id, complete.token).state, "completed");
  assert.ok(fs.readdirSync(roots.quarantine).some((name) => name.includes("broken")));
  context.diagnostic(`synthetic recovery: 2 valid + 1 corrupt manifests in ${recoveryMs.toFixed(2)}ms`);
});

test("recovery detects missing or inconsistent staging data", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21b-missing-"));
  temporaryRoots.push(root);
  const roots = defaultUploadRoots(root);
  const first = new UploadSessionService(roots);
  const created = create(first, 256 * 1024);
  fs.unlinkSync(path.join(roots.incomplete, `${created.session.id}.part`));
  const recovered = new UploadSessionService(roots);
  const status = recovered.status(created.session.id, created.token);
  assert.equal(status.state, "failed");
  assert.equal(status.errorCode, "recovery-required");
});

test("cleanup removes stale terminal staging but retains recent active work", () => {
  let now = 1_000_000;
  const upload = service({ now: () => now });
  const cancelled = create(upload, 1024);
  upload.cancel(cancelled.session.id, cancelled.token);
  const active = create(upload, 1024);
  now += UPLOAD_TERMINAL_RETENTION_MS + 1;
  assert.equal(upload.cleanup().removed, 1);
  assert.equal(upload.status(active.session.id, active.token).state, "created");
  assert.throws(() => upload.status(cancelled.session.id, cancelled.token), /not found/);
});

test("streaming a representative chunk keeps confirmed progress bounded", async (context) => {
  const upload = service();
  const size = 4 * 1024 * 1024;
  const created = create(upload, size);
  const body = Buffer.alloc(size, 0x44);
  const before = process.memoryUsage().heapUsed;
  const started = performance.now();
  const result = await upload.writeChunk(
    created.session.id, created.token, 0, size, request(body, 64)
  );
  const elapsedMs = performance.now() - started;
  const heapDelta = process.memoryUsage().heapUsed - before;
  assert.equal(result.session.receivedBytes, size);
  assert.ok(heapDelta < 32 * 1024 * 1024, `heap delta was ${heapDelta}`);
  context.diagnostic(
    `4MiB chunk in ${elapsedMs.toFixed(2)}ms; heap delta ${(heapDelta / 1024 / 1024).toFixed(2)}MiB`
  );
});
