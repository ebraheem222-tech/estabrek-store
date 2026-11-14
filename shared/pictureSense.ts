/**
 * What a picture's pixels say. They are read small (about 160 px across), once, in the editor's frame, never on a
 * shopper's phone:
 *  - its main colours: the pixels gathered into groups that look alike (k-means in OKLab, where equal distances
 *    look equally different), the biggest group first, each with its share of the picture;
 *  - the roles a page needs from them: a ground (the lightest calm one), ink that reads on it (the darkest), and
 *    an accent (the most vivid);
 *  - where its subject is: what differs from the picture's border (the background is what the border is made
 *    of) and where the detail is (edges), as a point in % for object-position, so a crop keeps the subject.
 *
 * Plain TypeScript: no React, no "@/" imports (the admin and the shop both import it).
 */
import { contrast, hexToLch, lchToHex, readableColour, readableOn } from "./colour";

export type PictureColour = { hex: string; share: number };
export type PictureRoles = { ground: string; ink: string; accent: string };
export type PicturePoint = { x: number; y: number };
export const PICTURE_COLOURS_MAX = 8;
/** The side the pixels are read at (the longer one): enough to tell colours and a subject, quick to work through. */
export const PICTURE_SENSE_SIDE = 160;

type Lab = [number, number, number];
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** OKLab of a pixel's red, green and blue (0–255). */
export function labOf(r8: number, g8: number, b8: number): Lab {
  const r = toLinear(r8 / 255), g = toLinear(g8 / 255), b = toLinear(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const hexOfLab = ([L, a, b]: Lab) => {
  const C = Math.hypot(a, b);
  return lchToHex({ L: Math.max(0, Math.min(1, L)), C, h: C < 1e-4 ? 0 : (((Math.atan2(b, a) * 180) / Math.PI) % 360 + 360) % 360 });
};
const dist2 = (p: Lab, q: Lab) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

/** Two groups nearer than this in OKLab are one colour to the eye at a glance. */
const SAME = 0.07;
/** A group smaller than this share of the picture is noise, not one of its colours. */
const TOO_SMALL = 0.012;

/**
 * The picture's main colours (RGBA pixels, `w`×`h`), the biggest first, `count` at most. See-through pixels
 * are left out (a cut-out product gives the product's colours, not its empty surround).
 */
export function dominantColours(px: Uint8ClampedArray, w: number, h: number, count = 6): PictureColour[] {
  const want = Math.max(1, Math.min(PICTURE_COLOURS_MAX, Math.round(count)));
  if (w < 1 || h < 1 || px.length < w * h * 4) return [];
  // Pixels that look nearly alike are counted together first (32 steps a channel): a few hundred heaps to group.
  const heaps = new Map<number, { n: number; sum: Lab }>();
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] < 128) continue;
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const lab = labOf(r, g, b);
    const heap = heaps.get(key);
    if (heap) { heap.n++; heap.sum[0] += lab[0]; heap.sum[1] += lab[1]; heap.sum[2] += lab[2]; }
    else heaps.set(key, { n: 1, sum: lab });
    total++;
  }
  if (!total) return [];
  const points = [...heaps.values()].map((x) => ({ n: x.n, at: [x.sum[0] / x.n, x.sum[1] / x.n, x.sum[2] / x.n] as Lab })).sort((p, q) => q.n - p.n);
  // The first centres: the biggest heap, then each time the heap that is big and far from every centre so far.
  const k = Math.min(points.length, want + 3);
  const centres: Lab[] = [points[0].at];
  while (centres.length < k) {
    let best = -1, bestScore = 0;
    for (let i = 0; i < points.length; i++) {
      const d = Math.min(...centres.map((c) => dist2(points[i].at, c)));
      const score = d * Math.sqrt(points[i].n);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    centres.push(points[best].at);
  }
  // k-means: each heap to its nearest centre, each centre to the middle of its heaps, a few times over.
  let groups: Array<{ n: number; at: Lab }> = [];
  for (let round = 0; round < 12; round++) {
    const sums = centres.map(() => ({ n: 0, sum: [0, 0, 0] as Lab }));
    for (const p of points) {
      let near = 0, nearD = Infinity;
      for (let c = 0; c < centres.length; c++) { const d = dist2(p.at, centres[c]); if (d < nearD) { nearD = d; near = c; } }
      const s = sums[near];
      s.n += p.n; s.sum[0] += p.at[0] * p.n; s.sum[1] += p.at[1] * p.n; s.sum[2] += p.at[2] * p.n;
    }
    groups = sums.filter((s) => s.n > 0).map((s) => ({ n: s.n, at: [s.sum[0] / s.n, s.sum[1] / s.n, s.sum[2] / s.n] as Lab }));
    for (let c = 0; c < centres.length; c++) if (sums[c].n) centres[c] = [sums[c].sum[0] / sums[c].n, sums[c].sum[1] / sums[c].n, sums[c].sum[2] / sums[c].n];
  }
  // Groups that look the same are one colour: the smaller joins the bigger.
  groups.sort((p, q) => q.n - p.n);
  const merged: Array<{ n: number; at: Lab }> = [];
  for (const g of groups) {
    const into = merged.find((m) => Math.sqrt(dist2(m.at, g.at)) < SAME);
    if (!into) { merged.push({ n: g.n, at: [...g.at] as Lab }); continue; }
    const n = into.n + g.n;
    into.at = [(into.at[0] * into.n + g.at[0] * g.n) / n, (into.at[1] * into.n + g.at[1] * g.n) / n, (into.at[2] * into.n + g.at[2] * g.n) / n];
    into.n = n;
  }
  merged.sort((p, q) => q.n - p.n);
  const kept = merged.filter((m, i) => i === 0 || m.n / total >= TOO_SMALL).slice(0, want);
  return kept.map((m) => ({ hex: hexOfLab(m.at), share: Math.round((m.n / total) * 1000) / 1000 }));
}

