# Validation of the 1000-template expansion — 2026-11-04

Current catalog: **1000 editable homes, 20 categories, 50 per category**. The previous300 designs retain their IDs, recipes and rendering paths. The700 added homes have explicit recipes and35 additional visual editions/openings. Existing160 local SVG illustrations remain replaceable starter artwork.

## Checks

- Storefront: `npm test -- tests/catalog.unit.spec.ts tests/independent-design.spec.ts tests/template-preview.spec.ts tests/templates.spec.ts tests/import-claims.spec.ts --reporter=line` — **42 passed**. Includes the review regression preventing duplicated sections within a new home. Together with Backend2 and Admin16, this is **60 passing targeted tests** for this expansion.
- Backend: `npm test -- src/tests/kits.unit.spec.ts` — **2 passed**, checking all1000 preview/live trees, unique node IDs, and all1001 copied theme/header/footer imports including blank. The complete tree test has a local30-second allowance for2000 homes; the final run took about10 seconds for that case.
- Admin: `npm test -- src/features/setup src/lib/words.test.ts src/studio/storeThemes.test.ts` — **16 passed**. Includes twelve-card pagination through a thousand-entry catalog and finding/selecting the last result by search.
- Storefront: `npm run typecheck` — passed.
- Storefront: `npm run build` with the local fixture API — passed, including TypeScript checks and all45 static pages. Windows emitted non-fatal fetch-cache `EBUSY` warnings during prerendering; the build exited0. Admin and Backend production source were unchanged by this catalog expansion, so their previous successful builds were not repeated.
- Offline authoring: `..\estabrek-store-backend\node_modules\.bin\tsx.cmd scripts/expand-template-catalog.ts --check` — passed, reproducing the manifest without writing. The generator preserves300 homes and accepts700 candidates after748 attempts. Verification also passed with temporary Windows CRLF content, then the original manifest was restored; Git line-ending conversion does not cause false failures.
- `git -c core.safecrlf=false diff --check` — passed.

## What the structural tests prove

All1000 preview homes and1000 installed homes are compared globally. The checks ignore IDs, text, colour, fonts, image URLs and section order. Both detailed shapes and coarse primitive trees are unique. Identical complete-section overlap stays at or below two thirds. The new700 recipes also reject repeated section recipes and identical complete sections within the same home.

All35 added opening structures are distinct. Browser coverage exercises every new edition at390px, with no horizontal overflow, plus representative new Arabic and Hebrew mobile previews and existing desktop/English previews. Customers can still import an owned theme/home/header/footer, preview their palette and edit without the original template registry or Estabrek chrome.

## Review and fixes

Read-only review identified duplicate section draws inside41 of the700 new homes. A new test reproduced the issue before the fix. The generator now rejects repeat recipe entries and repeat detailed section shapes before accepting a home; only the new manifest was regenerated. Backend validation also caught a direct unsupported colour token and a shared circular radius exceeding the editor limit after a nested frame added padding; these were corrected without changing old templates or weakening validation.

The review follow-up confirmed the duplicate fix and found only raw line-ending comparison in `--check`; normalizing CRLF resolved that portability issue. No remaining catalog/rendering issue was reported.

## Scope and remaining release work

These results concern the local catalog expansion. They do not represent1000 bespoke asset collections or a manual design audit of every viewport in every language. No database migration, production deployment, commit or server-secret change was performed. Admin's existing full TypeScript errors and broader installer/upgrade/restore release requirements remain documented in [commercial readiness](cms-commercial-readiness.md). The previous300-template validation record is [here](template-editor-validation.md).
