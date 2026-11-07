# Editable Shop and Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline, task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merchants can open Shop/Cart in the native editor, arrange functional commerce objects, preview safely and publish without losing browsing or checkout.

**Architecture:** Reuse ShopBrowseClient and RoseCart's existing checkout controller. A shop object renders the real browsing interface. Cart items, summary and checkout become three independent tree objects sharing one page-level cart context. The existing cart renderer exposes its view fragments to that context without duplicating payment/order logic. The editor uses isolated synthetic commerce previews. Existing storefront routes retain their default designs unless a valid published CMS override is enabled.

**Tech Stack:** Existing React19 admin, React18/Next14 storefront, Express5/Prisma6 backend, Vitest/Playwright. No new dependencies or database schema changes.

**Spec:** `docs/superpowers/specs/2026-11-07-cms-platform-control-design.ar.md`, sections4/13, phaseB. User approved the roadmap and now explicitly said «انتقل مراحل تالية». Continue the established inline implementation, commit/main/deploy workflow; no repeated design/method approval is required.

## Global Constraints

- Each customer has an independent deployment; commerce objects use that customer's settings and palette, not an Estabrek-branded template.
- Preserve current storefront and merchant content until the merchant explicitly publishes/enables an override. Opening an existing page never replaces its tree or draft.
- Shop filtering, sorting, pagination, product links and add-to-cart use existing catalog behavior. Prices, stock, discounts, delivery and payment remain server-authoritative.
- Cart items/summary/checkout share one controller; never create independent quote or customer states for each object.
- Studio previews use synthetic items and disable real orders/payments/account autofill. Preview editing must retain the iframe document.
- No tests, seeds, orders or experimental pages against live merchant services. PostgreSQL tests only in the guarded disposable GitHub Actions fixture.
- Only phaseB is delivered here; dynamic product/account pages, SVG tracing and custom tables keep their subsequent phases.

## Review Focus

- A merchant removes or hides a required cart object: publication fails with actionable missing-object details, and the public route falls back to functioning cart behavior if an older writer bypasses the new publisher.
- Two operators open the same missing system page: one draft page results; an existing page/draft is never overwritten.
- Quantity/coupon/city changes update the same summary used by checkout; layout customization cannot turn prices into static client-supplied amounts.
- Studio shares an origin with the public store: preview must not mutate the customer's live cart, read their account details or submit a real purchase.
- A saved CMS page exists while its storefront override is disabled: UI reports the override setting accurately; creating/opening a page does not silently activate it.

## Files and interfaces

- Backend `src/lib/commercePage.ts`: `commercePageIssues(slug, tree)` returns `{code, nodeType, count}` issues for `/shop` and `/cart`; required visible objects are one `shop`, or one each `cartItems/cartSummary/cartCheckout`. Ignore conditional popup/deck branches and hidden ancestors/breakpoints.
- Backend `src/lib/storePageTemplates.ts`: default Shop/Cart native draft scaffolds, generated only when a system page does not exist.
- Backend `src/lib/pageTree.ts`: validate the four commerce node kinds and bounded display props; no prices, provider credentials, arbitrary API endpoints or customer data in their props.
- Backend `pages.controller.ts`: permission-gated atomic `POST /system/:kind` (shop/cart) uses slug upsert with empty update; draft publish validates commerce composition before revision/content writes, including force calls.
- Storefront `src/pageTree/commerce.ts`, `CommerceShop.tsx`, `CommerceCart.tsx`, `commerce.css`: requirements/preview data, real Shop block, single shared Cart parts provider, independent part renderers and neutral scoped styling.
- Storefront `RoseCart.tsx`: optional internal `renderLayout(parts)` callback; default output unchanged. Payment/order functions remain the existing implementation.
- Storefront `TreeNodeView.tsx`, `tree.ts`, `renderCmsPage.tsx`, studio-frame route: wire commerce context, synthetic preview flag, data loading and provider. Shop/Cart routes reject invalid native overrides and retain normal fallback.
- Admin `StorePagesPanel.tsx` in PagesListPage, API endpoints/types, `columns.ts`, `AddPanel.tsx`, `treeIndex.ts`, focused `CommercePanel.tsx`: open/create system pages, add commerce objects, labels/settings and publish errors. All existing positioning, SVG, style and motion controls apply to each native object.
- Tests: pure contracts/scaffolds, isolated HTTP publish/open, actual editor controls, local browser shop/cart purchase flow and preview isolation; existing cart/editor browser regressions.

