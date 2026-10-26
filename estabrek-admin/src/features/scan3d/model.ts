/**
 * The product's 3D shape from the scan (Admin → الوسائط → مسح 3D, the second part),
 * without AI:
 * 1. Carving: a block of small cubes (voxels) round the product; every frame's cut-out,
 *    seen through the camera found from the mat with the product turned by that frame's
 *    angle, removes each cube that falls outside it. What all the frames leave is the
 *    product's shape as its outline allows (its "visual hull": hollows facing no camera,
 *    like the inside of a cup, stay filled).
 * 2. The surface: the cubes blurred a little, then surface nets (one corner per cube
 *    the surface crosses, joined into a closed skin facing out), then Taubin smoothing
 *    (smooth without shrinking).
 * 3. The colour: colour.ts.
 * Units: the mat's outer ring radius (92.5 mm) = 1; y up from the mat (y = 0), z towards
 * the camera at the turn's first frame.
 */
import { dilate, type MatModel } from "./vision";

/** A frame for carving: the product's outline (the analysis size, shadow-like pixels kept) and how far it had turned (radians, in the mat's angles). */
export type CarveView = { mask: Uint8Array; omega: number };
export type Box3 = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
/** Cubes `step` wide, the first one's corner at (x0, y0, z0); occ 1 = product. */
export type Grid = { nx: number; ny: number; nz: number; x0: number; y0: number; z0: number; step: number; occ: Uint8Array };
export type Mesh = { positions: Float32Array; normals: Float32Array; colors: Uint8Array; indices: Uint32Array };

/**
 * A point of the product (its own x, y, z) in the picture of a frame where it had turned
 * by omega: [x, y, depth] (depth: along the camera's view from the mat's centre, in the
 * mat's units; smaller = nearer the camera).
 */
export function projectPoint(m: MatModel, omega: number, x: number, y: number, z: number, out: number[] = [0, 0, 0]) {
  const co = Math.cos(omega);
  const so = Math.sin(omega);
  const xr = x * co - z * so;
  const zr = x * so + z * co;
  const ce = Math.cos(m.e);
  const se = Math.sin(m.e);
  const d = 1 - m.rho * (zr * ce + y * se);
  const u = (m.k * xr) / d;
  const down = (m.k * (zr * se - y * ce)) / d;
  const c = Math.cos(m.phi);
  const s = Math.sin(m.phi);
  out[0] = m.cx + u * c - down * s;
  out[1] = m.cy + u * s + down * c;
  out[2] = -(zr * ce + y * se);
  return out;
}

/** Where the camera is, in the product's own coordinates, for a frame turned by omega. */
export function cameraAt(m: MatModel, omega: number): [number, number, number] {
  const D = 1 / Math.max(1e-3, m.rho);
  const y = D * Math.sin(m.e);
  const zr = D * Math.cos(m.e);
  // Turned back by omega.
  return [zr * Math.sin(omega), y, zr * Math.cos(omega)];
}

/**
 * Carves the block: a cube stays unless more than `slack` frames see its centre outside the
 * product's outline (grown by a pixel: the camera and the masks aren't perfect, and a cube
 * wrongly carved leaves a hole for good; `slack` forgives a blurred frame or two). Frames
 * are tried far apart first, so most cubes go fast.
 */
