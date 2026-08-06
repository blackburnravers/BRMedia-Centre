import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { GuestTrackService, handleGuestTrackRoute } from "./guestTracks";
import { UploadSessionService, defaultUploadRoots } from "./uploadSessions";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21d-api-"));
const uploads = new UploadSessionService(defaultUploadRoots(path.join(root, "uploads")));
const bytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
const created = uploads.create({
  filename: "range-test.mp3",
  totalSize: bytes.length,
  expectedHash: crypto.createHash("sha256").update(bytes).digest("hex"),
  hashAlgorithm: "sha256",
});
let now = Date.now();
const guests = new GuestTrackService(
  uploads,
  path.join(root, "guests"),
  async () => ({
    format: { format_name: "mp3", duration: "1", tags: { title: "Range test" } },
    streams: [{
      codec_type: "audio", codec_name: "mp3", duration: "1",
      sample_rate: "44100", channels: 2,
    }],
  }),
  () => now
);
let server: http.Server;
let origin = "";
let guestId = "";
let lease: any;

test.before(async () => {
  await uploads.writeChunk(
    created.session.id, created.token, 0, bytes.length, Readable.from(bytes) as any
  );
  await uploads.finalise(created.session.id, created.token);
  const validation = await guests.validate(created.session.id, created.token);
  guestId = validation.guestId!;
  server = http.createServer(async (req, res) => {
    const handled = await handleGuestTrackRoute(
      req, res, new URL(req.url || "/", "http://localhost"), guests
    );
    if (!handled) { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  origin = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${origin}/api/v1/guest-tracks/${guestId}/reservations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${created.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: "m21d_api_client_1234", deckId: "d1", generation: 1,
    }),
  });
  assert.equal(response.status, 201);
  lease = (await response.json() as any).reservation;
});

test.after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
  fs.rmSync(root, { recursive: true, force: true });
});

const mediaHeaders = () => ({
  Authorization: `Bearer ${lease.leaseToken}`,
  "X-Guest-Reservation": lease.id,
});

test("authenticated guest media supports whole, HEAD, and byte ranges", async () => {
  const whole = await fetch(`${origin}${lease.mediaUrl}`, { headers: mediaHeaders() });
  assert.equal(whole.status, 200);
  assert.equal(whole.headers.get("accept-ranges"), "bytes");
  assert.equal(whole.headers.get("content-type"), "audio/mpeg");
  assert.equal(whole.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(Number(whole.headers.get("content-length")), bytes.length);
  assert.equal(await whole.text(), bytes.toString());

  const head = await fetch(`${origin}${lease.mediaUrl}`, {
    method: "HEAD", headers: mediaHeaders(),
  });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get("content-length")), bytes.length);

  const normal = await fetch(`${origin}${lease.mediaUrl}`, {
    headers: { ...mediaHeaders(), Range: "bytes=5-9" },
  });
  assert.equal(normal.status, 206);
  assert.equal(await normal.text(), "56789");

  const open = await fetch(`${origin}${lease.mediaUrl}`, {
    headers: { ...mediaHeaders(), Range: "bytes=10-" },
  });
  assert.equal(open.status, 206);
  assert.equal(await open.text(), bytes.subarray(10).toString());

  const suffix = await fetch(`${origin}${lease.mediaUrl}`, {
    headers: { ...mediaHeaders(), Range: "bytes=-5" },
  });
  assert.equal(suffix.status, 206);
  assert.equal(await suffix.text(), bytes.subarray(-5).toString());
});

test("media rejects malformed, multiple, unsatisfiable, unauthenticated, and unknown access", async () => {
  for (const range of [
    "bytes=999-", "bytes=a-b", "bytes=0-1,4-5", "bytes=-0",
    `bytes=${"9".repeat(4096)}-`,
  ]) {
    const response = await fetch(`${origin}${lease.mediaUrl}`, {
      headers: { ...mediaHeaders(), Range: range },
    });
    assert.equal(response.status, 416);
    assert.equal(response.headers.get("content-range"), `bytes */${bytes.length}`);
  }
  assert.equal((await fetch(`${origin}${lease.mediaUrl}`)).status, 404);
  assert.equal((await fetch(
    `${origin}/api/v1/guest-tracks/${"A".repeat(32)}/media`,
    { headers: mediaHeaders() }
  )).status, 404);
});

