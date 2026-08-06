# M26 experimental GStreamer transport report

Date: 2026-08-05 (Europe/London)

## Installation record

- GStreamer version: 1.28.5
- Installer filename: `gstreamer-1.0-msvc-x86_64-1.28.5.exe`
- Official source: `https://gstreamer.freedesktop.org/data/pkg/windows/1.28.5/msvc/gstreamer-1.0-msvc-x86_64-1.28.5.exe`
- Official checksum source: `https://gstreamer.freedesktop.org/data/pkg/windows/1.28.5/msvc/gstreamer-1.0-msvc-x86_64-1.28.5.exe.sha256sum`
- SHA-256: `51ee5eaec33008e8409d8cf6f6884457f22aa3bd515f8856f993a3eaab903530`
- Verified before installation: yes (`sha256sum -c` returned `OK`)
- Installer size: 880,875,294 bytes
- Build: official MSVC x86-64 runtime
- Installation mode: current user, runtime only
- Installation command options: `/CURRENTUSER /TYPE=runtime /DIR=C:\Users\brmedia\AppData\Local\Programs\gstreamer\1.0\msvc_x86_64 /VERYSILENT /NORESTART /SP-`
- Installation path: `C:\Users\brmedia\AppData\Local\Programs\gstreamer\1.0\msvc_x86_64`
- PATH changed: no. The user PATH remained `C:\Users\brmedia\AppData\Local\Programs\OpenAI\Codex\bin;C:\Users\brmedia\AppData\Local\Microsoft\WindowsApps;` and the machine PATH was unchanged.
- Reboot required: no. The installer log states `Need to restart Windows? No`.
- Installer log: `C:\Users\brmedia\AppData\Local\Temp\gstreamer-1.28.5-install.log`

## Discovery and required elements

A fresh registry scan found 272 plugins and 1,570 features. `gst-launch-1.0` and `gst-inspect-1.0` both run as version 1.28.5.

Required plugins/elements present and inspectable:

- `wasapi2src` and `wasapisrc`
- `audioconvert`
- `audioresample`
- `queue`
- `opusenc`
- `rtpopuspay`
- `webrtcbin`
- `webrtcsink` (available, rswebrtc 0.15.3-cee45224c)
- `nice`
- `dtls`
- `srtp`

Missing required plugins: none.

Discovery warnings outside the required set:

- `gstpython.dll` was the one blacklisted plugin.
- `gst-validate-1.0` reported that the optional GIO module `giolibproxy.dll` could not be loaded. This did not stop the audio pipeline or either validation scenario.

## Capture endpoint

- Friendly name: `Speakers / Headphones (Realtek Audio)`
- WASAPI render endpoint: `{0.0.0.00000000}.{5ea0cb70-773b-4941-bf5b-780c3bd2d0a8}`
- GStreamer device monitor confirmed the endpoint as a loopback-capable `wasapi2` audio source.
- The checked-in explicit endpoint probe returned active render state 1.
- Mixxx is configured for 48,000 Hz and its current log identifies this same device as its output sound-device clock reference.

## Standalone proof

Exact pipeline description:

```text
wasapi2src device={0.0.0.00000000}.{5ea0cb70-773b-4941-bf5b-780c3bd2d0a8} loopback=true low-latency=true provide-clock=true ! audioconvert ! audioresample ! audio/x-raw,format=S16LE,rate=48000,channels=2,layout=interleaved ! queue name=rawq max-size-time=200000000 max-size-buffers=0 max-size-bytes=0 leaky=no silent=false ! identity name=preopus silent=true check-imperfect-timestamp=true check-imperfect-offset=true ! opusenc bitrate=128000 frame-size=20 perfect-timestamp=false ! rtpopuspay pt=111 ! queue name=rtpq max-size-time=200000000 max-size-buffers=0 max-size-bytes=0 leaky=no silent=false ! fakesink sync=true qos=true silent=true
```

The sink was intentionally non-audible to prevent duplicate audio. The negotiated caps at `wasapi2src`, after `audioresample`, at `identity`, and at the `opusenc` sink were exactly `S16LE`, 48,000 Hz, two-channel, interleaved. Opus output was 48,000 Hz stereo and RTP Opus advertised a 48,000 Hz clock.

The continuous scenario ran in PLAYING for 601 seconds. Reported position advanced monotonically at `speed: 1.000000`. The raw pre-Opus identity produced no imperfect-timestamp or imperfect-offset message. Both queues had a hard 200 ms time bound, were non-leaky, and produced no overrun/underrun or validation fault during the run.

The separate corrected state scenario proved PLAYING -> PAUSED -> PLAYING. Position advanced to 4.97 seconds, remained at exactly 4.97 seconds throughout a three-second pause, then resumed at 5.07 seconds and continued at 1.000000 speed. It reached EOS and NULL cleanly.

GStreamer Validate returned 0 and labelled both scenarios passed, but reported two findings:

