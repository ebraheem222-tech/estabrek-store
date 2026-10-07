import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createImageEmbeddingFromBuffer } from "../../lib/imageEmbeddings.js";
import { clipEmbedImage } from "../../lib/clipEmbeddings.js";
import { computeDhashHexFromBuffer, hammingHex } from "../../lib/imageHash.js";
import { extractDominantAndPaletteFromBuffer, hexToRgb, colorDistance } from "../../lib/colorAnalysis.js";
import { listProductsByIds } from "../catalog/catalog.service.js";

type Locale = "ar" | "he" | "en";

export type ImageSearchResult = {
  ok: true;
  source: "openai" | "fallback" | "hash" | "clip";
  caption: string;
  tags: string[];
  products: any[];
  matches: Array<{ productId: string; score: number }>;
  totalCandidates: number;
} | {
  ok: false;
  error: string;
};

function asVector(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.map((x) => Number(x));
  if (arr.some((n) => !Number.isFinite(n))) return null;
  return arr;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function computeColorSimilarity(queryColors: string[], candidateColors: string[]): number | null {
  if (!queryColors.length || !candidateColors.length) return null;
  const qrgbs = queryColors.map((c) => hexToRgb(c)).filter(Boolean) as Array<{ r: number; g: number; b: number }>;
  const crgbs = candidateColors.map((c) => hexToRgb(c)).filter(Boolean) as Array<{ r: number; g: number; b: number }>;
  if (!qrgbs.length || !crgbs.length) return null;
  const maxDist = Math.sqrt(255 * 255 * 3);
  let best = 0;
  for (const q of qrgbs) {
    for (const c of crgbs) {
      const dist = colorDistance(q, c);
      const score = clamp01(1 - dist / maxDist);
      if (score > best) best = score;
    }
  }
  return best;
}

async function searchByEmbedding(
  query: number[],
  opts: {
    limit: number;
    source: "openai" | "clip";
    caption?: string;
    tags?: string[];
    model?: string;
    queryColors?: string[];
    queryHash?: string | null;
  }
): Promise<ImageSearchResult> {
  const minScoreDefault = opts.source === "clip" ? 0.23 : 0.2;
  const minScore = Number(process.env.IMAGE_SEARCH_MIN_SCORE ?? minScoreDefault);
  const colorWeightRaw = Number(process.env.IMAGE_SEARCH_COLOR_WEIGHT ?? 0.28);
  const hashWeightRaw = Number(process.env.IMAGE_SEARCH_HASH_WEIGHT ?? 0.15);
  const minColorScore = Number(process.env.IMAGE_SEARCH_COLOR_MIN_SCORE ?? 0.2);
  const colorFilter = String(process.env.IMAGE_SEARCH_COLOR_FILTER ?? "") === "1";
  const strongHash = Number(process.env.IMAGE_SEARCH_HASH_STRONG ?? 0.92);
  let colorWeight = clamp01(colorWeightRaw);
  let hashWeight = clamp01(hashWeightRaw);
  if (colorWeight + hashWeight > 0.85) {
    const scale = 0.85 / (colorWeight + hashWeight);
    colorWeight *= scale;
    hashWeight *= scale;
  }
  const baseWeight = Math.max(0, 1 - colorWeight - hashWeight);
  const images = await prisma.productItemImage.findMany({
    where: {
      embedding: { not: Prisma.DbNull },
      ...(opts.model ? { embeddingModel: opts.model } : {}),
      item: {
        isActive: true,
        product: { isActive: true },
      },
    },
    select: {
      embedding: true,
      imageHash: true,
      dominantColorHex: true,
      palette: true,
      item: { select: { productId: true } },
    },
  });

  const totalCandidates = images.length;
  if (!totalCandidates) {
    return {
      ok: true,
      source: opts.source,
      caption: opts.caption ?? "",
      tags: opts.tags ?? [],
      products: [],
      matches: [],
      totalCandidates: 0,
    };
  }

  const scores = new Map<string, number>();

  for (const img of images) {
    const vec = asVector(img.embedding);
    if (!vec) continue;
    if (vec.length !== query.length) continue;
    const score = cosineSimilarity(query, vec);
    if (!Number.isFinite(score)) continue;
    const hashScore = opts.queryHash && img.imageHash
      ? clamp01(1 - hammingHex(String(opts.queryHash), String(img.imageHash)) / (String(opts.queryHash).length * 4))
      : null;
    const allowByHash = hashScore != null && hashScore >= strongHash;
    if (!allowByHash && Number.isFinite(minScore) && score < minScore) continue;

    const candidateColors = [
      img.dominantColorHex ? String(img.dominantColorHex) : null,
      ...(Array.isArray(img.palette) ? img.palette.map((x: any) => String(x)) : []),
    ].filter(Boolean) as string[];
    const colorScore = opts.queryColors ? computeColorSimilarity(opts.queryColors, candidateColors) : null;
    if (colorFilter && colorScore != null && colorScore < minColorScore) continue;

    const finalScore =
      score * baseWeight +
      (colorScore != null ? colorScore : 0) * colorWeight +
      (hashScore != null ? hashScore : 0) * hashWeight;
    const productId = img.item?.productId ? String(img.item.productId) : null;
    if (!productId) continue;
    const prev = scores.get(productId);
    if (prev == null || finalScore > prev) scores.set(productId, finalScore);
  }

  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.limit);

  const ids = ranked.map(([id]) => id);
  const products = await listProductsByIds(ids);

  return {
    ok: true,
    source: opts.source,
    caption: opts.caption ?? "",
    tags: opts.tags ?? [],
    products,
    matches: ranked.map(([productId, score]) => ({ productId, score })),
    totalCandidates,
  };
}