test("D1/D2 leases are independent, duplicates are rejected, commit persists, and release works", async () => {
  assert.throws(() => guests.reserve(guestId, created.token, {
    clientId: "m21d_api_client_1234", deckId: "d1", generation: 1,
  }), { code: "guest-reservation-already-exists" });
  const d2 = guests.reserve(guestId, created.token, {
    clientId: "m21d_api_client_1234", deckId: "d2", generation: 1,
  });
  assert.equal(d2.reservation.deckId, "d2");
  const committed = guests.refresh(
    guestId, lease.id, lease.leaseToken, true
  );
  assert.equal(committed.reservation.state, "loaded");
  const released = guests.release(
    guestId, d2.reservation.id, d2.reservation.leaseToken
  );
  assert.equal(released.reservations.some((item: any) => item.deckId === "d2"), false);
  const repeated = guests.release(
    guestId, d2.reservation.id, d2.reservation.leaseToken
  );
  assert.equal(repeated.reservations.some((item: any) => item.deckId === "d2"), false);
  const newerD2 = guests.reserve(guestId, created.token, {
    clientId: "m21d_api_client_1234", deckId: "d2", generation: 2,
  });
  guests.release(guestId, d2.reservation.id, d2.reservation.leaseToken);
  assert.equal(
    guests.listGuests().items[0].reservations.some(
      (item: any) => item.deckId === "d2"
    ),
    true
  );
  guests.release(
    guestId, newerD2.reservation.id, newerD2.reservation.leaseToken
  );
});

test("eligibility rejects failed, cleanup-pending, missing, escaped, and expired guests", async () => {
  const guest = (guests as any).guests.get(guestId);
  const originalPath = guest.privateFilePath;
  guest.validationStatus = "failed";
  assert.throws(() => guests.media(guestId, lease.id, lease.leaseToken), {
    code: "guest-not-ready",
  });
  guest.validationStatus = "guest-ready";
  guest.cleanupState = "cleanup-pending";
  assert.throws(() => guests.media(guestId, lease.id, lease.leaseToken), {
    code: "guest-cleanup-pending",
  });
  guest.cleanupState = "retained";
  guest.privateFilePath = path.join(root, "outside.mp3");
  assert.throws(() => guests.media(guestId, lease.id, lease.leaseToken), {
    code: "guest-path-invalid",
  });
  guest.privateFilePath = originalPath;
  const moved = `${originalPath}.missing`;
  fs.renameSync(originalPath, moved);
  assert.throws(() => guests.media(guestId, lease.id, lease.leaseToken), {
    code: "guest-media-missing",
  });
  fs.renameSync(moved, originalPath);
  guest.recoveryState = "healthy";
  guests.release(guestId, lease.id, lease.leaseToken);
  guest.retentionExpiresAt = now - 1;
  assert.throws(() => guests.reserve(guestId, created.token, {
    clientId: "m21d_api_client_1234", deckId: "d1", generation: 2,
  }), { code: "guest-expired" });
  guest.retentionExpiresAt = now + 1000;
});

test("active lease prevents expiry cleanup; stale lease permits cleanup", () => {
  const guest = (guests as any).guests.get(guestId);
  const active = guests.reserve(guestId, created.token, {
    clientId: "m21d_api_client_1234", deckId: "d1", generation: 3,
  });
  const activeD2 = guests.reserve(guestId, created.token, {
    clientId: "m21d_api_client_1234", deckId: "d2", generation: 3,
  });
  assert.equal(active.reservation.deckId, "d1");
  guest.retentionExpiresAt = now - 1;
  guests.cleanup();
  assert.equal(guests.listGuests().items.length, 1);
  const recovered = new GuestTrackService(
    uploads, path.join(root, "guests"), async () => ({}), () => now
  );
  assert.equal(
    (recovered.listGuests().items[0] as any).reservations.some(
      (item: any) => item.deckId === "d1"
    ),
    true
  );
  guests.release(
    guestId, active.reservation.id, active.reservation.leaseToken
  );
  guests.cleanup();
  assert.equal(guests.listGuests().items.length, 1);
  assert.equal(
    guests.listGuests().items[0].reservations.some(
      (item: any) => item.deckId === "d2"
    ),
    true
  );
  assert.equal(activeD2.reservation.deckId, "d2");
  now += 10 * 60 * 1000;
  const backing = (guests as any).guests.get(guestId).privateFilePath;
  fs.unlinkSync(backing);
  guests.cleanup();
  assert.equal(guests.listGuests().items.length, 0);
});
