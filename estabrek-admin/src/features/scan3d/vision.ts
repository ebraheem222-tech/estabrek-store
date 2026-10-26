/**
 * The picture work behind the 3D scan, without AI: plain arithmetic on the video's frames.
 * - The background is a frame with nothing on the mat yet (the "clean plate"); a pixel is
 *   the product where it differs from it, unless it is only the product's shadow.
 * - The mat's two dark rings are found as ellipses (fitEllipse); its code ring then tells
 *   each frame's angle (matAngle), and inside the rings a pixel is background when it is
 *   the mat's own dark or light colour at that angle (both measured in each frame).
 * - Masks are cleaned (opening, closing, the product's pieces kept, small holes filled).
 * Images are RGBA, 0–255; angles in degrees unless named otherwise.
 */
import { MAT_R, matBit } from "./mat";

export type Img = { w: number; h: number; data: Uint8ClampedArray };
/** Semi-axes a ≥ b (pixels), phi = the long axis's direction (radians, image axes, y down). */
export type Ellipse = { cx: number; cy: number; a: number; b: number; phi: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };

/* ------------------------------------------------------------------ pixels */

export function lumaOf(img: Img): Float32Array {
  const out = new Float32Array(img.w * img.h);
  const d = img.data;
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) / 255;
  return out;
}

/** The colour at a point between pixels (0–1 each), black outside the picture. */
export function sampleRgb(img: Img, x: number, y: number, out: number[] = [0, 0, 0]) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= img.w - 1 || y0 >= img.h - 1) {
    out[0] = out[1] = out[2] = -1;
    return out;
  }
  const fx = x - x0;
  const fy = y - y0;
  const d = img.data;
  const i00 = (y0 * img.w + x0) * 4;
  const i10 = i00 + 4;
  const i01 = i00 + img.w * 4;
  const i11 = i01 + 4;
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c] + (d[i10 + c] - d[i00 + c]) * fx;
    const bot = d[i01 + c] + (d[i11 + c] - d[i01 + c]) * fx;
    out[c] = (top + (bot - top) * fy) / 255;
  }
  return out;
}

const lum3 = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
/** How far apart two colours are (0–1). */
const dist3 = (c: ArrayLike<number>, d: ArrayLike<number>) => Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) / Math.sqrt(3);
/** The mat's two colours in a frame (0–1 RGB): its dark ink and its light paper. */
export type MatColours = { ink: [number, number, number]; paper: [number, number, number] };
/** A colour that is `of` in shadow: darker (40–95%), the same hue. */
function shadeOf(c: ArrayLike<number>, of: ArrayLike<number>) {
  const lc = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const lo = 0.299 * of[0] + 0.587 * of[1] + 0.114 * of[2];
  if (lo < 0.08) return false;
  const ratio = lc / lo;
  if (ratio < 0.4 || ratio > 0.95) return false;
  const sc = c[0] + c[1] + c[2] || 1;
  const so = of[0] + of[1] + of[2] || 1;
  return Math.hypot(c[0] / sc - of[0] / so, c[1] / sc - of[1] / so) < 0.03;
}
/** How close a colour must be to the mat's own to count as the mat. */
const matTolerance = (m: MatColours) => Math.min(0.16, Math.max(0.07, 0.22 * dist3(m.ink, m.paper)));

