export type ProbeResult = {
  formatName?: string;
  durationSec?: number;
  bitrate?: number;
  streams?: Array<{
    codecType?: "audio" | "video" | string;
    codecName?: string;
    sampleRate?: number;
    channels?: number;
  }>;
};

export interface AudioEngine {
  probe(input: string): Promise<ProbeResult>;
  /**
   * Convert input -> output using a prebuilt ffmpeg argument list.
   * Implementations can be server-side, local, or bridged.
   */
  convert(args: string[], onProgress?: (p: { ratio: number; message?: string }) => void): Promise<void>;
}

/**
 * Placeholder default engine (not implemented yet).
 * Real implementations will live in:
 * - server (actual ffmpeg)
 * - desktop bridge (local ffmpeg)
 * - mobile (server-first)
 */
export const NoopAudioEngine: AudioEngine = {
  async probe() {
    return {};
  },
  async convert() {
    // no-op
  },
};