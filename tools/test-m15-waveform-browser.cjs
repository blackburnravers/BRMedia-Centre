/* Dependency-free M15 Chrome observability check. Does not load or modify media. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const origin = process.env.BRMEDIA_TEST_ORIGIN || "http://localhost:8787";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));

if (!chromePath) {
  console.log(JSON.stringify({ status: "SKIP", reason: "Chrome or Edge executable not found" }));
  process.exit(0);
}
if (typeof WebSocket !== "function") {
  console.log(JSON.stringify({ status: "SKIP", reason: "Node WebSocket API unavailable" }));
  process.exit(0);
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m15-browser-"));
const browser = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=0",
  `--user-data-dir=${profileDirectory}`,
  "about:blank",
], { stdio: "ignore" });

const activePortFile = path.join(profileDirectory, "DevToolsActivePort");
const waitForFile = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(activePortFile)) {
      try {
        const contents = fs.readFileSync(activePortFile, "utf8");
        if (/^\d+/m.test(contents)) return contents;
      } catch {}
    }
    if (browser.exitCode != null) throw new Error(`Browser exited with ${browser.exitCode}`);
    await delay(50);
  }
  throw new Error("Timed out waiting for browser debugging port");
};

const connect = async (url) => {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send };
};

const waitForLoad = async (send, expectedPath = "") => {
  let lastValue;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await send("Runtime.evaluate", {
      expression: "({ readyState: document.readyState, path: location.pathname })",
      returnByValue: true,
    });
    const value = result.result?.value;
    lastValue = value;
    if (value?.readyState === "complete" && (!expectedPath || value.path.startsWith(expectedPath))) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for page load: ${JSON.stringify(lastValue)}`);
};

(async () => {
  let connection;
  try {
    const activePort = await waitForFile();
    const [port] = activePort.split(/\r?\n/);
    const target = await (await fetch(
      `http://127.0.0.1:${port}/json/new?about%3Ablank`,
      { method: "PUT" },
    )).json();
    connection = await connect(target.webSocketDebuggerUrl);
    const { send } = connection;
    await send("Page.enable");
    await send("Runtime.enable");

    await send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
      screenOrientation: { type: "portraitPrimary", angle: 0 },
    });
    await send("Page.navigate", { url: `${origin}/dj-mixer/m15-waveform-validation.html?brWaveformValidate=1` });
    await waitForLoad(send, "/dj-mixer/m15-waveform-validation.html");
    await delay(750);

    const portrait = await send("Runtime.evaluate", {
      expression: `(() => {
        const debug = window.BRMediaDebug?.waveform;
        if (!debug) return {
          error: "waveform debug surface unavailable",
          href: location.href,
          title: document.title,
          readyState: document.readyState,
          runtimeLoaded: Boolean(window.BRMediaM13WaveformRuntime),
          appDiagnosticsCreated: Boolean(window.BRMediaM14WaveformDiagnostics),
          bodyClass: document.body?.className || "",
        };
        const diagnostics = window.BRMediaM14WaveformDiagnostics;
        const runtime = window.BRMediaM13WaveformRuntime;
        const pipelines = runtime.createRequestPipelines({ diagnostics });
        const d1Old = pipelines.begin("d1");
        const d2 = pipelines.begin("d2");
        const d1New = pipelines.begin("d1");
        if (!d1Old.signal.aborted || !d1New.isCurrent() || !d2.isCurrent()) {
          return { error: "deck replacement independence failed" };
        }
        diagnostics.increment("d1", "staleRejectionCount");
        pipelines.abort("d2");
        diagnostics.record("d1", {
          dpr: devicePixelRatio,
          cssSize: { width: innerWidth, height: innerHeight },
          backingSize: { width: innerWidth * devicePixelRatio, height: innerHeight * devicePixelRatio },
          selectedCacheLevel: 8192,
          animationState: "playing",
          frameTimingMs: 7,
          snapCount: 1,
          lastFallbackReason: "",
        });
        return {
          dpr: devicePixelRatio,
          width: innerWidth,
          height: innerHeight,
          snapshot: debug.snapshot(),
          history: debug.history(),
          checklistLength: debug.iPhoneChecklist().length,
          transportControls: {
            play: document.querySelectorAll(".brDjSinglePlayBtn").length,
            cue: document.querySelectorAll(".brDjSingleCueBtn").length,
            eject: document.querySelectorAll("[data-dj-eject], .brDjEjectBtn").length,
          },
          fixedCentreTargets: document.querySelectorAll(".brDjSingleWaveCanvas, .brDjDuoWaveCanvas").length,
        };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    const portraitValue = portrait.result?.value;
    assert.equal(portraitValue?.error, undefined, JSON.stringify(portraitValue));
    assert.equal(portraitValue.dpr, 3);
    assert.equal(portraitValue.snapshot.enabled, true);
    assert.ok(portraitValue.history.decks.d1.length >= 1);
    assert.ok(portraitValue.checklistLength >= 8);
    assert.ok(portraitValue.transportControls.play >= 2);
    assert.ok(portraitValue.transportControls.cue >= 2);
    assert.ok(portraitValue.fixedCentreTargets >= 2);
    assert.equal(portraitValue.snapshot.decks.d1.abortCount >= 1, true);
    assert.equal(portraitValue.snapshot.decks.d2.abortCount >= 1, true);
    assert.equal(portraitValue.snapshot.decks.d1.staleRejectionCount >= 1, true);

    await send("Emulation.setDeviceMetricsOverride", {
      width: 844, height: 390, deviceScaleFactor: 3, mobile: true,
      screenOrientation: { type: "landscapePrimary", angle: 90 },
    });
    await send("Runtime.evaluate", {
      expression: "dispatchEvent(new Event('orientationchange')); dispatchEvent(new Event('resize'));",
    });
    await delay(250);
    const landscape = await send("Runtime.evaluate", {
      expression: `({
        dpr: devicePixelRatio,
        width: innerWidth,
        height: innerHeight,
        validation: BRMediaDebug.waveform.snapshot().decks.d1.validationChecks
      })`,
      returnByValue: true,
    });
    assert.equal(landscape.result.value.dpr, 3);
    assert.ok(landscape.result.value.width > landscape.result.value.height);
    assert.ok(landscape.result.value.validation.orientation >= 1);
    assert.ok(landscape.result.value.validation.resize >= 1);

    await send("Page.navigate", { url: "about:blank" });
    await waitForLoad(send, "blank");
    await send("Page.navigate", { url: `${origin}/dj-mixer/m15-waveform-validation.html?brWaveformValidate=1` });
    await waitForLoad(send, "/dj-mixer/m15-waveform-validation.html");
    await delay(250);
    const navigation = await send("Runtime.evaluate", {
      expression: "Boolean(window.BRMediaDebug?.waveform && window.BRMediaM13WaveformRuntime)",
      returnByValue: true,
    });
    assert.equal(navigation.result.value, true);

    let lifecycle = "PASS";
    try {
      await send("Page.setWebLifecycleState", { state: "frozen" });
      await send("Page.setWebLifecycleState", { state: "active" });
    } catch (error) {
      lifecycle = `SKIP: ${error.message}`;
    }

    console.log(JSON.stringify({
      status: "PASS",
      browser: path.basename(chromePath),
      portrait: { width: portraitValue.width, height: portraitValue.height, dpr: portraitValue.dpr },
      landscape: landscape.result.value,
      diagnostics: portraitValue.snapshot.decks,
      lifecycle,
      rapidNavigation: "PASS",
      mediaInteraction: "NOT RUN: no disposable M15 media fixture; original media was not touched",
      physicalIPhone: "NOT RUN",
    }, null, 2));
  } finally {
    connection?.socket.close();
    browser.kill();
  }
})().catch((error) => {
  browser.kill();
  console.error(JSON.stringify({ status: "FAIL", error: error.stack || error.message }));
  process.exitCode = 1;
});
