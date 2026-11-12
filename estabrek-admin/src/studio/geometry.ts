/**
 * The new editor's geometry (track B): which element the pointer means, as maths
 * with no React or DOM. Everything is in screen pixels, so zooming in makes small
 * elements easier to hit by itself.
 *
 * - Inside several nested elements: the deepest wins, then the smallest.
 * - A tiny element (under 20 px on screen) can be hit a little outside itself, as if it were 20 px: it wins over
 *   what it lies in or was placed over (its section, its card), never over a neighbour the pointer is really on.
 * - Inside none: the nearest within 8 px (point-to-box distance); a near tie goes
 *   to the box the pointer is heading for (a ray along its movement).
 * - A spatial grid of 64 px cells keeps this fast with thousands of elements.
 * - The highlight follows a time-weighted vote of the last moments (HoverFilter),
 *   so it doesn't flicker on the border between two elements.
 * - Arrow keys move like a chess queen: 8 directions, each a narrow cone.
 */

export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Shape = { id: string; box: Box; depth: number; parentId: string | null; outline?: Pt[]; clips?: Pt[][] };

export const PICK_THRESHOLD = 8;
export const EDGE_BAND = 4;
/** A small element's hit area grows to this many screen px across, so tiny things can be picked and moved. */
export const MIN_HIT = 20;
/** How far outside itself a small element can still be hit (0 for anything MIN_HIT across or more). */
export const tinyPad = (b: Box) => (b.w > 0 && b.h > 0 ? Math.max(0, Math.min(PICK_THRESHOLD, (MIN_HIT - Math.min(b.w, b.h)) / 2)) : 0);
/** Whether an outline is just its box (not turned, skewed or tipped): then the box alone is drawn around it. */
export function outlineIsBox(outline: Pt[] | undefined, b: Box): boolean {
  if (!outline || outline.length !== 4) return !outline;
  const near = (v: number, a: number, c: number) => Math.abs(v - a) <= 0.75 || Math.abs(v - c) <= 0.75;
  return outline.every((p) => near(p.x, b.x, b.x + b.w) && near(p.y, b.y, b.y + b.h));
}
/** Under this many screen px across, a selected or hovered element gets a ring around it so it can be seen. */
export const TINY_SEEN = 14;
/** Whether a box lies in another (to half a pixel). */
export const boxWithin = (inner: Box, outer: Box) => inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.w <= outer.x + outer.w + 0.5 && inner.y + inner.h <= outer.y + outer.h + 0.5;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;

export const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h);
export const center = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
export const inside = (b: Box, p: Pt) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

/** How far a point is from a box: 0 inside it. */
export function distToBox(p: Pt, b: Box) {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/** How far a point inside a box is from its nearest side. */
export function distToEdge(p: Pt, b: Box) {
  return Math.min(p.x - b.x, b.x + b.w - p.x, p.y - b.y, b.y + b.h - p.y);
}

/** Where a ray from `o` along `d` first meets the box (its distance in units of d), or null. */
export function rayHitsBox(o: Pt, d: Pt, b: Box): number | null {
  let tMin = 0;
  let tMax = Infinity;
  for (const [oc, dc, lo, hi] of [
    [o.x, d.x, b.x, b.x + b.w],
    [o.y, d.y, b.y, b.y + b.h],
  ] as const) {
    if (Math.abs(dc) < 1e-12) {
      if (oc < lo || oc > hi) return null;
      continue;
    }
    let t1 = (lo - oc) / dc;
    let t2 = (hi - oc) / dc;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

const GEOMETRY_EPS = 1e-8;
const cross2 = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
const difference = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const segmentPoint = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const segmentDistance = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};

/** Odd-even rule for a simple polygon, including points on its boundary. */
export function insidePolygon(p: Pt, poly: Pt[]) {
  if (poly.length < 3 || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  let inSide = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (segmentDistance(p, a, b) <= GEOMETRY_EPS) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inSide = !inSide;
  }
  return inSide;
}

const boxPolygon = (b: Box): Pt[] => [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }];
const validPolygon = (poly: Pt[]) => poly.length >= 3 && poly.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) && Math.abs(poly.reduce((a, p, i) => a + cross2(p, poly[(i + 1) % poly.length]), 0)) > GEOMETRY_EPS;
const shapePolygons = (shape: Shape) => [shape.outline ?? boxPolygon(shape.box), ...(shape.clips ?? [])];

