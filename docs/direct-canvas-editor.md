# Direct editing in the CMS preview

The editor starts in **Free move** mode. Drag a picture, button, widget or container directly in the preview. Its first move gives it explicit dimensions and a free position on the active desktop, tablet or mobile layout. The original container keeps its height. **Flow layout** keeps the existing row/column reorder workflow available for objects in normal flow. The mode is remembered in this browser.

- Add **Container for objects** from the Add panel. Drop an object over a container to put it inside, including a container inside its current parent. Dragging a container carries its children. The highlighted target shows where the object will go.
- Select an object and drag a side or corner to resize it. The actual preview changes while dragging. West/north handles preserve the opposite edge. Hold **Shift** to keep proportions. Text and headings use width handles so their content determines height.
- **Scale contents with the container** is opt-in for containers with children. Enable it to grow/shrink pictures, text, spacing and every nested object in the same proportion; otherwise resize only the frame. Group handles keep proportions automatically. Explicit preferences are remembered in this browser. Children remain independently editable. Intrinsic/percentage layouts keep their original dimensions and insets, and scale/position limits stop the handle before an edge would drift.
- Use **Ctrl/Cmd** while dragging to bypass snapping. Existing alignment, collision and grid settings remain available. **Alt** on release makes a copy.
- On a touch screen, tap an object to select it, then drag it or its handles. An unselected touch gesture can still scroll the page.
- **Escape**, pointer cancellation or a drag returned to its exact starting point restores the preview without saving. A completed move, reparent or resize is one undo/redo action. Double-click a resize handle to restore natural dimensions.
- Saving and undo/redo update the view inside the existing preview document. Scroll, unchanged DOM and unrelated widget state stay in place. Editing a widget's configuration rebuilds that view only. The **Refresh preview** button retries a view update without reloading the document; a preview failure does not undo an already saved change.
- Starting a direct move/resize releases any earlier reveal request, so delayed selection centering cannot move the viewport during the gesture. Animated media reconcile per target; unchanged players keep running.

Positions account for preview zoom, scroll, RTL, scaled containers and an object's own 2D rotation/scale with center, top or bottom transform origin. Moving between differently scaled containers preserves displayed dimensions. Direct handles require a planar object inside unrotated containers; for authored 3D tilts or rotated ancestors, the editor explains that the position/size settings remain available. Tree depth, column nesting, locked objects and cycle restrictions still apply.

## Verification

Focused admin geometry, pointer, container, mutation and history tests:

```powershell
cd estabrek-admin
npm.cmd test -- src/studio/CanvasHandles.test.tsx src/studio/handles.test.ts src/studio/canvasContainers.test.ts src/studio/canvasManipulation.test.ts src/studio/dragPlan.test.ts src/studio/space.test.ts src/studio/columns.test.ts src/studio/geometry.test.ts src/studio/insert.test.ts src/studio/draft.test.ts src/studio/draftBatches.test.ts
```

The browser regression uses the real editor and storefront frame with an isolated local draft. Start `node tests/catalog-server.mjs` in `estabrek-storefront` on port 4100. Start the storefront on port 3000 with `API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` set to `http://127.0.0.1:4100/v1`, and `ADMIN_ORIGIN` containing `http://127.0.0.1:4100 http://127.0.0.1:5178`. Start the admin Vite server on port 5178. Then, from the repository root:

```powershell
$env:CANVAS_SCENARIOS='flow-return,desktop,rtl-touch,scaled,transfer,safety,group,intrinsic,autowidth,live-preview'
node estabrek-admin/tests/direct-canvas.browser.cjs
```

Run fixture-dependent browser suites sequentially because the catalog server shares one preview draft. The harness blocks unmocked admin requests and writes only to the local test endpoint; it never edits a merchant store. Reports and screenshots stay in ignored `.tmp/`.

The storefront's `tests/geometry-preview.unit.spec.ts` checks temporary CSS validation, trusted-message guards, cleanup, per-target runtime lifecycle and native placement measurements. The admin's `src/studio/previewRefresh.test.ts` checks request ordering, matching acknowledgements, cancellation and retries.

Future axis constraints, affine coordinates, precise hit testing, layout solvers and limited projective editing are described in the [Arabic engine roadmap](cms-engine-math-roadmap.ar.md). These are planned capabilities, separate from the current free/flow modes.