/**
 * What a page can make of a picture's colours: a ground (the lightest calm one that isn't a speck), ink (the
 * darkest, darkened further if it wouldn't read on the ground) and an accent (the most vivid). Null with no
 * colours.
 */
export function paletteRoles(colours: PictureColour[]): PictureRoles | null {
  const seen = colours.map((c) => ({ ...c, lch: hexToLch(c.hex) })).filter((c): c is PictureColour & { lch: NonNullable<ReturnType<typeof hexToLch>> } => c.lch !== null);
  if (!seen.length) return null;
  const sizeable = seen.filter((c) => c.share >= 0.04);
  const pool = sizeable.length ? sizeable : seen;
  const ground = [...pool].sort((p, q) => (q.lch.L - 0.6 * q.lch.C) - (p.lch.L - 0.6 * p.lch.C))[0];
  const darkest = [...seen].sort((p, q) => p.lch.L - q.lch.L)[0];
  const vivid = [...seen].filter((c) => c !== ground).sort((p, q) => q.lch.C - p.lch.C)[0] ?? ground;
  const reads = (contrast(darkest.hex, ground.hex) ?? 0) >= 4.5;
  const ink = reads ? darkest.hex : readableColour(darkest.hex, ground.hex, 4.5) ?? readableOn(ground.hex);
  return { ground: ground.hex, ink, accent: vivid.hex };
}

export type PictureBackdrop = { bg: string; ink: string; mesh: string[] };
/**
 * A soft backdrop for a part of the page made of a picture's colours (the shop's `mesh` style: two to four
 * colours, each fading from its own corner over the part's ground). A light picture keeps its light ground with
 * its other colours over it; a picture that is mostly a deep colour gets that colour as the ground, the others
 * glowing over it, and words that read on it. Null when the picture has fewer than two colours besides its ground.
 */
