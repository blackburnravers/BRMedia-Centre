import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createDjImplementationFingerprint,
  createDjPreparedAssetMetadata,
  createDjSourceFingerprint,
  DJ_IMPLEMENTATION_VERSIONS,
  normaliseDjSourcePathIdentity,
  validateDjPreparedAsset,
  writeDjPreparedAssetJsonAtomically,
} from "./djPreparedAssets";

function fixture(contents = Buffer.alloc(1024, 7)) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-dj-b1-"));
  const file = path.join(root, "Track.WAV");
  fs.writeFileSync(file, contents);
  return { root, file };
}

function fingerprint(file: string) {
  const result = createDjSourceFingerprint(file, {
    duration: 60,
    sampleRate: 44100,
    channelCount: 2,
    codec: "pcm",
  });
  assert.equal(result.status, "ok");
  return result.status === "ok" ? result.fingerprint : assert.fail("missing fingerprint");
}

test("source fingerprint is deterministic and normalises Windows identity", () => {
  const { file } = fixture();
  assert.deepEqual(fingerprint(file), fingerprint(file));
  assert.equal(
    normaliseDjSourcePathIdentity("C:\\Music\\RAVE\\Track.WAV", "win32"),
    normaliseDjSourcePathIdentity("c:/music/rave/track.wav", "win32"),
  );
});

test("size, timestamp and same-path replacement change source fingerprint", () => {
  const { file } = fixture();
  const original = fingerprint(file);
  fs.appendFileSync(file, Buffer.from([1]));
  const resized = fingerprint(file);
  assert.notEqual(resized.value, original.value);

  const changedTime = new Date(Date.now() + 4000);
  fs.utimesSync(file, changedTime, changedTime);
  const retimed = fingerprint(file);
  assert.notEqual(retimed.value, resized.value);

  const stat = fs.statSync(file);
  fs.writeFileSync(file, Buffer.alloc(stat.size, 9));
  fs.utimesSync(file, changedTime, changedTime);
  assert.notEqual(fingerprint(file).value, retimed.value);
});

test("large files use bounded region reads and missing files are structured", () => {
  const { file } = fixture(Buffer.alloc(1024 * 1024, 3));
  const value = fingerprint(file);
  assert.ok(value.bytesRead <= 3 * 64 * 1024);
  const missing = createDjSourceFingerprint(`${file}.missing`);
  assert.deepEqual(missing, { status: "missing", reason: "source-file-missing" });
});

test("implementation fingerprints are stable and independently scoped", () => {
  assert.deepEqual(
    createDjImplementationFingerprint("prepared-waveform"),
    createDjImplementationFingerprint("prepared-waveform"),
  );
  const waveformChanged = { ...DJ_IMPLEMENTATION_VERSIONS, preparedWaveformFormat: "future-v2" };
  assert.notEqual(
    createDjImplementationFingerprint("prepared-waveform", waveformChanged).value,
    createDjImplementationFingerprint("prepared-waveform").value,
  );
  assert.equal(
    createDjImplementationFingerprint("beat-grid", waveformChanged).value,
    createDjImplementationFingerprint("beat-grid").value,
  );
});

test("compatibility distinguishes source, implementation, legacy and protection", () => {
  const { file } = fixture();
  const source = fingerprint(file);
  const metadata = createDjPreparedAssetMetadata({
    assetType: "prepared-waveform",
    assetFormatVersion: "multiband-v1",
    sourceFingerprint: source,
    generator: "test",
  });
  assert.equal(validateDjPreparedAsset(metadata, {
    assetType: "prepared-waveform",
    sourceFingerprint: source,
    assetFormatVersion: "multiband-v1",
  }).status, "compatible");
  assert.equal(validateDjPreparedAsset(null, {
    assetType: "prepared-waveform",
    legacySafe: true,
  }).status, "legacy-compatible");
  assert.equal(validateDjPreparedAsset(metadata, {
    assetType: "prepared-waveform",
    sourceFingerprint: { ...source, value: "changed" },
  }).status, "stale-source");
  assert.equal(validateDjPreparedAsset(metadata, {
    assetType: "prepared-waveform",
    sourceFingerprint: source,
    implementationVersions: { ...DJ_IMPLEMENTATION_VERSIONS, preparedWaveformFormat: "future-v2" },
  }).status, "stale-implementation");
  assert.equal(validateDjPreparedAsset(metadata, {
    assetType: "beat-grid",
    locked: true,
  }).status, "locked-protected");
  assert.equal(validateDjPreparedAsset(metadata, {
    assetType: "beat-grid",
    manual: true,
  }).status, "manual-protected");
});

test("unknown future and corrupt metadata are never silently accepted", () => {
  assert.equal(validateDjPreparedAsset({ metadataVersion: 99 }, {
    assetType: "prepared-waveform",
  }).status, "unknown-version");
  assert.equal(validateDjPreparedAsset("broken", {
    assetType: "prepared-waveform",
  }).status, "corrupt");
});

test("valid waveform and grid compatibility are independent", () => {
  const { file } = fixture();
  const source = fingerprint(file);
  const waveform = createDjPreparedAssetMetadata({
    assetType: "prepared-waveform",
    assetFormatVersion: "multiband-v1",
    sourceFingerprint: source,
    generator: "test",
  });
  const grid = createDjPreparedAssetMetadata({
    assetType: "beat-grid",
    assetFormatVersion: "dj-grid-v2",
    sourceFingerprint: source,
    generator: "test",
  });
  const versions = { ...DJ_IMPLEMENTATION_VERSIONS, bpmAnalysis: "future-bpm" };
  assert.equal(validateDjPreparedAsset(waveform, {
    assetType: "prepared-waveform",
    sourceFingerprint: source,
    implementationVersions: versions,
  }).status, "compatible");
  assert.equal(validateDjPreparedAsset(grid, {
    assetType: "beat-grid",
    sourceFingerprint: source,
    implementationVersions: { ...versions, gridSchema: "future-grid" },
  }).status, "stale-implementation");
});

test("atomic metadata write leaves no partial temporary file", () => {
  const { root } = fixture();
  const target = path.join(root, "cache", "asset.json");
  writeDjPreparedAssetJsonAtomically(target, { complete: true });
  assert.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), { complete: true });
  assert.deepEqual(fs.readdirSync(path.dirname(target)).filter((name) => name.endsWith(".tmp")), []);
});
