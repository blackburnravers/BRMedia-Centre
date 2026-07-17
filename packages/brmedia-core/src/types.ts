export type MediaKind = "audio" | "video" | "image" | "document" | "unknown";

export type SourceKind = "server" | "local" | "drive";

export type AudioCodec = "mp3" | "aac" | "flac" | "wav" | "opus" | "alac";
export type VideoCodec = "h264" | "h265" | "vp9" | "av1";

export type ContainerFormat =
  | "mp3"
  | "m4a"
  | "aac"
  | "flac"
  | "wav"
  | "ogg"
  | "opus"
  | "mp4"
  | "mkv"
  | "webm"
  | "mov";

export type BitrateKbps = number; // e.g. 128, 320
export type Hz = number; // e.g. 44100, 48000

export interface ConvertProfile {
  id: string;
  name: string;

  /** output container */
  format: ContainerFormat;

  /** audio settings (optional if video-only) */
  audio?: {
    codec: AudioCodec;
    bitrateKbps?: BitrateKbps;
    sampleRateHz?: Hz;
    channels?: 1 | 2;
  };

  /** video settings (optional if audio-only) */
  video?: {
    codec: VideoCodec;
    bitrateKbps?: BitrateKbps;
    width?: number;
    height?: number;
    fps?: number;
  };

  /** misc flags */
  normalizeAudio?: boolean;
}

export interface MediaItem {
  id: string;
  title: string;
  kind: MediaKind;
  source: SourceKind;

  /** Where it is (server id, file path, drive file id, etc.) */
  locator: string;

  /** Optional metadata */
  durationMs?: number;
  sizeBytes?: number;
  mimeType?: string;
}

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface JobProgress {
  /** 0..1 */
  ratio: number;
  /** human status e.g. "Encoding", "Probing" */
  stage?: string;
  /** optional message for UI */
  message?: string;
}

export interface ConvertJob {
  id: string;
  createdAtIso: string;
  status: JobStatus;

  input: MediaItem;
  profile: ConvertProfile;

  outputLocator?: string;

  progress?: JobProgress;
  error?: {
    code: string;
    message: string;
  };
}