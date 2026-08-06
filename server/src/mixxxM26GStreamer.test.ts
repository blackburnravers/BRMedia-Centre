import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MIXXX_MEDIA_TRANSPORTS, MixxxGStreamerWebRtc, parseMixxxMediaTransport } from "./mixxxGStreamerWebRtc";

const index = fs.readFileSync("server/src/index.ts", "utf8");
const manager = fs.readFileSync("server/src/mixxxGStreamerWebRtc.ts", "utf8");
const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");
const receiver = fs.readFileSync("server/public/dj-mixer/engine/m26-gstreamer-webrtc-receiver.js", "utf8");
const receiverApi = require("../public/dj-mixer/engine/m26-gstreamer-webrtc-receiver.js");

test("M26 internal selector accepts exactly the two approved transports", () => {
  assert.deepEqual([...MIXXX_MEDIA_TRANSPORTS], ["custom-webrtc", "gstreamer-webrtc"]);
  assert.equal(parseMixxxMediaTransport("custom-webrtc"), "custom-webrtc");
  assert.equal(parseMixxxMediaTransport("gstreamer-webrtc"), "gstreamer-webrtc");
  for (const value of ["", "pcm", "webrtc", null, undefined]) assert.throws(() => parseMixxxMediaTransport(value));
  assert.match(index, /BRMEDIA_MIXXX_MEDIA_TRANSPORT \|\| "gstreamer-webrtc"/);
});

test("M26 enforces mutual exclusion and preserves explicit custom rollback", () => {
  assert.match(index, /mixxxMediaTransport !== "custom-webrtc"/);
  assert.match(index, /await mixxxGStreamerWebRtc\.stop\(\)/);
  assert.match(index, /mixxxMediaTransport !== "gstreamer-webrtc"/);
  assert.match(index, /await mixxxWebRtcSidecar\.stop\(\)/);
  assert.match(index, /allowed: \["custom-webrtc", "gstreamer-webrtc"\]/);
});

test("GStreamer manager owns one exact process with demand start, last-listener stop and bounded recovery", () => {
  assert.match(manager, /private child: ChildProcess \| null/);
  assert.match(manager, /if \(this\.child\) return Promise\.resolve\(\)/);
  assert.match(manager, /if \(!this\.listeners\.has\(id\)\) this\.listeners\.add\(id\)/);
  assert.match(manager, /if \(!this\.listeners\.size\) await this\.stop\(\)/);
  assert.match(manager, /this\.consecutiveFailures <= 2/);
  assert.match(manager, /child\.pid === exactPid/);
  assert.doesNotMatch(manager, /taskkill|PowerShell|shell:\s*true/);
});

test("GStreamer pipeline is the proven single-resample 48 kHz stereo music path", () => {
  const gst = new MixxxGStreamerWebRtc(process.cwd()); const pipeline = gst.pipelineDescription();
  assert.match(pipeline, /wasapi2src/); assert.equal((pipeline.match(/audioresample/g) || []).length, 1);
  assert.match(pipeline, /rate=48000,channels=2/); assert.match(pipeline, /opusenc bitrate=128000 frame-size=20/);
  assert.match(pipeline, /max-size-time=200000000/); assert.match(pipeline, /webrtcsink/);
  assert.doesNotMatch(pipeline, /microphone|echo|noise|gain|speech|tcpclientsink|fdsink/);
});

test("GStreamer selection has no raw PCM or Node RTCAudioSource media handoff", () => {
  const route = index.slice(index.indexOf('url.pathname === "/api/dj/mixxx/master-stream/gstreamer/sessions"'), index.indexOf("const gstSessionMatch"));
  assert.doesNotMatch(route, /mixxxMasterStream\.attach|mixxxWebRtcSidecar\.sink|RTCAudioSource|\/audio/);
  assert.match(manager, /rawPcmHttpActive: false, nodeRtcAudioSourceActive: false/);
});

test("one persistent browser receiver owns one MediaStream and hidden HTMLAudioElement", () => {
  assert.equal((receiver.match(/document\.createElement\("audio"\)/g) || []).length, 1);
  assert.match(receiver, /this\.receiverIdentity/); assert.match(receiver, /if \(!this\.ws\) this\.connectSignalling/);
  assert.match(receiver, /if \(this\.audio\.srcObject !== this\.stream\)/);
  assert.match(receiver, /style\.display = "none"/); assert.doesNotMatch(receiver, /getUserMedia|AudioContext|AudioWorklet|button|toggle/);
  assert.match(controller, /if \(receiver\) return receiver/);
});

