import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

type SidecarReply = { ok: boolean; [key: string]: any };
export class MixxxWebRtcSidecar {
  private child: ChildProcess | null = null;
  private port = 0;
  private token = "";
  private starting: Promise<void> | null = null;
  private lastError = "";
  private shutdownAcknowledged = false;
  private pcmBackpressureEvents = 0;
  private pcmDisconnects = 0;
  private pcmBackpressured = new Set<string>();
  private pcmDrainCallbacks = new Map<string, Set<() => void>>();
  private pcmClosedCallbacks = new Map<string, () => void>();
  constructor(private readonly projectRoot: string) {}
  supported() {
    return process.platform === "win32" && fs.existsSync(this.nodePath()) && fs.existsSync(this.appPath()) && fs.existsSync(path.join(this.root(), "node_modules", "@roamhq", "wrtc"));
  }
  diagnostics() { return { supported: this.supported(), state: this.child ? "running" : "stopped", pid: this.child?.pid || null,
    port: this.child ? this.port : null, processCount: this.child ? 1 : 0, mediaTransport: "parent-child-stdin-binary",
    httpPcmActive: false, pcmBackpressureEvents: this.pcmBackpressureEvents, pcmDisconnects: this.pcmDisconnects,
    shutdownAcknowledged: this.shutdownAcknowledged, lastError: this.lastError || null }; }
  async createSession(id: string, offer: string, owner = "unknown", onPcmClosed?: () => void) {
    await this.ensureStarted();
    const result = await this.request("POST", "/sessions", { id, offer, owner });
    if (!result.ok || !result.answer) throw new Error(result.error || "WebRTC sidecar rejected the offer");
    if (onPcmClosed) this.pcmClosedCallbacks.set(id, onPcmClosed);
    this.writeMediaRecord(1, id, Buffer.alloc(0));
    return result.answer;
  }
  sink(id: string) { return {
    write: (chunk: Buffer) => { if (!this.child?.stdin || this.pcmBackpressured.has(id)) return false;
      if (!this.writeMediaRecord(2, id, chunk)) { this.pcmBackpressured.add(id); this.pcmBackpressureEvents += 1; } return true; },
    onDrain: (callback: () => void) => { const callbacks = this.pcmDrainCallbacks.get(id) || new Set<() => void>(); callbacks.add(callback);
      this.pcmDrainCallbacks.set(id, callbacks); return () => { callbacks.delete(callback); if (!callbacks.size) this.pcmDrainCallbacks.delete(id); }; },
    end: () => { this.pcmBackpressured.delete(id); this.pcmDrainCallbacks.delete(id); this.writeMediaRecord(3, id, Buffer.alloc(0)); },
  }; }
  async closeSession(id: string) {
    this.pcmBackpressured.delete(id); this.pcmDrainCallbacks.delete(id); this.pcmClosedCallbacks.delete(id);
    this.writeMediaRecord(3, id, Buffer.alloc(0));
    if (this.child) await this.request("DELETE", `/sessions/${encodeURIComponent(id)}`).catch(() => ({}));
  }
  async remoteDiagnostics() { if (!this.child) return null; try { return await this.request("GET", "/health"); } catch (error) { this.lastError = String((error as any)?.message || error); return null; } }
  async stop(graceMs = 3000) {
    const child = this.child; if (!child) return; const exactPid = child.pid;
    this.pcmBackpressured.clear();
    this.pcmDrainCallbacks.clear(); this.pcmClosedCallbacks.clear();
    try { const reply = await this.request("POST", "/shutdown"); this.shutdownAcknowledged = reply.type === "shutdown-ack" && reply.pid === exactPid && reply.peers === 0; } catch {}
    await new Promise<void>(resolve => { let done = false; const finish = () => { if (done) return; done = true; resolve(); };
      child.once("exit", finish); setTimeout(() => { if (child.exitCode === null && child.pid === exactPid) child.kill(); finish(); }, graceMs).unref?.(); });
    this.removePid(exactPid); if (this.child === child) this.child = null;
  }
  stopNow() { const child = this.child; this.child = null; if (child?.pid) try { child.kill(); } catch {} this.removePid(child?.pid); }
  private root() { return path.join(this.projectRoot, "tools", "webrtc-sidecar"); }
  private nodePath() { return path.join(this.root(), "runtime", "node-v22.17.1-win-x64", "node.exe"); }
  private appPath() { return path.join(this.root(), "app.cjs"); }
  private pidPath() { return path.join(this.root(), "run", "sidecar.pid"); }
  private writePid(pid: number) { fs.mkdirSync(path.dirname(this.pidPath()), { recursive: true }); fs.writeFileSync(this.pidPath(), `${pid}\n`, "utf8"); }
  private removePid(pid?: number) { try { if (!fs.existsSync(this.pidPath())) return; const recorded = Number(fs.readFileSync(this.pidPath(), "utf8").trim()); if (!pid || recorded === pid) fs.unlinkSync(this.pidPath()); } catch {} }
  private async ensureStarted() {
    if (this.child) return; if (this.starting) return this.starting; if (!this.supported()) throw new Error("Repository-local WebRTC sidecar is unavailable");
    this.starting = new Promise<void>((resolve, reject) => {
      this.token = crypto.randomBytes(32).toString("base64url"); this.shutdownAcknowledged = false;
      const child = spawn(this.nodePath(), [this.appPath()], { cwd: this.root(), windowsHide: true,
        env: { ...process.env, BRMEDIA_WEBRTC_SIDECAR_TOKEN: this.token, BRMEDIA_WEBRTC_SIDECAR_PORT: "0" }, stdio: ["pipe", "pipe", "pipe"] });
      this.child = child; let stdout = ""; let readySeen = false; const fail = (error: unknown) => { this.lastError = String((error as any)?.message || error); if (this.child === child) this.child = null; reject(error); };
      const timer = setTimeout(() => fail(new Error("WebRTC sidecar startup timed out")), 5000);
      child.stdout?.on("data", chunk => { stdout += chunk.toString("utf8"); const lines = stdout.split(/\r?\n/); stdout = lines.pop() || "";
        for (const line of lines.filter(Boolean)) try { const message = JSON.parse(line);
          if (message.type === "ready" && !readySeen) { if (message.pid !== child.pid || !message.port) throw new Error("invalid ready acknowledgement");
            readySeen = true; clearTimeout(timer); this.port = message.port; this.writePid(message.pid); resolve(); }
          else if (message.type === "peer-closed" && message.pid === child.pid) { const callback = this.pcmClosedCallbacks.get(String(message.id));
            this.pcmClosedCallbacks.delete(String(message.id)); try { callback?.(); } catch {} }
        } catch (error) { if (!readySeen) { clearTimeout(timer); fail(error); } } });
      child.stderr?.on("data", chunk => { this.lastError = (this.lastError + chunk.toString("utf8")).slice(-2000); });
      child.stdin?.on("drain", () => { const ids = [...this.pcmBackpressured]; this.pcmBackpressured.clear();
        for (const id of ids) for (const callback of this.pcmDrainCallbacks.get(id) || []) callback(); });
      child.stdin?.on("error", error => { this.pcmDisconnects += 1; this.lastError = String(error.message || error); for (const callback of this.pcmClosedCallbacks.values()) try { callback(); } catch {} });
      child.once("error", error => { clearTimeout(timer); fail(error); }); child.once("exit", (code, signal) => { clearTimeout(timer); this.removePid(child.pid); if (this.child === child) this.child = null;
        if (code && code !== 0) this.lastError = `Sidecar exited ${code}${signal ? ` (${signal})` : ""}`; });
    }).finally(() => { this.starting = null; }); return this.starting;
  }
  private writeMediaRecord(type: number, id: string, payload: Buffer) {
    const stdin = this.child?.stdin; if (!stdin || stdin.destroyed || !stdin.writable) return false;
    const idBytes = Buffer.from(id, "ascii");
    if (idBytes.length < 16 || idBytes.length > 64 || payload.length > 1024 * 1024) return false;
    const header = Buffer.alloc(16); header.write("BRM26BIN", 0, 8, "ascii"); header.writeUInt8(type, 8);
    header.writeUInt8(idBytes.length, 9); header.writeUInt32LE(payload.length, 12);
    return stdin.write(Buffer.concat([header, idBytes, payload]));
  }
  private request(method: string, requestPath: string, body?: unknown): Promise<SidecarReply> {
    return new Promise((resolve, reject) => { const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
      const request = http.request({ host: "127.0.0.1", port: this.port, method, path: requestPath,
        headers: { Authorization: `Bearer ${this.token}`, ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}) } }, response => {
        const chunks: Buffer[] = []; response.on("data", chunk => chunks.push(Buffer.from(chunk))); response.on("end", () => {
          try { const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); if ((response.statusCode || 500) >= 400) reject(new Error(value.error || `Sidecar HTTP ${response.statusCode}`)); else resolve(value); } catch (error) { reject(error); }
        }); }); request.setTimeout(7000, () => request.destroy(new Error("Sidecar request timed out"))); request.on("error", reject); if (payload) request.write(payload); request.end(); });
  }
}
