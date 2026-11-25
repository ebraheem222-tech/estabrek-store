/**
 * Where a WebGL scene's particles sit for each form (glScene.ts GL_FORMS): `n` points of a sphere, a helix, a
 * galaxy… in a unit space (about −1 … 1, y up), and the points of the owner's words or picture, read from a 2D
 * canvas. Seeded, so a scene's still frame is the same every time. Plain maths (the admin draws thumbnails with it).
 */
import { isLand } from "./chartMaths";
import type { GlForm } from "./glScene";

export type Rand = () => number;
/** A small seeded random (mulberry32). */
export function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A normal random number (Box–Muller). */
export const gauss = (rand: Rand) => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

/** n points of a form (not words or a picture), in the unit space. */
export function formPoints(form: Exclude<GlForm, "text" | "image">, n: number, rand: Rand): Float32Array {
  const out = new Float32Array(n * 3);
  // The chaos game's running point (the Sierpiński pyramid, the fern), started well inside.
  const cg = [0, 0, 0];
  for (let k = 0; k < 30; k++) chaosStep(form, cg, rand);
  const put = (i: number, x: number, y: number, z: number) => {
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  };
  for (let i = 0; i < n; i++) {
    const u = rand(), v = rand();
    switch (form) {
      case "sphere": {
        // Evenly over the surface (a Fibonacci sphere).
        const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * GOLDEN;
        put(i, Math.cos(a) * r * 0.9, y * 0.9, Math.sin(a) * r * 0.9);
        break;
      }
      case "ball": {
        const r = Math.cbrt(rand()) * 0.9, th = Math.acos(2 * u - 1), ph = TAU * v;
        put(i, r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph));
        break;
      }
      case "cube": {
        const face = Math.floor(rand() * 6), a = (u * 2 - 1) * 0.62, b = (v * 2 - 1) * 0.62, s = face % 2 ? 0.62 : -0.62;
        if (face < 2) put(i, s, a, b);
        else if (face < 4) put(i, a, s, b);
        else put(i, a, b, s);
        break;
      }
      case "torus": {
        const R = 0.68, r = 0.26, a = TAU * u, b = TAU * v;
        put(i, (R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a));
        break;
      }
      case "knot": {
        // A (2, 3) torus knot, with a thin tube round it.
        const t = TAU * u, p = 2, q = 3, k = 0.55;
        const cx = (Math.cos(q * t) + 2) * Math.cos(p * t) * 0.3 * k * 1.7, cy = -Math.sin(q * t) * 0.3 * k * 1.7, cz = (Math.cos(q * t) + 2) * Math.sin(p * t) * 0.3 * k * 1.7;
        const r = 0.07 * Math.sqrt(rand()), a = TAU * v;
        put(i, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz + Math.cos(a + 1.7) * r);
        break;
      }
      case "helix": {
        // A double helix (DNA), and some rungs between its strands.
        const t = u, a = t * TAU * 2.2, y = (t - 0.5) * 2, r = 0.42;
        if (rand() < 0.18) {
          const k = rand();
          put(i, Math.cos(a) * r * (1 - 2 * k), y, Math.sin(a) * r * (1 - 2 * k));
        } else {
          const side = rand() < 0.5 ? 0 : Math.PI, j = 0.03;
          put(i, Math.cos(a + side) * r + gauss(rand) * j, y + gauss(rand) * j, Math.sin(a + side) * r + gauss(rand) * j);
        }
        break;
      }
      case "galaxy": {
        // Spiral arms round a bright core, flat with a little thickness.
        const arms = 3, arm = Math.floor(rand() * arms), r = Math.pow(u, 0.7) * 1.05;
        const a = (arm / arms) * TAU + r * 3.4 + gauss(rand) * 0.28 * (1.1 - r);
        const core = rand() < 0.16;
        const rr = core ? Math.abs(gauss(rand)) * 0.12 : r;
        put(i, Math.cos(a) * rr, gauss(rand) * 0.04 * (1.2 - rr), Math.sin(a) * rr);
        break;
      }
      case "rings": {
        // A planet and its rings.
        if (rand() < 0.36) {
          const y = 1 - 2 * v, r = Math.sqrt(1 - y * y), a = TAU * u;
          put(i, Math.cos(a) * r * 0.34, y * 0.34, Math.sin(a) * r * 0.34);
        } else {
          const band = rand(), r = band < 0.45 ? 0.5 + rand() * 0.2 : band < 0.85 ? 0.74 + rand() * 0.18 : 0.96 + rand() * 0.07, a = TAU * u;
          put(i, Math.cos(a) * r, gauss(rand) * 0.008, Math.sin(a) * r);
        }
        break;
      }
      case "wave":
      case "grid": {
        // A sheet of evenly spaced points (lying flat for the wave, standing for the grid).
        const side = Math.ceil(Math.sqrt(n)), gx = (i % side) / Math.max(1, side - 1) - 0.5, gz = Math.floor(i / side) / Math.max(1, side - 1) - 0.5;
        if (form === "wave") put(i, gx * 2.4, 0, gz * 2.4);
        else put(i, gx * 1.9, gz * 1.9, 0);
        break;
      }
      case "cylinder": {
        const a = TAU * u;
        put(i, Math.cos(a) * 0.5, (v * 2 - 1) * 0.85, Math.sin(a) * 0.5);
        break;
      }
      case "cone": {
        // A tornado: narrow at the foot, wide at the top.
        const y = v * 2 - 1, r = 0.08 + ((y + 1) / 2) * 0.72 + gauss(rand) * 0.02, a = TAU * u;
        put(i, Math.cos(a) * r, y * 0.9, Math.sin(a) * r);
        break;
      }
      case "heart": {
        const t = TAU * u, s = Math.sqrt(v);
        const hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        put(i, (hx / 17) * s * 0.92, (hy / 17) * s * 0.92 + 0.08, gauss(rand) * 0.14 * (1 - s * 0.7));
        break;
      }
      case "star": {
        // A five-pointed star, filled, with a little thickness.
        const k = Math.floor(rand() * 10), a0 = (k / 10) * TAU - Math.PI / 2, a1 = ((k + 1) / 10) * TAU - Math.PI / 2;
        const r0 = k % 2 ? 0.4 : 0.95, r1 = k % 2 ? 0.95 : 0.4;
        let p = u, q = v;
        if (p + q > 1) { p = 1 - p; q = 1 - q; }
        const x = p * Math.cos(a0) * r0 + q * Math.cos(a1) * r1, y = p * Math.sin(a0) * r0 + q * Math.sin(a1) * r1;
        put(i, x, -y, gauss(rand) * 0.06);
        break;
      }
      case "cloud": {
        put(i, gauss(rand) * 0.45, gauss(rand) * 0.3, gauss(rand) * 0.3);
        break;
      }
      case "globe": {
        // Only the land, as dots on a sphere (the chart's rough world, chartMaths.ts).
        let lon = 0, lat = 0;
        for (let tries = 0; tries < 40; tries++) {
          lon = u * 360 - 180 + (tries ? rand() * 360 - 180 : 0);
          lat = (Math.asin(rand() * 2 - 1) * 180) / Math.PI;
          if (lat > -58 && lat < 84 && isLand(((lon + 540) % 360) - 180, lat)) break;
        }
        const ph = (lon * Math.PI) / 180, th = (lat * Math.PI) / 180;
        put(i, Math.cos(th) * Math.sin(ph) * 0.88, Math.sin(th) * 0.88, Math.cos(th) * Math.cos(ph) * 0.88);
        break;
      }
      case "spiral": {
        // A sunflower's seeds.
        const r = Math.sqrt((i + 0.5) / n) * 0.95, a = i * GOLDEN;
        put(i, Math.cos(a) * r, Math.sin(a) * r, 0);
        break;
      }
      case "lissajous": {
        // A Lissajous knot: three sines of 2, 3 and 5 turns, with a thin tube round it.
        const t = TAU * u, j = 0.025;
        put(i, Math.sin(2 * t + 0.5) * 0.85 + gauss(rand) * j, Math.sin(3 * t) * 0.85 + gauss(rand) * j, Math.sin(5 * t + 1) * 0.85 + gauss(rand) * j);
        break;
      }
      case "mobius": {
        // A Möbius strip: one side, one edge.
        const a = TAU * u, w = (v * 2 - 1) * 0.36, R = 0.68 + w * Math.cos(a / 2);
        put(i, R * Math.cos(a), w * Math.sin(a / 2), R * Math.sin(a));
        break;
      }
      case "klein": {
        // A Klein bottle (the figure-eight one): no inside, no outside.
        const a = TAU * u, b = TAU * v, r = 2, k = r + Math.cos(a / 2) * Math.sin(b) - Math.sin(a / 2) * Math.sin(2 * b);
        put(i, k * Math.cos(a) * 0.26, (Math.sin(a / 2) * Math.sin(b) + Math.cos(a / 2) * Math.sin(2 * b)) * 0.26, k * Math.sin(a) * 0.26);
        break;
      }
      case "supershape": {
        // Gielis's superformula in two directions (fitted to the box after).
        const th = TAU * u - Math.PI, ph = Math.asin(v * 2 - 1);
        const r1 = superformula(th, 7, 0.2, 1.7, 1.7), r2 = superformula(ph, 7, 0.2, 1.7, 1.7);
        put(i, r1 * Math.cos(th) * r2 * Math.cos(ph), r2 * Math.sin(ph), r1 * Math.sin(th) * r2 * Math.cos(ph));
        break;
      }
      case "gyroid": {
        // A gyroid (sin x cos y + sin y cos z + sin z cos x = 0) inside a ball: a surface that is everywhere a saddle.
        let x = 0, y = 0, z = 0;
        for (let tries = 0; tries < 400; tries++) {
          x = (rand() * 2 - 1) * Math.PI; y = (rand() * 2 - 1) * Math.PI; z = (rand() * 2 - 1) * Math.PI;
          if (x * x + y * y + z * z < Math.PI * Math.PI && Math.abs(Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x)) < 0.09) break;
        }
        put(i, (x / Math.PI) * 0.9, (y / Math.PI) * 0.9, (z / Math.PI) * 0.9);
        break;
      }
      case "hopf": {
        // The Hopf fibration: each point of a sphere is a circle in four dimensions, seen here from the fourth.
        // Fibres in order (particle i on fibre i·F/n), so each can take its own colour; three rings of twelve.
        const fibres = 3 * 12, f = Math.min(fibres - 1, Math.floor((i * fibres) / n)), ring = Math.floor(f / 12), lat = (0.4 + ring * 0.17) * Math.PI, lon = ((f % 12) / 12) * TAU + ring * 0.26;
        const a = Math.sin(lat) * Math.cos(lon), b = Math.sin(lat) * Math.sin(lon), c = Math.cos(lat);
        let x = 0, y = 0, z = 0;
        for (let tries = 0; tries < 20; tries++) {
          const t = TAU * rand(), k = 1 / Math.sqrt(2 * (1 + c));
          const q0 = (1 + c) * Math.cos(t) * k, q1 = (a * Math.sin(t) - b * Math.cos(t)) * k, q2 = (a * Math.cos(t) + b * Math.sin(t)) * k, q3 = (1 + c) * Math.sin(t) * k;
          const s = 1 / Math.max(0.05, 1 - q3);
          x = q0 * s; y = q2 * s; z = q1 * s;
          if (x * x + y * y + z * z < 9) break;
        }
        put(i, x * 0.34, y * 0.34, z * 0.34);
        break;
      }
      case "sierpinski":
      case "fern":
        chaosStep(form, cg, rand);
        if (form === "fern") put(i, (cg[0] - 0.24) / 5.6, (cg[1] - 5) / 5.6, gauss(rand) * 0.02);
        else put(i, cg[0], cg[1], cg[2]);
        break;
      case "rose": {
        // A rose of five petals (r = cos 5θ), filled.
        const th = TAU * u, r = Math.cos(5 * th) * Math.sqrt(v) * 0.95;
        put(i, Math.cos(th) * r, Math.sin(th) * r, gauss(rand) * 0.03);
        break;
      }
      case "blob": {
        // A sphere swollen by spherical harmonics.
        const y = 1 - (2 * (i + 0.5)) / n, s = Math.sqrt(1 - y * y), a = i * GOLDEN, th = Math.acos(y);
        const r = 0.6 + 0.2 * Math.sin(3 * th) * Math.cos(4 * a) + 0.08 * Math.sin(6 * th);
        put(i, Math.cos(a) * s * r, y * r, Math.sin(a) * s * r);
        break;
      }
    }
  }
  if (form === "supershape") {
    // Its biggest reach fitted to the unit space.
    let m = 1e-6;
    for (let i = 0; i < n * 3; i++) m = Math.max(m, Math.abs(out[i]));
    for (let i = 0; i < n * 3; i++) out[i] *= 0.92 / m;
  }
  return out;
}

