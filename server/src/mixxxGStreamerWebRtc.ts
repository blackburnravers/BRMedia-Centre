import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

export type MixxxMediaTransport = "custom-webrtc" | "gstreamer-webrtc";
export const MIXXX_MEDIA_TRANSPORTS = Object.freeze(["custom-webrtc", "gstreamer-webrtc"] as const);
export function parseMixxxMediaTransport(value: unknown): MixxxMediaTransport {
  if (value === "custom-webrtc" || value === "gstreamer-webrtc") return value;
  throw new Error("BRMEDIA_MIXXX_MEDIA_TRANSPORT must be custom-webrtc or gstreamer-webrtc");
}

const DEFAULT_ENDPOINT = "{0.0.0.00000000}.{5ea0cb70-773b-4941-bf5b-780c3bd2d0a8}";
const OPUS_BITRATE = 128_000;
const OPUS_FRAME_MS = 20;

export class MixxxGStreamerWebRtc {
  private child: ChildProcess | null = null;
  private starting: Promise<void> | null = null;
  private listeners = new Set<string>();
  private listenerTimers = new Map<string, NodeJS.Timeout>();
  private restartCount = 0;
  private consecutiveFailures = 0;
  private lastError = "";
  private warnings: string[] = [];
  private transportTrace: Array<{ at: string; line: string }> = [];
  private toolProbe = { verified: false, gstLaunch: "not-run", gstInspect: "not-run", discoveryLines: 0 };
  private state = "NULL";
  private intentionalStop = false;
  readonly signallingPort: number;
  readonly endpointId: string;

