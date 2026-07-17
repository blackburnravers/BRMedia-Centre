(function () {
  "use strict";

  function hasAudioContext() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  function detectServices() {
    const audioReady = hasAudioContext();

    return [
      {
        key: "audio-context",
        label: "AudioContext",
        role: "Master browser audio engine",
        available: audioReady,
        phase: "V1B",
      },
      {
        key: "buffer-source",
        label: "AudioBufferSourceNode",
        role: "Decoded in-memory deck playback",
        available: audioReady,
        phase: "V1B",
      },
      {
        key: "gain-node",
        label: "GainNode",
        role: "Deck volume, trim, master and crossfader gain",
        available: audioReady,
        phase: "V1C",
      },
      {
        key: "biquad-filter",
        label: "BiquadFilterNode",
        role: "LOW / MID / HIGH deck EQ",
        available: audioReady,
        phase: "V1D",
      },
      {
        key: "analyser",
        label: "AnalyserNode",
        role: "Real VU meters and visual levels",
        available: audioReady,
        phase: "V1D",
      },
      {
        key: "media-recorder",
        label: "MediaRecorder",
        role: "Record the master output",
        available: Boolean(window.MediaRecorder),
        phase: "V1F",
      },
      {
        key: "dj-analysis-cache",
        label: "DJ Analysis Cache",
        role: "Stores BPM, downbeat, beat-grid and waveform peak analysis per loaded track",
        available: Boolean(window.localStorage),
        phase: "V2D",
      },
      {
        key: "beatgrid-sync",
        label: "Beatgrid Sync Foundation",
        role: "Aligns synced decks by BPM and beat phase using cached grid data",
        available: audioReady,
        phase: "V2D",
      },
      {
        key: "web-midi",
        label: "Web MIDI",
        role: "Optional hardware controller support",
        available: Boolean(navigator.requestMIDIAccess),
        phase: "V1H",
      },
      {
        key: "file-blob",
        label: "File / Blob APIs",
        role: "Drag/drop and local file loading",
        available: Boolean(window.File && window.Blob && window.FileReader),
        phase: "V1G",
      },
      {
        key: "canvas",
        label: "CanvasRenderingContext2D",
        role: "Live waveforms, meters, platters and pads",
        available: Boolean(window.CanvasRenderingContext2D),
        phase: "V1E",
      },
      {
        key: "raf",
        label: "requestAnimationFrame",
        role: "Smooth meter and waveform animation",
        available: Boolean(window.requestAnimationFrame),
        phase: "V1E",
      },
      {
        key: "wavesurfer",
        label: "WaveSurfer.js hook",
        role: "Optional detail/editor waveform layer",
        available: Boolean(window.WaveSurfer),
        phase: "V1I",
        optional: true,
      },
      {
        key: "ffmpeg-wasm",
        label: "FFmpeg.wasm hook",
        role: "Optional browser-side processing test only",
        available: Boolean(window.createFFmpeg || window.FFmpeg?.createFFmpeg || window.FFmpegWASM),
        phase: "V1I",
        optional: true,
      },
    ];
  }

  window.BRMediaDjMixerServices = {
    detect: detectServices,
  };
}());