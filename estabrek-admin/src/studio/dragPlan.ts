/**
 * What a drag on the canvas does, between the geometry (space.ts, handles.ts) and the editor
 * (phase 9): the editor's own drag settings, one step of moving freely placed elements
 * (straight lines, snapping, equal gaps, a grid, then collision and the holder's edges), the
 * box an element is placed by (its own size before its turn and move), and the moves that
 * put several elements in a row at one place. Pure (tested).
 */
import type { Box, Pt } from "./geometry";
import { snapBox, type Gap, type Guide } from "./handles";
import { clearOf, equalGaps, lockAxis, settle, type Body, type CollideMode, type Obstacle } from "./space";

/* ---------------------------------------------------------------- settings */

/** How dragging behaves, kept in this browser: what it does with what it meets, inside its holder, a grid, equal gaps. */
export type DragPrefs = { mode: CollideMode; inside: boolean; grid: number; gaps: boolean };
export const DRAG_DEFAULTS: DragPrefs = { mode: "overlap", inside: true, grid: 0, gaps: true };
export const GRID_STEPS = [0, 4, 8, 16, 24] as const;
const KEY = "studio-drag";

export function readDragPrefs(): DragPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<DragPrefs> | null;
    if (!v || typeof v !== "object") return DRAG_DEFAULTS;
    return {
      mode: (["overlap", "block", "push", "magnet"] as const).includes(v.mode as CollideMode) ? (v.mode as CollideMode) : DRAG_DEFAULTS.mode,
      inside: typeof v.inside === "boolean" ? v.inside : DRAG_DEFAULTS.inside,
      grid: (GRID_STEPS as readonly number[]).includes(Number(v.grid)) ? Number(v.grid) : DRAG_DEFAULTS.grid,
      gaps: typeof v.gaps === "boolean" ? v.gaps : DRAG_DEFAULTS.gaps,
    };
  } catch {
    return DRAG_DEFAULTS;
  }
}
export function saveDragPrefs(p: DragPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // A private window: they last until the page closes.
  }
}

/* ------------------------------------------------------------- moving freely */

/** Something beside what's dragged, in the same holder. */
export type Beside = { id: string; box: Box; body: Body; push: boolean };
/** A free drag as it started, and where it got to (the last step's move and what it pushed). */
export type FreeDrag = {
  ids: string[];
  /** Their box together at the start. */
  start: Box;
  /** What collides: one element's own outline, or the box around several. */
  body: Body;
  holder: Box;
  beside: Beside[];
  /** What it doesn't start over (only those stop or get pushed). */
  obstacles: Obstacle[];
  last: Pt;
  pushed: Map<string, Pt>;
};

export function startFreeDrag(ids: string[], start: Box, body: Body, holder: Box, beside: Beside[]): FreeDrag {
  const obstacles = clearOf(body, beside.map((b) => ({ id: b.id, body: b.body, push: b.push })));
  return { ids, start, body, holder, beside, obstacles, last: { x: 0, y: 0 }, pushed: new Map() };
}

export type FreeStep = { d: Pt; box: Box; guides: Guide[]; marks: Gap[]; pushed: Map<string, Pt>; touching: string[] };

/**
 * One step of a free drag: the pointer moved `want` from where it started. Shift keeps it
 * on a straight or 45° line; unless `loose` (Ctrl/⌘), it snaps to the holder's and its
 * neighbours' edges and middles, then to equal gaps and the grid on a side that didn't
 * snap; then what it meets and the holder's edges have their say.
 */
