# Thousand templates implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline; one fresh read-only review after integration.

**Goal:** Expand the independent editable store library from 300 to exactly 1000 templates.

**Architecture:** Keep the existing twenty category profiles and first fifteen compositions. Add thirty-five visual compositions/openings and 700 explicit recipe entries. Generate the new recipe manifest offline with structural rejection checks; runtime only reads the manifest.

**Tech Stack:** TypeScript, Next.js 14, existing tree editor, Playwright and Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-thousand-templates.md`

## Constraints and review focus

- Preserve all uncommitted work and the existing 300 IDs/designs; no commits, migrations or deployment.
- Exactly twenty categories with fifty templates each. All 1000 preview/live primitive trees must be unique even with sections reordered; shared section limit remains two thirds.
- New shoe composition profiles must never read beyond the five existing shoe edition overrides.
- Added openings need valid responsive tree styles and multilingual text; imported catalog nodes must use live merchant inventory.
- Catalog growth must retain lazy thumbnail loading and the existing twelve-card paging.

## Tasks

1. [x] Update exact-count and backward-compatibility tests to 1000/50; run them and observe the expected 300-versus-1000 failure.
2. [x] Add named compositions and distinct editable openings. Safely reuse the base shoe profile when no edition override exists. Add explicit new recipes through deterministic offline generation with unchanged legacy recipes.
3. [x] Run complete global uniqueness/overlap checks and backend tree/snapshot validation; repair only actual failures. Verify representative new styles, light/dark palettes, mobile/RTL previews and picker pagination.
4. [x] Complete read-only review, affected frontend/backend/admin tests, TypeScript and production build. Update current catalog documentation and validation ledger.

## Ledger

Ruling: Keep twenty established industries and expand each to fifty templates — the request changes catalog size, while the accepted independent-store architecture and industry coverage already answer product scope. Reuse existing local starter illustrations; do not imply 1000 bespoke image collections.

Red count test failed with actual 300 versus expected 1000. Offline generation preserved 300 and emitted 700 new recipes after 705 candidate attempts; a second run produced an identical file hash. Seven pure catalog checks passed, including global uniqueness and unchanged old recipes; all35 new openings have distinct shapes. Backend caught an invalid direct colour token and radius999 being incremented by nested component frames; fixed the colour token and confined the circle radius to the intended hero. All1000 preview/live trees and1001 design snapshots/regions then passed validation. Admin16 focused tests pass, including twelve-card pagination and searching the thousandth result.

Review found duplicate section draws in41 new homes. Added a failing metadata/rendered-content test, then rejected repeated recipes and detailed section shapes during generation. The corrected manifest uses748 candidate attempts; read-only `--check` verifies deterministic regeneration. Backend validation passes again with the ordinary test command. First browser/API run41/41 passed including all35 new mobile openings; final42-case run additionally includes the intra-home regression.

Final42/42 browser/catalog/import tests passed after regeneration; Admin16 and Backend2 passed (60 targeted cases). Read-only review follow-up confirmed the fix and found only CRLF portability in manifest comparison. Normalized line endings and verified `--check` against temporary CRLF content, restoring the original afterwards. Storefront TypeScript passed; production build is the remaining check.

Completed: production Next build exited0 and generated all45 static pages, with non-fatal Windows fetch-cache EBUSY warnings documented. Current catalog/setup/readiness documentation and `docs/thousand-template-validation.md` reflect1000/20/50 and the60 fresh tests. No production deployment, migrations or commits.

Ruling: Batch repeated per-node test assertions and inspect each referenced SVG once — coverage still traverses every template/node, while shared artwork no longer causes tens of thousands of redundant filesystem reads. Give the backend's complete 2000-tree validation a local30-second limit; it measured8 seconds, exceeding the old five-second default because catalog size more than tripled.