/** Actual visible geometry; the box remains a broad phase and the old-frame fallback. */
export function shapeContains(shape: Shape, p: Pt): boolean {
  if (!(shape.box.w > 0 && shape.box.h > 0) || !inside(shape.box, p)) return false;
  if (!shape.outline && !shape.clips?.length) return true;
  return shapePolygons(shape).every((poly) => validPolygon(poly) && insidePolygon(p, poly));
}

/** Parameters at which AB crosses CD; collinear endpoints split overlapping edges too. */
function segmentCuts(a: Pt, b: Pt, c: Pt, d: Pt): number[] {
  const r = difference(b, a);
  const s = difference(d, c);
  const ca = difference(c, a);
  const den = cross2(r, s);
  if (Math.abs(den) > GEOMETRY_EPS) {
    const t = cross2(ca, s) / den;
    const u = cross2(ca, r) / den;
    return t >= 0 && t <= 1 && u >= -GEOMETRY_EPS && u <= 1 + GEOMETRY_EPS ? [t] : [];
  }
  if (Math.abs(cross2(ca, r)) > GEOMETRY_EPS) return [];
  const l2 = r.x * r.x + r.y * r.y;
  if (!l2) return [];
  return [c, d].map((p) => ((p.x - a.x) * r.x + (p.y - a.y) * r.y) / l2).filter((t) => t >= 0 && t <= 1);
}

/** The boundary of the polygon intersection, including concave/disconnected results. */
function shapeSegments(shape: Shape): Array<[Pt, Pt]> {
  const polys = shapePolygons(shape);
  if (!(shape.box.w > 0 && shape.box.h > 0) || !polys.every(validPolygon)) return [];
  const segments: Array<[Pt, Pt]> = [];
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cuts = [0, 1];
    for (const other of polys) if (other !== poly) for (let j = 0; j < other.length; j++) cuts.push(...segmentCuts(a, b, other[j], other[(j + 1) % other.length]));
    cuts.sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++) {
      if (cuts[j] - cuts[j - 1] <= GEOMETRY_EPS) continue;
      const mid = segmentPoint(a, b, (cuts[j] + cuts[j - 1]) / 2);
      if (polys.every((p) => insidePolygon(mid, p))) segments.push([segmentPoint(a, b, cuts[j - 1]), segmentPoint(a, b, cuts[j])]);
    }
  }
  return segments;
}

/** Distance to the visible boundary, including the cuts introduced by clipping. */
export function shapeEdgeDistance(shape: Shape, p: Pt): number {
  if (!shape.outline && !shape.clips?.length) return inside(shape.box, p) ? distToEdge(p, shape.box) : distToBox(p, shape.box);
  return shapeSegments(shape).reduce((best, [a, b]) => Math.min(best, segmentDistance(p, a, b)), Infinity);
}

/** Distance to visible geometry; fully clipped-away shapes have infinite distance. */
export function shapeDistance(shape: Shape, p: Pt): number {
  return shapeContains(shape, p) ? 0 : shapeEdgeDistance(shape, p);
}

