/**
 * Shapes by equations (docs/cms-big-engine-plan.ar.md G): an element's outline set corner by corner and edge by edge,
 * or as one whole shape, drawn as a CSS `clip-path: polygon()` whose points are `calc(<%> + <px>)`, so corners keep
 * their size in px on any box while edges stretch with it.
 *  - Corners (tl, tr, br, bl): square, round (a quarter circle), squircle (a superellipse, `k` = how square), bevel
 *    (cut straight), notch (cut square inwards), scoop (cut round inwards), or a free Bézier (two handles).
 *  - Edges (top, right, bottom, left): straight, one curve (sin), an arc (a half circle's profile), a wave, a zigzag,
 *    scallops, a notch in the middle (a ticket), or `y = f(x)` typed (x from 0 to 1, read by a small safe parser,
 *    never eval). `depth` px: cut in (> 0) or bulging out from a line set in by it (< 0). Waves, zigzags and scallops
 *    have a count and a phase, and can flow (their phase moving, `flow` seconds a round).
 *  - A whole shape instead: a superellipse (`n`), a polygon or star (`n` points, `inner` 0.2–1), a blob (`seed`,
 *    `amount`; it can flow, breathing between its seeds), or a polar curve r(a) typed.
 * Plain TypeScript: no DOM, no React, no "@/" imports (the shop, the admin and the tests use it).
 */

export const CORNER_KINDS = ["square", "round", "squircle", "bevel", "notch", "scoop", "bezier"] as const;
export const EDGE_KINDS = ["straight", "curve", "arc", "wave", "zigzag", "scallop", "notch", "fn"] as const;
export const WHOLE_KINDS = ["superellipse", "polygon", "blob", "polar"] as const;
export const CORNERS = ["tl", "tr", "br", "bl"] as const;
export const EDGES = ["top", "right", "bottom", "left"] as const;
export type CornerKind = (typeof CORNER_KINDS)[number];
export type EdgeKind = (typeof EDGE_KINDS)[number];
export type WholeKind = (typeof WHOLE_KINDS)[number];
export type CornerName = (typeof CORNERS)[number];
export type EdgeName = (typeof EDGES)[number];
export type Corner = { kind: CornerKind; size?: number; k?: number; c?: [number, number, number, number] };
export type Edge = { kind: EdgeKind; depth?: number; count?: number; phase?: number; flow?: number; fn?: string };
export type Whole = { kind: WholeKind; n?: number; inner?: number; seed?: number; amount?: number; flow?: number; fn?: string };
export type Form = { corners?: Partial<Record<CornerName, Corner>>; edges?: Partial<Record<EdgeName, Edge>>; whole?: Whole };

const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
const inList = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const drop = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const r2 = (v: number) => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ a small safe parser for y = f(x) and r(a) */

type Fn = (vars: Record<string, number>) => number;
const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, sqrt: (v) => Math.sqrt(Math.max(0, v)), exp: Math.exp,
  log: (v) => Math.log(Math.max(1e-9, v)), floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  min: (...a) => Math.min(...a), max: (...a) => Math.max(...a), pow: (a, b) => Math.pow(a, b),
};
const CONSTS: Record<string, number> = { pi: Math.PI, PI: Math.PI, e: Math.E, E: Math.E };