export function backdropOf(colours: PictureColour[], roles: PictureRoles | null): PictureBackdrop | null {
  if (!roles) return null;
  const rest = colours.filter((c) => c.hex !== roles.ground);
  if (rest.length < 2) return null;
  const lead = rest[0], groundShare = colours.find((c) => c.hex === roles.ground)?.share ?? 0;
  const deep = lead.share > groundShare && (hexToLch(lead.hex)?.L ?? 1) < 0.62;
  if (!deep) return { bg: roles.ground, ink: roles.ink, mesh: rest.slice(0, 4).map((c) => c.hex) };
  return { bg: lead.hex, ink: readableOn(lead.hex), mesh: [...rest.slice(1).map((c) => c.hex), roles.ground].slice(0, 4) };
}

/**
 * Where the picture's subject is, in % of its width and height (for object-position), or null when nothing
 * stands out (a pattern, a flat colour, a scene that fills the frame).
 *
 * Each pixel is scored by how far its colour is from the border's colours (the surround is what the border is
 * made of) and by how much detail it has (Sobel on its lightness); what scores well above the picture's
 * average pulls the point towards itself. A cut-out's see-through surround scores nothing.
 */
export function subjectPoint(px: Uint8ClampedArray, w: number, h: number): PicturePoint | null {
  if (w < 8 || h < 8 || px.length < w * h * 4) return null;
  const n = w * h;
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n), seen = new Uint8Array(n);
  let opaque = 0;
  for (let i = 0; i < n; i++) {
    if (px[i * 4 + 3] < 128) continue;
    const lab = labOf(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    L[i] = lab[0]; A[i] = lab[1]; B[i] = lab[2]; seen[i] = 1; opaque++;
  }
  if (opaque < n * 0.02) return null;
  // The border's colour: the middle of a ring round the picture, a twelfth of its shorter side thick.
  const ring = Math.max(1, Math.round(Math.min(w, h) / 12));
  let bl = 0, ba = 0, bb = 0, bn = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
    const i = y * w + x;
    if (!seen[i]) continue;
    bl += L[i]; ba += A[i]; bb += B[i]; bn++;
  }
  const cutOut = opaque < n * 0.97 && bn < (n - (w - 2 * ring) * (h - 2 * ring)) * 0.5;
  const border: Lab = bn ? [bl / bn, ba / bn, bb / bn] : [1, 0, 0];
  const score = new Float32Array(n);
  let sum = 0, sumSq = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!seen[i]) continue;
    // A cut-out: whatever is not see-through is the subject.
    const away = cutOut ? 0.25 : Math.sqrt((L[i] - border[0]) ** 2 + (A[i] - border[1]) ** 2 + (B[i] - border[2]) ** 2);
    let edge = 0;
    if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
      const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1];
      const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
      edge = Math.hypot(gx, gy) / 4;
    }
    const s = away + 0.5 * edge;
    score[i] = s; sum += s; sumSq += s * s;
  }
  const mean = sum / n, spread = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  if (spread < 0.012) return null;
  // What stands out: above the average by half its spread.
  const floor = mean + 0.5 * spread;
  let mass = 0, mx = 0, my = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const over = score[y * w + x] - floor;
    if (over <= 0) continue;
    mass += over; mx += over * (x + 0.5); my += over * (y + 0.5);
  }
  if (!mass) return null;
  const cx = mx / mass, cy = my / mass;
  // Spread all over the picture, it is no one subject: the picture stays centred.
  let far = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const over = score[y * w + x] - floor;
    if (over > 0) far += over * Math.hypot((x + 0.5 - cx) / w, (y + 0.5 - cy) / h);
  }
  if (far / mass > 0.3) return null;
  const pct = (v: number, side: number) => Math.max(0, Math.min(100, Math.round((v / side) * 100)));
  return { x: pct(cx, w), y: pct(cy, h) };
}
