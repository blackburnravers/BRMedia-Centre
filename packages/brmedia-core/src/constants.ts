import type { ConvertProfile } from "./types";

export const BRMEDIA_DEFAULTS_VERSION = "0.0.1";

/**
 * Common conversion profiles (starter set).
 * You’ll probably expand this into categories later.
 */
export const DEFAULT_CONVERT_PROFILES: ConvertProfile[] = [
  {
    id: "mp3-320",
    name: "MP3 320kbps (Stereo)",
    format: "mp3",
    audio: { codec: "mp3", bitrateKbps: 320, sampleRateHz: 44100, channels: 2 },
  },
  {
    id: "wav-44100",
    name: "WAV 44.1kHz (Stereo)",
    format: "wav",
    audio: { codec: "wav", sampleRateHz: 44100, channels: 2 },
  },
  {
    id: "flac-archive",
    name: "FLAC (Archive)",
    format: "flac",
    audio: { codec: "flac", sampleRateHz: 44100, channels: 2 },
  },
];