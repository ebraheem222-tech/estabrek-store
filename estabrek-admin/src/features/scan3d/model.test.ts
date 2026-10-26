import { describe, expect, it } from "vitest";
import { colourMesh, type ColourView } from "./colour";
import { meshToGlb } from "./glb";
import { carve, computeNormals, occupiedBox, projectPoint, smooth, surfaceOf, volumeOf, type CarveView, type Grid, type Mesh } from "./model";
import { rasterize } from "./raster";
import type { Img, MatModel } from "./vision";

// The 3D model from a scan, on a product known exactly: a box with a ball on it, red on
// one side and blue on the other, drawn through a camera with perspective at 72 angles
// of one turn. From those pictures alone the shape, its size and its colours come back.

const W = 320;
const H = 240;
const CAM: MatModel = { cx: 160, cy: 175, phi: 0.01, k: 140, rho: 0.2, e: (28 * Math.PI) / 180 };
const STEP = 0.02;

/** The product as cubes: a box 0.7 × 0.5 × 0.4 and a ball on it. */
function truthGrid(): Grid {
  const box = { x0: -0.4, x1: 0.4, y0: 0, y1: 0.8, z0: -0.4, z1: 0.4 };
  const nx = Math.round((box.x1 - box.x0) / STEP);
  const ny = Math.round((box.y1 - box.y0) / STEP);
  const nz = Math.round((box.z1 - box.z0) / STEP);
  const occ = new Uint8Array(nx * ny * nz);
  for (let iz = 0; iz < nz; iz++)
    for (let iy = 0; iy < ny; iy++)
      for (let ix = 0; ix < nx; ix++) {
        const x = box.x0 + (ix + 0.5) * STEP;
        const y = box.y0 + (iy + 0.5) * STEP;
        const z = box.z0 + (iz + 0.5) * STEP;
        const inBox = Math.abs(x) <= 0.35 && y <= 0.5 && Math.abs(z) <= 0.2;
        const inBall = (x - 0.1) ** 2 + (y - 0.6) ** 2 + z ** 2 <= 0.13 ** 2;
        occ[(iz * ny + iy) * nx + ix] = inBox || inBall ? 1 : 0;
      }
  return { nx, ny, nz, x0: box.x0, y0: box.y0, z0: box.z0, step: STEP, occ };
}

/** The product drawn at a turn of omega: its picture (grey wall) and its outline. */
function shoot(mesh: Mesh, omega: number): { img: Img; mask: Uint8Array } {
  const n = mesh.positions.length / 3;
  const screen = new Float32Array(n * 3);
  const pt = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    projectPoint(CAM, omega, mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2], pt);
    screen.set(pt, i * 3);
  }
  const data = new Uint8ClampedArray(W * H * 4).fill(128);
  const mask = new Uint8Array(W * H);
  const depth = new Float32Array(W * H).fill(Infinity);
  const c = mesh.colors;
  rasterize(screen, mesh.indices, W, H, depth, (px, a, b, cc, wa, wb, wc) => {
    for (let k = 0; k < 3; k++) data[px * 4 + k] = wa * c[a * 4 + k] + wb * c[b * 4 + k] + wc * c[cc * 4 + k];
    mask[px] = 1;
  });
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { img: { w: W, h: H, data }, mask };
}

const meshVolume = (m: Mesh) => {
  let v = 0;
  const p = m.positions;
  const t = m.indices;
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [t[i] * 3, t[i + 1] * 3, t[i + 2] * 3];
    v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return v;
};

