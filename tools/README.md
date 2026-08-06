# BRMedia Centre tools

This directory contains active development, compatibility, validation, backup and Windows operations helpers. It is no longer only a list of planned tools.

Important areas:

- `windows/`: scheduled-task management, Mixxx startup/mapping checks and M26 WASAPI validation.
- `compatibility/mixxx-m23/`: pinned side-by-side Mixxx compatibility build, provenance and rollback records.
- `webrtc-sidecar/`: M26 audio-only WebRTC Sidecar, repository-local portable Node 22 runtime and diagnostic probes.
- `mixxx/`: bridge/mapping-oriented helpers.
- `backups/`: historical migration/repair scripts and audit artefacts; these are not the product backup/restore UI.

The main BRMedia runtime remains Node 24. The portable Node 22 runtime is isolated to the WebRTC Sidecar and its dependencies must not be changed or reinstalled without approval.

Never modify `windows/brmedia-runner.ps1` unless explicitly authorised. Do not silently edit Mixxx mappings/profiles, write to Mixxx SQLite, install packages, restart services, or modify production media during routine tooling/documentation work.

See the [operations guide](../docs/OPERATIONS.md) and [developer safety rules](../docs/DEVELOPER.md#safety-rules).
