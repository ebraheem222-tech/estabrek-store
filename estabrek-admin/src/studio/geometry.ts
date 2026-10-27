/**
 * The new editor's geometry (track B): which element the pointer means, as maths
 * with no React or DOM. Everything is in screen pixels, so zooming in makes small
 * elements easier to hit by itself.
 *
 * - Inside several nested elements: the deepest wins, then the smallest.
 * - Inside none: the nearest within 8 px (point-to-box distance); a near tie goes
 *   to the box the pointer is heading for (a ray along its movement).
 * - A spatial grid of 64 px cells keeps this fast with thousands of elements.
 * - The highlight follows a time-weighted vote of the last moments (HoverFilter),
 *   so it doesn't flicker on the border between two elements.
 * - Arrow keys move like a chess queen: 8 directions, each a narrow cone.
 */

export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Shape = { id: string; box: Box; depth: number; parentId: string | null };

export const PICK_THRESHOLD = 8;
export const EDGE_BAND = 4;
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

/** Odd-even rule: a ray from the point crosses the outline an odd number of times when it's inside (any polygon). */
export function insidePolygon(p: Pt, poly: Pt[]) {
  let inSide = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inSide = !inSide;
  }
  return inSide;
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

export type Pick = { id: string; inside: boolean; distance: number; nearEdge: boolean };

/**
 * The element at a point: the deepest (then smallest) one it's inside, else the
 * nearest within `threshold`; a near tie goes to the one the pointer is heading for.
 */
export function pickAt(candidates: Shape[], p: Pt, opts: { threshold?: number; edge?: number; heading?: Pt | null } = {}): Pick | null {
  const threshold = opts.threshold ?? PICK_THRESHOLD;
  const edge = opts.edge ?? EDGE_BAND;
  const hits = candidates.filter((s) => s.box.w > 0 && s.box.h > 0 && inside(s.box, p));
  if (hits.length) {
    hits.sort((a, b) => b.depth - a.depth || area(a.box) - area(b.box));
    const best = hits[0];
    return { id: best.id, inside: true, distance: 0, nearEdge: distToEdge(p, best.box) <= edge };
  }
  const near = candidates
    .filter((s) => s.box.w > 0 && s.box.h > 0)
    .map((s) => ({ s, d: distToBox(p, s.box) }))
    .filter((x) => x.d <= threshold)
    .sort((a, b) => a.d - b.d || b.s.depth - a.s.depth);
  if (!near.length) return null;
  let best = near[0];
  const h = opts.heading;
  if (near.length > 1 && h && Math.hypot(h.x, h.y) > 0.5 && near[1].d - best.d <= 1) {
    const tied = near.filter((x) => x.d - best.d <= 1);
    const ahead = tied
      .map((x) => ({ x, t: rayHitsBox(p, h, x.s.box) }))
      .filter((y): y is { x: (typeof tied)[number]; t: number } => y.t !== null)
      .sort((a, b) => a.t - b.t)[0];
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
