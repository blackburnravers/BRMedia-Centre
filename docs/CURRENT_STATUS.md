# Current status

This file records the current documentation baseline as of 2026-08-04. The implementation, routes, services and tests in the working tree are authoritative. “Implemented” does not imply physical validation on every device.

## Status definitions

- **Available:** implemented and exposed by the current product.
- **Partial:** useful implementation exists but the complete product scope is unfinished.
- **Experimental:** implemented behind a specialist or still-maturing workflow.
- **Placeholder:** a visible shell exists without the promised behaviour.
- **Planned:** no completed product implementation should be inferred.

## Product modules

The canonical module status is the table in the [project README](../README.md#current-status). Additional currently exposed areas include Library Sources, Stats and the experimental Torrents queue. There are no current modules that should be described solely as placeholders: older “blank scaffold” claims in module READMEs are superseded by the server-hosted implementation.

## Capability status

| Capability | Status | Validation boundary |
| --- | --- | --- |
| Mobile-first BRMedia shell | Available | iPhone-specific code and PWA manifests are present; Android remains a support target requiring broader physical validation. |
| Tailscale/LAN access | Available | Deployment-specific addressing and certificates are intentionally not recorded here. |
| FFmpeg/ffprobe media pipeline | Available | Host binaries and configured paths must be checked on the running Windows host. |
| Native Web Audio DJ engine | Available | Remains the fallback and must not be removed. |
| Mixxx transport/loading | Available | Includes authenticated compact catalogue loading, independent Deck 1/Deck 2 identity and Eject. Requires the optional desktop backend and bridge. |
| Prepared Waveform | Available | Genuine server caches only; an unprepared track displays an explicit unprepared state, never a fabricated fallback waveform. |
| Beat Grid | Available | Static/dynamic grids, markers, editor history and metronome are implemented. Physical regression coverage is not exhaustive. |
| Native guest-track loading | Available | M21-D loads validated temporary guest tracks into Native Web Audio only. The dedicated M21-DV device checklist remains outstanding unless separately evidenced. |
| M26 Mixxx master audio to iPhone | Available | Real iPhone audible output has been physically confirmed. Navigation continuity is implemented and covered by repository regression tests; extended physical navigation, latency, background and long-session runs remain incomplete. |
| Android M26 audio | Awaiting physical validation | Do not infer Android success from desktop/iPhone or automated coverage. |

## Known validation gaps

- M21-DV guest upload/load/eject/expiry validation on physical iPhone and Android is not recorded as complete.
- M26 Android Chrome/PWA validation is outstanding.
- M26 measured end-to-end latency, prolonged sessions, repeated route navigation, lock/background behaviour and network-transition tests are incomplete unless a later dated evidence record proves otherwise.
- Many server and frontend behaviours have automated tests, but that is not physical device validation.
- Optional Mixxx functionality depends on the Windows interactive desktop, mapping, loopMIDI/bridge readiness, audio device and selected WASAPI endpoint.

## Legacy and superseded statements

Documents or UI copy that call the server, Converter, Player, Tagger or Mastering a “blank scaffold” are historical. Claims that Mixxx is unavailable, DJ phone audio does not exist, Profile login is required for DJ audio, or unprepared tracks receive a fake waveform are also superseded.
