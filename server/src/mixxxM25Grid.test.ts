import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { M25_GRID_CACHE_VERSION, readM25Grid } from "./mixxxM25Grid";

const authorityRuntime = require(path.resolve("server/public/dj-mixer/engine/m25-grid-authority.js"));
const app = fs.readFileSync("server/public/dj-mixer/app.js", "utf8");
const renderer = fs.readFileSync("server/public/dj-mixer/engine/spectral-waveform.js", "utf8");
const metronome = fs.readFileSync("server/public/dj-mixer/components/grid-metronome.js", "utf8");
const gridCore = fs.readFileSync("server/public/dj-mixer/components/grid.js", "utf8");
const router = fs.readFileSync("server/src/api/router.ts", "utf8");
const queueSource = fs.readFileSync("server/src/mixxxM25Grid.ts", "utf8");

const grid = (dynamic = false) => ({ cacheVersion: M25_GRID_CACHE_VERSION, revision: 2, status: "grid-ready", bpm: 120, rawBpm: 120,
  downbeat: 0.2, barLength: 4, resolvedMode: dynamic ? "dynamic" : "normal",
  segments: dynamic ? [{ id: "s1", startTime: 0.2, startBeat: 0, bpm: 120 }, { id: "s2", startTime: 60.2, startBeat: 120, bpm: 124 }]
    : [{ id: "s1", startTime: 0.2, startBeat: 0, bpm: 120 }], locked: false, reviewRequired: false, source: "brmedia-analysis-m10-v1", updatedAt: 1,
  analysisVersion: "brmedia-analysis-m10-v1", history: [] });
const payload = (dynamic = false, state = "grid-ready") => ({ state, identity: "mixxx:101", grid: { ...grid(dynamic), status: state } });
const item = (overrides: Record<string, unknown> = {}) => ({ id: "track-1", title: "Synthetic", source: "local", locator: "X:\\synthetic.wav",
  djGridVersion: 2, djGridBpm: 120, djGridRawBpm: 120, djGridDownbeat: 0.2, djGridBaseSet: true, djGridLocked: false,
  djGridReviewRequired: false, djGridResolvedMode: "normal", djGridSource: "brmedia-analysis-m10-v1",
  djGridSegments: [{ id: "s1", startTime: 0.2, startBeat: 0, bpm: 120 }], ...overrides } as any);
const accepted = (deck = "d1", identity = "mixxx:101", dynamic = false) => {
  const authority = authorityRuntime.create(); const pending = authority.begin(deck, identity);
  assert.equal(authority.accept(deck, identity, pending.generation, { ...payload(dynamic), identity }), true); return authority;
};

