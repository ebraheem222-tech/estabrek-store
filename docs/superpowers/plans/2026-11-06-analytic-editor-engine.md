# Analytic editor engine implementation plan

> **For agentic workers:** Use superpowers:executing-plans for integration and superpowers:dispatching-parallel-agents for the independent pure-math, constraints and picking units. Steps use checkbox syntax.

**Goal:** Implement the five engine capabilities selected by the user: measured 3×3/4×4 planar frames, local-axis movement, precise picking/collision and stable snapping, dimension/spacing constraints with responsive inheritance, and direct editing of supported perspective planes.

**Architecture:** Extend the existing renderer and editor. The storefront measures actual local frames and sends versioned document-space geometry; the admin maps those frames into canvas coordinates, solves gestures in local coordinates and saves existing draft operations. The browser continues to lay out text and CSS. A 4×4 representation embeds each measured planar homography; this is DOM-plane editing, not mesh editing. Existing scalar geometry remains a compatibility path for older deployed frames.

**Tech stack:** Existing TypeScript, React, Next, Vite, Vitest and Playwright. No dependency required for the bounded two-dimensional convex dimension solver.

**Spec:** `docs/cms-engine-math-roadmap.ar.md`, selected in the user's five-item implementation request. Product calls below resolve previously open details using that roadmap; they are implementation choices, not additional user quotes.

## Global constraints

- Work on `feat/cms-analytic-engine` in the clean existing checkout; preserve the user's workspace and current dependency installations.
- Keep free movement as the default; scale contents remains opt-in.
- Movement axes follow the current holder. Horizontal/vertical/both stay in that holder; free retains existing scalar-compatible reparenting through lock/depth/cycle checks. Advanced rotated/projective gestures currently stay in their holder; the narrower transfer scope is explicit in the engine guide.
- Store movement and dimension constraints per responsive screen, with existing base→tablet→mobile inheritance and undo/redo.
- Use local CSS border-box dimensions, never invert AABB dimensions near 45 degrees.
- Singular, clipped-away, edge-on or unsupported nonplanar contexts cannot produce a saved NaN/invalid geometry patch. Preserve the last valid view.
- No live merchant writes in tests; fixture-dependent suites run sequentially.
- No new production-server launch retries while the earlier automatic-review denial remains unresolved; use permitted verification methods and report limitations accurately.

## Review focus

- Rotated and nonuniformly scaled ancestor chains, RTL anchors and noncentral origins retain the opposite resize point.
- Perspective frames may be invertible as a plane while their world transform is not recoverable; do not advertise arbitrary preserve-3d editing.
- Persistent axis locks survive snapping/collision; infeasible containment returns the last valid result.
- Required dimension/aspect constraints conflict explicitly rather than silently changing priority or saved preference.
- Temporary geometry, measurement probes and old snapshots must not alter content, keyboard editing or an active gesture's coordinate contract.

## Task 1: Shared planar matrix and gesture kernel

**Files:** `shared/geometry/plane.ts`, focused tests under `estabrek-admin/src/studio/plane.test.ts`.

**Interfaces:** Row-major Mat3 and Mat4 tuples; Point/Size/Plane types. Export multiply3/inverse3/project3, multiply4/inverse4/project4, planeFromQuad(size,quad), planeQuad(matrix,size), embedPlane(matrix), cmsTransform(look,size,rtl), resizePlane(...) and movePlane(...). Return null for singular/nonfinite or invisible results. Detailed frozen public signatures will be recorded in the source before integration.

- [x] Write and run failing tests for matrix round trips, measured nonuniform affine quads, perspective quads, near singularity, projected local axes, and resize with a fixed opposite edge/corner under top/center/bottom origins.
- [x] Implement the pure kernel and prove width/height remain local at 44.9°,45°,45.1°.
- [x] Run the kernel suite and review export contracts before integrating.

## Task 2: Dimension and spacing constraints

**Files:** admin `layoutConstraints.ts`, `layoutConstraints.test.ts`, `LayoutConstraintsPanel.tsx`; backend `src/lib/pageTree.ts` and isolated unit tests; storefront `src/pageTree/tree.ts`, `css.ts` and focused renderer tests.

**Interfaces:** `SizeConstraints={minWidth?,maxWidth?,minHeight?,maxHeight?,aspectRatio?}`; `constrainSize(w,h,spec):{w,h}|null`; `spaceBoxes(boxes,axis,gap,holder?):Box[]|null`; `LayoutConstraintsPanel({value,onChange,busy?})`. ScreenStyle `constraints?:SizeConstraints`, `movement?:'vertical'|'horizontal'|'both'|'free'` validated and inherited per screen. Root owns editor wiring and movement UI.

