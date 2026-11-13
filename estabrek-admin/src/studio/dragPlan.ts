/**
 * What a drag on the canvas does, between the geometry (space.ts, handles.ts) and the editor
 * (phase 9): the editor's own drag settings, one step of moving freely placed elements
 * (straight lines, snapping, equal gaps, a grid, then collision and the holder's edges), the
 * box an element is placed by (its own size before its turn and move), and the moves that
 * put several elements in a row at one place. Pure (tested).
 */
import type { Box, Pt } from "./geometry";
import type { Gap, Guide } from "./handles";
import { clearOf, equalGaps, lockAxis, settle, type Body, type CollideMode, type Obstacle } from "./space";
import { stableSnapBox, type SnapMemory } from "./stableSnap";

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
  snapMemory?: SnapMemory;
};

export function startFreeDrag(ids: string[], start: Box, body: Body, holder: Box, beside: Beside[]): FreeDrag {
  const obstacles = clearOf(body, beside.map((b) => ({ id: b.id, body: b.body, push: b.push })));
  return { ids, start, body, holder, beside, obstacles, last: { x: 0, y: 0 }, pushed: new Map(), snapMemory: {} };
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
  const memory = drag.snapMemory ?? (drag.snapMemory = {});
  const peers = drag.beside.map((b) => {
    const pushed = drag.pushed.get(b.id) ?? { x: 0, y: 0 };
    return { id: b.id, box: { ...b.box, x: b.box.x + pushed.x, y: b.box.y + pushed.y } };
  });
  const snap = stableSnapBox(box, [{ id: "holder:", box: drag.holder }, ...peers.map((b) => ({ id: `node:${b.id}`, box: b.box }))], memory, { bypass: keys.loose });
  if (!keys.loose) {
    const others = [...peers].sort((a, b) => a.id.localeCompare(b.id)).map((b) => b.box);
    box = snap.box;
    guides = snap.guides;
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
    if (keys.straight && d0.x === 0 && Math.abs(box.x - drag.start.x) > 1e-6) {
      box = { ...box, x: drag.start.x };
      guides = guides.filter((g) => g.x1 !== g.x2);
      marks = marks.filter((m) => m.y1 !== m.y2);
      delete memory.x;
    }
    if (keys.straight && d0.y === 0 && Math.abs(box.y - drag.start.y) > 1e-6) {
      box = { ...box, y: drag.start.y };
      guides = guides.filter((g) => g.y1 !== g.y2);
      marks = marks.filter((m) => m.x1 !== m.x2);
      delete memory.y;
    }
  }
  const target = { x: box.x - drag.start.x, y: box.y - drag.start.y };
  const r = settle(drag.body, drag.last, target, prefs.mode === "overlap" ? [] : drag.obstacles, { mode: prefs.mode, bounds: prefs.inside ? drag.holder : null, magnet: 10 }, drag.pushed);
  const displacedX = Math.abs(r.d.x - target.x) > 1e-6;
  const displacedY = Math.abs(r.d.y - target.y) > 1e-6;
  const moved = displacedX || displacedY;
  const movedAnchor = (axis: "x" | "y") => {
    const id = memory[axis]?.targetId;
    return id?.startsWith("node:") ? Math.abs((r.pushed.get(id.slice(5))?.[axis] ?? 0) - (drag.pushed.get(id.slice(5))?.[axis] ?? 0)) > 1e-6 : false;
  };
  if (displacedX || movedAnchor("x")) {
    guides = guides.filter((g) => g.x1 !== g.x2);
    delete memory.x;
  }
  if (displacedY || movedAnchor("y")) {
    guides = guides.filter((g) => g.y1 !== g.y2);
    delete memory.y;
  }
  if (peers.some((p) => Math.hypot((r.pushed.get(p.id)?.x ?? 0) - (drag.pushed.get(p.id)?.x ?? 0), (r.pushed.get(p.id)?.y ?? 0) - (drag.pushed.get(p.id)?.y ?? 0)) > 1e-6)) marks = [];
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

/**
 * The way a drag is asked to go but can't, because what's dragged is (nearly) as wide or as tall as its holder and
 * is kept inside it: the pointer has gone well further that way than the element could follow. The editor then
 * says why (a full-width heading only moves up and down until it's made narrower, or "inside" is turned off).
 * A smaller thing that just stops at its holder's edge has room behind it: that isn't one.
 */
export function heldAxis(drag: FreeDrag, want: Pt, moved: Pt, prefs: DragPrefs, far = 24): "x" | "y" | null {
  if (!prefs.inside) return null;
  // Little play that way: less than a fifth of its own size (and at least what a section's padding leaves).
  const tight = (room: number, size: number) => room < Math.max(64, size * 0.2);
  const short = (asked: number, got: number) => Math.abs(asked) - Math.abs(got) >= far;
  const x = tight(drag.holder.w - drag.start.w, drag.start.w) && short(want.x, moved.x);
  const y = tight(drag.holder.h - drag.start.h, drag.start.h) && short(want.y, moved.y);
  // The way the pointer has gone most.
  return x && (!y || Math.abs(want.x) >= Math.abs(want.y)) ? "x" : y ? "y" : null;
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
