# Commercial store templates implementation plan

**Goal:** Deliver 110 editable store templates and make them usable during setup of an independent installation.

**Architecture:** Extend `storeThemes/kits` rather than introducing another renderer. The wizard reads the storefront's existing template endpoints and sends validated page-tree content to the backend in its setup transaction.

**Tech stack:** Existing React/TypeScript, Next.js, Express, Prisma, Vitest and Playwright; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-04-commercial-store-templates-design.md`.

## Constraints and review focus

- Preserve existing shoe IDs, ordinary themes, categories and setup behavior.
- Installed pages use live catalog nodes; demo product names and prices must not become store inventory.
- Do not overwrite an existing home unless explicitly selected; keep revision protection.
- Invalid tree or logo must fail before any settings or content are written.
- A failed template request must leave setup usable; switching industries clears incompatible choices.
- No production deployment, credential edits or hosting changes.

## Tasks

1. [x] Extend catalog contract tests to require eleven categories and ten templates per category. Observed expected failure, implemented industry profiles, ten compositions, category-specific local SVG illustrations and theme mappings, and validated generated trees and layouts.
2. [x] Add setup schema tests for safe logos and valid page trees. Observed expected failure, implemented atomic tree/branding persistence, extended wizard with template selection and preview, and verified existing starter behavior and the new request builder.
3. [x] Run affected tests, TypeScript and production builds; review the diff and record commercial readiness findings with file references.

Execution is local in the current feature branch, whose working tree was clean at task start. The user's request authorizes reversible implementation. No commits or external changes are required.

## Verification and review record

- Backend: 9 passing targeted tests, including validation of every template's demo and live tree, HTTP setup persistence with a mocked database, ownership and existing-home protection. Production TypeScript build passed.
- Admin: 10 passing setup and translation tests. Vite production build passed. The full TypeScript check reports existing errors outside changed paths; see the readiness report.
- Storefront: 63 passing language, page-tree, preview and template checks, plus the new customization browser regression (1 passing). TypeScript and the production build passed. The build emitted Windows EBUSY fetch-cache warnings but completed with exit code 0. A separately started production server returned an actual editable electronics preview (HTTP 200), all 110 catalog entries and the custom palette on the page content.
- Read-only review found and prompted fixes for static demo content leaking into live catalog components, duplicate bento queries, missing template-theme customization metadata, category priority, and scoped theme tokens overriding custom preview colours.
- Browser screenshots exposed the inherited rose palette and disabled-Hebrew redirect in sample previews; fixed both and asserted the actual palette and language on rendered pages. Local screenshots are in `.tmp/`.
- No live PostgreSQL test database was configured; destructive database suites were not run against user data. All work remains local and uncommitted.
