(() => {
  "use strict";

  const CACHE_NAME =
    "brmedia-dj-audio-v1";

  const CACHE_LIMIT = 6;
  const AUDIO_STREAM_STALL_MS =
    30000;
	
  /*
    Remove old AAC/M4A performance copies cached by Safari or Chrome.

    This cache contained only /dj-performance/ responses, not the user's
    original WAV/FLAC/MP3 files.
  */
  const clearLegacyPerformanceCopyCache =
    async () => {
      try {
        window.localStorage.removeItem(
          "brmedia.dj.audio-cache-lru.v1"
        );

        if ("caches" in window) {
          await caches.delete(
            "brmedia-dj-audio-v1"
          );
        }
      } catch {}
    };

  void clearLegacyPerformanceCopyCache();

  const LRU_KEY =
    "brmedia.dj.audio-cache-lru.v1";

  const formatBytes = (
    bytes = 0
  ) => {
    const value = Math.max(
      0,
      Number(bytes) || 0
    );

    if (
      value >= 1024 * 1024
    ) {
      return `${
        (
          value /
          (1024 * 1024)
        ).toFixed(1)
      } MB`;
    }

    if (value >= 1024) {
      return `${
        (value / 1024).toFixed(0)
      } KB`;
    }

    return `${Math.round(value)} B`;
  };

  const isRemoteAccess = () => {
    const host = String(
      window.location.hostname ||
      ""
    ).toLowerCase();

    return !(
      !host ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./
        .test(host)
    );
  };

  const readLru = () => {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(
          LRU_KEY
        ) || "{}"
      );

      return (
        parsed &&
        typeof parsed === "object"
      )
        ? parsed
        : {};
    } catch {
      return {};
    }
  };

  const writeLru = (
    value
  ) => {
    try {
      window.localStorage.setItem(
        LRU_KEY,
        JSON.stringify(value || {})
      );
    } catch {}
  };

  const touchCache =
    async (url) => {
      if (
        !("caches" in window) ||
        !url
      ) {
        return;
      }

      const lru = readLru();
      lru[url] = Date.now();

      const ordered =
        Object.entries(lru)
          .sort(
            (left, right) =>
              Number(right[1]) -
              Number(left[1])
          );

      const stale = ordered.slice(
        CACHE_LIMIT
      );

      const cache =
        await caches.open(
          CACHE_NAME
        );

      await Promise.all(
        stale.map(
          async ([staleUrl]) => {
            delete lru[staleUrl];

            await cache.delete(
              staleUrl
            );
          }
        )
      );

      writeLru(lru);
    };

  const getCachedResponse =
    async (url) => {
      if (
        !("caches" in window) ||
        !String(url).startsWith(
          "/dj-performance/"
        )
      ) {
        return null;
      }

      try {
        const cache =
          await caches.open(
            CACHE_NAME
          );

        const response =
          await cache.match(url);

        if (response) {
          await touchCache(url);
        }

        return response || null;
      } catch {
        return null;
      }
    };

  const rememberResponse =
    async (url, response) => {
      if (
        !("caches" in window) ||
        !response ||
        !String(url).startsWith(
          "/dj-performance/"
        )
      ) {
        return;
      }

      try {
        const cache =
          await caches.open(
            CACHE_NAME
          );

        await cache.put(
          url,
          response
        );

        await touchCache(url);
      } catch {
        /*
          Safari may evict large
          cached responses.
        */
      }
    };

  const readResponseBlob =
    async (
      response,
      options = {}
    ) => {
      const totalBytes =
        Math.max(
          0,
          Number(
            response.headers.get(
              "content-length"
            )
          ) || 0
        );

      const contentType =
        String(
          response.headers.get(
            "content-type"
          ) ||
          "audio/mp4"
        );

      if (
        !response.body ||
        typeof response.body
          .getReader !== "function"
      ) {
        return response.blob();
      }

      const reader =
        response.body.getReader();

      const chunks = [];

      let receivedBytes = 0;
      let lastStatusAt = 0;

      const readNextChunk =
        () =>
          new Promise(
            (
              resolve,
              reject
            ) => {
              const timer =
                window.setTimeout(
                  () => {
                    reject(
                      new Error(
                        "Audio download stalled before the final bytes arrived"
                      )
                    );

                    try {
                      void reader
                        .cancel();
                    } catch {}
                  },
                  AUDIO_STREAM_STALL_MS
                );

              reader.read()
                .then(
                  (result) => {
                    window.clearTimeout(
                      timer
                    );

                    resolve(result);
                  },

                  (error) => {
                    window.clearTimeout(
                      timer
                    );

                    reject(error);
                  }
                );
            }
          );

      while (true) {
        const {
          done,
          value,
        } = await readNextChunk();

        if (done) break;

        if (
          !value?.byteLength
        ) {
          continue;
        }

        chunks.push(value);

        receivedBytes +=
          value.byteLength;

        const now =
          performance.now();

        if (
          typeof options
            .onProgress ===
            "function" &&
          now - lastStatusAt >=
            250
        ) {
          lastStatusAt = now;

          const elapsedSeconds =
            Math.max(
              0.1,

              (
                now -
                options.startedAt
              ) / 1000
            );

          const speed =
            receivedBytes /
            elapsedSeconds;

          const percent =
            totalBytes
              ? Math.min(
                  100,

                  Math.round(
                    (
                      receivedBytes /
                      totalBytes
                    ) * 100
                  )
                )
              : 0;

          options.onProgress({
            receivedBytes,
            totalBytes,
            speed,
            percent,

            sourceLabel:
              options.sourceLabel ||
              "Audio",
          });
        }
      }

      if (
        totalBytes > 0 &&
        receivedBytes <
          totalBytes
      ) {
        throw new Error(
          `Audio stream ended early (${formatBytes(
            receivedBytes
          )} / ${formatBytes(
            totalBytes
          )})`
        );
      }

      if (
        typeof options
          .onProgress ===
          "function"
      ) {
        const elapsedSeconds =
          Math.max(
            0.1,
            (
              performance.now() -
              options.startedAt
            ) /
              1000
          );

        options.onProgress({
          receivedBytes,

          totalBytes:
            totalBytes ||
            receivedBytes,

          speed:
            receivedBytes /
            elapsedSeconds,

          percent: 100,

          sourceLabel:
            options.sourceLabel ||
            "Audio",
        });
      }

      return new Blob(
        chunks,
        {
          type: contentType,
        }
      );
    };

  const fetchAudioBlob =
    async (
      options = {}
    ) => {
      const urls =
        Array.isArray(
          options.urls
        )
          ? options.urls.filter(
              Boolean
            )
          : [];

      if (!urls.length) {
        throw new Error(
          "This library track has no stream id or local path"
        );
      }

      let lastError =
        "Could not fetch track";
      const signal = options.signal;

      for (const url of urls) {
        if (signal?.aborted) {
          throw new DOMException(
            "Waveform request aborted",
            "AbortError"
          );
        }
        const fetchStartedAt =
          performance.now();

        const isPerformanceCopy =
          String(url).startsWith(
            "/dj-performance/"
          );

        try {
          const cachedResponse =
            isPerformanceCopy
              ? await getCachedResponse(
                  url
                )
              : null;

          if (cachedResponse) {
            options.onStatus?.(
              "Opening device cache"
            );

            const blob =
              await cachedResponse
                .blob();

            if (blob.size) {
              return {
                blob,
                url,
                bytes: blob.size,

                fetchMs:
                  performance.now() -
                  fetchStartedAt,

                cacheHit: true,
                source:
                  "device-cache",
              };
            }
          }

          options.onStatus?.(
            isPerformanceCopy
              ? "Fetching remote DJ copy"
              : "Fetching original audio"
          );

          const response =
            await fetch(
              url,
              {
                cache:
                  isPerformanceCopy
                    ? "force-cache"
                    : "no-store",

                credentials:
                  "same-origin",
                signal,
              }
            );

          if (!response.ok) {
            lastError =
              `Track fetch failed ` +
              `${response.status} ` +
              `from ${url}`;

            continue;
          }

          const responseForCache =
            isPerformanceCopy
              ? response.clone()
              : null;

          const blob =
            await readResponseBlob(
              response,
              {
                startedAt:
                  fetchStartedAt,

                sourceLabel:
                  isPerformanceCopy
                    ? "Remote DJ copy"
                    : "Original audio",

                onProgress:
                  options.onProgress,
              }
            );

          const type = String(
            blob.type ||
            response.headers.get(
              "content-type"
            ) ||
            ""
          ).toLowerCase();

          if (
            /text\/html|application\/json|text\/plain/
              .test(type)
          ) {
            const body =
              await blob
                .text()
                .catch(() => "");

            lastError = body
              ? body.slice(0, 140)
              : `Unexpected response type: ${type}`;

            continue;
          }

          if (!blob.size) {
            lastError =
              "Track stream was empty";

            continue;
          }

          if (
            responseForCache &&
            isPerformanceCopy
          ) {
            void rememberResponse(
              url,
              responseForCache
            );
          }

          return {
            blob,
            url,
            bytes: blob.size,

            fetchMs:
              performance.now() -
              fetchStartedAt,

            cacheHit: false,

            source:
              isPerformanceCopy
                ? "performance-copy"
                : "original",
          };
        } catch (error) {
          if (
            signal?.aborted ||
            error?.name === "AbortError"
          ) {
            throw error;
          }
          lastError =
            error?.message ||
            lastError;
        }
      }

      throw new Error(lastError);
    };

  window.BRMediaDjLibraryRemote =
    Object.freeze({
      formatBytes,
      isRemoteAccess,
      fetchAudioBlob,
    });
})();