/** A smaller copy (each new pixel the average of the old ones it covers). */
export function shrink(img: Img, w: number): Img {
  const h = Math.max(1, Math.round((img.h * w) / img.w));
  const out = new Uint8ClampedArray(w * h * 4);
  const sx = img.w / w;
  const sy = img.h / h;
  for (let y = 0; y < h; y++) {
    const ya = Math.floor(y * sy);
    const yb = Math.max(ya + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const xa = Math.floor(x * sx);
      const xb = Math.max(xa + 1, Math.floor((x + 1) * sx));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = ya; yy < yb; yy++)
        for (let xx = xa; xx < xb; xx++) {
          const i = (yy * img.w + xx) * 4;
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
      const o = (y * w + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { w, h, data: out };
}

/** Each pixel's middle value over several pictures (the background, from frames with nothing on the mat). */
export function medianImage(imgs: Img[]): Img {
  const { w, h } = imgs[0];
  const out = new Uint8ClampedArray(w * h * 4);
  const vals = new Uint8Array(imgs.length);
  for (let i = 0; i < w * h * 4; i++) {
    if ((i & 3) === 3) {
      out[i] = 255;
      continue;
    }
    for (let k = 0; k < imgs.length; k++) vals[k] = imgs[k].data[i];
    vals.sort();
    out[i] = vals[vals.length >> 1];
  }
  return { w, h, data: out };
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  return s[s.length >> 1];
};

/* ---------------------------------------------------------------- ellipses */

/** Real roots of x³ + a x² + b x + c. */
function cubicRoots(a: number, b: number, c: number): number[] {
  const q = (a * a - 3 * b) / 9;
  const r = (2 * a * a * a - 9 * a * b + 27 * c) / 54;
  const q3 = q * q * q;
  if (r * r < q3) {
    const th = Math.acos(Math.max(-1, Math.min(1, r / Math.sqrt(q3))));
    const s = -2 * Math.sqrt(q);
    return [s * Math.cos(th / 3) - a / 3, s * Math.cos((th + 2 * Math.PI) / 3) - a / 3, s * Math.cos((th - 2 * Math.PI) / 3) - a / 3];
  }
  const A = -Math.sign(r) * Math.cbrt(Math.abs(r) + Math.sqrt(r * r - q3));
  const B = A === 0 ? 0 : q / A;
  return [A + B - a / 3];
}

type M3 = number[]; // row-major 3×3
const mul3 = (m: M3, n: M3): M3 => {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += m[i * 3 + k] * n[k * 3 + j];
  return o;
};
function inv3(m: M3): M3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** An ellipse from its conic A x² + B xy + C y² + D x + E y + F = 0, if it is one. */
export function conicToEllipse(k: number[]): Ellipse | null {
  let [A, B, C, D, E, F] = k;
  if (A + C < 0) [A, B, C, D, E, F] = [-A, -B, -C, -D, -E, -F];
  const den = 4 * A * C - B * B;
  if (!(den > 0)) return null;
  const cx = (B * E - 2 * C * D) / den;
  const cy = (B * D - 2 * A * E) / den;
  const F0 = A * cx * cx + B * cx * cy + C * cy * cy + D * cx + E * cy + F;
  const diff = Math.hypot(A - C, B);
  const l1 = (A + C - diff) / 2;
  const l2 = (A + C + diff) / 2;
  if (!(F0 < 0) || !(l1 > 0)) return null;
  const a = Math.sqrt(-F0 / l1);
  const b = Math.sqrt(-F0 / l2);
  // The short axis lies along ½·atan2(B, A − C); the long one across it.
  let phi = 0.5 * Math.atan2(B, A - C) + Math.PI / 2;
  while (phi > Math.PI / 2) phi -= Math.PI;
  while (phi <= -Math.PI / 2) phi += Math.PI;
  return { cx, cy, a, b, phi };
}

/** The ellipse closest to the points (Fitzgibbon's direct fit, Halíř–Flusser's steadier form). */
export function fitEllipse(xs: ArrayLike<number>, ys: ArrayLike<number>): Ellipse | null {
  const n = xs.length;
  if (n < 6) return null;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  let sc = 0;
  for (let i = 0; i < n; i++) sc += Math.hypot(xs[i] - mx, ys[i] - my);
  sc = sc / n || 1;
  const S1 = new Array(9).fill(0);
  const S2 = new Array(9).fill(0);
  const S3 = new Array(9).fill(0);
  for (let i = 0; i < n; i++) {
    const x = (xs[i] - mx) / sc;
    const y = (ys[i] - my) / sc;
    const q = [x * x, x * y, y * y];
    const l = [x, y, 1];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        S1[r * 3 + c] += q[r] * q[c];
        S2[r * 3 + c] += q[r] * l[c];
        S3[r * 3 + c] += l[r] * l[c];
      }
  }
  const S3i = inv3(S3);
  if (!S3i) return null;
  const S2t = [S2[0], S2[3], S2[6], S2[1], S2[4], S2[7], S2[2], S2[5], S2[8]];
  const T = mul3(S3i, S2t).map((v) => -v);
  const M = mul3(S2, T).map((v, i) => v + S1[i]);
  // C1⁻¹·M: rows (M₂/2, −M₁, M₀/2).
  const N = [M[6] / 2, M[7] / 2, M[8] / 2, -M[3], -M[4], -M[5], M[0] / 2, M[1] / 2, M[2] / 2];
  const tr = N[0] + N[4] + N[8];
  const c2 = N[0] * N[4] - N[1] * N[3] + N[0] * N[8] - N[2] * N[6] + N[4] * N[8] - N[5] * N[7];
  const det = N[0] * (N[4] * N[8] - N[5] * N[7]) - N[1] * (N[3] * N[8] - N[5] * N[6]) + N[2] * (N[3] * N[7] - N[4] * N[6]);
  let best: number[] | null = null;
  for (const lam of cubicRoots(-tr, c2, -det)) {
    const r0 = [N[0] - lam, N[1], N[2]];
    const r1 = [N[3], N[4] - lam, N[5]];
    const r2 = [N[6], N[7], N[8] - lam];
    const cross = (u: number[], v: number[]) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const cands = [cross(r0, r1), cross(r0, r2), cross(r1, r2)];
    const v = cands.reduce((p, q) => (Math.hypot(...q) > Math.hypot(...p) ? q : p));
    if (Math.hypot(...v) < 1e-12) continue;
    if (4 * v[0] * v[2] - v[1] * v[1] > 0) best = v;
  }
  if (!best) return null;
  const a2 = [T[0] * best[0] + T[1] * best[1] + T[2] * best[2], T[3] * best[0] + T[4] * best[1] + T[5] * best[2], T[6] * best[0] + T[7] * best[1] + T[8] * best[2]];
  const e = conicToEllipse([...best, ...a2]);
  if (!e) return null;
  return { cx: mx + e.cx * sc, cy: my + e.cy * sc, a: e.a * sc, b: e.b * sc, phi: e.phi };
}

/** The point at parameter t (radians) on the ellipse grown by r (1 = the ellipse itself). */
export function onEllipse(e: Ellipse, r: number, t: number): [number, number] {
  const ca = Math.cos(e.phi);
  const sa = Math.sin(e.phi);
  const u = r * e.a * Math.cos(t);
  const v = r * e.b * Math.sin(t);
  return [e.cx + u * ca - v * sa, e.cy + u * sa + v * ca];
}

/** A pixel in the ellipse's own measure: r (1 on it) and its parameter t (radians). */
export function toEllipse(e: Ellipse, x: number, y: number) {
  const dx = x - e.cx;
  const dy = y - e.cy;
  const ca = Math.cos(e.phi);
  const sa = Math.sin(e.phi);
  const p = (dx * ca + dy * sa) / e.a;
  const q = (-dx * sa + dy * ca) / e.b;
  return { r: Math.hypot(p, q), t: Math.atan2(q, p) };
}

/* -------------------------------------------------------------- the mat */

export type MatFit = { outer: Ellipse; inner: Ellipse };

/** Running max over a square (r pixels each side), as two passes. */
function maxFilter(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = Math.max(m, src[y * w + k]);
      tmp[y * w + x] = m;
    }
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      let m = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = Math.max(m, tmp[k * w + x]);
      out[y * w + x] = m;
    }
  return out;
}

