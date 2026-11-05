# Reference-inspired CMS validation — 2026-11-05

Scope: expanding showcase component/editor controls, procedural lantern, three original template compositions and nine local SVGs. Catalog total: **1,003**, preserving all earlier 1,000 IDs. Usage: [CMS guide](reference-inspired-cms-guide.md).

## Automated checks

**148 distinct targeted cases passed** across these completed batches (repeated cases counted once):

| Area | Cases | Coverage |
|---|---:|---|
| Backend | 62 | Showcase valid/invalid props, existing tree/motion contract, lantern roundtrip, ready presets in AR/EN/HE, all 1,003 templates in gallery/live modes, rich Anime/still imports and detached theme/global regions |
| Admin | 49 | Gallery controls/items/reorder/delete/undo, lantern metadata and ready section, existing defaults/columns/insertion/media, setup/template selection, dictionary coverage |
| Storefront | 37 | Catalog preservation and structural uniqueness; template import/translation/assets/palettes; lantern geometry/materials/knobs; untrusted showcase input; click/hover/focus/keyboard/touch/RTL/reduced-motion; eight panels at minimum height and maximum expansion ratio; new templates in AR desktop, EN/HE mobile; existing template API and 35-edition mobile regression |

Backend commands (isolated unit files, no database suite):

```powershell
npm.cmd test -- src/tests/showcase.unit.spec.ts src/tests/lantern.unit.spec.ts src/tests/pageTree.unit.spec.ts src/tests/motionMedia.unit.spec.ts
npm.cmd test -- src/tests/kits.unit.spec.ts
```

Admin:

```powershell
npm.cmd test -- src/studio/showcase.test.tsx src/studio/lanternPreset.test.ts src/studio/LanternModel3dPanel.test.tsx src/studio/Model3dPanel.test.tsx src/studio/blockDefaults.test.ts src/studio/columns.test.ts src/studio/insert.test.ts src/studio/motionMedia.test.tsx src/lib/words.test.ts src/features/setup
```

Storefront files tested in batches:

```powershell
npm.cmd test -- tests/catalog.unit.spec.ts tests/experimental.unit.spec.ts tests/lantern.unit.spec.ts tests/showcase.unit.spec.ts tests/showcase.spec.ts tests/experimental-preview.spec.ts tests/templates.spec.ts tests/template-preview.spec.ts
```

The catalog/experimental/lantern pure cases ran with a temporary configuration without web servers. Browser batches used the fixture API and Chrome through the existing Playwright configuration. The expanded baseline catalog authoring check also passed: `tsx.cmd scripts/expand-template-catalog.ts --check` returned 300 preserved + 700 generated; the three hand-composed additions are registered separately.

TDD evidence: missing gallery schema/editor and browser controls failed before implementation; missing lantern registry/geometry failed before implementation; missing template IDs/imports failed before registration; missing ready-lantern failed before adding the preset. A hover/focused-link regression was reproduced and repaired. Initial new preview expectations incorrectly assumed a language prefix for Arabic; the existing default-language route is `/shop`, confirmed in `withLang`, and the test was corrected.

## Builds and review

- Admin `npm.cmd run build`: passed (Vite).
- Backend `npm.cmd run build`: passed (TypeScript).
- Storefront `npm.cmd run typecheck` and `npm.cmd run build`: passed.
- `git diff --check`: passed; tracked generated Admin `dist/index.html` restored after build.
- Fresh read-only review: no high/medium findings after gallery focus and vertical sizing fixes. Its minor apparel-navigation comment was fixed with neutral collection/contact labels.

The full Admin TypeScript check still has earlier unrelated errors documented in [the prior validation](motion-media-validation.md); Vite build success does not establish that it is clean. The agent's broader Admin test run initially had one Hebrew dictionary failure (399 passed); new gallery/lantern translations were added and the targeted dictionary/feature batch subsequently passed. No claim of a new complete Admin suite rerun is made.

## Visual evidence and limits

Inspected actual desktop captures of all three designs, plus English/Hebrew mobile captures. New screenshots and an expandable HTML gallery are in `.tmp/template-gallery/reference-templates.html`; combined image: `.tmp/template-gallery/reference-templates-overview.png`. The lantern screenshot shows the rendered WebGL model, rather than only its poster.

No deployment, migrations, customer database writes or downloaded-template execution occurred. These are editable original compositions inspired by the supplied examples; the entire downloaded river world, sound system and image-slice simulations were not ported. Existing GSAP/Anime.js profile choices remain available. Independent customer installation on a real server was not re-tested in this batch.
