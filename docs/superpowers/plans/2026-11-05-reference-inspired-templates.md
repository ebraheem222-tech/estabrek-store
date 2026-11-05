# Reference-inspired Templates Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the inline work and superpowers:dispatching-parallel-agents for the independent gallery/model domains. Use a fresh read-only review at the end.

**Goal:** Turn the supplied examples into reusable CMS capabilities and three distinct editable store designs.

**Architecture:** Extend the validated page tree with a small client showcase widget. Extend the existing procedural model registry with a lantern. Register three hand-composed templates in the existing import/preview system.

**Tech Stack:** React, TypeScript, Next.js, Vite, Zod, existing Three.js stage, Vitest/Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-reference-inspired-templates.md`

## Global Constraints

- Preserve the existing 1,000 IDs and independent customer ownership.
- Original code and neutral local assets; no copied downloaded scripts/images or fabricated business claims.
- No new dependencies, DB changes, deployment, commits or destructive test suites.
- Keep responsive, keyboard, reduced-motion and 3D lifecycle behavior.
- Preserve existing unrelated dirty workspace changes.

## Review Focus

- Empty/invalid gallery input and unsafe media/link URLs.
- Keyboard/touch versus fine-pointer hover, including RTL and mobile overflow.
- Theme import copying home/header/footer and preserving motion profiles.
- 3D fallback, reduced motion and lazy rendering under the existing context cap.
- Existing catalog IDs, schema validation and gallery filtering after adding three entries.

### Task 1: Expanding showcase (independent delegated domain)

Files: backend `src/lib/pageTree.ts`, new frontend showcase component/CSS, `TreeNodeView.tsx`, admin `columns.ts`, `blockDefaults.ts`, `ContentBlocksPanel.tsx`, Add/layers/thumbnail registrations; focused tests.

- [x] Write and observe failing backend/editor/render interaction tests for the new contract.
- [x] Implement schema, defensive rendering, accessible responsive interaction and editor controls.
- [x] Verify relevant focused tests, reporting commands and changed files.

### Task 2: Procedural lantern (independent delegated domain)

Files: frontend `src/storeThemes/three` model registry/builder and mirrored backend/admin model registries; focused tests. Do not modify showcase/TreeNodeView files.

- [x] Write and observe failing model contract/geometry tests.
- [x] Implement original procedural model and knobs; preserve the existing stage lifecycle.
- [x] Verify registry and schema tests.

### Task 3: Three template compositions (inline)

Files: new `src/storeThemes/kits/templates/experimental.ts`, template index and catalog tests, optional original SVG assets; test fixture/browser checks.

- [x] Add failing tests proving IDs, distinct composition, owned imports and all-language content.
- [x] Build the three templates using existing helpers plus the new component contracts.
- [x] Update count assertions to preserve the 1,000-template baseline and separately test the additions.
- [x] Verify imports against backend schema and run catalog checks.

### Task 4: Integration and evidence

- [x] Run focused editor/backend/browser checks and all three production builds.
- [x] Inspect desktop/mobile previews; record reviewable screenshots.
- [x] Request fresh read-only review; repair material issues and recheck affected tests.
- [x] Write concise CMS usage/validation documentation and report actual results.

## Ledger

- Initial scope follows the user's explicit request to inspect these examples and implement CMS options and similar editable templates; implementation choices are ours. Existing unrelated TypeScript failures in Admin remain recorded in the earlier validation notes.
- Completed all tasks. Evidence: 148 distinct targeted cases, all three production builds, storefront typecheck, catalog generation preservation check and fresh read-only review. Screenshots show all three desktop designs and EN/HE mobile; guide and detailed results are in `docs/reference-inspired-cms-guide.md` and `docs/reference-inspired-validation.md`.
- Review repair: preserve a focused gallery link during hover; reserve vertical control space at eight panels/ratio6; independent text contrast backplates; neutral collection navigation instead of apparel labels.
- No database operations, downloaded-script execution, deployment or commits. Generated tracked Admin build HTML restored; test fixture server stopped.