function rayHitsShape(o: Pt, d: Pt, shape: Shape): number | null {
  if (!shape.outline && !shape.clips?.length) return rayHitsBox(o, d, shape.box);
  if (shapeContains(shape, o)) return 0;
  let best = Infinity;
  for (const [a, b] of shapeSegments(shape)) {
    const e = difference(b, a);
    const ao = difference(a, o);
    const den = cross2(d, e);
    if (Math.abs(den) > GEOMETRY_EPS) {
      const t = cross2(ao, e) / den;
      const u = cross2(ao, d) / den;
      if (t >= 0 && u >= -GEOMETRY_EPS && u <= 1 + GEOMETRY_EPS) best = Math.min(best, t);
    } else if (Math.abs(cross2(ao, d)) <= GEOMETRY_EPS) {
      const l2 = d.x * d.x + d.y * d.y;
      for (const p of [a, b]) {
        const t = ((p.x - o.x) * d.x + (p.y - o.y) * d.y) / l2;
        if (t >= 0) best = Math.min(best, t);
      }
    }
  }
  return Number.isFinite(best) ? best : null;
}

/* -------------------------------------------------------------- the grid */

/**
 * Shapes filed by the 64 px cells they cover, so a lookup only checks what's
 * near the pointer. Parts outside `bounds` (the visible canvas) aren't filed.
 */
export class SpatialGrid {
  private cells = new Map<string, Shape[]>();
  readonly shapes: Shape[];
  readonly cell: number;
  constructor(shapes: Shape[], cell = 64, bounds?: Box) {
    this.shapes = shapes;
    this.cell = cell;
    for (const s of shapes) {
      let { x, y, w, h } = s.box;
      if (!(w > 0 && h > 0)) continue;
      if (bounds) {
        const x2 = Math.min(x + w, bounds.x + bounds.w);
        const y2 = Math.min(y + h, bounds.y + bounds.h);
        x = Math.max(x, bounds.x);
        y = Math.max(y, bounds.y);
        if (x2 < x || y2 < y) continue;
        w = x2 - x;
        h = y2 - y;
      }
      const c0 = Math.floor(x / cell);
      const c1 = Math.floor((x + w) / cell);
      const r0 = Math.floor(y / cell);
      const r1 = Math.floor((y + h) / cell);
      for (let c = c0; c <= c1; c++)
        for (let r = r0; r <= r1; r++) {
          const k = `${c},${r}`;
          const list = this.cells.get(k);
          if (list) list.push(s);
          else this.cells.set(k, [s]);
        }
    }
  }

  /** Every shape whose cells come within `radius` of the point. */
  near(p: Pt, radius = PICK_THRESHOLD): Shape[] {
    const out = new Set<Shape>();
    const c0 = Math.floor((p.x - radius) / this.cell);
    const c1 = Math.floor((p.x + radius) / this.cell);
    const r0 = Math.floor((p.y - radius) / this.cell);
    const r1 = Math.floor((p.y + radius) / this.cell);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) for (const s of this.cells.get(`${c},${r}`) ?? []) out.add(s);
    return [...out];
  }
}

/* -------------------------------------------------------------- picking */

/**
 * The tiny element the pointer means though it's just outside it: the nearest (then deepest) small one within
 * its own padding that lies in (or over) what the pointer is on: its section, its card, or a bigger thing it was
 * placed on. One beside what the pointer is on is never taken instead of it. With the pointer on nothing, the
 * nearest within 8 px is picked as before (pickAt).
 */
export function tinyNear(candidates: Shape[], p: Pt, direct: Shape | undefined): { s: Shape; d: number } | null {
  if (!direct) return null;
  let best: { s: Shape; d: number } | null = null;
  for (const s of candidates) {
    const pad = tinyPad(s.box);
    if (!pad || s === direct) continue;
    if (!boxWithin(s.box, direct.box)) continue;
    if (shapeContains(s, p)) continue;
    const d = shapeDistance(s, p);
    if (d > pad) continue;
    if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) <= 1e-9 && (s.depth > best.s.depth || (s.depth === best.s.depth && s.id.localeCompare(best.s.id) < 0)))) best = { s, d };
  }
  return best;
}

export type Pick = { id: string; inside: boolean; distance: number; nearEdge: boolean };

