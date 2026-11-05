# Motion/media integration validation — 2026-11-05

This records the GSAP/Anime.js and video/3D editor feature, after the1000-template expansion. All checks ran locally with mocked database operations or the disposable catalog HTTP fixture; no customer database, production server, migration or commit was changed.

## Passing targeted checks

- Admin — **50 tests across11 files**: motion engine selection, profile application to normal and legacy look elements, preview/import/setup query parity, thousand-item picker, video colour/opacity and mobile disable override, 3D poster selection/clear/URL checks, prefab insertion, draft history, revision-safe50-operation batching and partial undo/redo recovery, translations.
  `npm test -- src/studio/motionMedia.test.tsx src/studio/draftBatches.test.ts src/studio/draft.test.ts src/studio/insert.test.ts src/studio/Model3dPanel.test.tsx src/studio/look.test.ts src/features/setup src/api/storeTemplates.api.test.ts src/lib/words.test.ts`
- Backend — **36 tests**: page tree schema, copied profile behavior, safe engine/media persistence, legacy looks, actual Admin video/3D prefabs in Arabic/English/Hebrew, all1000 gallery/live trees and1001 independent imports, and rich Anime/still imports of all1000 home/header/footer designs.
  `npm test -- src/tests/motionMedia.unit.spec.ts src/tests/pageTree.unit.spec.ts src/tests/kits.unit.spec.ts`
- Storefront regression batch — **51 tests**: five real Anime browser cases, three template/media browser cases and43 existing page-tree tests. Includes repeated editor play, actual hover/loop values, scroll in both directions, phone lite/off, reduced-motion transitions; a generated playableWebM under black/coloured overlays; failed-GLB poster fallback; existing SVG/text/spring/scroll/media/3D behavior.
  `npm test -- tests/anime-motion.spec.ts tests/motion-media.spec.ts tests/page-tree.spec.ts --reporter=line`
- Final Storefront focused batch — **16 tests**: repeats the eight new browser cases after integration fixes, adds five actual-Anime adapter tests and three independent-design tests.
  `npm test -- tests/anime-motion.unit.spec.ts tests/motion-media.spec.ts tests/anime-motion.spec.ts tests/independent-design.spec.ts --reporter=line`

These batches cover **145 distinct passing targeted cases** (repeated cases counted once). Storefront TypeScript, Admin Vite build, Backend TypeScript build and production Storefront Next build all passed. Next generated all45 static pages and completed type checking; only the existing Browserslist/edge-runtime notices remained. The generated tracked Admin `dist/index.html` was restored to its pre-build version; source changes remain local and reviewable.

## Review findings resolved

- Replaced retained readiness/error key caches with a keyed3D instance lifecycle. Returning to a previousGLB gets a fresh load/error state; leaving the near-screen region releases the canvas and restores loading state.
- Partial undo/redo now reconciles saved prefixes and remaining operations instead of dropping all history. Travel selection runs inside the existing serialized draft queue.
- Whole-page profiles now transform legacy `props.looks` and issue `setLookMotion` operations as well as ordinary node motion.
- Two initial browser failures were invalid fixtures: numeric spacer heights were rejected by the existing CSS schema, and an HTTP video URL was rejected by the existing media renderer. Fixtures now use explicit pixel heights and an intercepted HTTPS URL serving a generated local clip. Forward/reverse and real-playback assertions were retained; the corrected batch passed.

The read-only reviewer independently reran backend8 and Admin13 targeted cases and reported no remaining material issue in the three fixes.

## Limits

- Admin's full TypeScript check still exits2 on existing `src/app.ts`, `src/config/security.ts`, `src/config/webhooks.ts`, DashboardPage, WebsiteThemeGalleryPicker and presets-extended. Current changed files do not appear in diagnostics. Vite build does not replace this full check.
- This does not convert1000 templates into separate3D or video asset packages. Owners choose media and models through editable sections. No new customer page is silently rewritten.
- Advanced GSAP plugins remain responsible for their specialized effects; Anime.js4.5.0 is lazy-loaded for actual selected tween channels, with GSAP ScrollTrigger coordinating geometry.
- Browser validation used a development server. No production deployment or live payment/database test was performed.
