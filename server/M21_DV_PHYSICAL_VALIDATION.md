# M21-DV Physical Validation Checklist

Use a small, non-production test track. Capture the guest status card, temporary
guest toolbar, browser console, `/api/v1/guest-tracks/diagnostics`, and Windows
service status whenever a step fails. Do not use DJMixes or Videos test media.

## 1. iPhone Safari

1. Open BRMedia in Safari, choose the test file, upload, validate, and resolve
   duplicate review if offered. Expect server-confirmed progress and Ready;
   failure is a stuck/false state, path disclosure, or unexpected deletion.
2. Tap Load D1. Expect the performance page to say Loading then Loaded on Deck
   1, with no sound. Any autoplay or Deck 2 change is failure.
3. Tap Play, pause, resume, seek (if shown), stop, and eject. Expect audible D1,
   continuous pause/seek behaviour, then an empty D1 and released guest.
4. Load D2 and play it. Expect only D2 to start. Exercise volume, EQ, filter,
   pan, crossfader, master and meters; wrong routing or double audio is failure.
5. Replace a stopped deck. Then attempt replacement while playing: Cancel must
   preserve playback; Confirm must replace once and remain stopped.
6. Start a load, navigate away, return, background/foreground Safari, lock and
   unlock, close/reopen the tab. Expect truthful retry/recovery and bounded lease
   expiry, never indefinite Loading or In use.

## 2. iPhone PWA

Repeat the Safari flow from the installed PWA. Additionally fully terminate and
reopen the PWA. The browser deck must not claim to have survived process loss;
the server reservation may remain only until its bounded lease expires.

## 3. Android Chrome

Repeat the standard flow in Chrome using the Android document picker. Test a
local/provider source without relying on a filesystem path. Use Android Back
during a load, return, background/foreground, and close/reopen Chrome. Expect an
abort or truthful retry, no autoplay, no leaked permanent reservation, and
independent D1/D2 behaviour.

## 4. Android PWA

Repeat the Chrome flow from the installed PWA. Remove it from recents while a
load is active, reopen it, and wait beyond the displayed lease period. Expect
authoritative refresh and eventual release of abandoned In use state.

## 5. Tailscale and network interruption

1. Start upload, interrupt the connection, reconnect, and resume/reselect the
   same file. Expect server-confirmed bytes and source verification.
2. Start a guest deck load, switch Wi-Fi/mobile data or interrupt Tailscale,
   then reconnect. Expect a visible download/load error or retry; no guest may
   be shown loaded after failure and no duplicate playback may occur.

## 6. Multi-device conflict

Reserve D1 on iPhone, then attempt D1 from Android. Expect a clear active-session
conflict. Android D2 should still work. Release iPhone D1 and retry Android D1;
it should then succeed. Capture both screens and diagnostics if ownership is
wrong or one client releases the other client's newer reservation.

## 7. Audible deck and mixer checks

With synthetic/test guests on both decks, verify Play never happens
automatically, each transport controls only its deck, crossfader extremes isolate
the correct side, centre mixes both, master/volume/EQ/filter/pan and meters use
the normal graph, and browser recording (if already active) receives the
post-master mix. Failure includes double sources, wrong-deck audio, stale
waveform/grid data, or guest analysis being generated.

## 8. Cleanup and lease expiry

Expire an isolated test guest through the normal test controls/configuration.
While D1 or D2 holds a live lease it must remain and diagnostics must say it was
retained for a deck reference. Eject/release it and run/wait for cleanup; it may
then be removed. Abandon a session and wait beyond the five-minute loaded lease;
the reference must become reclaimable. Repeat cleanup to confirm idempotency.
Production library items, recordings and uploads must remain untouched.
