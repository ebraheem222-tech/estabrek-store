/**
 * «صورة 3D»: a picture lifted by its depth (a grey picture beside it, white = near), drawn by the shop with WebGL
 * (estabrek-storefront/src/pageTree/photo3dRun.ts) as a mesh or a cloud of points that turns a little with the
 * pointer (or the phone's tilt), the scroll or by itself, lit by a light that follows the pointer.
 * The depth is made in the editor (estabrek-admin lib/depth.ts: a depth model on the owner's own device, or the
 * picture's light as a quick stand-in). Pure maths and data: the shop, the admin and the server's tests read it.
 */

export const PHOTO3D_LOOKS = ["mesh", "points"] as const;
export type Photo3dLook = (typeof PHOTO3D_LOOKS)[number];
/**
 * What turns it: the pointer (and a phone's tilt), the page's scroll, or itself, slowly. Or a camera that moves into
 * it, as a film does (its near things grow faster than its far ones): by itself, in and out (`dolly`), or as the
 * page scrolls through it (`dive`).
 */
export const PHOTO3D_MOVES = ["pointer", "scroll", "auto", "dolly", "dive"] as const;
export type Photo3dMove = (typeof PHOTO3D_MOVES)[number];
export type Photo3d = {
  /** The depth picture (white = near). */
  map: string;
  look: Photo3dLook;
  move: Photo3dMove;
  /** How deep it is (0.1 … 1), how far it turns (0.1 … 1), and how much the light shapes it (0 … 1). */
  depth: number;
  turn: number;
  light: number;
};
export const PHOTO3D_DEFAULT = { look: "mesh", move: "pointer", depth: 0.5, turn: 0.5, light: 0.3 } as const;
/** The camera moves (it travels toward the picture; the others turn it). */
export const cameraMove = (move: Photo3dMove) => move === "dolly" || move === "dive";

/**
 * Where the camera is for a camera move, in the shop's units (the picture is 2 tall; z is toward it, at most
 * 0.25 + 0.55 × turn: near things then grow about a third more than far ones, a film's push, not a dive into them): `dolly` by itself, in and out over 14 s, drifting a little more as it gets closer (its edges
 * never show); `dive` as the page scrolls through it (`p` 0 as it comes in at the bottom … 1 as it leaves at the top).
 */
export function cameraAt(move: Photo3dMove, seconds: number, p: number, turn: number): { x: number; y: number; z: number } {
  const reach = 0.25 + 0.55 * turn;
  if (move === "dolly") {
    const near = (1 - Math.cos((2 * Math.PI * seconds) / 14)) / 2;
    const drift = turn * 0.1 * (0.25 + 0.75 * near);
    return { x: Math.sin((2 * Math.PI * seconds) / 23) * drift, y: Math.sin((2 * Math.PI * seconds) / 31) * drift * 0.5, z: near * reach };
  }
  if (move === "dive") {
    const q = Math.min(1, Math.max(0, p));
    return { x: 0, y: (q - 0.5) * turn * 0.1 * (0.25 + 0.75 * q), z: q * reach };
  }
  return { x: 0, y: 0, z: 0 };
}

/** At most this many 3D pictures draw at once (each is a WebGL canvas). */
export const PHOTO3D_LIVE = 4;

const SAFE = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i;
const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d);

/** A picture's 3D settings as they may be drawn, or null (no depth picture). */
export function photo3dOf(raw: unknown): Photo3d | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const map = typeof r.map === "string" && SAFE.test(r.map.trim()) ? r.map.trim() : null;
  if (!map) return null;
  return {
    map,
    look: pick(r.look, PHOTO3D_LOOKS, PHOTO3D_DEFAULT.look),
    move: pick(r.move, PHOTO3D_MOVES, PHOTO3D_DEFAULT.move),
    depth: num(r.depth, 0.1, 1, PHOTO3D_DEFAULT.depth),
    turn: num(r.turn, 0.1, 1, PHOTO3D_DEFAULT.turn),
    light: num(r.light, 0, 1, PHOTO3D_DEFAULT.light),
  };
}

