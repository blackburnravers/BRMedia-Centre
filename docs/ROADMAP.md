# Roadmap and milestone status

Status is based on the implementation and evidence present on 2026-08-04. “Implemented” describes repository capability; physical-validation limits are stated separately.

## Completed and current milestones

| Milestone | Status | Documented outcome |
| --- | --- | --- |
| M13 Production Waveform Hardening | Implemented | Prepared Waveform runtime ownership, cancellation/stale-result protection, clocking, DPR/resize behaviour and diagnostics. Physical device coverage remains bounded. |
| M14 Request/Runtime Improvements | Implemented | Runtime/request deduplication, cancellation, recovery and reduced redundant waveform work. |
| M15 Observability | Implemented | Waveform/runtime diagnostic snapshots, counters, history and validation fixture/test coverage. |
| M16 Mixxx Automatic Startup / Native Fallback | Implemented | Separate interactive logon startup model with Native Web Audio retained when Mixxx is unavailable. |
| M17 Startup/Backend Diagnostics | Implemented | Process/task/bridge/backend diagnostic reporting and failure reasons. |
| M18 Real Windows Reboot Validation | Completed | A genuine Windows reboot/startup path was validated; the old continuation checklist is retained as a historical evidence instruction. |
| M19 Mapping/Bridge Readiness | Implemented | Mapping installation/status and bridge readiness/protocol validation. Mapping changes remain explicit, never silent. |
| M20 Planning Scope | Completed planning | Defined the transition into compact catalogue/upload/load milestones; it is not a claim of an additional user module. |
| M21-A Compact Library API | Implemented | Authenticated compact Performance Library catalogue with opaque identity and metadata/provenance. |
| M21-B Resumable Uploads | Implemented | Server-confirmed chunk/range resume suitable for mobile suspension/reselection constraints. |
| M21-C Validation, Duplicates and Guest Tracks | Implemented | Validation, duplicate review, opaque guest identity, leases/reservations and diagnostics. |
| M21-D Native Guest Loading | Implemented; physical validation outstanding | Validated guest tracks load into Native Web Audio decks only. The M21-DV iPhone/Android checklist is not recorded as completed. |
| M23 Mixxx Loading and Identity | Implemented | Opaque Performance Library loading, Deck 1/Deck 2 independence, identity/state handling and Eject through the compatibility runtime. |
| M24 Genuine Prepared Waveforms | Implemented | Genuine prepared caches drive Mixxx/BRMedia waveforms; no fabricated fallback is drawn for unprepared tracks. |
| M25 Beat Grid | Implemented | Static/dynamic Beat Grids, beat/bar/downbeat markers, editor operations, Undo/Redo, metronome and live readouts. Extended physical regression remains incomplete. |
| M26 iPhone Mixxx Master Audio | Implemented; validation continuing | Audio-only WebRTC via explicit Mixxx/WASAPI capture and repository-local Node 22 `@roamhq/wrtc` sidecar. Real iPhone audible output is physically confirmed; Android, measured latency, long-session and background validation remain outstanding. |

## M26 validation status

- Confirmed: portable repository-local Node 22 sidecar; BRMedia Node 24 main runtime; `@roamhq/wrtc`; audio-only WebRTC; explicit Mixxx/WASAPI master capture; trusted DJ Performance sessions without Profile login; HTTPS/Tailscale path; exact-program UDP firewall requirement; ICE/RTP telemetry; hidden Safari audio element; no visible speaker toggle; audible real-iPhone output.
- Implemented and automated: session lifecycle, receiver behaviour, pacing/telemetry and navigation-continuity regression contracts.
- Not yet complete: Android physical validation, measured latency targets, extended repeated navigation, long sessions, background/lock-screen behaviour and network transitions.

## Next milestones

| Milestone | Status | Scope |
| --- | --- | --- |
| M27 Hot Cues, Memory Cues, Quantize & Loop Foundations | Planned | Persistence/authority and reliable performance behaviour for cue, quantize and loop foundations. Existing page shells/controls do not make this complete. |
| M28 Professional FX, EQ, Filters, Gain, VU Meters & Mixer Feedback | Planned | Professional control depth and authoritative feedback across engines. |
| M29 Polish, Optimisation & Long-Session Reliability | Planned | Performance, resilience, thermal/memory/network behaviour and sustained physical validation. |

Android validation and Universal Settings are separate ongoing workstreams, not hidden inside M27–M29.
