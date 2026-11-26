/**
 * How a picture (or words drawn on a canvas) becomes a WebGL scene's particles (glScene.ts GL_PICTURE_MODES), read
 * from its pixels once, on a small copy of it:
 * - pixels: a dot on each drawn pixel, in its colour;
 * - edges: its outlines (Sobel's gradient, thinned to one pixel along it, the strongest fifth kept): a line drawing;
 * - stipple: dots as an engraver puts them, more where it is dark (on a light ground) and spread evenly by a few
 *   rounds of Lloyd's relaxation over a weighted Voronoi diagram;
 * - blobs: its blobs found at eight sizes (the difference of Gaussians, its local extremes across space and scale),
 *   each a big soft dot of its own size and colour, with a fine dust inside it;
 * - features: its corners (Harris's measure, the strongest kept apart), each a bright spark, over a faint outline;
 * - palette: its pixels in its own few main colours (k-means), as a poster.
 * Every point also gets the direction of the picture's line through it (for strokes that move along the lines).
 * The background (see-through, or a plain ground like a logo's white) is left out. Plain maths on pixels.
 */
import type { Rand } from "./glShapes";
import type { GlPictureMode } from "./glScene";

export type PictureDots = {
  /** Places in the scene's units (centred, fitted to maxW × maxH), colours (0…1), a size of their own in the scene's
   *  units (0: the layer's) and the direction of the picture's line there. */
  pos: Float32Array;
  col: Float32Array;
  rad: Float32Array;
  tan: Float32Array;
  /** Each dot's depth from the picture's depth picture (0 far … 1 near), when it has one. */
  dep?: Float32Array;
};

/** A three-pass box blur (about a Gaussian of σ ≈ r). */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  let a = Float32Array.from(src), b = new Float32Array(src.length);
  const R = Math.max(1, Math.round(r));
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -R; x <= R; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = s / (2 * R + 1);
        s += a[y * w + Math.min(w - 1, x + R + 1)] - a[y * w + Math.max(0, x - R)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -R; y <= R; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = s / (2 * R + 1);
        s += b[Math.min(h - 1, y + R + 1) * w + x] - b[Math.max(0, y - R) * w + x];
      }
    }
  }
  return a;
}