export async function searchProductsByImageBuffer(
  buffer: Buffer,
  mime: string,
  opts?: { limit?: number; locale?: Locale }
): Promise<ImageSearchResult> {
  const limit = Math.min(48, Math.max(1, Number(opts?.limit ?? 24)));
  const provider = (process.env.IMAGE_SEARCH_PROVIDER ?? "").toLowerCase();
  const queryHash = await computeDhashHexFromBuffer(buffer);
  const queryColors = await (async () => {
    try {
      const c = await extractDominantAndPaletteFromBuffer(buffer);
      const colors = [c.dominantColorHex, ...(c.palette ?? [])].filter(Boolean) as string[];
      return Array.from(new Set(colors));
    } catch {
      return [] as string[];
    }
  })();
  if (provider === "clip") {
    const clip = await clipEmbedImage(buffer);
    if (!clip.ok) {
      const hash = await computeDhashHexFromBuffer(buffer);
      if (!hash) return { ok: false, error: clip.error };
      return await searchByHash(hash, limit);
    }
    return await searchByEmbedding(clip.embedding, {
      limit,
      source: "clip",
      caption: "",
      tags: [],
      model: clip.model,
      queryColors,
      queryHash,
    });
  }
  const useHashOnly = provider === "hash" || (!process.env.OPENAI_API_KEY && provider !== "openai");
  if (useHashOnly) {
    const hash = queryHash ?? (await computeDhashHexFromBuffer(buffer));
    if (!hash) return { ok: false, error: "IMAGE_HASH_FAILED" };
    return await searchByHash(hash, limit);
  }

  const embedded = await createImageEmbeddingFromBuffer(buffer, mime, { locale: opts?.locale ?? "en" });
  if (!embedded.ok) {
    if (provider === "openai") return { ok: false, error: embedded.error };
    const hash = await computeDhashHexFromBuffer(buffer);
    if (!hash) return { ok: false, error: embedded.error };
    return await searchByHash(hash, limit);
  }
  return await searchByEmbedding(embedded.embedding, {
    limit,
    source: "openai",
    caption: embedded.caption,
    tags: embedded.tags,
    model: embedded.model,
    queryColors,
    queryHash,
  });
}

async function searchByHash(hash: string, limit: number): Promise<ImageSearchResult> {
  const minScore = Number(process.env.IMAGE_HASH_MIN_SCORE ?? 0.65);
  const images = await prisma.productItemImage.findMany({
    where: {
      imageHash: { not: null },
      item: {
        isActive: true,
        product: { isActive: true },
      },
    },
    select: {
      imageHash: true,
      item: { select: { productId: true } },
    },
  });

  const totalCandidates = images.length;
  if (!totalCandidates) {
    return {
      ok: true,
      source: "hash",
      caption: "",
      tags: [],
      products: [],
      matches: [],
      totalCandidates: 0,
    };
  }

  const maxBits = hash.length * 4;
  const scores = new Map<string, number>();
  for (const img of images) {
    const other = img.imageHash ? String(img.imageHash) : "";
    if (!other) continue;
    const dist = hammingHex(hash, other);
    if (!Number.isFinite(dist)) continue;
    const score = maxBits > 0 ? 1 - dist / maxBits : 0;
    if (Number.isFinite(minScore) && score < minScore) continue;
    const productId = img.item?.productId ? String(img.item.productId) : null;
    if (!productId) continue;
    const prev = scores.get(productId);
    if (prev == null || score > prev) scores.set(productId, score);
  }

  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const ids = ranked.map(([id]) => id);
  const products = await listProductsByIds(ids);

  return {
    ok: true,
    source: "hash",
    caption: "",
    tags: [],
    products,
    matches: ranked.map(([productId, score]) => ({ productId, score })),
    totalCandidates,
  };
}
