# Estabrek redesign verification — 2026-10-03

The four-page redesign is implemented locally on `feat/cinematic-storefront`. The production preview uses the original live-data environment at http://127.0.0.1:3000. No GitHub push, deployment, live CMS write or real contact submission was performed.

## Result

The homepage has a reversible held campaign, receding wordmark, three fabric chapters and a smaller final frame. Scroll palettes, a licensed fabric video and an interactive procedural hijab share the rose design. Shop retains its real catalog, filters, history, pagination and cart actions. Contact retains published prose, custom fields and service wiring. About uses authored content when available, with a factual store-description fallback.

## Verification evidence

| Check | Result | Local evidence |
| --- | --- | --- |
| Full Chrome browser suite | 34/34 pass, 1.8 minutes | `.tmp/rose-final-34-suite.log` |
| Frontend typecheck | Pass | `.tmp/rose-final-typecheck.log` |
| Frontend production build | Exit 0, 17 generated pages | `.tmp/rose-final-production-build.log` |
| Relevant Admin controls | 4/4 pass | `.tmp/admin-rose-tests-recheck.log` |
| Admin production build | Pass, isolated temporary output | `.tmp/admin-rose-build.log` |
| Whitespace check | Pass | `.tmp/rose-final-diff-check.log` |
| Final production browser check | Pass | `.tmp/rose-final-production-qa.json` |

Browser coverage includes forward/reverse scroll, resizing, reduced motion, JavaScript disabled, CMS animation disabled, unavailable WebGL, manual rotation and color selection, bilingual navigation/shop controls, contrast regressions, video refusal/failure/retry/pause, filter history and delayed-response cancellation, and authored contact fields with mocked delivery.

The five native template libraries retain server-rendered content and hydrated form input in fixture coverage. The extra development route is compiled before its no-JavaScript check. Live-data production checks also verify static homepage chapters and the published Contact form without JavaScript.

An independent read-only review found five Important issues: dark-surface contrast, native section presentation metadata, the second HERO action, primary-menu fallback and English shopping labels. All five were fixed and covered by browser regressions.

## Production measurements

The final live-data Chrome measurement records **343,842 encoded JavaScript bytes (335.8KiB)** across 28 requests before scrolling, including visible-link prefetch. This meets the 350KiB target. The earlier measurement during implementation was 634,344 bytes with an eagerly mounted hidden canvas; initial transfer is now about 46% smaller. The final build estimates 278kB first-load JS for Home/About/Contact and 291kB for Shop.

There is no canvas on first view and one when the fabric phase is approached. Navigation removes it. At 360×640, the actual Rotate right click changes rotation and its controls end at 510px, above the campaign action. All four routes have zero horizontal overflow; earlier desktop and 390×844 live-data inspections also passed.

A short desktop frame sample contains 119 intervals: median 6.1ms, p95 12.2ms, none over 50ms. The mobile video sample decodes 25 frames with none dropped, using the 480×854 source with a 10.63-second duration. These are local samples, not guarantees for every physical phone or network.

Video assets are 245,246 bytes for mobile and 824,243 bytes for desktop. Origin, license and processing are recorded in `estabrek-storefront/public/editorial/README.md`. Native template bundles are split through a small client boundary with default SSR; [Next.js documents the server-to-client splitting limitation](https://nextjs.org/docs/app/guides/lazy-loading).

The Windows production build emitted nonfatal `EBUSY` fetch-cache write warnings. It exited successfully; the final live-data preview and browser check passed without page errors.

## Review artifacts and integration

Open `.tmp/rose-review.html` for an interactive comparison of the four published pages against the local redesign. Captures include `.tmp/rose-live-home-model.png`, `.tmp/rose-live-model-mobile.png` and the four `.tmp/rose-live-*-desktop-start.png` images. The final desktop and short-mobile model captures were visually inspected.

The hijab is a procedural garment study rather than an actual scanned product model. The default clip is licensed fabric footage and can be replaced from CMS. The live CMS has no published About page, so the preview uses the public store description; a dedicated published-About browser fixture remains a coverage gap, with its adaptation reviewed through the shared interior renderer. No founder identity or statistics were invented.

All changes remain uncommitted in the existing checkout at `C:\Users\Ibrah\Desktop\estabrek`. Keep the branch and local audit artifacts for review; GitHub/Vercel integration is a later step under the approved scope.