/** Gielis's superformula: a radius for an angle. */
function superformula(a: number, m: number, n1: number, n2: number, n3: number) {
  const t = Math.pow(Math.abs(Math.cos((m * a) / 4)), n2) + Math.pow(Math.abs(Math.sin((m * a) / 4)), n3);
  return t === 0 ? 0 : Math.pow(t, -1 / n1);
}
const TETRA = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map((v) => v.map((x) => x * 0.62));
/** One move of the chaos game: halfway to a corner of a tetrahedron, or one of Barnsley's four maps. */
function chaosStep(form: string, p: number[], rand: Rand) {
  if (form === "sierpinski") {
    const c = TETRA[Math.floor(rand() * 4)];
    p[0] = (p[0] + c[0]) / 2; p[1] = (p[1] + c[1]) / 2; p[2] = (p[2] + c[2]) / 2;
  } else if (form === "fern") {
    const r = rand(), x = p[0], y = p[1];
    if (r < 0.01) { p[0] = 0; p[1] = 0.16 * y; }
    else if (r < 0.86) { p[0] = 0.85 * x + 0.04 * y; p[1] = -0.04 * x + 0.85 * y + 1.6; }
    else if (r < 0.93) { p[0] = 0.2 * x - 0.26 * y; p[1] = 0.23 * x + 0.22 * y + 1.6; }
    else { p[0] = -0.15 * x + 0.28 * y; p[1] = 0.26 * x + 0.24 * y + 0.44; }
  }
}