/** Groups of touching set pixels (8 neighbours): a label per pixel (0 = none) and each group's pixels. */
export function components(mask: Uint8Array, w: number, h: number, eight = true) {
  const label = new Int32Array(w * h);
  const groups: number[][] = [];
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s]) continue;
    const id = groups.length + 1;
    const pix: number[] = [];
    label[s] = id;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      pix.push(p);
      const x = p % w;
      const y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || (!eight && dx && dy)) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mask[q] && !label[q]) {
            label[q] = id;
            stack.push(q);
          }
        }
    }
    groups.push(pix);
  }
  return { label, groups };
}

/**
 * The mat in a picture with nothing on it: dark pixels (darker than half the white around
 * them) in big groups shaped like an ellipse all round; the two with one centre and the
 * rings' size ratio are the mat. Null when it isn't there.
 */
export function findMat(img: Img): MatFit | null {
  const { w, h } = img;
  const L = lumaOf(img);
  const white = maxFilter(L, w, h, Math.max(3, Math.round(w / 60)));
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < L.length; i++) dark[i] = white[i] > 0.3 && L[i] < 0.5 * white[i] ? 1 : 0;
  const { groups } = components(dark, w, h);
  const rings: Ellipse[] = [];
  for (const g of groups) {
    if (g.length < 0.0008 * w * h) continue;
    let x0 = w;
    let x1 = 0;
    for (const p of g) {
      const x = p % w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
    if (x1 - x0 < 0.12 * w) continue;
    const step = Math.max(1, Math.floor(g.length / 5000));
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < g.length; i += step) {
      xs.push(g[i] % w);
      ys.push(Math.floor(g[i] / w));
    }
    const e = fitEllipse(xs, ys);
    if (!e || e.b < 0.1 * e.a || e.a > w) continue;
    // Ring-shaped: close to the ellipse, and all the way round.
    let off = 0;
    const bins = new Uint8Array(36);
    for (let i = 0; i < xs.length; i++) {
      const { r, t } = toEllipse(e, xs[i], ys[i]);
      off += Math.abs(r - 1);
      bins[Math.min(35, Math.floor(((t + Math.PI) / (2 * Math.PI)) * 36))] = 1;
    }
    const cover = bins.reduce((s, v) => s + v, 0) / 36;
    if (off / xs.length < 0.08 && cover > 0.8) rings.push(e);
  }
  let best: { fit: MatFit; err: number } | null = null;
  for (const o of rings)
    for (const i of rings) {
      if (o === i || i.a >= o.a) continue;
      const ratio = i.a / o.a;
      // Perspective puts the bigger circle's centre a little nearer the camera.
      const centre = Math.hypot(o.cx - i.cx, o.cy - i.cy) / o.a;
      const shape = Math.abs(i.b / i.a - o.b / o.a);
      const err = Math.abs(ratio - MAT_R.innerRingMid) + centre + shape;
      if (Math.abs(ratio - MAT_R.innerRingMid) < 0.06 && centre < 0.09 && shape < 0.08 && (!best || err < best.err)) best = { fit: { outer: o, inner: i }, err };
    }
  if (best) return best.fit;
  // One ring clean (the other run into something dark, a black turntable's rim): which one
  // it is shows from the code ring beside it, inside the outer one or outside the inner one.
  const codeMid = (MAT_R.code[0] + MAT_R.code[1]) / 2;
  for (const e of rings.slice().sort((p, q) => q.a - p.a)) {
    if (codeLike(L, w, h, e, codeMid)) return { outer: e, inner: scaleAbout(e, MAT_R.innerRingMid) };
    if (codeLike(L, w, h, e, codeMid / MAT_R.innerRingMid)) {
      const outer = scaleAbout(e, 1 / MAT_R.innerRingMid);
      return { outer, inner: e };
    }
  }
  return null;
}

/** An ellipse grown or shrunk about its own centre. */
export const scaleAbout = (e: Ellipse, k: number): Ellipse => ({ ...e, a: e.a * k, b: e.b * k });

