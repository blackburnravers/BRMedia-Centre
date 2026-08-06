# DJ Performance architecture

## Product model

DJ Studio is the light planning and archive surface. DJ Performance is the dark, phone-first performance surface. BRMedia remains the visible interface whether playback is provided by Native Web Audio or the optional Mixxx Backend.

```text
Studio Home -> Mix Setup / Set Plans / Recordings / Engine
            -> Performance Library -> load Deck 1 or Deck 2
            -> DJ Performance
                 Deck 1 | DUO | Deck 2 | Mixer | FX | Vinyl | Recording
                    Main | Grid | Hot Cue | Memory | Stems
```

Studio also exposes track preparation, guest upload, FX board setup and recording setup. Some older UI text calls Engine a build plan; this is retained UI history, not the roadmap authority.

## Deck and layout conventions

- Deck 1 is orange and Deck 2 is blue.
- Layout is phone-first, safe-area aware and usable in iPhone Safari/PWA; Android Chrome/PWA remains a required target.
- Each deck has Main, Grid, Hot Cue, Memory and Stems pages.
- The detailed Prepared Waveform scrolls beneath a fixed centre playhead. The overview waveform is stationary and represents the whole track.
- Zoom and seeking are supported. Deck transport, identity and asynchronous preparation state are independent.

## Prepared Waveform

Waveform data comes from genuine server-prepared caches with source and implementation compatibility checks. Prepared assets include multiband detail suitable for the fixed-centre renderer. If a track is unprepared, BRMedia shows the unprepared/preparing state and offers preparation; it does not invent a fake fallback waveform.

M13 hardened runtime ownership, clocking, resize/device-pixel handling, cancellation and diagnostics. M24 connected the Mixxx decks to genuine Prepared Waveform authority while keeping transport-aligned seeking and interaction behaviour.

## BPM, key and Beat Grid

The Performance Library reports preparation separately from BPM/key provenance. M25 implements:

- BPM and key display with provenance/verification;
- static and dynamic Beat Grids;
- beat, bar and downbeat markers;
- grid offset/BPM editing, nudge, stretch/shrink, half/double and first-beat controls;
- Undo/Redo history, lock/colour controls and preparation status;
- a metronome aligned to the active grid;
- live grid/readout authority for Native Web Audio and Mixxx-backed decks.

Automated tests cover the authority and DOM/runtime contracts. This does not replace extended physical performance validation.

## Playback engines

### Native Web Audio

Native Web Audio is built into the browser product and remains the always-available fallback. It supports independent decks, transport, seeking, loading, mixing and browser recording features. M21-D can load a validated temporary guest track directly into a native deck without permanently importing it.

### Mixxx Backend

The optional Mixxx Backend is controlled through BRMedia semantic APIs and a controller mapping/bridge; raw MIDI is not exposed to the browser. Current behaviour includes transport, live state, authenticated compact Performance Library loading, opaque-path resolution, independent Deck 1/Deck 2 identity, load-state diagnostics and Eject. BRMedia must fall back cleanly when Mixxx is not ready.

Never write directly to Mixxx SQLite. Do not silently install or edit mappings/profiles. See the [protocol](../server/BRMEDIA_MIXXX_PROTOCOL.md) and [compatibility runtime record](../tools/compatibility/mixxx-m23/README.md).

## Hot Cue, Memory, loops and FX

Hot Cue and Memory pages and their performance controls are present, but the M27 professional persistence/quantize/loop-foundation scope is **planned**, not complete. Likewise, the current mixer, FX boards, filters, gain and meters do not constitute completion of the M28 professional feedback scope.

## Stems

Stems preparation is implemented as a server job with status/cancellation and cached outputs. Deck Stems pages provide preparation controls, stem faders/mutes and transport integration. Host tool availability, supported source formats, preparation time and physical-device load remain practical limitations.

## Recording and archive

DJ recording captures the selected master workflow, tracks countdown/live/finalisation state, and uses FFmpeg for conversion/final outputs where configured. The archive presents completed recordings, processing/recovery state, metadata, artwork and generated sidecars/tracklists. Browser and Mixxx recording paths have different host/browser constraints and must be validated for the selected setup.

## M26 iPhone Mixxx master audio

M26 sends the Mixxx master to DJ Performance as audio-only WebRTC:

```text
Mixxx render endpoint -> explicit WASAPI loopback capture -> BRMedia Node 24
 -> repository-local WebRTC Sidecar (portable Node 22 + @roamhq/wrtc)
 -> ICE/RTP over HTTPS/Tailscale -> hidden Safari audio element
```

- The WebRTC Sidecar is a child lifecycle owned by BRMedia and is not a second product server.
- The main BRMedia runtime remains Node 24; the repository-local portable sidecar runtime is Node 22.
- Session creation and telemetry are restricted to a trusted DJ Performance session. A Profile login is not required.
- Safari playback is attached to a hidden audio element after a user gesture. There is deliberately no visible speaker toggle.
- The Windows Firewall rule must allow UDP for the exact portable `node.exe` program, not a broad executable or port exception.
- Real iPhone audible output has been physically confirmed over the deployed HTTPS/Tailscale path.
- Navigation continuity is implemented and regression-tested. Extended physical navigation, Android, measured latency, background/lock and long-session testing remain outstanding.

## Current limitations

- Mixxx requires an interactive Windows desktop/audio session, a healthy bridge/mapping and a valid selected audio endpoint.
- Mixxx is optional; loss of Mixxx or the sidecar must not remove Native Web Audio.
- M27, M28 and M29 are not complete.
- Browser suspension, device thermal pressure, network transitions and long sessions require further physical validation.
