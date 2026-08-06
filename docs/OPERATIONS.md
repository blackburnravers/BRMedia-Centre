# Windows setup and operations

## Fixed deployment facts

| Item | Value |
| --- | --- |
| Windows repository | `C:\Users\Rosegrove Chippy\Documents\BRMedia-Centre` |
| WSL repository | `/mnt/c/Users/Rosegrove Chippy/Documents/BRMedia-Centre` |
| BRMedia HTTP port | `8787` |
| Main runtime | Node.js 24 |
| WebRTC Sidecar runtime | Repository-local portable Node.js 22 |

## Host requirements

- Windows with an interactive desktop for optional Mixxx audio.
- Node.js 24 and the repository dependencies already approved/installed.
- FFmpeg and ffprobe available through the configured BRMedia paths.
- Optional Mixxx Backend with the approved BRMedia mapping/bridge and its loopMIDI transport.
- A browser supporting the target: iPhone Safari/PWA or Android Chrome/PWA.
- HTTPS for remote PWA/media features, normally through the private Tailscale deployment. LAN HTTP may be suitable for basic trusted-network access but does not provide every secure-context browser feature.

Do not install or update packages, Mixxx mappings or profiles without approval. Never record secrets in commands or documentation.

## Startup model

BRMedia is registered as a per-user Windows scheduled task and managed by the checked-in start/stop/status helpers. Mixxx has a separate delayed per-user logon task because it must run inside the real interactive desktop/audio session. The Mixxx task is deliberately independent of the BRMedia watchdog. See [Mixxx startup](../tools/windows/MIXXX_STARTUP.md).

`tools/windows/brmedia-runner.ps1` is protected operational infrastructure: never modify it unless explicitly authorised.

The WebRTC Sidecar is repository-local and lifecycle-owned by the BRMedia server. BRMedia starts the portable Node 22 sidecar only for the M26 path, monitors it and closes sessions/child state during teardown. Do not start it as an unrelated permanent service.

## Access

- Local host: `http://localhost:8787/`
- LAN: use the Windows host address and port 8787, subject to the configured listener/firewall policy.
- Tailscale: use the deployment’s approved HTTPS name/address. Do not publish it in repository documentation.

DJ Performance does not require a Profile login. Its sensitive M26 endpoints still require a server-issued, authenticated/trusted DJ Performance session and same-origin controls.

## Verification

These are read-only operational checks; run them only when runtime validation is authorised.

1. Open `http://localhost:8787/health` and require HTTP 200. Review the returned service, Mixxx and sidecar diagnostic fields without copying secrets.
2. Run `tools\windows\status-brmedia-service.ps1` from an appropriate Windows PowerShell context to inspect the scheduled task and health endpoint.
3. Run `tools\windows\status-mixxx-startup.ps1` to inspect the optional Mixxx logon task.
4. In Server Settings/DJ diagnostics, confirm Mixxx process readiness, mapping status, bridge freshness/protocol compatibility and independent deck state.
5. In DJ Performance, select the Mixxx Backend, load a Performance Library track to each deck, verify identity/transport, then use Eject.
6. For M26, confirm the configured WASAPI render endpoint, capture state, WebRTC Sidecar health, ICE/RTP telemetry and receiver output attachment.

Do not write directly to Mixxx SQLite to “fix” a check. Do not restart BRMedia, Mixxx or the WebRTC Sidecar as an incidental documentation-validation step.

## Firewall requirement for M26

Allow inbound/private-network UDP for the exact repository-local portable Node 22 executable used by the WebRTC Sidecar. Do not create a broad rule for every Node executable and do not expose the sidecar control socket externally. HTTPS/Tailscale protects BRMedia signalling; ICE/RTP still requires the exact-program UDP allowance on Windows.

## Troubleshooting boundaries

- `/health` down: inspect task state and current logs before any restart.
- Mixxx unavailable: BRMedia should report the cause and retain Native Web Audio.
- Library loads fail: check bridge freshness, protocol/mapping status, catalogue identity and allowed source resolution; never edit the Mixxx database.
- No iPhone Mixxx audio: check HTTPS, user gesture, trusted DJ session, selected WASAPI endpoint, capture samples, sidecar peer/ICE/RTP state and hidden audio-element attachment.
- Android issues: record them as unvalidated/failed evidence; do not generalise iPhone success to Android.