/**
 * The element at a point: the deepest (then smallest) one it's inside, else the
 * nearest within `threshold`; a near tie goes to the one the pointer is heading for.
 */
export function pickAt(candidates: Shape[], p: Pt, opts: { threshold?: number; edge?: number; heading?: Pt | null } = {}): Pick | null {
  const threshold = opts.threshold ?? PICK_THRESHOLD;
  const edge = opts.edge ?? EDGE_BAND;
  const hits = candidates.filter((s) => shapeContains(s, p));
  if (hits.length) hits.sort((a, b) => b.depth - a.depth || area(a.box) - area(b.box) || a.id.localeCompare(b.id));
  // A tiny element hit just outside itself wins over what it lies in.
  const tiny = tinyNear(candidates, p, hits[0]);
  if (tiny) return { id: tiny.s.id, inside: true, distance: tiny.d, nearEdge: false };
  if (hits.length) {
    const best = hits[0];
    return { id: best.id, inside: true, distance: 0, nearEdge: shapeEdgeDistance(best, p) <= edge };
  }
  const near = candidates
    .filter((s) => s.box.w > 0 && s.box.h > 0)
    .map((s) => ({ s, d: shapeDistance(s, p) }))
    .filter((x) => x.d <= threshold)
    .sort((a, b) => a.d - b.d || b.s.depth - a.s.depth || a.s.id.localeCompare(b.s.id));
  if (!near.length) return null;
  let best = near[0];
  const h = opts.heading;
  if (near.length > 1 && h && Math.hypot(h.x, h.y) > 0.5 && near[1].d - best.d <= 1) {
    const tied = near.filter((x) => x.d - best.d <= 1);
    const ahead = tied
      .map((x) => ({ x, t: rayHitsShape(p, h, x.s) }))
      .filter((y): y is { x: (typeof tied)[number]; t: number } => y.t !== null)
      .sort((a, b) => a.t - b.t || b.x.s.depth - a.x.s.depth || a.x.s.id.localeCompare(b.x.s.id))[0];
    if (ahead) best = ahead.x;
  }
  return { id: best.s.id, inside: false, distance: best.d, nearEdge: true };
}

/* ------------------------------------------------------- the steady highlight */

/**
 * A vote over the last moments of pointer positions, newer ones weighing more
 * (e^(−age/τ)). The highlight only moves to another element when that one's score
 * is clearly higher (`switchRatio` times), so a shaking hand on a border doesn't
 * make it flicker.
 */
export class HoverFilter {
  private samples: Array<{ t: number; id: string }> = [];
  current: string | null = null;
  readonly opts: { tau?: number; window?: number; switchRatio?: number };
  constructor(opts: { tau?: number; window?: number; switchRatio?: number } = {}) {
    this.opts = opts;
  }

  push(t: number, id: string | null): string | null {
    const tau = this.opts.tau ?? 120;
    const span = this.opts.window ?? 250;
    const ratio = this.opts.switchRatio ?? 1.3;
    this.samples.push({ t, id: id ?? "" });
    while (this.samples.length && this.samples[0].t < t - span) this.samples.shift();
    const score = new Map<string, number>();
    for (const s of this.samples) score.set(s.id, (score.get(s.id) ?? 0) + Math.exp(-(t - s.t) / tau));
    let best = "";
    let bestScore = -1;
    for (const [k, v] of score) if (v > bestScore) [best, bestScore] = [k, v];
    const now = this.current ?? "";
    const nowScore = score.get(now) ?? 0;
    if (nowScore === 0 || (best !== now && bestScore > ratio * nowScore)) this.current = best || null;
    return this.current;
  }

  reset() {
    this.samples = [];
    this.current = null;
  }
}

/** What a click selects: what's under the pointer now, unless it sits on a border — then the steady highlight. */
export function clickTarget(now: Pick | null, steady: string | null): string | null {
  if (now?.inside && !now.nearEdge) return now.id;
  return steady ?? now?.id ?? null;
}

/* ---------------------------------------------------------- arrow keys */