/** An expression in `names` (e.g. x, or a and t) read into a function, or null when it isn't one (120 characters at most). */
export function parseFn(src: unknown, names: readonly string[] = ["x"]): Fn | null {
  if (typeof src !== "string" || !src.trim() || src.length > 120) return null;
  const toks = src.match(/\d*\.?\d+(?:e[+-]?\d+)?|[A-Za-z_]\w*|[-+*/^%(),]|\S/g) ?? [];
  let i = 0, depth = 0;
  const peek = () => toks[i];
  const take = (t?: string) => { const v = toks[i]; if (t !== undefined && v !== t) throw new Error("x"); i++; return v; };
  const expr = (): Fn => {
    let left = term();
    while (peek() === "+" || peek() === "-") {
      const op = take(), a = left, b = term();
      left = op === "+" ? (v) => a(v) + b(v) : (v) => a(v) - b(v);
    }
    return left;
  };
  const term = (): Fn => {
    let left = power();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = take(), a = left, b = power();
      left = op === "*" ? (v) => a(v) * b(v) : op === "/" ? (v) => a(v) / b(v) : (v) => a(v) % b(v);
    }
    return left;
  };
  const power = (): Fn => {
    const base = unary();
    if (peek() === "^") { take(); const ex = power(); return (v) => Math.pow(base(v), ex(v)); }
    return base;
  };
  const unary = (): Fn => {
    if (peek() === "-") { take(); const a = unary(); return (v) => -a(v); }
    if (peek() === "+") { take(); return unary(); }
    return atom();
  };
  const atom = (): Fn => {
    if (++depth > 40) throw new Error("deep");
    const t = take();
    if (t === undefined) throw new Error("end");
    if (/^\d*\.?\d+(?:e[+-]?\d+)?$/.test(t)) { const n = Number(t); depth--; return () => n; }
    if (t === "(") { const e = expr(); take(")"); depth--; return e; }
    if (/^[A-Za-z_]\w*$/.test(t)) {
      if (names.includes(t)) { depth--; return (v) => v[t] ?? 0; }
      if (Object.hasOwn(CONSTS, t)) { const c = CONSTS[t]; depth--; return () => c; }
      if (!Object.hasOwn(FUNCS, t)) throw new Error("name");
      const f = FUNCS[t];
      take("(");
      const args: Fn[] = [];
      if (peek() !== ")") { args.push(expr()); while (peek() === ",") { take(); args.push(expr()); } }
      take(")");
      depth--;
      return (v) => f(...args.map((a) => a(v)));
    }
    throw new Error("token");
  };
  try {
    const fn = expr();
    if (i !== toks.length) return null;
    // It must give numbers.
    const probe: Record<string, number> = Object.fromEntries(names.map((n) => [n, 0.37]));
    const v = fn(probe);
    if (typeof v !== "number") return null;
    return (vars) => { try { const r = fn(vars); return typeof r === "number" && Number.isFinite(r) ? r : 0; } catch { return 0; } };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ the saved shape, read again */

function cornerOf(raw: unknown): Corner | undefined {
  const r = obj(raw);
  const kind = inList(r?.kind, CORNER_KINDS);
  if (!r || !kind) return undefined;
  const c = Array.isArray(r.c) && r.c.length === 4 && r.c.every((v) => num(v, 0, 1) !== undefined) ? (r.c.slice() as Corner["c"]) : undefined;
  return drop({ kind, size: num(r.size, 0, 400), k: num(r.k, 1, 12), c });
}
function edgeOf(raw: unknown): Edge | undefined {
  const r = obj(raw);
  const kind = inList(r?.kind, EDGE_KINDS);
  if (!r || !kind) return undefined;
  const fn = kind === "fn" && parseFn(r.fn) ? String(r.fn) : undefined;
  if (kind === "fn" && !fn) return undefined;
  return drop({ kind, depth: num(r.depth, -200, 200), count: num(r.count, 1, 40), phase: num(r.phase, 0, 1), flow: num(r.flow, 0.5, 30), fn });
}
function wholeOf(raw: unknown): Whole | undefined {
  const r = obj(raw);
  const kind = inList(r?.kind, WHOLE_KINDS);
  if (!r || !kind) return undefined;
  const fn = kind === "polar" && parseFn(r.fn, ["a", "t"]) ? String(r.fn) : undefined;
  if (kind === "polar" && !fn) return undefined;
  return drop({ kind, n: num(r.n, 2, 24), inner: num(r.inner, 0.2, 1), seed: num(r.seed, 0, 9999), amount: num(r.amount, 0, 0.6), flow: num(r.flow, 0.5, 30), fn });
}

/** A saved shape the shop may draw: known kinds and numbers in range only, else null. */
export function safeForm(raw: unknown): Form | null {
  const r = obj(raw);
  if (!r) return null;
  const whole = wholeOf(r.whole);
  if (whole) return { whole };
  const corners: Form["corners"] = {}, edges: Form["edges"] = {};
  const cr = obj(r.corners) ?? {}, er = obj(r.edges) ?? {};
  for (const k of CORNERS) { const c = cornerOf(cr[k]); if (c && !(c.kind === "square")) corners[k] = c; }
  for (const k of EDGES) { const e = edgeOf(er[k]); if (e && e.kind !== "straight") edges[k] = e; }
  const out: Form = {};
  if (Object.keys(corners).length) out.corners = corners;
  if (Object.keys(edges).length) out.edges = edges;
  return Object.keys(out).length ? out : null;
}

/* ------------------------------------------------------------------ the outline's points */

/** A point of the outline: `x%` of the box plus `dx` px, `y%` plus `dy` px. */
export type Pt = { x: number; dx: number; y: number; dy: number };

/** A corner's profile in its own square, from (0, 1) on the edge before it to (1, 0) on the edge after it; (0, 0) is the box's corner. */
export function cornerProfile(c: Corner): Array<[number, number]> {
  const steps = 14;
  const arc = (f: (th: number) => [number, number]) => Array.from({ length: steps + 1 }, (_, i) => f((i / steps) * (Math.PI / 2)));
  switch (c.kind) {
    case "square": return [[0, 1], [0, 0], [1, 0]];
    case "bevel": return [[0, 1], [1, 0]];
    case "notch": return [[0, 1], [1, 1], [1, 0]];
    case "round": return arc((th) => [1 - Math.cos(th), 1 - Math.sin(th)]);
    case "scoop": return arc((th) => [Math.sin(th), Math.cos(th)]);
    case "squircle": {
      const e = 2 / (c.k ?? 4.5);
      return arc((th) => [1 - Math.pow(Math.cos(th), e), 1 - Math.pow(Math.sin(th), e)]);
    }
    case "bezier": {
      const [ax, ay, bx, by] = c.c ?? [0, 0.45, 0.45, 0];
      const p0 = [0, 1], p3 = [1, 0];
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps, u = 1 - t;
        return [u * u * u * p0[0] + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * p3[1]] as [number, number];
      });
    }
  }
}

