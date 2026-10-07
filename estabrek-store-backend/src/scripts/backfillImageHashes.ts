import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs/promises";
import { prisma } from "../lib/prisma.js";
import { computeDhashHex, computeDhashHexFromBuffer } from "../lib/imageHash.js";

type BackfillStats = {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
};

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "images");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(val: any, fallback: number) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function extractFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;
    const last = parts[parts.length - 1]!;
    return last || null;
  } catch {
    return null;
  }
}

async function fetchBuffer(url: string, maxBytes: number): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > maxBytes) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) return null;
    return buf;
  } catch {
    return null;
  }
}

async function hashFromLocalFile(filename: string): Promise<string | null> {
  try {
    const fullPath = path.join(UPLOADS_DIR, filename);
    await fs.access(fullPath);
    return await computeDhashHex(fullPath);
  } catch {
    return null;
  }
}

async function hashFromUrl(url: string, maxBytes: number): Promise<string | null> {
  const buf = await fetchBuffer(url, maxBytes);
  if (!buf) return null;
  return computeDhashHexFromBuffer(buf);
}

async function backfillMediaAssets(opts: {
  force: boolean;
  limit?: number;
  delayMs: number;
  fetchRemote: boolean;
  maxRemoteBytes: number;
}): Promise<BackfillStats> {
  const where = opts.force
    ? { kind: "IMAGE" as const }
    : { kind: "IMAGE" as const, imageHash: null };

  const assets = await prisma.mediaAsset.findMany({
    where,
    select: { id: true, filename: true, url: true, provider: true },
    orderBy: { createdAt: "asc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const stats: BackfillStats = { processed: 0, updated: 0, skipped: 0, failed: 0 };

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    stats.processed++;

    let hash: string | null = null;
    if (asset.provider === "LOCAL") {
      hash = await hashFromLocalFile(asset.filename);
    } else if (opts.fetchRemote && asset.url) {
      hash = await hashFromUrl(asset.url, opts.maxRemoteBytes);
    }

    if (!hash) {
      stats.skipped++;
    } else {
      try {
        await prisma.mediaAsset.update({ where: { id: asset.id }, data: { imageHash: hash } });
        stats.updated++;
      } catch {
        stats.failed++;
      }
    }

    if (opts.delayMs > 0) await sleep(opts.delayMs);
    if ((i + 1) % 50 === 0) {
      console.log(`[media] ${i + 1}/${assets.length} processed...`);
    }
  }

  return stats;
}

async function backfillProductItemImages(opts: {
  force: boolean;
  limit?: number;
  delayMs: number;
  fetchRemote: boolean;
  maxRemoteBytes: number;
}): Promise<BackfillStats> {
  const where = opts.force ? {} : { imageHash: null };

  const images = await prisma.productItemImage.findMany({
    where,
    select: { id: true, url: true },
    orderBy: { createdAt: "asc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const stats: BackfillStats = { processed: 0, updated: 0, skipped: 0, failed: 0 };

  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    stats.processed++;

    let hash: string | null = null;
    if (img.url) {
      const filename = extractFilenameFromUrl(img.url);
      if (filename) {
        const asset = await prisma.mediaAsset.findUnique({ where: { filename }, select: { imageHash: true, url: true } });
        if (asset?.imageHash) {
          hash = asset.imageHash;
        } else if (!hash && asset?.url && opts.fetchRemote) {
          hash = await hashFromUrl(asset.url, opts.maxRemoteBytes);
        }
      }

      if (!hash) {
        const assetByUrl = await prisma.mediaAsset.findFirst({ where: { url: img.url }, select: { imageHash: true } });
        if (assetByUrl?.imageHash) {
          hash = assetByUrl.imageHash;
        }
      }

      if (!hash && opts.fetchRemote) {
        hash = await hashFromUrl(img.url, opts.maxRemoteBytes);
      }
    }

    if (!hash) {
      stats.skipped++;
    } else {
      try {
        await prisma.productItemImage.update({ where: { id: img.id }, data: { imageHash: hash } });
        stats.updated++;
      } catch {
        stats.failed++;
      }
    }

    if (opts.delayMs > 0) await sleep(opts.delayMs);
    if ((i + 1) % 50 === 0) {
      console.log(`[product] ${i + 1}/${images.length} processed...`);
    }
  }

  return stats;
}

async function main() {
  const force = String(process.env.IMAGE_HASH_FORCE ?? "").trim() === "1";
  const limitRaw = toNumber(process.env.IMAGE_HASH_BACKFILL_LIMIT, 0);
  const delayMs = toNumber(process.env.IMAGE_HASH_BACKFILL_DELAY_MS, 50);
  const fetchRemote = String(process.env.IMAGE_HASH_FETCH_REMOTE ?? "").trim() === "1";
  const maxRemoteBytes = toNumber(process.env.IMAGE_HASH_REMOTE_MAX_BYTES, 8_000_000);
  const targets = String(process.env.IMAGE_HASH_TARGETS ?? "media,product")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const limit = limitRaw > 0 ? Math.floor(limitRaw) : undefined;

  console.log(
    `Backfill image hashes: force=${force} limit=${limit ?? "all"} delayMs=${delayMs} fetchRemote=${fetchRemote}`
  );

  if (targets.includes("media")) {
    const stats = await backfillMediaAssets({ force, limit, delayMs, fetchRemote, maxRemoteBytes });
    console.log(`[media] done. processed=${stats.processed} updated=${stats.updated} skipped=${stats.skipped} failed=${stats.failed}`);
  }

  if (targets.includes("product")) {
    const stats = await backfillProductItemImages({ force, limit, delayMs, fetchRemote, maxRemoteBytes });
    console.log(
      `[product] done. processed=${stats.processed} updated=${stats.updated} skipped=${stats.skipped} failed=${stats.failed}`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
