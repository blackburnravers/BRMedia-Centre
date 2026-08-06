"use strict";
const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const readline = require("node:readline");
const wrtc = require("@roamhq/wrtc");
const secret = crypto.randomBytes(32).toString("base64url");
const child = spawn(process.execPath, [path.join(__dirname, "app.cjs")], { cwd: __dirname, windowsHide: true,
  env: { ...process.env, BRMEDIA_WEBRTC_SIDECAR_TOKEN: secret, BRMEDIA_WEBRTC_SIDECAR_PORT: "0" }, stdio: ["pipe", "pipe", "inherit"] });
const request = (port, method, route, body) => new Promise((resolve, reject) => {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const req = http.request({ host: "127.0.0.1", port, method, path: route, headers: { Authorization: `Bearer ${secret}`,
    ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}) } }, res => {
    const chunks = []; res.on("data", chunk => chunks.push(chunk)); res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (error) { reject(error); } });
  }); req.on("error", reject); if (payload) req.write(payload); req.end();
});
const waitIce = pc => new Promise(resolve => { if (pc.iceGatheringState === "complete") return resolve();
  const timer = setTimeout(resolve, 2500); pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") { clearTimeout(timer); resolve(); } }; });
const pcm = (includePreamble, sequence) => { const frames = 480, payload = Buffer.alloc(frames * 4), preamble = Buffer.alloc(24), header = Buffer.alloc(24);
  preamble.write("BRM26PCM"); preamble.writeUInt16LE(1, 8); preamble.writeUInt16LE(24, 10); preamble.writeUInt32LE(48000, 12); preamble.writeUInt16LE(2, 16); preamble.writeUInt16LE(1, 18); preamble.writeUInt32LE(960, 20);
  header.write("M26F"); header.writeUInt32LE(1, 4); header.writeDoubleLE(Date.now(), 8); header.writeUInt32LE(payload.length, 16);
  for (let i = 0; i < frames; i += 1) { const sample = Math.round(Math.sin((sequence * 480 + i) * 2 * Math.PI * 440 / 48000) * 12000); payload.writeInt16LE(sample, i * 4); payload.writeInt16LE(sample, i * 4 + 2); }
  return Buffer.concat(includePreamble ? [preamble, header, payload] : [header, payload]); };
const mediaRecord = (type, id, payload = Buffer.alloc(0)) => { const idBytes = Buffer.from(id, "ascii"), header = Buffer.alloc(16);
  header.write("BRM26BIN"); header.writeUInt8(type, 8); header.writeUInt8(idBytes.length, 9); header.writeUInt32LE(payload.length, 12);
  return Buffer.concat([header, idBytes, payload]); };
async function run(port) {
  const id = crypto.randomBytes(18).toString("base64url"), pc = new wrtc.RTCPeerConnection({ iceServers: [] });
  let audioFrames = 0, peak = 0, sink = null;
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.ontrack = event => { sink = new wrtc.nonstandard.RTCAudioSink(event.track); sink.ondata = data => { audioFrames += 1;
    for (const sample of data.samples) peak = Math.max(peak, Math.abs(sample)); }; };
  await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
  const created = await request(port, "POST", "/sessions", { id, offer: pc.localDescription.sdp }); await pc.setRemoteDescription(created.answer);
  child.stdin.write(mediaRecord(1, id));
  await new Promise(resolve => { let sent = 0; const timer = setInterval(() => { child.stdin.write(mediaRecord(2, id, pcm(sent === 0, sent)));
    if (++sent === 30) { clearInterval(timer); child.stdin.write(mediaRecord(3, id)); resolve(); } }, 10); });
  await new Promise(resolve => setTimeout(resolve, 300));
  const health = await request(port, "GET", "/health"); await request(port, "DELETE", `/sessions/${id}`);
  try { sink?.stop(); } catch {} pc.getReceivers().forEach(receiver => receiver.track?.stop()); pc.close();
  const shutdown = await request(port, "POST", "/shutdown");
  process.stdout.write(`${JSON.stringify({ parentPid: process.pid, sidecarPid: child.pid, readyPid, sidecarCount: 1,
    audioFrames, peak, health, shutdown, exactPidMatched: readyPid === child.pid })}\n`);
  setTimeout(() => { if (child.exitCode === null && child.pid === readyPid) child.kill(); }, 500);
  setTimeout(() => process.exit(0), 750);
}
let readyPid = 0;
readline.createInterface({ input: child.stdout }).once("line", line => { const ready = JSON.parse(line); readyPid = ready.pid; void run(ready.port).catch(error => { console.error(error); child.kill(); process.exitCode = 1; }); });
