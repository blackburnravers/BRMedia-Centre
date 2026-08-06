# M23 Mixxx compatibility runtime

This directory records the pinned, side-by-side Mixxx compatibility build used
to complete opaque `H:\\Music` track loading into Mixxx Deck 1 and Deck 2.

The production target is the official Mixxx `2.5.6` tag at commit
`3ebac449e7e5fe2a0186596657696e87ce8b0e56`, plus a narrow reviewed backport of
the additive `engine.loadTrack(group, path)` feature from official PR #16518,
feature commit `cd4c9cea9277e0f5577a3c0b0b2b8ae6708bea10`.

The stable `C:\\Program Files\\Mixxx` installation is never overwritten. Build
source and logs live under `C:\\BRMediaBuilds\\Mixxx-M23`; the compatibility
runtime is staged separately under `C:\\BRMediaMixxxCompatibility`. It must be
launched with `--settings-path C:\\BRMediaMixxxCompatibilityProfile` so the
production Mixxx database and settings remain untouched.

The RelWithDebInfo build completed successfully with controller scripting and
the standard Mixxx audio stack enabled. The linked PortAudio dependency was
built with `PA_USE_ASIO=1`. All 72 focused upstream controller/deck-loading
tests passed. Physical Creative ASIO and deck-load validation remain pending.

After the guarded backup has completed, `windows/launch-validation-runtime.ps1`
copies only the reviewed BRMedia mapping into the compatibility profile and
launches the staged executable with the separate settings path. It refuses to
launch if any Mixxx process is already running.

`tools/windows/brmedia-runner.ps1` is permanently out of scope.
