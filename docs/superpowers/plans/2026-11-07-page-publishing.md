# Reliable CMS Page Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publishing a new CMS page makes it public, with explicit schedule/archive choices, stale-state protection and truthful cache-delivery feedback.

**Architecture:** Extend the existing draft publisher rather than adding a second publishing API. Use one pure lifecycle module, a transaction for content/state/revision, and a persisted delivery record on Page for bounded retry of storefront cache revalidation. Keep UI policy in a focused publishing dialog/status component and reuse the existing public renderer.

**Tech Stack:** Express5, Prisma6/PostgreSQL, Zod4, React19/Vite, Next14, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-07-cms-platform-control-design.ar.md`, phaseA. The approved roadmap proceeds to commerce pages after this independently deployable phase.

## Global Constraints

- One independent deployment/database per customer. Preserve existing merchant content and Estabrek's current design.
- Never run tests or seeds against a live database or service; use localhost test PostgreSQL or isolated mocked dependencies.
- Only additive migrations; do not delete or republish any live merchant page as part of testing.
- Preserve schedule by default. `mode: now` explicitly clears both dates. Archived pages require `republishArchived: true`.
- Existing drafts remain readable. New drafts store publication snapshots; stale lifecycle changes cannot be bypassed by content `force` alone.
- User said "نعم ابدأ" after reviewing the design; implement inline using the established feature-branch workflow, without another design/method approval round. Prior main/push/deploy authorization persists.

## Review Focus

- A new DRAFT page with SVG must become publicly readable after publish, while its pre-publish URL stays404.
- A future schedule or an expired publication must not be silently converted to immediately live.
- A concurrent archive, slug/date change or new draft must not be overwritten by an old confirmation.
- Cache delivery failure must not undo committed content or be reported as complete propagation.
- Background delivery of an older revision must not clear or replace the latest pending revision.

## Files and interfaces

- New backend `src/lib/pagePublication.ts`: `publicationSnapshot(page)`, `publicationState(page, now)`, `publicationChange(page, options, now)`; validates and returns status/dates/visibility or typed publication conflict.
- Backend `src/lib/pageDraft.ts`: optional `basePublication` captured from real page lifecycle metadata, preserving old drafts.
- Backend `src/modules/admin/pages.controller.ts` and `pages.schemas.ts`: validated publish options; transaction-safe publish; GET publication diagnostics and explicit retry/probe routes.
- Backend `src/lib/storefrontRevalidate.ts`: bounded structured target outcomes, preserving the original single URL plus an optional validated URL list.
- New backend `src/lib/pagePublicationDelivery.ts`: durable versioned delivery attempts/retry using the Page record and existing jobs scheduler.
- Backend `prisma/schema.prisma` and additive migration: nullable `Page.publicationDelivery` JSON; no changes to current page status/content on migration.
- Backend `src/jobs.ts` and admin access routing: retry registration and `pages:publish` enforcement for publish/retry.
- Admin `src/api/pages.api.ts`: typed publish/diagnostics contracts; focused `src/studio/PagePublishDialog.tsx` and `PagePublicationStatus.tsx`; integrate in StudioPage.
- Storefront renderer adds a non-layout public page-id marker used by a read-only, bounded server probe against configured storefront origins.
- Tests: backend lifecycle/delivery unit tests, isolated HTTP publisher tests and local PostgreSQL integration where available; admin dialog/StudioPage tests and local browser publish regression.

### Task 1: Lifecycle policy and conflict snapshot

**Consumes:** Existing Page status/slug/dates and PageDraft content hash. **Produces:** explicit lifecycle patch and stable snapshot.

- [x] Write failing unit cases: DRAFT→PUBLISHED/live; future→scheduled; expired→expired; now clears both dates; archived rejects without explicit republish; normalized snapshots detect slug/status/date changes; missing old snapshot remains compatible.
- [x] Run `npx vitest run src/tests/pagePublication.unit.spec.ts src/tests/pageDraft.unit.spec.ts` and confirm meaningful RED.
- [x] Implement the pure module and new draft snapshot without changing rendering or storage of previous drafts.
- [x] Run the same command; require GREEN and record evidence.
- [x] Commit this independently testable policy.

### Task 2: Transactional HTTP publication and delivery

**Consumes:** Task1 policy/snapshots. **Produces:** `{ok,format,publication,delivery}` response plus diagnostics/retry contracts.

- [x] Write isolated HTTP and delivery regressions for the five Review Focus conditions, permission denial, rollback and partial delivery success.
- [x] Confirm RED before production edits. Use safe localhost-only test database configuration; mock only external boundaries in unit/HTTP tests.
- [x] Read and validate the current page/draft in a transaction, retain the previous revision in that transaction, and update content/state/schedule/delivery atomically. Protect lifecycle and draft revision independently of force-overwriting content.
- [x] Add the nullable delivery field/migration, delivery CAS/version checks, bounded parallel revalidation, and retry registration with the existing job runner.
- [x] Diagnostics report lifecycle and delivery state. Public probe uses only trusted configured storefront origins, timeout/redirect/body limits and the page-id marker; it never publishes or changes merchant content.
- [x] Run focused tests and backend build. Run the backend suite against isolated PostgreSQL where available; report baseline infrastructure failures honestly if unavailable.
- [x] Commit working server and schema support before exposing new UI.

### Task 3: Publish dialog, truthful status and public verification

**Consumes:** Task2 contracts. **Produces:** clear schedule/archive confirmation, publication status and public-link verification in the real editor.

- [x] Write failing dialog/StudioPage cases: publish new page, keep schedule, explicit now, explicit archived republish, stale conflict, delivery pending/failure distinct from saved content, block documents without public-page probes.
- [x] Confirm RED, implement the focused components/API integration and Arabic/English/Hebrew labels, then confirm GREEN.
- [x] Add a local browser regression for a new native page with SVG:404 before publish, content and decoration after publish, same editor document during ordinary edits.
- [x] Run admin suite and appropriate browser regressions, production builds, and compare existing admin TypeScript baseline rather than claiming it is green.
- [x] Update docs, obtain one fresh whole-branch review, address substantive findings with regressions, and rerun affected checks.
- [x] Commit, fast-forward main and push under existing authorization; verify actual deployed admin/backend/storefronts. Keep production diagnostics read-only; do not automatically publish `/t`.

## Self-review

This plan implements phaseA only. Commerce templates, custom tables and vectorization have their own subsequent plans and are not claimed as delivered here. Shared interfaces: Task1→Task2 snapshot/patch; Task2→Task3 response/diagnostics. Preserve old-client publish calls and old drafts while new UI sends expected lifecycle and draft rev. No destructive backfill is required.

## Verification before integration

- Isolated PostgreSQL CI [42372958080](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42372958080):756 passed,17 skipped;97 files passed,1 skipped. Includes both legacy child-write barrier regressions and the actual additive SQL migration.
- Admin full suite:676 passed,114 files. Locale and lifecycle/draft-conflict UI regressions observed RED before GREEN.
- Local browser editor/publishing suite:20 passed, including Arabic/English404→publish→200 with SVG edges.
- Backend, admin and storefront production builds passed. Admin TypeScript remains at the50 pre-existing diagnostics; compare normalized diagnostic contents, not just counts.
- Fresh review and focused closure found no remaining Critical/Important issues. Public probe reports route visibility; it does not checksum legacy edits or shared dependencies. Historical fresh-install migration replay still needs separate repair; see `docs/cms-page-publishing.ar.md`.
- Release `556ead4` fast-forwarded to main. Main CI [42373320252](https://github.com/ebraheem222-tech/estabrek-store/actions/runs/42373320252) passed; Railway, both Vercel storefronts and Cloudflare builds succeeded. Read-only production checks confirmed the actual admin publication controls, backend public DTO field, page marker on both storefronts, and fresh missing-route HTTP404. Existing warm cache responses were distinguished from current code using fresh request URLs. No merchant page was published for verification.
