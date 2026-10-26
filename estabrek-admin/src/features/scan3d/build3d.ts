/**
 * The 3D model from a scan that passed (Admin → الوسائط → مسح 3D): carved from every
 * frame's cut-out (a rough pass to find where the product is, then a fine one inside it),
 * its surface smoothed, coloured from 36 frames read again at the video's own size, and
 * written as a .glb in real size (the mat's millimetres). Needs the mat: its camera and
 * the turn's direction place every frame.
 */
import type { Analysis } from "./analyse";
import { colourMesh, type ColourView } from "./colour";
import { meshToGlb } from "./glb";
import { MAT_UNIT_MM } from "./mat";
import { carve, computeNormals, meshStats, occupiedBox, smooth, surfaceOf, type CarveView, type Mesh } from "./model";
import { evenFrames, frameAt, type OpenVideo } from "./video";

export type BuildQuality = "normal" | "high";
/** Cubes along the product's longest side. */
const CELLS: Record<BuildQuality, number> = { normal: 72, high: 112 };
const COLOUR_VIEWS = 36;
export type BuildStep = "carve" | "surface" | "colour" | "file";
export type Built = {
  mesh: Mesh;
  glb: Blob;
  /** Width, depth and height (mm). */
  sizeMm: [number, number, number];
  triangles: number;
  /** The share of the surface some frame saw (the rest took its neighbours' colour). */
  seen: number;
};

const breathe = () => new Promise((r) => setTimeout(r, 0));

export async function buildModel(v: OpenVideo, a: Analysis, opts: { quality?: BuildQuality; name?: string; onProgress?: (step: BuildStep, f: number) => unknown; signal?: AbortSignal }): Promise<Built> {
  if (!a.mat) throw new Error("NO_MAT");
  const { camera, spin } = a.mat;
  const stop = () => {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };
  const views: CarveView[] = a.turn.map((f) => ({ mask: f.solid, omega: (spin * f.angle * Math.PI) / 180 }));
  // A blurred frame or two mustn't cut into the product.
  const slack = Math.floor(views.length * 0.02);

  // Rough: a block well round the mat, as tall as the product could be.
  await opts.onProgress?.("carve", 0);
  await breathe();
  const tall = a.heightMm ? (a.heightMm / MAT_UNIT_MM) * 1.4 + 0.3 : 3;
  const rough = carve(camera, a.w, a.h, views, { x0: -1.6, x1: 1.6, y0: 0, y1: tall, z0: -1.6, z1: 1.6 }, Math.max(3.2, tall) / 40, slack);
  const box = occupiedBox(rough);
  if (!box) throw new Error("NOTHING_CARVED");
  stop();
  await opts.onProgress?.("carve", 0.3);
  await breathe();
  const longest = Math.max(box.x1 - box.x0, box.y1 - box.y0, box.z1 - box.z0);
  const grid = carve(camera, a.w, a.h, views, box, longest / CELLS[opts.quality ?? "normal"], slack);
  stop();
  await opts.onProgress?.("carve", 1);

  await opts.onProgress?.("surface", 0);
  await breathe();
  const mesh = surfaceOf(grid);
  // Finer cubes show the cut-outs' small jitter more: smooth them a little longer.
  smooth(mesh, Math.round(CELLS[opts.quality ?? "normal"] / 12));
  computeNormals(mesh);
  if (!mesh.indices.length) throw new Error("NOTHING_CARVED");
  stop();
  await opts.onProgress?.("surface", 1);

  // Colour: frames all round, read again at the video's own size (sharper than the analysis).
  const picked = evenFrames(a.turn, COLOUR_VIEWS);
  const colourViews: ColourView[] = [];
  for (let k = 0; k < picked.length; k++) {
    const f = picked[k];
    const img = await frameAt(v, f.time, Math.min(1280, v.width), opts.signal);
    const s = img.w / a.w;
    colourViews.push({ img, omega: (spin * f.angle * Math.PI) / 180, camera: { ...camera, cx: camera.cx * s, cy: camera.cy * s, k: camera.k * s } });
    await opts.onProgress?.("colour", ((k + 1) / picked.length) * 0.5);
  }
  const seen = await colourMesh(mesh, colourViews, async (f) => {
    stop();
    await opts.onProgress?.("colour", 0.5 + f * 0.5);
    await breathe();
  });

  await opts.onProgress?.("file", 0);
  const glb = new Blob([meshToGlb(mesh, opts.name || "scan")], { type: "model/gltf-binary" });
  const st = meshStats(mesh);
  await opts.onProgress?.("file", 1);
  return {
    mesh,
    glb,
    sizeMm: [st.size[0] * MAT_UNIT_MM, st.size[2] * MAT_UNIT_MM, st.size[1] * MAT_UNIT_MM],
    triangles: st.triangles,
    seen,
  };
}