export function carve(m: MatModel, w: number, h: number, views: CarveView[], box: Box3, step: number, slack = 0): Grid {
  const nx = Math.max(1, Math.ceil((box.x1 - box.x0) / step));
  const ny = Math.max(1, Math.ceil((box.y1 - box.y0) / step));
  const nz = Math.max(1, Math.ceil((box.z1 - box.z0) / step));
  const occ = new Uint8Array(nx * ny * nz);
  // Far-apart order: halves, then quarters…
  const order: number[] = [];
  const seen = new Set<number>();
  for (let div = 1; order.length < views.length; div *= 2)
    for (let k = 0; k < div; k++) {
      const i = Math.floor((k * views.length) / div);
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  const prepared = order.map((i) => ({ mask: dilate(views[i].mask, w, h, 1), co: Math.cos(views[i].omega), so: Math.sin(views[i].omega) }));
  const ce = Math.cos(m.e);
  const se = Math.sin(m.e);
  const c = Math.cos(m.phi);
  const s = Math.sin(m.phi);
  for (let iz = 0; iz < nz; iz++) {
    const z = box.z0 + (iz + 0.5) * step;
    for (let iy = 0; iy < ny; iy++) {
      const y = box.y0 + (iy + 0.5) * step;
      for (let ix = 0; ix < nx; ix++) {
        const x = box.x0 + (ix + 0.5) * step;
        let inside = 1;
        let against = 0;
        for (const v of prepared) {
          const xr = x * v.co - z * v.so;
          const zr = x * v.so + z * v.co;
          const d = 1 - m.rho * (zr * ce + y * se);
          const u = (m.k * xr) / d;
          const down = (m.k * (zr * se - y * ce)) / d;
          const px = Math.round(m.cx + u * c - down * s);
          const py = Math.round(m.cy + u * s + down * c);
          // Outside the picture is outside the product too: the scan made sure the product
          // stayed in the frame all the way round.
          if (px < 0 || py < 0 || px >= w || py >= h || !v.mask[py * w + px]) {
            if (++against > slack) {
              inside = 0;
              break;
            }
          }
        }
        occ[(iz * ny + iy) * nx + ix] = inside;
      }
    }
  }
  return { nx, ny, nz, x0: box.x0, y0: box.y0, z0: box.z0, step, occ };
}

/** The box round the cubes that stayed (with `pad` cubes more each side), or null if none did. */
export function occupiedBox(g: Grid, pad = 1): Box3 | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let iz = 0; iz < g.nz; iz++)
    for (let iy = 0; iy < g.ny; iy++)
      for (let ix = 0; ix < g.nx; ix++) {
        if (!g.occ[(iz * g.ny + iy) * g.nx + ix]) continue;
        x0 = Math.min(x0, ix);
        x1 = Math.max(x1, ix);
        y0 = Math.min(y0, iy);
        y1 = Math.max(y1, iy);
        z0 = Math.min(z0, iz);
        z1 = Math.max(z1, iz);
      }
  if (!Number.isFinite(x0)) return null;
  const at = (o: number, i: number) => o + i * g.step;
  return {
    x0: at(g.x0, x0 - pad),
    x1: at(g.x0, x1 + 1 + pad),
    y0: Math.max(g.y0, at(g.y0, y0 - pad)),
    y1: at(g.y0, y1 + 1 + pad),
    z0: at(g.z0, z0 - pad),
    z1: at(g.z0, z1 + 1 + pad),
  };
}

export const volumeOf = (g: Grid) => g.occ.reduce((s, v) => s + v, 0) * g.step ** 3;

/** The cubes as a smooth field (a 3×3×3 average), with a ring of empty space round it. */
function field(g: Grid) {
  const X = g.nx + 2;
  const Y = g.ny + 2;
  const Z = g.nz + 2;
  const raw = new Float32Array(X * Y * Z);
  for (let iz = 0; iz < g.nz; iz++)
    for (let iy = 0; iy < g.ny; iy++)
      for (let ix = 0; ix < g.nx; ix++) raw[((iz + 1) * Y + iy + 1) * X + ix + 1] = g.occ[(iz * g.ny + iy) * g.nx + ix];
  // Three passes of a running average along x, y and z.
  const pass = (src: Float32Array, stride: number, len: number, count: number, base: (n: number) => number) => {
    const out = new Float32Array(src.length);
    for (let n = 0; n < count; n++) {
      const o = base(n);
      for (let i = 0; i < len; i++) {
        const a = i > 0 ? src[o + (i - 1) * stride] : 0;
        const b = src[o + i * stride];
        const c = i < len - 1 ? src[o + (i + 1) * stride] : 0;
        out[o + i * stride] = (a + b + c) / 3;
      }
    }
    return out;
  };
  let f = pass(raw, 1, X, Y * Z, (n) => n * X);
  f = pass(f, X, Y, X * Z, (n) => (n % X) + Math.floor(n / X) * X * Y);
  f = pass(f, X * Y, Z, X * Y, (n) => n);
  return { f, X, Y, Z };
}

const CORNERS = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];
const EDGES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

/**
 * The surface where the field crosses one half: one corner inside each cell it crosses
 * (where its edges cross, averaged), every crossed edge between samples a quad of the
 * four cells round it, turned to face out. Closed and the same way round everywhere.
 */
