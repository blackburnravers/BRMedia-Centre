"use strict";
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const wrtc = require("@roamhq/wrtc");
const store = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "server", "data", "brmedia-profiles.json"), "utf8"));
const auth = [...(store.sessions || [])].filter(value => Number(value.expiresAt) > Date.now()).sort((a, b) => Number(b.expiresAt) - Number(a.expiresAt))[0];
if (!auth?.token) throw new Error("No active BRMedia session is available for the authenticated probe");
const headers = { Cookie: `brmedia_profile_token=${encodeURIComponent(auth.token)}`, Origin: "http://localhost:8787",
  Referer: "http://localhost:8787/dj-mixer/performance.html", "Sec-Fetch-Site": "same-origin", "X-BRMedia-Requested-With": "dj-mixer-m26" };
const request = (method, route, body, bearer) => new Promise((resolve, reject) => { const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const req = http.request({ host: "127.0.0.1", port: 8787, method, path: route, headers: { ...headers,
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}) } }, res => {
      const chunks = []; res.on("data", chunk => chunks.push(chunk)); res.on("end", () => { let value = {}; try { value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
        if ((res.statusCode || 500) >= 400) reject(new Error(`${res.statusCode}: ${value.error || "request failed"}`)); else resolve(value); }); });
  req.on("error", reject); if (payload) req.write(payload); req.end(); });
const waitIce = pc => new Promise(resolve => { if (pc.iceGatheringState === "complete") return resolve(); const timer = setTimeout(resolve, 2500);
  pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") { clearTimeout(timer); resolve(); } }; });
async function main() {
  const status = await request("GET", "/api/dj/mixxx/master-stream/status");
  if (!status.mixxxReady) throw new Error("Mixxx authority is not ready");
  const pc = new wrtc.RTCPeerConnection({ iceServers: [] }); let packets = 0, nonSilentPackets = 0, peak = 0, sink;
  pc.addTransceiver("audio", { direction: "recvonly" }); pc.ontrack = event => { sink = new wrtc.nonstandard.RTCAudioSink(event.track);
    sink.ondata = data => { packets += 1; let localPeak = 0; for (const sample of data.samples) localPeak = Math.max(localPeak, Math.abs(sample));
      peak = Math.max(peak, localPeak); if (localPeak > 16) nonSilentPackets += 1; }; };
  await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
  const created = await request("POST", "/api/dj/mixxx/master-stream/webrtc/sessions", { offer: pc.localDescription });
  await pc.setRemoteDescription(created.session.answer);
  const deadline = Date.now() + 12_000; while (Date.now() < deadline && nonSilentPackets < 3) await new Promise(resolve => setTimeout(resolve, 100));
  await request("POST", `/api/dj/mixxx/master-stream/sessions/${created.session.id}/telemetry`, { state: nonSilentPackets ? "live" : "buffering",
    transportConnected: pc.connectionState === "connected", audioContextState: "running", framesReceived: packets,
    nonSilentFramesReceived: nonSilentPackets, sourcePeak: peak / 32768, outputAttached: true }, created.session.token);
  const finalStatus = await request("GET", "/api/dj/mixxx/master-stream/status");
  await request("DELETE", `/api/dj/mixxx/master-stream/webrtc/sessions/${created.session.id}`);
  try { sink?.stop(); } catch {} pc.getReceivers().forEach(receiver => receiver.track?.stop()); pc.close();
  process.stdout.write(`${JSON.stringify({ authenticated: true, mixxxReady: true, transport: created.session.transport,
    peerConnectionState: pc.connectionState, packets, nonSilentPackets, peak: peak / 32768,
    serverStream: finalStatus.stream, sidecar: finalStatus.webRtcSidecar })}\n`);
}
main().catch(error => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; });