### Task 1: Commerce contracts and safe system-page drafts

**Consumes:** Existing tree/draft API and publication transaction. **Produces:** four validated node kinds, issue payload and idempotent page-opening API.

- [x] Write RED tests for required objects, duplicates, hidden/conditional ancestors, non-system pages, valid default drafts and unsupported commerce props.
- [x] Run focused Vitest; implement pure policy/scaffolds and node schemas; rerun GREEN.
- [x] Add isolated HTTP regressions: missing cart pieces reject even force before writes; opening same page preserves existing draft; non-writer cannot create system pages.
- [x] Implement atomic opening route and draft-publish guard; focused tests/build pass; commit server support and run full backend CI with disposable PostgreSQL.

### Task 2: Functional storefront objects and isolated preview

**Consumes:** Task1 validated kinds and defaults. **Produces:** real Shop browsing and three Cart parts with one shared checkout state.

- [x] Add local browser RED cases using fixture-only commerce CMS pages: filter products; add product; cart quantity updates total; a fixture checkout succeeds; layout objects are independently identified.
- [x] Expose RoseCart's existing view fragments to an optional layout callback; preserve its default route output and controller behavior.
- [x] Implement Shop data/context, Cart provider/parts and scoped neutral appearance. Keep URL filter semantics and existing enabled commerce providers.
- [x] Add synthetic preview branches that never invoke live cart/account/order/payment operations; test with a pre-existing live bag and intercepted purchase requests.
- [x] Add composition fallback to Shop/Cart routes; invalid or disabled CMS uses the existing route. Run affected browser tests, build and commit.

### Task 3: Editor navigation and commerce controls

**Consumes:** Task1 API and Task2 renderers. **Produces:** accessible Shop/Cart entry points, independent editable commerce objects and clear publication feedback.

- [x] Add RED admin cases for opening existing pages without writes, creating missing drafts, permission denial, and controls on the four new types.
- [x] Implement StorePagesPanel shortcuts, commerce Add group/defaults, labels/settings, override-state indication and actionable missing-object publish errors.
- [x] Confirm object style/SVG/motion edits update the same preview document and leave preview bag state isolated.
- [x] Run admin full suite, focused commerce and existing editor/cart browsers, backend CI, production builds and normalized TypeScript baseline comparison.
- [x] Document actual controls/limits, obtain one whole-branch review, fix substantive findings with regressions, commit and fast-forward/push main under existing authorization. Verify actual deployed services read-only.

## Self-review

This plan implements Shop/Cart first as required by the approved roadmap. Native Cart parts are separate tree objects, not copies of checkout logic. A narrow view-fragment interface avoids moving the whole legacy cart controller. No new schema or vendor integration is necessary. Public fallback covers older write paths; publish-time guard applies to the native draft publisher. Existing legacy-format pages are preserved. Override settings remain explicit and existing pages are not rewritten on open.

## Verification and review

- Backend isolated PostgreSQL CI [42378711710](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42378711710):776 passed,17 skipped;99 files passed,1 skipped. Includes9 real publication/database cases and the actual migration fixture inherited from phaseA.
- Admin full suite:682 passed,116 files. Production build passed; TypeScript retains exactly50 baseline diagnostics, no added/removed normalized messages.
- Full combined editor/cart/commerce browser run:34 passed. Final focused commerce run:10 passed after review fixes, including the2 added category/add-to-cart scenarios;36 distinct scenarios covered overall.
- Backend/admin/storefront production builds passed. A duplicate existing Hebrew translation key found by the storefront build was removed; localization-only followup uses the existing key.
- Whole-branch review and closure found no remaining material issues. Required-object validation now resolves published linked blocks through the transaction client with shared row locks. Root providers isolate cart/account state in Studio. Old native designs stay intact until explicit adoption via `commerceVersion:1`.
- Real concurrent creation exposed Prisma's emulated empty-update upsert race. A forced unique-conflict regression plus PostgreSQL checks verify returning the winning draft without resetting it.
- Exact combined tree `b86b439` passed [branch CI42401863296](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42401863296), then fast-forwarded main without changing its tree. [Main CI42402194185](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42402194185) passed too.
- Actual production checks confirmed new Pages/Studio admin chunks, commerce CSS on both Vercel storefronts, Shop/Cart HTTP200 and backend health200. The primary Railway service, both Vercel deployments and Cloudflare builds succeeded. Both storefront bundles use the verified primary API host. Merchant pages and orders were not created for these checks.
