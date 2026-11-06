# Reference Library 2000 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans; independent source auditing and bounded feature implementation may use parallel agents under superpowers:dispatching-parallel-agents. Steps use checkbox syntax.

**Goal:** Deliver 2000 editable designs with fifteen new reference compositions and reusable CMS controls.

**Architecture:** Preserve the existing catalog and author native trees. Add backend-validated interactive blocks and deterministic generated editions, integrated into the existing setup/editor picker.

**Tech Stack:** React, TypeScript, Next.js, Vite, Zod, existing GSAP/Anime.js and Canvas2D.

**Spec:** `docs/superpowers/specs/2026-11-06-reference-library-2000.md`

## Global Constraints

- Preserve all 1022 existing template IDs and compositions.
- Final total 2000 = 1022 existing + 15 new originals + 963 generated editions.
- No vendor scripts, new framework, live data writes or shared customer design trees.
- Preserve multilingual editor controls, responsive layouts, reduced motion and source attribution.

## Review Focus

- Duplicate layouts hidden by changed copy/assets/order: test detailed and coarse structure in preview and installed trees.
- Empty/malformed table cells and translated filters: defensive parsers, backend limits and browser interactions.
- Interdependent regions: import all regions with unique IDs and detached objects.
- Large gallery: lazy thumbnails, working collection filtering and no reused screenshots for editions.
- Animation on mobile/offscreen/reduced motion: use existing scene lifecycle and inspect browser behavior.

### Task 1: Audit and fifteen source compositions

**Files:** `addons_themes/`, `templates/referenceTemplatesD.ts`, `templates/referenceShared.ts`, `templates/referenceAssets.ts`, `scripts/import-reference-assets.mjs`, source tests.

**Interface:** Export `REFERENCE_TEMPLATES_D: Template[]`; unique `reference-<slug>` IDs, standard Template/source/regions contracts. Existing asset importer adds fifteen source numbers without removing existing ones.

- [x] Audit local HTML/CSS/JS and attribution; document useful unique layouts.
- [x] Write and run failing tests for fifteen independent templates and local assets.
- [x] Author native pages, using schedule/comparison from Task 2 where appropriate.
- [x] Run source/import validation; import vetted local image assets.

### Task 2: Editable schedule and comparison controls

**Files:** backend `src/lib/pageTree.ts`; storefront `src/pageTree/`; admin tree/API type declarations, AddPanel, TypePanels, defaults and new panels; focused tests.

**Interfaces:** `schedule` props: `{label,items:[{day,time,title,text?,speaker?,location?,href?}],layout:'cards'|'table'|'timeline',filterDays?,showLocation?}`. Localized fields except `time` and `href`; maximum 40 items. `comparison` props: `{label,columns:[{title,subtitle?,highlight?,href?,cta?}],rows:[{label,values:[{text?,state?:'yes'|'no'|'text'}]}],caption?,stickyHeader?}`; max 6 columns, 20 rows. Text fields localized.

- [x] Write failing parser/schema/editor tests for filtering, cells and bounds.
- [x] Implement defensive readers, accessible responsive views, validated schema and editor operations.
- [x] Run relevant suites; make sure installed template trees pass validation.

### Task 3: Matrix scene

**Files:** existing scene reader, Canvas painter, backend scene enum and admin scene options/tests.

**Interface:** Add `matrix` to existing `SceneKind` with unchanged scene settings.

- [x] Write a failing reader/painter test.
- [x] Add bounded deterministic glyph columns respecting existing visibility/reduced-motion lifecycle.
- [x] Run focused scene tests and inspect the Nexus-inspired page.

### Task 4: 963 reproducible structural editions

**Files:** new `templates/referenceEditions*.ts`, `scripts/expand-reference-catalog.ts`, catalog index/types, API metadata and tests.

**Interface:** Export `REFERENCE_EDITIONS: Template[]` with `edition` provenance and IDs independent from originals. Extend public catalog metadata additively.

- [x] Write and run failing tests for 2000 total designs, preserved IDs and independent structural variation.
- [x] Build deterministic source-inspired edition compositions and author a recipe manifest with collision rejection in both modes.
- [x] Regenerate twice/check determinism, validate all imports and ensure no palette-only/order-only duplicates.

### Task 5: Discoverable CMS collections and previews

**Files:** admin template API type, StoreTemplatePicker/StoreTemplateThumb and tests; public reference preview screenshots.

- [x] Write failing collection filtering/discovery tests.
- [x] Show originals and generated editions separately with searchable source provenance; preserve lazy previews.
- [x] Capture actual screenshots of all fifteen new native templates, inspect desktop/mobile and block interaction fixtures.

### Task 6: Review, verification and delivery

**Files:** docs/reference-library-2000.ar.md, validation record and release commit.

- [x] Run admin suite, storefront unit/browser checks, backend tree/template suites and all three builds.
- [x] Request independent whole-change review and address concrete findings.
- [ ] Commit only intended sources/assets/docs, merge/push per prior authorization, verify published assets/catalog and report observed results.
