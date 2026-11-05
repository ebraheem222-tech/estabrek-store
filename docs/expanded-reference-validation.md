# Expanded reference capability validation — 2026-11-05

Scope: 19 inspected source references, 19 new editable starting sections, seven slider effects, eight procedural scene backgrounds, filtered/split galleries and lightboxes, annual billing, FAQ bulk controls, piano/guitar synthesis and sequencing, authored-data charts, a real clock, and responsive sticky styles. The existing 1,003 full-site designs remain available. Usage and source-to-feature mapping: [CMS guide](expanded-reference-cms-guide.md).

## Targeted checks

**156 distinct targeted cases passed** (repeated runs counted once):

| Area | Cases | Completed coverage |
|---|---:|---|
| Backend | 66 | New gallery/billing/FAQ29, creative nodes3, slider3, scenes2, all19 ready sections1 in three languages, existing tree25, and all1,003 independent design imports3 |
| Admin | 47 | Creative controls/defaults/sticky, ready sections, gallery/localization/reorder/undo, slider fields, scene controls/runtime, insertion/columns/defaults, setup/template picker and Hebrew dictionary |
| Storefront helpers | 17 | Slider normalization/effects/geometry/input cleanup8, gallery/billing4, notes/audio lifecycle/races5 |
| Browser | 26 | 23 new widget/gallery/scene/reference interaction cases and3 legacy slider regressions |

Browser accounting: 4 creative-widget tests + 10 expanded-slider tests + 6 gallery/billing tests + 1 reference-preview test + 2 section-scene tests + 3 existing slider tests = **26**. The reference preview checks every one of the19 sections at1440px and390px. AR/EN/HE serialization is checked separately by the backend reference test.

Backend commands:

```powershell
npm.cmd test -- src/tests/creativeNodes.unit.spec.ts src/tests/referenceSections.unit.spec.ts src/tests/sectionScene.unit.spec.ts src/tests/sliderEffects.unit.spec.ts src/tests/galleryBilling.unit.spec.ts src/tests/pageTree.unit.spec.ts
npm.cmd test -- src/tests/kits.unit.spec.ts
```

Admin command:

```powershell
npm.cmd test -- src/studio/CreativePanels.test.tsx src/studio/referenceSections.test.ts src/studio/ScenePanel.test.tsx src/studio/sectionScene.test.ts src/studio/sectionSceneCanvas.test.ts src/studio/sliderEffects.test.tsx src/studio/galleryBilling.test.tsx src/studio/blockDefaults.test.ts src/studio/columns.test.ts src/studio/insert.test.ts src/lib/words.test.ts src/features/setup
```

Storefront browser files: `creative-widgets.spec.ts`, `expanded-slider.browser.spec.ts`, `gallery-billing.spec.ts`, `reference-ready-preview.spec.ts`, `section-scenes.spec.ts`; existing `page-tree.spec.ts` ran with grep `a slider`. Pure helper configurations use separate output directories to avoid interfering with browser traces. The reference-preview test generates its own `.tmp/reference-ready-sections.json` before requesting the fixture route; no manual ignored artifact is required.

## Reproduced issues and repairs

- First note released while `AudioContext.resume()` was pending could play after release. A per-note generation token now cancels it; cancellation is distinct from unavailable audio.
- Key-up after focus moved to Volume, or after a modifier was pressed, could leave the note pressed. Tracked releases run before shortcut guards.
- Native dialog tabbing could leave the gallery’s controls. Explicit first/last Tab and Shift+Tab wrapping now preserves containment, Escape and opener restoration.
- Slider wheel/pointer navigation intercepted long captions. Captions now keep native scrolling. Real mobile inspection also found clipped small split frames and inaccessible centered text; split phone frames have a360px minimum and safe centering. The regression checks unobscured hit targets, actual touch scrolling and a subsequent image swipe.
- Changing Coverflow to another effect retained old geometry. The runtime now resets its card transforms/visibility when rebuilding.
- SVG chart `<title>` initially produced multi-child React warnings. It now renders one text string.
- A concurrent pure Playwright run initially cleaned a browser trace directory. Helper configurations now have isolated output directories, and affected browser checks were rerun.

Missing schema/types/defaults and controls were observed failing before their implementation. Review regression cases also failed before the corresponding repairs. No database test suite ran.

## Build and review evidence

- Admin Vite production build: passed. Tracked generated `dist/index.html` restored afterward.
- Backend TypeScript production build: passed.
- Storefront TypeScript check and production build: passed.
- The Windows storefront build emitted nonfatal `EBUSY` fetch-cache update warnings while generating pages, then completed with exit0. Existing stale Browserslist and large Admin chunk warnings also remain.
- Fresh read-only review covered schemas, ownership, registrations, all19 factories, scenes/resources/layering, sliders, gallery focus, billing/FAQ, audio, charts, clock and sticky behavior. Its material findings were repaired and reviewed again; no remaining high/medium findings were reported.
- Full Admin `tsc -p tsconfig.app.json --noEmit` still fails in existing unrelated app/config/dashboard/theme files. No diagnostics pointed to the new editor/capability files. Root `tsc --noEmit` alone is not a full Admin check because the root project has only references.

## Visual evidence and limits

Actual section captures were inspected for glass/constellation, coverflow, piano and split preview. The screenshot test also captures sliced slider, spotlight and expanding panels, with phone variants. Test-only outer fixture headers are hidden in the captures; customer sections themselves contain no Estabrek branding.

Gallery: `.tmp/reference-capabilities/index.html`; combined image: `.tmp/reference-capabilities/overview.png`.

The section recipes use original implementations and neutral local starter illustrations. Reference demo financial numbers, fake analytics, simulated image generation and contact-success alerts were not imported as real services. This does not add AI generation, market feeds or payment integrations. No downloaded script execution, deployment, migration, customer database writes or commits occurred.
