# Preview editing regression implementation plan

> Use superpowers:executing-plans inline. One independent read-only branch review.

**Goal:** Restore operational dragging and content editing after deep selection.
**Architecture:** Preserve editable object boundaries and selected-owner drag intent, then bind native part text to validated existing node props using the normal draft operations.
**Tech stack:** Existing TypeScript/React/Next/Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-11-08-cms-editing-regression.md

## Constraints and review focus

- No anonymous detail may swallow native primitive or an already writable legacy field.
- Distinguish a click selecting a detail from dragging an explicitly selected ancestor.
- Selection replies and measurements must not cancel or overwrite a text-edit session.
- Never mutate catalog words or flatten child controls as a side effect of text edits.
- Preserve locale, undo/redo, rich formatting, locks and no document reload.

## Tasks

- [x] Reproduce real heading/button typing and selected-widget dragging in isolated browser fixtures; add RED regressions.
- [x] Repair pointer ownership and editable boundaries; verify GREEN with actual saves and undo.
- [x] Connect nested static text/list labels to their source props; surface their content controls and preserve item/locale identity.
- [ ] Verify complete admin suite, relevant browser regressions, builds, baseline diagnostics and isolated CI; independent review.
- [ ] Merge/release the tested fix and verify production artifacts. Resume header/footer selection after core editing is stable.

## Shared regions and review repairs

Header/footer roots and their visible parts now form separate region selections. Their Edit action opens the configured global block document or the existing store settings; it never saves cross-document changes as page looks. Standalone block previews omit outer global chrome. The whole editor session is keyed by document ID, isolating tickets, history and gestures during navigation.

Native nested text editing requires renderer-declared source paths. Catalog text is never bound by equality. Moved inline words use an explicit validated inline-box style. Drag preview resets inherited transform variables and preserves the part's own values; own out-of-plane transforms use manual controls. Inert perspective on an otherwise flat XY plane is supported, including repeat drags.

Review findings were repaired with RED/GREEN regressions, including actual Edit navigation and a distinct target preview token. Local checks so far: admin714passed, theme2passed,18distinct deep-selection/editor browser cases passed (17suite plus session-navigation case), serverbuild passed; frontend types passed and admin normalized50baseline unchanged. Existing45browser regressions and production builds remain in progress.
