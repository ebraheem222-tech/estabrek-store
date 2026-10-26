/**
 * The 3D model's colours, from the scan's frames: each corner of its surface takes the
 * colour the frames show there, but only from frames that see it (it faces them, and no
 * other part of the product stands in front of it: a depth picture per frame), weighted
 * by how squarely it faces each, and only its four best frames (more would blur it).
 * Corners no frame sees well (underneath, in folds) take their neighbours' colour.
 */
import { cameraAt, projectPoint, type Mesh } from "./model";
import { rasterize } from "./raster";
import { sampleRgb, type Img, type MatModel } from "./vision";

/** A frame for colour: its picture, how far the product had turned, and the camera at this picture's size. */
export type ColourView = { img: Img; omega: number; camera: MatModel };

const BEST = 4;

export async function colourMesh(mesh: Mesh, views: ColourView[], onProgress?: (f: number) => unknown) {
  const n = mesh.positions.length / 3;
  const p = mesh.positions;
  const nr = mesh.normals;
  // Each corner's best frames so far: weight and colour.
  const weights = new Float32Array(n * BEST);
  const cols = new Float32Array(n * BEST * 3);
  const rgb = [0, 0, 0];
  const pt = [0, 0, 0];
  for (let v = 0; v < views.length; v++) {
    const { img, omega, camera } = views[v];
    const screen = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      projectPoint(camera, omega, p[i * 3], p[i * 3 + 1], p[i * 3 + 2], pt);
      screen[i * 3] = pt[0];
      screen[i * 3 + 1] = pt[1];
      screen[i * 3 + 2] = pt[2];
    }
    const depth = new Float32Array(img.w * img.h).fill(Infinity);
    rasterize(screen, mesh.indices, img.w, img.h, depth);
    const eye = cameraAt(camera, omega);
    for (let i = 0; i < n; i++) {
      const x = screen[i * 3];
      const y = screen[i * 3 + 1];
      const xi = Math.round(x - 0.5);
      const yi = Math.round(y - 0.5);
      if (xi < 1 || yi < 1 || xi >= img.w - 1 || yi >= img.h - 1) continue;
      // Seen: nothing nearer in the depth picture round it (a little leeway: the corner is on the surface).
      let nearest = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) nearest = Math.min(nearest, depth[(yi + dy) * img.w + xi + dx]);
      if (screen[i * 3 + 2] > nearest + 0.03) continue;
      const ex = eye[0] - p[i * 3];
      const ey = eye[1] - p[i * 3 + 1];
      const ez = eye[2] - p[i * 3 + 2];
      const el = Math.hypot(ex, ey, ez) || 1;
      const facing = (nr[i * 3] * ex + nr[i * 3 + 1] * ey + nr[i * 3 + 2] * ez) / el;
      if (facing < 0.2) continue;
      const wgt = facing * facing;
      // Into the best four, if it beats the weakest.
      let low = 0;
      for (let k = 1; k < BEST; k++) if (weights[i * BEST + k] < weights[i * BEST + low]) low = k;
      if (wgt <= weights[i * BEST + low]) continue;
      sampleRgb(img, x, y, rgb);
      if (rgb[0] < 0) continue;
      weights[i * BEST + low] = wgt;
      cols.set(rgb, (i * BEST + low) * 3);
    }
    await onProgress?.((v + 1) / views.length);
  }
  const out = mesh.colors;
  const done = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let W = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < BEST; k++) {
      const wgt = weights[i * BEST + k];
      if (!wgt) continue;
      W += wgt;
      r += wgt * cols[(i * BEST + k) * 3];
      g += wgt * cols[(i * BEST + k) * 3 + 1];
      b += wgt * cols[(i * BEST + k) * 3 + 2];
    }
    if (W > 0) {
      out[i * 4] = Math.round((r / W) * 255);
      out[i * 4 + 1] = Math.round((g / W) * 255);
      out[i * 4 + 2] = Math.round((b / W) * 255);
      done[i] = 1;
    }
    out[i * 4 + 3] = 255;
  }
  fillUnseen(mesh, done);
  return done.reduce((s, v) => s + v, 0) / Math.max(1, n);
}

/** Corners no frame saw take the average of their coloured neighbours, spreading inwards. */
function fillUnseen(mesh: Mesh, done: Uint8Array) {
  const n = done.length;
  const nb: number[][] = Array.from({ length: n }, () => []);
  const t = mesh.indices;
  for (let i = 0; i < t.length; i += 3)
    for (let k = 0; k < 3; k++) {
      nb[t[i + k]].push(t[i + ((k + 1) % 3)]);
      nb[t[i + ((k + 1) % 3)]].push(t[i + k]);
    }
  const c = mesh.colors;
  for (let round = 0; round < 200; round++) {
    const next: number[] = [];
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let k = 0;
      for (const j of nb[i])
        if (done[j]) {
          r += c[j * 4];
          g += c[j * 4 + 1];
          b += c[j * 4 + 2];
          k++;
        }
      if (!k) continue;
      c[i * 4] = r / k;
      c[i * 4 + 1] = g / k;
      c[i * 4 + 2] = b / k;
      next.push(i);
    }
    if (!next.length) break;
    for (const i of next) done[i] = 1;
  }
}
