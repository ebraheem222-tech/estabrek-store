import { prisma } from "./prisma.js";
import { createImageEmbeddingFromBuffer, loadImageFromUrl } from "./imageEmbeddings.js";

type Locale = "ar" | "he" | "en";

export type ProductImageIndexResult = {
  ok: true;
  imageId: string;
  updated: boolean;
  skipped?: boolean;
} | {
  ok: false;
  imageId?: string;
  error: string;
};

export async function indexProductImageEmbedding(
  imageId: string,
  opts?: { force?: boolean; locale?: Locale }
): Promise<ProductImageIndexResult> {
  const provider = (process.env.IMAGE_SEARCH_PROVIDER ?? "").toLowerCase();
  if (provider === "hash") {
    return { ok: true, imageId, updated: false, skipped: true };
  }

  const img = await prisma.productItemImage.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      url: true,
      embedding: true,
      embeddingUpdatedAt: true,
      item: {
        select: {
          colorName: true,
          product: {
            select: {
              title: true,
              description: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!img) return { ok: false, error: "NOT_FOUND" };
  if (!opts?.force && img.embedding) {
    return { ok: true, imageId: img.id, updated: false, skipped: true };
  }

  if (!img.url) return { ok: false, imageId: img.id, error: "MISSING_IMAGE_URL" };
  const loaded = await loadImageFromUrl(img.url);
  if (!loaded) return { ok: false, imageId: img.id, error: "IMAGE_LOAD_FAILED" };

  const result = await createImageEmbeddingFromBuffer(loaded.buffer, loaded.mime, {
    locale: opts?.locale ?? "en",
    productTitle: img.item?.product?.title ?? null,
    categoryName: img.item?.product?.category?.name ?? null,
    colorName: img.item?.colorName ?? null,
    description: img.item?.product?.description ?? null,
  });

  if (!result.ok) return { ok: false, imageId: img.id, error: result.error };

  await prisma.productItemImage.update({
    where: { id: img.id },
    data: {
      embedding: result.embedding as any,
      embeddingText: result.embeddingText,
      embeddingModel: result.model,
      embeddingUpdatedAt: new Date(),
    },
  });

  return { ok: true, imageId: img.id, updated: true };
}
