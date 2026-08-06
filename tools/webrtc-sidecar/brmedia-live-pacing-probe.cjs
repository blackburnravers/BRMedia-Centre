"use strict";

const http = require("node:http");
const wrtc = require("@roamhq/wrtc");

const durationSeconds = Math.max(10, Math.min(600, Number(process.argv[2] || 60)));
const ownerToken = "P".repeat(43);
const baseHeaders = { "Sec-Fetch-Site": "same-origin", Referer: "http://127.0.0.1:8787/dj-mixer/performance.html",
  "X-BRMedia-DJ-Session": ownerToken, "X-BRMedia-Requested-With": "dj-mixer-m26" };

function request(method, path, body, headers = {}) {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: 8787, method, path, headers: { ...baseHeaders, ...headers,
      ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}) } }, res => {
      const chunks = []; res.on("data", chunk => chunks.push(chunk)); res.on("end", () => {
        let value = {}; try { value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
        if ((res.statusCode || 500) >= 400) reject(new Error(`${method} ${path}: ${res.statusCode} ${JSON.stringify(value)}`)); else resolve(value);
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error("request timeout"))); req.on("error", reject); if (payload) req.write(payload); req.end();
  });
}

const waitForIce = pc => new Promise(resolve => {
  if (pc.iceGatheringState === "complete") return resolve();
  const timer = setTimeout(done, 3000);
  function done() { clearTimeout(timer); pc.removeEventListener("icegatheringstatechange", changed); resolve(); }
  function changed() { if (pc.iceGatheringState === "complete") done(); }
  pc.addEventListener("icegatheringstatechange", changed);
});

async function receiverStats(pc) {
  const reports = await pc.getStats(); let inbound = null;
  reports.forEach(report => { if (report.type === "inbound-rtp" && report.kind === "audio" && !report.isRemote) inbound = report; });
  if (!inbound) return null;
  return { packetsReceived: inbound.packetsReceived, bytesReceived: inbound.bytesReceived, packetsLost: inbound.packetsLost,
    jitter: inbound.jitter, jitterBufferDelay: inbound.jitterBufferDelay, jitterBufferEmittedCount: inbound.jitterBufferEmittedCount,
    concealedSamples: inbound.concealedSamples, silentConcealedSamples: inbound.silentConcealedSamples,
    insertedSamplesForDeceleration: inbound.insertedSamplesForDeceleration, removedSamplesForAcceleration: inbound.removedSamplesForAcceleration,
    totalSamplesReceived: inbound.totalSamplesReceived, totalAudioEnergy: inbound.totalAudioEnergy, audioLevel: inbound.audioLevel };
}

async function run() {
  const pc = new wrtc.RTCPeerConnection({ iceServers: [] });
  pc.addTransceiver("audio", { direction: "recvonly" });
  let sink = null; let receivedBlocks = 0; let receivedSamplesPerChannel = 0; let receivedSampleRate = 0; let receivedChannels = 0;
  pc.ontrack = event => { sink = new wrtc.nonstandard.RTCAudioSink(event.track); sink.ondata = data => {
    receivedBlocks += 1; receivedSamplesPerChannel += data.numberOfFrames; receivedSampleRate = data.sampleRate; receivedChannels = data.channelCount;
  }; };
  await pc.setLocalDescription(await pc.createOffer()); await waitForIce(pc);
  const created = await request("POST", "/api/dj/mixxx/master-stream/webrtc/sessions", { offer: pc.localDescription });
  await pc.setRemoteDescription(created.session.answer);
  const startedAt = Date.now(); const samples = [];
  for (let second = 1; second <= durationSeconds; second += 1) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    samples.push({ elapsedMs: Date.now() - startedAt, receiver: await receiverStats(pc) });
  }
  const status = await request("GET", "/api/dj/mixxx/master-stream/status");
  const peer = status.sidecarRuntime?.peers?.find(value => value.id === created.session.id) || null;
  await request("DELETE", `/api/dj/mixxx/master-stream/webrtc/sessions/${created.session.id}`);
  try { sink?.stop(); } catch {} pc.getReceivers().forEach(receiver => receiver.track?.stop()); pc.close();
  const elapsedMs = Date.now() - startedAt;
  process.stdout.write(`${JSON.stringify({ durationSeconds, elapsedMs, sessionId: created.session.id,
    received: { blocks: receivedBlocks, samplesPerChannel: receivedSamplesPerChannel, sampleRate: receivedSampleRate, channels: receivedChannels,
      decodedDurationMs: receivedSampleRate ? receivedSamplesPerChannel / receivedSampleRate * 1000 : 0,
      wallClockDriftMs: receivedSampleRate ? receivedSamplesPerChannel / receivedSampleRate * 1000 - elapsedMs : null },
    sender: peer, receiverStart: samples[0]?.receiver || null, receiverEnd: samples[samples.length - 1]?.receiver || null,
    receiverSamples: samples }, null, 2)}\n`);
  setTimeout(() => process.exit(0), 250);
}

run().catch(error => { console.error(error); process.exit(1); });