/** Whether the ellipse grown by `k` runs through the code ring: about half dark, changing often all round. */
function codeLike(L: Float32Array, w: number, h: number, e: Ellipse, k: number) {
  const vals: number[] = [];
  for (let n = 0; n < 360; n++) {
    const [x, y] = onEllipse(e, k, (n / 360) * 2 * Math.PI);
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;
    vals.push(L[yi * w + xi]);
  }
  const sorted = vals.slice().sort((p, q) => p - q);
  const light = sorted[Math.floor(sorted.length * 0.9)];
  const darkNow = vals.map((v) => v < 0.6 * light);
  const share = darkNow.filter(Boolean).length / vals.length;
  let changes = 0;
  for (let n = 0; n < vals.length; n++) if (darkNow[n] !== darkNow[(n + 1) % vals.length]) changes++;
  return share > 0.3 && share < 0.75 && changes >= 20;
}

export const scaleEllipse = (e: Ellipse, k: number): Ellipse => ({ cx: e.cx * k, cy: e.cy * k, a: e.a * k, b: e.b * k, phi: e.phi });
export const scaleFit = (m: MatFit, k: number): MatFit => ({ outer: scaleEllipse(m.outer, k), inner: scaleEllipse(m.inner, k) });

/**
 * The camera, seen from the mat (a pinhole looking at the mat's centre): where that centre
 * is in the picture (cx, cy), the picture's roll (phi), how many pixels the outer ring's
 * radius is there (k), how far the camera is in those radii (1/rho: rho 0 = far away, no
 * perspective) and how high it is (e, radians above the mat). Fitted to the two rings'
 * ellipses, so the mat's own angles are read where they really are: perspective makes the
 * near side bigger than the far side.
 */
export type MatModel = { cx: number; cy: number; phi: number; k: number; rho: number; e: number };

/** A point of the mat (radius R, 1 = the outer ring's middle; its angle alpha, radians) in the picture. */
export function matProject(m: MatModel, R: number, alpha: number): [number, number] {
  const x = R * Math.cos(alpha);
  const z = R * Math.sin(alpha); // towards the camera
  const d = 1 - m.rho * z * Math.cos(m.e);
  const u = (m.k * x) / d;
  const down = (m.k * z * Math.sin(m.e)) / d;
  const c = Math.cos(m.phi);
  const sn = Math.sin(m.phi);
  return [m.cx + u * c - down * sn, m.cy + u * sn + down * c];
}

/** A pixel back on the mat: its radius and angle (radians). */
export function matUnproject(m: MatModel, px: number, py: number) {
  const dx = px - m.cx;
  const dy = py - m.cy;
  const c = Math.cos(m.phi);
  const sn = Math.sin(m.phi);
  const u = dx * c + dy * sn;
  const down = -dx * sn + dy * c;
  const ce = Math.cos(m.e);
  const se = Math.sin(m.e);
  const den = m.k * se + m.rho * down * ce;
  if (Math.abs(den) < 1e-9) return { r: NaN, t: NaN };
  const z = down / den;
  const x = (u * (1 - m.rho * z * ce)) / m.k;
  return { r: Math.hypot(x, z), t: Math.atan2(z, x) };
}

/** The lowest point of a function of a few numbers (Nelder–Mead), from a start and a step for each. */
function minimise(f: (p: number[]) => number, start: number[], step: number[], rounds = 600) {
  const n = start.length;
  let pts = [start, ...start.map((_, i) => start.map((v, j) => (i === j ? v + step[j] : v)))];
  let vals = pts.map(f);
  for (let it = 0; it < rounds; it++) {
    const order = vals.map((v, i) => i).sort((i, j) => vals[i] - vals[j]);
    pts = order.map((i) => pts[i]);
    vals = order.map((i) => vals[i]);
    const centre = start.map((_, j) => pts.slice(0, n).reduce((acc, p) => acc + p[j], 0) / n);
    const toward = (k: number) => centre.map((c, j) => c + k * (pts[n][j] - c));
    const r = toward(-1);
    const fr = f(r);
    if (fr < vals[0]) {
      const ex = toward(-2);
      const fe = f(ex);
      [pts[n], vals[n]] = fe < fr ? [ex, fe] : [r, fr];
    } else if (fr < vals[n - 1]) {
      [pts[n], vals[n]] = [r, fr];
    } else {
      const ct = toward(0.5);
      const fc = f(ct);
      if (fc < vals[n]) [pts[n], vals[n]] = [ct, fc];
      else
        for (let i = 1; i <= n; i++) {
          pts[i] = pts[i].map((v, j) => pts[0][j] + 0.5 * (v - pts[0][j]));
          vals[i] = f(pts[i]);
        }
    }
  }
  const best = vals.indexOf(Math.min(...vals));
  return { point: pts[best], value: vals[best] };
}

/** The camera that draws the two rings as found: each ring's points, put through it, should lie on its ellipse. */
export function fitMatModel(fit: MatFit): MatModel {
  const rIn = MAT_R.innerRingMid;
  const toModel = (p: number[]): MatModel => ({ cx: p[0], cy: p[1], phi: p[2], k: p[3], rho: Math.max(0, Math.min(0.6, p[4])), e: Math.max(0.05, Math.min(1.5, p[5])) });
  const cost = (p: number[]) => {
    const m = toModel(p);
    let sum = 0;
    for (const [ring, R] of [
      [fit.outer, 1],
      [fit.inner, rIn],
    ] as const)
      for (let n = 0; n < 48; n++) {
        const [x, y] = matProject(m, R, (n / 48) * 2 * Math.PI);
        const r = toEllipse(ring, x, y).r - 1;
        sum += r * r;
      }
    return sum;
  };
  // Start from no perspective: the outer ring's own ellipse, its centre moved to where the rings point.
  const k0 = fit.outer.a;
  const e0 = Math.asin(Math.min(0.999, fit.outer.b / fit.outer.a));
  const shift = rIn / (1 - rIn);
  const start = [fit.inner.cx - (fit.outer.cx - fit.inner.cx) * shift, fit.inner.cy - (fit.outer.cy - fit.inner.cy) * shift, fit.outer.phi, k0, 0.05, e0];
  const step = [k0 * 0.03, k0 * 0.03, 0.02, k0 * 0.03, 0.05, 0.05];
  let best = minimise(cost, start, step);
  // Once more from where it got to: Nelder–Mead settles better on a fresh start.
  best = minimise(cost, best.point, step.map((v) => v / 4));
  return toModel(best.point);
}

