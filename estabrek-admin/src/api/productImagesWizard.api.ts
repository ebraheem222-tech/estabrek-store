import { api } from "./http";
import { compressImage } from "../lib/imageCompress";

export type WizardAsset = {
  id: string;
  filename: string;
  displayName: string | null;
  folder: string | null;
  tags: string[];
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  path: string;
  url: string;
  dominantColorHex?: string | null;
  palette?: string[] | null;
};

export type PendingAssetsResponse = { items: WizardAsset[] };
export type BatchUploadResponse = { files: WizardAsset[] };

export type AutoGroup = {
  groupId: string;
  colorHex: string;
  colorName: string;
  assets: WizardAsset[];
};

export type AutoGroupResponse = { groups: AutoGroup[] };

export async function batchUploadProductImages(productId: string, files: File[]) {
  const fd = new FormData();
  // Phone photos are often 4–8 MB: shrink them first (same as the other upload paths).
  const small = await Promise.all(files.map((f) => compressImage(f, { maxW: 1800, maxH: 1800, quality: 0.86 }).catch(() => f)));
  for (const f of small) fd.append("files", f);
  const { data } = await api.post<BatchUploadResponse>(`/admin/catalog/products/${productId}/images/batch`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listPendingProductImages(productId: string) {
  const { data } = await api.get<PendingAssetsResponse>(`/admin/catalog/products/${productId}/images/pending`);
  return data;
}

export async function autoGroupProductImages(productId: string, assetIds?: string[], threshold?: number) {
  const { data } = await api.post<AutoGroupResponse>(`/admin/catalog/products/${productId}/images/auto-group`, {
    assetIds,
    threshold,
  });
  return data;
}

export type CommitGroupsInput = {
  groups: Array<{
    colorName: string;
    boxLabel?: string;
    colorHex?: string | null;
    assets: Array<{ assetId: string; view?: string | null; alt?: string | null }>;
    /** Optional: create variants during commit (bulk sizes per color) */
    variants?: {
      sizeIds: string[];
      price: number;
      priceBySize?: Record<string, number>;
      compareAt?: number | null;
      stock?: number;
      stockBySize?: Record<string, number>;
      lowStockThreshold?: number;
      weightGrams?: number | null;
    } | null;
  }>;
};

export async function commitProductImageGroups(productId: string, input: CommitGroupsInput) {
  const { data } = await api.post<{ ok: boolean }>(`/admin/catalog/products/${productId}/images/commit-groups`, input);
  return data;
}
