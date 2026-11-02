/**
 * Dragging things on the editor's canvas as plane geometry (phase 9), with no React or DOM.
 * Screen pixels in, screen pixels out, like geometry.ts and handles.ts.
 *
 * - Affine maps (move, turn, scale) and their inverses; a turned box's corners.
 * - An element as a body: its box turned by its own turn, cut to its shape (the outline's
 *   convex hull) or a circle.
 * - Collision as in games: boxes, turned boxes and polygons by the separating axis
 *   theorem (SAT), circles by distance; each hit gives the shortest way out.
 * - What a drag does with what it meets: passes over it, stops and slides along its edge,
 *   pushes it, or is pulled flush against it (a magnet), kept inside its holder. Long
 *   moves go in small steps so nothing is jumped through.
 * - Snapping beyond edges and middles (handles.ts snapBox): equal gaps, a grid, Shift's
 *   straight lines; where in a row or a wrapping grid a dragged element goes.
 */
import type { Box, Pt } from "./geometry";
import type { Gap } from "./handles";
import { CUT_SHAPES } from "./cutShapes";

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mulBy = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const len = (a: Pt) => Math.hypot(a.x, a.y);
const ZERO: Pt = { x: 0, y: 0 };

/* --------------------------------------------------------------- affine */

/** x′ = a·x + c·y + e, y′ = b·x + d·y + f (the order CSS and canvas use). */
export type Affine = readonly [a: number, b: number, c: number, d: number, e: number, f: number];
export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];
/** `m` after `n`: a point goes through `n` first. */
export const compose = (m: Affine, n: Affine): Affine => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
/** Several maps, the first applied last (as written: translate · rotate · scale). */
export const chain = (...ms: Affine[]): Affine => ms.reduce(compose, IDENTITY);
export const apply = (m: Affine, p: Pt): Pt => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
export function invert(m: Affine): Affine {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) throw new Error("A flat map has no inverse");
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}
export const translate = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
/** A turn clockwise on the screen (y goes down), about `o`. */
export function rotate(deg: number, o: Pt = ZERO): Affine {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return chain(translate(o.x, o.y), [c, s, -s, c, 0, 0], translate(-o.x, -o.y));
}
export const scale = (sx: number, sy = sx, o: Pt = ZERO): Affine => chain(translate(o.x, o.y), [sx, 0, 0, sy, 0, 0], translate(-o.x, -o.y));

/** The page (with the frame's scroll) on the screen: where the frame sits on the canvas, at its zoom. */
export const pageToScreen = (scroll: Pt, origin: Pt, zoom: number): Affine => chain(translate(origin.x, origin.y), scale(zoom), translate(-scroll.x, -scroll.y));

