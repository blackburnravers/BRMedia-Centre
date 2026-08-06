# M18 final genuine reboot continuation

The user explicitly approved one normal Windows restart after the M18 startup-task
repairs. After Windows automatically returns to the `Rosegrove Chippy` desktop,
continue M18 evidence collection only. Do not begin M19.

Collect and verify:

- Windows boot, automatic console logon, and `explorer.exe` owner/timestamps.
- Task Scheduler operational events for both `BRMedia Centre Server` and
  `BRMedia Mixxx Startup`.
- Both registered task principals, interactive-token logon types, triggers,
  delays, actions, arguments, working directories, enabled states, last-run
  times, and results.
- No duplicate BRMedia or Mixxx startup tasks.
- BRMedia runner/server processes, fresh runner heartbeat, and Windows
  `http://localhost:8787/health` HTTP 200.
- Mixxx startup status/log trigger time, 12-second delay evidence, run ID,
  bounded result, process state, bridge state, heartbeat, reconnect telemetry,
  and native fallback.
- Windows `http://localhost:8787/api/dj/mixxx/status` evidence.

Restrictions:

- Do not manually trigger either scheduled task.
- Do not manually start, restart, or terminate Mixxx.
- Do not sign out or lock Windows.
- Do not alter credentials or automatic-login settings.
- Do not modify Mixxx data/settings or protected media/catalogue data.
- Do not reboot again without explicit approval.
- Do not begin M19.