/** The pixels of a 2D canvas that are drawn on, as points (and their colours): a word or a picture made into dots. */
function sampled(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, rand: Rand, maxW: number, maxH: number, keepColour: boolean) {
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // A picture from a site that doesn't allow reading it.
    return null;
  }
  // A picture without see-through parts on a plain ground (a logo on white): its ground is left out.
  const at = (x: number, y: number) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const solid = corners.every((c) => data[c + 3] > 250);
  const ground = solid ? [0, 1, 2].map((k) => corners.reduce((s, c) => s + data[c + k], 0) / 4) : null;
  const plainGround = ground ? corners.every((c) => Math.abs(data[c] - ground[0]) + Math.abs(data[c + 1] - ground[1]) + Math.abs(data[c + 2] - ground[2]) < 40) : false;
  const on: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = at(x, y);
      if (data[k + 3] < 110) continue;
      if (plainGround && ground && Math.abs(data[k] - ground[0]) + Math.abs(data[k + 1] - ground[1]) + Math.abs(data[k + 2] - ground[2]) < 60) continue;
      on.push(x, y);
    }
  }
  if (on.length < 2) return null;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let i = 0; i < on.length; i += 2) {
    minX = Math.min(minX, on[i]); maxX = Math.max(maxX, on[i]);
    minY = Math.min(minY, on[i + 1]); maxY = Math.max(maxY, on[i + 1]);
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1, k = Math.min(maxW / bw, maxH / bh), cx = (minX + maxX + 1) / 2, cy = (minY + maxY + 1) / 2;
  const pos = new Float32Array(n * 3);
  const col = keepColour ? new Float32Array(n * 3) : undefined;
  const count = on.length / 2;
  for (let i = 0; i < n; i++) {
    // Every pixel once before any twice, then at random.
    const j = (i < count ? Math.floor((i / Math.min(n, count)) * count) : Math.floor(rand() * count)) * 2;
    const px = on[j] + rand(), py = on[j + 1] + rand();
    pos[i * 3] = (px - cx) * k;
    pos[i * 3 + 1] = -(py - cy) * k;
    pos[i * 3 + 2] = 0;
    if (col) {
      const d = at(on[j], on[j + 1]);
      col[i * 3] = data[d] / 255;
      col[i * 3 + 1] = data[d + 1] / 255;
      col[i * 3 + 2] = data[d + 2] / 255;
    }
  }
  return { pos, col };
}

