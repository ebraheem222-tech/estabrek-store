# Product cards and interactions implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline, task by task. One independent read-only review of the complete change before integration.

**Goal:** Editable product cards and safe visual triggers, with store defaults and page/element overrides.
**Architecture:** Validated JSON contracts, dedicated revisioned settings endpoint, client visual runtime with DOM scope capture, and shared card/interaction forms in global settings and Studio. Preserve existing card rendering when unconfigured.
**Tech stack:** Prisma/PostgreSQL, Express/Zod, Next/React, Vite/React, Vitest and Playwright.
**Spec:** docs/superpowers/specs/2026-11-07-card-interactions.md

## Global constraints

- Four independent inherited events; explicit empty lists disable; maximum eight actions per event.
- Only fixed actions and native IDs; no executable JavaScript or arbitrary selectors.
- No merchant data writes during verification; use local fixtures or isolated CI PostgreSQL.
- Current-page visual effects; preview cannot write real carts or place orders.
- Existing defaults remain when no configuration is present.

## Review focus

- Conflicting global saves must return 409 without overwriting another owner's changes.
- Portal quick-add events must keep their originating page/element policy.
- Disabled/failed adds must not emit success, and auto colour picks must not execute user actions.
- Page changes, repeated actions and reset must restore prior styles without losing transforms.
- Mobile cards, inherited rules and unconfigured storefronts must continue to work.

### Task 1: Contracts and persistent defaults

Files: backend lib/visualControls.ts, pageTree.ts, modules/admin/visualControls.controller.ts, settings service/controller, Prisma migration; frontend/admin visualControls contracts; contract/API tests.

- [ ] Add failing contract tests for bounded actions, unsafe input rejection, inheritance/disable and card dimensions.
- [ ] Run RED; implement schemas/readers and optional page/node props; rerun GREEN.
- [ ] Add failing endpoint tests for revision conflict, permissions and unrelated settings preservation; implement dedicated GET/PUT /admin/visual-controls and public DTO.
- [ ] Add nullable migration and extend guarded isolated migration bootstrap; verify build/tests locally without a DB connection.

### Task 2: Runtime and cards

Files: storefront visual controls provider/runtime, ProductTile/ProductCardClient adapters, configurable card, QuickAddButton/RoseProductSheet, colour/cart emitters and tree renderer.

- [ ] Add failing runtime/fixture tests for inheritance, theme reset, automatic selection and add click/success separation.
- [ ] Implement scoped event dispatch, safe bounded actions, exact restoration and cleanup on navigation; rerun GREEN.
- [ ] Add failing browser tests for card appearance, swatch selection/quick add and responsive rendering.
- [ ] Implement configured renderer and scoped defaults; replace synthetic preview cards with editable local samples; rerun GREEN.

### Task 3: CMS controls and integration

Files: admin VisualControlsForm/page, Studio integration, routes/nav, fixture tests and release docs.

- [ ] Add failing UI/browser tests for global save/conflict, inherited/disabled/custom event rules and card changes in the existing iframe.
- [ ] Implement global settings page and page/element forms with preview simulation; rerun GREEN.
- [ ] Run relevant complete suites, all three builds and compare known admin TypeScript baseline.
- [ ] Obtain one fresh read-only whole-branch review and repair findings with regression tests.
- [ ] Document limits and verified results; integrate/push using existing authorization and verify deployments read-only.
