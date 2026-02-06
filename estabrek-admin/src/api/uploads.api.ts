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
export async function uploadImages(files: File[], opts?: { folder?: string | null; tags?: string[] }) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  if (opts?.folder) form.append("folder", opts.folder);
  if (opts?.tags?.length) form.append("tags", JSON.stringify(opts.tags));

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
