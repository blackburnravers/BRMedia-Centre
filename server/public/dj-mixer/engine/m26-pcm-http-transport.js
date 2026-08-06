(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BRMediaM26PcmHttpTransport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PREAMBLE_BYTES = 24;
  const FRAME_HEADER_BYTES = 24;
  const MAX_PAYLOAD_BYTES = 65536;
  const MAX_BUFFER_BYTES = MAX_PAYLOAD_BYTES + (FRAME_HEADER_BYTES * 2);
  const text = (bytes, offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));

  class PcmStreamParser {
    constructor(onFrame) {
      this.onFrame = onFrame;
      this.buffer = new Uint8Array(0);
      this.preamble = null;
    }

    append(chunk) {
      if (!(chunk instanceof Uint8Array)) chunk = new Uint8Array(chunk || 0);
      if (!chunk.length) return;
      if (this.buffer.length + chunk.length > MAX_BUFFER_BYTES) throw new Error("PCM stream buffer limit exceeded");
      const joined = new Uint8Array(this.buffer.length + chunk.length);
      joined.set(this.buffer); joined.set(chunk, this.buffer.length); this.buffer = joined;
      this.parse();
    }

    parse() {
      if (!this.preamble) {
        if (this.buffer.length < PREAMBLE_BYTES) return;
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, PREAMBLE_BYTES);
        if (text(this.buffer, 0, 8) !== "BRM26PCM" || view.getUint16(8, true) !== 1
          || view.getUint16(10, true) !== PREAMBLE_BYTES) throw new Error("Invalid PCM stream preamble");
        const sampleRate = view.getUint32(12, true);
        const channels = view.getUint16(16, true);
        const format = view.getUint16(18, true);
        const nominalFrameSamples = view.getUint32(20, true);
        if (sampleRate < 8000 || sampleRate > 192000 || (channels !== 1 && channels !== 2)
          || format !== 1 || nominalFrameSamples < 1 || nominalFrameSamples > 8192) {
          throw new Error("Unsupported PCM stream format");
        }
        this.preamble = Object.freeze({ sampleRate, channels, format: "s16le", nominalFrameSamples });
        this.buffer = this.buffer.slice(PREAMBLE_BYTES);
      }
      while (this.buffer.length >= FRAME_HEADER_BYTES) {
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        if (text(this.buffer, 0, 4) !== "M26F") throw new Error("Invalid PCM frame marker");
        const sequence = view.getUint32(4, true);
        const captureTimestampMs = view.getFloat64(8, true);
        const payloadBytes = view.getUint32(16, true);
        const flags = view.getUint16(20, true);
        if (!payloadBytes || payloadBytes > MAX_PAYLOAD_BYTES || payloadBytes % (2 * this.preamble.channels)) {
          throw new Error("Invalid PCM frame payload size");
        }
        if (this.buffer.length < FRAME_HEADER_BYTES + payloadBytes) return;
        const payload = this.buffer.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + payloadBytes);
        const samples = new Float32Array(payloadBytes / 2);
        const pcmView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
        for (let index = 0; index < samples.length; index += 1) samples[index] = pcmView.getInt16(index * 2, true) / 32768;
        this.onFrame?.({
          sequence, captureTimestampMs, flags, pcm: samples,
          sampleRate: this.preamble.sampleRate, channels: this.preamble.channels,
        });
        this.buffer = this.buffer.slice(FRAME_HEADER_BYTES + payloadBytes);
      }
    }
  }

  function createHttpTransport(options = {}, handlers = {}) {
    const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    if (!fetchImpl) throw new Error("Fetch streaming is unavailable");
    const endpoint = String(options.endpoint || "");
    const token = String(options.token || "");
    if (!endpoint.startsWith("/api/dj/mixxx/master-stream/") || !token || token.length > 512) {
      throw new Error("Invalid authenticated PCM stream session");
    }
    let controller = null;
    let reader = null;
    let closed = false;
    return {
      async connect() {
        controller = new AbortController();
        const response = await fetchImpl(endpoint, {
          method: "GET", credentials: "same-origin", cache: "no-store", signal: controller.signal,
          headers: { Accept: "application/vnd.brmedia.pcm", Authorization: `Bearer ${token}` },
        });
        if (!response?.ok || !response.body?.getReader) throw new Error(`PCM stream request failed (${response?.status || 0})`);
        handlers.open?.();
        const parser = new PcmStreamParser((frame) => handlers.frame?.(frame));
        reader = response.body.getReader();
        void (async () => {
          try {
            while (!closed) {
              const result = await reader.read();
              if (result.done) break;
              parser.append(result.value);
            }
            if (!closed) handlers.close?.("PCM stream ended");
          } catch (error) {
            if (!closed && error?.name !== "AbortError") handlers.error?.(error);
          }
        })();
      },
      close() {
        closed = true;
        try { controller?.abort(); } catch {}
        try { void reader?.cancel(); } catch {}
      },
    };
  }

  return Object.freeze({ PcmStreamParser, createHttpTransport, PREAMBLE_BYTES, FRAME_HEADER_BYTES, MAX_PAYLOAD_BYTES });
});
