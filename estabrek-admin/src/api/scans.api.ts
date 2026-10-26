// 360° scans of products from a filmed turn (admin → الوسائط → مسح 3D).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type ScanCheck = { id: string; level: "ok" | "warn" | "reject"; value?: number };
/** The sheet's grid, each frame's angle and time, the camera's height and the product's size (from the mat). */
export type ScanManifest = {
  version: 1;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  frames: Array<{ angle: number; time: number }>;
  elevation: number | null;
  heightMm: number | null;
  video: { name: string; duration: number; width: number; height: number };
  checks: ScanCheck[];
  /** Filmed on the printed mat, or a plain video (one turn marked by hand). */
  mode?: "mat" | "plain";
  /** The frames' background: cut out, kept as filmed, or a colour (#rrggbb). */
  background?: "cut" | "kept" | string;
  /** The product (and colour; none = every colour) it shows on the shop's product page. */
  product?: { id: string; itemId?: string | null } | null;
  /** Its 3D model (a GLB among the 3D files). */
  model?: { url: string } | null;
};
export type Scan = { id: string; displayName: string | null; url: string; size: number; width: number | null; height: number | null; manifest: ScanManifest; createdAt: string };

const S = ENDPOINTS.admin.mediaScans;

export async function listScans(productId?: string) {
  return (await api.get(S.base, productId ? { params: { productId } } : undefined)).data as { items: Scan[] };
}

/** Which product (and colour) a scan shows (productId null = none), its 3D model, its name. */
export async function linkScan(id: string, body: { productId?: string | null; itemId?: string | null; modelUrl?: string | null; displayName?: string }) {
  return (await api.patch(S.one(id), body)).data as Scan;
}

export async function saveScan(sheet: Blob, manifest: ScanManifest, displayName: string, onProgress?: (f: number) => void) {
  const form = new FormData();
  form.append("sheet", sheet, "scan.webp");
  form.append("manifest", JSON.stringify(manifest));
  form.append("displayName", displayName);
  // Multipart, not the client's default JSON (which would drop the file).
  const res = await api.post(S.base, form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 0, onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0) });
  return res.data as Scan;
}

export async function deleteScan(id: string) {
  await api.delete(S.one(id));
}
