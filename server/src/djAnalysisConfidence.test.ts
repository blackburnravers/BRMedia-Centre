import assert from "node:assert/strict";
import test from "node:test";
import { combineDjConfidence, evaluateDjConfidence, normaliseDjConfidence, smoothDjConfidence } from "./djAnalysisConfidence";
import { createDjImplementationFingerprint, DJ_IMPLEMENTATION_VERSIONS } from "./djPreparedAssets";

test("B7 normalises every confidence to a deterministic six-decimal unit value", () => {
  assert.equal(normaliseDjConfidence(-2), 0); assert.equal(normaliseDjConfidence(2), 1); assert.equal(normaliseDjConfidence(0.12345678), 0.123457); assert.equal(normaliseDjConfidence(NaN), 0);
});
test("B7 identical evidence produces identical diagnostics", () => { const e=[{id:"bpm",value:.82,weight:2},{id:"onset",value:.7,repetitions:4}]; assert.deepEqual(evaluateDjConfidence(e),evaluateDjConfidence(e)); });
test("B7 repeated strong evidence outweighs one weak detector", () => { const repeated=combineDjConfidence([{id:"stable",value:.9,repetitions:9},{id:"weak",value:.2}]); const weak=combineDjConfidence([{id:"stable",value:.9},{id:"weak",value:.2,repetitions:9}]); assert.ok(repeated>weak); });
test("B7 isolated confidence spikes have bounded influence", () => { const base=combineDjConfidence([{id:"a",value:.55},{id:"b",value:.56},{id:"c",value:.54}]); const spike=combineDjConfidence([{id:"a",value:.55},{id:"b",value:.56},{id:"c",value:.54},{id:"spike",value:1}]); assert.ok(Math.abs(spike-base)<.18); });
test("B7 conflicting evidence reduces confidence", () => { const support=[{id:"a",value:.8},{id:"b",value:.82}] as const; assert.ok(combineDjConfidence(support)>combineDjConfidence([...support,{id:"live-conflict",value:.8,polarity:"conflict"}])); });
test("B7 reliability limits weak detector influence", () => { const low=combineDjConfidence([{id:"stable",value:.8},{id:"weak",value:.1,reliability:.05}]); const high=combineDjConfidence([{id:"stable",value:.8},{id:"weak",value:.1,reliability:1}]); assert.ok(low>high); });
test("B7 smoothing prevents large confidence oscillation", () => { const smoothed=smoothDjConfidence(.7,.9); assert.ok(smoothed>.7&&smoothed<.9); assert.equal(smoothed,smoothDjConfidence(.7,.9)); });
test("B7 diagnostics are bounded, structured and developer-only data", () => { const d=evaluateDjConfidence([{id:"phrase",value:.7},{id:"boundary",value:.6}]); for(const value of [d.score,d.support,d.conflict,d.agreement,d.coverage])assert.ok(value>=0&&value<=1); assert.deepEqual(d.contributions.map(x=>x.id),["phrase","boundary"]); });

test("B7 plumbing preserves existing prepared-asset fingerprints", () => { const changed={...DJ_IMPLEMENTATION_VERSIONS,confidenceEngine:"unified-confidence-future"}; for(const type of ["prepared-waveform","waveform-detail","prepared-analysis","bpm-analysis","downbeat-analysis","dynamic-analysis","beat-grid"] as const) assert.equal(createDjImplementationFingerprint(type).value,createDjImplementationFingerprint(type,changed).value); });