/** Where a corner's own (u, v) lands in the box: each corner the one before turned a quarter clockwise. */
function cornerPt(name: CornerName, u: number, v: number, s: number): Pt {
  switch (name) {
    case "tl": return { x: 0, dx: u * s, y: 0, dy: v * s };
    case "tr": return { x: 100, dx: -v * s, y: 0, dy: u * s };
    case "br": return { x: 100, dx: -u * s, y: 100, dy: -v * s };
    case "bl": return { x: 0, dx: v * s, y: 100, dy: -u * s };
  }
}
const sizeOf = (c: Corner | undefined) => (c && c.kind !== "square" ? c.size ?? 24 : 0);

/** An edge's profile at t (0–1 along it): 0 = on its line, 1 = its full depth. */
function edgeLift(e: Edge, t: number, fn: Fn | null): number {
  const n = e.count ?? (e.kind === "scallop" ? 8 : 4);
  const u = ((n * t + (e.phase ?? 0)) % 1 + 1) % 1;
  switch (e.kind) {
    case "curve": return Math.sin(Math.PI * t);
    case "arc": return Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    case "wave": return (1 - Math.cos(2 * Math.PI * u)) / 2;
    case "zigzag": return 1 - Math.abs(u * 2 - 1);
    case "scallop": return Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
    case "fn": return Math.max(0, Math.min(1, fn ? fn({ x: t }) : 0));
    default: return 0;
  }
}
function edgeSamples(e: Edge): number[] {
  const n = e.count ?? (e.kind === "scallop" ? 8 : 4);
  const count = e.kind === "curve" || e.kind === "arc" ? 24 : e.kind === "fn" ? 48 : e.kind === "zigzag" ? n * 2 : Math.min(480, n * 12);
  return Array.from({ length: count + 1 }, (_, i) => i / count);
}