/** A picture's dots for `mode`, or null when it has nothing drawn (or can't be read). */
export function picturePoints(data: Uint8ClampedArray, w: number, h: number, n: number, rand: Rand, mode: GlPictureMode, maxW: number, maxH: number, depth?: Uint8ClampedArray): PictureDots | null {
  const N = w * h, at = (x: number, y: number) => (y * w + x) * 4;
  // What is drawn: not see-through, and not a plain ground (a logo on white).
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const solid = corners.every((c) => data[c + 3] > 250);
  const ground = solid ? [0, 1, 2].map((k) => corners.reduce((s, c) => s + data[c + k], 0) / 4) : null;
  const plain = ground ? corners.every((c) => Math.abs(data[c] - ground[0]) + Math.abs(data[c + 1] - ground[1]) + Math.abs(data[c + 2] - ground[2]) < 40) : false;
  const on = new Uint8Array(N), L = new Float32Array(N);
  let count = 0, light = 0, minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, k = i * 4, a = data[k + 3] / 255;
      L[i] = ((0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255) * a;
      if (data[k + 3] < 110) continue;
      if (plain && ground && Math.abs(data[k] - ground[0]) + Math.abs(data[k + 1] - ground[1]) + Math.abs(data[k + 2] - ground[2]) < 60) continue;
      on[i] = 1;
      count++;
      light += L[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (count < 2) return null;
  // Light marks on a dark ground stipple by their light; dark marks on a light ground by their dark.
  const darkOnLight = plain && ground ? (ground[0] + ground[1] + ground[2]) / 765 > 0.5 : light / count > 0.5;
  const V = new Float32Array(N);
  for (let i = 0; i < N; i++) V[i] = on[i] ? L[i] * 0.85 + 0.15 : 0;
  // The gradient (Sobel) of the drawn part: its outline counts as an edge too.
  const gx = new Float32Array(N), gy = new Float32Array(N), mag = new Float32Array(N);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = V[i - w - 1], b = V[i - w], c = V[i - w + 1], d = V[i - 1], f = V[i + 1], g = V[i + w - 1], hh = V[i + w], k = V[i + w + 1];
      gx[i] = c + 2 * f + k - a - 2 * d - g;
      gy[i] = g + 2 * hh + k - a - 2 * b - c;
      mag[i] = Math.hypot(gx[i], gy[i]);
    }
  }
  const px = (x: number, y: number) => [x, y] as const;
  const bw = maxX - minX + 1, bh = maxY - minY + 1, K = Math.min(maxW / bw, maxH / bh), cx = (minX + maxX + 1) / 2, cy = (minY + maxY + 1) / 2;
  const out: PictureDots = { pos: new Float32Array(n * 3), col: new Float32Array(n * 3), rad: new Float32Array(n), tan: new Float32Array(n * 2), ...(depth ? { dep: new Float32Array(n) } : {}) };
  /** Particle i at picture point (x, y), with its own size r (in picture pixels) and colour (the pixel's by default). */
  const put = (i: number, x: number, y: number, r = 0, rgb?: [number, number, number]) => {
    out.pos[i * 3] = (x - cx) * K;
    out.pos[i * 3 + 1] = -(y - cy) * K;
    const xi = Math.min(w - 1, Math.max(0, Math.floor(x))), yi = Math.min(h - 1, Math.max(0, Math.floor(y))), j = yi * w + xi, k = j * 4;
    out.col[i * 3] = rgb ? rgb[0] : data[k] / 255;
    out.col[i * 3 + 1] = rgb ? rgb[1] : data[k + 1] / 255;
    out.col[i * 3 + 2] = rgb ? rgb[2] : data[k + 2] / 255;
    out.rad[i] = r * K;
    if (out.dep && depth) out.dep[i] = depth[k] / 255;
    const m = mag[j] || 1;
    // Along the line (across the gradient), in the scene's up-is-up units.
    out.tan[i * 2] = mag[j] ? -gy[j] / m : 1;
    out.tan[i * 2 + 1] = mag[j] ? -gx[j] / m : 0;
  };
  /** n points from a list of pixels: every one once before any twice, then at random, each jittered in its pixel. */
  const spread = (list: number[], from: number, to: number) => {
    const m = list.length;
    if (!m) return;
    for (let i = from; i < to; i++) {
      const k = i - from, p = list[k < m ? Math.floor((k / Math.min(to - from, m)) * m) : Math.floor(rand() * m)];
      const [x, y] = px(p % w, Math.floor(p / w));
      put(i, x + rand(), y + rand());
    }
  };
  const drawn: number[] = [];
  for (let i = 0; i < N; i++) if (on[i]) drawn.push(i);

  /** The outline: the gradient's local peaks across the line, the strongest fifth. */
  const edges = () => {
    const peaks: number[] = [], strength: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x, m = mag[i];
        if (m < 0.04) continue;
        const ang = Math.atan2(gy[i], gx[i]), q = Math.round(((ang < 0 ? ang + Math.PI : ang) / Math.PI) * 4) % 4;
        const [dx, dy] = q === 0 ? [1, 0] : q === 1 ? [1, 1] : q === 2 ? [0, 1] : [-1, 1];
        if (m >= mag[i + dy * w + dx] && m >= mag[i - dy * w - dx]) { peaks.push(i); strength.push(m); }
      }
    }
    if (!peaks.length) return drawn;
    const sorted = [...strength].sort((a, b) => a - b), cut = sorted[Math.floor(sorted.length * 0.55)];
    return peaks.filter((_, k) => strength[k] >= cut);
  };

  switch (mode) {
    case "edges": {
      spread(edges(), 0, n);
      break;
    }
    case "stipple": {
      // Weighted by tone, a little everywhere drawn; first placed by that weight, then relaxed (Lloyd).
      const W = new Float32Array(N);
      let wmax = 0;
      for (let i = 0; i < N; i++) if (on[i]) { W[i] = Math.pow(darkOnLight ? 1 - L[i] : L[i], 1.6) + 0.02; wmax = Math.max(wmax, W[i]); }
      const P = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        for (let tries = 0; tries < 60; tries++) {
          const p = drawn[Math.floor(rand() * drawn.length)];
          if (rand() * wmax <= W[p] || tries === 59) { P[i * 2] = (p % w) + rand(); P[i * 2 + 1] = Math.floor(p / w) + rand(); break; }
        }
      }
      if (n <= 12000) {
        const cell = Math.max(2, Math.sqrt((drawn.length / n) * 2)), gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
        const step = drawn.length > 60000 ? 2 : 1;
        for (let round = 0; round < 8; round++) {
          const grid: number[][] = Array.from({ length: gw * gh }, () => []);
          for (let i = 0; i < n; i++) grid[Math.min(gh - 1, Math.floor(P[i * 2 + 1] / cell)) * gw + Math.min(gw - 1, Math.floor(P[i * 2] / cell))].push(i);
          const sx = new Float32Array(n), sy = new Float32Array(n), sw = new Float32Array(n);
          for (let k = 0; k < drawn.length; k += step) {
            const p = drawn[k], x = (p % w) + 0.5, y = Math.floor(p / w) + 0.5, wt = W[p];
            const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
            let best = -1, bd = Infinity;
            for (let ring = 1; ring <= 3 && best < 0; ring++) {
              for (let a = cj - ring; a <= cj + ring; a++) {
                if (a < 0 || a >= gh) continue;
                for (let b = ci - ring; b <= ci + ring; b++) {
                  if (b < 0 || b >= gw) continue;
                  for (const q of grid[a * gw + b]) { const d = (P[q * 2] - x) ** 2 + (P[q * 2 + 1] - y) ** 2; if (d < bd) { bd = d; best = q; } }
                }
              }
            }
            if (best >= 0) { sx[best] += x * wt; sy[best] += y * wt; sw[best] += wt; }
          }
          for (let i = 0; i < n; i++) if (sw[i] > 0) { P[i * 2] = sx[i] / sw[i]; P[i * 2 + 1] = sy[i] / sw[i]; }
        }
      }
      for (let i = 0; i < n; i++) put(i, P[i * 2], P[i * 2 + 1]);
      break;
    }
    case "blobs": {
      // The difference of Gaussians over eight sizes (each 1.6 times the last); its extremes in space and size are the
      // blobs (a disc of radius r answers most at σ ≈ r/√2).
      const base = Math.max(1, Math.min(w, h) / 160), sig = Array.from({ length: 8 }, (_, k) => 1.2 * Math.pow(1.6, k) * base);
      const G = sig.map((s) => blur(V, w, h, s));
      const D = G.slice(0, -1).map((g, k) => g.map((v, i) => v - G[k + 1][i]));
      const found: Array<{ x: number; y: number; r: number; s: number }> = [];
      for (let k = 1; k < D.length - 1; k++) {
        const r = Math.max(1, Math.round(sig[k]));
        for (let y = r; y < h - r; y += 1) {
          for (let x = r; x < w - r; x += 1) {
            const i = y * w + x, v = D[k][i];
            if (Math.abs(v) < 0.025 || !on[i]) continue;
            let extreme = true;
            for (let dk = -1; dk <= 1 && extreme; dk++) for (let dy = -1; dy <= 1 && extreme; dy++) for (let dx = -1; dx <= 1 && extreme; dx++) {
              if (!dk && !dx && !dy) continue;
              const o = D[k + dk][i + dy * w + dx];
              if (v > 0 ? o >= v : o <= v) extreme = false;
            }
            if (extreme) found.push({ x, y, r: sig[k] * Math.SQRT2, s: Math.abs(v) });
          }
        }
      }
      found.sort((a, b) => b.s - a.s);
      const blobs = found.slice(0, Math.min(Math.floor(n * 0.25), 700));
      if (!blobs.length) { spread(drawn, 0, n); break; }
      const colourOf = (b: { x: number; y: number; r: number }): [number, number, number] => {
        let r = 0, g = 0, bl = 0, c = 0;
        for (let y = Math.max(0, Math.floor(b.y - b.r)); y <= Math.min(h - 1, Math.ceil(b.y + b.r)); y++) for (let x = Math.max(0, Math.floor(b.x - b.r)); x <= Math.min(w - 1, Math.ceil(b.x + b.r)); x++) {
          const i = y * w + x;
          if (!on[i] || (x - b.x) ** 2 + (y - b.y) ** 2 > b.r * b.r) continue;
          r += data[i * 4]; g += data[i * 4 + 1]; bl += data[i * 4 + 2]; c++;
        }
        return c ? [r / c / 255, g / c / 255, bl / c / 255] : [1, 1, 1];
      };
      const colours = blobs.map(colourOf);
      blobs.forEach((b, i) => put(i, b.x, b.y, b.r, colours[i]));
      // The rest: a fine dust inside the blobs, more in the big ones.
      const total = blobs.reduce((s, b) => s + b.r * b.r, 0);
      for (let i = blobs.length; i < n; i++) {
        let pick = rand() * total, k = 0;
        while (k < blobs.length - 1 && (pick -= blobs[k].r * blobs[k].r) > 0) k++;
        const b = blobs[k], a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * b.r * 0.9;
        put(i, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 0, colours[k]);
      }
      break;
    }
    case "features": {
      // Harris's corners (the structure tensor's det − 0.05·trace², kept apart), then a faint outline.
      const A = new Float32Array(N), B = new Float32Array(N), C = new Float32Array(N);
      for (let i = 0; i < N; i++) { A[i] = gx[i] * gx[i]; B[i] = gy[i] * gy[i]; C[i] = gx[i] * gy[i]; }
      const a = blur(A, w, h, 1.5), b = blur(B, w, h, 1.5), c = blur(C, w, h, 1.5);
      const R = new Float32Array(N);
      let rmax = 0;
      for (let i = 0; i < N; i++) { R[i] = a[i] * b[i] - c[i] * c[i] - 0.05 * (a[i] + b[i]) ** 2; if (R[i] > rmax) rmax = R[i]; }
      const corners: Array<{ i: number; r: number }> = [];
      const gap = Math.max(3, Math.round(Math.min(w, h) / 60));
      for (let y = gap; y < h - gap; y++) {
        for (let x = gap; x < w - gap; x++) {
          const i = y * w + x, r = R[i];
          if (r < rmax * 0.02) continue;
          let top = true;
          for (let dy = -gap; dy <= gap && top; dy++) for (let dx = -gap; dx <= gap && top; dx++) if ((dx || dy) && R[i + dy * w + dx] > r) top = false;
          if (top) corners.push({ i, r });
        }
      }
      corners.sort((p, q) => q.r - p.r);
      const keep = corners.slice(0, Math.min(Math.floor(n * 0.3), 450));
      keep.forEach((k, i) => put(i, (k.i % w) + 0.5, Math.floor(k.i / w) + 0.5, 1.6 * base1(w, h)));
      spread(edges(), keep.length, n);
      break;
    }
    case "palette": {
      // Its few main colours (k-means in RGB on a sample), each pixel's dot in the nearest.
      const sample: number[] = [];
      for (let k = 0; k < Math.min(3000, drawn.length); k++) sample.push(drawn[Math.floor(rand() * drawn.length)]);
      const K6 = Math.min(6, sample.length);
      const cs = Array.from({ length: K6 }, (_, k) => { const p = sample[Math.floor((k / K6) * sample.length)] * 4; return [data[p], data[p + 1], data[p + 2]]; });
      for (let round = 0; round < 10; round++) {
        const acc = cs.map(() => [0, 0, 0, 0]);
        for (const p of sample) {
          const q = p * 4;
          let best = 0, bd = Infinity;
          cs.forEach((c, k) => { const d = (c[0] - data[q]) ** 2 + (c[1] - data[q + 1]) ** 2 + (c[2] - data[q + 2]) ** 2; if (d < bd) { bd = d; best = k; } });
          acc[best][0] += data[q]; acc[best][1] += data[q + 1]; acc[best][2] += data[q + 2]; acc[best][3]++;
        }
        acc.forEach((s, k) => { if (s[3]) cs[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
      }
      spread(drawn, 0, n);
      for (let i = 0; i < n; i++) {
        const r = out.col[i * 3] * 255, g = out.col[i * 3 + 1] * 255, b = out.col[i * 3 + 2] * 255;
        let best = cs[0], bd = Infinity;
        for (const c of cs) { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = c; } }
        out.col[i * 3] = best[0] / 255; out.col[i * 3 + 1] = best[1] / 255; out.col[i * 3 + 2] = best[2] / 255;
      }
      break;
    }
    default:
      spread(drawn, 0, n);
  }
  return out;
}
/** A spark's size on a picture of this size (in its pixels). */
const base1 = (w: number, h: number) => Math.max(2, Math.min(w, h) / 50);
