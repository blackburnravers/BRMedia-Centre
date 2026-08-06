"use strict";

const readline = require("node:readline");
const wrtc = require("@roamhq/wrtc");

let accepting = true;
let peers = [];
const tone = () => {
  const samples = new Int16Array(480);
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.round(Math.sin(i * 2 * Math.PI * 440 / 48_000) * 8192);
  return { samples, sampleRate: 48_000, bitsPerSample: 16, channelCount: 1, numberOfFrames: samples.length };
};
async function createAndClose() {
  if (!accepting) throw new Error("shutting down");
  const pc = new wrtc.RTCPeerConnection({ iceServers: [] });
  const source = new wrtc.nonstandard.RTCAudioSource();
  const track = source.createTrack();
  const sender = pc.addTrack(track); peers.push({ pc, source, track, sender });
  source.onData(tone()); await sender.replaceTrack(null);
  try { pc.removeTrack(sender); } catch {}
  track.stop(); pc.getTransceivers().forEach(t => { try { t.stop(); } catch {} }); pc.close();
  peers = peers.filter(value => value.pc !== pc);
}
async function shutdown() {
  accepting = false;
  for (const value of peers.splice(0)) {
    try { await value.sender.replaceTrack(null); } catch {}
    try { value.pc.removeTrack(value.sender); } catch {}
    try { value.track.stop(); } catch {}
    try { value.pc.close(); } catch {}
  }
  process.stdout.write(`${JSON.stringify({ type: "shutdown-ack", pid: process.pid, peers: peers.length })}\n`);
  process.stdin.pause();
}
process.stdout.write(`${JSON.stringify({ type: "ready", pid: process.pid, node: process.version })}\n`);
const input = readline.createInterface({ input: process.stdin, terminal: false });
input.on("line", line => {
  let message; try { message = JSON.parse(line); } catch { return; }
  if (message.type === "cycle") void createAndClose().then(() => process.stdout.write(`${JSON.stringify({ type: "cycle-ack", id: message.id, pid: process.pid })}\n`));
  if (message.type === "shutdown") void shutdown().then(() => input.close());
});