/** The 8 directions on the screen (y goes down): right, down-right, down, … up-right. */
export const DIRECTIONS: Record<"right" | "downRight" | "down" | "downLeft" | "left" | "upLeft" | "up" | "upRight", Pt> = {
  right: { x: 1, y: 0 },
  downRight: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  down: { x: 0, y: 1 },
  downLeft: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  left: { x: -1, y: 0 },
  upLeft: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  up: { x: 0, y: -1 },
  upRight: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
};

const clampTo = (p: Pt, b: Box): Pt => ({ x: Math.min(Math.max(p.x, b.x), b.x + b.w), y: Math.min(Math.max(p.y, b.y), b.y + b.h) });

/**
 * The next element in a direction, like a queen in chess but with a narrow cone
 * (±`cone` degrees) so nothing hides between two lines: the nearest one along the
 * direction, a sideways offset counting double. Its own parents and children are
 * skipped; elements with the same parent come first.
 */
export function queenStep(from: Shape, shapes: Shape[], dir: Pt, opts: { cone?: number; related?: (a: Shape, b: Shape) => boolean } = {}): Shape | null {
  const cone = ((opts.cone ?? 22.5) * Math.PI) / 180;
  const o = center(from.box);
  const score = (s: Shape) => {
    const q = inside(s.box, o) ? center(s.box) : clampTo(o, s.box);
    const v = { x: q.x - o.x, y: q.y - o.y };
    const along = v.x * dir.x + v.y * dir.y;
    if (along <= 0.5) return null;
    const side = Math.abs(v.x * dir.y - v.y * dir.x);
    if (Math.atan2(side, along) > cone) return null;
    return along + 2 * side;
  };
  const pickFrom = (list: Shape[]) => {
    let best: Shape | null = null;
    let bestScore = Infinity;
    for (const s of list) {
      if (s.id === from.id || (opts.related && opts.related(from, s))) continue;
      if (!(s.box.w > 0 && s.box.h > 0)) continue;
      const v = score(s);
      if (v !== null && v < bestScore) [best, bestScore] = [s, v];
    }
    return best;
  };
  return pickFrom(shapes.filter((s) => s.parentId === from.parentId)) ?? pickFrom(shapes);
}

/* ------------------------------------------------------------- zoom/pan */

/** Zooming keeps the point under the cursor still: pan′ = c − (c − pan)·(z′/z). */
export function zoomAround(pan: Pt, zoom: number, cursor: Pt, nextZoom: number) {
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom));
  const k = z / zoom;
  return { zoom: z, pan: { x: cursor.x - (cursor.x - pan.x) * k, y: cursor.y - (cursor.y - pan.y) * k } };
}

/**
 * The part of a box that shows inside `view` (the frame on the screen), and which of its
 * sides go past it: a scene many screens tall is drawn as what shows of it, its label on
 * top of that. Null when none of it shows.
 */
export function visiblePart(b: Box, view: Box): { box: Box; above: boolean; below: boolean; before: boolean; after: boolean } | null {
  const x = Math.max(b.x, view.x);
  const y = Math.max(b.y, view.y);
  const x2 = Math.min(b.x + b.w, view.x + view.w);
  const y2 = Math.min(b.y + b.h, view.y + view.h);
  if (x2 <= x || y2 <= y) return null;
  return { box: { x, y, w: x2 - x, h: y2 - y }, above: b.y < view.y - 0.5, below: b.y + b.h > view.y + view.h + 0.5, before: b.x < view.x - 0.5, after: b.x + b.w > view.x + view.w + 0.5 };
}

/** A box on the page (page coordinates, with the frame's scroll) as a box on the screen. */
export function toScreen(b: Box, scroll: Pt, origin: Pt, zoom: number): Box {
  return { x: origin.x + (b.x - scroll.x) * zoom, y: origin.y + (b.y - scroll.y) * zoom, w: b.w * zoom, h: b.h * zoom };
}