- [x] Add failing tests for feasible nearest sizes, hard ratio, conflicting bounds, nonfinite inputs and deterministic fixed-gap placement.
- [x] Implement a bounded convex projection solver, schema validation, responsive CSS min/max/ratio and the editor dimension controls.
- [x] Run isolated admin/backend/renderer tests, without backend integration tests or database access.

## Task 3: Precise picking and stable snapping/collision

**Files:** admin `geometry.ts`, `canvasContainers.ts`, `dragPlan.ts`, `space.ts`, `stableSnap.ts` and corresponding focused tests. Root owns coordinate integration after this task.

**Interfaces:** Extend `Shape` with optional `outline?:Pt[]`, `clips?:Pt[][]`; export exact `shapeContains(shape,point)` and distance helpers. Preserve fallback AABB behavior for old frames. Keep existing stepFreeDrag signature; optional per-drag snap memory is internal. Stable snapping acquires at6 screen px, releases at10; guide identity has deterministic tie breaks.

- [x] Add failing tests for rotated empty corners, clipping, polygon boundaries, deterministic ties, snap hysteresis and thin-obstacle crossing in block mode.
- [x] Implement narrow-phase polygon picking, precise container hit tests and per-gesture snap memory. Improve block collision for supported convex translations with continuous tests; do not claim continuous push resolution.
- [x] Run existing geometry, handles, space, drag and container suites.

## Task 4: Measure and integrate local/projective frames

**Files:** storefront `src/pageTree/studioGeometry.ts`, `StudioBridge.tsx`; admin `treeIndex.ts`, `canvasManipulation.ts`, `CanvasHandles.tsx`, `StudioPage.tsx`, new frame adapters and tests; isolated browser harness.

**Interfaces:** Bridge node geometry includes optional measured plane, holder/inner planes, clip polygons and an explicit editing support reason. Matrices describe local CSS px→iframe document CSS px. Convert to canvas once using pan/zoom/scroll. Measurements carry the existing viewVersion; active gestures own their initial frames.

- [x] Add failing measurement/gesture tests before product integration.
- [x] Measure affine frames using cumulative linear maps and local dimensions. Perspective planes use native computed matrices and bounds calibration under affine ancestors, or checked DOM offsets under projected flat holders. No DOM probes are inserted; preserve-3d/individual transforms/zoom are rejected instead of inferring local sizes from AABBs.
- [x] Wire frame-aware handles, resize and move patches, local-axis options, dimension constraints, exact outlines and fixed-gap actions to the existing history and live preview protocol.
- [x] Retain scalar-compatible reparenting, including objects with size constraints, and explicitly document same-holder scope for advanced rotated/projective gestures. General transform decomposition/reparenting remains outside this release.

## Task 5: Verification and delivery

- [x] Run focused shared/admin/backend/storefront tests; compare admin typecheck to known baseline; build both frontends and affected backend.
- [x] Run feasible browser verification for rotated holders, axes, resizing, perspective rejection/support and unchanged preview document. Record any infrastructure limitations explicitly.
- [x] Request fresh whole-change review, fix important findings with regressions, and update the Arabic roadmap with actual supported capabilities.

## Review and verification record

- Full admin suite: 598 tests in 103 files passed. Storefront geometry/bridge/CSS suites: 34 passed, including native Chromium ratio and image-in-cell tests. Backend isolated pageTree/pageDraft suites: 40 passed; no database tests used.
- Full real-editor browser suite: 44 checks across 19 scenarios passed, including intrinsic and perspective group scaling, axis locks, nudge selection changes, history, scalar transfer with constraints and document identity.
- Review findings fixed with regressions: scroll-aware holder origin versus stationary clipping; authoritative ratio sizing and structural image specificity; inherited breakpoint conflicts; diagonal guides; queued nudge context; constrained scalar transfer; six-decimal storage/render precision; intrinsic group context preservation.
- Independent final scaling review checked 96 handle/origin/RTL/perspective combinations; largest fixed-point error after patch rounding was 0.000033px. No remaining blocker reported.
- Verification uses permitted local development servers and isolated fixtures. The prior production-server launch denial was not retried or bypassed.
- Both frontend production builds and the backend build passed. Storefront typecheck passed; the admin app typecheck retains exactly the same 50 pre-existing diagnostics as the baseline, with no changed-file diagnostics. A final targeted browser run after the draft-revision type correction passed all 12 analytic checks.

**Delivery target:** Integrate the verified branch into the already-authorized main branch, push, and inspect both new deployed bundles plus backend deployment status. Deployment confirmation is reported after the release, separately from this committed implementation record.
