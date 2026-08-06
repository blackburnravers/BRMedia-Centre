# M21-D Native Guest-Track Deck Loading

M21-D connects validated M21-C guest tracks only to BRMedia’s native browser
Web Audio decks. It does not add Mixxx loading, permanent import, conversion,
analysis, waveform generation, tag changes, or library registration.

## Media delivery

`GET` and `HEAD /api/v1/guest-tracks/:guestId/media` accept an opaque guest ID,
an active reservation ID, and its bearer lease token. The server resolves the
file only from the authoritative guest record, repeats eligibility and
root-containment checks, rejects symlinks and changed sizes, and streams from
disk with single-range support. Multiple or malformed ranges return 416.

## Reservations and cleanup

Before loading, a browser reserves `d1` or `d2`. A loading lease lasts 90
seconds. After successful browser decode the reservation is committed and has a
five-minute lease, refreshed once per minute while the performance page retains
the guest. A page that is suspended, killed, or disconnected stops refreshing,
so its reservation becomes reclaimable without relying on `beforeunload`.

Deck identities are independent. The same guest may be loaded on both decks.
A browser client may supersede its own older deck generation. A second active
browser client cannot claim the same deck until the current lease is released
or expires. Cleanup expires stale reservations before making its deletion
decision and retains any guest with a live deck reference.

Release is idempotent for ten minutes using a bounded, private token-hash
tombstone. This lets page/eject retry paths finish safely without allowing an
old release to remove a newer reservation. Tombstones do not count as
references and are never returned by the API.

## Native loading and codec gate

The guest screen creates the lease and transfers an opaque load intent through
same-origin session storage to the existing performance page. The loader uses
the existing `DeckEngine.loadFile`, AudioContext, decodeAudioData, effects,
meters, crossfader, master and recording graph. Trusted ffprobe container/codec
metadata supplies an advisory `canPlayType` probe; decodeAudioData remains the
final authority. Guest loads do not autoplay and explicitly skip BPM, key,
grid, waveform, stem, or other analysis.

The loader downloads only the requested guest, decodes it through the existing
shared Web Audio engine, and then commits the replacement to `DeckEngine`.
This predecode boundary means a browser decode failure leaves the previously
loaded deck source intact. The final state must also report the requested guest
identity; a stale completion is rejected and its lease is released.

A playing target deck always requires explicit confirmation. Cancel releases
only the new lease and leaves the current deck unchanged. Successful
replacement commits the new lease before releasing the old guest lease.
Ejection invalidates the deck generation, stops and unloads the native source,
then releases the server lease.

## Mobile behaviour

The implementation uses Fetch, AbortController, Blob/File, session storage,
visibility/page lifecycle events, and large touch controls. iOS Safari/PWA and
Android Chrome/PWA may suspend or terminate JavaScript; no background execution
guarantee is made. Server leases provide bounded recovery when release or
heartbeat calls do not occur.