export function stepFreeDrag(drag: FreeDrag, want: Pt, keys: { straight: boolean; loose: boolean }, prefs: DragPrefs): FreeStep {
  const d0 = keys.straight ? lockAxis(want) : want;
  let box: Box = { ...drag.start, x: drag.start.x + d0.x, y: drag.start.y + d0.y };
  let guides: Guide[] = [];
  let marks: Gap[] = [];
  if (!keys.loose) {
    const others = drag.beside.map((b) => b.box);
    const s = snapBox(box, [drag.holder, ...others]);
    box = s.box;
    guides = s.guides;
    const across = guides.some((g) => g.x1 === g.x2);
    const down = guides.some((g) => g.y1 === g.y2);
    if (prefs.gaps) {
      const g = equalGaps(box, others);
      if (!across && g.dx) box = { ...box, x: box.x + g.dx };
      if (!down && g.dy) box = { ...box, y: box.y + g.dy };
      marks = g.marks.filter((m) => (m.y1 === m.y2 ? !across : !down));
    }
    if (prefs.grid > 0) {
      const snapX = !across && !marks.some((m) => m.y1 === m.y2);
      const snapY = !down && !marks.some((m) => m.x1 === m.x2);
      if (snapX) box = { ...box, x: drag.holder.x + Math.round((box.x - drag.holder.x) / prefs.grid) * prefs.grid };
      if (snapY) box = { ...box, y: drag.holder.y + Math.round((box.y - drag.holder.y) / prefs.grid) * prefs.grid };
    }
    // Snapping doesn't leave Shift's line.
    if (keys.straight && d0.x === 0) box = { ...box, x: drag.start.x };
    if (keys.straight && d0.y === 0) box = { ...box, y: drag.start.y };
  }
  const target = { x: box.x - drag.start.x, y: box.y - drag.start.y };
  const r = settle(drag.body, drag.last, target, prefs.mode === "overlap" ? [] : drag.obstacles, { mode: prefs.mode, bounds: prefs.inside ? drag.holder : null, magnet: 10 }, drag.pushed);
  const moved = Math.abs(r.d.x - target.x) > 0.5 || Math.abs(r.d.y - target.y) > 0.5;
  drag.last = r.d;
  drag.pushed = r.pushed;
  return {
    d: r.d,
    box: { ...drag.start, x: drag.start.x + r.d.x, y: drag.start.y + r.d.y },
    // Pushed off where it snapped: those lines no longer hold.
    guides: moved ? [] : guides,
    marks: moved ? [] : marks,
    pushed: r.pushed,
    touching: r.touching,
  };
}

/** The box around several boxes. */
export function around(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

/**
 * The box the shop places an element by: its own size before its turn and scale (`size`,
 * on the screen), around the middle of what's seen less its own move (the shop moves it after
 * placing it). Without a size, what's seen (so a turned one is off by its corners).
 */
export function placedBox(seen: Box, move: Pt, size?: { w: number; h: number } | null): Box {
  const c = { x: seen.x + seen.w / 2 - move.x, y: seen.y + seen.h / 2 - move.y };
  const w = size && size.w > 0 ? size.w : seen.w;
  const h = size && size.h > 0 ? size.h : seen.h;
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

/* ------------------------------------------------------------- in the flow */

export type MoveOp = { op: "move"; nodeId: string; parentId: string; index: number };
export type InsertAt = { parentId: string; index: number };

/**
 * Moves that put `moving` (in tree order) one after another at `at` (its index counted among
 * what's there without any of them). Each move's index is counted without the element itself,
 * as the draft takes it, so they're worked out on the list as it is when each one is made.
 */
export function moveAllOps(childrenOf: (parentId: string) => string[], parentOf: (id: string) => string | null, moving: string[], at: InsertAt): MoveOp[] {
  const lists = new Map<string, string[]>();
  const list = (p: string) => {
    if (!lists.has(p)) lists.set(p, [...childrenOf(p)]);
    return lists.get(p)!;
  };
  const set = new Set(moving);
  const without = list(at.parentId).filter((c) => !set.has(c));
  const before = at.index > 0 ? without[Math.min(at.index, without.length) - 1] : null;
  const ops: MoveOp[] = [];
  let prev = before;
  for (const id of moving) {
    const from = parentOf(id);
    if (from) {
      const l = list(from);
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
    }
    const target = list(at.parentId);
    const pos = prev ? target.indexOf(prev) + 1 : 0;
    target.splice(pos, 0, id);
    ops.push({ op: "move", nodeId: id, parentId: at.parentId, index: pos });
    prev = id;
  }
  // Already there, in that order: nothing to do.
  const same = moving.every((id, i) => parentOf(id) === at.parentId && childrenOf(at.parentId).indexOf(id) === ops[i].index);
  return same ? [] : ops;
}
