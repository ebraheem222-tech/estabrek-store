# Hero scroll refresh fix — 2026-10-09

The active `RoseHeroFilm` component was bypassing the existing elapsed-time
controller and film scheduler. It used a GSAP half-second scrub followed by
immediate, chained video seeks instead.

The browser reproduction found 203 `seeked` events during a three-second
forward/reverse scroll where the next seek had already begun before the
canvas's listener could draw the completed picture. This is a frame delivery
problem, separate from how quickly a phone can decode the film.

## Change

- ScrollTrigger supplies the native scroll target. The existing
  `createHeroScrollMotion` controller advances progress on requestAnimationFrame
  using actual elapsed seconds and distance to that target:
  `position += (target - position) * (1 - exp(-dt / 0.065))`.
- Position, film scale, and captions use that same progress. The response has
  the same duration at different refresh rates and reverses without overshoot.
  This hero has one vertical progress axis; it does not intercept wheel/touch
  input or introduce artificial horizontal scrolling.
- The existing film scheduler coalesces targets, chooses actual 24 FPS source
  frames, and permits at most 60 seeks/second (30 in the existing lite mode).
  Transforms still follow display callbacks independently of that decode cap.
- A seek remains owned until its `seeked` event. Checking only `video.seeking`
  was insufficient: browsers can clear that flag before dispatching the event.
  The next request is scheduled for a later display callback, allowing the
  completed frame's canvas listeners to run first.
- Both controllers stop when settled and suspend while the document is hidden.
  A jump below the hero is allowed to finish its short settling work, so the
  existing scarf flight can use the finished picture.

The film files, source selection, download strategy, shader, layout, and other
page sections are unchanged. No video re-encoding or new dependency is involved.

The display callback and elapsed-time approach follows the browser's
[requestAnimationFrame contract](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
It cannot turn a 24 FPS film into newly generated 120 FPS video frames.

## Validation

The targeted browser regression checks actual seek completion and WebGL uploads
on desktop, a phone-sized viewport, and a phone-sized viewport with 4× CPU
slowdown. Timing checks cover simulated 15/30/60/120/165 FPS and seek pacing on
90/120/144 Hz displays. A separate browser check jumps directly from mid-hero to
the products, then returns to the start.

All eight targeted checks, the TypeScript check, and the production build passed.
The build used the local catalog test server and exited successfully, with
Windows fetch-cache `EBUSY` warnings and an outdated Browserslist warning. The final
three-second browser runs recorded:

| Local Chrome scenario | Completed seeks | Premature next seeks | Canvas uploads |
| --- | ---: | ---: | ---: |
| Desktop viewport | 92 | 0 | 92 |
| Phone viewport | 178 | 0 | 179 |
| Phone viewport, 4× CPU slowdown | 46 | 0 | 47 |

The one extra upload can come from the existing renderer's load/snapshot events.
These counts measure this local run, not a promised frame rate on other devices.

Run:

```text
node node_modules/@playwright/test/cli.js test tests/hero-scroll-timing.spec.ts tests/hero-scrubber.spec.ts --reporter=line
npm.cmd run typecheck
```

These are local Chrome checks and simulations, not measurements of a physical
phone or Safari. They establish that the frame-delivery race is removed;
decoding cost and other page animations can still affect device performance.

## Pre-existing test mismatches

Before this patch, all three `tests/hero-video.spec.ts` browser checks failed:

- `uses the original MP4 without downloading generated replacements` expected
  a `data-decoder` attribute absent from the active component. Its direct-source
  expectations also differ from the active component's blob/mobile source flow.
- `settles after fast forward/reverse scroll without reuploading idle frames`
  expected `data-frame`, which the current canvas renderer does not expose.
- `starts decoding when mobile preload supplies metadata before a picture`
  failed to obtain a ready canvas with the original seek implementation; it
  additionally requires the missing `data-decoder` attribute.

Those older tests and their source-selection requirements have not been rewritten
as part of this timing fix. The new regressions inspect native media behavior
and actual WebGL uploads directly.