// Inward and along, in px, for each edge.
const IN: Record<EdgeName, [number, number]> = { top: [0, 1], right: [-1, 0], bottom: [0, -1], left: [1, 0] };
const ALONG: Record<EdgeName, [number, number]> = { top: [1, 0], right: [0, 1], bottom: [-1, 0], left: [0, -1] };
const SIDES: Record<CornerName, [EdgeName, EdgeName]> = { tl: ["left", "top"], tr: ["top", "right"], br: ["right", "bottom"], bl: ["bottom", "left"] };
/** How far a corner sits in: an edge bulging out (depth < 0) starts from a line set in by its depth, the corners with it. */
function insetOf(name: CornerName, edges: Form["edges"]): [number, number] {
  let x = 0, y = 0;
  for (const side of SIDES[name]) {
    const e = edges?.[side];
    const d = e && e.kind !== "straight" && (e.depth ?? 16) < 0 ? -(e.depth ?? 16) : 0;
    x += IN[side][0] * d;
    y += IN[side][1] * d;
  }
  return [x, y];
}

/** The points of one edge (without its two ends), from the end of one corner to the start of the next. */
function edgePts(name: EdgeName, e: Edge | undefined, a: Pt, b: Pt): Pt[] {
  if (!e || e.kind === "straight") return [];
  // In (> 0) from the box's line, or out (< 0) from the line set in by it, which its ends (and corners) sit on.
  const depth = e.depth ?? 16;
  const lift = (g: number) => depth * g;
  const [ix, iy] = IN[name], [ax, ay] = ALONG[name];
  const at = (t: number, along: number, d: number): Pt => ({ x: a.x + (b.x - a.x) * t, dx: a.dx + (b.dx - a.dx) * t + ax * along + ix * d, y: a.y + (b.y - a.y) * t, dy: a.dy + (b.dy - a.dy) * t + ay * along + iy * d });
  if (e.kind === "notch") {
    // A half circle in the middle: cut in (a ticket's), or a bump out.
    const r = Math.abs(depth);
    return Array.from({ length: 17 }, (_, i) => {
      const th = Math.PI - (i / 16) * Math.PI;
      return at(0.5, r * Math.cos(th), depth * Math.sin(th));
    });
  }
  const fn = e.kind === "fn" ? parseFn(e.fn) : null;
  // Its two ends are the corners'.
  return edgeSamples(e).slice(1, -1).map((t) => at(t, 0, lift(edgeLift(e, t, fn))));
}

/** A whole shape's points, in % of the box. */
function wholePts(w: Whole, phase = 0): Pt[] {
  const P = (x: number, y: number): Pt => ({ x: r2(x), dx: 0, y: r2(y), dy: 0 });
  switch (w.kind) {
    case "superellipse": {
      const e = 2 / (w.n ?? 4);
      return Array.from({ length: 96 }, (_, i) => {
        const th = (i / 96) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        return P(50 + 50 * Math.sign(c) * Math.pow(Math.abs(c), e), 50 + 50 * Math.sign(s) * Math.pow(Math.abs(s), e));
      });
    }
    case "polygon": {
      const n = Math.max(3, Math.round(w.n ?? 6)), inner = w.inner ?? 1;
      const pts: Pt[] = [];
      for (let i = 0; i < n * (inner < 1 ? 2 : 1); i++) {
        const th = -Math.PI / 2 + (i / (n * (inner < 1 ? 2 : 1))) * Math.PI * 2, r = inner < 1 && i % 2 ? inner : 1;
        pts.push(P(50 + 50 * r * Math.cos(th), 50 + 50 * r * Math.sin(th)));
      }
      return pts;
    }
    case "blob": {
      // Radii at a few spokes from a steady random, smoothed round (Catmull-Rom), breathing between seeds as it flows.
      const k = 8, amount = w.amount ?? 0.25, seed = w.seed ?? 1;
      const radiiOf = (s: number) => { let a = (s * 2654435761) >>> 0; return Array.from({ length: k }, () => { a = (a * 1664525 + 1013904223) >>> 0; return 1 - amount + (a / 4294967296) * amount; }); };
      const r0 = radiiOf(seed), r1 = radiiOf(seed + 1);
      const mix = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      const radii = r0.map((v, i) => v + (r1[i] - v) * mix);
      const at = (i: number) => radii[((i % k) + k) % k];
      return Array.from({ length: 96 }, (_, j) => {
        const f = (j / 96) * k, i = Math.floor(f), t = f - i;
        const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
        const r = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
        const th = (j / 96) * Math.PI * 2;
        return P(50 + 50 * r * Math.cos(th), 50 + 50 * r * Math.sin(th));
      });
    }
    case "polar": {
      const fn = parseFn(w.fn, ["a", "t"]);
      const rs = Array.from({ length: 120 }, (_, i) => { const a = (i / 120) * Math.PI * 2; return Math.max(0, fn ? fn({ a, t: phase }) : 1); });
      const max = Math.max(1e-6, ...rs);
      return rs.map((r, i) => { const a = (i / 120) * Math.PI * 2; return P(50 + 50 * (r / max) * Math.cos(a), 50 + 50 * (r / max) * Math.sin(a)); });
    }
  }
}

