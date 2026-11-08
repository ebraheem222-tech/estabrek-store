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
- [x] Verify complete admin suite, relevant browser regressions, builds, baseline diagnostics and isolated CI; independent review.
- [x] Merge/release the tested fix and verify production artifacts, including header/footer selection and document navigation.

## Shared regions and review repairs

Header/footer roots and their visible parts now form separate region selections. Their Edit action opens the configured global block document or the existing store settings; it never saves cross-document changes as page looks. Standalone block previews omit outer global chrome. The whole editor session is keyed by document ID, isolating tickets, history and gestures during navigation.

Native nested text editing requires renderer-declared source paths. Catalog text is never bound by equality. Moved inline words use an explicit validated inline-box style. Drag preview resets inherited transform variables and preserves the part's own values; own out-of-plane transforms use manual controls. Inert perspective on an otherwise flat XY plane is supported, including repeat drags.

Review findings were repaired with RED/GREEN regressions, including actual Edit navigation and a distinct target preview token. The independent reviewer rechecked the bounded repairs with no outstanding findings.

## Verification and release

Product commit: `1a5ef02a4fa3dbc697f375b51d7e404da35883ce`, fast-forward merged and pushed to `main`.

- Full admin suite: 714 passed across 123 files; theme ownership: 2 passed.
- Browser: 63 distinct scenarios passed (17 deep-selection/editor cases, 1 shared-document navigation case, 45 existing commerce/editor/publishing/SVG/3D/motion regressions).
- Backend, admin and storefront production builds passed. Storefront TypeScript passed. The admin's 50 normalized pre-existing diagnostics match the baseline with no additions.
- Feature [CI 42452857974](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42452857974) and main [CI 42453330495](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42453330495) passed: backend 789 passed / 17 skipped; focused admin 42 passed; theme ownership 2 passed. Backend database tests ran only against isolated CI PostgreSQL.
- Cloudflare Pages/Workers, both Vercel deployments and the primary Railway deployment (`earnest-possibility`) succeeded for the product commit. The unused secondary Railway project (`amusing-reflection`) retains its pre-existing failure.
- Read-only production checks returned HTTP 200 for the admin, both storefronts and primary API health. Admin asset `StudioPage---MH2aqG.js` contains the words, inline editing, region editing and drag controls. Both storefronts expose header/footer region markers, document-kind session code and the primary API host.

All fixture writes remained local or in isolated CI. No merchant database or page was used as a test fixture. Final release documentation adds no product code changes.
