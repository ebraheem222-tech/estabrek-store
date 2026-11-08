# Restore functional preview editing

User reports selection now shows appearances without functional drag/text/button editing. Highest priority is restoring existing interactions before extending header/footer/menu selection. Native primitives and existing editable legacy fields must win over anonymous DOM children. A selected native widget must remain draggable from its visible contents; a click without movement may select a detail. Native detail text must carry an explicit source binding where content belongs to node props; never guess catalog data or replace nested widget markup blindly.

Keep safe paint order, nested native boundaries, locked ancestry, undo/revision checks and same-document view refresh. Verify actual typing/commit/undo and real pointer drag, not only control visibility or CSS. All fixture writes remain local; integration database tests only isolated CI. Existing authorization covers GitHub/main/deployment.