/** Every pixel's place on the mat (NaN off it), worked out once: the camera doesn't move. */
export type MatMap = { r: Float32Array; t: Float32Array };
export function matMap(m: MatModel, w: number, h: number): MatMap {
  const r = new Float32Array(w * h).fill(NaN);
  const t = new Float32Array(w * h).fill(NaN);
  const lo = MAT_R.innerRing[0] - 0.05;
  const hi = MAT_R.outerRing[1] + 0.05;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = matUnproject(m, x, y);
      if (!(c.r >= lo && c.r <= hi)) continue;
      r[y * w + x] = c.r;
      t[y * w + x] = c.t;
    }
  return { r, t };
}

/**
 * The mat's two colours in a frame: its rings' middle (ink) and the gaps beside them
 * (paper), each the middle colour of the darkest (or lightest) half of what is seen
 * there, so the product standing over part of them doesn't count.
 */
export function inkAndPaper(img: Img, mat: MatModel): MatColours {
  const ink: number[][] = [];
  const paper: number[][] = [];
  const gaps = [(MAT_R.innerRing[1] + MAT_R.code[0]) / 2, (MAT_R.code[1] + MAT_R.outerRing[0]) / 2];
  for (let k = 0; k < 180; k++) {
    const t = (k / 180) * 2 * Math.PI;
    for (const r of [MAT_R.innerRingMid, 1]) {
      const c = sampleRgb(img, ...matProject(mat, r, t), [0, 0, 0]);
      if (c[0] >= 0) ink.push(c);
    }
    for (const r of gaps) {
      const c = sampleRgb(img, ...matProject(mat, r, t), [0, 0, 0]);
      if (c[0] >= 0) paper.push(c);
    }
  }
  const pick = (list: number[][], dark: boolean): [number, number, number] => {
    const half = list.sort((a, b) => (dark ? lum3(a) - lum3(b) : lum3(b) - lum3(a))).slice(0, Math.max(1, list.length >> 1));
    return [median(half.map((c) => c[0])), median(half.map((c) => c[1])), median(half.map((c) => c[2]))];
  };
  return { ink: pick(ink, true), paper: pick(paper, false) };
}

/** How much of the rings is still the mat's ink where they were (lower = the camera has moved). */
export function ringsInPlace(img: Img, mat: MatModel, m: MatColours) {
  const c = [0, 0, 0];
  let dark = 0;
  let seen = 0;
  for (let k = 0; k < 240; k++) {
    const t = (k / 240) * 2 * Math.PI;
    for (const r of [MAT_R.innerRingMid, 1]) {
      sampleRgb(img, ...matProject(mat, r, t), c);
      if (c[0] < 0) continue;
      const di = dist3(c, m.ink);
      const dp = dist3(c, m.paper);
      // Only what looks like the mat counts (the product over a ring is neither).
      if (Math.min(di, dp) > 0.45 * dist3(m.ink, m.paper)) continue;
      seen++;
      if (di < dp) dark++;
    }
  }
  return seen ? dark / seen : 0;
}

/* ------------------------------------------------------------ the angle */

export const PROFILE_STEPS = 720;
const STEP_DEG = 360 / PROFILE_STEPS;

/**
 * The code ring read all round, at the mat's own angles (720 points, through the camera
 * model): 0 the mat's ink … 1 its paper, with each point's weight (0 where something that
 * isn't the mat covers it: the product).
 */
export function codeProfile(img: Img, mat: MatModel, m: MatColours) {
  const v = new Float32Array(PROFILE_STEPS);
  const wt = new Float32Array(PROFILE_STEPS);
  const c = [0, 0, 0];
  const radii = [0.8, MAT_R.code[0] / 2 + MAT_R.code[1] / 2, 0.9];
  const sep = dist3(m.ink, m.paper);
  for (let k = 0; k < PROFILE_STEPS; k++) {
    const t = (k * STEP_DEG * Math.PI) / 180;
    let sum = 0;
    let n = 0;
    for (const r of radii) {
      const [x, y] = matProject(mat, r, t);
      sampleRgb(img, x, y, c);
      if (c[0] < 0) continue;
      const di = dist3(c, m.ink);
      const dp = dist3(c, m.paper);
      if (Math.min(di, dp) < 0.45 * sep) {
        sum += di / (di + dp || 1);
        n++;
      }
    }
    v[k] = n ? sum / n : 0.5;
    wt[k] = n / radii.length;
  }
  return { v, w: wt };
}

/** White (1) or black (0) of the mat at each of the 720 steps of its own angle, twice round (no wrapping in the search). */
const MAT_WHITE = (() => {
  const a = new Float32Array(PROFILE_STEPS * 2 + 1);
  for (let j = 0; j < a.length; j++) a[j] = 1 - matBit((j + 0.5) * STEP_DEG);
  return a;
})();

