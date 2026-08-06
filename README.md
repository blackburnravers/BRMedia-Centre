# BRMedia Centre

BRMedia Centre is a self-hosted, Windows-hosted media platform for managing, preparing and playing a personal media library. A Node.js/TypeScript backend serves a mobile-first browser interface designed for iPhone Safari/PWA, with Android Chrome/PWA as a supported target. Access is normally local, over the LAN, or privately through Tailscale.

BRMedia is always the visible product. DJ Performance can use either the built-in **Native Web Audio** engine or the optional **Mixxx Backend**; Mixxx is an engine, not the user interface, and Native Web Audio remains available when Mixxx is absent or unavailable.

The server integrates FFmpeg and ffprobe for probing, conversion, preparation, stems and recording workflows. The production server uses Node 24. M26 additionally uses a repository-local portable Node 22 runtime for its isolated WebRTC Sidecar.

## Current status

| Area | Status | Summary |
| --- | --- | --- |
| Audio Player | Available | Streaming, range requests, queue, playlists, tracklists and mobile playback. |
| Video Player | Available | Catalogue, browser playback, posters, subtitles and browser-safe copy workflow. |
| DJ Studio / DJ Performance | Available | Studio planning, DUO performance, Native Web Audio and optional Mixxx Backend. See [DJ architecture](docs/DJ_PERFORMANCE.md). |
| Library / Catalogue | Available | Local sources, compact Performance Library catalogue, search and metadata/provenance. |
| Import / Upload | Available | Local import plus resumable mobile uploads, validation and duplicate review. |
| Converter | Available | Audio/video conversion and queued jobs. |
| Tagger | Available | Metadata, artwork and batch-oriented tagging workflows. |
| Mastering | Available | Audio preparation, preview/compare and render workflows. |
| Recording | Available | DJ master-bus recording, conversion/finalisation and sidecars. |
| Recording Archive / DJ Set Archive | Available | Completed mixes, job/recovery state, metadata and tracklists. |
| Profiles | Available | Optional personalisation/session features; not required to open DJ Performance or receive DJ audio. |
| Universal Settings | Partial | Shared and module settings are implemented; consolidation remains a separate workstream. |
| Server Settings | Available | Sources, server administration and diagnostics. |
| Jobs / Task Queue | Available | Conversion, analysis, grid, stems, recording and torrent task surfaces. |
| Notifications | Partial | In-app status, job and error notifications exist; there is no general external notification service. |
| File Manager / View Files | Available | Source-backed file browsing and library management. |
| Playlists / Collections / Set Plans | Available | Player playlists and DJ collections/set-plan workflows. |
| Artwork | Available | Display, import, editing and recording-artwork workflows. |
| Lyrics / Karaoke | Partial | Lyrics metadata/editing exists; karaoke playback/hosting is planned rather than a completed standalone module. |
| Radio / Live Streams | Partial | Radio metadata and recorded-show categorisation exist; live-station management/hosting is planned. |
| Requests / Party Mode | Planned | Retained as a product workstream; not a completed module. |
| Sample Pad / Soundboard | Partial | DJ FX boards/pads exist; a separate general soundboard module is not complete. |
| Backup / Restore | Partial | Backup and recovery utilities/settings exist; end-to-end user restore remains incomplete. |
| Server Health / Diagnostics | Available | `/health`, settings diagnostics, Mixxx task/mapping/bridge and WebRTC runtime status. |
| Stats | Available | Plays, devices and library analytics. |
| Torrents | Experimental | Queue and guarded scanning UI; use only for lawful content. |

“Available” means implemented in the current repository, not that every device and production-media scenario has been physically validated. See [current status](docs/CURRENT_STATUS.md) for validation boundaries.

## Architecture

```text
iPhone Safari/PWA or Android Chrome/PWA
                  |
          HTTPS over Tailscale / LAN
                  |
       BRMedia Centre :8787 (Node 24)
          |        |         |
   library/media  FFmpeg   DJ engine selection
                              |          |
                       Native Web Audio  Mixxx Backend
                                             |
                               WASAPI master capture
                                             |
                          WebRTC Sidecar (portable Node 22)
                                             |
                                  audio-only WebRTC
```

Deep technical documentation:

- [Current status and module inventory](docs/CURRENT_STATUS.md)
- [DJ Performance architecture](docs/DJ_PERFORMANCE.md)
- [Windows setup and operations](docs/OPERATIONS.md)
- [Developer guide and safety rules](docs/DEVELOPER.md)
- [Roadmap and milestone status](docs/ROADMAP.md)
- [BRMediaMixxx protocol](server/BRMEDIA_MIXXX_PROTOCOL.md)

## Repository and runtime

- Windows repository: `C:\Users\Rosegrove Chippy\Documents\BRMedia-Centre`
- WSL repository: `/mnt/c/Users/Rosegrove Chippy/Documents/BRMedia-Centre`
- BRMedia port: `8787`
- Main runtime: Node.js 24 with TypeScript server code
- M26 sidecar runtime: repository-local portable Node.js 22
- Media tools: FFmpeg and ffprobe
- Optional desktop backend: Mixxx

Use [the operations guide](docs/OPERATIONS.md) for installation prerequisites, startup ownership, health checks, Tailscale/LAN access and Mixxx/WebRTC verification. Never put passwords, tokens, cookies or private Tailscale details in repository documentation.

## Roadmap

M25 Beat Grid and M26 iPhone Mixxx Master Audio are implemented. M27 is planned only and has not begun as part of this documentation update. The forward sequence is M27 Hot Cues, Memory Cues, Quantize & Loop Foundations; M28 Professional FX, EQ, Filters, Gain, VU Meters & Mixer Feedback; and M29 Polish, Optimisation & Long-Session Reliability. Android validation and Universal Settings continue as separate workstreams.

## Safety rules

- Never modify `tools/windows/brmedia-runner.ps1` unless explicitly authorised.
- Never write directly to the Mixxx SQLite database or silently change Mixxx mappings/profiles.
- Do not modify production media or regenerate the full catalogue without approval.
- Do not remove Native Web Audio, make Mixxx mandatory, or expose Mixxx as the product UI.
- Do not install packages without approval.
- Do not claim physical testing that did not occur.
- Preserve both iPhone Safari/PWA and Android Chrome/PWA support.
- Do not commit or push documentation work unless explicitly requested.

## Historical packages

The `apps/` and `packages/` directories describe early modular boundaries. The active product is primarily served from `server/`; their small READMEs are retained as module-history and package-boundary notes rather than independent deployable applications.
