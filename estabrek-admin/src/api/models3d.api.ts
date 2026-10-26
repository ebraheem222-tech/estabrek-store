// The store's own 3D models (.glb) for a gaming theme's stage (admin → ثيمات المتجر → محرّر المشهد).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type Model3d = { id: string; displayName: string | null; url: string; size: number; provider: string; createdAt: string };
export type ModelLibrary = { items: Model3d[]; maxBytes: number; cloudinary: boolean };
type ModelSignature = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; uploadUrl: string; expiresAt: string; maxBytes: number };

const M = ENDPOINTS.admin.mediaModels;

export async function listModels() {
  return (await api.get(M.base)).data as ModelLibrary;
}

export async function deleteModel(id: string) {
  await api.delete(M.one(id));
}

/** Sends one file to Cloudinary with its progress (a raw file, signed by the server). */
function sendToCloudinary(file: File, sig: ModelSignature, onProgress?: (f: number) => void, signal?: AbortSignal) {
  return new Promise<{ public_id: string }>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && body.public_id) resolve(body);
        else reject(new Error(body?.error?.message || `Cloudinary ${xhr.status}`));
      } catch {
        reject(new Error(`Cloudinary ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("NETWORK"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    xhr.send(form);
  });
}

/**
 * Uploads a .glb: straight to Cloudinary when the store has it (the server signs, then
 * checks the file), else to the server's disk. Either way the server keeps it only if it
 * really is a binary glTF 2.0 within the size limit.
 */
export async function uploadModel(file: File, opts: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}) {
  const displayName = file.name.replace(/\.glb$/i, "").slice(0, 200);
  let sig: ModelSignature | null = null;
  try {
    sig = (await api.post(M.sign, {})).data as ModelSignature;
  } catch (e) {
    // 409: the store has no Cloudinary, the file goes to the server instead.
    if ((e as { response?: { status?: number } })?.response?.status !== 409) throw e;
  }
  if (sig) {
    if (file.size > sig.maxBytes) throw new Error("FILE_TOO_LARGE");
    const sent = await sendToCloudinary(file, sig, opts.onProgress, opts.signal);
    return (await api.post(M.base, { publicId: sent.public_id, displayName })).data as Model3d;
  }
  const form = new FormData();
  form.append("file", file);
  form.append("displayName", displayName);
  const res = await api.post(M.local, form, {
    // Multipart, not the client's default JSON (which would drop the file).
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
    signal: opts.signal,
    onUploadProgress: (e) => opts.onProgress?.(e.total ? e.loaded / e.total : 0),
  });
  return res.data as Model3d;
}
