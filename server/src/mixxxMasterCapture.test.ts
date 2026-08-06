import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { WasapiLoopbackCaptureFactory, M26_MIXXX_RENDER_ENDPOINT } from "./mixxxMasterCapture";

test("M26 capture pins the canonical explicit render endpoint and exposes no microphone selector", () => {
  assert.match(M26_MIXXX_RENDER_ENDPOINT, /^\{0\.0\.0\.00000000\}\.\{[0-9a-f-]+\}$/i);
  const source = require("node:fs").readFileSync("server/src/mixxxMasterCapture.ts", "utf8");
  assert.match(source, /--capture-endpoint/);
  assert.doesNotMatch(source, /getUserMedia|enumerateDevices|GetDefaultAudioEndpoint|eCapture/);
});

test("M26 capture rejects unsupported hosts truthfully", () => {
  const factory = new WasapiLoopbackCaptureFactory({ projectRoot: process.cwd(), platform: "linux" });
  assert.equal(factory.supported(), false);
  assert.throws(() => factory.start({ data() {}, error() {}, exit() {} }), /unavailable/);
});

test("M26 capture suppresses duplicate process starts and stop is idempotent", () => {
  const fs = require("node:fs");
  const originalExists = fs.existsSync;
  fs.existsSync = () => true;
  const children: any[] = [];
  const spawnChild = () => { const child: any = new EventEmitter(); child.stdout = new PassThrough(); child.stdin = new PassThrough();
    child.stderr = new PassThrough(); child.killCalls = 0; child.kill = () => { child.killCalls += 1; }; children.push(child); return child; };
  try {
    const factory = new WasapiLoopbackCaptureFactory({
      projectRoot: process.cwd(), platform: "win32",
      spawnProcess: (() => spawnChild()) as any,
      compile: (() => ({ status: 0, stdout: "", stderr: "" })) as any,
    });
    (factory as any).compiled = true;
    const processHandle = factory.start({ data() {}, error() {}, exit() {} });
    assert.throws(() => factory.start({ data() {}, error() {}, exit() {} }), /already running/);
    processHandle.stop(); processHandle.stop();
    assert.equal(children.length, 2); assert.equal(children[0].killCalls, 1); assert.equal(children[1].killCalls, 1);
  } finally { fs.existsSync = originalExists; }
});
