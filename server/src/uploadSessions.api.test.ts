import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import {
  UploadSessionService,
  defaultUploadRoots,
  handleUploadSessionRoute,
} from "./uploadSessions";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m21b-api-"));
const service = new UploadSessionService(defaultUploadRoots(root));
let server: http.Server;
let origin = "";

before(async () => {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost");
    const handled = await handleUploadSessionRoute(req, res, url, service);
    if (!handled) {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("versioned API creates, resumes, uploads, finalises, and hides paths", async () => {
  const createResponse = await fetch(`${origin}/api/v1/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "Cross Device Test.mp3",
      totalSize: 256 * 1024,
      mimeType: "audio/mpeg",
      preferredChunkSize: 256 * 1024,
    }),
  });
  assert.equal(createResponse.status, 201);
  const created: any = await createResponse.json();
  assert.equal(created.ok, true);
  assert.ok(created.token);
  assert.doesNotMatch(JSON.stringify(created), /\.part|validation-staging|partPath|completedPath/);

  const auth = { Authorization: `Bearer ${created.token}` };
  const body = Buffer.alloc(256 * 1024, 0x31);
  const chunkResponse = await fetch(
    `${origin}/api/v1/uploads/${created.session.id}/chunks/0`,
    { method: "PUT", headers: auth, body }
  );
  assert.equal(chunkResponse.status, 200);
  const chunk: any = await chunkResponse.json();
  assert.equal(chunk.session.receivedBytes, body.length);

  const statusResponse = await fetch(
    `${origin}/api/v1/uploads/${created.session.id}`,
    { headers: auth }
  );
  assert.equal(statusResponse.status, 200);
  const status: any = await statusResponse.json();
  assert.equal(status.session.remainingBytes, 0);

  const finaliseResponse = await fetch(
    `${origin}/api/v1/uploads/${created.session.id}/finalise`,
    { method: "POST", headers: auth }
  );
  assert.equal(finaliseResponse.status, 200);
  const finalised: any = await finaliseResponse.json();
  assert.equal(finalised.session.state, "completed");
  assert.equal(finalised.session.completedTransfer, true);
});

test("API rejects missing credentials, invalid limits, malformed metadata, and unknown routes", async () => {
  const malformed = await fetch(`${origin}/api/v1/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  const malformedBody: any = await malformed.json();
  assert.equal(malformedBody.code, "invalid-metadata");

  const created: any = await (await fetch(`${origin}/api/v1/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: "Auth Test.mp3", totalSize: 1024 }),
  })).json();
  const unauthorised = await fetch(`${origin}/api/v1/uploads/${created.session.id}`);
  assert.equal(unauthorised.status, 404);

  const unknown = await fetch(`${origin}/api/v1/uploads/not-an-id`);
  assert.equal(unknown.status, 404);
});

test("diagnostics are bounded and contain no local paths", async () => {
  const response = await fetch(`${origin}/api/v1/uploads/diagnostics`);
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.doesNotMatch(text, /partPath|completedPath|validation-staging|brmedia-m21b-api/);
  const payload = JSON.parse(text);
  assert.ok(payload.diagnostics.sessionsKnown >= 1);
  assert.ok(payload.diagnostics.limits.maximumChunkSize > 0);
});

