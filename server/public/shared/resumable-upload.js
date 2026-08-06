(function () {
  "use strict";

  const VERSION = "m21b-v1";
  const PLATFORM_NOTES = Object.freeze({
    ios:
      "Safari and installed PWAs may suspend uploads when backgrounded. Resume uses server-confirmed ranges and may require selecting the same File again.",
    android:
      "Chrome and installed PWAs may throttle or stop background work. Resume uses server-confirmed ranges and may require selecting the same File again.",
    baseline:
      "Standards-based File/Blob selection, Fetch, Blob.slice and AbortController are required; drag and drop is optional.",
  });
  const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

  class UploadClientError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "UploadClientError";
      this.code = options.code || "server-unavailable";
      this.retryable = options.retryable === true;
      this.status = Number(options.status) || 0;
    }
  }

  async function responsePayload(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new UploadClientError(
        payload.error || `Upload request failed (${response.status})`,
        {
          code: payload.code,
          retryable: payload.retryable === true || TRANSIENT_STATUS.has(response.status),
          status: response.status,
        }
      );
    }
    return payload;
  }

  function delay(milliseconds, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Upload aborted", "AbortError"));
        return;
      }
      const timer = window.setTimeout(resolve, milliseconds);
      signal?.addEventListener("abort", () => {
        window.clearTimeout(timer);
        reject(new DOMException("Upload aborted", "AbortError"));
      }, { once: true });
    });
  }

  class BRMediaResumableUpload {
    constructor(options = {}) {
      this.baseUrl = String(options.baseUrl || "/api/v1/uploads").replace(/\/+$/, "");
      this.fetchImpl = options.fetchImpl || window.fetch.bind(window);
      this.maxRetries = Math.max(0, Math.min(8, Number(options.maxRetries ?? 4)));
      this.retryBaseMs = Math.max(100, Math.min(5000, Number(options.retryBaseMs ?? 500)));
      this.onState = typeof options.onState === "function" ? options.onState : () => {};
      this.onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
      this.controller = null;
      this.session = null;
      this.token = "";
      this.file = null;
      this.state = "idle";
    }

    setState(state, detail = {}) {
      this.state = state;
      this.onState({ state, session: this.session, ...detail });
    }

    headers(extra = {}) {
      return {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...extra,
      };
    }

    async create(file, options = {}) {
      if (!(file instanceof Blob) || !Number.isFinite(file.size) || file.size <= 0) {
        throw new UploadClientError("Choose a non-empty file", { code: "invalid-size" });
      }
      this.file = file;
      this.controller = new AbortController();
      this.setState("creating");
      const response = await this.fetchImpl(this.baseUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        signal: this.controller.signal,
        body: JSON.stringify({
          filename: file.name || options.filename || "upload.bin",
          totalSize: file.size,
          mimeType: file.type || "",
          lastModified: Number(file.lastModified) || null,
          expectedHash: options.expectedHash || null,
          hashAlgorithm: options.expectedHash ? "sha256" : null,
          preferredChunkSize: options.preferredChunkSize || null,
        }),
      });
      const payload = await responsePayload(response);
      this.session = payload.session;
      this.token = payload.token;
      this.setState("paused");
      return this.snapshot();
    }

    restore({ session, token, file }) {
      if (!session?.id || !token) {
        throw new UploadClientError("Upload resume details are incomplete");
      }
      this.session = session;
      this.token = token;
      this.file = file || null;
      this.setState("paused");
      return this.snapshot();
    }

    async status() {
      if (!this.session?.id) throw new UploadClientError("Upload session is unavailable");
      const response = await this.fetchImpl(`${this.baseUrl}/${this.session.id}`, {
        credentials: "same-origin",
        headers: this.headers(),
        signal: this.controller?.signal,
      });
      const payload = await responsePayload(response);
      this.session = payload.session;
      return this.snapshot();
    }

    confirmedRanges() {
      return Array.isArray(this.session?.ranges) ? this.session.ranges : [];
    }

    rangeConfirmed(start, end) {
      return this.confirmedRanges().some((range) =>
        Number(range.start) <= start && Number(range.end) >= end
      );
    }

    async requestWithRetry(url, options) {
      let attempt = 0;
      while (true) {
        try {
          const response = await this.fetchImpl(url, options);
          return await responsePayload(response);
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          const retryable = error?.retryable === true || error instanceof TypeError;
          if (!retryable || attempt >= this.maxRetries) throw error;
          attempt += 1;
          this.setState("retrying", { attempt, error });
          await delay(this.retryBaseMs * (2 ** (attempt - 1)), options.signal);
        }
      }
    }

    async upload(file = this.file) {
      if (!(file instanceof Blob)) {
        throw new UploadClientError(
          "Select the original file again to resume this upload",
          { code: "file-required" }
        );
      }
      this.file = file;
      if (!this.session) await this.create(file);
      if (file.size !== Number(this.session.totalSize)) {
        throw new UploadClientError("Selected file size does not match this upload session");
      }
      this.controller = new AbortController();
      await this.status();
      this.setState("uploading");
      const chunkSize = Number(this.session.chunkSize);
      for (let start = 0; start < file.size; start += chunkSize) {
        const end = Math.min(file.size, start + chunkSize);
        if (this.rangeConfirmed(start, end)) continue;
        const chunk = file.slice(start, end);
        const payload = await this.requestWithRetry(
          `${this.baseUrl}/${this.session.id}/chunks/${start}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers: this.headers({ "Content-Type": "application/octet-stream" }),
            body: chunk,
            signal: this.controller.signal,
          }
        );
        this.session = payload.session;
        this.setState("uploading");
        this.onProgress({
          confirmedBytes: Number(this.session.receivedBytes) || 0,
          totalBytes: file.size,
          ratio: file.size ? (Number(this.session.receivedBytes) || 0) / file.size : 0,
        });
      }
      this.setState("paused");
      return this.snapshot();
    }

    pause() {
      this.controller?.abort();
      this.controller = null;
      if (this.state !== "cancelled") this.setState("paused");
    }

    async cancel() {
      this.controller?.abort();
      this.controller = new AbortController();
      if (!this.session?.id) {
        this.setState("cancelled");
        return this.snapshot();
      }
      const response = await this.fetchImpl(`${this.baseUrl}/${this.session.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: this.headers(),
        signal: this.controller.signal,
      });
      const payload = await responsePayload(response);
      this.session = payload.session;
      this.setState("cancelled");
      return this.snapshot();
    }

    async finalise() {
      if (!this.session?.id) throw new UploadClientError("Upload session is unavailable");
      this.controller = new AbortController();
      this.setState("finalising");
      try {
        const response = await this.fetchImpl(
          `${this.baseUrl}/${this.session.id}/finalise`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: this.headers(),
            signal: this.controller.signal,
          }
        );
        const payload = await responsePayload(response);
        this.session = payload.session;
        this.setState("completed-transfer");
        return this.snapshot();
      } catch (error) {
        if (error?.name === "AbortError") {
          this.setState("paused");
        } else {
          this.setState("failed", { error });
        }
        throw error;
      }
    }

    snapshot() {
      return {
        version: VERSION,
        state: this.state,
        session: this.session,
        token: this.token,
        requiresFileReselection: !this.file && this.state !== "completed-transfer",
      };
    }
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.resumableUploads = {
    VERSION,
    PLATFORM_NOTES,
    UploadClientError,
    BRMediaResumableUpload,
  };
})();