/** A box turned about its middle: its middle, its own width and height, its turn. */
export type Turned = { c: Pt; w: number; h: number; deg: number };
/** Its corners, clockwise from the top-left before the turn. */
export function cornersOf(t: Turned): Pt[] {
  const m = rotate(t.deg, t.c);
  const [x0, y0, x1, y1] = [t.c.x - t.w / 2, t.c.y - t.h / 2, t.c.x + t.w / 2, t.c.y + t.h / 2];
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }].map((p) => apply(m, p));
}
export function boundsOf(pts: Pt[]): Box {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of pts) [x0, y0, x1, y1] = [Math.min(x0, p.x), Math.min(y0, p.y), Math.max(x1, p.x), Math.max(y1, p.y)];
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * A turned element from what the frame measured: the box around it on the screen (`rect`)
 * and, when known, its own size before the turn (in the screen's pixels). Without the size
 * it comes from the box: W = w|cos| + h|sin|, H = w|sin| + h|cos|, solved for w and h
 * (near 45° the two lines are one, so it's taken as square).
 */
export function turnedOf(rect: Box, deg: number, size?: { w: number; h: number } | null): Turned {
  const c = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  if (size && size.w > 0 && size.h > 0) return { c, w: size.w, h: size.h, deg };
  const r = (deg * Math.PI) / 180;
  const [co, si] = [Math.abs(Math.cos(r)), Math.abs(Math.sin(r))];
  const det = co * co - si * si;
  if (Math.abs(det) < 0.1) {
    const side = rect.w / (co + si || 1);
    return { c, w: side, h: side, deg };
  }
  return { c, w: Math.max(1, (rect.w * co - rect.h * si) / det), h: Math.max(1, (rect.h * co - rect.w * si) / det), deg };
}

/* ---------------------------------------------------------------- outlines */

const TOKENS = /[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;

/** An arc of an outline as points (SVG's arc from its two ends, then sampled along its angle). */
function arcPoints(p1: Pt, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean, p2: Pt, steps: number): Pt[] {
  if (!rx || !ry) return [p2];
  const phi = (phiDeg * Math.PI) / 180;
  const [cp, sp] = [Math.cos(phi), Math.sin(phi)];
  const dx = (p1.x - p2.x) / 2;
  const dy = (p1.y - p2.y) / 2;
  const x1 = cp * dx + sp * dy;
  const y1 = -sp * dx + cp * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) [rx, ry] = [rx * Math.sqrt(lambda), ry * Math.sqrt(lambda)];
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / (den || 1)));
  const cx1 = (k * rx * y1) / ry;
  const cy1 = (-k * ry * x1) / rx;
  const c = { x: cp * cx1 - sp * cy1 + (p1.x + p2.x) / 2, y: sp * cx1 + cp * cy1 + (p1.y + p2.y) / 2 };
  const angle = (u: Pt, v: Pt) => Math.atan2(u.x * v.y - u.y * v.x, dot(u, v));
  const u = { x: (x1 - cx1) / rx, y: (y1 - cy1) / ry };
  const t1 = angle({ x: 1, y: 0 }, u);
  let dt = angle(u, { x: (-x1 - cx1) / rx, y: (-y1 - cy1) / ry });
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = t1 + (dt * i) / steps;
    out.push({ x: c.x + rx * cp * Math.cos(t) - ry * sp * Math.sin(t), y: c.y + rx * sp * Math.cos(t) + ry * cp * Math.sin(t) });
  }
  return out;
}

/** An SVG outline (M L H V C Q A Z, either case) as points along it; curves in `steps` pieces. */
export function outlinePoints(d: string, steps = 8): Pt[] {
  const t = d.match(TOKENS) ?? [];
  const out: Pt[] = [];
  let i = 0;
  let cmd = "";
  let at: Pt = { x: 0, y: 0 };
  let start = at;
  const num = () => Number(t[i++]);
  while (i < t.length) {
    if (/[a-z]/i.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const o = rel ? at : ZERO;
    switch (cmd.toUpperCase()) {
      case "M":
      case "L": {
        at = add(o, { x: num(), y: num() });
        if (cmd.toUpperCase() === "M") start = at;
        out.push(at);
        if (cmd === "M") cmd = "L";
        else if (cmd === "m") cmd = "l";
        break;
      }
      case "H":
        at = { x: (rel ? at.x : 0) + num(), y: at.y };
        out.push(at);
        break;
      case "V":
        at = { x: at.x, y: (rel ? at.y : 0) + num() };
        out.push(at);
        break;
      case "C": {
        const [a, b, e] = [add(o, { x: num(), y: num() }), add(o, { x: num(), y: num() }), add(o, { x: num(), y: num() })];
        for (let s = 1; s <= steps; s++) {
          const u = s / steps;
          const v = 1 - u;
          out.push({ x: v * v * v * at.x + 3 * v * v * u * a.x + 3 * v * u * u * b.x + u * u * u * e.x, y: v * v * v * at.y + 3 * v * v * u * a.y + 3 * v * u * u * b.y + u * u * u * e.y });
        }
        at = e;
        break;
      }
      case "Q": {
        const [a, e] = [add(o, { x: num(), y: num() }), add(o, { x: num(), y: num() })];
        for (let s = 1; s <= steps; s++) {
          const u = s / steps;
          const v = 1 - u;
          out.push({ x: v * v * at.x + 2 * v * u * a.x + u * u * e.x, y: v * v * at.y + 2 * v * u * a.y + u * u * e.y });
        }
        at = e;
        break;
      }
      case "A": {
        const [rx, ry, phi, large, sweep] = [num(), num(), num(), num(), num()];
        const e = add(o, { x: num(), y: num() });
        out.push(...arcPoints(at, rx, ry, phi, Boolean(large), Boolean(sweep), e, steps));
        at = e;
        break;
      }
      case "Z":
        at = start;
        break;
      default:
        i++;
    }
  }
  return out.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/** The smallest convex outline around the points (Andrew's monotone chain), clockwise on the screen. */
export function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 1e-9) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 1e-9) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Each cut shape's convex outline on its 100×100 square, worked out once. */
const HULLS = new Map<string, Pt[]>();
function shapeHull(shape: string): Pt[] | null {
  if (HULLS.has(shape)) return HULLS.get(shape)!;
  const d = CUT_SHAPES.find(([id]) => id === shape)?.[2];
  if (!d) return null;
  const h = hull(outlinePoints(d, 10));
  HULLS.set(shape, h);
  return h;
}

