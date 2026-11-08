# Internal object controls repair

> Execute inline with superpowers:executing-plans. One independent whole-branch review after verification.

**Goal:** Make selected internal objects expose working content and looks controls appropriate to their type.
**Architecture:** Reuse the measured part kind and existing look adapter for presets. Declare optional localized defaults and media source paths at renderers, validate them against the owning node, and save through normal draft operations.
**Tech Stack:** Existing React, TypeScript, Next, Zod, Vitest and Playwright.
**Spec:** docs/superpowers/specs/2026-11-08-cms-part-type-controls.md

## Constraints and review focus

- Default labels absent from old documents must become editable without migrating documents or changing unrelated locales.
- Runtime timer numbers and catalog data must not become frozen text.
- Part preset preview must restore on leave; committed edits must persist and undo without modifying the owner's appearance.
- Responsive, hover and entrance presets must use supported style/motion operations only.
- Declared media/text paths must stay inside the correct item; invalid paths and unsafe media remain rejected.

## Task 1: Repair selected part controls end to end

Files: admin `StudioPage.tsx`, `LooksPanel.tsx`, `partContent.ts`, `ContentBlocksPanel.tsx`; storefront `selectionParts.ts`, `StudioBridge.tsx`, `blocks.tsx`, `Interactive.tsx`; shared default word definitions; backend `pageTree.ts`; corresponding unit and browser tests.

- [x] Reproduce missing countdown content and nested text/button/image/box preset controls with failing fixture browser tests; pin default-field validation in unit tests.
- [x] Bind countdown/default labels, expose typed preset operations and safe preview, declare nested media sources, and provide runtime/source explanations.
- [x] Verify real content writes, inline typing, preview/commit/undo, locale retention, published rendering and existing deep-selection regressions.
- [ ] Run admin suite, builds and isolated backend CI; compare TypeScript baseline; review the complete change and repair findings.
- [ ] Merge/push and verify production artifacts under existing release authorization; record exact results.

## Task 2: Name the selected object first (added 2026-11-08 from the user's screenshot)

- [x] `PartKindCard`: kind (text, button or link, picture, video, box), live value, owner, repeat count and owner settings before any setting.
- [x] Type controls before size, box and padding; inner boxes named Box, not Section; the section drawings panel only for real tree nodes.
- [x] Paint-order picking looks through invisible overlays (before/after range input), so the picture under it is selectable.

## Task 3: Forty drawn section backgrounds and forty live sections

- [x] 40 new deterministic, bounded, pointer-optional scene kinds in `sceneCanvas.ts` (single standalone file), backend enum kept equal by test.
- [x] Background picker with six groups and live thumbnails.
- [x] `liveSections.ts`: 40 ready sections, one per new background, in three Add-panel groups; backend test checks every section in ar/en/he and that nothing is stripped.
- [x] Add-panel search; Hebrew dictionary coverage.

