# CMS deep selection implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. One independent read-only whole-change review before integration.

**Goal:** Select and edit the visible internal objects of complex CMS widgets reliably.
**Architecture:** Shared frontend DOM target codec and collector, validated native part styles stored on owners, extended bridge measurements and paint-order requests, and an accessible selection chooser in Studio.
**Tech stack:** Existing TypeScript/React/Next/Express/Zod, Vitest/JSDOM, Playwright.
**Spec:** docs/superpowers/specs/2026-11-08-cms-deep-selection.md

## Global constraints

- Preserve existing native primitive selection and commerce behavior.
- Only validated semantic names and bounded DOM paths; never executable selectors.
- Native looks travel with their owner; repeated card parts style the card template.
- Locked ancestry applies to details; selection never implicitly moves a parent widget.
- Page drafts, publication, responsive editing and same-document refresh stay in effect.
- No tests or fixture writes against merchant APIs or databases.

## Review focus

- Nested/repeated widgets must resolve to the correct owner without styling unrelated nodes.
- Paint order, clipping, rotated boxes and locked ancestors must agree with click results.
- Copy/undo/linked block renaming must retain native part appearances.
- Removed or changed DOM structures must not turn stored targets into arbitrary selectors.
- Input focus, browser shortcuts and stale iframe messages must not corrupt selection.

### Task 1: Portable part targets, collection and styling

Files: storefront pageTree/selectionParts.ts, tree.ts, css.ts, StudioBridge.tsx; backend pageTree.ts/pageDraft.ts; admin draft.ts/treeIndex.ts and relevant contract tests.

- [x] Write RED tests for safe target parity, nested/repeated collection, primitive exclusion and parent ownership.
- [x] Implement bounded codec/collector, native props.partLooks and existing look-op adapters; verify GREEN and copy/undo contracts.
- [x] Feed part geometry and relationships through the existing bridge/index; test clipping and responsive part CSS.

### Task 2: Precise and usable selection

Files: bridge hit-test protocol; admin StudioPage.tsx, selectionPicking.ts, selection chooser and tests.

- [x] Write RED tests for painted candidates, lock inheritance, cycling and stale-message handling.
- [x] Implement trusted hit tests, deep toggle, Alt-cycle, candidate chooser, breadcrumbs/keyboard entry and safe drag starts; verify GREEN.
- [x] Connect part style/size/box/motion controls and parent settings navigation.

### Task 3: Real widget coverage and release

Files: product cards/Shop semantic marks, local editor fixture, browser regressions, release documentation.

- [x] Write browser regressions for Shop card title/image/price/swatch/button selection, generic nested widgets, overlaps, locks, undo and same-frame persistence.
- [x] Add stable semantic marks to shared catalog/Shop controls and fix integration failures; verify public styles preserve commerce actions.
- [ ] Run appropriate complete suites and all builds; compare the known 50 admin TypeScript diagnostics.
- [ ] Obtain independent review, repair findings, push and pass isolated CI.
- [ ] Merge/publish using existing authorization and verify deployed artifacts read-only; document exact delivered scope.
