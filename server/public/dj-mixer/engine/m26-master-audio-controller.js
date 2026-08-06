(() => {
  "use strict";
  let receiver = null, session = null;
  let backendActive = document.documentElement.dataset.djBackend === "mixxx";
  let lastError = null, serverAvailable = false, actionPending = false, gesturePending = false, sessionPromise = null;
  let telemetryBusy = false, heartbeatBusy = false, webRtcAvailable = false;
  let effectiveTransport = null;
  const browserOwnerToken = (() => {
    const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  })();
  const headers = () => ({ "X-BRMedia-Requested-With": "dj-mixer-m26", "X-BRMedia-DJ-Session": browserOwnerToken });

  async function refreshAvailability() {
    if (!backendActive) { serverAvailable = false; return false; }
    try {
      const response = await fetch("/api/dj/mixxx/master-stream/status", { credentials: "same-origin", cache: "no-store", headers: headers() });
      const payload = await response.json().catch(() => ({}));
      effectiveTransport = payload?.mediaTransport?.effective || "custom-webrtc";
      webRtcAvailable = effectiveTransport === "gstreamer-webrtc" ? Boolean(payload?.mediaTransport?.gstreamerWebRtc?.supported) : Boolean(payload?.webRtcSidecar?.supported);
      serverAvailable = Boolean(response.ok && payload?.mixxxReady && webRtcAvailable && (effectiveTransport === "gstreamer-webrtc" || (payload?.capture?.supported && payload?.stream?.supported)));
    } catch { serverAvailable = false; }
    return serverAvailable;
  }

  function ensureReceiver() {
    if (receiver) return receiver;
    const GStreamerReceiver = window.BRMediaM26GStreamerReceiver?.GStreamerWebRtcReceiver;
    if (effectiveTransport === "gstreamer-webrtc" && GStreamerReceiver) {
      receiver = new GStreamerReceiver(); receiver.backendChanged(backendActive);
      receiver.subscribe((detail) => { window.dispatchEvent(new CustomEvent("brmedia:m26-master-audio-state", { detail })); void publishTelemetry();
        if (["failed", "closed"].includes(detail.peerConnectionState)) void prepareAutomaticSession(); });
      return receiver;
    }
    const WebRtcReceiver = window.BRMediaM26WebRtcReceiver?.WebRtcReceiver;
    if (webRtcAvailable && WebRtcReceiver) {
      receiver = new WebRtcReceiver(); receiver.backendChanged(backendActive);
      receiver.subscribe((detail) => { window.dispatchEvent(new CustomEvent("brmedia:m26-master-audio-state", { detail })); void publishTelemetry(); });
      return receiver;
    }
    const Engine = window.BRMediaDjAudioEngine, Receiver = window.BRMediaM26MasterReceiver?.MasterReceiver;
    const Transport = window.BRMediaM26PcmHttpTransport;
    if (!Engine?.getEngine || !Receiver || !Transport?.createHttpTransport) throw new Error("Mixxx master audio receiver is unavailable");
    receiver = new Receiver({ audioContext: Engine.getEngine().context,
      workletUrl: "/dj-mixer/engine/m26-pcm-player-worklet.js?v=20260803-m26-audio",
      createTransport: (value, handlers) => Transport.createHttpTransport(value, handlers), maxBufferedMs: 250, maxFrameAgeMs: 750 });
    receiver.backendChanged(backendActive);
    receiver.subscribe((detail) => { window.dispatchEvent(new CustomEvent("brmedia:m26-master-audio-state", { detail })); void publishTelemetry(); });
    return receiver;
  }

  async function createSession() {
    const activeReceiver = ensureReceiver();
    if (effectiveTransport === "gstreamer-webrtc") {
      const response = await fetch("/api/dj/mixxx/master-stream/gstreamer/sessions", { method: "POST", credentials: "same-origin", cache: "no-store", headers: headers() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.session?.token || !payload?.session?.signallingEndpoint) throw new Error(payload.error || `GStreamer session failed (${response.status})`);
      return payload.session;
    }
    const offer = typeof activeReceiver.createOffer === "function" ? await activeReceiver.createOffer() : null;
    const endpoint = offer ? "/api/dj/mixxx/master-stream/webrtc/sessions" : "/api/dj/mixxx/master-stream/sessions";
    const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { ...headers(), ...(offer ? { "Content-Type": "application/json" } : {}) }, body: offer ? JSON.stringify({ offer }) : undefined });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.session?.token || (!payload?.session?.endpoint && !payload?.session?.answer)) throw new Error(payload.error || `Master audio session failed (${response.status})`);
    if (payload.session.transport === "webrtc") await activeReceiver.acceptAnswer(payload.session);
    return payload.session;
  }
  function ensureSession() {
    if (session) return Promise.resolve(session); if (sessionPromise) return sessionPromise;
    sessionPromise = createSession().then((value) => { if (!backendActive) { void deleteSession(value); throw new Error("Mixxx Backend became inactive"); } session = value; return value; })
      .finally(() => { sessionPromise = null; });
    return sessionPromise;
  }
  function peerNeedsReplacement() {
    if (!["webrtc", "gstreamer-webrtc"].includes(session?.transport)) return false;
    return ["failed", "closed"].includes(receiver?.snapshot?.().peerConnectionState);
  }
  async function discardFailedSession() {
    if (!session || !peerNeedsReplacement()) return;
    const previous = session; session = null;
    receiver?.stop?.();
    if (previous.transport === "gstreamer-webrtc" && backendActive) {
      try {
        // Acquire the replacement listener before releasing the failed one so
        // last-listener cleanup cannot stop a healthy GStreamer pipeline.
        session = await createSession();
      } catch (error) {
        await deleteSession(previous);
        throw error;
      }
    }
    await deleteSession(previous);
  }
  async function deleteSession(value = session) {
    if (!value?.id) return;
    const base = value.transport === "gstreamer-webrtc" ? "/api/dj/mixxx/master-stream/gstreamer/sessions" : value.transport === "webrtc" ? "/api/dj/mixxx/master-stream/webrtc/sessions" : "/api/dj/mixxx/master-stream/sessions";
    await fetch(`${base}/${encodeURIComponent(value.id)}`, { method: "DELETE", credentials: "same-origin", cache: "no-store", keepalive: true, headers: headers() }).catch(() => {});
  }
  async function publishHeartbeat() {
    if (heartbeatBusy || !session?.id || !session?.token) return;
    heartbeatBusy = true;
    const detail = receiver?.snapshot?.() || {};
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 5_000);
    try {
      await fetch(`/api/dj/mixxx/master-stream/sessions/${encodeURIComponent(session.id)}/telemetry`, {
        method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: { ...headers(), Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ heartbeat: true, pageVisible: !document.hidden, state: detail.state,
          transportConnected: detail.connected, audioContextState: detail.audioContextState,
          framesReceived: detail.framesReceived, nonSilentFramesReceived: detail.nonSilentFramesReceived,
          sourcePeak: detail.sourcePeak, outputAttached: detail.outputAttached, lastError: detail.lastError }),
      });
    } catch {} finally { window.clearTimeout(timeout); heartbeatBusy = false; }
  }
  async function publishTelemetry() {
    if (telemetryBusy) return;
    telemetryBusy = true; const detail = receiver?.snapshot?.() || {};
    try {
      const diagnostic = typeof receiver?.diagnostics === "function" ? await receiver.diagnostics() : { legacy: detail };
      await fetch("/api/dj/mixxx/master-stream/webrtc/client-telemetry", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(diagnostic) });
    } catch {} finally { telemetryBusy = false; }
  }
  async function startFromGesture(unlockPromise = null) {
    if (!backendActive) throw new Error("Mixxx Backend is not active");
    const activeReceiver = ensureReceiver();
    if (activeReceiver.snapshot().audioContextState !== "running") {
      await (unlockPromise || activeReceiver.unlockFromGesture());
    }
    if (peerNeedsReplacement()) await discardFailedSession();
    if (!session) {
      if (!(serverAvailable || await refreshAvailability())) throw new Error("Mixxx master audio is unavailable");
      session = await ensureSession();
    }
    lastError = null; await activeReceiver.start(session);
    return activeReceiver.snapshot();
  }
  async function prepareAutomaticSession() {
    if (!backendActive || actionPending || (session && !peerNeedsReplacement())) return snapshot();
    if (!(serverAvailable || await refreshAvailability())) return snapshot();
    actionPending = true;
    try { await discardFailedSession(); session = await ensureSession(); lastError = null; void publishHeartbeat();
      if (receiver?.snapshot?.().audioContextState === "running") await receiver.start(session); }
    catch (error) { lastError = String(error?.message || error); session = null; }
    finally { actionPending = false; }
    return snapshot();
  }
  function activateFromExistingGesture(event) {
    if (!backendActive || gesturePending || event?.isTrusted === false) return;
    const target = event?.target;
    if (!(target instanceof Element) || !target.closest("button, a, input, select, [role='button'], canvas")) return;
    const detail = receiver?.snapshot?.();
    if (session && !peerNeedsReplacement() && detail?.audioContextState === "running" && detail?.outputAttached) return;
    gesturePending = true; lastError = null;
    const activeReceiver = ensureReceiver();
    const unlockPromise = activeReceiver.snapshot().audioContextState === "running" ? null : activeReceiver.unlockFromGesture();
    void startFromGesture(unlockPromise).catch(async (error) => { lastError = String(error?.message || error); await stop().catch(() => {}); })
      .finally(() => { gesturePending = false; });
  }
  async function stop() { const previous = session; session = null; receiver?.stop?.(); await deleteSession(previous); return snapshot(); }
  function snapshot() {
    const engine = window.BRMediaDjAudioEngine?.getEngine?.();
    return Object.freeze({ supported: Boolean(window.BRMediaM26GStreamerReceiver || (window.BRMediaM26MasterReceiver && window.BRMediaM26PcmHttpTransport && (window.AudioWorkletNode || engine?.context?.createScriptProcessor))),
      effectiveTransport, backendActive, sessionActive: Boolean(session), lastError, receiver: receiver?.snapshot?.() || { state: "stopped" } });
  }
  window.addEventListener("brmedia:dj-backend-state", (event) => {
    backendActive = event.detail?.effectiveBackend === "mixxx"; if (receiver) receiver.backendChanged(backendActive);
    if (!backendActive && session) { const previous = session; session = null; void deleteSession(previous); }
    if (backendActive) void prepareAutomaticSession(); else serverAvailable = false;
  });
  document.addEventListener("visibilitychange", () => { receiver?.visibilityChanged?.(!document.hidden); if (!document.hidden) void prepareAutomaticSession(); });
  window.addEventListener("pageshow", () => { receiver?.visibilityChanged?.(true); void prepareAutomaticSession(); });
  window.addEventListener("online", () => { receiver?.visibilityChanged?.(true); void prepareAutomaticSession(); });
  window.addEventListener("pagehide", (event) => { if (event.persisted || !session) return; const previous = session; session = null; receiver?.stop?.(); void deleteSession(previous); });
  document.addEventListener("click", activateFromExistingGesture, { capture: true, passive: true });
  document.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") activateFromExistingGesture(event); }, { capture: true });
  if (backendActive) void prepareAutomaticSession();
  window.setInterval(() => { void publishHeartbeat(); if (!document.hidden) void publishTelemetry(); }, 2_000);
  window.BRMediaMixxxMasterAudio = Object.freeze({ startFromGesture, stop, snapshot, prepareAutomaticSession });
})();
