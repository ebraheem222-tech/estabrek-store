/**
 * A drawing's paths as numbers (focus mode, A2): read any SVG path into absolute moves, lines and curves, write it
 * back, move one of its points, turn the other shapes (circles, rectangles, polygons…) into paths, and fit a shape
 * onto another's box (a morph's target lands where the part is). Arcs become cubic curves on the way in, so every
 * part can be moved, bent and morphed the same way. Pure (tested).
 */
import type { ArtNode } from "../svgArt";

export type Pt = { x: number; y: number };
export type Seg =
  | { c: "M"; p: Pt }
  | { c: "L"; p: Pt }
  | { c: "C"; c1: Pt; c2: Pt; p: Pt }
  | { c: "Q"; c1: Pt; p: Pt }
  | { c: "Z" };
/** An affine matrix as SVG writes it: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = [number, number, number, number, number, number];

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** Arc flags may be written without spaces ("a1 1 0 011 1"): read them one digit at a time. */
function numbersOf(cmd: string, body: string): number[] {
  if (cmd.toUpperCase() !== "A") return (body.match(NUM) ?? []).map(Number);
  const out: number[] = [];
  let rest = body;
  while (rest.trim()) {
    const at = out.length % 7;
    const m = at === 3 || at === 4 ? /^[\s,]*([01])/.exec(rest) : new RegExp(`^[\\s,]*(${NUM.source})`, "i").exec(rest);
    if (!m) break;
    out.push(Number(m[1]));
    rest = rest.slice(m[0].length);
  }
  return out;
}

/** An SVG arc as cubic curves (the usual centre-parameterisation, at most 90° a piece). */
function arcToCubics(from: Pt, rx: number, ry: number, rot: number, large: number, sweep: number, to: Pt): Seg[] {
  if ((from.x === to.x && from.y === to.y)) return [];
  if (!rx || !ry) return [{ c: "L", p: to }];
  const phi = (rot * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (from.x - to.x) / 2, dy = (from.y - to.y) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const l = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const k = sign * Math.sqrt(Math.max(0, num / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
  const cx1 = (k * rx * y1) / ry, cy1 = (-k * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (from.x + to.x) / 2, cy = sin * cx1 + cos * cy1 + (from.y + to.y) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2)));
  const step = dt / n, h = (4 / 3) * Math.tan(step / 4);
  const at = (t: number): Pt => ({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos });
  const d = (t: number): Pt => ({ x: -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, y: -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos });
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a = t1 + i * step, b = a + step;
    const pa = at(a), pb = i === n - 1 ? to : at(b), da = d(a), db = d(b);
    out.push({ c: "C", c1: { x: pa.x + h * da.x, y: pa.y + h * da.y }, c2: { x: pb.x - h * db.x, y: pb.y - h * db.y }, p: pb });
  }
  return out;
}

/** Any SVG path as absolute moves, lines, cubic and quadratic curves (arcs turned into cubics). */
export function parsePath(d: string): Seg[] {
  const out: Seg[] = [];
  let cur: Pt = { x: 0, y: 0 }, start: Pt = { x: 0, y: 0 };
  let lastC: Pt | null = null, lastQ: Pt | null = null;
  for (const m of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const cmd = m[1], rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const n = numbersOf(cmd, m[2]);
    if (C === "Z") {
      out.push({ c: "Z" });
      cur = start; lastC = lastQ = null;
      continue;
    }
    const k = ARGS[C];
    for (let i = 0; i + k <= n.length; i += k) {
      const v = n.slice(i, i + k);
      const P = (x: number, y: number): Pt => (rel ? { x: cur.x + x, y: cur.y + y } : { x, y });
      let seg: Seg | Seg[];
      switch (C) {
        case "M": seg = { c: i === 0 ? "M" : "L", p: P(v[0], v[1]) } as Seg; break;
        case "L": seg = { c: "L", p: P(v[0], v[1]) }; break;
        case "H": seg = { c: "L", p: { x: rel ? cur.x + v[0] : v[0], y: cur.y } }; break;
        case "V": seg = { c: "L", p: { x: cur.x, y: rel ? cur.y + v[0] : v[0] } }; break;
        case "C": seg = { c: "C", c1: P(v[0], v[1]), c2: P(v[2], v[3]), p: P(v[4], v[5]) }; break;
        case "S": seg = { c: "C", c1: lastC ? { x: 2 * cur.x - lastC.x, y: 2 * cur.y - lastC.y } : cur, c2: P(v[0], v[1]), p: P(v[2], v[3]) }; break;
        case "Q": seg = { c: "Q", c1: P(v[0], v[1]), p: P(v[2], v[3]) }; break;
        case "T": seg = { c: "Q", c1: lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur, p: P(v[0], v[1]) }; break;
        default: seg = arcToCubics(cur, v[0], v[1], v[2], v[3], v[4], P(v[5], v[6]));
      }
      for (const s of Array.isArray(seg) ? seg : [seg]) {
        out.push(s);
        if (s.c === "M") start = s.p;
        if (s.c !== "Z") cur = s.p;
        lastC = s.c === "C" ? s.c2 : null;
        lastQ = s.c === "Q" ? s.c1 : null;
      }
    }
  }
  return out;
}

