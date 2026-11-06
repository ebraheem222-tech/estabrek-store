# Scale Container Contents Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, followed by one final review.

**Goal:** Resizing a container scales its entire subtree proportionally by default, with an option for frame-only resize.

**Architecture:** Reuse native scale, raw measured size, placementPatch and the safe geometry-preview bridge. Extend frozen handle gestures with proportional and ratio-limit options. Plan a single parent-style mutation; descendants keep their authored styles.

**Tech Stack:** Existing React/TypeScript admin, Vitest and local real-frame Playwright harness.

**Spec:** ../specs/2026-11-06-scale-container-contents.md

## Constraints and review focus

- Existing scale range 0.1–4; no dependencies, schema changes or live merchant writes.
- Preserve own origin/rotation, ancestor scale, RTL and responsive inheritance.
- Live rerenders must not change the gesture's initial scale, limits or ratio.
- Scaling preserves the entire subtree; frame-only resize and leaf resizing remain independent.
- Cancel/no-op creates no draft write; completion and undo/redo each use one transaction.

## Tasks

- [x] Add failing proportional/limit gesture and pure group-placement tests; implement the minimal geometry and scale patch.
- [x] Add the default-on Scale contents preference/control; integrate live preview, commit and natural reset.
- [x] Add and run real browser regressions for growth/shrink, descendants, frame-only option, cancel, undo/redo and RTL.
- [x] Review and run relevant regressions, type checks and production build.

Delivery: push the verified change through the already authorized main workflow and verify the live Scale contents control and its connected group-scaling code. Record the deployed assets in the release report.

## Ledger

- Ruling: continue in the existing clean checkout and existing main delivery workflow; no concurrent implementation or user changes need isolation.
- Ruling: inverse means shrinking the parent shrinks its children, as explicitly confirmed by the owner.
- Ruling: use uniform group scale to keep fonts/media undistorted and nested widgets intact; frame-only resizing remains available via the toggle.
- Ruling: preserve the group's raw dimensions, positioning mode and existing insets. Only scale and translation change, preserving intrinsic/percentage layout even for absolute auto-width containers.
- Ruling: analytically limit each handle's ratio by remaining scale and translation room; keep full scale precision at the boundary, and suppress keyboard no-ops.
- Review: resolved intrinsic-height redistribution, absolute auto-width reflow, edge drift at translation limits and floating-point rejection at legal bounds. Final reviewer found no remaining P1/P2; the independent 24,768-case boundary sweep accepted every valid nontrivial patch.

## Verification

- 135 focused admin tests passed, including real pointer gestures, numeric bounds, responsive styles, container targeting and undo/history.
- All 27 real-frame browser checks passed across 12 scenarios: previous desktop/touch/RTL interactions and new group, intrinsic-height and automatic-width cases.
- Production Vite build passed. The full admin TypeScript check reports exactly the same 50 pre-existing errors as the previous baseline; none involve changed files.
- No dependencies, backend/storefront changes, migrations or merchant data writes.