test("GStreamer browser follows the official role-implied producer list protocol", () => {
  assert.match(receiver, /message\.peers \|\| message\.producers/);
  assert.match(receiver, /producer\?\.id \|\| producer\?\.peerId/);
  assert.match(receiver, /startSession.*, peerId: producerId/);
  assert.doesNotMatch(receiver, /peers\.find\(value => value\.roles\?\.includes\("producer"\)/);
  assert.match(receiver, /handleSignal\(JSON\.parse\(event\.data\)\)\.catch/);
});

test("BRMedia retains authenticated same-origin signalling ownership and diagnostics", () => {
  assert.match(index, /requireM26SameOrigin\(req\)/); assert.match(index, /requireM26RequestedWith\(req\)/);
  assert.match(index, /m26GStreamerUpgradeTokens/); assert.match(index, /origin\.host\.toLowerCase\(\)/);
  assert.match(receiver, /selectedCandidatePair/); assert.match(receiver, /packetsReceived/); assert.match(receiver, /bytesReceived/);
  assert.match(receiver, /packetsLost/); assert.match(receiver, /jitter/); assert.match(receiver, /currentTime/);
});

test("fresh ICE evidence preserves both candidate directions, MID, ufrag, pair and transport state", () => {
  assert.match(receiver, /trace\.offer = safeSdp/); assert.match(receiver, /trace\.answer = safeSdp/);
  assert.match(receiver, /candidatesFromSdp\(message\.sdp, "gstreamer"\)/); assert.match(receiver, /candidatesFromSdp\(this\.pc\.localDescription, "safari"\)/);
  assert.match(receiver, /sdpMid/); assert.match(receiver, /sdpMLineIndex/); assert.match(receiver, /usernameFragment/);
  assert.match(receiver, /requestsSent/); assert.match(receiver, /responsesReceived/); assert.match(receiver, /selectedCandidatePairId/);
  assert.match(receiver, /dtlsState/); assert.match(receiver, /packetsSent/); assert.match(receiver, /packetsReceived/);
  assert.match(index, /m26IceEvidence/); assert.match(index, /firstReceivedAt/); assert.match(index, /sampleCount/);
});

test("candidate policy classifies deployment routes without rewriting addresses", () => {
  assert.equal(receiverApi.addressClass("127.0.0.1"), "loopback");
  assert.equal(receiverApi.addressClass("192.168.128.1"), "LAN IPv4");
  assert.equal(receiverApi.addressClass("100.90.10.20"), "Tailscale IPv4");
  assert.equal(receiverApi.addressClass("fd7a:115c:a1e0::42"), "Tailscale IPv6");
  assert.equal(receiverApi.addressClass("fe80::1"), "link-local");
  assert.equal(receiverApi.addressClass("host.local"), "mDNS");
  assert.doesNotMatch(receiver, /replace.*candidate|candidate.*replace/i);
});

test("SDP evidence retains media, MID and ICE ufrag but redacts ICE passwords", () => {
  const value = receiverApi.safeSdp({ type: "offer", sdp: "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:0\r\na=ice-ufrag:abc\r\na=ice-pwd:secret\r\n" });
  assert.match(value.sdp, /m=audio/); assert.match(value.sdp, /a=mid:0/); assert.match(value.sdp, /a=ice-ufrag:abc/);
  assert.doesNotMatch(value.sdp, /secret/); assert.match(value.sdp, /ice-pwd:\[redacted\]/);
});

test("diagnostic transport logging is bounded and credential-redacted", () => {
  assert.match(manager, /transportTrace\.length > 160/); assert.match(manager, /ice-pwd/); assert.match(manager, /\[redacted\]/);
  assert.match(manager, /GST_DEBUG: "webrtc\*:5,nice\*:5,dtls\*:5,srtp\*:5"/);
  assert.doesNotMatch(manager, /GST_DEBUG: "[^"]*\*:6/);
});

test("GStreamer lifecycle does not touch protected runner, SQLite, or production media", () => {
  assert.doesNotMatch(manager + receiver + controller, /brmedia-runner|sqlite|server\/data|production media/i);
});