  constructor(private readonly projectRoot: string, options: { signallingPort?: number; endpointId?: string } = {}) {
    this.signallingPort = options.signallingPort || 18443;
    this.endpointId = options.endpointId || process.env.BRMEDIA_MIXXX_MASTER_ENDPOINT || DEFAULT_ENDPOINT;
  }
  executable() {
    const root = process.env.BRMEDIA_GSTREAMER_ROOT || "C:\\Users\\brmedia\\AppData\\Local\\Programs\\gstreamer\\1.0\\msvc_x86_64";
    return path.join(root, "bin", "gst-launch-1.0.exe");
  }
  inspectExecutable() { return path.join(path.dirname(this.executable()), "gst-inspect-1.0.exe"); }
  supported() { return process.platform === "win32"; }
  pipelineArgs() {
    return ["-e", "-m",
      "wasapi2src", `device=${this.endpointId}`, "loopback=true", "low-latency=true", "provide-clock=true", "!",
      "audioconvert", "!", "audioresample", "!",
      "audio/x-raw,format=S16LE,rate=48000,channels=2,layout=interleaved", "!",
      "queue", "name=rawq", "max-size-time=200000000", "max-size-buffers=0", "max-size-bytes=0", "leaky=no", "!",
      "opusenc", `bitrate=${OPUS_BITRATE}`, `frame-size=${OPUS_FRAME_MS}`, "perfect-timestamp=false", "!",
      "audio/x-opus,rate=48000,channels=2", "!",
      "queue", "name=opusq", "max-size-time=200000000", "max-size-buffers=0", "max-size-bytes=0", "leaky=no", "!",
      "webrtcsink", "name=brmedia", "run-signalling-server=true", "signalling-server-host=127.0.0.1",
      `signalling-server-port=${this.signallingPort}`, "stun-server=", "meta=meta,name=brmedia-mixxx-master"];
  }
  pipelineDescription() { return this.pipelineArgs().slice(2).join(" "); }
  async acquire(id: string) {
    if (!this.listeners.has(id)) this.listeners.add(id);
    try { await this.verifyTools(); await this.ensureStarted(); this.touch(id); } catch (error) { const timer = this.listenerTimers.get(id); if (timer) clearTimeout(timer);
      this.listenerTimers.delete(id); this.listeners.delete(id); throw error; }
  }
  touch(id: string) { if (!this.listeners.has(id)) return; const previous = this.listenerTimers.get(id); if (previous) clearTimeout(previous);
    const timer = setTimeout(() => void this.release(id), 65_000); timer.unref?.(); this.listenerTimers.set(id, timer); }
  async release(id: string) { const timer = this.listenerTimers.get(id); if (timer) clearTimeout(timer); this.listenerTimers.delete(id);
    this.listeners.delete(id); if (!this.listeners.size) await this.stop(); }
  listenerCount() { return this.listeners.size; }
  diagnostics() {
    return { supported: this.supported(), active: Boolean(this.child), state: this.state, pid: this.child?.pid || null,
      executable: this.executable(), platform: process.platform,
      toolProbe: { ...this.toolProbe },
      processCount: this.child ? 1 : 0, listenerCount: this.listeners.size, version: "1.28.5", sourceDevice: this.endpointId,
      negotiatedCaps: "audio/x-raw,format=S16LE,rate=48000,channels=2,layout=interleaved -> audio/x-opus,rate=48000,channels=2",
      sampleRate: 48000, channels: 2, opusBitrate: OPUS_BITRATE, opusFrameMs: OPUS_FRAME_MS,
      queues: { rawq: { maxTimeNs: 200_000_000, leaky: false }, opusq: { maxTimeNs: 200_000_000, leaky: false } },
      clock: "wasapi2src-provided", baseTime: this.child ? "pipeline-owned" : null, restartCount: this.restartCount,
      warnings: [...this.warnings], lastError: this.lastError || null, signallingPort: this.signallingPort,
      pipeline: this.pipelineDescription(), transportTrace: [...this.transportTrace],
      rawPcmHttpActive: false, nodeRtcAudioSourceActive: false };
  }
  async stop(graceMs = 3000) {
    const child = this.child; if (!child) { this.state = "NULL"; return; }
    this.intentionalStop = true; const exactPid = child.pid;
    try { child.kill("SIGINT"); } catch {}
    await new Promise<void>(resolve => { let done = false; const finish = () => { if (done) return; done = true; resolve(); };
      child.once("exit", finish); setTimeout(() => { if (child.exitCode === null && child.pid === exactPid) try { child.kill(); } catch {} finish(); }, graceMs).unref?.(); });
    if (this.child === child) this.child = null; this.state = "NULL"; this.intentionalStop = false;
  }
  stopNow() { for (const timer of this.listenerTimers.values()) clearTimeout(timer); this.listenerTimers.clear(); this.listeners.clear();
    const child = this.child; this.child = null; this.state = "NULL"; if (child?.pid) try { child.kill(); } catch {} }
  private ensureStarted() {
    if (this.child) return Promise.resolve(); if (this.starting) return this.starting;
    if (!this.supported()) return Promise.reject(new Error("GStreamer media transport requires Windows"));
    this.starting = new Promise<void>((resolve, reject) => {
      const child = spawn(this.executable(), this.pipelineArgs(), { cwd: this.projectRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, GST_DEBUG_NO_COLOR: "1", GST_DEBUG: "webrtc*:5,nice*:5,dtls*:5,srtp*:5" } });
      this.child = child; this.intentionalStop = false; this.state = "STARTING"; let settled = false;
      const ready = setTimeout(() => { if (settled || this.child !== child) return; settled = true; this.state = "PLAYING"; this.consecutiveFailures = 0; this.lastError = ""; resolve(); }, 1500);
      const record = (chunk: Buffer) => { const line = chunk.toString("utf8");
        for (const raw of line.split(/\r?\n/)) if (raw && /ice|candidate|nice|dtls|srtp|transport|webrtc/i.test(raw)) {
          const safe = raw.replace(/(ice-pwd[:=]\s*)\S+/ig, "$1[redacted]").slice(-1200);
          this.transportTrace.push({ at: new Date().toISOString(), line: safe });
          if (this.transportTrace.length > 160) this.transportTrace.splice(0, this.transportTrace.length - 160);
        }
        if (/warning/i.test(line) && !/missing.*DISCONT/i.test(line)) { this.warnings.push(line.trim().slice(-500)); this.warnings = this.warnings.slice(-8); }
        if (/error/i.test(line)) this.lastError = line.trim().slice(-1000); };
      child.stdout?.on("data", record); child.stderr?.on("data", record);
      child.once("error", error => { clearTimeout(ready); this.lastError = String(error.message || error); if (this.child === child) this.child = null;
        this.state = "FAILED"; if (!settled) { settled = true; reject(error); } });
      child.once("exit", (code, signal) => { clearTimeout(ready); if (this.child === child) this.child = null;
        if (!this.intentionalStop) { this.state = "FAILED"; this.consecutiveFailures += 1; this.lastError = `GStreamer exited ${code ?? "null"}${signal ? ` (${signal})` : ""}`;
          if (this.listeners.size && this.consecutiveFailures <= 2) { this.restartCount += 1; setTimeout(() => void this.ensureStarted().catch(() => {}), 500 * this.consecutiveFailures).unref?.(); }
        } else this.state = "NULL";
        if (!settled) { settled = true; reject(new Error(this.lastError || "GStreamer exited during startup")); }
      });
    }).finally(() => { this.starting = null; }); return this.starting;
  }
  private async verifyTools() {
    if (this.toolProbe.verified) return;
    const launch = await this.runTool(this.executable(), ["--version"], 10_000);
    const inspect = await this.runTool(this.inspectExecutable(), ["--version"], 10_000);
    const discovery = await this.runTool(this.inspectExecutable(), [], 30_000, false);
    this.toolProbe = { verified: true, gstLaunch: launch.summary, gstInspect: inspect.summary, discoveryLines: discovery.lines };
  }
  private runTool(executable: string, args: string[], timeoutMs: number, retainOutput = true): Promise<{ summary: string; lines: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, { cwd: this.projectRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let output = "", errorOutput = "", lines = 0, finished = false;
      const timer = setTimeout(() => { if (finished) return; finished = true; try { child.kill(); } catch {} reject(new Error(`${path.basename(executable)} probe timed out`)); }, timeoutMs);
      child.stdout?.on("data", chunk => { const value = chunk.toString("utf8"); lines += (value.match(/\n/g) || []).length; if (retainOutput) output = (output + value).slice(-1000); });
      child.stderr?.on("data", chunk => { errorOutput = (errorOutput + chunk.toString("utf8")).slice(-1000); });
      child.once("error", error => { clearTimeout(timer); if (!finished) { finished = true; reject(error); } });
      child.once("exit", code => { clearTimeout(timer); if (finished) return; finished = true;
        if (code !== 0) reject(new Error(`${path.basename(executable)} exited ${code}: ${errorOutput.trim()}`));
        else { const outputLines = output.trim().split(/\r?\n/); const summary = outputLines.find(value => /GStreamer\s+\d/i.test(value)) || outputLines[0] || "ok";
          resolve({ summary: summary.slice(0, 240), lines }); } });
    });
  }
}
