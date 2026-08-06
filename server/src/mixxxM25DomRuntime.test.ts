import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const readouts = require(path.resolve("server/public/dj-mixer/engine/m25-live-readouts.js"));
const { create } = require(path.resolve("server/public/dj-mixer/engine/m25-grid-authority.js"));
const html = fs.readFileSync("server/public/dj-mixer/performance.html", "utf8");

const pill = () => {
  const spans = [{ textContent: "static remaining" }, { textContent: "static elapsed" }];
  const strong = { textContent: "static bars" };
  return { spans, strong, querySelectorAll: (selector: string) => selector === "span" ? spans : [], querySelector: (selector: string) => selector === "strong" ? strong : null };
};

test("M25 DOM: authoritative tick updates visible timers and Bars on Main Grid Hot Cue Memory and Stems", () => {
  assert.equal((html.match(/brDjSingleWavePills/g) || []).length, 2);
  assert.equal((html.match(/brDjCueMemoryPills/g) || []).length, 8);
  for (const panel of ["deck-1", "deck-2"]) {
    const pages = Array.from({ length: 5 }, pill);
    const root = { querySelectorAll: () => pages };
    assert.equal(readouts.render(root, panel, { elapsed: "1:02.3", remaining: "-3:04.5", counter: "Bar 12.3" }), 5);
    pages.forEach((page) => {
      assert.equal(page.spans[0].textContent, "-3:04.5");
      assert.equal(page.spans[1].textContent, "1:02.3");
      assert.equal(page.strong.textContent, "Bar 12.3");
    });
  }
});

test("M25 DOM: subsequent play pause and seek ticks replace text without creating another clock", () => {
  const pages = Array.from({ length: 5 }, pill);
  const root = { querySelectorAll: () => pages };
  readouts.render(root, "deck-1", { elapsed: "0:10.0", remaining: "-4:50.0", counter: "Bar 5.1" });
  readouts.render(root, "deck-1", { elapsed: "0:10.0", remaining: "-4:50.0", counter: "Bar 5.1" });
  readouts.render(root, "deck-1", { elapsed: "2:00.0", remaining: "-3:00.0", counter: "Bar 61.1" });
  pages.forEach((page) => assert.deepEqual(page.spans.map((node) => node.textContent), ["-3:00.0", "2:00.0"]));
});

test("M25 DOM: exact four-beat readout advances 1 2 3 4 then next bar 1 and stays deck independent", () => {
  const authority = create();
  for (const [deck, identity, downbeat] of [["d1", "mixxx:1", 0], ["d2", "mixxx:2", 0.25]] as const) {
    const state = authority.begin(deck, identity);
    assert.equal(authority.accept(deck, identity, state.generation, { state: "grid-ready", grid: {
      cacheVersion: "brmedia-grid-v2", revision: 1, bpm: 120, downbeat, barLength: 4, resolvedMode: "normal",
      segments: [{ id: "segment-1", startTime: downbeat, startBeat: 0, bpm: 120 }], locked: false, reviewRequired: false,
    }}), true);
  }
  assert.deepEqual([0, .5, 1, 1.5, 2].map((time) => {
    const value = authority.readout("d1", time); return [value.bar, value.beatInBar];
  }), [[1,1],[1,2],[1,3],[1,4],[2,1]]);
  assert.deepEqual([authority.readout("d1", .25).beatInBar, authority.readout("d2", .25).beatInBar], [1, 1]);
});
