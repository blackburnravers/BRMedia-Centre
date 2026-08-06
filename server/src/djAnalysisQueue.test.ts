import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  DJ_ANALYSIS_GENERATION,
  DJ_ANALYSIS_PRODUCTION_APPROVAL,
  DjAnalysisQueue,
} from "./djAnalysisQueue";
import type { LibraryItem } from "./db/library";

const waitFor = async (predicate: () => boolean, timeout = 1500) => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) throw new Error("Timed out waiting for queue");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m9-"));
  const audio = path.join(root, "fixture.wav");
  fs.writeFileSync(audio, Buffer.from("protected-original-fixture"));
  const track: LibraryItem = {
    id: "track-1",
    title: "Fixture",
    source: "local",
    locator: audio,
    duration: 180,
    sourceOnline: true,
  };
  return { root, audio, queuePath: path.join(root, "queue.json"), track };
}

test("M9 queue is persistent, one-at-a-time, and preserves original files", async () => {
  const data = fixture();
  const before = crypto.createHash("sha256").update(fs.readFileSync(data.audio)).digest("hex");
  let active = 0;
  let maximum = 0;
  const queue = new DjAnalysisQueue(data.queuePath, {
    getTrack: () => data.track,
    listTracks: () => [data.track],
    analyse: async (_track, _force, progress) => {
      active += 1;
      maximum = Math.max(maximum, active);
      progress(50);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return { reviewRequired: false, reasonCodes: [] };
    },
  }, false);
  assert.equal(queue.enqueue([data.track.id]).added, 1);
  queue.start();
  await waitFor(() => queue.snapshot().totals.prepared === 1);
  assert.equal(maximum, 1);
  assert.equal(queue.snapshot().analysisVersion, DJ_ANALYSIS_GENERATION);
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(data.audio)).digest("hex"), before);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(data.queuePath, "utf8")));
});

test("M9 pause, resume, cancel pending, and duplicate prevention are truthful", async () => {
  const data = fixture();
  const second = { ...data.track, id: "track-2", title: "Second" };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const queue = new DjAnalysisQueue(data.queuePath, {
    getTrack: (id) => id === data.track.id ? data.track : second,
    listTracks: () => [data.track, second],
    analyse: async () => { await gate; return { reviewRequired: false, reasonCodes: [] }; },
  }, false);
  assert.equal(queue.enqueue([data.track.id, data.track.id, second.id]).added, 2);
  assert.equal(queue.enqueue([data.track.id]).skipped, 1);
  queue.start();
  await waitFor(() => queue.snapshot().totals.analysing === 1);
  queue.pause();
  assert.equal(queue.snapshot().status, "paused");
  assert.equal(queue.cancelPending().cancelled, 1);
  release();
  await waitFor(() => queue.snapshot().totals.prepared === 1);
  assert.equal(queue.snapshot().totals.cancelled, 1);
});

test("M9 restart recovery requeues interrupted work without losing completed work", () => {
  const data = fixture();
  fs.writeFileSync(data.queuePath, JSON.stringify({
    schemaVersion: 1,
    analysisVersion: DJ_ANALYSIS_GENERATION,
    status: "paused",
    updatedAt: new Date().toISOString(),
    items: [
      { trackId: "track-1", title: "A", status: "analysing", progressPercent: 67, stage: "Decoding", force: false, attempts: 1, error: null, reasonCodes: [], queuedAt: "", startedAt: "", finishedAt: null, analysisVersion: DJ_ANALYSIS_GENERATION },
      { trackId: "track-2", title: "B", status: "prepared", progressPercent: 100, stage: "Prepared", force: false, attempts: 1, error: null, reasonCodes: [], queuedAt: "", startedAt: "", finishedAt: "", analysisVersion: DJ_ANALYSIS_GENERATION },
    ],
  }));
  const queue = new DjAnalysisQueue(data.queuePath, {
    getTrack: () => data.track,
    listTracks: () => [data.track],
    analyse: async () => ({ reviewRequired: false, reasonCodes: [] }),
  }, false);
  const snapshot = queue.snapshot();
  assert.equal(snapshot.totals.pending, 1);
  assert.equal(snapshot.totals.prepared, 1);
  assert.equal(snapshot.items[0].stage, "Recovered after restart");
});

test("M9 current-version skip and force reanalyse are explicit", () => {
  const data = fixture();
  Object.assign(data.track, {
    djAnalysisVersion: DJ_ANALYSIS_GENERATION,
    djAnalysisStatus: "prepared",
    djAnalysisConfidence: 0.9,
    djWaveformPrepared: true,
    djWaveformAsset: { reusable: true },
  });
  const queue = new DjAnalysisQueue(data.queuePath, {
    getTrack: () => data.track,
    listTracks: () => [data.track],
    analyse: async () => ({ reviewRequired: false, reasonCodes: [] }),
  }, false);
  assert.equal(queue.enqueue([data.track.id]).skipped, 1);
  assert.equal(queue.enqueue([data.track.id], { force: true }).added, 1);
});

test("M9 Review Required and failed decode remain distinct retryable states", async () => {
  const data = fixture();
  let mode: "review" | "fail" = "review";
  const queue = new DjAnalysisQueue(data.queuePath, {
    getTrack: () => data.track,
    listTracks: () => [data.track],
    analyse: async () => {
      if (mode === "fail") throw new Error("decode failed");
      return { reviewRequired: true, reasonCodes: ["bpm-confidence-too-low"] };
    },
  }, false);
  queue.enqueue([data.track.id]);
  queue.start();
  await waitFor(() => queue.snapshot().totals.reviewRequired === 1);
  mode = "fail";
  queue.retry("review-required");
  queue.start();
  await waitFor(() => queue.snapshot().totals.failed === 1);
  assert.match(queue.snapshot().items[0].error || "", /decode failed/);
});

test("M9 API keeps full-catalogue production approval explicit", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "api", "router.ts"), "utf8");
  assert.match(source, /M9_PRODUCTION_APPROVAL_REQUIRED/);
  assert.match(source, /DJ_ANALYSIS_PRODUCTION_APPROVAL/);
  assert.doesNotMatch(source, /dj-analysis\/raw|dj-analysis\/queue\/path/);
});

test("M9 frontend exposes queue controls with bounded polling and no automatic start", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "public", "dj-mixer", "components", "analysis-queue-m9.js"), "utf8");
  for (const label of ["Analyse All", "Analyse selected", "Pause queue", "Resume queue", "Cancel pending", "Retry failed", "Force reanalyse"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /busy \? 2000 : 6000/);
  assert.doesNotMatch(source.slice(0, source.indexOf("addEventListener")), /\/start/);
});
