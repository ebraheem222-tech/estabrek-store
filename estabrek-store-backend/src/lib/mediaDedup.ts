import { prisma } from "./prisma.js";
import { hammingHex } from "./imageHash.js";

export type MediaDuplicateQuery = {
  hash: string;
  width?: number | null;
  height?: number | null;
  folder?: string | null;
  scope?: "global" | "folder";
  maxDistance?: number;
  limit?: number;
};

type MediaAssetSummary = {
  id: string;
  filename: string;
  url: string | null;
  provider: string;
  providerId: string | null;
  displayName: string | null;
  folder: string | null;
  tags: string[];
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  imageHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_MAX_DISTANCE = 6;
const DEFAULT_LIMIT = 200;
const SIZE_TOLERANCE_PCT = 0.12;
const SIZE_TOLERANCE_PX = 64;

function sizeRange(value: number) {
  const tol = Math.max(SIZE_TOLERANCE_PX, Math.round(value * SIZE_TOLERANCE_PCT));
  return { gte: value - tol, lte: value + tol };
}

export async function findDuplicateMediaAsset(query: MediaDuplicateQuery): Promise<MediaAssetSummary | null> {
  const hash = query.hash;
  if (!hash) return null;

  const width = typeof query.width === "number" && Number.isFinite(query.width) ? query.width : null;
  const height = typeof query.height === "number" && Number.isFinite(query.height) ? query.height : null;
  const maxDistance = Number.isFinite(query.maxDistance as number) ? Number(query.maxDistance) : DEFAULT_MAX_DISTANCE;
  const limit = Number.isFinite(query.limit as number) ? Number(query.limit) : DEFAULT_LIMIT;

  const where: any = {
    kind: "IMAGE",
    imageHash: { not: null },
  };

  if (query.scope === "folder") {
    if (query.folder === null) {
      where.folder = null;
    } else if (query.folder) {
      where.folder = query.folder;
    }
  }

  if (width && height) {
    where.AND = [
      { OR: [{ width: null }, { width: sizeRange(width) }] },
      { OR: [{ height: null }, { height: sizeRange(height) }] },
    ];
  }

  const candidates = await prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      filename: true,
      url: true,
      provider: true,
      providerId: true,
      displayName: true,
      folder: true,
      tags: true,
      mime: true,
      size: true,
      width: true,
      height: true,
      blurDataUrl: true,
      imageHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let best: { dist: number; asset: MediaAssetSummary } | null = null;

  for (const asset of candidates) {
    if (!asset.imageHash) continue;
    const dist = hammingHex(hash, asset.imageHash);
    if (!Number.isFinite(dist)) continue;
    if (dist > maxDistance) continue;
    if (!best || dist < best.dist) {
      best = { dist, asset };
      if (dist === 0) break;
    }
  }

  return best?.asset ?? null;
}
