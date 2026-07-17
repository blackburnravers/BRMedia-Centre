(() => {
  const VERSION = "20260703-dj-patch2a-foundation-services-v1";

  function supportsAudioType(type = "") {
    const audio = document.createElement("audio");
    if (!audio?.canPlayType) return "";
    return audio.canPlayType(type);
  }

  function getFeatureReport() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    return {
      version: VERSION,
      webAudio: Boolean(AudioContextCtor),
      audioContextName: AudioContextCtor?.name || "none",
      fileApi: Boolean(window.File && window.Blob && window.FileReader),
      mediaRecorder: Boolean(window.MediaRecorder),
      mediaSession: Boolean(window.navigator?.mediaSession),
      canvas: Boolean(window.HTMLCanvasElement && window.CanvasRenderingContext2D),
      requestAnimationFrame: typeof window.requestAnimationFrame === "function",
      wavesurfer: Boolean(window.WaveSurfer),
      essentia: Boolean(window.Essentia || window.EssentiaWASM),
      meyda: Boolean(window.Meyda),
      audioTypes: {
        mp3: supportsAudioType("audio/mpeg"),
        wav: supportsAudioType("audio/wav"),
        m4a: supportsAudioType("audio/mp4"),
        aac: supportsAudioType("audio/aac"),
        ogg: supportsAudioType("audio/ogg"),
        flac: supportsAudioType("audio/flac"),
      },
    };
  }

  function createHiddenFileInput({ accept = "audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg", multiple = false } = {}) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = Boolean(multiple);
    input.hidden = true;
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    document.body.appendChild(input);
    return input;
  }

  function pickLocalAudioFile(options = {}) {
    return new Promise((resolve) => {
      const input = createHiddenFileInput(options);
      let settled = false;

      const cleanup = () => {
        window.setTimeout(() => input.remove(), 0);
      };

      const finish = (file = null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(file);
      };

      input.addEventListener("change", () => finish(input.files?.[0] || null), { once: true });
      input.addEventListener("cancel", () => finish(null), { once: true });
      window.addEventListener("focus", () => {
        window.setTimeout(() => {
          if (!settled && !input.files?.length) finish(null);
        }, 700);
      }, { once: true });

      input.click();

      window.setTimeout(() => {
        if (!settled) finish(null);
      }, 30000);
    });
  }

  async function readAudioFile(file) {
    if (!file) throw new Error("No audio file was selected.");
    if (typeof file.arrayBuffer === "function") return file.arrayBuffer();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error || new Error("File read failed.")));
      reader.readAsArrayBuffer(file);
    });
  }

  function makeObjectUrl(file) {
    if (!file || !window.URL?.createObjectURL) return "";
    return window.URL.createObjectURL(file);
  }

  function revokeObjectUrl(url) {
    if (url && window.URL?.revokeObjectURL) window.URL.revokeObjectURL(url);
  }

  function logFeatureReport() {
    const report = getFeatureReport();
    console.info("[BRMedia DJ Services] feature report", report);
    return report;
  }

  window.BRMediaDjServices = {
    VERSION,
    getFeatureReport,
    logFeatureReport,
    pickLocalAudioFile,
    readAudioFile,
    makeObjectUrl,
    revokeObjectUrl,
  };
})();