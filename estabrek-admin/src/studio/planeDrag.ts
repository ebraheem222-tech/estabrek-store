import { boundsOfQuad, cmsTransform, inverse3, localAxisDelta, multiply3, planeQuad, project3, type Mat3, type MovementAxis, type Plane } from "../../../shared/geometry/plane";
import type { DragPrefs } from "./dragPlan";
import type { Box, Pt } from "./geometry";
import type { Gap, Guide } from "./handles";
import { clearOf, collide, equalGaps, lockAxis, moveBody, settle, type Body, type Obstacle } from "./space";
import { stableSnapBox, type SnapMemory } from "./stableSnap";

type PolygonBody = Extract<Body, { kind: "poly" }>;
type Peer = { id: string; frame: Plane; local: Mat3; box: Box; body: PolygonBody; push?: boolean };
/** One gesture owns its initial canvas coordinate contract and last valid local move. */
export type PlaneDrag = {
  holder: Plane;
  frame: Plane;
  local: Mat3;
  grabLocal: Pt;
  box: Box;
  body: PolygonBody;
  peers: Peer[];
  obstacles: Obstacle[];
  last: Pt;
  pushed: Map<string, Pt>;
  snapMemory: SnapMemory;
};
/** Deltas (including pushed peers) are holder-local CSS px; visual marks are canvas px. */
export type PlaneDragStep = { delta: Pt; guides: Guide[]; marks: Gap[]; pushed: Map<string, Pt>; touching: string[] };
const ZERO: Pt = { x: 0, y: 0 };
const EPS = 1e-6;
const translation = (p: Pt): Mat3 => [1, 0, p.x, 0, 1, p.y, 0, 0, 1];
const copyPlane = (p: Plane): Plane => ({ w: p.w, h: p.h, matrix: [...p.matrix] as unknown as Mat3 });
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const subtract = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const scaled = (p: Pt, k: number): Pt => ({ x: p.x * k, y: p.y * k });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finite = (p: Pt) => Number.isFinite(p.x) && Number.isFinite(p.y);

export function startPlaneDrag(frame: Plane, holder: Plane, look: Record<string, unknown>, rtl: boolean, grab: Pt, peers: { id: string; frame: Plane; push?: boolean }[]): PlaneDrag | null {
  if (!planeQuad(frame.matrix, frame) || !planeQuad(holder.matrix, holder)) return null;
  const invHolder = inverse3(holder.matrix);
  const own = cmsTransform(look, frame, rtl);
  const invOwn = own && inverse3(own);
  const grabLocal = invHolder && project3(invHolder, grab);
  if (!invHolder || !own || !invOwn || !grabLocal) return null;
  const local = multiply3(invHolder, frame.matrix);
  const context = multiply3(local, invOwn);
  const layout = project3(context, ZERO);
  if (!layout) return null;
  // Permit browser serialization rounding, but require the rest of the context to
  // be a translation. An unrecovered preserve-3d/world transform cannot be saved.
  const reconstructed = multiply3(holder.matrix, multiply3(translation(layout), own));
  const samples = [ZERO, { x: frame.w, y: 0 }, { x: frame.w, y: frame.h }, { x: 0, y: frame.h }, { x: frame.w / 2, y: frame.h / 2 }];
  if (samples.some((p) => {
    const a = project3(frame.matrix, p), b = project3(reconstructed, p);
    return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 0.1;
  })) return null;
  const quad = planeQuad(local, frame);
  const box = quad && boundsOfQuad(quad);
  if (!quad || !box) return null;
  const prepared: Peer[] = [];
  for (const peer of [...peers].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!planeQuad(peer.frame.matrix, peer.frame)) return null;
    const local = multiply3(invHolder, peer.frame.matrix);
    const pts = planeQuad(local, peer.frame);
    const box = pts && boundsOfQuad(pts);
    if (!pts || !box) return null;
    prepared.push({ ...peer, frame: copyPlane(peer.frame), local, box, body: { kind: "poly", pts } });
  }
  const body: PolygonBody = { kind: "poly", pts: quad };
  return {
    holder: copyPlane(holder), frame: copyPlane(frame), local, grabLocal, box, body, peers: prepared,
    obstacles: clearOf(body, prepared.map((p) => ({ id: p.id, body: p.body, push: p.push }))),
    last: { ...ZERO }, pushed: new Map(), snapMemory: {},
  };
}

