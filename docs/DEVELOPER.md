# Developer guide

## Source of truth

The active product is the TypeScript server under `server/src` and the server-hosted frontend under `server/public`. The small `apps/` and `packages/` trees preserve intended module/package boundaries but are not authoritative evidence that a feature is merely a scaffold.

When updating documentation, verify claims against routes, services, frontend views, tests and dated milestone records. Use these status words consistently: **available**, **partial**, **planned**, **placeholder** and **experimental**. Keep physical device evidence separate from automated tests and source inspection.

## Architecture boundaries

- BRMedia Centre owns the UI, access control, catalogue identity, orchestration and diagnostics.
- Native Web Audio is the built-in DJ engine and permanent fallback.
- Mixxx Backend is optional and adapted through semantic BRMedia controls.
- FFmpeg/ffprobe are external media tools, not catalogue authorities.
- The Node 22 WebRTC Sidecar is isolated to M26; BRMedia’s main runtime remains Node 24.
- Filesystem paths and opaque catalogue IDs are resolved server-side and must not leak private paths unnecessarily.

## Safety rules

- Never modify `tools/windows/brmedia-runner.ps1` unless explicitly authorised.
- Never write directly to Mixxx SQLite.
- Never silently edit or install Mixxx mappings/profiles.
- Never modify production media as part of development or validation.
- Never regenerate the full catalogue without approval.
- Never remove Native Web Audio or make Mixxx mandatory.
- Never install packages without approval.
- Never claim physical testing that has not happened.
- Preserve iPhone Safari/PWA and Android Chrome/PWA support.
- Keep BRMedia Centre as the visible product; Mixxx is not the UI.
- Do not put passwords, tokens, cookies, private addresses or secrets in source, docs, logs or examples.

## Documentation maintenance

Keep the root README as the readable product overview. Put DJ internals in `docs/DJ_PERFORMANCE.md`, deployment details in `docs/OPERATIONS.md`, milestone truth in `docs/ROADMAP.md`, and device-validation gaps in `docs/CURRENT_STATUS.md`. Historical audit/build/rollback records should remain immutable unless they incorrectly present themselves as current guidance.

Before handing over a documentation-only change:

1. Confirm `git status` contains no newly changed application/test files from the documentation task.
2. Check Markdown links and referenced local paths.
3. Check duplicate headings and canonical terminology.
4. Run whitespace checks scoped to changed documentation.
5. Run whole-tree `git diff --check` only for reporting; do not clean unrelated changes.