export type DepthGrid = { w: number; h: number; d: Float32Array };
/** A depth picture's pixels (RGBA, its red as the depth) as 0 … 1. */
export function depthGrid(rgba: Uint8ClampedArray, w: number, h: number): DepthGrid {
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = rgba[i * 4] / 255;
  return { w, h, d };
}
/** The depth at a point of the picture (u, v 0 … 1), between its pixels. */
export function depthAt(g: DepthGrid, u: number, v: number): number {
  const x = Math.min(g.w - 1, Math.max(0, u * (g.w - 1))), y = Math.min(g.h - 1, Math.max(0, v * (g.h - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(g.w - 1, x0 + 1), y1 = Math.min(g.h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const a = g.d[y0 * g.w + x0], b = g.d[y0 * g.w + x1], c = g.d[y1 * g.w + x0], e = g.d[y1 * g.w + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
}

export type Mesh = {
  cols: number;
  rows: number;
  /** x, y in the box (−aspect … aspect, −1 … 1), z the depth lifted; the picture's u, v; a normal for the light. */
  pos: Float32Array;
  uv: Float32Array;
  normal: Float32Array;
  /** How sharply the depth jumps at each point (0 … 1, the biggest step to a neighbour, over `edge`): where a near
   *  thing meets what is far behind it, the shop fades the surface so the flat picture behind shows through softly. */
  jump: Float32Array;
  /** Triangles (in a contained picture, only over the picture). */
  index: Uint16Array;
  /** How many triangles cross such an edge (faded, not stretched as they are). */
  cut: number;
};
/**
 * The picture's box as a grid of points (no more than 65,535, for 16-bit triangles), each lifted by the depth under
 * it: z = (depth − its middle) × deep. `uvOf` says where a point of the box (0 … 1 across and down) falls in the
 * picture (object-fit and object-position; null in a contained picture's empty bands). A triangle whose corners'
 * depths differ by more than `edge` is left out: a near thing comes apart from the far one behind it, as in a
 * photograph, rather than being stretched over it.
 */
export function photoMesh(g: DepthGrid, aspect: number, deep: number, uvOf: (x: number, y: number) => { u: number; v: number } | null, o: { cols?: number; edge?: number } = {}): Mesh {
  let cols = Math.max(8, Math.round(o.cols ?? 180));
  let rows = Math.max(8, Math.round(cols / Math.max(0.2, aspect)));
  while ((cols + 1) * (rows + 1) > 65535) { cols = Math.floor(cols * 0.9); rows = Math.floor(rows * 0.9); }
  const n = (cols + 1) * (rows + 1);
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), normal = new Float32Array(n * 3), jump = new Float32Array(n), raw = new Float32Array(n), inside = new Uint8Array(n);
  let sum = 0, count = 0;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i, x = i / cols, y = j / rows, at = uvOf(x, y);
      const u = at ? at.u : x, v = at ? at.v : y;
      uv[k * 2] = u;
      uv[k * 2 + 1] = v;
      raw[k] = depthAt(g, u, v);
      inside[k] = at ? 1 : 0;
      if (at) { sum += raw[k]; count++; }
      pos[k * 3] = (x * 2 - 1) * aspect;
      pos[k * 3 + 1] = 1 - y * 2;
    }
  }
  const middle = count ? sum / count : 0.5;
  for (let k = 0; k < n; k++) pos[k * 3 + 2] = (raw[k] - middle) * deep;
  // Normals from the depth's slope (central differences on the grid).
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i;
      const l = j * (cols + 1) + Math.max(0, i - 1), r = j * (cols + 1) + Math.min(cols, i + 1);
      const t = Math.max(0, j - 1) * (cols + 1) + i, b = Math.min(rows, j + 1) * (cols + 1) + i;
      const dx = (pos[r * 3 + 2] - pos[l * 3 + 2]) / Math.max(1e-6, pos[r * 3] - pos[l * 3]);
      const dy = (pos[t * 3 + 2] - pos[b * 3 + 2]) / Math.max(1e-6, pos[t * 3 + 1] - pos[b * 3 + 1]);
      const len = Math.hypot(dx, dy, 1);
      normal[k * 3] = -dx / len;
      normal[k * 3 + 1] = -dy / len;
      normal[k * 3 + 2] = 1 / len;
    }
  }
  const edge = o.edge ?? 0.09;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i;
      let most = 0;
      if (i > 0) most = Math.max(most, Math.abs(raw[k] - raw[k - 1]));
      if (i < cols) most = Math.max(most, Math.abs(raw[k] - raw[k + 1]));
      if (j > 0) most = Math.max(most, Math.abs(raw[k] - raw[k - cols - 1]));
      if (j < rows) most = Math.max(most, Math.abs(raw[k] - raw[k + cols + 1]));
      jump[k] = Math.min(1, most / edge / 2);
    }
  }
  const tri: number[] = [];
  let cut = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      for (const [p, q, s] of [[a, c, b], [b, c, d]]) {
        if (!inside[p] || !inside[q] || !inside[s]) continue;
        if (Math.max(raw[p], raw[q], raw[s]) - Math.min(raw[p], raw[q], raw[s]) > edge) cut++;
        tri.push(p, q, s);
      }
    }
  }
  return { cols, rows, pos, uv, normal, jump, index: Uint16Array.from(tri), cut };
}

/**
 * The quick stand-in for a depth model: the picture's light, smoothed (light things come forward). Wrong for a
 * dark thing on a light ground, so the ground's side is turned to the back: when the picture's edge is lighter than
 * its middle, light and dark swap.
 */
export function lightDepth(rgba: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;
  // A box blur (three passes) as wide as a 40th of the picture: the depth is shapes, not their texture.
  const r = Math.max(1, Math.round(Math.max(w, h) / 40));
  let a = L, b = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { b[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; }
    }
    const c = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { c[y * w + x] = s / (2 * r + 1); s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; }
    }
    a = c;
  }
  let edge = 0, mid = 0, ne = 0, nm = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const border = x < w * 0.08 || x > w * 0.92 || y < h * 0.08 || y > h * 0.92;
    if (border) { edge += a[y * w + x]; ne++; } else if (Math.abs(x / w - 0.5) < 0.25 && Math.abs(y / h - 0.5) < 0.25) { mid += a[y * w + x]; nm++; }
  }
  const flip = ne && nm && edge / ne > mid / nm;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < w * h; i++) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let v = hi > lo ? (a[i] - lo) / (hi - lo) : 0.5;
    if (flip) v = 1 - v;
    const g = Math.round(v * 255);
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = g;
    out[i * 4 + 3] = 255;
  }
  return out;
}
