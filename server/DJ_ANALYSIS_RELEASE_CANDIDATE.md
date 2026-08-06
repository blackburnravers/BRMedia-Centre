# DJ Analysis Engine Strengthening Release Candidate

Status: **B12 release candidate (b12-rc1)**, prepared for controlled real-world testing.

This is developer documentation for the server-side prepared-analysis pipeline. It does not describe end-user controls.

## Pipeline

The server prepares audio once in `waveforms.ts` and passes deterministic, serialisable data through these stages:

1. **B1 - Prepared asset foundation:** bounded source fingerprints, independent implementation fingerprints, atomic JSON writes, and structured compatibility decisions.
2. **B2 - Waveform detail:** high-density peak, RMS-energy, and transient arrays while retaining the multiband-v1 renderer contract.
3. **B3 - Canonical analysis:** normalised amplitude, energy windows, per-window confidence, aggregate statistics, and renderer metadata.
4. **B4 - BPM analysis:** deterministic onset evidence, octave-family comparison, section agreement, digital-tempo evidence, and a selected BPM that later stages cannot silently replace.
5. **B5 - Downbeat/bar analysis:** beat phase, bar offset, first stable beat, grid anchor, phrase evidence, and protected-grid disagreement reporting.
6. **B6 - Dynamic analysis:** bounded tempo observations, sustained boundary validation, and a minimal segment recommendation. B6 does not alter B4 or B5.
7. **B7 - Confidence engine:** shared six-decimal normalisation, weighted evidence, outlier limiting, smoothing, and developer diagnostics.
8. **B8 - Beat refinement:** context- and spacing-validated rhythmic candidates stored independently for later validation.
9. **B9 - Whole-track validation:** constant and Dynamic maps compared across eight deterministic regions. Results are recommendation-only.
10. **B10 - Final decision:** reconciles B4 through B9 into accepted, warning, review, protected, insufficient, or invalid outcomes. It never applies a grid.
11. **B11 - Compatibility:** sanitises legacy/current/future metadata, previews migration, and recommends, but never starts, reanalysis.
12. **B12 - Regression lock:** freezes these contracts for the release candidate and adds no analysis algorithm.

## Metadata and cache boundaries

Each optional analysis stage has an independent asset type and implementation fingerprint. A stale downstream stage can be omitted without invalidating the prepared waveform or unrelated upstream stages. The canonical record uses `prepared-analysis-v1`; new records also include the optional `strengthened-analysis-v1` compatibility marker.

Legacy records without later stages continue to load when their available data is safe. Unknown future schemas are rejected gracefully. Migration decisions are preview-only: `performed: false`, `mayWrite: false`. Reanalysis policies always use `mayAutoStart: false`.

Manual and locked grids are authoritative. Analysis may retain diagnostics and recommendations, but no compatibility, validation, or reconciliation path may overwrite protected timing data.

## Determinism and safety

Identical prepared input and existing-grid state must produce identical candidates, confidence values, reason codes, diagnostics, validation results, compatibility decisions, and final recommendations. Production loading must not trigger decoding, preparation, migration, cache deletion, or grid application.

Grid Core v2 remains the only timing engine. Playback, rendering, cues, loops, Beat Jump, Sync, Quantize, recording, archive, and stems are outside this pipeline.

## Extension points

Future work should add independently versioned optional metadata rather than altering established asset contracts. Mixxx integration should consume the final recommendation and protected-grid state through a separate backend boundary. Waveform or playback improvements must remain independent of analysis fingerprints unless their generated analysis inputs actually change.

Before changing an implementation version, identify its asset dependency set in `djPreparedAssets.ts`, add a focused compatibility test, and preserve manual/locked data. Real-world testing should begin with copies or explicitly selected tracks; no bulk or automatic reanalysis is authorised by this release candidate.
