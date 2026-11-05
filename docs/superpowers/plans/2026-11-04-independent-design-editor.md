# Independent design editor implementation plan

**Goal:** Make a chosen template a customer's own editable site, separate from Estabrek's bespoke design.

**Spec:** `docs/superpowers/specs/2026-11-04-independent-design-editor.md`

**Architecture:** Versioned theme snapshots in store settings, Page block documents for header/footer, and an explicit CMS rendering mode. Reuse the existing editor and authorization; no new account system, dependencies or migrations.

## Tasks

1. [x] Define and test validated theme snapshots and independent-mode resolution. Extend template import to return copied header, home and footer trees plus snapshot; provide a blank document.
2. [x] Extend setup validation/persistence for design snapshots and region blocks, preserve existing content, and expose published regions for the storefront layout.
3. [x] Make independent storefronts use their own CMS documents and chrome; preserve unmarked original stores. Test template independence and page rendering.
4. [x] Update onboarding to template/blank selection and direct editor entry. Add region navigation and access to template selection from the editor; customize copied theme settings without Rose fallback.
5. [x] Run focused tests and production checks, review changes, update user documentation. All three builds pass; optional local production-server smoke was blocked by execution policy, recorded in the validation ledger.
6. [x] Expand to exactly 300 structurally varied templates across 20 categories (15 each), preserving existing IDs. Catalog implementation delegated under dispatching-parallel-agents; integration remains local.

## Constraints

- Preserve all uncommitted work from the previous template task.
- Never reset an existing store's home/header/footer without an explicit replacement choice and revision protection.
- Do not serve draft regions or arbitrary block IDs publicly.
- Do not run destructive database tests against an unknown database.
- Do not publish, commit or modify the user's production store.

## Progress

Initial inspection confirmed that `ESTABREK_HOME_MODE` globally enables cinematic chrome and special home/interior renderers, setup imported only the home body, and template themes were resolved by registry ID. These are the links this change removes for explicitly independent customer designs.

Implemented all 300 catalog entries, independent design snapshots, editable global documents and direct editor entry. Review follow-ups added explicit replacement/revision protection, published-only nested block expansion, settings cache invalidation, live global theme previews, one shared motion/media coordinator that reacts to streamed tree commits, and safe merchant copy for the ten original shoe imports. Focused and regression runs cover 275 passing cases; see `docs/template-editor-validation.md` for commands, recovery details and existing Admin TypeScript limitations.