1. EOS sequence numbers differed during scenario-driven teardown (`event::eos-has-wrong-seqnum`).
2. RTP output after SEGMENT/FLUSH lacked an expected `DISCONT` flag (`buffer::missing-discont`) on `rtpopuspay0` through the fake sink.

### RTP DISCONT investigation and acceptance

The second finding was isolated with a timestamped `GST_DEBUG=validate:2` trace. It is emitted first by `rtpopuspay0:src` at 0.3984002 seconds on the first RTP buffer; the later fake-sink report is propagation of that same buffer. It did not recur during continuous PLAYING, during PAUSED -> PLAYING, or in the post-resume interval.

GStreamer's validator expects the first buffer after STREAM_START, FLUSH_STOP, or a non-update SEGMENT to carry the internal `GST_BUFFER_FLAG_DISCONT` flag. `rtpopuspay` consumes the flagged Opus input buffer, constructs a new RTP header buffer, appends the Opus payload, and marks the first packet with the RTP marker bit and `GST_BUFFER_FLAG_MARKER`. It does not copy `GST_BUFFER_FLAG_DISCONT` onto that newly constructed RTP output buffer. The exact 1.28.5 implementation and current upstream implementation have identical buffer/flag handling.

For RTP audio, the marker bit identifies the beginning of a talkspurt. The warning therefore describes absent internal GStreamer discontinuity metadata at the payloader output; it does not report a missing RTP packet, timestamp gap, timestamp regression, queue overflow, or discontinuity in the pre-Opus audio. The 601-second run remained monotonic at 1.000000 speed with no imperfect timestamp/offset messages, and the pause/resume trace produced no new RTP DISCONT warning.

Classification: expected behaviour of the current `rtpopuspay` implementation, benign and cosmetic for this live pipeline, and not capable by itself of causing an audible glitch. It is accepted. No pipeline workaround was added because forcing a flag after the payloader would only silence validation and would not change the RTP wire behaviour.

Official references:

- GStreamer buffer flags (`DISCONT` and `MARKER`): https://gstreamer.freedesktop.org/documentation/gstreamer/gstbuffer.html
- GStreamer event ordering and SEGMENT after flush: https://gstreamer.freedesktop.org/documentation/plugin-development/advanced/events.html
- GStreamer stream/flush design: https://gstreamer.freedesktop.org/documentation/additional/design/streams.html

The standalone automated proof is therefore accepted as stable. Audible judgements still require the requested physical receiver validation and are not inferred from automation.

An orphan `gst-device-monitor-1.0` left by discovery was found and terminated by exact PID. A final audit showed no `gst-launch-1.0`, `gst-validate-1.0`, `gst-inspect-1.0`, or `gst-device-monitor-1.0` process.

## Integration decision

- Standalone proof fully passed: yes (RTP validator warning accepted as benign; physical receiver validation remains)
- Internal `gstreamer-webrtc` selector implemented: no
- Existing custom WebRTC route changed: no
- `custom-webrtc` still available: yes (existing production route untouched)
- Ready for BRMedia integration: yes, behind the internal selector only

`tools/windows/brmedia-runner.ps1` was not modified. M27 was not started. No commit or push was made.

## Rollback

### BRMedia service-account ACL

Before correction, the installation root contained only inherited full-control entries for `NT AUTHORITY\SYSTEM`, `BUILTIN\Administrators`, and `COLE-PC\brmedia`; it had no entry for `COLE-PC\Rosegrove Chippy`.

The exact ACL correction was:

```cmd
icacls "C:\Users\brmedia\AppData\Local\Programs\gstreamer\1.0\msvc_x86_64" /grant "COLE-PC\Rosegrove Chippy:(OI)(CI)(RX)"
```

The root now has one explicit inheritable `(OI)(CI)(RX)` entry. Both `gst-launch-1.0.exe` and `gst-inspect-1.0.exe` show the resulting inherited `(I)(RX)` entry. No write, modify, full-control, owner, profile-wide, `Everyone`, or broad `Users` grant was added. Existing owner and ACL entries were preserved.

Remove only this added grant with:

```cmd
icacls "C:\Users\brmedia\AppData\Local\Programs\gstreamer\1.0\msvc_x86_64" /remove:g "COLE-PC\Rosegrove Chippy"
```

After removal, verify the root and an executable child with `icacls` to confirm the inherited RX entry is gone.

Run the current-user uninstaller:

```powershell
& 'C:\Users\brmedia\AppData\Local\Programs\gstreamer\1.0\msvc_x86_64\unins000.exe' /VERYSILENT /NORESTART
```

Then verify that `C:\Users\brmedia\AppData\Local\Programs\gstreamer\1.0\msvc_x86_64` and the current-user uninstall entry `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\c20a66dc-b249-4e6d-a68a-d0f836b2b3cf_is1` are gone. No PATH rollback is required because PATH was not changed. No reboot is expected.
