# BRMedia Mixxx automatic startup

Mixxx is an optional **Mixxx Backend** for BRMedia Centre. BRMedia remains the UI and **Native Web Audio** remains available when this task, mapping or bridge is unavailable. This task does not own the M26 WebRTC Sidecar; the BRMedia Node 24 process owns that repository-local Node 22 child lifecycle.

Install or update the separate per-user logon task:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\windows\install-mixxx-startup.ps1
```

The task waits 12 seconds by default, uses `MultipleInstances IgnoreNew`, has no restart policy,
and only runs at an interactive user logon. It is deliberately independent of the BRMedia server
watchdog. Mixxx is a desktop audio application, so an interactive logged-in desktop is required.

Discovery order is the explicit `-Executable` argument, `BRMEDIA_MIXXX_EXE`, Windows App Paths,
`Program Files\Mixxx`, `Program Files (x86)\Mixxx`, then the current user's local Programs folder.

Status:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\windows\status-mixxx-startup.ps1
```

This reports Scheduler state and last result, the current `mixxx.exe` process, MIDI-port
reachability, protocol compatibility, heartbeat freshness, stale state, backend usability,
native fallback, and the last bounded startup result. Browser-safe diagnostics are also
available at `http://localhost:8787/api/dj/mixxx/status`; executable paths are reduced to
their filename.

Disable without stopping a running Mixxx process:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\windows\disable-mixxx-startup.ps1
```

Remove the task:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\windows\disable-mixxx-startup.ps1 -Uninstall
```

Re-enable by running `install-mixxx-startup.ps1` again. It updates the single existing task.

## One-time genuine logon validation

Do not start the task manually. Save work, then sign out and sign back in only after explicit
approval. After the next normal login:

1. Wait about one minute for the 12-second delay and bounded bridge checks.
2. Run `status-mixxx-startup.ps1`.
3. Confirm `Last run` is the new login, `Trigger observed` and `Delay elapsed` are populated,
   and the run IDs in the status and `C:\BRMedia\logs\mixxx-startup.log` match.
4. Confirm the action is `process-already-running`, `process-launched`, or
   `executable-missing`; confirm the final bridge state and retry count.
5. Run `status-brmedia-service.ps1` and confirm `/health` remains HTTP 200.
6. If heartbeat is absent or stale, confirm `Backend usable: False` and effective backend
   `brmedia-native`. Do not select Mixxx until its controller mapping is enabled manually
   and compatible heartbeat feedback is present.

The launcher never edits or selects Mixxx mappings. “Bridge reachable” means the MIDI ports
exist; “protocol connected” additionally requires compatible feedback; “heartbeat recent”
requires a fresh heartbeat; only all required conditions make the Mixxx backend usable.

DJ Performance and M26 audio do not require a Profile login. Server-issued trusted DJ Performance sessions still protect signalling and telemetry endpoints. For health, bridge and WebRTC verification, see the [operations guide](../../docs/OPERATIONS.md).