describe("a 3D model from a turn", () => {
  const truth = truthGrid();
  const truthMesh = surfaceOf(truth);
  computeNormals(truthMesh);
  // Red where x < 0, blue where x ≥ 0 (in the product's own coordinates).
  for (let i = 0; i < truthMesh.positions.length / 3; i++) truthMesh.colors.set(truthMesh.positions[i * 3] < 0 ? [210, 40, 50, 255] : [40, 70, 210, 255], i * 4);
  const omegas = Array.from({ length: 72 }, (_, k) => (k * 5 * Math.PI) / 180);
  const shots = omegas.map((o) => shoot(truthMesh, o));

  it("the surface is closed and faces out", () => {
    const edges = new Map<string, number>();
    const t = truthMesh.indices;
    for (let i = 0; i < t.length; i += 3)
      for (let k = 0; k < 3; k++) {
        const a = t[i + k];
        const b = t[i + ((k + 1) % 3)];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    expect([...edges.values()].every((c) => c === 2)).toBe(true);
    const v = meshVolume(truthMesh);
    expect(v).toBeGreaterThan(0);
    expect(Math.abs(v / volumeOf(truth) - 1)).toBeLessThan(0.12);
  });

  it("carving the outlines gives back the product's shape and size", () => {
    const views: CarveView[] = shots.map((s, k) => ({ mask: s.mask, omega: omegas[k] }));
    const coarse = carve(CAM, W, H, views, { x0: -0.8, x1: 0.8, y0: 0, y1: 1.1, z0: -0.8, z1: 0.8 }, 0.05);
    const box = occupiedBox(coarse)!;
    const fine = carve(CAM, W, H, views, box, STEP);
    const tight = occupiedBox(fine, 0)!;
    expect(tight.x0).toBeCloseTo(-0.35, 1);
    expect(tight.x1).toBeCloseTo(0.35, 1);
    expect(tight.z0).toBeCloseTo(-0.2, 1);
    expect(tight.z1).toBeCloseTo(0.2, 1);
    expect(tight.y1).toBeCloseTo(0.73, 1);
    const ratio = volumeOf(fine) / volumeOf(truth);
    // The outline's shape holds the product and a little more (only what no frame sees round).
    expect(ratio).toBeGreaterThan(0.97);
    expect(ratio).toBeLessThan(1.25);
  });

  it("the model is smooth, closed, the right size, and coloured right on each side", async () => {
    const views: CarveView[] = shots.map((s, k) => ({ mask: s.mask, omega: omegas[k] }));
    const grid = carve(CAM, W, H, views, { x0: -0.45, x1: 0.45, y0: 0, y1: 0.85, z0: -0.45, z1: 0.45 }, STEP);
    const mesh = surfaceOf(grid);
    const before = meshVolume(mesh);
    smooth(mesh);
    computeNormals(mesh);
    expect(Math.abs(meshVolume(mesh) / before - 1)).toBeLessThan(0.05);
    const cv: ColourView[] = shots.filter((_, k) => k % 2 === 0).map((s, k) => ({ img: s.img, omega: omegas[k * 2], camera: CAM }));
    const seen = await colourMesh(mesh, cv);
    expect(seen).toBeGreaterThan(0.8);
    let red = [0, 0];
    let blue = [0, 0];
    const p = mesh.positions;
    for (let i = 0; i < p.length / 3; i++) {
      const [r, , b] = [mesh.colors[i * 4], mesh.colors[i * 4 + 1], mesh.colors[i * 4 + 2]];
      if (p[i * 3] < -0.15) red = [red[0] + (r > b ? 1 : 0), red[1] + 1];
      if (p[i * 3] > 0.15) blue = [blue[0] + (b > r ? 1 : 0), blue[1] + 1];
    }
    expect(red[0] / red[1]).toBeGreaterThan(0.9);
    expect(blue[0] / blue[1]).toBeGreaterThan(0.9);

    // As a .glb: glTF 2.0, in metres (the box is 0.7 × 92.5 mm wide).
    const glb = meshToGlb(mesh);
    const view = new DataView(glb);
    expect(view.getUint32(0, true)).toBe(0x46546c67);
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(glb.byteLength);
    const jsonLen = view.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen)));
    expect(json.meshes[0].primitives[0].attributes).toEqual({ POSITION: 0, NORMAL: 1, COLOR_0: 2 });
    const [min, max] = [json.accessors[0].min, json.accessors[0].max];
    expect(max[0] - min[0]).toBeCloseTo(0.7 * 0.0925, 2);
    expect(min[1]).toBeGreaterThanOrEqual(0);
    expect(json.accessors[3].count).toBe(mesh.indices.length);
  });
});
