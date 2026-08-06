"use strict";

const http = require("node:http");
const wrtc = require("@roamhq/wrtc");
const { ExactPcmFrameParser, PcmRealtimeScheduler, FRAME_BYTES } = require("./pcm-scheduler.cjs");

const host = "127.0.0.1";
const port = Number(process.env.BRMEDIA_WEBRTC_SIDECAR_PORT || 0);
const secret = String(process.env.BRMEDIA_WEBRTC_SIDECAR_TOKEN || "");
if (!secret || secret.length < 32) throw new Error("Sidecar token is required");

let accepting = true;
const peers = new Map();
const keepAlive = setInterval(() => {}, 60_000);
const failedPeerGraceMs = 75_000;
const lifecycle = [];
function recordLifecycle(value, event, reason = null) {
  lifecycle.push({ at: Date.now(), id: value?.id || null, owner: value?.owner || null, event, reason,
    connectionState: value?.pc?.connectionState || null, iceConnectionState: value?.pc?.iceConnectionState || null,
    iceGatheringState: value?.pc?.iceGatheringState || null, signalingState: value?.pc?.signalingState || null });
  if (lifecycle.length > 200) lifecycle.splice(0, lifecycle.length - 200);
}

const json = (res, status, value) => {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": body.length, "Cache-Control": "no-store" });
  res.end(body);
};
const readJson = req => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on("data", chunk => { size += chunk.length; if (size > 1024 * 1024) reject(new Error("request too large")); else chunks.push(chunk); });
  req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (error) { reject(error); } });
  req.on("error", reject);
});
const waitForIce = pc => new Promise(resolve => {
  if (pc.iceGatheringState === "complete") return resolve();
  const timer = setTimeout(done, 2000);
  function done() { clearTimeout(timer); pc.removeEventListener("icegatheringstatechange", changed); resolve(); }
  function changed() { if (pc.iceGatheringState === "complete") done(); }
  pc.addEventListener("icegatheringstatechange", changed);
});
function closePeer(id, reason = "unspecified") {
  const value = peers.get(id); if (!value) return false; peers.delete(id);
  value.closed = true; if (value.failureTimer) clearTimeout(value.failureTimer); value.failureTimer = null;
  value.cleanupReason = reason; recordLifecycle(value, "peer-removed", reason);
  try { value.sender.replaceTrack(null).catch(() => {}); } catch {}
  try { value.pc.removeTrack(value.sender); } catch {}
  try { value.track.stop(); } catch {}
  try { value.pc.getTransceivers().forEach(item => item.stop()); } catch {}
  try { value.pc.close(); } catch {}
  try { value.scheduler?.stop(); } catch {}
  try { process.stdout.write(`${JSON.stringify({ type: "peer-closed", id, reason, pid: process.pid })}\n`); } catch {}
  return true;
}
async function createPeer(id, offer, owner) {
  if (!accepting || peers.has(id)) throw new Error("session unavailable");
  const pc = new wrtc.RTCPeerConnection({ iceServers: [] });
  const source = new wrtc.nonstandard.RTCAudioSource();
  const track = source.createTrack();
  const sender = pc.addTrack(track);
  const value = { id, owner: String(owner || "unknown").slice(0, 80), pc, source, track, sender, closed: false,
    bytes: 0, frames: 0, emittedFrames: 0, nonSilentFrames: 0, peak: 0, rms: 0, latestPcmAt: 0,
    buffer: Buffer.alloc(0), format: null, parser: null, scheduler: null, sourceSequence: 0,
    pipeDisconnects: 0, pipeBackpressureEvents: 0,
    createdAt: Date.now(), connectedAt: 0, failureTimer: null, cleanupReason: null };
  peers.set(id, value); recordLifecycle(value, "peer-created");
  pc.addEventListener("connectionstatechange", () => {
    recordLifecycle(value, "connection-state-change");
    if (pc.connectionState === "connected") {
      value.connectedAt ||= Date.now();
      if (value.failureTimer) clearTimeout(value.failureTimer); value.failureTimer = null;
    } else if (pc.connectionState === "failed" && !value.failureTimer) {
      recordLifecycle(value, "failed-grace-started", `grace-ms:${failedPeerGraceMs}`);
      value.failureTimer = setTimeout(() => closePeer(id, "connection-failed-after-grace"), failedPeerGraceMs);
    } else if (pc.connectionState === "closed") closePeer(id, "connection-closed");
  });
  pc.addEventListener("iceconnectionstatechange", () => recordLifecycle(value, "ice-state-change"));
  pc.addEventListener("icegatheringstatechange", () => recordLifecycle(value, "ice-gathering-state-change"));
  pc.addEventListener("signalingstatechange", () => recordLifecycle(value, "signaling-state-change"));
  try {
    await pc.setRemoteDescription({ type: "offer", sdp: String(offer || "") });
    await pc.setLocalDescription(await pc.createAnswer());
    await waitForIce(pc);
    return { type: pc.localDescription.type, sdp: pc.localDescription.sdp };
  } catch (error) { closePeer(id, `negotiation-error:${String(error?.message || error)}`); throw error; }
}
function acceptPcm(value, chunk) {
  if (value.closed || !chunk.length) return;
  value.buffer = Buffer.concat([value.buffer, chunk]);
  if (!value.format) {
    if (value.buffer.length < 24) return;
    if (value.buffer.toString("ascii", 0, 8) !== "BRM26PCM") throw new Error("invalid PCM preamble");
    value.format = { sampleRate: value.buffer.readUInt32LE(12), channels: value.buffer.readUInt16LE(16) };
    if (value.format.sampleRate !== 48000 || value.format.channels !== 2) throw new Error("unsupported PCM format");
    value.scheduler = new PcmRealtimeScheduler({ sampleRate: value.format.sampleRate, channels: value.format.channels,
      frameDurationMs: 10, prebufferFrames: 4, targetQueueFrames: 6, maxQueueFrames: 20,
      onFrame: (samples, numberOfFrames) => { if (value.closed) return;
        value.source.onData({ samples, sampleRate: value.format.sampleRate, bitsPerSample: 16,
          channelCount: value.format.channels, numberOfFrames }); value.emittedFrames += 1; } });
    value.parser = new ExactPcmFrameParser({ frameBytes: FRAME_BYTES, onFrame: frame => {
      const samples = new Int16Array(960);
      for (let i = 0; i < samples.length; i += 1) samples[i] = frame.readInt16LE(i * 2);
      value.scheduler.enqueue(samples, ++value.sourceSequence);
    } });
    value.buffer = value.buffer.subarray(24);
  }
  while (value.buffer.length >= 24) {
    if (value.buffer.toString("ascii", 0, 4) !== "M26F") throw new Error("invalid PCM frame");
    const bytes = value.buffer.readUInt32LE(16); if (!bytes || bytes > 65536 || value.buffer.length < 24 + bytes) return;
    const payload = value.buffer.subarray(24, 24 + bytes); value.buffer = value.buffer.subarray(24 + bytes);
    let peak = 0, squareSum = 0;
    for (let i = 0; i < payload.length / 2; i += 1) { const sample = payload.readInt16LE(i * 2); peak = Math.max(peak, Math.abs(sample)); squareSum += (sample / 32768) ** 2; }
    value.parser.push(payload);
    value.bytes += payload.length; value.frames += 1; value.latestPcmAt = Date.now(); value.peak = Math.max(value.peak, peak / 32768);
    value.rms = Math.sqrt(squareSum / Math.max(1, payload.length / 2)); if (peak > 16) value.nonSilentFrames += 1;
  }
}
async function peerDiagnostics(value) {
  const reports = await value.pc.getStats(); let outbound = null, pair = null, local = null, remote = null, codec = null;
  reports.forEach(report => {
    if (report.type === "outbound-rtp" && report.kind === "audio" && !report.isRemote) outbound = report;
    if (report.type === "transport" && report.selectedCandidatePairId) pair = reports.get(report.selectedCandidatePairId) || pair;
  });
  if (!pair) reports.forEach(report => { if (report.type === "candidate-pair" && (report.selected || (report.nominated && report.state === "succeeded"))) pair = report; });
  if (pair) { local = reports.get(pair.localCandidateId); remote = reports.get(pair.remoteCandidateId); }
  if (outbound?.codecId) codec = reports.get(outbound.codecId);
  return { id: value.id, owner: value.owner, senderTrackId: value.track.id, connectionState: value.pc.connectionState,
    iceConnectionState: value.pc.iceConnectionState, iceGatheringState: value.pc.iceGatheringState, signalingState: value.pc.signalingState,
    senderPacketsSent: outbound?.packetsSent ?? 0, senderBytesSent: outbound?.bytesSent ?? 0,
    totalPacketSendDelay: outbound?.totalPacketSendDelay ?? null, codec: codec ? { mimeType: codec.mimeType, clockRate: codec.clockRate, channels: codec.channels, sdpFmtpLine: codec.sdpFmtpLine } : null,
    selectedCandidatePair: pair ? { state: pair.state, nominated: pair.nominated, currentRoundTripTime: pair.currentRoundTripTime,
      local: local ? { candidateType: local.candidateType, address: local.address || local.ip, protocol: local.protocol, port: local.port } : null,
      remote: remote ? { candidateType: remote.candidateType, address: remote.address || remote.ip, protocol: remote.protocol, port: remote.port } : null } : null,
    source: { frames: value.frames, emittedFrames: value.emittedFrames, bytes: value.bytes, bufferedBytes: value.parser?.tail.length || 0,
      nonSilentFrames: value.nonSilentFrames, peak: value.peak, rms: value.rms, latestPcmAt: value.latestPcmAt,
      pipe: { transport: "parent-child-stdin-binary", disconnects: value.pipeDisconnects, backpressureEvents: value.pipeBackpressureEvents },
      parser: value.parser?.diagnostics() || null, scheduler: value.scheduler?.diagnostics() || null },
    createdAt: value.createdAt, connectedAt: value.connectedAt || null, ageMs: Date.now() - value.createdAt,
    senderTrackState: value.track.readyState, cleanupReason: value.cleanupReason, failedPeerGraceMs };
}
async function diagnostics() {
  return { pid: process.pid, node: process.version, wrtc: require("@roamhq/wrtc/package.json").version, accepting,
    failedPeerGraceMs, peerCount: peers.size, peers: await Promise.all([...peers.values()].map(peerDiagnostics)), lifecycle: lifecycle.slice(-80) };
}
async function shutdown(res) {
  accepting = false; for (const id of [...peers.keys()]) closePeer(id, "controlled-shutdown");
  json(res, 200, { ok: true, type: "shutdown-ack", pid: process.pid, peers: peers.size });
  server.close();
  // @roamhq/wrtc 0.10.0 has an unstable process-final native teardown on
  // Windows. Keep the acknowledged child alive for the parent-owned grace.
}
const server = http.createServer(async (req, res) => {
  if (req.socket.remoteAddress !== "127.0.0.1" && req.socket.remoteAddress !== "::ffff:127.0.0.1") return json(res, 403, { ok: false });
  if (req.headers.authorization !== `Bearer ${secret}`) return json(res, 401, { ok: false });
  const url = new URL(req.url, `http://${host}`);
  try {
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, ...(await diagnostics()) });
    if (req.method === "POST" && url.pathname === "/sessions") {
      const body = await readJson(req); const id = String(body.id || ""); if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) throw new Error("invalid id");
      const answer = await createPeer(id, body.offer, body.owner); return json(res, 201, { ok: true, id, answer });
    }
    const match = url.pathname.match(/^\/sessions\/([A-Za-z0-9_-]{16,64})$/);
    if (match && req.method === "DELETE") return json(res, 200, { ok: true, closed: closePeer(match[1], "explicit-session-delete") });
    if (req.method === "POST" && url.pathname === "/shutdown") return shutdown(res);
    return json(res, 404, { ok: false });
  } catch (error) { return json(res, 400, { ok: false, error: String(error?.message || error) }); }
});
let mediaInput = Buffer.alloc(0);
process.stdin.on("data", chunk => {
  mediaInput = mediaInput.length ? Buffer.concat([mediaInput, chunk]) : Buffer.from(chunk);
  while (mediaInput.length >= 16) {
    if (mediaInput.toString("ascii", 0, 8) !== "BRM26BIN") throw new Error("invalid binary media pipe magic");
    const type = mediaInput.readUInt8(8), idLength = mediaInput.readUInt8(9), payloadLength = mediaInput.readUInt32LE(12);
    if (idLength < 16 || idLength > 64 || payloadLength > 1024 * 1024) throw new Error("invalid binary media record");
    const total = 16 + idLength + payloadLength; if (mediaInput.length < total) break;
    const id = mediaInput.toString("ascii", 16, 16 + idLength);
    const payload = mediaInput.subarray(16 + idLength, total); mediaInput = mediaInput.subarray(total);
    const value = peers.get(id); if (!value) continue;
    try {
      if (type === 1) { value.buffer = Buffer.alloc(0); value.parser?.reset(); value.scheduler?.clearStale(); }
      else if (type === 2) acceptPcm(value, payload);
      else if (type === 3) { value.pipeDisconnects += 1; value.buffer = Buffer.alloc(0); value.parser?.reset(); value.scheduler?.clearStale(); }
      else throw new Error("invalid binary media record type");
    } catch (error) { closePeer(id, `pcm-parse-error:${String(error?.message || error).slice(0, 160)}`); }
  }
});
process.stdin.on("end", () => { for (const value of peers.values()) { value.pipeDisconnects += 1; value.parser?.reset(); value.scheduler?.clearStale(); } });
server.listen(port, host, () => {
  const address = server.address(); process.stdout.write(`${JSON.stringify({ type: "ready", pid: process.pid, host, port: address.port })}\n`);
});
process.on("SIGTERM", () => { clearInterval(keepAlive); for (const id of [...peers.keys()]) closePeer(id, "sigterm"); process.exit(0); });
