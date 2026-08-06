import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import type { MasterCaptureCallbacks, MasterCaptureFactory, MasterCaptureProcess } from "./mixxxMasterStream";

export const M26_MIXXX_RENDER_ENDPOINT =
  "{0.0.0.00000000}.{5ea0cb70-773b-4941-bf5b-780c3bd2d0a8}";

type CaptureFactoryOptions = {
  projectRoot: string;
  endpointId?: string;
  platform?: NodeJS.Platform;
  spawnProcess?: typeof spawn;
  compile?: typeof spawnSync;
  now?: () => number;
};

/**
 * Production capture boundary. It compiles the checked-in helper once into a
 * private cache and will only start it against the explicit audited render
 * endpoint. There is deliberately no default endpoint or microphone fallback.
 */
export class WasapiLoopbackCaptureFactory implements MasterCaptureFactory {
  private readonly sourcePath: string;
  private readonly binaryPath: string;
  private readonly ffmpegPath: string;
  private readonly compilerPath: string;
  private readonly endpointId: string;
  private readonly platform: NodeJS.Platform;
  private readonly spawnProcess: typeof spawn;
  private readonly compile: typeof spawnSync;
  private readonly now: () => number;
  private compiled = false;
  private active: ChildProcess | null = null;
  private captureInput: ChildProcess | null = null;
  private ffmpegRestarts = 0;
  private stderrTail = "";

  constructor(options: CaptureFactoryOptions) {
    this.sourcePath = path.join(options.projectRoot, "tools", "windows", "m26-wasapi-loopback.cs");
    this.binaryPath = path.join(options.projectRoot, "server", ".cache", "m26", "m26-wasapi-loopback.exe");
    this.ffmpegPath = process.env.FFMPEG_PATH || "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
    this.compilerPath = path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
    this.endpointId = String(options.endpointId || M26_MIXXX_RENDER_ENDPOINT);
    this.platform = options.platform || process.platform;
    this.spawnProcess = options.spawnProcess || spawn;
    this.compile = options.compile || spawnSync;
    this.now = options.now || Date.now;
  }

  supported() {
    return this.platform === "win32" && fs.existsSync(this.sourcePath) && fs.existsSync(this.compilerPath) && fs.existsSync(this.ffmpegPath);
  }

  diagnostics() {
    return {
      supported: this.supported(),
      method: "wasapi-loopback-explicit-render-endpoint",
      endpoint: "Mixxx master render endpoint",
      inputDevice: this.endpointId,
      processState: this.active ? "running" : "stopped",
      capturePid: this.captureInput?.pid || null,
      ffmpegPid: this.active?.pid || null,
      inputSampleRate: 48_000,
      inputChannels: 2,
      conversion: "ffmpeg -f s16le -ar 48000 -ac 2 -i pipe:0 -ar 48000 -ac 2 -f s16le -acodec pcm_s16le pipe:1",
      sampleRate: 48_000,
      channels: 2,
      format: "pcm-s16le",
      ffmpegRestarts: this.ffmpegRestarts,
      lastError: this.stderrTail || null,
    };
  }

  start(callbacks: MasterCaptureCallbacks): MasterCaptureProcess {
    if (this.active) throw new Error("The Mixxx master capture process is already running");
    if (!this.supported()) throw new Error("Exact WASAPI loopback capture is unavailable on this server");
    this.ensureCompiled();
    console.info("[M26 capture]", JSON.stringify({ inputDevice: this.endpointId, inputSampleRate: 48000, inputChannels: 2,
      conversionProcess: "ffmpeg", outputSampleRate: 48000, outputChannels: 2, outputSampleFormat: "signed-16-bit-little-endian",
      outputInterleaving: "stereo", outputRawFormat: "s16le" }));

    const capture = this.spawnProcess(this.binaryPath, ["--capture-endpoint", this.endpointId], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const child = this.spawnProcess(this.ffmpegPath, ["-hide_banner", "-loglevel", "warning", "-f", "s16le", "-ar", "48000", "-ac", "2",
      "-i", "pipe:0", "-ar", "48000", "-ac", "2", "-f", "s16le", "-acodec", "pcm_s16le", "pipe:1"], {
      windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
    });
    capture.stdout?.pipe(child.stdin!);
    this.captureInput = capture; this.active = child;
    this.stderrTail = "";
    let stopped = false;

    child.stdout?.on("data", (chunk: Buffer) => {
      if (!stopped && chunk.length) callbacks.data(Buffer.from(chunk), this.now());
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      this.stderrTail = (this.stderrTail + chunk.toString("utf8")).slice(-4096);
    });
    capture.stderr?.on("data", (chunk: Buffer) => { this.stderrTail = (this.stderrTail + chunk.toString("utf8")).slice(-4096); });
    capture.once("error", (error) => { if (!stopped) callbacks.error(error); });
    capture.once("exit", (code, signal) => { if (this.captureInput === capture) this.captureInput = null;
      if (!stopped && this.active) { try { child.stdin?.end(); } catch {} callbacks.exit(code, signal || undefined); } });
    child.once("error", (error) => {
      if (this.active === child) this.active = null;
      if (this.captureInput === capture) this.captureInput = null;
      if (!stopped) callbacks.error(error);
    });
    child.once("exit", (code, signal) => {
      if (this.active === child) this.active = null;
      if (!stopped) callbacks.exit(code, signal || undefined);
    });

    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        if (this.active === child) this.active = null;
        if (this.captureInput === capture) this.captureInput = null;
        try { child.stdout?.removeAllListeners(); } catch {}
        try { capture.stdout?.unpipe(child.stdin!); } catch {}
        try { capture.kill(); } catch {}
        try { child.kill(); } catch {}
      },
    };
  }

  private ensureCompiled() {
    if (this.compiled && fs.existsSync(this.binaryPath)) return;
    fs.mkdirSync(path.dirname(this.binaryPath), { recursive: true });
    const sourceStat = fs.statSync(this.sourcePath);
    const binaryFresh = fs.existsSync(this.binaryPath) && fs.statSync(this.binaryPath).mtimeMs >= sourceStat.mtimeMs;
    if (!binaryFresh) {
      const result = this.compile(this.compilerPath, [
        "/nologo", "/optimize+", "/target:exe", `/out:${this.binaryPath}`, this.sourcePath,
      ], { windowsHide: true, encoding: "utf8", timeout: 30_000 });
      if (result.status !== 0 || !fs.existsSync(this.binaryPath)) {
        const detail = String(result.stderr || result.stdout || "compiler failed").slice(-1000);
        throw new Error(`M26 WASAPI capture helper compilation failed: ${detail}`);
      }
    }
    this.compiled = true;
  }
}