/* ------------------------------------------------------------------ bodies */

/** What collides: a convex polygon (clockwise on the screen) or a circle. */
export type Body = { kind: "poly"; pts: Pt[] } | { kind: "circle"; c: Pt; r: number };

/** An element as a body: its turned box, cut to its shape when it has one (a round one is a circle). */
export function bodyOf(t: Turned, shape?: string | null): Body {
  if (shape === "circle" && Math.abs(t.w - t.h) < 0.5) return { kind: "circle", c: t.c, r: t.w / 2 };
  const outline = shape && shape !== "rect" ? shapeHull(shape) : null;
  if (!outline) return { kind: "poly", pts: cornersOf(t) };
  const m = chain(translate(t.c.x, t.c.y), rotate(t.deg), scale(t.w / 100, t.h / 100), translate(-50, -50));
  return { kind: "poly", pts: outline.map((p) => apply(m, p)) };
}
export const boxBody = (b: Box): Body => ({ kind: "poly", pts: [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }] });
export const moveBody = (b: Body, d: Pt): Body => (b.kind === "circle" ? { ...b, c: add(b.c, d) } : { kind: "poly", pts: b.pts.map((p) => add(p, d)) });
export const boxOfBody = (b: Body): Box => (b.kind === "circle" ? { x: b.c.x - b.r, y: b.c.y - b.r, w: 2 * b.r, h: 2 * b.r } : boundsOf(b.pts));

/* --------------------------------------------------------------- collision */

/** How deep two bodies overlap and the way out for the first: move it `depth` along `normal`. */
export type Hit = { depth: number; normal: Pt };

