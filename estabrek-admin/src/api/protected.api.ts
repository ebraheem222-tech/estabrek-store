// Protected digital products (scripts, models, programs): master files kept
// encrypted, how each file type carries the buyer's mark, tracing a leaked file,
// and an order's serials.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type MarkMode = "comment" | "stl" | "package";

export type ProtectedFile = {
  id: string;
  name: string;
  ext: string;
  bytes: number;
  sha256: string;
  createdAt: string;
  /** The type's name ("Python", "3D print (STL)"…) and how it carries the mark. */
  type: string;
  mode: MarkMode;
  placed: "inside" | "package";
  /** Why the mark can't go inside: the type keeps files as they are, not plain text, or a signed script. */
  why?: "type" | "binary" | "signed";
  /** Where the master is kept: the vault, or (no vault, or from before it) the database, encrypted. */
  storedIn?: "vault" | "database";
};

export type ProtectedInfo = {
  isProtected: boolean;
  hours: number | null;
  downloads: number | null;
  devices?: number | null;
  defaults: { hours: number; downloads: number; devices?: number };
  /** With a vault, changing files needs an open vault session (its end time). */
  vault?: { on: boolean; session: string | null };
  files: ProtectedFile[];
  maxUploadMb: number;
  sold: { active: number; revoked: number };
};

export type ProtectedFileType = { ext: string; label: string; mode: MarkMode; commentStart?: string | null; commentEnd?: string | null; builtIn?: boolean };

export type TraceResult = {
  marks: string[];
  found: Array<{
    markId: string;
    status: "active" | "revoked";
    downloads: number;
    issuedAt: string;
    lastDownloadAt: string | null;
    product: { id: string; title: string };
    order: { id: string; shortId: string; customerName: string; phone: string; createdAt: string };
    recent: Array<{ at: string; userAgent: string | null }>;
  }>;
};

export type OrderLicence = {
  id: string;
  productId: string;
  title: string;
  last4: string;
  status: "active" | "revoked";
  revokedReason: "order" | "owner" | null;
  expiresAt: string;
  downloads: number;
  maxDownloads: number;
  lastDownloadAt: string | null;
  createdAt: string;
  /** The product's files are uploaded (else the download waits). */
  ready: boolean;
  /** PCs the launcher is activated on, and how many the serial allows. */
  activations?: Array<{ id: string; deviceName: string | null; status: "active" | "reset"; appVersion: string | null; createdAt: string; lastSeenAt: string }>;
  maxDevices?: number;
};

export async function getProtected(productId: string) {
  return (await api.get(ENDPOINTS.admin.catalog.productProtected(productId))).data as ProtectedInfo;
}
export async function uploadProtectedFile(productId: string, file: File, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(ENDPOINTS.admin.catalog.productProtected(productId), form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return res.data as ProtectedFile;
}
export async function deleteProtectedFile(productId: string, fileId: string) {
  return (await api.delete(`${ENDPOINTS.admin.catalog.productProtected(productId)}/${fileId}`)).data as { ok: true };
}

export async function listProtectedTypes() {
  return ((await api.get(ENDPOINTS.admin.catalog.protectedTypes)).data as { types: ProtectedFileType[] }).types;
}
export async function saveProtectedType(ext: string, body: { label: string; mode: MarkMode; commentStart?: string | null; commentEnd?: string | null }) {
  return ((await api.put(`${ENDPOINTS.admin.catalog.protectedTypes}/${encodeURIComponent(ext)}`, body)).data as { types: ProtectedFileType[] }).types;
}
export async function deleteProtectedType(ext: string) {
  return ((await api.delete(`${ENDPOINTS.admin.catalog.protectedTypes}/${encodeURIComponent(ext)}`)).data as { types: ProtectedFileType[] }).types;
}

/** A leaked file, or its pasted text: whose copy was it? */
export async function traceLeak(input: { file?: File; text?: string }) {
  if (input.file) {
    const form = new FormData();
    form.append("file", input.file);
    return (await api.post(ENDPOINTS.admin.orders.protectedTrace, form, { headers: { "Content-Type": "multipart/form-data" } })).data as TraceResult;
  }
  return (await api.post(ENDPOINTS.admin.orders.protectedTrace, { text: input.text ?? "" })).data as TraceResult;
}

const licence = (orderId: string, id: string, action: string) => `${ENDPOINTS.admin.orders.delivery(orderId)}/licences/${id}/${action}`;
export async function revealLicence(orderId: string, id: string) {
  return ((await api.post(licence(orderId, id, "reveal"))).data as { serial: string }).serial;
}
export async function renewLicence(orderId: string, id: string) {
  return (await api.post(licence(orderId, id, "renew"))).data as { ok: true };
}
export async function stopLicence(orderId: string, id: string) {
  return (await api.post(licence(orderId, id, "stop"))).data as { ok: true };
}
/** Frees a PC from a serial (she changed computers). */
export async function resetActivation(orderId: string, licenceId: string, activationId: string) {
  return (await api.post(`${licence(orderId, licenceId, "activations")}/${activationId}/reset`)).data as { ok: true };
}
export async function restoreLicence(orderId: string, id: string) {
  return (await api.post(licence(orderId, id, "restore"))).data as { ok: true };
}