export function surfaceOf(g: Grid, iso = 0.5): Mesh {
  const { f, X, Y, Z } = field(g);
  const at = (x: number, y: number, z: number) => f[(z * Y + y) * X + x];
  const cell = new Int32Array((X - 1) * (Y - 1) * (Z - 1)).fill(-1);
  const pos: number[] = [];
  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let z = 0; z < Z - 1; z++)
    for (let y = 0; y < Y - 1; y++)
      for (let x = 0; x < X - 1; x++) {
        let inside = 0;
        for (let k = 0; k < 8; k++) {
          v[k] = at(x + CORNERS[k][0], y + CORNERS[k][1], z + CORNERS[k][2]);
          if (v[k] >= iso) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of EDGES) {
          if (v[a] >= iso === v[b] >= iso) continue;
          const t = (iso - v[a]) / (v[b] - v[a]);
          sx += CORNERS[a][0] + t * (CORNERS[b][0] - CORNERS[a][0]);
          sy += CORNERS[a][1] + t * (CORNERS[b][1] - CORNERS[a][1]);
          sz += CORNERS[a][2] + t * (CORNERS[b][2] - CORNERS[a][2]);
          n++;
        }
        cell[(z * (Y - 1) + y) * (X - 1) + x] = pos.length / 3;
        // Sample (i) of the padded field is the centre of cube i − 1.
        pos.push(g.x0 + (x + sx / n - 0.5) * g.step, g.y0 + (y + sy / n - 0.5) * g.step, g.z0 + (z + sz / n - 0.5) * g.step);
      }
  const idx: number[] = [];
  const cellAt = (x: number, y: number, z: number) => (x < 0 || y < 0 || z < 0 || x >= X - 1 || y >= Y - 1 || z >= Z - 1 ? -1 : cell[(z * (Y - 1) + y) * (X - 1) + x]);
  // For an edge along axis a, the quad's cells step along the next two axes (b, c) in turn,
  // so it faces +a (b × c = a) when the inside is on the edge's lower end.
  const axes = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ];
  for (let z = 0; z < Z; z++)
    for (let y = 0; y < Y; y++)
      for (let x = 0; x < X; x++) {
        const p = [x, y, z];
        const here = at(x, y, z) >= iso;
        for (const [a, b, c] of axes) {
          const q = p.slice();
          q[a]++;
          if (q[a] >= [X, Y, Z][a]) continue;
          const there = at(q[0], q[1], q[2]) >= iso;
          if (here === there) continue;
          const corner = (db: number, dc: number) => {
            const r = p.slice();
            r[b] += db;
            r[c] += dc;
            return cellAt(r[0], r[1], r[2]);
          };
          const quad = [corner(-1, -1), corner(0, -1), corner(0, 0), corner(-1, 0)];
          if (quad.some((i) => i < 0)) continue;
          if (!here) quad.reverse();
          idx.push(quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]);
        }
      }
  const positions = new Float32Array(pos);
  return { positions, normals: new Float32Array(positions.length), colors: new Uint8Array((positions.length / 3) * 4).fill(200), indices: new Uint32Array(idx) };
}

/** Each corner's neighbours (along the triangles' edges). */
function neighbours(mesh: Mesh) {
  const n = mesh.positions.length / 3;
  const sets: Array<Set<number>> = Array.from({ length: n }, () => new Set());
  const t = mesh.indices;
  for (let i = 0; i < t.length; i += 3)
    for (let k = 0; k < 3; k++) {
      sets[t[i + k]].add(t[i + ((k + 1) % 3)]);
      sets[t[i + ((k + 1) % 3)]].add(t[i + k]);
    }
  return sets.map((s) => Array.from(s));
}

/** Taubin smoothing: a step towards the neighbours, then a slightly bigger one back (no shrinking). */
export function smooth(mesh: Mesh, rounds = 6, lambda = 0.5, mu = -0.53) {
  const nb = neighbours(mesh);
  const p = mesh.positions;
  const tmp = new Float32Array(p.length);
  for (let r = 0; r < rounds * 2; r++) {
    const f = r % 2 === 0 ? lambda : mu;
    for (let i = 0; i < nb.length; i++) {
      const list = nb[i];
      if (!list.length) {
        tmp.set(p.subarray(i * 3, i * 3 + 3), i * 3);
        continue;
      }
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (const j of list) {
        ax += p[j * 3];
        ay += p[j * 3 + 1];
        az += p[j * 3 + 2];
      }
      const k = 1 / list.length;
      tmp[i * 3] = p[i * 3] + f * (ax * k - p[i * 3]);
      tmp[i * 3 + 1] = p[i * 3 + 1] + f * (ay * k - p[i * 3 + 1]);
      tmp[i * 3 + 2] = p[i * 3 + 2] + f * (az * k - p[i * 3 + 2]);
    }
    p.set(tmp);
  }
  // Nothing below the mat.
  for (let i = 1; i < p.length; i += 3) if (p[i] < 0) p[i] = 0;
}

/** Normals at the corners: the faces round each, weighted by their size. */
export function computeNormals(mesh: Mesh) {
  const p = mesh.positions;
  const n = mesh.normals;
  n.fill(0);
  const t = mesh.indices;
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3;
    const b = t[i + 1] * 3;
    const c = t[i + 2] * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) {
      n[k] += nx;
      n[k + 1] += ny;
      n[k + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
}

/** The mesh's size (its box) and how many triangles. */
export function meshStats(mesh: Mesh) {
  const p = mesh.positions;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[i + k]);
      hi[k] = Math.max(hi[k], p[i + k]);
    }
  return { min: lo, max: hi, size: hi.map((v, k) => v - lo[k]), triangles: mesh.indices.length / 3, vertices: p.length / 3 };
}
