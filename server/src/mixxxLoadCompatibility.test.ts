import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { canonicaliseMixxxWindowsPath, detectMixxxLoadCapabilities, MixxxLoadCompatibilityProvider, parseMixxxLoadRequest } from "./mixxxLoadCompatibility";

function fixture(declaredApi = "", executor?: (deck: 1 | 2, filePath: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-mixxx-load-"));
  const filePath = path.join(root, "track.mp3"); fs.writeFileSync(filePath, "fixture");
  const provider = new MixxxLoadCompatibilityProvider((identity) => {
    if (identity !== "mixxx:42") throw Object.assign(new Error("Track not found"), { code: "TRACK_NOT_FOUND" });
    return { id: identity, filePath, filename: "track.mp3" };
  }, root, "2.5.6", declaredApi, executor || (declaredApi ? (() => undefined) : undefined));
  return { root, filePath, provider };
}

const request = (patch: Record<string, unknown> = {}) => ({
  protocolVersion: 5, sourceSession: "browser-session-1", requestId: "request_0001",
  commandSequence: 1, deck: 1, catalogueIdentity: "mixxx:42", catalogueRevision: 123,
  autoplay: false, replacePlayingDeck: false, clientGeneration: 1, ...patch,
});
const context = (patch: Record<string, unknown> = {}) => ({ bridgeHealthy: true, nativePlaybackActive: false, deckPlaying: false, sessionEpoch: 7, ...patch } as any);

test("Mixxx 2.5.6 capability detection is explicitly unsupported", () => {
  const capabilities = detectMixxxLoadCapabilities("2.5.6");
  assert.equal(capabilities.arbitraryPathLoad, false);
  assert.equal(capabilities.selectedRowLoad, true);
  assert.equal(capabilities.deckSpecificLoad, false);
  assert.equal(capabilities.supported, false);
});

test("capability requires an explicit reviewed API declaration, never a version guess", () => {
  assert.equal(detectMixxxLoadCapabilities("99.0.0").supported, false);
  assert.equal(detectMixxxLoadCapabilities("reviewed", "engine-load-track-v1").supported, true);
});

test("Mixxx load paths are canonical Windows paths regardless of slash style", () => {
  assert.equal(canonicaliseMixxxWindowsPath("H:/Music/Hardcore/track.mp3"), "H:\\Music\\Hardcore\\track.mp3");
  assert.equal(canonicaliseMixxxWindowsPath("H:\\Music\\Hardcore\\track.mp3"), "H:\\Music\\Hardcore\\track.mp3");
  assert.equal(canonicaliseMixxxWindowsPath("H:/Music\\Hardcore/track.mp3"), "H:\\Music\\Hardcore\\track.mp3");
});

test("provider sends the authorised real path to the executor", () => {
  let received = "";
  const { filePath, provider } = fixture("engine-load-track-v1", (_deck, canonicalPath) => { received = canonicalPath; });
  assert.equal(provider.submit(request(), context()).state, "requested");
  assert.equal(received, fs.realpathSync.native(filePath));
});

test("provider capability also requires a real reviewed executor", () => {
  const { root, filePath } = fixture();
  const declaredOnly = new MixxxLoadCompatibilityProvider(() => ({ id: "mixxx:42", filePath, filename: "track.mp3" }), root, "reviewed", "engine-load-track-v1");
  assert.equal(declaredOnly.capabilities.supported, false);
});

test("load schema enforces deck, protocol, identity, ordering and no autoplay", () => {
  assert.equal(parseMixxxLoadRequest(request()).deck, 1);
  for (const patch of [{ deck: 3 }, { protocolVersion: 6 }, { catalogueIdentity: "H:\\Music\\x.mp3" }, { autoplay: true }, { commandSequence: 0 }, { clientGeneration: 0 }])
    assert.throws(() => parseMixxxLoadRequest(request(patch)));
});

test("unsupported runtime preserves a truthful retryable deck reservation", () => {
  const { provider } = fixture(); const ack = provider.submit(request(), context());
  assert.equal(ack.errorCode, "UNSUPPORTED_RUNTIME"); assert.equal(ack.accepted, false);
  assert.equal(provider.status(1)?.stableIdentity, "mixxx:42");
});

test("approved root, missing file and audio type are enforced", () => {
  const { root } = fixture();
  const outside = path.join(path.dirname(root), "outside.mp3"); fs.writeFileSync(outside, "x");
  const outsideProvider = new MixxxLoadCompatibilityProvider(() => ({ id: "mixxx:42", filePath: outside, filename: "outside.mp3" }), root);
  assert.equal(outsideProvider.submit(request(), context()).errorCode, "PATH_OUTSIDE_ROOT");
  const missing = new MixxxLoadCompatibilityProvider(() => ({ id: "mixxx:42", filePath: path.join(root, "missing.mp3"), filename: "missing.mp3" }), root);
  assert.equal(missing.submit(request(), context()).errorCode, "FILE_MISSING");
  const text = path.join(root, "track.txt"); fs.writeFileSync(text, "x");
  const codec = new MixxxLoadCompatibilityProvider(() => ({ id: "mixxx:42", filePath: text, filename: "track.txt" }), root);
  assert.equal(codec.submit(request(), context()).errorCode, "UNSUPPORTED_CODEC");
});

test("bridge, Native authority and playing-deck replacement guards precede execution", () => {
  const { provider } = fixture("engine-load-track-v1");
  assert.equal(provider.submit(request(), context({ bridgeHealthy: false })).errorCode, "BRIDGE_UNHEALTHY");
  assert.equal(fixture("engine-load-track-v1").provider.submit(request(), context({ nativePlaybackActive: true })).errorCode, "NATIVE_AUTHORITY");
  assert.equal(fixture("engine-load-track-v1").provider.submit(request(), context({ deckPlaying: true })).errorCode, "DECK_PLAYING");
  const accepted = fixture("engine-load-track-v1").provider.submit(request({ replacePlayingDeck: true }), context({ deckPlaying: true }));
  assert.equal(accepted.state, "requested"); assert.equal((request({ replacePlayingDeck: true }) as any).autoplay, false);
});

test("compatible executor failure is acknowledged without optimistic loaded state", () => {
  const { provider } = fixture("engine-load-track-v1", () => { throw new Error("controller rejected load"); });
  const ack = provider.submit(request(), context());
  assert.equal(ack.accepted, false);
  assert.equal(ack.state, "failed");
  assert.equal(ack.errorCode, "MIXXX_LOAD_FAILURE");
});

test("duplicate suppression and generation replacement are deterministic per deck", () => {
  const { provider } = fixture();
  const first = provider.submit(request(), context());
  assert.equal(provider.submit(request(), context()), first);
  assert.equal(provider.submit(request({ requestId: "request_0002", clientGeneration: 1 }), context()).errorCode, "STALE_REQUEST");
  assert.equal(provider.submit(request({ requestId: "request_0003", clientGeneration: 2 }), context()).errorCode, "UNSUPPORTED_RUNTIME");
  assert.equal(provider.status(1)?.requestId, "request_0003");
});

test("identity confirmation rejects mismatch and old sessions", () => {
  const { provider } = fixture("engine-load-track-v1");
  provider.submit(request(), context());
  assert.equal(provider.confirmLoaded(1, "request_0001", "mixxx:99", 7, 10), false);
  assert.equal(provider.status(1)?.errorCode, "IDENTITY_MISMATCH");
  const next = fixture("engine-load-track-v1").provider; next.submit(request(), context());
  assert.equal(next.confirmLoaded(1, "request_0001", "mixxx:42", 6, 10), false);
  assert.equal(next.confirmLoaded(1, "request_0001", "mixxx:42", 7, 11), true);
  assert.equal(next.status(1)?.state, "loaded");
});

test("wrong-deck and stale acknowledgements cannot promote pending identity", () => {
  const { provider } = fixture("engine-load-track-v1"); provider.submit(request(), context());
  assert.equal(provider.accept("request_0001", 2, 7), false);
  assert.equal(provider.confirmLoaded(2, "request_0001", "mixxx:42", 7, 9), false);
  assert.equal(provider.confirmLoaded(1, "request_0001", "mixxx:42", 6, 10), false);
  assert.equal(provider.status(1)?.state, "requested");
});

test("failed load never promotes a pending identity and unload removes it", () => {
  const { provider } = fixture("engine-load-track-v1"); provider.submit(request(), context());
  assert.equal(provider.fail("request_0001", 1, 7), true);
  assert.equal(provider.status(1)?.state, "failed");
  assert.notEqual(provider.status(1)?.state, "loaded");
  provider.unload(1); assert.equal(provider.status(1), null);
});

test("timeout, unload, reconnect and external load clear or fail identity truthfully", () => {
  const { provider } = fixture("engine-load-track-v1"); provider.submit(request(), context());
  provider.expire(Date.now() + 20_000); assert.equal(provider.status(1)?.errorCode, "LOAD_TIMEOUT");
  provider.unload(1); assert.equal(provider.status(1), null);
  provider.submit(request({ requestId: "request_0002", clientGeneration: 2 }), context());
  provider.beginSession(8); assert.equal(provider.status(1)?.errorCode, "SESSION_CHANGED");
  assert.deepEqual(provider.externalLoad(1), { deck: 1, stableIdentity: null, externallyLoaded: true });
  assert.equal(provider.status(1), null);
});
