# BRMediaMixxx protocol

Protocol name: `BRMediaMixxx`  
Current version: `5`  
M4 transport: MIDI channel 1 through loopMIDI port `BRMedia Mixxx Remote`

BRMedia uses semantic control names; raw MIDI is not exposed through the HTTP
API. Mixxx controller scripting is the adapter and the future home for
structured subscriptions and state feedback.

| Data byte 1 | Reserved category |
| --- | --- |
| `0x10–0x1f` | Deck 1 transport/control |
| `0x20–0x2f` | Deck 2 transport/control |
| `0x30–0x3f` | Deck 1 structured state feedback |
| `0x40–0x4f` | Deck 2 structured state feedback |
| `0x50–0x5f` | Mixer/master controls |
| `0x60–0x6f` | Mixer/master feedback |
| `0x70–0x7f` | Protocol/system and capability negotiation |

M4 assigns play/cue for each deck, crossfader, heartbeat and protocol version.
All other addresses are reserved. Later revisions can add track metadata,
timing/BPM/beat state, pitch, sync, cues, loops, EQ/filter, effects, meters and
library loading without changing backend selection.

Native and Mixxx remain separate backends. Selection never transfers playback
or sends transport. The protocol contains no Mixxx SQLite or collection-writing
operation.


## M4 backend reconciliation

Persisted backend choice and enablement are restored at server startup. Mixxx is
made effective only when the fixed MIDI input and output open successfully;
otherwise runtime and persistence fall back to BRMedia Native together. Guarded
runtime changes use `POST /api/dj/mixxx/backend`, verify Native playback is
stopped, and persist only after the bridge succeeds.

`GET /api/dj/mixxx/status` reports configured and effective backends,
reconciliation state/reason/time, connectivity, and protocol version. The
frontend treats the effective backend as authoritative. Reconciliation emits no
transport messages and performs no Mixxx database access or writes.


## M5 protocol v2: two-way live deck state

Protocol v2 preserves every v1/M4 outbound assignment. Feedback uses Note On
status `0x90`: system heartbeat `0x70`, version `0x71`, snapshot
acknowledgement `0x72`; Deck 1 uses `0x30-0x3f`, Deck 2 uses
`0x40-0x4f`. Per-deck offsets are: flags 0; normalised position 1/2;
duration deciseconds 3/4; position deciseconds 5/6; analysed BPM tenths 7/8;
live BPM tenths 9/10; signed rate 11/12; pitch range 13/14; snapshot sequence
15. Paired values are unsigned 14-bit, high byte first. Rate maps -1..1 around
8192. Pitch range uses 1/4096 units.

Flags are loaded=1, playing=2, cue-verifiable=4, cue-active=8. Metadata SysEx
is reserved as `F0 7D 42 52 4D version deck field sequence total nibble-data
F7`; UTF-8 bytes are split into high/low nibbles and limited to 96 bytes.
Fields are title=1, artist=2, album=3, source identifier=4. The installed Mixxx
2.5 controller API exposes no supported string metadata accessor, so the M5
mapping does not fabricate those packets and BRMedia reports null.

Transport and flags are change-driven, position is bounded at 4 Hz, numeric
state at 1 Hz, and heartbeat at 0.5 Hz. Feedback older than five seconds is
stale. No local playhead extrapolation occurs.

Heartbeat `0x90/0x70` is periodic Mixxx-to-BRMedia feedback only. It is not
bound as a Mixxx input control and must never be echoed by the controller
mapping, because an echo on a loopback MIDI cable creates an unbounded feedback
loop and causes loopMIDI to mute the port.


## M6 protocol v3: core mixer control and feedback

Protocol v3 preserves all v1/M4 transport notes and all v2/M5 deck-state notes
and encodings. The dedicated repository preset is:

- `tools/mixxx/BRMedia-Mixxx-M6-Core-Mixer.midi.xml`
- `tools/mixxx/BRMedia-Mixxx-M6-Core-Mixer-scripts.js`

The files are intentionally unique and do not replace physical-controller
mappings. Install both files together in the Mixxx user `controllers` folder
and select **BRMedia Mixxx Remote** for the loopMIDI device.

### Outbound BRMedia to Mixxx

All mixer values are absolute 7-bit CC on MIDI channel 1 (`0xb0`). The wire
value is `round(clamp(normalised, 0, 1) * 127)`.

| CC | Control | Neutral | Scaling |
| --- | --- | --- | --- |
| `0x50` | Crossfader | 64 | BRMedia 0..100 / 100; Mixxx parameter 0..1 |
| `0x51` | Master volume | 85 | BRMedia 0..150 / 150; boost conversion below |
| `0x52` / `0x59` | Deck 1 / 2 gain | 85 | BRMedia 0..150 / 150; boost conversion |
| `0x53` / `0x5a` | Deck 1 / 2 EQ high | 85 | BRMedia 0..150 / 150; boost conversion |
| `0x54` / `0x5b` | Deck 1 / 2 EQ mid | 85 | BRMedia 0..150 / 150; boost conversion |
| `0x55` / `0x5c` | Deck 1 / 2 EQ low | 85 | BRMedia 0..150 / 150; boost conversion |
| `0x56` / `0x5d` | Deck 1 / 2 filter | 64 | BRMedia 0..100 / 100; centre is exactly 0.5 |
| `0x57` / `0x5e` | Deck 1 / 2 channel volume | 127 | BRMedia 0..100 / 100 |
| `0x58` / `0x5f` | Deck 1 / 2 PFL | 0 | 0 off, 127 on; reserved until matching UI exists |

