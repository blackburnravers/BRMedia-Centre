(function (root, factory) {
  const api = factory(); if (typeof module === "object" && module.exports) module.exports = api; else root.BRMediaM26WebRtcReceiver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const waitForIce = (pc, timeoutMs = 2500) => new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timer = setTimeout(done, timeoutMs);
    function changed() { if (pc.iceGatheringState === "complete") done(); }
    function done() { clearTimeout(timer); pc.removeEventListener("icegatheringstatechange", changed); resolve(); }
    pc.addEventListener("icegatheringstatechange", changed);
  });
  class WebRtcReceiver {
    constructor() {
      this.pc = null; this.session = null; this.stream = null; this.unlocked = false; this.backendActive = false;
      this.state = "stopped"; this.lastError = null; this.listeners = new Set();
      this.track = null; this.trackEvents = { mute: 0, unmute: 0, ended: 0 }; this.audioEvents = { playing: 0, waiting: 0, stalled: 0, error: 0 };
      this.playAttempts = 0; this.playResolved = 0; this.playRejected = 0; this.lastPlayResult = null; this.lastGestureAt = 0; this.ontrackFired = false;
      this.audio = document.createElement("audio"); this.audio.autoplay = true; this.audio.playsInline = true;
      this.audio.muted = false; this.audio.volume = 1; this.audio.setAttribute("aria-hidden", "true"); this.audio.style.display = "none"; document.body.appendChild(this.audio);
      ["playing", "waiting", "stalled", "error"].forEach(name => this.audio.addEventListener(name, () => { this.audioEvents[name] += 1; this.emit(); }));
    }
    snapshot() { return Object.freeze({ state: this.state, connected: Boolean(this.pc && ["connected", "connecting"].includes(this.pc.connectionState)),
      outputAttached: Boolean(this.audio.srcObject), audioContextState: this.unlocked ? "running" : "suspended",
      framesReceived: null, nonSilentFramesReceived: null, sourcePeak: null, bufferedFrames: null,
      staleFramesDropped: null, captureToReceiveMs: null, lastError: this.lastError,
      peerConnectionState: this.pc?.connectionState || "closed", iceConnectionState: this.pc?.iceConnectionState || "closed" }); }
    emit() { const value = this.snapshot(); this.listeners.forEach(listener => { try { listener(value); } catch {} }); return value; }
    subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
    transition(state, error) { this.state = state; if (error) this.lastError = String(error?.message || error).slice(0, 240); return this.emit(); }
    backendChanged(active) { this.backendActive = active === true; if (!this.backendActive) this.stop(); return this.emit(); }
    async createOffer() {
      this.closePeer(); const pc = new RTCPeerConnection({ iceServers: [] }); this.pc = pc;
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.ontrack = event => { this.ontrackFired = true; this.track = event.track; this.trackEvents = { mute: 0, unmute: 0, ended: 0 };
        ["mute", "unmute", "ended"].forEach(name => event.track.addEventListener(name, () => { this.trackEvents[name] += 1; this.emit(); }));
        this.stream = event.streams?.[0] || new MediaStream([event.track]); this.audio.srcObject = this.stream;
        if (this.unlocked) void this.attemptPlay("ontrack"); else this.transition("waiting-for-user-gesture"); };
      pc.onconnectionstatechange = () => { if (pc !== this.pc) return; if (pc.connectionState === "connected" && this.unlocked) this.transition("live");
        else if (["failed", "disconnected"].includes(pc.connectionState)) this.transition("recovering", `WebRTC ${pc.connectionState}`); };
      await pc.setLocalDescription(await pc.createOffer()); await waitForIce(pc); return { type: pc.localDescription.type, sdp: pc.localDescription.sdp };
    }
    async acceptAnswer(session) { if (!this.pc || !session?.answer) throw new Error("WebRTC offer is not prepared"); this.session = session;
      await this.pc.setRemoteDescription(session.answer); return this.transition("connecting"); }
    attemptPlay(reason) { this.audio.muted = false; this.audio.volume = 1; this.audio.playsInline = true; this.playAttempts += 1;
      let result; try { result = this.audio.play(); } catch (error) { this.playRejected += 1; this.lastPlayResult = { reason, resolved: false, name: error?.name, message: String(error?.message || error) }; this.transition("waiting-for-user-gesture", error); return Promise.reject(error); }
      return Promise.resolve(result).then(() => { this.playResolved += 1; this.lastPlayResult = { reason, resolved: true, at: Date.now() }; this.transition(this.audio.srcObject ? "live" : "connecting"); return this.snapshot(); }, error => {
        this.playRejected += 1; this.lastPlayResult = { reason, resolved: false, name: error?.name, message: String(error?.message || error), at: Date.now() }; this.transition("waiting-for-user-gesture", error); throw error; }); }
    unlockFromGesture() { this.unlocked = true; this.lastGestureAt = Date.now(); return this.attemptPlay("existing-user-gesture").catch(() => this.snapshot()); }
    async start(session) { this.session = session || this.session; if (!this.unlocked) return this.transition("waiting-for-user-gesture");
      if (this.audio.srcObject) { if (this.audio.paused) await this.attemptPlay("session-start"); return this.transition("live"); } return this.transition("connecting"); }
    visibilityChanged(visible) { if (visible && this.unlocked && this.audio.srcObject && this.audio.paused) void this.audio.play().catch(error => this.transition("waiting-for-user-gesture", error)); }
    closePeer() { const pc = this.pc; this.pc = null; if (pc) { pc.ontrack = null; pc.onconnectionstatechange = null;
      try { pc.getReceivers().forEach(receiver => receiver.track?.stop()); } catch {} try { pc.getTransceivers().forEach(value => value.stop()); } catch {} try { pc.close(); } catch {} }
      this.stream = null; this.audio.pause(); this.audio.srcObject = null; }
    stop() { this.session = null; this.closePeer(); return this.transition("stopped"); }
    async diagnostics() {
      const result = { browser: { userAgent: navigator.userAgent, mode: navigator.standalone === true ? "pwa" : (matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser"),
        pageUrl: location.href, protocol: location.protocol, isSecureContext: window.isSecureContext, visibilityState: document.visibilityState,
        sessionId: this.session?.id || null, lastGestureAt: this.lastGestureAt }, peer: { connectionState: this.pc?.connectionState || "closed",
        iceConnectionState: this.pc?.iceConnectionState || "closed", iceGatheringState: this.pc?.iceGatheringState || "new", signalingState: this.pc?.signalingState || "closed",
        localDescriptionType: this.pc?.localDescription?.type || null, remoteDescriptionType: this.pc?.remoteDescription?.type || null,
        transceivers: this.pc ? this.pc.getTransceivers().map(value => ({ direction: value.direction, currentDirection: value.currentDirection, mid: value.mid })) : [], selectedCandidatePair: null, codec: null },
        incoming: { ontrackFired: this.ontrackFired, streamCount: this.stream ? 1 : 0, audioTrackCount: this.stream?.getAudioTracks?.().length || 0,
          track: this.track ? { id: this.track.id, kind: this.track.kind, enabled: this.track.enabled, muted: this.track.muted, readyState: this.track.readyState, events: { ...this.trackEvents } } : null,
          stats: null }, audio: { elementCount: document.querySelectorAll("audio").length, receiverElementCount: 1, srcObjectAttached: Boolean(this.audio.srcObject),
          srcObjectAudioTracks: this.audio.srcObject?.getAudioTracks?.().length || 0, autoplay: this.audio.autoplay, playsInline: this.audio.playsInline,
          paused: this.audio.paused, muted: this.audio.muted, volume: this.audio.volume, readyState: this.audio.readyState, networkState: this.audio.networkState,
          currentTime: this.audio.currentTime, playAttempts: this.playAttempts, playResolved: this.playResolved, playRejected: this.playRejected,
          lastPlayResult: this.lastPlayResult, events: { ...this.audioEvents } }, webAudio: { involved: false } };
      if (!this.pc) return result;
      const reports = await this.pc.getStats(); let inbound = null, pair = null, local = null, remote = null, codec = null;
      reports.forEach(report => { if (report.type === "inbound-rtp" && report.kind === "audio" && !report.isRemote) inbound = report;
        if (report.type === "transport" && report.selectedCandidatePairId) pair = reports.get(report.selectedCandidatePairId) || pair; });
      if (!pair) reports.forEach(report => { if (report.type === "candidate-pair" && (report.selected || (report.nominated && report.state === "succeeded"))) pair = report; });
      if (pair) { local = reports.get(pair.localCandidateId); remote = reports.get(pair.remoteCandidateId); result.peer.selectedCandidatePair = { state: pair.state, nominated: pair.nominated,
        local: local ? { candidateType: local.candidateType, address: local.address || local.ip, protocol: local.protocol, port: local.port } : null,
        remote: remote ? { candidateType: remote.candidateType, address: remote.address || remote.ip, protocol: remote.protocol, port: remote.port } : null }; }
      if (inbound?.codecId) codec = reports.get(inbound.codecId); if (codec) result.peer.codec = { id: codec.id, mimeType: codec.mimeType, clockRate: codec.clockRate, channels: codec.channels, sdpFmtpLine: codec.sdpFmtpLine };
      if (inbound) result.incoming.stats = { packetsReceived: inbound.packetsReceived, bytesReceived: inbound.bytesReceived, packetsLost: inbound.packetsLost, jitter: inbound.jitter,
        audioLevel: inbound.audioLevel, totalAudioEnergy: inbound.totalAudioEnergy, totalSamplesReceived: inbound.totalSamplesReceived,
        concealedSamples: inbound.concealedSamples, silentConcealedSamples: inbound.silentConcealedSamples,
        jitterBufferDelay: inbound.jitterBufferDelay, jitterBufferEmittedCount: inbound.jitterBufferEmittedCount, codecId: inbound.codecId };
      return result;
    }
  }
  return Object.freeze({ WebRtcReceiver, waitForIce });
});
