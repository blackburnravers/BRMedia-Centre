(function (root, factory) {
  const api = factory(); if (typeof module === "object" && module.exports) module.exports = api; else root.BRMediaM26GStreamerReceiver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX_EVENTS = 96, MAX_CANDIDATES = 48;
  function now() { return new Date().toISOString(); }
  function boundedPush(values, value, limit = MAX_EVENTS) { values.push(value); if (values.length > limit) values.splice(0, values.length - limit); }
  function safeSdp(description) {
    if (!description?.sdp) return null;
    return { type: description.type, sdp: String(description.sdp).replace(/^a=ice-pwd:.*$/gmi, "a=ice-pwd:[redacted]").slice(0, 64 * 1024) };
  }
  function addressClass(address) {
    const value = String(address || "").toLowerCase();
    if (!value || value === "0.0.0.0" || value === "::") return "unusable/invalid";
    if (value === "localhost" || value === "::1" || /^127\./.test(value)) return "loopback";
    if (/^169\.254\./.test(value) || /^fe[89ab][0-9a-f]:/.test(value)) return "link-local";
    if (/^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./.test(value)) return "Tailscale IPv4";
    if (value.startsWith("fd7a:115c:a1e0:")) return "Tailscale IPv6";
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(value)) return "LAN IPv4";
    if (value.includes(":")) return value.startsWith("fe80:") ? "link-local" : "LAN IPv6";
    if (value.endsWith(".local")) return "mDNS";
    return "unusable/invalid";
  }
  function parseCandidateLine(value) {
    const text = String(value || "").replace(/^a=/, "");
    const parts = text.trim().split(/\s+/); if (!/^candidate:/i.test(parts[0] || "") || parts.length < 8) return {};
    const optional = {}; for (let index = 8; index + 1 < parts.length; index += 2) optional[parts[index]] = parts[index + 1];
    return { foundation: parts[0].slice("candidate:".length), component: Number(parts[1]), protocol: parts[2].toLowerCase(),
      priority: Number(parts[3]), address: parts[4], port: Number(parts[5]), type: optional.typ || null,
      relatedAddress: optional.raddr || null, relatedPort: optional.rport ? Number(optional.rport) : null,
      tcpType: optional.tcptype || null, generation: optional.generation ? Number(optional.generation) : null,
      networkCost: optional["network-cost"] ? Number(optional["network-cost"]) : null,
      usernameFragment: optional.ufrag || null };
  }
  function candidateDetail(candidate, origin, accepted = null, error = null) {
    if (!candidate) return null;
    const json = typeof candidate.toJSON === "function" ? candidate.toJSON() : candidate;
    const parsed = parseCandidateLine(json.candidate);
    return { at: now(), origin, candidate: String(json.candidate || "").slice(0, 2048), foundation: json.foundation || parsed.foundation || null,
      component: json.component || parsed.component || null, protocol: json.protocol || parsed.protocol || null, priority: json.priority ?? parsed.priority ?? null,
      address: json.address || parsed.address || null, port: json.port ?? parsed.port ?? null, type: json.type || parsed.type || null,
      relatedAddress: json.relatedAddress || parsed.relatedAddress || null, relatedPort: json.relatedPort ?? parsed.relatedPort ?? null, tcpType: json.tcpType || parsed.tcpType || null,
      sdpMid: json.sdpMid ?? null, sdpMLineIndex: json.sdpMLineIndex ?? null, usernameFragment: json.usernameFragment || parsed.usernameFragment || null,
      generation: json.generation ?? parsed.generation ?? null, networkCost: json.networkCost ?? parsed.networkCost ?? null,
      addressFamily: String(json.address || parsed.address || "").includes(":") ? "IPv6" : "IPv4", addressClass: addressClass(json.address || parsed.address),
      acceptedIntoRemotePeer: accepted, forwarded: false, error: error ? String(error).slice(0, 500) : null };
  }
  function candidatesFromSdp(description, origin) {
    const result = []; let mid = null, mLineIndex = -1, ufrag = null;
    for (const line of String(description?.sdp || "").split(/\r?\n/)) {
      if (line.startsWith("m=")) { mLineIndex += 1; mid = null; ufrag = null; }
      else if (line.startsWith("a=mid:")) mid = line.slice(6);
      else if (line.startsWith("a=ice-ufrag:")) ufrag = line.slice(12);
      else if (line.startsWith("a=candidate:")) { const detail = candidateDetail({ candidate: line.slice(2), sdpMid: mid,
          sdpMLineIndex: mLineIndex, usernameFragment: ufrag }, origin, origin === "gstreamer" ? true : null);
        if (detail) { detail.forwarded = true; result.push(detail); } }
    }
    return result.slice(0, MAX_CANDIDATES);
  }
  class GStreamerWebRtcReceiver {
    constructor() {
      this.pc = null; this.ws = null; this.session = null; this.sessionId = null; this.stream = null; this.track = null;
      this.backendActive = false; this.unlocked = false; this.state = "stopped"; this.lastError = null; this.listeners = new Set();
      this.signal = { welcome: false, listenerRegistered: false, producerId: null, sessionStarted: false,
        offerReceived: false, answerSent: false }; this.playResult = { attempted: 0, resolved: 0, rejected: 0, error: null };
      this.receiverIdentity = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; this.audioEvents = { playing: 0, waiting: 0, stalled: 0, error: 0 };
      this.trace = { createdAt: now(), page: { url: location.href.slice(0, 2048), host: location.host }, offer: null, answer: null,
        gstreamerCandidates: [], safariCandidates: [], transitions: [], signallingEvents: [], candidatePairs: [], transport: null };
      this.audio = document.createElement("audio"); this.audio.autoplay = true; this.audio.playsInline = true; this.audio.muted = false;
      this.audio.volume = 1; this.audio.setAttribute("aria-hidden", "true"); this.audio.style.display = "none"; document.body.appendChild(this.audio);
      Object.keys(this.audioEvents).forEach(name => this.audio.addEventListener(name, () => { this.audioEvents[name] += 1; this.emit(); }));
    }
    snapshot() { return Object.freeze({ state: this.state, connected: this.pc?.connectionState === "connected", outputAttached: Boolean(this.audio.srcObject),
      audioContextState: this.unlocked ? "running" : "suspended", peerConnectionState: this.pc?.connectionState || "closed",
      iceConnectionState: this.pc?.iceConnectionState || "closed", receiverIdentity: this.receiverIdentity, lastError: this.lastError }); }
    emit() { const value = this.snapshot(); this.listeners.forEach(fn => { try { fn(value); } catch {} }); return value; }
    subscribe(fn) { this.listeners.add(fn); fn(this.snapshot()); return () => this.listeners.delete(fn); }
    transition(state, error) { this.state = state; if (error) this.lastError = String(error?.message || error).slice(0, 500);
      boundedPush(this.trace.transitions, { at: now(), source: "receiver", state, error: error ? this.lastError : null }); return this.emit(); }
    backendChanged(active) { this.backendActive = active === true; if (!this.backendActive) this.stop(); return this.emit(); }
    unlockFromGesture() { this.unlocked = true; this.playResult.attempted += 1;
      return this.audio.play().then(() => { this.playResult.resolved += 1; this.playResult.error = null; return this.snapshot(); }, error => {
        this.playResult.rejected += 1; this.playResult.error = String(error?.message || error).slice(0, 300); return this.snapshot(); }); }
    async start(session) {
      this.session = session;
      if (!this.ws) this.connectSignalling(session.signallingEndpoint);
      if (!this.unlocked) return this.transition("waiting-for-user-gesture");
      if (this.audio.srcObject) await this.audio.play(); return this.transition(this.audio.srcObject ? "live" : "connecting");
    }
    connectSignalling(endpoint) {
      if (!endpoint?.startsWith("/api/dj/mixxx/master-stream/gstreamer/signalling?token=")) throw new Error("Invalid GStreamer signalling endpoint");
      const scheme = location.protocol === "https:" ? "wss:" : "ws:"; const ws = new WebSocket(`${scheme}//${location.host}${endpoint}`); this.ws = ws;
      ws.onopen = () => this.transition("connecting");
      ws.onmessage = event => { try { void this.handleSignal(JSON.parse(event.data)).catch(error => this.transition("recovering", error)); }
        catch (error) { this.transition("recovering", error); } };
      ws.onerror = () => this.transition("recovering", "GStreamer signalling failed");
      ws.onclose = () => { if (this.ws === ws && this.state !== "stopped") this.transition("recovering", "GStreamer signalling closed"); };
    }
    send(value) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(value)); }
    async handleSignal(message) {
      boundedPush(this.trace.signallingEvents, { at: now(), direction: "gstreamer-to-safari", type: message.type,
        hasSdp: Boolean(message.sdp), hasIce: Boolean(message.ice), sessionId: message.sessionId || null });
      if (message.type === "welcome") { this.signal.welcome = true;
        return this.send({ type: "setPeerStatus", roles: ["listener"], meta: { name: `brmedia-browser-${this.receiverIdentity}` } }); }
      if (message.type === "peerStatusChanged" && message.roles?.includes("listener")) { this.signal.listenerRegistered = true; return this.send({ type: "list" }); }
      if (message.type === "list" || message.type === "peerList") {
        const peers = message.peers || message.producers || [];
        // The official gstwebrtc-api `list` response places producer objects in
        // `producers`; roles are implied and are not repeated on each object.
        const producer = peers.find(value => value?.meta?.name === "brmedia-mixxx-master" || value?.meta?.meta?.name === "brmedia-mixxx-master") || peers.find(value => typeof (value?.id || value?.peerId) === "string");
        const producerId = producer?.id || producer?.peerId || null; this.signal.producerId = producerId;
        if (producerId && !this.sessionId) this.send({ type: "startSession", peerId: producerId }); return;
      }
      if (message.type === "peerAdded" && message.roles?.includes("producer") && !this.sessionId) return this.send({ type: "startSession", peerId: message.id });
      if (message.type === "sessionStarted") { this.sessionId = message.sessionId; this.signal.sessionStarted = true; return; }
      if (message.type !== "peer") return;
      if (!this.pc) this.createPeer(); this.sessionId = message.sessionId || this.sessionId;
      if (message.sdp) { if (message.sdp.type === "offer") { this.signal.offerReceived = true; this.trace.offer = safeSdp(message.sdp);
          this.trace.gstreamerCandidates = candidatesFromSdp(message.sdp, "gstreamer"); }
        await this.pc.setRemoteDescription(message.sdp); if (message.sdp.type === "offer") {
          await this.pc.setLocalDescription(await this.pc.createAnswer()); this.signal.answerSent = true; this.trace.answer = safeSdp(this.pc.localDescription);
          this.trace.safariCandidates = candidatesFromSdp(this.pc.localDescription, "safari");
          this.send({ type: "peer", sessionId: this.sessionId, sdp: this.pc.localDescription.toJSON() }); } }
      if (message.ice) { const detail = candidateDetail(message.ice, "gstreamer", false); try { await this.pc.addIceCandidate(message.ice); detail.acceptedIntoRemotePeer = true; }
        catch (error) { detail.error = String(error?.message || error).slice(0, 500); throw error; }
        boundedPush(this.trace.gstreamerCandidates, detail, MAX_CANDIDATES); }
    }
    createPeer() {
      const pc = new RTCPeerConnection({ iceServers: [], bundlePolicy: "max-bundle" }); this.pc = pc;
      const recordState = source => boundedPush(this.trace.transitions, { at: now(), source, iceGatheringState: pc.iceGatheringState,
        iceConnectionState: pc.iceConnectionState, connectionState: pc.connectionState, signallingState: pc.signalingState });
      pc.onicegatheringstatechange = () => { recordState("ice-gathering"); this.emit(); };
      pc.oniceconnectionstatechange = () => { recordState("ice-connection"); this.emit(); };
      pc.onsignalingstatechange = () => recordState("signalling");
      pc.onicecandidateerror = event => boundedPush(this.trace.transitions, { at: now(), source: "ice-candidate-error", address: event.address || null,
        port: event.port || null, url: event.url || null, errorCode: event.errorCode || null, errorText: event.errorText || null });
      pc.onicecandidate = event => { if (event.candidate) { const detail = candidateDetail(event.candidate, "safari", null); detail.forwarded = true;
          boundedPush(this.trace.safariCandidates, detail, MAX_CANDIDATES);
          this.send({ type: "peer", sessionId: this.sessionId, ice: event.candidate.toJSON() }); }
        else boundedPush(this.trace.transitions, { at: now(), source: "ice-gathering-complete" }); };
      pc.onconnectionstatechange = () => { recordState("peer-connection"); if (pc.connectionState === "connected") this.transition(this.unlocked ? "live" : "waiting-for-user-gesture");
        else if (["failed", "disconnected"].includes(pc.connectionState)) this.transition("recovering", `WebRTC ${pc.connectionState}`); };
      pc.ontrack = event => { this.track = event.track; this.stream = event.streams?.[0] || new MediaStream([event.track]);
        if (this.audio.srcObject !== this.stream) this.audio.srcObject = this.stream; if (this.unlocked) void this.audio.play().then(() => this.transition("live"), error => this.transition("waiting-for-user-gesture", error)); };
    }
    visibilityChanged(visible) { if (visible && this.unlocked && this.audio.srcObject && this.audio.paused) void this.audio.play().catch(() => {}); }
    stop() { const ws = this.ws; this.ws = null; try { ws?.close(); } catch {} const pc = this.pc; this.pc = null;
      try { pc?.getTransceivers().forEach(value => value.stop()); } catch {} try { pc?.close(); } catch {}
      this.sessionId = null; this.stream = null; this.track = null; this.audio.pause(); this.audio.srcObject = null; return this.transition("stopped"); }
    async diagnostics() {
      const result = { browser: { receiverIdentity: this.receiverIdentity, sessionId: this.session?.id || null, listenerId: this.sessionId }, trace: this.trace,
        signalling: { ...this.signal }, peer: { connectionState: this.pc?.connectionState || "closed", iceGatheringState: this.pc?.iceGatheringState || "new",
        iceConnectionState: this.pc?.iceConnectionState || "closed", selectedCandidatePair: null }, incoming: { trackReceived: Boolean(this.track), stats: null },
        audio: { receiverElementCount: 1, srcObjectAttached: Boolean(this.audio.srcObject), paused: this.audio.paused, currentTime: this.audio.currentTime,
          play: { ...this.playResult }, events: { ...this.audioEvents } }, lastError: this.lastError };
      if (!this.pc) return result; const reports = await this.pc.getStats(); let inbound, outbound, pair, transport;
      reports.forEach(report => { if (report.type === "inbound-rtp" && report.kind === "audio") inbound = report;
        if (report.type === "outbound-rtp" && report.kind === "audio") outbound = report;
        if (report.type === "candidate-pair") boundedPush(this.trace.candidatePairs, { at: now(), id: report.id, state: report.state,
          nominated: report.nominated, writable: report.writable, requestsSent: report.requestsSent, responsesReceived: report.responsesReceived,
          requestsReceived: report.requestsReceived, responsesSent: report.responsesSent, consentRequestsSent: report.consentRequestsSent,
          bytesSent: report.bytesSent, bytesReceived: report.bytesReceived, currentRoundTripTime: report.currentRoundTripTime,
          localCandidateId: report.localCandidateId, remoteCandidateId: report.remoteCandidateId }, MAX_CANDIDATES);
        if (report.type === "transport") { transport = report; if (report.selectedCandidatePairId) pair = reports.get(report.selectedCandidatePairId); } });
      this.trace.transport = transport ? { at: now(), dtlsState: transport.dtlsState || null, iceRole: transport.iceRole || null,
        selectedCandidatePairId: transport.selectedCandidatePairId || null, bytesSent: transport.bytesSent, bytesReceived: transport.bytesReceived,
        packetsSent: transport.packetsSent, packetsReceived: transport.packetsReceived } : null;
      if (pair) result.peer.selectedCandidatePair = { state: pair.state, local: reports.get(pair.localCandidateId), remote: reports.get(pair.remoteCandidateId) };
      if (inbound) result.incoming.stats = { packetsReceived: inbound.packetsReceived, bytesReceived: inbound.bytesReceived, packetsLost: inbound.packetsLost,
        jitter: inbound.jitter, totalAudioEnergy: inbound.totalAudioEnergy, audioLevel: inbound.audioLevel, concealedSamples: inbound.concealedSamples,
        totalSamplesReceived: inbound.totalSamplesReceived };
      result.outbound = outbound ? { packetsSent: outbound.packetsSent, bytesSent: outbound.bytesSent } : null;
      return result;
    }
  }
  return Object.freeze({ GStreamerWebRtcReceiver, addressClass, candidateDetail, candidatesFromSdp, parseCandidateLine, safeSdp });
});
