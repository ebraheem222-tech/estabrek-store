# Template and independent editor validation — 2026-11-04

This is the historical300-template editor pass. The subsequent1000-template expansion has its own [current validation record](thousand-template-validation.md).

This covers the 300-template catalog and copied customer home/header/footer/theme. Commands ran locally against a disposable HTTP fixture or mocked Prisma; no customer database migrations, deployment or commits were performed.

## Passing checks

- Admin: `npm test -- src/features/setup src/lib/words.test.ts src/studio/storeThemes.test.ts` — 15 tests. Includes setup-to-editor navigation with refreshed settings, explicit replacement, template selection/search/preview recovery, copied branding and later theme customization.
- Backend: `npm test -- src/tests/setup.unit.spec.ts src/tests/setup.controller.unit.spec.ts src/tests/kits.unit.spec.ts src/tests/storeDesign.unit.spec.ts src/tests/storeDesign.blocks.unit.spec.ts` — 16 tests. All 300 gallery/live trees and 301 imports (including blank) pass validation. Publication boundaries and HTTP setup writes are tested without a real database.
- Storefront catalog/customer browser checks: `npm test -- tests/independent-design.spec.ts tests/template-preview.spec.ts tests/templates.spec.ts tests/catalog.unit.spec.ts tests/import-claims.spec.ts --reporter=line` — 39 tests. Includes Arabic desktop, English mobile and Hebrew mobile template previews, local assets, copied customer branding, independent theme snapshots, own global regions, palette preview and no Estabrek fallback for a missing customer home. A late DOM commit exercises the shared motion coordinator; text checks cover all ten original shoe imports, preserving their illustrative gallery content.
- Global catalog structural checks compare all 300 previews and all 300 live home trees, ignoring copy, colours, fonts, asset URLs and IDs. Detailed and coarse primitive trees are unique even if sections are reordered. Shared identical sections stay below the two-thirds limit in both modes.
- Admin production Vite build; Backend TypeScript build; Storefront standalone TypeScript check and production Next build — all exited successfully. Next generated all 45 static pages; Windows emitted a non-fatal `EBUSY` fetch-cache warning during prerendering.
- `git -c core.safecrlf=false diff --check`.

## Final integration checks

The language, page tree, legacy store theme and quick-add preview regressions were exercised with:

`npm test -- tests/languages.spec.ts tests/page-tree.spec.ts tests/theme-preview.spec.ts tests/store-themes.spec.ts --reporter=line`

The 205 selected cases passed across the initial run and two recovery batches (156 + 38 + 11). The initial run encountered a runtime overlay on `slow-brew` while source changes were in progress; that case passed on a fresh server. The recovery found an obsolete theme-list assertion expecting only the old registry. It now expects the registry plus all 300 template themes; that assertion and the remaining integration cases passed in the final 11-test run. No runtime code change was needed for `slow-brew`.

Together with the 39 catalog/customer, 15 Admin and 16 Backend tests, this is 275 passing cases. The production Storefront build ran after server-based checks so `.next` output was not shared between a build and dev servers.

An additional local production-server smoke check could not run: automatic execution review rejected the `npm run start` command bound to `127.0.0.1:3001` with `blocked by policy`. This does not affect the completed production build or browser tests against the local development server; production runtime was not verified in this final pass.

## Limits

- Admin's full TypeScript check has existing errors outside these changes (`src/app.ts`, `src/config/security.ts`, `src/config/webhooks.ts`, DashboardPage, WebsiteThemeGalleryPicker and presets-extended). Vite build and the focused tests pass, but full Admin TypeScript is not clean.
- Images are 160 replaceable local SVG starter illustrations. The catalog uses reusable primitives and section builders; visual spot checks and structural tests do not amount to a manual review of every viewport of all 300 pages.
- Each buyer still needs their own deployed services, database, storage, secrets and domain configuration. Clean-install, database restore, upgrade and real purchase flows on a customer's server remain separate release checks; see [commercial readiness](cms-commercial-readiness.md).