const project = (b: Body, axis: Pt): [number, number] => {
  if (b.kind === "circle") {
    const c = dot(b.c, axis);
    return [c - b.r, c + b.r];
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of b.pts) {
    const v = dot(p, axis);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
};
const edgeAxes = (pts: Pt[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const e = sub(pts[(i + 1) % pts.length], pts[i]);
    const l = len(e);
    if (l > 1e-9) out.push({ x: -e.y / l, y: e.x / l });
  }
  return out;
};

/**
 * Whether two bodies overlap (the separating axis theorem): two convex shapes are apart
 * exactly when some axis, an edge's normal of either (for a circle, the line to the
 * polygon's nearest corner), keeps their shadows apart. When none does, the axis with the
 * smallest overlap is the shortest way out. Touching isn't overlapping.
 */
export function collide(a: Body, b: Body): Hit | null {
  if (a.kind === "circle" && b.kind === "circle") {
    const v = sub(a.c, b.c);
    const d = len(v);
    const depth = a.r + b.r - d;
    if (depth <= 1e-6) return null;
    return { depth, normal: d > 1e-9 ? mulBy(v, 1 / d) : { x: 0, y: -1 } };
  }
  const axes: Pt[] = [];
  if (a.kind === "poly") axes.push(...edgeAxes(a.pts));
  if (b.kind === "poly") axes.push(...edgeAxes(b.pts));
  const circle = a.kind === "circle" ? a : b.kind === "circle" ? b : null;
  const poly = a.kind === "poly" ? a : b.kind === "poly" ? b : null;
  if (circle && poly) {
    let near = poly.pts[0];
    for (const p of poly.pts) if (len(sub(p, circle.c)) < len(sub(near, circle.c))) near = p;
    const v = sub(near, circle.c);
    if (len(v) > 1e-9) axes.push(mulBy(v, 1 / len(v)));
  }
  let best: Hit | null = null;
  for (const axis of axes) {
    const [a0, a1] = project(a, axis);
    const [b0, b1] = project(b, axis);
    const up = b1 - a0; // moving a along +axis until it clears b
    const down = a1 - b0; // moving a along −axis
    if (up <= 1e-6 || down <= 1e-6) return null;
    const hit = up < down ? { depth: up, normal: axis } : { depth: down, normal: mulBy(axis, -1) };
    if (!best || hit.depth < best.depth) best = hit;
  }
  return best;
}

/**
 * How far `b` has to go along `u` (a direction of length 1) to clear `a`. Two convex shapes
 * overlap along a line for one stretch of it, so the end of that stretch is found by halving.
 */
export function pushOut(a: Body, b: Body, u: Pt): number {
  if (!collide(a, b)) return 0;
  const [ra, rb] = [boxOfBody(a), boxOfBody(b)];
  let hi = Math.hypot(ra.w, ra.h) + Math.hypot(rb.w, rb.h) + 1;
  let lo = 0;
  for (let i = 0; i < 30 && hi - lo > 1e-4; i++) {
    const mid = (lo + hi) / 2;
    if (collide(a, moveBody(b, mulBy(u, mid)))) lo = mid;
    else hi = mid;
  }
  return hi;
}

/* ------------------------------------------------------------------ settle */

/** What a dragged element does with what it meets. */
export type CollideMode = "overlap" | "block" | "push" | "magnet";
export const COLLIDE_MODES: CollideMode[] = ["overlap", "block", "push", "magnet"];
/** Something in the way: `push` when the drag may move it (an element placed freely and not locked). */
export type Obstacle = { id: string; body: Body; push?: boolean };
export type SettleOpts = { mode: CollideMode; bounds?: Box | null; magnet?: number; gap?: number };
export type Settled = { d: Pt; pushed: Map<string, Pt>; touching: string[] };
const EPS = 0.01;

/** The least move that keeps a body's box inside `bounds` (a bigger one keeps its start and top inside). */
export function keepInside(b: Body, bounds: Box): Pt {
  const r = boxOfBody(b);
  const along = (lo: number, size: number, blo: number, bsize: number) => (size >= bsize || lo < blo ? blo - lo : lo + size > blo + bsize ? blo + bsize - lo - size : 0);
  return { x: along(r.x, r.w, bounds.x, bounds.w), y: along(r.y, r.h, bounds.y, bounds.h) };
}
const inside = (b: Body, d: Pt, bounds: Box | null | undefined) => (bounds ? add(d, keepInside(moveBody(b, d), bounds)) : d);

/** The obstacles a body doesn't already overlap (those it starts over don't stop it until they're apart). */
export const clearOf = (body: Body, obstacles: Obstacle[]) => obstacles.filter((o) => !collide(body, o.body));

/**
 * Where a dragged body ends up when the pointer asks to move it from `from` to `to` (moves
 * from where the drag started), and how far the things it pushed went (`pushed`, carried over
 * from the last call). The move goes in steps no longer than half the body's smaller side, so
 * it can't pass through something thin; each step is pushed out of what it overlaps along the
 * shortest way, which leaves the part along the edge (it slides). A magnet pulls it flush
 * (`gap` apart) when it comes within `magnet` pixels.
 */
export function settle(body: Body, from: Pt, to: Pt, obstacles: Obstacle[], opts: SettleOpts, pushedBefore?: ReadonlyMap<string, Pt>): Settled {
  const pushed = new Map(pushedBefore ?? []);
  if (opts.mode === "overlap") return { d: inside(body, to, opts.bounds), pushed, touching: [] };
  const box = boxOfBody(body);
  const stepLen = Math.max(4, Math.min(box.w, box.h) / 2);
  const way = sub(to, from);
  const steps = Math.min(64, Math.max(1, Math.ceil(len(way) / stepLen)));
  const at = (o: Obstacle) => moveBody(o.body, pushed.get(o.id) ?? ZERO);
  let d = from;
  const me = () => moveBody(body, d);
  const shove = (o: Obstacle, way: Pt, by: number) => pushed.set(o.id, inside(o.body, add(pushed.get(o.id) ?? ZERO, mulBy(way, by + EPS)), opts.bounds));
  /** Out of what it overlaps; `u` is the way this step went (pushing goes that way, backing off the other). */
  const resolve = (u: Pt) => {
    const going = len(u) > 1e-9;
    for (let iter = 0; iter < 8; iter++) {
      let moved = false;
      for (const o of obstacles) {
        const h = collide(me(), at(o));
        if (!h) continue;
        moved = true;
        if (opts.mode !== "push" || !o.push) d = add(d, mulBy(h.normal, h.depth + EPS));
        // It goes away along the shortest way when that's ahead of the drag, else straight ahead.
        else if (!going || dot(h.normal, u) <= 0) shove(o, mulBy(h.normal, -1), h.depth);
        else shove(o, u, pushOut(me(), at(o), u));
      }
      if (opts.mode === "push") {
        // What was pushed pushes what's beyond it, or is held back by what can't move.
        for (const o of obstacles) {
          if (!pushed.has(o.id)) continue;
          for (const q of obstacles) {
            if (q === o) continue;
            const h = collide(at(o), at(q));
            if (!h) continue;
            moved = true;
            // Down a chain everything goes the drag's way, so a row against a wall doesn't squeeze out sideways.
            if (q.push) {
              if (going) shove(q, u, pushOut(at(o), at(q), u));
              else shove(q, mulBy(h.normal, -1), h.depth);
            }
            // It couldn't go (a wall, or it doesn't move): the one pushing it backs off.
            if (!collide(at(o), at(q))) continue;
            if (going) shove(o, mulBy(u, -1), pushOut(at(q), at(o), mulBy(u, -1)));
            else shove(o, h.normal, h.depth);
          }
        }
        // What still overlaps it can't give way: it backs off the way it came.
        for (const o of obstacles) {
          if (!collide(me(), at(o))) continue;
          if (going) d = add(d, mulBy(u, -(pushOut(at(o), me(), mulBy(u, -1)) + EPS)));
          else {
            const h = collide(me(), at(o))!;
            d = add(d, mulBy(h.normal, h.depth + EPS));
          }
        }
      }
      const kept = inside(body, d, opts.bounds);
      if (kept.x !== d.x || kept.y !== d.y) [d, moved] = [kept, true];
      if (!moved) break;
    }
  };
  // Each step goes on from where the last one was let be, so a stopped drag slides along the edge it met.
  const step = mulBy(way, 1 / steps);
  const u = len(step) > 1e-9 ? mulBy(step, 1 / len(step)) : ZERO;
  for (let s = 0; s < steps; s++) {
    d = add(d, step);
    resolve(u);
  }
  if (opts.mode === "magnet") {
    const reach = opts.magnet ?? 12;
    const gap = opts.gap ?? 0;
    const me = boxOfBody(moveBody(body, d));
    let pull: Pt = { x: 0, y: 0 };
    let bx = Infinity;
    let by = Infinity;
    for (const o of obstacles) {
      const b = boxOfBody(at(o));
      const rows = Math.min(me.y + me.h, b.y + b.h) - Math.max(me.y, b.y);
      const cols = Math.min(me.x + me.w, b.x + b.w) - Math.max(me.x, b.x);
      if (rows > 0) {
        const right = b.x - (me.x + me.w) - gap;
        const left = me.x - (b.x + b.w) - gap;
        if (right > 0.5 && right <= reach && right < bx) [bx, pull] = [right, { x: right, y: pull.y }];
        if (left > 0.5 && left <= reach && left < bx) [bx, pull] = [left, { x: -left, y: pull.y }];
      }
      if (cols > 0) {
        const below = b.y - (me.y + me.h) - gap;
        const above = me.y - (b.y + b.h) - gap;
        if (below > 0.5 && below <= reach && below < by) [by, pull] = [below, { x: pull.x, y: below }];
        if (above > 0.5 && above <= reach && above < by) [by, pull] = [above, { x: pull.x, y: -above }];
      }
    }
    if (pull.x || pull.y) {
      d = add(d, pull);
      resolve(ZERO);
    }
  }
  const final = me();
  const fb = boxOfBody(final);
  const touching = obstacles
    .filter((o) => {
      const b = boxOfBody(at(o));
      const apart = Math.max(b.x - (fb.x + fb.w), fb.x - (b.x + b.w), b.y - (fb.y + fb.h), fb.y - (b.y + b.h));
      return apart <= (opts.gap ?? 0) + 1;
    })
    .map((o) => o.id);
  return { d, pushed, touching };
}

/* ------------------------------------------------------------------ snapping */

/** Shift while dragging: straight across, straight down, or along a 45° line, whichever is nearest. */
export function lockAxis(d: Pt): Pt {
  const [ax, ay] = [Math.abs(d.x), Math.abs(d.y)];
  if (ax >= 2 * ay) return { x: d.x, y: 0 };
  if (ay >= 2 * ax) return { x: 0, y: d.y };
  const m = (ax + ay) / 2;
  return { x: Math.sign(d.x) * m, y: Math.sign(d.y) * m };
}

/** A box's start and top onto a grid of `step` pixels that starts at `origin`. */
export function snapToGrid(b: Box, step: number, origin: Pt = ZERO): Box {
  if (!(step > 0)) return b;
  return { ...b, x: origin.x + Math.round((b.x - origin.x) / step) * step, y: origin.y + Math.round((b.y - origin.y) / step) * step };
}

/**
 * Equal spacing: the dragged box pulled (within `tol`) to where its gap to the next thing
 * matches a gap already between two others in the same row (or column), or to the middle
 * between its two neighbours. The marks show the gaps that match.
 */
export function equalGaps(box: Box, others: Box[], tol = 6): { dx: number; dy: number; marks: Gap[] } {
  const marks: Gap[] = [];
  const along = (across: boolean) => {
    const lo = (b: Box) => (across ? b.x : b.y);
    const size = (b: Box) => (across ? b.w : b.h);
    const hi = (b: Box) => lo(b) + size(b);
    const sideLo = (b: Box) => (across ? b.y : b.x);
    const sideHi = (b: Box) => (across ? b.y + b.h : b.x + b.w);
    const line = others.filter((o) => Math.min(sideHi(o), sideHi(box)) - Math.max(sideLo(o), sideLo(box)) > 0).sort((a, b) => lo(a) - lo(b));
    const mid = lo(box) + size(box) / 2;
    const before = line.filter((o) => lo(o) + size(o) / 2 < mid).pop();
    const after = line.find((o) => lo(o) + size(o) / 2 >= mid);
    const gaps: Array<{ g: number; a: Box; b: Box }> = [];
    for (let i = 1; i < line.length; i++) {
      const g = lo(line[i]) - hi(line[i - 1]);
      if (g > 0.5) gaps.push({ g, a: line[i - 1], b: line[i] });
    }
    const options: Array<{ to: number; why: Array<{ a: Box; b: Box }> }> = [];
    for (const x of gaps) {
      if (before) options.push({ to: hi(before) + x.g, why: [x] });
      if (after) options.push({ to: lo(after) - x.g - size(box), why: [x] });
    }
    if (before && after && lo(after) - hi(before) > size(box)) options.push({ to: (hi(before) + lo(after) - size(box)) / 2, why: [] });
    let best: (typeof options)[number] | null = null;
    for (const o of options) if (Math.abs(o.to - lo(box)) <= tol && (!best || Math.abs(o.to - lo(box)) < Math.abs(best.to - lo(box)))) best = o;
    if (!best) return 0;
    const shift = best.to - lo(box);
    const moved: Box = across ? { ...box, x: box.x + shift } : { ...box, y: box.y + shift };
    const mark = (a: Box, b: Box) => {
      const at = (Math.max(sideLo(a), sideLo(b)) + Math.min(sideHi(a), sideHi(b))) / 2;
      const [p, q] = [hi(a), lo(b)];
      marks.push(across ? { x1: p, y1: at, x2: q, y2: at, length: q - p } : { x1: at, y1: p, x2: at, y2: q, length: q - p });
    };
    if (before) mark(before, moved);
    if (after) mark(moved, after);
    for (const w of best.why) mark(w.a, w.b);
    return shift;
  };
  const dx = along(true);
  const dy = along(false);
  return { dx, dy, marks: marks.filter((m) => m.length > 0.5) };
}

/* -------------------------------------------------------------- in the flow */

/**
 * Where among a holder's elements a dragged one goes, from where the pointer is: the
 * elements in reading order are put in rows (those side by side share one); the row is
 * the one the pointer is level with (the gaps between rows split in half), then the place
 * in it is before the first element whose middle is past the pointer (right to left in
 * rtl). A holder whose rows are all single goes by height. `line` is where it would show.
 */
export function slotAt(p: Pt, kids: Box[], holder: Box, rtl: boolean): { index: number; line: Box } {
  if (!kids.length) return { index: 0, line: { x: holder.x, y: holder.y + holder.h / 2 - 1, w: holder.w, h: 3 } };
  const rows: Array<{ first: number; boxes: Box[]; top: number; bottom: number }> = [];
  kids.forEach((b, i) => {
    const row = rows[rows.length - 1];
    const level = row && Math.min(row.bottom, b.y + b.h) - Math.max(row.top, b.y) > Math.min(row.bottom - row.top, b.h) * 0.5;
    if (row && level) {
      row.boxes.push(b);
      row.top = Math.min(row.top, b.y);
      row.bottom = Math.max(row.bottom, b.y + b.h);
    } else rows.push({ first: i, boxes: [b], top: b.y, bottom: b.y + b.h });
  });
  const across = rows.some((r) => r.boxes.length > 1);
  if (!across) {
    let i = kids.findIndex((b) => p.y < b.y + b.h / 2);
    if (i < 0) i = kids.length;
    const end = i >= kids.length;
    const ref = kids[end ? kids.length - 1 : i];
    const prev = kids[i - 1];
    const y = end ? ref.y + ref.h : prev ? (prev.y + prev.h + ref.y) / 2 : ref.y;
    return { index: i, line: { x: Math.min(ref.x, holder.x), y: y - 1, w: Math.max(ref.w, holder.w), h: 3 } };
  }
  let r = rows.length - 1;
  for (let k = 0; k < rows.length; k++) {
    const next = rows[k + 1];
    if (!next || p.y < (rows[k].bottom + next.top) / 2) {
      r = k;
      break;
    }
  }
  const row = rows[r];
  const past = (b: Box) => (rtl ? p.x > b.x + b.w / 2 : p.x < b.x + b.w / 2);
  let k = row.boxes.findIndex(past);
  if (k < 0) k = row.boxes.length;
  const end = k >= row.boxes.length;
  const ref = row.boxes[end ? row.boxes.length - 1 : k];
  const prev = row.boxes[k - 1];
  const edge = (b: Box, after: boolean) => (rtl !== after ? b.x + b.w : b.x);
  const x = end ? edge(ref, true) : prev ? (edge(prev, true) + edge(ref, false)) / 2 : edge(ref, false);
  return { index: row.first + k, line: { x: x - 1, y: row.top, w: 3, h: row.bottom - row.top } };
}