const r2 = (v: number) => {
  const x = Math.round(v * 100) / 100;
  return Object.is(x, -0) ? "0" : String(x);
};
const pt = (p: Pt) => `${r2(p.x)} ${r2(p.y)}`;

/** The path written back (absolute, two decimals). */
export function writePath(segs: Seg[]): string {
  return segs
    .map((s) => (s.c === "Z" ? "Z" : s.c === "C" ? `C${pt(s.c1)} ${pt(s.c2)} ${pt(s.p)}` : s.c === "Q" ? `Q${pt(s.c1)} ${pt(s.p)}` : `${s.c}${pt(s.p)}`))
    .join(" ");
}

export const apply = (m: Matrix, p: Pt): Pt => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
export function invert(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

/** The path moved by a matrix. */
export function transformPath(segs: Seg[], m: Matrix): Seg[] {
  return segs.map((s) => (s.c === "Z" ? s : s.c === "C" ? { c: "C", c1: apply(m, s.c1), c2: apply(m, s.c2), p: apply(m, s.p) } : s.c === "Q" ? { c: "Q", c1: apply(m, s.c1), p: apply(m, s.p) } : { c: s.c, p: apply(m, s.p) }));
}

/** The box around the drawn path (curves sampled, not their handles). */
export function pathBox(segs: Seg[]): { x: number; y: number; w: number; h: number } | null {
  const xs: number[] = [], ys: number[] = [];
  let cur: Pt = { x: 0, y: 0 };
  const add = (p: Pt) => { xs.push(p.x); ys.push(p.y); };
  for (const s of segs) {
    if (s.c === "Z") continue;
    if (s.c === "C" || s.c === "Q") {
      for (let i = 1; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        add(s.c === "C"
          ? { x: u * u * u * cur.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.p.x, y: u * u * u * cur.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.p.y }
          : { x: u * u * cur.x + 2 * u * t * s.c1.x + t * t * s.p.x, y: u * u * cur.y + 2 * u * t * s.c1.y + t * t * s.p.y });
      }
    } else add(s.p);
    cur = s.p;
  }
  if (!xs.length) return null;
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** A drawing's other shapes as a path (null for groups, gradients and the like). */
export function shapePath(n: ArtNode): string | null {
  const a = n.a, v = (k: string) => Number(a[k] ?? 0);
  switch (n.t) {
    case "path": return a.d ?? null;
    case "circle": case "ellipse": {
      const rx = n.t === "circle" ? v("r") : v("rx"), ry = n.t === "circle" ? v("r") : v("ry"), cx = v("cx"), cy = v("cy");
      if (!rx || !ry) return null;
      return `M${r2(cx - rx)} ${r2(cy)} A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx + rx)} ${r2(cy)} A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx - rx)} ${r2(cy)} Z`;
    }
    case "rect": {
      const x = v("x"), y = v("y"), w = v("width"), h = v("height");
      if (!w || !h) return null;
      const rx = Math.min(w / 2, a.rx ? v("rx") : a.ry ? v("ry") : 0), ry = Math.min(h / 2, a.ry ? v("ry") : rx);
      if (!rx || !ry) return `M${r2(x)} ${r2(y)} H${r2(x + w)} V${r2(y + h)} H${r2(x)} Z`;
      return `M${r2(x + rx)} ${r2(y)} H${r2(x + w - rx)} A${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x + w)} ${r2(y + ry)} V${r2(y + h - ry)} A${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x + w - rx)} ${r2(y + h)} H${r2(x + rx)} A${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x)} ${r2(y + h - ry)} V${r2(y + ry)} A${r2(rx)} ${r2(ry)} 0 0 1 ${r2(x + rx)} ${r2(y)} Z`;
    }
    case "line": return `M${r2(v("x1"))} ${r2(v("y1"))} L${r2(v("x2"))} ${r2(v("y2"))}`;
    case "polyline": case "polygon": {
      const nums = (a.points ?? "").match(NUM)?.map(Number) ?? [];
      if (nums.length < 4) return null;
      const pts: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push(`${i ? "L" : "M"}${r2(nums[i])} ${r2(nums[i + 1])}`);
      return pts.join(" ") + (n.t === "polygon" ? " Z" : "");
    }
    default: return null;
  }
}

/** A path stretched to land on a box (a morph's target placed where the part is). */
export function fitPath(d: string, box: { x: number; y: number; w: number; h: number }, keepRatio = true): string | null {
  const segs = parsePath(d);
  const from = pathBox(segs);
  if (!from || !segs.length) return null;
  let sx = from.w ? box.w / from.w : 1, sy = from.h ? box.h / from.h : 1;
  if (keepRatio) sx = sy = Math.min(from.w ? sx : sy, from.h ? sy : sx);
  const ex = box.x + (box.w - from.w * sx) / 2 - from.x * sx, ey = box.y + (box.h - from.h * sy) / 2 - from.y * sy;
  return writePath(transformPath(segs, [sx, 0, 0, sy, ex, ey]));
}

/* --------------------------------------------------------------- the points a hand moves */

/** One point of a path that can be moved: where it is (segment `i`), and which of its three. */
export type Handle = { i: number; k: "p" | "c1" | "c2"; at: Pt; anchor: Pt };

/** The path's points and their curve handles (each handle with the anchor it hangs from, for its line). */
export function handlesOf(segs: Seg[]): Handle[] {
  const out: Handle[] = [];
  let cur: Pt = { x: 0, y: 0 };
  segs.forEach((s, i) => {
    if (s.c === "Z") return;
    if (s.c === "C") {
      out.push({ i, k: "c1", at: s.c1, anchor: cur }, { i, k: "c2", at: s.c2, anchor: s.p });
    } else if (s.c === "Q") out.push({ i, k: "c1", at: s.c1, anchor: cur });
    out.push({ i, k: "p", at: s.p, anchor: s.p });
    cur = s.p;
  });
  return out;
}

/** The path with one point moved to `to`; an anchor takes its handles along, so the curve keeps its shape. */
export function moveHandle(segs: Seg[], h: Pick<Handle, "i" | "k">, to: Pt): Seg[] {
  const s = segs[h.i];
  if (!s || s.c === "Z") return segs;
  const was = h.k === "p" ? s.p : h.k === "c1" && (s.c === "C" || s.c === "Q") ? s.c1 : h.k === "c2" && s.c === "C" ? s.c2 : null;
  if (!was) return segs;
  const dx = to.x - was.x, dy = to.y - was.y;
  const by = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy });
  return segs.map((x, i) => {
    if (i === h.i) {
      if (h.k === "c1" && (x.c === "C" || x.c === "Q")) return { ...x, c1: to };
      if (h.k === "c2" && x.c === "C") return { ...x, c2: to };
      if (h.k === "p" && x.c !== "Z") return x.c === "C" ? { ...x, p: to, c2: by(x.c2) } : { ...x, p: to };
    }
    // The next curve's first handle hangs from this anchor too.
    if (h.k === "p" && i === h.i + 1 && x.c === "C") return { ...x, c1: by(x.c1) };
    return x;
  });
}