/** The outline's points, clockwise from the top-left corner. `phase` moves flowing edges and blobs (0–1). */
export function formPoints(form: Form, phase = 0): Pt[] {
  if (form.whole) return wholePts(form.whole, phase);
  const c = form.corners ?? {}, e = form.edges ?? {};
  const pts: Pt[] = [];
  const shifted = (name: CornerName, p: Pt): Pt => { const [x, y] = insetOf(name, e); return { ...p, dx: p.dx + x, dy: p.dy + y }; };
  const corner = (name: CornerName) => {
    const cc = c[name];
    const s = sizeOf(cc);
    if (!cc || !s) { pts.push(shifted(name, cornerPt(name, 0, 0, 0))); return; }
    for (const [u, v] of cornerProfile(cc)) pts.push(shifted(name, cornerPt(name, u, v, s)));
  };
  const ends = (name: CornerName) => {
    const s = sizeOf(c[name]);
    return { start: shifted(name, cornerPt(name, 0, 1, s)), end: shifted(name, cornerPt(name, 1, 0, s)) };
  };
  const flowing = (x: Edge | undefined): Edge | undefined => (x && x.flow ? { ...x, phase: ((x.phase ?? 0) + phase) % 1 } : x);
  const order: Array<[CornerName, EdgeName, CornerName]> = [["tl", "top", "tr"], ["tr", "right", "br"], ["br", "bottom", "bl"], ["bl", "left", "tl"]];
  for (const [from, edge, to] of order) {
    corner(from);
    pts.push(...edgePts(edge, flowing(e[edge]), ends(from).end, ends(to).start));
  }
  return pts;
}

const len = (pct: number, px: number) => {
  const p = r2(pct), x = r2(px);
  if (!x) return `${p}%`;
  if (!p) return `${x}px`;
  return `calc(${p}% ${x < 0 ? "-" : "+"} ${Math.abs(x)}px)`;
};
/** The outline as CSS. */
export const polygonOf = (pts: Pt[]) => `polygon(${pts.map((p) => `${len(p.x, p.dx)} ${len(p.y, p.dy)}`).join(",")})`;
export const formPolygon = (form: Form) => polygonOf(formPoints(form));
/** Whether its outline flows (an edge's waves, a blob breathing). */
export const formFlows = (form: Form): number => form.whole?.flow ?? Math.max(0, ...Object.values(form.edges ?? {}).map((x) => x?.flow ?? 0));
/** A flowing outline's own @keyframes (12 steps, the same number of points in each, so they glide). */
export function formKeyframes(form: Form, name: string): string {
  const steps = 12;
  const frames = Array.from({ length: steps + 1 }, (_, i) => `${r2((i / steps) * 100)}%{clip-path:${polygonOf(formPoints(form, i / steps))}}`);
  return `@keyframes ${name}{${frames.join("")}}`;
}
/** The outline in a box of w × h px, as an SVG path (the editor's preview). */
export function formPath(form: Form, w: number, h: number): string {
  const pts = formPoints(form).map((p) => [r2((p.x / 100) * w + p.dx), r2((p.y / 100) * h + p.dy)]);
  return pts.length ? `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}Z` : "";
}
