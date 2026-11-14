/**
 * A body's real outline in a physics world (physicsWorld.ts). What cuts an element on the page, a mask's path or a
 * polygon clip, is read as points on the element's own box; their convex hull is what the engine collides with (a
 * star or a heart collides by the outline round it, not by its dents); the hull's centre of area is where its
 * weight sits, which is not the box's middle for a triangle or a drop. Pure: no DOM.
 */

export type P = { x: number; y: number };

/** A text cut at a separator, leaving what is inside brackets whole (" " cuts at any run of spaces). */
function cut(text: string, by: "," | " "): string[] {
  const out: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && (by === "," ? c === "," : /\s/.test(c))) {
      if (i > from) out.push(text.slice(from, i));
      from = i + 1;
    }
  }
  if (from < text.length) out.push(text.slice(from));
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * One length of a CSS polygon in px along a side that is `size` long: "40%", "12px", "0", or a sum of those
 * ("calc(100% - 12px)", as a shape by equations writes its corners). Null when it is anything else.
 */
export function cssLength(text: string, size: number): number | null {
  let t = text.trim();
  const calc = /^calc\((.*)\)$/i.exec(t);
  if (calc) t = calc[1];
  const term = /\s*([+-]?)\s*(\d*\.?\d+(?:e[+-]?\d+)?)(%|px)?/gi;
  let total = 0, at = 0, n = 0;
  for (let m = term.exec(t); m; m = term.exec(t)) {
    if (m.index !== at || (n > 0 && !m[1])) return null;
    const v = Number(m[2]);
    if (!Number.isFinite(v) || (!m[3] && v !== 0)) return null;
    total += (m[1] === "-" ? -1 : 1) * (m[3] === "%" ? (v / 100) * size : v);
    at = term.lastIndex;
    n++;
  }
  return n > 0 && !t.slice(at).trim() ? total : null;
}

/** The corners of a CSS `polygon(…)` on a box w × h, in px; null unless it is a polygon of three corners or more. */
export function polygonCorners(clip: string, w: number, h: number): P[] | null {
  const m = /^polygon\((.*)\)$/is.exec(clip.trim());
  if (!m) return null;
  const pairs = cut(m[1].replace(/^\s*(nonzero|evenodd)\s*,/i, ""), ",");
  const out: P[] = [];
  for (const pair of pairs) {
    const xy = cut(pair, " ");
    if (xy.length !== 2) return null;
    const x = cssLength(xy[0], w), y = cssLength(xy[1], h);
    if (x === null || y === null) return null;
    out.push({ x, y });
  }
  return out.length >= 3 && out.length <= 400 ? out : null;
}

/** The path a mask image carries when it is one of the shop's own (css.ts: a path on a 100 × 100 square), or null. */
export function maskPath(image: string): string | null {
  const m = /url\("data:image\/svg\+xml,([^"]+)"\)/.exec(image);
  if (!m) return null;
  let svg = "";
  try { svg = decodeURIComponent(m[1]); } catch { return null; }
  if (!svg.includes("viewBox='0 0 100 100'")) return null;
  const d = /<path d='([^']+)'/.exec(svg)?.[1];
  return d && d.length <= 4000 ? d : null;
}

/** The corners of a path made of straight lines only (M, L, H, V and Z, absolute); null when it has curves. */
export function straightPath(d: string): P[] | null {
  if (/[^MLHVZ\d\s.,+-]/.test(d)) return null;
  const out: P[] = [];
  let x = 0, y = 0;
  const part = /([MLHVZ])([^MLHVZ]*)/g;
  for (let m = part.exec(d); m; m = part.exec(d)) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === "Z") continue;
    if (m[1] === "H" || m[1] === "V") {
      if (!n.length) return null;
      for (const v of n) { if (m[1] === "H") x = v; else y = v; out.push({ x, y }); }
    } else {
      if (!n.length || n.length % 2) return null;
      for (let i = 0; i < n.length; i += 2) { x = n[i]; y = n[i + 1]; out.push({ x, y }); }
    }
  }
  return out.length >= 3 ? out : null;
}

/**
 * The convex hull of some points (Andrew's monotone chain): the tight outline round them, clockwise as the screen
 * shows it, with no corner in a straight run. Fewer than three corners left: none.
 */
export function convexHull(points: P[]): P[] {
  const pts = [...points].filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.x - b.x || a.y - b.y);
  const turn = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: P[]) => {
    const out: P[] = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 1e-9) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  return hull.length >= 3 ? hull : [];
}

/** A polygon's area (the shoelace sum; never below zero). */
export function polygonArea(poly: P[]): number {
  let twice = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/** A polygon's centre of area: where a flat body of even weight balances. A polygon with no area: its corners' mean. */
export function centroid(poly: P[]): P {
  let twice = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const k = a.x * b.y - b.x * a.y;
    twice += k;
    cx += (a.x + b.x) * k;
    cy += (a.y + b.y) * k;
  }
  if (Math.abs(twice) < 1e-9) {
    const n = Math.max(1, poly.length);
    return { x: poly.reduce((s, p) => s + p.x, 0) / n, y: poly.reduce((s, p) => s + p.y, 0) / n };
  }
  return { x: cx / (3 * twice), y: cy / (3 * twice) };
}

/**
 * An element's outline as its body: the hull of the points that cut it on a box w × h, or null when that is as
 * good as the box itself (it fills nearly all of it) or too thin to be a body.
 */
export function bodyOutline(points: P[] | null, w: number, h: number): P[] | null {
  if (!points || !(w > 0) || !(h > 0)) return null;
  const hull = convexHull(points.map((p) => ({ x: Math.max(0, Math.min(w, p.x)), y: Math.max(0, Math.min(h, p.y)) })));
  if (hull.length < 3) return null;
  const share = polygonArea(hull) / (w * h);
  return share >= 0.05 && share <= 0.97 ? hull : null;
}

/**
 * Where an element's middle is while its body is at `pos`, turned by `angle` (radians): the body's centre is `off`
 * from the element's middle (the hull's centre of area against the box's), and that offset turns with the body.
 */
export function middleOf(pos: P, angle: number, off: P): P {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: pos.x - (off.x * c - off.y * s), y: pos.y - (off.x * s + off.y * c) };
}

/** How taut a rope is: it pulls only once its two ends are further apart than its length (slack, it does nothing). */
export const ropeTaut = (distance: number, length: number) => distance > length;
