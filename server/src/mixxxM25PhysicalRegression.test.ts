import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync("server/public/dj-mixer/app.js", "utf8");
const authority = fs.readFileSync("server/public/dj-mixer/engine/m25-grid-authority.js", "utf8");
const renderer = fs.readFileSync("server/public/dj-mixer/engine/spectral-waveform.js", "utf8");
const backend = fs.readFileSync("server/public/dj-mixer/components/mixxx-backend-m3.js", "utf8");
const html = fs.readFileSync("server/public/dj-mixer/performance.html", "utf8");
const css = fs.readFileSync("server/public/dj-mixer/styles.css", "utf8");
const queue = fs.readFileSync("server/src/mixxxM25Grid.ts", "utf8");
const waveforms = fs.readFileSync("server/src/waveforms.ts", "utf8");

test("M25 physical: unprepared exact tracks expose one stable bounded Prepare Grid action per deck", () => {
  assert.equal((html.match(/data-m25-prepare-grid/g) || []).length, 2);
  assert.match(app, /m25PrepareGridBound/);
  assert.match(css, /brDjGridPage > \.brM25PrepareGrid[\s\S]*position: absolute/);
  assert.match(queue, /waveform\.analysis \|\| await analysePreparedGridForFile/);
  assert.match(waveforms, /without[\s\S]*replacing[\s\S]*existing waveform cache/);
});

