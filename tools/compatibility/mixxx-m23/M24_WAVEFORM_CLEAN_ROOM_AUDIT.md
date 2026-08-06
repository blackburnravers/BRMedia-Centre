# M24 clean-room waveform audit

Audit date: 2026-08-02. This is an engineering provenance record, not legal advice.

## Runtime reference

- Compatibility runtime: Mixxx 2.5.6 commit `3ebac449e7e5fe2a0186596657696e87ce8b0e56`, plus the separately recorded M23 load-only patch. The patch does not change waveform code.
- Active skin: **LateNight 2.4.0.01**, loaded from `C:\BRMediaMixxxCompatibility\skins\LateNight`.
- Profile settings: `WaveformType=10` (the source enum identifies this as the software RGB waveform), `DefaultZoom=3`, `PlayMarkerPosition=0.5`, `OverviewNormalized=0`, `ZoomSynchronization=1`, `VSync=0`, and visual gain 1 for all four decks.
- Behavioural reference: a stationary whole-track overview; scrolling RGB/frequency-coloured detail beneath a centred play marker; played overlay; beat lines; cue, hot-cue and loop marks/ranges; bounded zoom; and high-DPI-aware widget geometry.

## Official upstream files inspected

All paths below are at commit `3ebac449e7e5fe2a0186596657696e87ce8b0e56` in the official `mixxxdj/mixxx` repository.

- Selection and widget lifecycle: `src/waveform/waveformwidgetfactory.cpp`, `src/waveform/widgets/waveformwidgettype.h`, `src/waveform/widgets/waveformwidgetabstract.cpp`.
- Waveform data: `src/waveform/waveform.cpp`, `src/waveform/waveform.h`, `src/waveform/waveformfactory.cpp`.
- RGB rendering: `src/waveform/widgets/rgbwaveformwidget.cpp`, `src/waveform/renderers/waveformrendererrgb.cpp`, `src/waveform/renderers/waveformsignalcolors.cpp`.
- Playback position and zoom behaviour: `src/waveform/visualplayposition.cpp`, `src/waveform/renderers/waveformwidgetrenderer.cpp`.
- Beat and marker layers: `src/waveform/renderers/waveformrenderbeat.cpp`, `src/waveform/renderers/waveformrendermark.cpp`, `src/waveform/renderers/waveformrendermarkrange.cpp`, `src/waveform/renderers/waveformmarkset.cpp`.
- Overview and skin configuration: `skins/LateNight/decks/overview.xml`, `skins/LateNight/decks/deck_singletons.xml`, `skins/LateNight/skin.xml`, `skins/LateNight/skin_settings.xml`.
- Shader implementations were identified under `src/waveform/renderers/allshader/` for licence scoping, but no shader text was copied or adapted.

## Licensing and clean-room boundary

Mixxx source is GPL-2.0-or-later. LateNight declares CC BY-SA 3.0 in `skin.xml`. Source code, shader text, skin XML, icons, images, and other assets were treated as protected implementation/artwork and were not copied into BRMedia. The audit used only observable ideas and behaviour: central play marker, moving detail waveform, stationary overview, played/unplayed contrast, RGB band character, grid hierarchy, markers, and zoom semantics. No Mixxx colour constant was copied verbatim; BRMedia retains its independently developed orange/blue theme and existing palettes.

## Independent BRMedia architecture

BRMedia continues to use its pre-existing independent implementation:

- versioned source-fingerprinted JSON caches and multiscale spectral bands in `server/src/waveforms.ts` and `server/src/djM12Waveform.ts`;
- Canvas 2D rendering in `server/public/dj-mixer/engine/spectral-waveform.js`;
- transport interpolation/reconciliation in `waveform-clock-m12.js`;
- cache validation, multiscale selection, abort/generation protection, bounded DPR sizing and diagnostics in `waveform-runtime-m13.js` and the M14/M15 application integration.

M24 adds only the exact M23 identity-to-existing-cache association and Mixxx live-state orchestration. It neither reads Mixxx waveform blobs nor translates Mixxx renderer code. Mixxx SQLite remains read-only and is used only for the existing catalogue identity lookup.

## Differences and limitations

- Rendering is Canvas 2D, not the active Mixxx software/Qt/OpenGL implementation.
- Frequency separation is shown only when BRMedia's genuine low/mid/high cache bands exist; no synthetic spectral detail is invented.
- BRMedia grids remain the grid source. A missing exact saved grid produces no beat lines.
- Marker foundations use current BRMedia/Mixxx feedback fields; full cue editing remains outside M24.
- Unprepared tracks are not analysed automatically. Preparation is a future explicit action hook.

Maintenance rule: re-audit the upstream commit, selected skin/version, and licence boundary before intentionally changing visual parity or importing any upstream implementation detail.