/**
 * How far the mat has turned in a frame: the code read round the mat matched against its
 * printed code at every angle (weighted correlation). The printed code's angle at the
 * mat's angle t is mirror·t − theta (the print may run either way round). With `mirror` known (it is the same all video), only
 * that side is tried. For each shift only two sums are needed (the code being 0 or 1):
 * Σw·c and Σw·v·c.
 */
export function matAngle(v: Float32Array, wt: Float32Array, mirror?: 1 | -1) {
  const n = PROFILE_STEPS;
  let best = { theta: 0, mirror: 1 as 1 | -1, score: -2 };
  let W = 0;
  let mv = 0;
  let vv = 0;
  for (let k = 0; k < n; k++) {
    W += wt[k];
    mv += wt[k] * v[k];
  }
  if (W < 20) return { ...best, score: 0 };
  mv /= W;
  const wv = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    wv[k] = wt[k] * v[k];
    vv += wt[k] * (v[k] - mv) * (v[k] - mv);
  }
  if (vv <= 0) return { ...best, score: 0 };
  const scores = new Float32Array(n);
  for (const s of mirror ? [mirror] : ([1, -1] as const)) {
    for (let i = 0; i < n; i++) {
      let A = 0;
      let B = 0;
      // Template index: s·k − i, kept positive (n + k − i, or 2n − k − i).
      if (s === 1) {
        for (let k = 0, j = n - i; k < n; k++, j++) {
          const c = MAT_WHITE[j];
          A += wt[k] * c;
          B += wv[k] * c;
        }
      } else {
        for (let k = 0, j = 2 * n - i; k < n; k++, j--) {
          const c = MAT_WHITE[j];
          A += wt[k] * c;
          B += wv[k] * c;
        }
      }
      const mc = A / W;
      const num = B - mv * A;
      const cc = A - W * mc * mc;
      scores[i] = cc > 0 ? num / Math.sqrt(vv * cc) : 0;
    }
    let bi = 0;
    for (let i = 1; i < n; i++) if (scores[i] > scores[bi]) bi = i;
    if (scores[bi] > best.score) {
      // Between steps: the top of the parabola through the best three.
      const l = scores[(bi + n - 1) % n];
      const r = scores[(bi + 1) % n];
      const den = l - 2 * scores[bi] + r;
      const off = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (l - r)) / den)) : 0;
      best = { theta: ((((bi + off) * STEP_DEG) % 360) + 360) % 360, mirror: s, score: scores[bi] };
    }
  }
  return best;
}

/* --------------------------------------------------------------- masks */

export type MatView = { map: MatMap; theta: number; mirror: 1 | -1; colours: MatColours };

/**
 * The score of a pixel that looks like the product's shadow (darker, the same hue): not the
 * product for the cut-outs, but not surely background either. A grey product against a
 * pale wall looks just like it, so the 3D carving keeps these (SHADOW and up): a real
 * shadow stays put while the product turns, so every bit of floor is clear of it in most
 * frames and gets carved there anyway.
 */
export const SHADOW = 100;

/** Mat regions by radius (1 = outer ring's middle): 1 black ring, 2 white gap, 3 code, 0 not the mat. */
function matRegion(r: number) {
  if (r < MAT_R.innerRing[0] || r > MAT_R.outerRing[1]) return 0;
  if (r <= MAT_R.innerRing[1] || r >= MAT_R.outerRing[0]) return 1;
  if (r < MAT_R.code[0] || r > MAT_R.code[1]) return 2;
  return 3;
}

/**
 * How sure each pixel is the product (0–255). On the mat's rings and code: anything but
 * the mat's own black or white there (allowing for a little error in where the ring
 * edges and cells fall). Elsewhere: how far its colour is from the background, after
 * the frame's brightness is matched (`gain`), with the product's shadow left out
 * (darker, same colour). `noise` is how much the background itself flickers.
 */
