import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { spawnSync } from "node:child_process";
import { GuestTrackService, boundedFfprobe, compactProbe } from "./guestTracks";
import { UploadSessionService, defaultUploadRoots } from "./uploadSessions";

const roots: string[] = [];
test.afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop()!, { recursive: true, force: true });
});

const probe = (overrides: any = {}) => ({
  format: {
    format_name: "mp3",
    duration: "1.25",
    bit_rate: "128000",
    tags: { title: "Synthetic tone", artist: "BRMedia test" },
    ...overrides.format,
  },
  streams: [{
    codec_type: "audio", codec_name: "mp3", duration: "1.25",
    sample_rate: "44100", channels: 2, ...overrides.stream,
  }, ...(overrides.extraStreams || [])],
});

async function completed() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21c-"));
  roots.push(root);
  const uploads = new UploadSessionService(defaultUploadRoots(path.join(root, "uploads")));
  const bytes = Buffer.from("synthetic fixture bytes");
  const created = uploads.create({
    filename: "tone.mp3", totalSize: bytes.length,
    expectedHash: crypto.createHash("sha256").update(bytes).digest("hex"),
    hashAlgorithm: "sha256",
  });
  await uploads.writeChunk(
    created.session.id, created.token, 0, bytes.length, Readable.from(bytes) as any
  );
  await uploads.finalise(created.session.id, created.token);
  return { root, uploads, created };
}

test("compact probe rejects non-audio and malformed duration", () => {
  assert.throws(() => compactProbe({
    format: { format_name: "mp3", duration: "1" }, streams: [],
  }, "tone"), { code: "no-audio-stream" });
  assert.throws(() => compactProbe(probe({ format: { duration: "NaN" }, stream: { duration: "Infinity" } }), "tone"),
    { code: "invalid-duration" });
});

test("compact probe bounds tags, strips controls, and detects artwork without bytes", () => {
  const raw = probe({
    format: { tags: { title: "Tone\u0000 title", artist: "Tester" } },
    extraStreams: [{ codec_type: "video", disposition: { attached_pic: 1 } }],
  });
  const result = compactProbe(raw, "fallback");
  assert.equal(result.metadata.title, "Tone title");
  assert.equal(result.metadata.artworkPresent, true);
  assert.equal(result.policy, "supported-direct");
  assert.equal(JSON.stringify(result).includes("privateFilePath"), false);
});

test("trusted ffprobe accepts a tiny ffmpeg-generated synthetic tone", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21c-tone-"));
  roots.push(root);
  const output = path.join(root, "tone.wav");
  const configured = String(process.env.FFMPEG_PATH || "").trim();
  const bundled = "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
  const ffmpeg = configured || (process.platform === "win32" && fs.existsSync(bundled)
    ? bundled : process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const generated = spawnSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-f", "lavfi",
    "-i", "sine=frequency=440:duration=0.15", "-ac", "1", "-ar", "8000",
    "-c:a", "pcm_s16le", output,
  ], { windowsHide: true, timeout: 10_000 });
  if (generated.error || generated.status !== 0) {
    t.skip("Trusted FFmpeg test tool is unavailable");
    return;
  }
  const raw = await boundedFfprobe(output, new AbortController().signal);
  const compact = compactProbe(raw, "tone");
  assert.equal(compact.policy, "supported-direct");
  assert.equal(compact.metadata.codec, "pcm_s16le");
  assert.equal(compact.metadata.duration > 0, true);
});

test("completed transfer validates, hashes, promotes, and is idempotent", async () => {
  const fixture = await completed();
  const guests = new GuestTrackService(
    fixture.uploads, path.join(fixture.root, "guests"), async () => probe()
  );
  const first = await guests.validate(fixture.created.session.id, fixture.created.token);
  assert.equal(first.state, "guest-ready");
  assert.match(first.guestId!, /^[A-Za-z0-9_-]{32}$/);
  const second = await guests.validate(fixture.created.session.id, fixture.created.token);
  assert.equal(second.guestId, first.guestId);
  const listing = guests.listGuests();
  assert.equal(listing.items.length, 1);
  assert.equal(JSON.stringify(listing).includes(fixture.root), false);
  assert.equal(JSON.stringify(listing).includes("privateFilePath"), false);
});

test("probable duplicate pauses for explicit review; exact content reuses guest", async () => {
  const first = await completed();
  const guests = new GuestTrackService(
    first.uploads, path.join(first.root, "guests"), async () => probe()
  );
  const ready = await guests.validate(first.created.session.id, first.created.token);
  assert.equal(ready.state, "guest-ready");

  const secondUpload = new UploadSessionService(defaultUploadRoots(path.join(first.root, "uploads-2")));
  const bytes = Buffer.from("different synthetic bytes");
  const created = secondUpload.create({ filename: "tone.mp3", totalSize: bytes.length });
  await secondUpload.writeChunk(created.session.id, created.token, 0, bytes.length, Readable.from(bytes) as any);
  await secondUpload.finalise(created.session.id, created.token);
  const secondGuests = new GuestTrackService(
    secondUpload, path.join(first.root, "guests"), async () => probe()
  );
  const review = await secondGuests.validate(created.session.id, created.token);
  assert.equal(review.state, "duplicate-review");
  assert.equal(review.duplicate?.requiresReview, true);
});

test("probe cancellation and retry preserve completed transfer", async () => {
  const fixture = await completed();
  let release!: () => void;
  const held = new Promise<any>((resolve) => { release = () => resolve(probe()); });
  const guests = new GuestTrackService(
    fixture.uploads, path.join(fixture.root, "guests"), async (_path, signal) => {
      await Promise.race([
        held,
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(
          Object.assign(new Error("cancelled"), { code: "validation-cancelled" })
        ))),
      ]);
      return probe();
    }
  );
  const running = guests.validate(fixture.created.session.id, fixture.created.token);
  await new Promise((resolve) => setImmediate(resolve));
  guests.cancel(fixture.created.session.id);
  release();
  const cancelled = await running;
  assert.equal(["cancelled", "validation-failed"].includes(cancelled.state), true);
  assert.equal(fixture.uploads.status(fixture.created.session.id, fixture.created.token).state, "completed");
});
