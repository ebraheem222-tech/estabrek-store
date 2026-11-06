# Direct canvas manipulation

The owner requests Wix-like direct dragging and resizing in the actual CMS preview, using analytic geometry, including objects nested inside containers. The owner explicitly chooses free positioning as the default. Keep the existing flow reorder mode available.

Use the existing native page tree, responsive style overrides, geometric hit testing, frame bridge and undoable draft queue. No new dependencies or data migrations. Preserve existing stores until an owner manipulates their draft. A move/reparent/resize is one undoable change; cancellation performs no persisted writes. Frames must enforce their existing origin checks and safe preview whitelist.

Free mode must allow dragging a normal in-flow editable object into free placement at the displayed pointer location, preserve its measured size and the parent layout extent, and allow nesting into an eligible inner container even when the pointer remains within the original parent. Dragging a container carries its descendants; it cannot be placed inside itself or its descendants. Keep schema depth/columns constraints and locked/hidden objects respected. Provide an addable empty native container, clear target highlighting, alignment guides, and free/flow controls.

Resizing from west/north must retain the opposite edge; preview the real object's size during the gesture and commit size plus position together. Handle zoom, scroll, RTL, corner/edge handles, proportion locking, and pointer release/cancel without stale values. Use the existing transform geometry where rotation can be represented faithfully; preserve current rotation controls. The geometry and mutation planning must be pure/testable, with meaningful pointer and real-frame browser regressions.

Validate unit geometry, containment/cycle/depth rules, undo/redo, and an actual editor preview workflow (drag, nested reparent, resize, cancellation) on desktop plus touch-compatible controls. Build affected packages, review the change, then deliver it to the already-authorized main/live admin workflow, without editing live merchant data.
