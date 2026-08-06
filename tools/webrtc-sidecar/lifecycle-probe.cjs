"use strict";

const wrtc = require("@roamhq/wrtc");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const handleName = handle => {
  const name = handle?.constructor?.name || typeof handle;
  if (name === "Socket") return `${name}:${handle.localAddress || "stdio"}:${handle.localPort || ""}`;
  return name;
};
const snapshot = label => ({
  label,
  at: Date.now(),
  handles: process._getActiveHandles().map(handleName).sort(),
  requests: process._getActiveRequests().map(request => request?.constructor?.name || typeof request).sort(),
  memory: process.memoryUsage(),
});
const tone = (sampleRate = 48_000, frames = 480) => {
  const samples = new Int16Array(frames);
  for (let i = 0; i < frames; i += 1) samples[i] = Math.round(Math.sin(i * 2 * Math.PI * 440 / sampleRate) * 8192);
  return { samples, sampleRate, bitsPerSample: 16, channelCount: 1, numberOfFrames: frames };
};

async function oneSession(index, detailed = false) {
  let pc = new wrtc.RTCPeerConnection({ iceServers: [] });
  let source = new wrtc.nonstandard.RTCAudioSource();
  let track = source.createTrack();
  let sender = pc.addTrack(track);
  const points = detailed ? [snapshot("after-construction")] : [];
  source.onData(tone());
  if (detailed) points.push(snapshot("after-synthetic-pcm"));
  await sender.replaceTrack(null);
  if (detailed) points.push(snapshot("after-replaceTrack-null"));
  try { pc.removeTrack(sender); } catch {}
  if (detailed) points.push(snapshot("after-removeTrack"));
  track.stop();
  if (detailed) points.push(snapshot("after-track-stop"));
  pc.getTransceivers().forEach(transceiver => { try { transceiver.stop(); } catch {} });
  pc.close();
  pc.onicecandidate = null; pc.onconnectionstatechange = null;
  if (detailed) points.push(snapshot("after-pc-close"));
  sender = null; track = null; source = null; pc = null;
  if (global.gc) global.gc();
  await sleep(25);
  if (detailed) points.push(snapshot("after-cleanup-grace"));
  return { index, points };
}

async function main() {
  const cycles = Math.max(1, Math.min(100, Number(process.argv[2] || 1)));
  const startedAt = Date.now();
  const result = { pid: process.pid, node: process.version, wrtc: require("@roamhq/wrtc/package.json").version,
    before: snapshot("before-construction"), cycles: [], checkpoints: [] };
  for (let index = 0; index < cycles; index += 1) {
    result.cycles.push(await oneSession(index + 1, index === 0));
    if ((index + 1) % 5 === 0 || index + 1 === cycles) result.checkpoints.push(snapshot(`cycle-${index + 1}`));
  }
  result.after = snapshot("after-all-cycles");
  result.elapsedMs = Date.now() - startedAt;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch(error => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; });
