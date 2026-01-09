import { prisma } from "./prisma.js";
import { getOpenAIEmbeddingModel, openaiEmbedText } from "./openai.js";

type ProductEmbeddingSource = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: { name?: string | null } | null;
  embedding?: any;
  embeddingText?: string | null;
  embeddingModel?: string | null;
};

export type ProductEmbeddingResult =
  | { ok: true; updated: boolean; productId: string }
  | { ok: false; error: string };

function compactText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function buildProductEmbeddingText(product: ProductEmbeddingSource): string {
  const parts: string[] = [];
  if (product.title) parts.push(product.title);
  if (product.category?.name) parts.push(`Category: ${product.category.name}`);
  if (product.description) parts.push(product.description);
  if (product.slug) parts.push(`Slug: ${product.slug}`);
  return compactText(parts.join("\n"));
}

export async function indexProductTextEmbedding(productId: string, opts?: { force?: boolean }): Promise<ProductEmbeddingResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      embedding: true,
      embeddingText: true,
      embeddingModel: true,
      category: { select: { name: true } },
    },
  });

  if (!product) return { ok: false, error: "NOT_FOUND" };

  const text = buildProductEmbeddingText(product);
  if (!text) return { ok: false, error: "EMPTY_TEXT" };

  const model = getOpenAIEmbeddingModel();
  if (!opts?.force && product.embedding && product.embeddingText === text && product.embeddingModel === model) {
    return { ok: true, updated: false, productId: product.id };
  }

  const embedded = await openaiEmbedText(text, model);
  if (!embedded.ok) return { ok: false, error: embedded.error };

  await prisma.product.update({
    where: { id: product.id },
    data: {
      embedding: embedded.embedding as any,
      embeddingText: text,
      embeddingModel: embedded.model,
      embeddingUpdatedAt: new Date(),
    },
  });

  return { ok: true, updated: true, productId: product.id };
}
