# DJ Library BPM and key provenance

The Library treats preparation state and musical metadata as independent facts.
A track may need waveform/grid preparation while still carrying legitimate BPM
or key tags.

Compact catalogue fields:

- `bpm` / `key`: the selected values.
- `bpmSource` / `keySource`: `brmedia-analysis`, `embedded`, `imported`,
  `legacy-cache`, or `unknown`.
- `bpmVerified` / `keyVerified`: whether the value is safe for compact display.
- `djWaveformPrepared` and `djAnalysis`: preparation/analysis state; these do not
  get inferred from embedded tags.

Selection rules:

1. A stored `djGridBpm` wins over an embedded BPM. Recognised BRMedia grid and
   manual grid sources are labelled `brmedia-analysis`; explicit import sources
   are labelled `imported`; an absent source is `legacy-cache`; anything else is
   `unknown`.
2. `djKeyAnalysis.key` wins over an embedded key. A recognised BRMedia musical
   key analysis version is `brmedia-analysis`. Otherwise it is unverified.
3. File-level `bpm` and `key` values read by `music-metadata` are `embedded`
   unless their stored source explicitly says `imported`.
4. Unknown or legacy values remain in storage but are hidden from the compact
   row. The row shows `Unverified`; it never fabricates a replacement.
5. Mixxx live BPM is deck telemetry only. It is not read by catalogue rendering
   and is never persisted into `bpm`, `djGridBpm`, or key metadata by this flow.
6. `Needs Preparation` is based on waveform/grid readiness, never merely on the
   presence or absence of embedded BPM/key tags.

The values audited on 31 July 2026 (208.40/C#, 191.89/A, 254.07/Gm, and
135.87/A#m) are persisted BRMedia M10 results. Their tempo source is
`brmedia-analysis-m10-v1`; their keys are `musical-key-chroma-m10-v1`. They are
not embedded tag values and Mixxx did not supply them. Several records carry a
`review-required` analysis status, which must remain visible as a review state
rather than being described as fully trusted preparation.