const canvas2d = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d", { willReadFrequently: true });
};

/** The owner's words as n points, at most maxW × maxH of the scene's units, in the font given (a CSS family). */
export function textPoints(text: string, n: number, rand: Rand, o: { family: string; weight: number; rtl: boolean; maxW: number; maxH: number }) {
  const W = 1200, H = 300;
  const ctx = canvas2d(W, H);
  if (!ctx || !text) return null;
  const font = (px: number) => `${o.weight} ${px}px ${o.family}`;
  ctx.font = font(200);
  const wide = Math.max(1, ctx.measureText(text).width);
  const px = Math.max(24, Math.min(220, (200 * (W - 40)) / wide));
  ctx.font = font(px);
  ctx.direction = o.rtl ? "rtl" : "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, W / 2, H / 2);
  return sampled(ctx, W, H, n, rand, o.maxW, o.maxH, true);
}

/** A loaded picture as n points and their colours, at most maxW × maxH of the scene's units. */
export function imagePoints(img: HTMLImageElement, n: number, rand: Rand, maxW: number, maxH: number) {
  const side = 220, k = Math.min(1, side / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(2, Math.round((img.naturalWidth || side) * k)), h = Math.max(2, Math.round((img.naturalHeight || side) * k));
  const ctx = canvas2d(w, h);
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return sampled(ctx, w, h, n, rand, maxW, maxH, true);
}
