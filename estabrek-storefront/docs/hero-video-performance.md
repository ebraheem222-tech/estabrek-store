# Hero scroll timing — 2026-10-09

The hero uses the untouched original `hero-film.mp4`: 833,259 bytes,
1280×720, 24 FPS. SHA-256:
`28f219de465eb05feca800525ad2c546b6d62ba22948151a882437280909f091`.
Original WebM remains the native fallback. Layout, scale, the four headline
colours, tint shader, shopping actions, mascot and category fixes are preserved.

Scroll input sets a target once. One requestAnimationFrame controller moves
toward it using elapsed time: `current += (target-current) * (1-exp(-dt/.065))`.
The same progress drives the film, its scale and its captions. The controller
coalesces input, reverses without overshoot, stops when settled and pauses while
hidden/offscreen. The existing video scheduler allows one seek at a time and
coalesces pending positions. Each decoded frame is uploaded once; tint reuses it.

## Container comparison

MKV and AVI copies were made by remuxing the original compressed H264 stream,
without re-encoding. The files stayed in the private diagnostic directory.
Native browser probes used fully buffered video to isolate seeking costs.

| Windows browser | MP4 median seek | MKV median seek | AVI |
| --- | ---: | ---: | --- |
| Chrome | 33.2ms | 30.1ms | Native decoder rejected it |
| Brave | 28.7ms | 28.7ms | Native decoder rejected it |
| Firefox | 142ms | 139ms | Native decoder rejected it |

MKV did not eliminate the repeated-seek cost. The original MP4 remains selected.
These are local runs, not measurements of the user's device or Safari.

## Rejected decoder experiment

A direct WebCodecs prototype could decode all 240 original frames quickly when
closing each frame immediately. Retaining hardware frames blocked the surface
pool in a whole-page run. Software decoding avoided that failure but a moving
36-frame window still produced long pauses: only 8–11 frame changes/s forward
in the final comparison, versus 28–36/s with native seeking. The prototype,
packet index and its generator were removed. Functional tests alone had missed
this regression; the complete-page measurement determined the decision.

## Verification and limits

The elapsed-time checks exercise 15/30/60/120/165 FPS and rapid reversals;
the existing scheduler check covers 90/120/144Hz seek budgets. Browser checks
cover the exact original source, forward/reverse settling, mobile readiness,
four headline colours, reduced motion, data saver and failure fallbacks.

Scroll timing and native decoding are separate costs. The new controller makes
the response independent of frame rate; native decoding and main-page rendering
can still cause stutter. No universal video-FPS improvement is claimed. A
device/browser question is pending for reproducing the user's exact case.

The final production comparison used Brave on Windows, a 393×873 viewport at
DPR 3, fully buffered original MP4 and alternating immediate/damped runs.
Disabling damping in the new scroll loop produced 21.6–29.1 frame changes/s
forward and 30.8/s reverse. Enabling it produced 34.2–34.5/s forward and
34.6–36.7/s reverse, with no page errors. This isolates damping in the current
loop; it is not a benchmark of the entire website before earlier changes.
Local system load varied, and these numbers do not predict another device.

The final native-video implementation passes 16 hero/video/film browser checks
and three timing/scheduler checks. Production build succeeds; Next emits
Windows fetch-cache EBUSY warnings during prerendering. Desktop/mobile
production checks verify the original MP4 source and native resolution.
