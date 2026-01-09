import { prisma } from "../../lib/prisma.js";
import { createImageEmbeddingFromBuffer } from "../../lib/imageEmbeddings.js";
import { listProductsByIds } from "../catalog/catalog.service.js";

type Locale = "ar" | "he" | "en";

export type ImageSearchResult = {
  ok: true;
  source: "openai" | "fallback";
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

export async function searchProductsByImageBuffer(
  buffer: Buffer,
  mime: string,
  opts?: { limit?: number; locale?: Locale }
): Promise<ImageSearchResult> {
  const limit = Math.min(48, Math.max(1, Number(opts?.limit ?? 24)));
  const embedded = await createImageEmbeddingFromBuffer(buffer, mime, { locale: opts?.locale ?? "en" });
  if (!embedded.ok) return { ok: false, error: embedded.error };

  const images = await prisma.productItemImage.findMany({
    where: {
      embedding: { not: null },
      item: {
        isActive: true,
        product: { isActive: true },
      },
    },
    select: {
      embedding: true,
      item: { select: { productId: true } },
    },
  });

  const totalCandidates = images.length;
  if (!totalCandidates) {
    return {
      ok: true,
      source: "fallback",
      caption: embedded.caption,
      tags: embedded.tags,
      products: [],
      matches: [],
      totalCandidates: 0,
    };
  }

  const query = embedded.embedding;
  const scores = new Map<string, number>();

  for (const img of images) {
    const vec = asVector(img.embedding);
    if (!vec) continue;
    if (vec.length !== query.length) continue;
    const score = cosineSimilarity(query, vec);
    if (!Number.isFinite(score)) continue;
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
    source: "openai",
    caption: embedded.caption,
    tags: embedded.tags,
    products,
    matches: ranked.map(([productId, score]) => ({ productId, score })),
    totalCandidates,
  };
}