The script uses documented Mixxx controls: `pregain`, `volume`, `pfl`;
`parameter3/2/1` in `[EqualizerRack1_[ChannelN]_Effect1]`; `super1` in
`[QuickEffectRack1_[ChannelN]]`; and `crossfader` / `volume` in
`[Master]`.

For gain, EQ and master boost controls, BRMedia wire neutral is 2/3 while
Mixxx parameter neutral is 1/2:

- wire <= 2/3: `mixxx = wire * 0.75`
- wire > 2/3: `mixxx = 0.5 + (wire - 2/3) * 1.5`
- feedback applies the exact inverse.

This retains BRMedia's 0..150 range and 100 reset point, including boost.

### Mixxx feedback

Mixer feedback is absolute 7-bit CC on MIDI channel 2 (`0xb1`). Controls
`0x50..0x5f` mirror the outbound fields. Meter feedback is:

| CC | Feedback |
| --- | --- |
| `0x60` / `0x62` | Deck 1 / 2 pre-fader `vu_meter` |
| `0x61` / `0x63` | Deck 1 / 2 `PeakIndicator` |
| `0x64` / `0x65` | Master left / right `vu_meter` |
| `0x66` | Master `PeakIndicator` |

Meters are sampled at a maximum of 20 Hz. Mixer parameters are sampled at a
maximum of 10 Hz. Identical quantised values are coalesced. Deck position
remains 4 Hz, slow deck state 1 Hz, and heartbeat 0.5 Hz. The browser polls the
combined state at 4 Hz only while Mixxx is the effective backend and the page is
visible.

Feedback never invokes outbound handlers. BRMedia rejects non-finite or
out-of-range API values and exposes no raw MIDI route. Mixer and deck feedback
remain last-known but explicitly stale after five seconds without valid
feedback; a valid heartbeat plus field feedback clears stale state.

### Reserved ranges

The v3 allocation is: `0x10..0x1f` Deck 1 transport, `0x20..0x2f` Deck 2
transport, `0x30..0x3f` Deck 1 state, `0x40..0x4f` Deck 2 state,
`0x50..0x51` shared mixer, `0x52..0x58` Deck 1 mixer,
`0x59..0x5f` Deck 2 mixer, `0x60..0x66` metering/clip,
`0x70..0x77` acknowledgements/errors, and `0x78..0x7f` future performance
controls.


## M7 / protocol v4 authoritative live-engine extension

All v1-v3 assignments remain unchanged. M7 outbound performance commands use CC
status `0xB2`; feedback uses CC status `0xB3`. Deck 1 bases at `0x00`,
Deck 2 at `0x20`.

Outbound offsets: 0 sync toggle, 1 quantize toggle, 2 loop-in, 3 loop-out,
4 reloop toggle, 5 auto-loop activate, 6 loop size, 7 beat-jump backward,
8 beat-jump forward, and 0x10-0x17 hot cues 1-8. Buttons send 127. Loop size
encodes `64 + log2(beats) * 8`, clamped to 1..127.

Feedback offsets: 0 sync enabled, 1 sync leader, 2 quantize, 3 loop enabled,
4 loop size with the same logarithmic encoding, 5 beat phase at 7-bit
precision, 6/7 reserved (beat ordinal unavailable), 8 Mixxx visual-key code,
9 keylock, 10 effect-unit mix, 11 effect-unit channel assignment enabled,
and 0x10-0x17 hot-cue enabled flags. Performance feedback is capped at 8 Hz
and unchanged MIDI values are coalesced. Beat position, memory cues, musical-key text and
downbeat identity remain null because the verified controller catalogue does
not provide a safe, unambiguous value for this bridge.

In Mixxx mode the frontend asserts external playback authority on the Native
audio engine. Any already-playing Native deck is paused; Native joint
transport, rate and mixer mutations become guarded no-ops. Switching back to
Native removes the guard without changing Native behaviour.


## M11 prepared-analysis integration

M11 is an integration layer, not a new analysis algorithm or MIDI protocol revision. `GET /library` adds a compact `djAnalysis` summary with precise stored BPM, detected key and Camelot value, confidence/status flags, tempo mode, prepared waveform/grid state, and manual/locked ownership. Large diagnostics and history are excluded from catalogue payloads.

`GET /dj-analysis/tracks/:id` loads bounded details only when the operator opens INFO. It includes confidence components, drift/downbeat/phrase evidence, reusable waveform-cache registration, grid segments, the latest 20 history entries, and advanced diagnostics. The route accepts only a library track id; it cannot accept a path, start analysis, mutate a grid, or access the Mixxx database.