/** Local unit-axis lengths in screen pixels at the current grab point (Jacobian). */
function axisLengths(matrix: Mat3, at: Pt): Pt | null {
  const p = project3(matrix, at);
  if (!p) return null;
  const w = matrix[6] * at.x + matrix[7] * at.y + matrix[8];
  const x = Math.hypot(matrix[0] - p.x * matrix[6], matrix[3] - p.y * matrix[6]) / w;
  const y = Math.hypot(matrix[1] - p.x * matrix[7], matrix[4] - p.y * matrix[7]) / w;
  return x > 1e-10 && y > 1e-10 && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function restrictDelta(drag: PlaneDrag, target: Pt, line: Pt | null, contained: boolean): Pt | null {
  const min = { x: -drag.box.x, y: -drag.box.y };
  const max = { x: drag.holder.w - drag.box.x - drag.box.w, y: drag.holder.h - drag.box.y - drag.box.h };
  if (contained && (min.x > max.x + EPS || min.y > max.y + EPS)) return null;
  if (!line) return contained ? { x: clamp(target.x, min.x, max.x), y: clamp(target.y, min.y, max.y) } : target;
  const norm = dot(line, line);
  if (!norm) return contained && (min.x > EPS || max.x < -EPS || min.y > EPS || max.y < -EPS) ? null : { ...ZERO };
  let lo = -Infinity, hi = Infinity;
  if (contained) for (const axis of ["x", "y"] as const) {
    if (Math.abs(line[axis]) < 1e-12) {
      if (min[axis] > EPS || max[axis] < -EPS) return null;
    } else {
      const a = min[axis] / line[axis], b = max[axis] / line[axis];
      lo = Math.max(lo, Math.min(a, b));
      hi = Math.min(hi, Math.max(a, b));
    }
  }
  return lo > hi + EPS ? null : scaled(line, clamp(dot(target, line) / norm, lo, hi));
}

/** Entry time on an enforced line; do not slide into a forbidden coordinate. */
function polygonEntry(a: PolygonBody, b: PolygonBody, way: Pt): number | null {
  let enter = -Infinity, exit = Infinity;
  for (const poly of [a, b]) for (let i = 0; i < poly.pts.length; i++) {
    const edge = subtract(poly.pts[(i + 1) % poly.pts.length], poly.pts[i]);
    const length = Math.hypot(edge.x, edge.y);
    if (length < 1e-12) continue;
    const axis = { x: -edge.y / length, y: edge.x / length };
    const aa = a.pts.map((p) => dot(p, axis)), bb = b.pts.map((p) => dot(p, axis));
    const a0 = Math.min(...aa), a1 = Math.max(...aa), b0 = Math.min(...bb), b1 = Math.max(...bb);
    const speed = dot(way, axis);
    if (Math.abs(speed) < 1e-10) {
      if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return null;
      continue;
    }
    enter = Math.max(enter, speed > 0 ? (b0 - a1) / speed : (b1 - a0) / speed);
    exit = Math.min(exit, speed > 0 ? (b1 - a0) / speed : (b0 - a1) / speed);
    if (enter > exit) return null;
  }
  return enter >= -1e-10 && enter <= 1 && exit > Math.max(0, enter) + 1e-12 ? Math.max(0, enter) : null;
}

function projectGuide(matrix: Mat3, guide: Guide): Guide | null {
  const a = project3(matrix, { x: guide.x1, y: guide.y1 }), b = project3(matrix, { x: guide.x2, y: guide.y2 });
  return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null;
}

export function stepPlaneDrag(drag: PlaneDrag, wantScreen: Pt, keys: { straight: boolean; loose: boolean }, prefs: DragPrefs, movement: MovementAxis): PlaneDragStep | null {
  if (keys.loose) drag.snapMemory = {};
  const raw = localAxisDelta(drag.holder.matrix, drag.grabLocal, wantScreen, movement);
  if (!raw || !finite(raw)) return null;
  const initial = keys.straight ? lockAxis(raw) : raw;
  const line = movement === "horizontal" ? { x: 1, y: 0 } : movement === "vertical" ? { x: 0, y: 1 } : keys.straight ? initial : null;
  if (line && Math.abs(drag.last.x * line.y - drag.last.y * line.x) > EPS) return null;
  const lengths = axisLengths(drag.holder.matrix, add(drag.grabLocal, initial));
  if (!lengths) return null;
  const memory: SnapMemory = { ...drag.snapMemory };
  const peerBoxes = drag.peers.map((p) => {
    const pushed = drag.pushed.get(p.id) ?? ZERO;
    return { id: p.id, box: { ...p.box, x: p.box.x + pushed.x, y: p.box.y + pushed.y } };
  });
  const metricBox = (b: Box): Box => ({ x: b.x * lengths.x, y: b.y * lengths.y, w: b.w * lengths.x, h: b.h * lengths.y });
  const startBox = { ...drag.box, x: drag.box.x + initial.x, y: drag.box.y + initial.y };
  const holderBox: Box = { x: 0, y: 0, w: drag.holder.w, h: drag.holder.h };
  const snap = stableSnapBox(metricBox(startBox), [{ id: "holder:", box: metricBox(holderBox) }, ...peerBoxes.map((p) => ({ id: `node:${p.id}`, box: metricBox(p.box) }))], memory, { bypass: keys.loose });
  let box: Box = { x: snap.box.x / lengths.x, y: snap.box.y / lengths.y, w: drag.box.w, h: drag.box.h };
  let guides = snap.guides.map((g) => ({ x1: g.x1 / lengths.x, x2: g.x2 / lengths.x, y1: g.y1 / lengths.y, y2: g.y2 / lengths.y }));
  let marks: Gap[] = [];
  const snapX = guides.some((g) => g.x1 === g.x2), snapY = guides.some((g) => g.y1 === g.y2);
  if (!keys.loose) {
    if (prefs.gaps) {
      const others = peerBoxes.map((p) => p.box);
      const x = equalGaps(box, others, 6 / lengths.x), y = equalGaps(box, others, 6 / lengths.y);
      if (!snapX) box.x += x.dx;
      if (!snapY) box.y += y.dy;
      marks = [...(!snapX ? x.marks.filter((m) => m.y1 === m.y2) : []), ...(!snapY ? y.marks.filter((m) => m.x1 === m.x2) : [])];
    }
    if (prefs.grid > 0) {
      if (!snapX && !marks.some((m) => m.y1 === m.y2)) box.x = Math.round(box.x / prefs.grid) * prefs.grid;
      if (!snapY && !marks.some((m) => m.x1 === m.x2)) box.y = Math.round(box.y / prefs.grid) * prefs.grid;
    }
  }
  const snapped = { x: box.x - drag.box.x, y: box.y - drag.box.y };
  const contained = movement !== "free" || prefs.inside;
  const target = restrictDelta(drag, snapped, line, contained);
  if (!target || !finite(target)) return null;
  const bounds = contained ? holderBox : null;
  let result;
  if (line && prefs.mode !== "overlap") {
    // Required axes take precedence over push/magnet. Sweep on the allowed line;
    // unconstrained SAT sliding could otherwise create forbidden lateral drift.
    const way = subtract(target, drag.last);
    const me = moveBody(drag.body, drag.last) as PolygonBody;
    let time = 1;
    for (const o of drag.obstacles) {
      const obstacle = moveBody(o.body, drag.pushed.get(o.id) ?? ZERO) as PolygonBody;
      if (collide(me, obstacle)) return null;
      const t = polygonEntry(me, obstacle, way);
      if (t !== null) time = Math.min(time, t);
    }
    const d = add(drag.last, scaled(way, time));
    result = settle(drag.body, d, d, drag.obstacles, { mode: "block", bounds }, drag.pushed);
    if (Math.hypot(result.d.x - d.x, result.d.y - d.y) > EPS) return null;
  } else result = settle(drag.body, drag.last, target, prefs.mode === "overlap" ? [] : drag.obstacles, { mode: prefs.mode, bounds, magnet: 10 / Math.max(lengths.x, lengths.y) }, drag.pushed);
  const delta = result.d;
  const checked = restrictDelta(drag, delta, line, contained);
  if (!finite(delta) || !checked || Math.hypot(checked.x - delta.x, checked.y - delta.y) > EPS) return null;
  if (prefs.mode !== "overlap" && drag.obstacles.some((o) => collide(moveBody(drag.body, delta), moveBody(o.body, result.pushed.get(o.id) ?? ZERO)))) return null;
  if (!planeQuad(multiply3(drag.holder.matrix, multiply3(translation(delta), drag.local)), drag.frame)) return null;
  for (const p of drag.peers) {
    const pushed = result.pushed.get(p.id);
    if (pushed && !planeQuad(multiply3(drag.holder.matrix, multiply3(translation(pushed), p.local)), p.frame)) return null;
  }
  const movedAnchor = (axis: "x" | "y") => {
    const id = memory[axis]?.targetId;
    return id?.startsWith("node:") ? Math.abs((result.pushed.get(id.slice(5))?.[axis] ?? 0) - (drag.pushed.get(id.slice(5))?.[axis] ?? 0)) > EPS : false;
  };
  if (Math.abs(delta.x - snapped.x) > EPS || movedAnchor("x")) {
    guides = guides.filter((g) => g.x1 !== g.x2);
    marks = marks.filter((m) => m.y1 !== m.y2);
    delete memory.x;
  }
  if (Math.abs(delta.y - snapped.y) > EPS || movedAnchor("y")) {
    guides = guides.filter((g) => g.y1 !== g.y2);
    marks = marks.filter((m) => m.x1 !== m.x2);
    delete memory.y;
  }
  if (drag.peers.some((p) => {
    const before = drag.pushed.get(p.id) ?? ZERO, after = result.pushed.get(p.id) ?? ZERO;
    return Math.hypot(before.x - after.x, before.y - after.y) > EPS;
  })) marks = [];
  const screenGuides = guides.map((g) => projectGuide(drag.holder.matrix, g)).filter((g): g is Guide => g !== null);
  const screenMarks = marks.flatMap((m) => {
    const g = projectGuide(drag.holder.matrix, m);
    return g ? [{ ...g, length: Math.hypot(g.x2 - g.x1, g.y2 - g.y1) }] : [];
  });
  drag.last = delta;
  drag.pushed = result.pushed;
  drag.snapMemory = memory;
  return { delta, guides: screenGuides, marks: screenMarks, pushed: result.pushed, touching: result.touching };
}
