// src/api/uploads.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type MediaImage = {
  id: string;
  filename: string;
  displayName: string | null;
  folder: string | null;
  tags: string[];
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  path: string; // /uploads/images/xxx.jpg
  url: string; // http://host/uploads/images/xxx.jpg
  createdAt: string;
  updatedAt: string;
  dominantColorHex?: string | null;
  palette?: string[] | null;
};

export type ListImagesResponse = {
  items: MediaImage[];
  nextCursor: string | null;
};

export type UploadImagesResponse = { files: MediaImage[] };

export type MediaFolder = { id: string; name: string; folder: string; count: number };
export type ListFoldersResponse = { folders: MediaFolder[]; unfiledCount?: number };
export type ListTagsResponse = { tags: Array<{ tag: string; count: number }> };
export type DuplicatesMode = "exact" | "near";

export type DuplicateGroupExact = {
  hash: string;
  count: number;
  items: MediaImage[];
};

export type DuplicateGroupNear = {
  baseId: string;
  baseHash: string;
  items: Array<{ distance: number; item: MediaImage }>;
};

export type ListDuplicatesResponse =
  | { mode: "exact"; groups: DuplicateGroupExact[] }
  | { mode: "near"; maxDistance: number; scanLimit: number; groups: DuplicateGroupNear[] };

export type MediaUsage =
  | { kind: "settings"; field: string }
  | { kind: "page"; pageId: string; slug: string; field: string }
  | { kind: "page_section"; pageId: string; slug: string; sectionId: string; sectionType: string }
  | { kind: "product"; productId: string; productSlug: string; productTitle: string; itemId: string; colorName: string; imageId: string };

/**
 * POST /v1/admin/uploads/images
 * multipart fields:
 *  - files[] (or file)
 *  - folder?: string
 *  - tags?: comma string OR JSON array
 */
export async function uploadImages(files: File[], opts?: { folder?: string | null; tags?: string[]; keepAsNew?: boolean }) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  if (opts?.folder) form.append("folder", opts.folder);
  if (opts?.tags?.length) form.append("tags", JSON.stringify(opts.tags));
  // A picture made from another (a cut-out) stays a new item even when it looks like one we have.
  if (opts?.keepAsNew) form.append("keepAsNew", "1");

  const res = await api.post(ENDPOINTS.admin.uploads.images, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as UploadImagesResponse;
}

/**
 * GET /v1/admin/uploads/images
 * Query: q, folder, tag, limit, cursor
 */
export async function listImages(params?: { q?: string; folder?: string | null; tag?: string | null; limit?: number; cursor?: string | null }) {
  const res = await api.get(ENDPOINTS.admin.uploads.images, {
    params: {
      q: params?.q || undefined,
      folder: params?.folder || undefined,
      tag: params?.tag || undefined,
      limit: params?.limit ?? 60,
      cursor: params?.cursor || undefined,
    },
  });
  return res.data as ListImagesResponse;
}

export async function listImageFolders() {
  const res = await api.get(ENDPOINTS.admin.uploads.imageFolders);
  return res.data as ListFoldersResponse;
}

export async function createImageFolder(name: string) {
  const res = await api.post(ENDPOINTS.admin.uploads.imageFolders, { name });
  return res.data as { folder: { id: string; name: string } };
}

export async function renameImageFolder(id: string, name: string) {
  const res = await api.patch(ENDPOINTS.admin.uploads.imageFolderById(id), { name });
  return res.data as { folder: { id: string; name: string } };
}

export async function deleteImageFolder(id: string) {
  const res = await api.delete(ENDPOINTS.admin.uploads.imageFolderById(id));
  return res.data as { ok: true };
}

export async function listImageTags() {
  const res = await api.get(ENDPOINTS.admin.uploads.imageTags);
  return res.data as ListTagsResponse;
}

export async function listImageDuplicates(params?: {
  mode?: DuplicatesMode;
  limit?: number;
  perGroup?: number;
  maxDistance?: number;
  scanLimit?: number;
}) {
  const res = await api.get(ENDPOINTS.admin.uploads.imageDuplicates, {
    params: {
      mode: params?.mode,
      limit: params?.limit,
      perGroup: params?.perGroup,
      maxDistance: params?.maxDistance,
      scanLimit: params?.scanLimit,
    },
  });
  return res.data as ListDuplicatesResponse;
}

export async function updateImageMeta(id: string, body: { displayName?: string | null; folder?: string | null; tags?: string[] }) {
  const res = await api.patch(ENDPOINTS.admin.uploads.imageById(id), body);
  return res.data as MediaImage;
}

export async function deleteImage(id: string) {
  const res = await api.delete(ENDPOINTS.admin.uploads.imageById(id));
  return res.data as { ok: true };
}

export async function getImageUsage(id: string) {
  const res = await api.get(ENDPOINTS.admin.uploads.imageUsage(id));
  return res.data as { filename: string; usage: MediaUsage[] };
}

export async function updateImagesBulk(body: {
  ids: string[];
  folder?: string | null;
  setTags?: string[];
  addTags?: string[];
  removeTags?: string[];
}) {
  const res = await api.patch(ENDPOINTS.admin.uploads.imagesBulk, body);
  return res.data as { ok: true };
}

export async function deleteImagesBulk(ids: string[]) {
  const res = await api.delete(ENDPOINTS.admin.uploads.imagesBulk, { data: { ids } });
  return res.data as { ok: true };
}

/** Cloudinary's background removal: switched on in media settings, and the store has Cloudinary. */
export type CloudCutoutStatus = { on: boolean; ready: boolean; transformations: number };

export async function getCloudCutoutStatus() {
  const res = await api.get(ENDPOINTS.admin.uploads.backgroundRemoval);
  return (res.data as { cloudinary: CloudCutoutStatus }).cloudinary;
}

export class CloudCutoutError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * The picture at `url` (on the store's Cloudinary) without its background, as a PNG with
 * transparency. Cloudinary can take up to a minute the first time.
 */
export async function cloudCutout(body: { url: string; fineEdges?: boolean }, signal?: AbortSignal): Promise<Blob> {
  try {
    const res = await api.post(ENDPOINTS.admin.uploads.backgroundRemoval, body, { responseType: "blob", timeout: 150_000, signal });
    return res.data as Blob;
  } catch (e) {
    const ax = e as { response?: { status?: number; data?: unknown }; message?: string };
    let data: { error?: string; message?: string } = {};
    const raw = ax.response?.data;
    if (raw instanceof Blob) data = await raw.text().then((t) => JSON.parse(t)).catch(() => ({}));
    else if (raw && typeof raw === "object") data = raw as typeof data;
    throw new CloudCutoutError(data.error || "CLOUD_FAILED", data.message || ax.message || "", ax.response?.status ?? 0);
  }
}
