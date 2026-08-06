import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  analysisDetails, analysisSummary, appendAnalysisHistory, camelotForKey,
  classifyGridAlignment, harmonicCompatibility,
} from "./djM11Integration";

const track = {
  id: "m11-track", title: "Track", artist: "Artist", source: "local" as const, locator: "fixture.mp3",
  duration: 180, codec: "MP3", djGridBpm: 170.058, djGridDownbeat: 0.25, djGridBaseSet: true,
  djGridResolvedMode: "normal", djWaveformPrepared: true, djWaveformAsset: { reusable: true },
  djAnalysisStatus: "prepared", djAnalysisVersion: "m10", djAnalysisConfidence: 0.91,
  djKeyAnalysis: { key: "A minor", confidence: 0.9 }, djAnalysisReasonCodes: [],
};

test("M11 compact summaries expose prepared analysis without diagnostics", () => {
  const summary = analysisSummary(track as any);
  assert.equal(summary.preciseBpm, 170.058);
  assert.equal(summary.camelot, "8A");
  assert.equal(summary.tempoMode, "constant");
  assert.equal(summary.waveformStatus, "prepared");
  assert.equal("advanced" in summary, false);
});

test("M11 details are lazy, bounded, and preserve grid ownership", () => {
  const details = analysisDetails({ ...track, djGridLocked: true, djGridSource: "manual" } as any);
  assert.equal(details.grid.locked, true);
  assert.equal(details.grid.source, "manual");
  assert.ok(details.advanced);
});

test("M11 grid alignment distinguishes stale, BPM and phase mismatch", () => {
  assert.equal(classifyGridAlignment({ storedBpm: 170, liveBpm: 170, stale: true }), "unavailable");
  assert.equal(classifyGridAlignment({ storedBpm: 170, liveBpm: 172 }), "bpm-mismatch");
  assert.equal(classifyGridAlignment({ storedBpm: 170, liveBpm: 170, storedBeatTime: 1, liveBeatTime: 1.1 }), "phase-mismatch");
  assert.equal(classifyGridAlignment({ storedBpm: 170, liveBpm: 170, storedBeatTime: 1, liveBeatTime: 1.01 }), "aligned");
});

test("M11 harmonic hints require confident detected keys", () => {
  assert.equal(camelotForKey("A minor"), "8A");
  assert.equal(harmonicCompatibility({ key: "A minor", confidence: .9 }, { key: "C major", confidence: .9 }), "relative");
  assert.equal(harmonicCompatibility({ key: "A minor", confidence: .9 }, { key: "E minor", confidence: .9 }), "adjacent");
  assert.equal(harmonicCompatibility({ key: "A minor", confidence: .4 }, { key: "C major", confidence: .9 }), "uncertain");
});

test("M11 manual corrections create bounded history", () => {
  const item: any = { ...track, djAnalysisHistory: [] };
  appendAnalysisHistory(item, { action: "manual-grid-correction" });
  assert.equal(item.djAnalysisHistory.length, 1);
  assert.equal(item.djAnalysisHistory[0].action, "manual-grid-correction");
});

test("M11 routing keeps catalogue summaries compact and details lazy", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "api", "router.ts"), "utf8");
  assert.match(source, /djAnalysis: analysisSummary\(item\)/);
  assert.match(source, /\/dj-analysis\/tracks\//);
  assert.match(source, /analysis: analysisDetails\(item\)/);
  assert.match(source, /appendAnalysisHistory\(currentItem/);
});

test("M11 frontend shows compact fields and fetches detail on demand", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "public", "dj-mixer", "app.js"), "utf8");
  assert.match(source, /item\.djAnalysis\?\.preciseBpm/);
  assert.match(source, /item\.djAnalysis\?\.camelot/);
  assert.match(source, /data-dj-library-analysis-details/);
  const button = source.indexOf("[data-dj-library-analysis-details]");
  const fetchDetails = source.indexOf("`/dj-analysis/tracks/${encodeURIComponent(itemId)}`");
  assert.ok(button >= 0 && fetchDetails > button);
  assert.doesNotMatch(source.slice(button, fetchDetails), /queue\/start|force:\s*true/);
});