export function foregroundScore(frame: Img, plate: Img, gain: number, noise: number, mat: MatView | null): Uint8Array {
  const { w, h } = frame;
  const out = new Uint8Array(w * h);
  const f = frame.data;
  const p = plate.data;
  const t0 = Math.max(0.045, 3 * noise);
  const tol = mat ? matTolerance(mat.colours) : 0;
  const tolR = 0.02;
  const tolDeg = 1.5;
  const S3 = Math.sqrt(3);
  const ink = mat?.colours.ink ?? [0, 0, 0];
  const paper = mat?.colours.paper ?? [0, 0, 0];
  const own = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const j = i * 4;
      const r = mat ? mat.map.r[i] : NaN;
      if (r >= MAT_R.innerRing[0] - tolR && r <= MAT_R.outerRing[1] + tolR) {
        // The mat's colours were measured in this frame as it is (before the gain).
        own[0] = f[j] / 255;
        own[1] = f[j + 1] / 255;
        own[2] = f[j + 2] / 255;
        let canInk = false;
        let canPaper = false;
        let deg = NaN;
        for (let s = -1; s <= 1; s++) {
          const reg = matRegion(r + s * tolR);
          if (reg === 1) canInk = true;
          else if (reg !== 3) canPaper = true;
          else {
            if (Number.isNaN(deg)) deg = (mat!.mirror * mat!.map.t[i] * 180) / Math.PI - mat!.theta;
            for (let d = -1; d <= 1; d++) {
              if (matBit(deg + d * tolDeg)) canInk = true;
              else canPaper = true;
            }
          }
        }
        // How far from the colours the mat may have here (not from both: a black product
        // over a white cell is far from the mat, though close to its ink).
        // (Blurred edges between cells are thin; the mask's opening takes them off.)
        const near = Math.min(canInk ? dist3(own, ink) : Infinity, canPaper ? dist3(own, paper) : Infinity);
        // The product's shadow on the mat is the mat too.
        const shaded = near >= tol && ((canInk && shadeOf(own, ink)) || (canPaper && shadeOf(own, paper)));
        out[i] = near < tol ? 0 : shaded ? SHADOW : Math.min(255, Math.round((near / (2 * tol)) * 255));
        continue;
      }
      const fr = Math.min(1, (f[j] / 255) * gain);
      const fg = Math.min(1, (f[j + 1] / 255) * gain);
      const fb = Math.min(1, (f[j + 2] / 255) * gain);
      const pr = p[j] / 255;
      const pg = p[j + 1] / 255;
      const pb = p[j + 2] / 255;
      const dr = fr - pr;
      const dg = fg - pg;
      const db = fb - pb;
      const d = Math.sqrt(dr * dr + dg * dg + db * db) / S3;
      if (d <= t0) continue;
      // The product's shadow: darker, but the same colour.
      const lf = 0.299 * fr + 0.587 * fg + 0.114 * fb;
      const lp = 0.299 * pr + 0.587 * pg + 0.114 * pb;
      const sf = fr + fg + fb || 1;
      const sp = pr + pg + pb || 1;
      const cr = fr / sf - pr / sp;
      const cg = fg / sf - pg / sp;
      const ratio = lp > 0.02 ? lf / lp : 1;
      if (ratio > 0.35 && ratio < 0.94 && cr * cr + cg * cg < 0.0009) {
        out[i] = SHADOW;
        continue;
      }
      // Half sure 0.025 past the noise, sure at 0.05.
      out[i] = Math.min(255, Math.round(((d - t0) / 0.05) * 255));
    }
  }
  return out;
}

/** A frame's scores eased with its neighbours' (¼, ½, ¼): flicker goes, holes one frame has don't stay. */
export function smoothScores(prev: Uint8Array | null, cur: Uint8Array, next: Uint8Array | null) {
  if (!prev && !next) return cur;
  const out = new Uint8Array(cur.length);
  const a = prev ?? cur;
  const b = next ?? cur;
  for (let i = 0; i < cur.length; i++) out[i] = (a[i] + 2 * cur[i] + b[i] + 2) >> 2;
  return out;
}

/** Grows (any set pixel within r) or shrinks (all within r set) a mask, a square at a time, in two passes with a running count. */
function filter(mask: Uint8Array, w: number, h: number, r: number, grow: boolean) {
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let count = 0;
    for (let k = 0; k < Math.min(r, w); k++) count += mask[o + k];
    for (let x = 0; x < w; x++) {
      if (x + r < w) count += mask[o + x + r];
      if (x - r - 1 >= 0) count -= mask[o + x - r - 1];
      const size = Math.min(w - 1, x + r) - Math.max(0, x - r) + 1;
      tmp[o + x] = grow ? (count > 0 ? 1 : 0) : count === size ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let k = 0; k < Math.min(r, h); k++) count += tmp[k * w + x];
    for (let y = 0; y < h; y++) {
      if (y + r < h) count += tmp[(y + r) * w + x];
      if (y - r - 1 >= 0) count -= tmp[(y - r - 1) * w + x];
      const size = Math.min(h - 1, y + r) - Math.max(0, y - r) + 1;
      out[y * w + x] = grow ? (count > 0 ? 1 : 0) : count === size ? 1 : 0;
    }
  }
  return out;
}
export const dilate = (m: Uint8Array, w: number, h: number, r: number) => filter(m, w, h, r, true);
export const erode = (m: Uint8Array, w: number, h: number, r: number) => filter(m, w, h, r, false);

/**
 * `touches`: which frame edges anything big that changed reaches (a hand, the product
 * leaving the frame), not only the product. `stray`: how much changed away from the
 * product (pixels): something moving in the background.
 */
export type Cleaned = { mask: Uint8Array; box: Box | null; area: number; touches: { left: boolean; right: boolean; top: boolean; bottom: boolean }; stray: number };

/**
 * A frame's product, cleaned: specks off (opening), small gaps closed, the biggest piece
 * and the pieces next to it kept, enclosed holes smaller than `holeShare` of it filled.
 */