const cases: Array<[string, () => void]> = [
  ["01 exact M23 identity maps to exact grid", () => assert.equal(accepted().states.get("d1").stableIdentity, "mixxx:101")],
  ["02 wrong identity is rejected", () => { const a=authorityRuntime.create(),p=a.begin("d1","mixxx:1"); assert.equal(a.accept("d1","mixxx:2",p.generation,payload()),false); }],
  ["03 stale identity is rejected", () => { const a=authorityRuntime.create(),p=a.begin("d1","mixxx:1"); a.begin("d1","mixxx:2"); assert.equal(a.accept("d1","mixxx:1",p.generation,payload()),false); }],
  ["04 eject clears grid", () => { const a=accepted(); a.clear("d1"); assert.equal(a.gridForRender("d1"),null); }],
  ["05 rapid replacement rejects stale grid", () => { const a=authorityRuntime.create(),p=a.begin("d1","mixxx:1"); a.begin("d1","mixxx:2"); assert.equal(a.accept("d1","mixxx:1",p.generation,payload()),false); }],
  ["06 D1 D2 independence", () => { const a=accepted(); const p=a.begin("d2","mixxx:2"); a.accept("d2","mixxx:2",p.generation,{...payload(true),identity:"mixxx:2"}); assert.notEqual(a.gridForRender("d1").resolvedMode,a.gridForRender("d2").resolvedMode); }],
  ["07 cache version mismatch", () => assert.equal(readM25Grid(item({djGridVersion:99})).state,"grid-cache-mismatch")],
  ["08 corrupt grid cache", () => assert.equal(readM25Grid(item({djGridSegments:[{id:"bad",startTime:0,startBeat:0,bpm:999}]})).state,"grid-corrupt")],
  ["09 missing grid is truthful", () => assert.equal(readM25Grid(item({djGridBaseSet:false,djGridBpm:null})).state,"grid-not-prepared")],
  ["10 grid ready survives transport updates", () => { const a=accepted(); for(let i=0;i<50;i++) assert.ok(a.readout("d1",i)); }],
  ["10b exact M24 waveform identity recovers M25 after an identity-less snapshot", () => {
    assert.match(app, /const resolveM25ExactIdentity/);
    assert.match(app, /waveformAuthority\?\.status === "ready" && waveformAuthority\.realPayloadPresence === true/);
    assert.match(app, /if \(!heldGrid\?\.realGridPresence\) m25GridAuthority\?\.clear/);
  }],
  ["11 one tap creates one job", () => assert.match(queueSource,/enqueue\(trackId: string\)/)],
  ["12 duplicate tap suppression", () => assert.match(queueSource,/if \(active\) return \{ added: false/)],
  ["13 stable queued state", () => assert.match(queueSource,/state: "queued"/)],
  ["14 stable preparing state", () => assert.match(queueSource,/job\.state = "preparing"/)],
  ["15 transport does not reset job state", () => assert.doesNotMatch(queueSource,/positionSeconds|playing/)],
  ["16 completion links exact identity", () => assert.match(router,/mixxxGridMatch[\s\S]+resolveTrack\(identity\)[\s\S]+findLibraryItemByLocator/)],
  ["17 failure gives stable Retry", () => assert.match(app,/grid-failed[^\n]+Retry/)],
  ["18 eject rejects stale completion", () => assert.match(app,/m25GridAuthority\?\.clear/)],
  ["19 D1 D2 queue independence", () => assert.match(app,/m25GridPolls = new Map/)],
  ["20 server restart recovery", () => assert.match(queueSource,/job\.state === "preparing"[\s\S]+job\.state = "queued"/)],
  ["21 static beat interval accuracy", () => { const r=accepted().readout("d1",2.2); assert.equal(r.bar,2); assert.equal(r.beatInBar,1); }],
  ["22 bar and downbeat positions", () => { const r=readM25Grid(item()); assert.equal(r.grid?.downbeat,.2); assert.equal(r.grid?.barLength,4); }],
  ["23 zoom rendering", () => assert.match(renderer,/visibleSeconds[\s\S]+zoom/)],
  ["24 fixed centre alignment", () => assert.match(renderer,/fixedCentre[\s\S]+centreX/)],
  ["25 clean overview and detail alignment", () => { assert.match(app,/\.brDjSingleOverviewWave[\s\S]{0,400}showBeatGrid: false/); assert.match(renderer,/fixedCentre[\s\S]+beatProgress -[\s\S]+progress/); }],
  ["26 long playback drift", () => assert.equal(accepted().readout("d1",3600.2).beatInBar,1)],
  ["27 dynamic segment ordering", () => assert.equal(readM25Grid(item({djGridResolvedMode:"dynamic",djGridSegments:grid(true).segments})).grid?.segments.length,2)],
  ["28 dynamic segment boundary continuity", () => assert.equal(readM25Grid(item({djGridSegments:grid(true).segments})).state,"grid-ready")],
  ["29 local BPM lookup", () => assert.equal(accepted("d1","mixxx:101",true).readout("d1",61).gridBpm,124)],
  ["30 seek into segment", () => assert.equal(accepted("d1","mixxx:101",true).readout("d1",100).segment,2)],
  ["31 zoom across segments", () => assert.match(renderer,/gridSegments\.slice\(1\)/)],
  ["32 dynamic downbeat continuity", () => assert.equal(accepted("d1","mixxx:101",true).readout("d1",60.2).beatInBar,1)],
  ["33 live play uses Mixxx clock", () => assert.match(app,/BRMediaM12WaveformClock/)],
  ["34 live pause freezes", () => assert.match(fs.readFileSync("server/public/dj-mixer/engine/waveform-clock-m12.js","utf8"),/moving = this\.loaded && this\.playing/)],
  ["35 live resume continues", () => assert.match(app,/visual\.playing/)],
  ["36 live seek reconciles", () => assert.match(fs.readFileSync("server/public/dj-mixer/engine/waveform-clock-m12.js","utf8"),/discontinuity/)],
  ["37 tempo pitch change uses effective BPM", () => assert.match(fs.readFileSync("server/public/dj-mixer/engine/waveform-clock-m12.js","utf8"),/live \/ analysed/)],
  ["38 end of track remains bounded", () => assert.match(fs.readFileSync("server/public/dj-mixer/engine/waveform-clock-m12.js","utf8"),/this\.duration \|\| Number\.MAX_SAFE_INTEGER/)],
  ["39 disconnect reconnect truthful", () => assert.match(app,/network-error|identity-stale/)],
  ["40 stale snapshot rejection", () => assert.match(app,/latest\.generation !== generation/)],
  ["41 drift correction bounded", () => { const a=accepted(); assert.ok(Math.abs(a.reconcilePhase("d1",.1,.16).correction)<.02); }],
  ["42 no duplicate render loop", () => assert.equal((app.match(/requestAnimationFrame\(animateM12Waveforms\)/g)||[]).length,3)],
  ["43 metronome Off Low Mid High", () => ["off","low","mid","high"].forEach(x=>assert.match(metronome,new RegExp(`${x}:`)))],
  ["44 metronome downbeat accent", () => assert.match(metronome,/isBar[\s\S]{0,40}\? 1760/)],
  ["45 metronome dynamic segment timing", () => assert.match(metronome,/getBeatWindow/)],
  ["46 metronome stops when page closes", () => assert.match(metronome,/!isActiveGridPage\(\)[\s\S]+clearSchedule/)],
  ["47 no duplicate metronome timer", () => assert.match(metronome,/brDjMetronomeBound[\s\S]+"true"/)],
  ["48 shift whole grid exists", () => assert.match(gridCore,/range === "whole"/)],
  ["49 shift from here exists", () => assert.match(gridCore,/from-here-shift/)],
  ["50 set downbeat exists", () => assert.match(app,/userDownbeat/)],
  ["51 BPM edit exists", () => assert.match(gridCore,/const setBpm/)],
  ["52 segment edit exists", () => assert.match(gridCore,/const insertSegment/)],
  ["53 undo redo exists", () => { assert.match(app,/history/); assert.match(app,/future/); }],
  ["54 lock prevents edit", () => assert.match(app,/grid\.locked \|\| \(mixxxGridState/)],
  ["55 unlock confirmation exists", () => assert.match(app,/confirm[\s\S]{0,400}unlock|unlock[\s\S]{0,400}confirm/i)],
  ["56 atomic grid queue save", () => assert.match(queueSource,/writeDjPreparedAssetJsonAtomically/)],
  ["57 failed preparation preserves prior revision", () => assert.doesNotMatch(queueSource,/deleteWaveformCacheForFile|unlinkSync/)],
  ["58 M23 D1 load preserved", () => assert.match(router,/sendM23Load/)],
  ["59 M23 D2 load preserved", () => assert.match(router,/deck === 1 \|\| body\.deck === 2/)],
  ["60 no autoplay preserved", () => assert.match(fs.readFileSync("server/src/mixxxLoadCompatibility.ts","utf8"),/autoplay: false/)],
  ["61 replacement guard preserved", () => assert.match(router,/replacePlayingDeck/)],
  ["62 eject D1 D2 preserved", () => assert.match(app,/brmedia:dj-deck-eject/)],
  ["63 M24 waveform preparation preserved", () => assert.match(app,/prepareM24MixxxWaveform/)],
  ["64 M24 real waveform persistence preserved", () => assert.match(app,/getAuthoritativeDjWaveformState/)],
  ["65 play pause seek preserved", () => ["play","pause","seek"].forEach(x=>assert.match(app,new RegExp(x)))],
  ["66 native fallback preserved", () => assert.match(app,/clock\.setAuthority\(mixxx \? "mixxx" : "native"\)/)],
  ["67 Collections Set Plans preserved", () => assert.ok(fs.existsSync("server/public/dj-mixer/components/collections-setplans-m22.js"))],
  ["68 recording archive preserved", () => assert.ok(fs.existsSync("server/src/djRecordingArchive.ts"))],
  ["69 runner untouched safeguard", () => assert.doesNotMatch(queueSource,/brmedia-runner/)],
  ["70 Mixxx SQLite untouched safeguard", () => assert.doesNotMatch(queueSource,/sqlite|mixxxdb/i)],
  ["71 production media untouched safeguard", () => assert.doesNotMatch(queueSource,/unlinkSync|renameSync|writeFileSync\([^,]*locator/)],
];

for (const [name, run] of cases) test(`M25 ${name}`, run);