Manual `dj-prep` saves append a bounded correction-history entry before the existing manifest save. Manual and locked grids remain authoritative. The frontend never starts or forces reanalysis while rendering or opening detail.

Live/stored grid comparison and harmonic compatibility are conservative: stale or incomplete live data returns unavailable, BPM/phase disagreements are reported rather than corrected, and harmonic hints require both keys to meet the confidence threshold. No M11 path writes Mixxx analysis data or changes playback authority.
## M12 waveform alignment

Protocol version 5 reserves paired 7-bit absolute-position controls for each deck. BRMedia sends a bounded 14-bit position only while Mixxx Backend owns transport. The detailed waveform interpolates authoritative Mixxx feedback, reconciles every update, snaps on discontinuities, and freezes when feedback becomes stale. Native mode retains AudioContext timing and never sends Mixxx controls.

Prepared M12 waveform caches use `multiscale-spectral-m12-v1` and the `.m12wave.json` suffix with validated 512, 2048, 8192, and 32768 sample spectral levels. Writes are atomic. Legacy caches remain readable but are not silently promoted; production regeneration requires separate approval.


## M20 Part 1 professional transport extension

Protocol v5 remains current. The previously reserved transport addresses add
explicit pause and stop-to-start commands without changing play or cue:

| Deck | Play | Cue | Pause | Stop to start |
| --- | --- | --- | --- | --- |
| 1 | `0x10` | `0x11` | `0x12` | `0x13` |
| 2 | `0x20` | `0x21` | `0x22` | `0x23` |

Play is now an explicit `play=1` command rather than a toggle. Pause uses
Mixxx's `stop` control, which pauses at the current position. Stop uses
`start_stop`, which stops and returns to the beginning. Cue retains its
press/release pair.

The existing state flags add bit 4 (`0x10`) for Mixxx's read-only
`end_of_track` warning. BRMedia derives remaining seconds, pitch percentage and
tempo-range percentage from the ordered duration, elapsed position, rate and
rate-range fields. Position feedback is committed with a per-deck sequence at
4 Hz, so it participates in the M19 ordering rules rather than waiting for the
slow snapshot.

Absolute seeks remain bounded to 0..1 and are ignored by the mapping while
either `scratch2_enable` or `scratch_position_enable` is active. This prevents a
remote seek from fighting an active Mixxx scratch gesture.

Title and artist remain nullable. Protocol v5 retains the bounded metadata
SysEx format, but the Mixxx 2.5 controller control system exposes numeric
ControlObjects rather than a supported string-valued title/artist accessor.
The mapping therefore continues to report metadata unavailable instead of
inventing or scraping values. A future implementation needs a supported Mixxx
metadata source before it may emit those fields.


## M20 Part 2 professional control namespace

Protocol v5 remains current. M20 Part 2 adds CC status `0xB4` for professional
commands and `0xB5` for matching feedback. Deck 1 uses base `0x00`; Deck 2 uses
base `0x20`. This is additive and does not change M4-M20 Part 1 assignments.

Outbound offsets are: cue return 0, cue set 1, loop halve 2, loop double 3,
beat-jump size 4, hot-cue set/trigger/clear 5/6/7, explicit sync state 8,
signed rate high/low 9/10, tempo range high/low 11/12, mute 13, effect-unit
assignment enable 14, effect-unit mix 15, and Effect 1 parameter 1 at 16.

Rate is a signed 14-bit value centred at 8192. Tempo range is unsigned 14-bit.
Loop and beat-jump sizes use `64 + log2(beats) * 8` and are restricted to
1/32 through 128 beats at the HTTP boundary. Hot-cue numbers are restricted to
1 through 8. Effects are deliberately limited to controls represented safely
by the existing BRMedia UI: unit assignment/bypass, wet/dry mix, and the first
loaded effect's first normalised parameter.

Feedback offsets are: main-cue normalised position high/low 0/1, beat-jump
size 2, mute 3, Effect 1 parameter 1 at 4, loop-start normalised position
high/low 5/6, loop-end high/low 7/8, and hot-cue states 1-8 at 16-23.
Hot-cue state values preserve empty/set/active rather than reducing them to a
single boolean. Existing `0xB3` feedback continues to report sync enabled,
sync leader/follower, quantize, loop enabled/size, FX assignment and mix.

Mixer CC status `0xB0`/`0xB1` adds Deck 1/2 mute at `0x67`/`0x68`. Existing
PFL controls remain the supported headphone/cue state. Crossfader curve/mode
is intentionally unsupported because BRMedia does not expose a matching
unambiguous control and changing Mixxx preferences from a performance mapping
would be surprising.

Every command remains guarded by selected Mixxx authority, a live bridge,
protocol v5, healthy heartbeat, a current session, and explicit confirmation
that Native playback is stopped. Disconnect clears professional feedback
together with all other session state. Title and artist remain nullable for
the documented Mixxx 2.5 controller-API limitation described above.
