# Distinct Source Templates Implementation Plan

> **For agentic workers:** Apply dispatching-parallel-agents to independently owned template groups; test-driven-development for contracts; fresh read-only review before completion.

**Goal:** Deliver19 different complete CMS templates corresponding to the supplied19 source designs.

**Architecture:** Native CMS trees in three source-specific modules, shared only for low-level helpers/metadata. Copy each source's own image assets. Extend owned region builders and render real screenshot cards for the new collection.

**Tech Stack:** Existing React/Next/Vite/Zod/motion/Canvas/3D capabilities; no dependencies.

**Spec:** `docs/superpowers/specs/2026-11-05-distinct-source-templates.md`

## Global Constraints
- Preserve previous dirty work,1,003 IDs and independent merchant ownership.
- Source-specific layout/assets throughout; no experimental placeholder reuse or six-section universal recipe.
- No source HTML/JS iframe shortcuts, database writes, deployment or commits.
- Preserve multilingual/mobile/editable/undo behavior.

## Review Focus
- Repeated hero/body structures disguised by colour/text changes.
- Missing or incorrect source images and stock placeholder fallbacks.
- Custom header/footer losing owner brand or failing to copy independently.
- Source copy inventing merchant claims in installed designs.
- Screenshot cards hiding differences or breaking existing library pagination.

### Task1: Asset provenance and source baselines (parent)
- [ ] Inventory source assets and capture original design baselines.
- [ ] Copy only supplied images into deterministic public paths; produce checked manifest.

### Task2: Registry/region/helper contracts (parent)
- [ ] Observe failing full-template/import tests.
- [ ] Implement optional source metadata, native custom regions and shared primitive helpers.

### Task3: Full designs A (independent delegated files)
Own `referenceTemplatesA.ts`:597,598,599,601,604,605. Read the six references and hand-compose full source-faithful native pages, all-language content and independent regions.
- [ ] Implement and locally validate all six owned designs.

### Task4: Full designs B (independent delegated files)
Own `referenceTemplatesB.ts`:606,615,616,617,619,625. Preserve their different music/portfolio/split/gallery/industrial/editorial compositions.
- [ ] Implement and locally validate all six owned designs.

### Task5: Full designs C (independent delegated files)
Own `referenceTemplatesC.ts`:602,614,618,621,622,623,633. Distinguish every source's hero, navigation and body rather than sharing a SaaS recipe.
- [ ] Implement and locally validate all seven owned designs.

### Task6: Gallery integration and verification (parent)
- [ ] Register19 templates, update exact counts without weakening the legacy1,003 checks.
- [ ] Generate19 real template screenshot cards and expose the source collection clearly.
- [ ] Verify all imports/regions/schema, desktop/mobile previews and interactions; run builds.
- [ ] Fresh review, repair material defects, publish local source-vs-CMS evidence and correction docs.

## Ledger
- Correction: previous work added tools/sections instead of the19 distinct complete templates the user intended. Preserve those tools, and add the missing full designs now. The user explicitly prefers distinct source designs; implementation choices here are ours.