export function cleanMask(score: Uint8Array, w: number, h: number, opts: { threshold?: number; close?: number; holeShare?: number } = {}): Cleaned {
  const thr = opts.threshold ?? 128;
  let m = new Uint8Array(score.length);
  for (let i = 0; i < score.length; i++) m[i] = score[i] >= thr ? 1 : 0;
  m = dilate(erode(m, w, h, 1), w, h, 1);
  const c = opts.close ?? Math.max(1, Math.round(w / 160));
  m = erode(dilate(m, w, h, c), w, h, c);
  const { groups } = components(m, w, h);
  const touches = { left: false, right: false, top: false, bottom: false };
  const empty = { mask: new Uint8Array(w * h), box: null, area: 0, touches, stray: 0 };
  const boxOf = (g: number[]): Box => {
    const b = { x0: w, y0: h, x1: 0, y1: 0 };
    for (const p of g) {
      const x = p % w;
      const y = (p - x) / w;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
    }
    return b;
  };
  for (const g of groups) {
    if (g.length < 0.002 * w * h) continue;
    const b = boxOf(g);
    if (b.x0 <= 1) touches.left = true;
    if (b.x1 >= w - 2) touches.right = true;
    if (b.y0 <= 1) touches.top = true;
    if (b.y1 >= h - 2) touches.bottom = true;
  }
  if (!groups.length) return empty;
  const big = groups.reduce((a, b) => (b.length > a.length ? b : a));
  if (big.length < 0.002 * w * h) return empty;
  const bb = boxOf(big);
  const padX = (bb.x1 - bb.x0) * 0.15;
  const padY = (bb.y1 - bb.y0) * 0.15;
  const out = new Uint8Array(w * h);
  let stray = 0;
  for (const g of groups) {
    if (g !== big) {
      const b = boxOf(g);
      const away = b.x1 < bb.x0 - padX || b.x0 > bb.x1 + padX || b.y1 < bb.y0 - padY || b.y0 > bb.y1 + padY;
      if (away && g.length >= 0.0005 * w * h) stray += g.length;
      if (away || g.length < 0.03 * big.length) continue;
    }
    for (const p of g) out[p] = 1;
  }
  // Holes: background the edges of the picture can't reach, filled when small.
  const outside = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const seed = (q: number) => {
    if (!out[q] && !outside[q]) {
      outside[q] = 1;
      stack[top++] = q;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (top) {
    const q = stack[--top];
    const x = q % w;
    if (x > 0) seed(q - 1);
    if (x < w - 1) seed(q + 1);
    if (q >= w) seed(q - w);
    if (q < w * (h - 1)) seed(q + w);
  }
  let area = 0;
  for (let i = 0; i < out.length; i++) area += out[i];
  const hole = new Uint8Array(w * h);
  for (let i = 0; i < hole.length; i++) hole[i] = !out[i] && !outside[i] ? 1 : 0;
  // Up to 5% of the product: a hole wrongly left would carve a tunnel through the 3D shape
  // later, while a real small gap filled only adds a little.
  const share = opts.holeShare ?? 0.05;
  for (const g of components(hole, w, h, false).groups) {
    if (g.length > share * area) continue;
    for (const q of g) out[q] = 1;
    area += g.length;
  }
  const box = { x0: w, y0: h, x1: 0, y1: 0 };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!out[y * w + x]) continue;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
    }
  return { mask: out, box, area, touches, stray };
}

/* ---------------------------------------------------- the frame's edges */

/** The frame's edges (top, left, right), where only background should ever be. */
export function borderBand(w: number, h: number, share = 0.06): Uint8Array {
  const band = new Uint8Array(w * h);
  const bx = Math.max(2, Math.round(w * share));
  const by = Math.max(2, Math.round(h * share));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (y < by || x < bx || x >= w - bx) band[y * w + x] = 1;
  return band;
}

/** How much brighter the background is than this frame (the camera's own exposure changes), from the edges. */
export function gainOf(frame: Img, plate: Img, band: Uint8Array) {
  const ratios: number[] = [];
  const lf = lumaOf(frame);
  const lp = lumaOf(plate);
  for (let i = 0; i < band.length; i += 3) if (band[i] && lf[i] > 0.04 && lp[i] > 0.04) ratios.push(lp[i] / lf[i]);
  const g = median(ratios);
  return Number.isFinite(g) ? g : 1;
}

/** The share of the edges that isn't the background any more (something came in, or the camera moved), and the background's own flicker there. */
export function edgeChange(frame: Img, plate: Img, band: Uint8Array, gain: number, noise: number) {
  const t = Math.max(0.06, 4 * noise);
  let n = 0;
  let changed = 0;
  const f = frame.data;
  const p = plate.data;
  for (let i = 0; i < band.length; i++) {
    if (!band[i]) continue;
    const j = i * 4;
    const d = Math.hypot(Math.min(255, f[j] * gain) - p[j], Math.min(255, f[j + 1] * gain) - p[j + 1], Math.min(255, f[j + 2] * gain) - p[j + 2]) / (255 * Math.sqrt(3));
    n++;
    if (d > t) changed++;
  }
  return n ? changed / n : 0;
}

/** How much the background flickers by itself: the typical difference between frames with nothing in them. */
export function noiseOf(plates: Img[]) {
  if (plates.length < 2) return 0.01;
  const diffs: number[] = [];
  const a = plates[0].data;
  const b = plates[plates.length - 1].data;
  for (let j = 0; j < a.length; j += 4 * 7) diffs.push(Math.hypot(a[j] - b[j], a[j + 1] - b[j + 1], a[j + 2] - b[j + 2]) / (255 * Math.sqrt(3)));
  diffs.sort((x, y) => x - y);
  return diffs[Math.floor(diffs.length * 0.68)] ?? 0.01;
}

/** Overlap of two masks (intersection over union). */
export function iou(a: Uint8Array, b: Uint8Array) {
  let i = 0;
  let u = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) i++;
    if (a[k] || b[k]) u++;
  }
  return u ? i / u : 0;
}
