# BRMedia Centre server

This directory contains the active BRMedia Centre product: the Node.js/TypeScript backend in `src/` and the browser frontend in `public/`. It is not a blank scaffold.

## Responsibilities

- Serve the mobile-first BRMedia UI and PWA assets.
- Catalogue and range-stream local/server media.
- Manage library sources, imports, resumable uploads and temporary guest tracks.
- Run FFmpeg/ffprobe-backed conversion, analysis, stems, recording and media jobs.
- Provide Player, Video Player, Converter, Tagger, Mastering, Stats, settings and administration APIs.
- Orchestrate DJ Studio and DJ Performance using Native Web Audio or the optional Mixxx Backend.
- Expose health, startup, Mixxx bridge/mapping/task and M26 WebRTC diagnostics.

## DJ services

The DJ server layer includes prepared analysis/waveforms, BPM/key provenance, static and dynamic Beat Grids, preparation queues, recording/finalisation/archive, collections/set plans, guest tracks, compact Performance Library catalogue, Mixxx semantic bridge/loading/live state, and M26 Mixxx master capture/WebRTC orchestration.

See:

- [DJ Performance architecture](../docs/DJ_PERFORMANCE.md)
- [Current status](../docs/CURRENT_STATUS.md)
- [Operations](../docs/OPERATIONS.md)
- [BRMediaMixxx protocol](BRMEDIA_MIXXX_PROTOCOL.md)
- [Analysis architecture](M9_ANALYSIS_ARCHITECTURE.md)
- [Library metadata provenance](DJ_LIBRARY_METADATA_PROVENANCE.md)

## Runtime boundaries

The main server runtime is Node 24 and normally listens on port 8787. M26 alone launches the repository-local portable Node 22 WebRTC Sidecar. Mixxx is optional, requires an interactive Windows desktop/audio session, and must never replace BRMedia as the UI or disable the Native Web Audio fallback.

Do not expose secrets, write to Mixxx SQLite, modify production media, or regenerate the full catalogue without explicit approval.
