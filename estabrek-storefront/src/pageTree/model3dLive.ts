/**
 * A 3D model's parts, views and the editor's live hold on it (focus mode, docs/cms-big-engine-plan.ar.md A5):
 *  - each part (mesh) is named by its own name, or by its place among the model's meshes ("part-3": the built-in
 *    models don't name theirs), and dressed by the element's `parts` (colour, roughness, metal, glow, hidden), on a
 *    material of its own so the rest keep theirs;
 *  - a view is an angle around the model, a height and a distance (az, el in degrees, dist), the camera's place;
 *  - while the editor looks at it, its canvas is listed here with its scene, camera and model, so the studio bridge
 *    can name the part under a point, and show a view or a part's look before it's saved.
 */
import type * as THREE from "three";

export type PartLook = { color?: string; rough?: number; metal?: number; glow?: string; hide?: boolean };
export type View3d = { id: string; az: number; el: number; dist: number };
export type Spot3d = { id: string; at: [number, number, number]; text: string; href?: string };

export type Live3d = { scene: THREE.Scene; camera: THREE.Camera; root: () => THREE.Object3D | null; invalidate: () => void; preview: Omit<View3d, "id"> | null };
/** The canvases of the models on the page (only filled while a page is open; the bridge reads it in the editor). */
export const live3d = new Map<HTMLCanvasElement, Live3d>();

/** The model's meshes with their names (own name, else their place among the meshes). */
export function partsOf(root: THREE.Object3D | null): Array<{ key: string; mesh: THREE.Mesh }> {
  const out: Array<{ key: string; mesh: THREE.Mesh }> = [];
  if (!root) return out;
  let i = 0;
  const seen = new Set<string>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    let key = (m.name || "").trim().slice(0, 80) || `part-${i}`;
    if (seen.has(key)) key = `${key}-${i}`;
    seen.add(key);
    out.push({ key, mesh: m });
    i++;
  });
  return out;
}

type Std = THREE.MeshStandardMaterial;
/** Dresses the model's parts by their looks (a part's own copy of its material, made once). */
export function dressParts(root: THREE.Object3D | null, looks: Record<string, PartLook>) {
  for (const { key, mesh } of partsOf(root)) {
    const look = looks[key];
    const ud = mesh.userData as { ptOwn?: boolean; ptWas?: { visible: boolean } };
    if (!look && !ud.ptOwn) continue;
    if (!ud.ptOwn) {
      ud.ptOwn = true;
      ud.ptWas = { visible: mesh.visible };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
    }
    mesh.visible = look?.hide ? false : ud.ptWas?.visible ?? true;
    for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Std[]) {
      if (look?.color && mat.color) mat.color.set(look.color);
      if (typeof look?.rough === "number" && "roughness" in mat) mat.roughness = look.rough;
      if (typeof look?.metal === "number" && "metalness" in mat) mat.metalness = look.metal;
      if (look?.glow && mat.emissive) {
        mat.emissive.set(look.glow);
        mat.emissiveIntensity = 0.8;
      }
      mat.needsUpdate = true;
    }
  }
}

/** The camera's place for a view (looking at the model's middle). */
export function viewPlace(v: Omit<View3d, "id">): [number, number, number] {
  const az = (v.az * Math.PI) / 180, el = (v.el * Math.PI) / 180;
  return [v.dist * Math.cos(el) * Math.sin(az), v.dist * Math.sin(el), v.dist * Math.cos(el) * Math.cos(az)];
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const n = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** The parts' looks the shop may use (checked again as the backend did). */
export function partLooksOf(raw: unknown): Record<string, PartLook> {
  const out: Record<string, PartLook> = {};
  for (const [k, v] of Object.entries(obj(raw)).slice(0, 60)) {
    if (!/^[^\u0000-\u001f<>"'`\\]{1,80}$/.test(k)) continue;
    const x = obj(v), look: PartLook = {};
    if (typeof x.color === "string" && HEX.test(x.color)) look.color = x.color;
    if (n(x.rough, 0, 1) !== undefined) look.rough = x.rough as number;
    if (n(x.metal, 0, 1) !== undefined) look.metal = x.metal as number;
    if (typeof x.glow === "string" && HEX.test(x.glow)) look.glow = x.glow;
    if (x.hide === true) look.hide = true;
    if (Object.keys(look).length) out[k] = look;
  }
  return out;
}

/** The saved views (an angle, a height, a distance each). */
export function viewsOf(raw: unknown): View3d[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 8).flatMap((v) => {
    const x = obj(v);
    const az = n(x.az, -180, 180), el = n(x.el, -89, 89), dist = n(x.dist, 2, 20);
    return typeof x.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(x.id) && az !== undefined && el !== undefined && dist !== undefined ? [{ id: x.id, az, el, dist }] : [];
  });
}