test("M25 physical: exact accepted payload reaches detail while the full-track overview stays clean", () => {
  assert.match(app, /beatGrid:\s*getAuthoritativeDjBeatGrid\(config\)/);
  assert.match(authority, /READY\.has\(value\.status\) && value\.realGridPresence/);
  assert.match(renderer, /fixedCentre[\s\S]*beatProgress -[\s\S]*progress/);
  assert.match(app, /\.brDjSingleOverviewWave[\s\S]{0,400}showBeatGrid: false/);
  assert.match(app, /\.brDjSingleOverviewWave[\s\S]{0,450}showMemoryMarkers: false/);
  assert.match(app, /\.brDjSingleOverviewWave[\s\S]{0,500}showMinuteMarkers: false/);
  assert.match(app, /\.brDjCueMemoryOverview[\s\S]{0,450}showBeatGrid: false/);
  assert.match(app, /\.brDjCueMemoryOverview[\s\S]{0,500}showMemoryMarkers: false/);
  assert.match(renderer, /if \(options\.showMemoryMarkers && duration/);
});

test("M25 physical: secondary page clocks, bars and editors use the Mixxx authoritative clock", () => {
  assert.match(app, /renderLivePageReadouts\(config, visual\)/);
  assert.match(app, /\.brDjCueMemoryPills/);
  assert.match(app, /formatDeckGridCounter\(config, state\)/);
  assert.match(app, /getGridInteractionState/);
  assert.match(app, /getM25AuthoritativeEditorState/);
  assert.match(app, /source:\s*"set-first-beat"/);
  assert.match(app, /config\.loadedLibraryItemId \|\|\s*authorityIdentity/);
});

test("M25 physical: prepared analyser BPM is labelled truthfully instead of masquerading as live BPM", () => {
  assert.match(app, /"Detected Grid BPM"/);
  assert.match(app, /analysedBpm/);
});

test("M25 physical: Undo and Redo are identity-scoped, persisted and truthfully disabled", () => {
  assert.match(app, /const undoDeckBeatGrid/);
  assert.match(app, /const redoDeckBeatGrid/);
  assert.match(app, /gridHistoryIdentity/);
  assert.match(app, /history-undo/);
  assert.match(app, /history-redo/);
  assert.match(app, /button\.disabled = Boolean\(grid\.locked \|\| !available/);
  assert.match(app, /persistDeckGridPreparation\(config, grid\)/);
});

test("M25 visual: Undo and Redo use existing active colour only while available", () => {
  assert.match(css, /\.brDjGridUndo:not\(:disabled\)[\s\S]*--br-icon-secondary: var\(--br-dj-orange\)/);
  assert.match(css, /\.brDjGridUndo:not\(:disabled\)[\s\S]*color: var\(--br-dj-orange\) !important/);
  assert.match(css, /\.brDjGridUndo:not\(:disabled\) \.brSvgIconHost[\s\S]*--br-icon-primary: #fff !important[\s\S]*--br-icon-secondary: var\(--br-dj-orange\) !important/);
  assert.match(css, /\.is-deck-2 \.brDjGridUndo:not\(:disabled\)[\s\S]*--br-icon-secondary: #7bd8ff !important/);
  assert.match(css, /\.brDjGridUndo:disabled[\s\S]*color: rgba\(255,255,255,\.30\) !important/);
  assert.match(css, /\.brDjGridUndo:disabled \.brSvgIconHost[\s\S]*rgba\(255,255,255,\.24\) !important/);
  assert.match(app, /button\.disabled = Boolean\(grid\.locked \|\| !available/);
});

test("M25 visual: every DUO card mini waveform is marker-free", () => {
  const duoCards = app.slice(app.indexOf(".brDjDuoDeckCard.${config.cardClass}"), app.indexOf(".brDjDuoHorizontalWave.${config.cardClass}"));
  assert.match(duoCards, /showBeatGrid: false/);
  assert.match(duoCards, /showMemoryMarkers: false/);
  assert.match(duoCards, /showMinuteMarkers: false/);
  assert.match(css, /\.brDjDuoDeckCardWave > i[\s\S]*display: none !important/);
  for (const tab of ["main", "mixer", "fx", "vinyl", "record"]) {
    assert.match(html, new RegExp(`data-dj-duo-panel="${tab}"`));
  }
});

test("M25 visual: fallback graphics are absent and prepared canvases remain unchanged", () => {
  assert.match(css, /No synthetic waveform: only an accepted M24 canvas may paint audio data/);
  assert.match(css, /\.brDjSingleOverviewWave:not\(\.has-real-waveform\)::before/);
  assert.match(css, /\.brDjSingleWaveCanvas:not\(\.has-real-waveform\)::before/);
  assert.match(css, /\.brDjDuoDeckCardWave:not\(\.has-real-waveform\)::before/);
  assert.match(css, /\.brDjDuoWaveBody:not\(\.has-real-waveform\)::before/);
  const blankRule = css.slice(css.indexOf("No synthetic waveform"));
  assert.match(blankRule, /content: none !important/);
  assert.match(blankRule, /display: none !important/);
  assert.match(blankRule, /background: none !important/);
  assert.doesNotMatch(blankRule, /clip-path: polygon|repeating-linear-gradient/);
  assert.match(blankRule, /\.brDjSingleWaveCanvas:not\(\.has-real-waveform\) > i:not\(:nth-child\(5\)\)/);
  assert.match(blankRule, /\.brDjCueMemoryWaveform:not\(\.has-real-waveform\) > i:not\(:nth-child\(4\)\)/);
  assert.match(css, /\.has-real-waveform::before,[\s\S]*\.has-real-waveform::after[\s\S]*opacity: 0 !important/);
  assert.match(renderer, /drawSpectralBody\(ctx, points/);
});

test("M25 physical: active Grid tab toggles approved structural control sets without controls in set 2", () => {
  assert.equal((html.match(/data-grid-control-set="1"/g) || []).length, 2);
  assert.equal((html.match(/data-grid-control-set="2"/g) || []).length, 2);
  assert.match(app, /requested === "grid" && current === "grid"/);
  assert.match(app, /syncGridControlSet\(document\.body\.dataset\.djGridControlSet === "2" \? 1 : 2\)/);
  const emptySets = html.match(/<section class="brDjGridControls" data-grid-control-set="2"[^>]*><\/section>/g) || [];
  assert.equal(emptySets.length, 2);
});

test("M25 physical: beats bars and the base downbeat have increasing visual strength", () => {
  assert.match(renderer, /const isDownbeat = isBar/);
  assert.match(renderer, /isDownbeat\s*\? 2\.4\s*:\s*0\.72/);
  assert.match(renderer, /downbeatColour/);
  assert.match(renderer, /showMinorBeats/);
  assert.match(renderer, /palette\.playhead, pixelRatio, 3\.2/);
});

test("M25 physical: repeating grid colour phase is red grey grey grey with no centre-based recolouring", () => {
  const colours = Array.from({ length: 9 }, (_, beat) => beat % 4 === 0 ? "red" : "grey");
  assert.deepEqual(colours, ["red", "grey", "grey", "grey", "red", "grey", "grey", "grey", "red"]);
  assert.match(renderer, /const isDownbeat = isBar/);
  const gridBlock = renderer.slice(renderer.indexOf("const drawBeatGrid"), renderer.indexOf("const drawMinuteMarkers"));
  assert.doesNotMatch(gridBlock, /centreX[\s\S]{0,120}(downbeatColour|isDownbeat)/);
});

test("M25 physical: no decorative grid is shown without an exact grid", () => {
  assert.match(css, /brDjGridPage \.brDjCueMemoryOverview::before[\s\S]*content: none !important/);
  assert.match(app, /gridForRender/);
});

test("M25 physical: ready state survives snapshots and stale unavailable transitions", () => {
  assert.match(authority, /READY\.has\(current\.status\) && current\.realGridPresence && !READY\.has\(status\)/);
  assert.match(authority, /BRMedia M25 blocked grid downgrade/);
  assert.match(app, /if \(!heldGrid\?\.realGridPresence\) m25GridAuthority\?\.clear/);
});

test("M25 physical: D1 and D2 header controls are icon Eject buttons", () => {
  assert.equal((html.match(/data-mixxx-header-action-deck=/g) || []).length, 2);
  assert.equal((html.match(/fa-solid fa-eject/g) || []).length, 2);
  assert.doesNotMatch(html, /data-mixxx-header-action-deck[^>]*>[\s\S]{0,100}fa-music/);
});

test("M25 physical: Eject preserves confirmed M23 unload semantics", () => {
  assert.match(backend, /state\.playing === true/);
  assert.match(backend, /window\.confirm/);
  assert.match(backend, /\/api\/dj\/mixxx\/deck\/\$\{deck\}\/unload/);
  assert.match(backend, /unloadPending/);
  assert.doesNotMatch(backend, /button\.addEventListener\("click"[\s\S]{0,900}m25GridAuthority/);
});

test("M25 physical: normal header omits internal identity and waveform diagnostics", () => {
  assert.doesNotMatch(backend, /node\.textContent[^\n]*stableIdentity/);
  assert.doesNotMatch(backend, /node\.textContent[^\n]*waveform unavailable/i);
  assert.match(backend, /"grid-not-prepared": "Grid not prepared"/);
  assert.match(css, /brDjSingleTrackText p[\s\S]*text-overflow: ellipsis/);
});

test("M25 rollback: header Eject cannot suppress M24 per-deck control binding", () => {
  assert.doesNotMatch(app, /const fileInput =[^\n]+\n\s*if \(!fileInput\) return/);
  assert.match(app, /fileInput\?\.addEventListener\("change"/);
  assert.match(app, /bindDeckWaveformZoomControls\(config\)/);
  assert.match(app, /\.brDjSinglePlayBtn/);
  assert.match(app, /\.brDjSingleCueBtn/);
  assert.match(app, /seekDeckFromWaveformPointer/);
});

test("M25 rollback: accepted grid remains data and overlay only", () => {
  const m25Apply = app.slice(app.indexOf("const applyM25Grid"), app.indexOf("const pollM25MixxxGrid"));
  assert.doesNotMatch(m25Apply, /config\.beatGrid|config\.loadedLibraryItemId/);
  assert.doesNotMatch(m25Apply, /renderDjRealWaveforms/);
  assert.doesNotMatch(app, /data-m25-grid-readout/);
});

test("M25 rollback: grid overlays use the existing M24 canvas and do not intercept controls", () => {
  assert.match(renderer, /const canvas = getCanvas\(target\)/);
  assert.match(app, /showBeatGrid: true/);
  assert.doesNotMatch(css, /brM25[^\{]*\{[^\}]*pointer-events:\s*all/i);
  assert.match(app, /\.brDjGridControls button/);
});
