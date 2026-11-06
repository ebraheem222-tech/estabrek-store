# Direct Canvas Editing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or scoped parallel implementation for independent geometry/UI modules.

**Goal:** Direct free dragging, real preview resizing and nested containers in the existing CMS canvas.

**Architecture:** Keep the page-tree model and preview bridge. Extend pure geometry and gesture components, then integrate atomic responsive draft mutations in StudioPage. Reuse existing schema, identity, template and undo systems.

**Tech Stack:** React 19 admin, React 18/Next 14 preview, TypeScript, Vitest, Playwright.

**Spec:** ../specs/2026-11-06-direct-canvas-editing.md

## Global constraints

- Free positioning is the default; flow reorder remains available.
- No dependencies, migrations or production merchant writes.
- One draft/history entry per completed gesture; cancellation restores preview only.
- Preserve RTL, zoom/scroll coordinate mapping, tree depth 12 and column nesting 2.

## Tasks

- [x] Reproduce existing resize and nested-target failures with focused tests.
- [x] Fix the resize gesture component and pure geometry, including opposite-edge placement metadata, live callbacks and cancel/lost-capture handling.
- [x] Add and test pure native container picking that permits nesting within the current parent and rejects cycles/invalid targets.
- [x] Integrate free/flow modes, flow-to-free conversion, nested reparenting and an addable container; preserve displayed dimensions and parent extent.
- [x] Integrate real safe live resize previews and atomic size/position commits, including undo/redo.
- [x] Verify real editor/frame gestures, pointer cancellation, zoom/RTL and schema validity; review and build affected packages.
- [x] Commit/push the verified fix through main and confirm the live admin bundle.

## Verification evidence

- 121 focused admin tests; 11 storefront geometry/bridge tests; 25 backend tree-schema unit tests; 7 existing studio-frame browser tests passed.
- The real editor/browser runner passed 16 checks across desktop, RTL/native touch, return-to-start cancellation, top/bottom transform origins, scaled ancestors, cross-scale container/subtree transfer and unsupported rotated-holder safety.
- Admin Vite and storefront Next production builds passed; storefront TypeScript passed.
- Admin repository-wide TypeScript still reports the same 50 pre-existing errors as the catalog-visibility baseline, with no changed-file errors.
- Review findings addressed: zero-distance temporary-CSS cleanup; ancestor scale and authored transform origin; unsafe free gestures on layered objects in flow mode.
- No dependencies, migrations or merchant data changes.
- Release `8d1eb969cd65c98d663067c785a87b2899e67084` was pushed to `main`. Live admin `https://estabrek-store.pages.dev/` serves `index-DwCHZ-cs.js` and `StudioPage-Cqo0XhUK.js` with the free-mode, geometry-preview and scaled-holder integration. The live storefront frame chunk `page-6c2f69519c118ed8.js` contains the geometry-preview and scale-measurement handlers. Both Vercel projects and Railway reported successful deployment for this release. Verification used public static assets; no merchant preview ticket or store data was needed.
