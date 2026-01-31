import { prisma } from "../../lib/prisma.js";

export async function getProductDeep(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      items: {
        include: {
          images: { orderBy: { position: "asc" } },
          variants: { include: { size: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

type DeepInput = {
  product?: Partial<{
    title: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    categoryId: string;
  }>;
  items?: Array<{
    id?: string;
    colorName: string;
    colorHex?: string | null;
    suggestedColors?: string[];
    skuBase: string;
    isActive?: boolean;
    images?: Array<{
      id?: string;
      url: string;
      alt?: string | null;
      position?: number;
      isPrimary?: boolean;
      view?: string | null;
    }>;
    variants?: Array<{
      id?: string;
      sizeId: string;
      sku: string;
      price: number;
      compareAt?: number | null;
      stock?: number;
      lowStockThreshold?: number;
      weightGrams?: number | null;
    }>;
  }>;
  deleteItemIds?: string[];
  deleteImageIds?: string[];
  deleteVariantIds?: string[];
};

export async function updateProductDeep(productId: string, input: DeepInput, ctx?: { adminUserId?: string | null; reason?: string }) {
  await prisma.$transaction(
    async (tx) => {
    let resolvedAdminUserId: string | null = null;
    if (ctx?.adminUserId) {
      const u = await tx.adminUser.findUnique({ where: { id: ctx.adminUserId }, select: { id: true } });
      resolvedAdminUserId = u?.id ?? null;
    }
    const reasonBase = ctx?.reason ?? "Product edit";
    // 1) update product
    if (input.product && Object.keys(input.product).length) {
      await tx.product.update({ where: { id: productId }, data: input.product });
    }

    // 2) items / images / variants
    for (const it of input.items ?? []) {
      let itemId = it.id;

      if (!itemId) {
        const created = await tx.productItem.create({
          data: {
            productId,
            colorName: it.colorName,
            colorHex: it.colorHex ?? null,
            suggestedColors: it.suggestedColors ?? undefined,
            skuBase: it.skuBase,
            isActive: it.isActive ?? true,
          },
        });
        itemId = created.id;
      } else {
        await tx.productItem.update({
          where: { id: itemId },
          data: {
            colorName: it.colorName,
            colorHex: it.colorHex ?? null,
            suggestedColors: it.suggestedColors ?? undefined,
            skuBase: it.skuBase,
            isActive: it.isActive ?? undefined,
          },
        });
      }

      // images
      for (const im of it.images ?? []) {
        if (im.id) {
          await tx.productItemImage.update({
            where: { id: im.id },
            data: {
              url: im.url,
              alt: im.alt ?? null,
              position: im.position ?? 0,
              isPrimary: im.isPrimary ?? false,
              view: (im as any).view ?? null,
              dominantColorHex: (im as any).dominantColorHex ?? null,
              palette: (im as any).palette ?? null,
            
            },
          });
        } else {
          await tx.productItemImage.create({
            data: {
              productItemId: itemId!,
              url: im.url,
              alt: im.alt ?? null,
              position: im.position ?? 0,
              isPrimary: im.isPrimary ?? false,
              view: (im as any).view ?? null,
              dominantColorHex: (im as any).dominantColorHex ?? null,
              palette: (im as any).palette ?? null,
            
            },
          });
        }
      }

      // variants
      for (const v of it.variants ?? []) {
        if (v.id) {
                  const before =
                    typeof v.stock === "number"
                      ? await tx.productVariant.findUnique({ where: { id: v.id }, select: { stock: true } })
                      : null;

                  const updated = await tx.productVariant.update({
                    where: { id: v.id },
                    data: {
                      sizeId: v.sizeId,
                      sku: v.sku,
                      price: v.price,
                      compareAt: v.compareAt ?? null,
                      stock: typeof v.stock === "number" ? v.stock : undefined,
                      lowStockThreshold: typeof v.lowStockThreshold === "number" ? v.lowStockThreshold : undefined,
                      weightGrams: v.weightGrams ?? null,
                    },
                  });

                  if (typeof v.stock === "number" && before && before.stock !== updated.stock) {
                    await tx.inventoryAdjustment.create({
                      data: {
                        variantId: v.id,
                        delta: updated.stock - before.stock,
                        beforeStock: before.stock,
                        afterStock: updated.stock,
                        reason: reasonBase,
                        adminUserId: resolvedAdminUserId,
                      },
                    });
                  }
                } else {
          await tx.productVariant.create({
            data: {
              productItemId: itemId!,
              sizeId: v.sizeId,
              sku: v.sku,
              price: v.price,
              compareAt: v.compareAt ?? null,
              stock: typeof v.stock === "number" ? v.stock : undefined,
              lowStockThreshold: typeof v.lowStockThreshold === "number" ? v.lowStockThreshold : undefined,
              weightGrams: v.weightGrams ?? null,
            },
          });
        }
      }
    }

    // 3) explicit deletes
    if (input.deleteVariantIds?.length) {
      await tx.productVariant.deleteMany({ where: { id: { in: input.deleteVariantIds } } });
    }
    if (input.deleteImageIds?.length) {
      await tx.productItemImage.deleteMany({ where: { id: { in: input.deleteImageIds } } });
    }
    if (input.deleteItemIds?.length) {
      await tx.productItem.deleteMany({ where: { id: { in: input.deleteItemIds } } });
    }

    },
    {
      // This endpoint can touch many rows; give the transaction more time.
      timeout: 20_000,
      maxWait: 5_000,
    }
  );

  // Fetch outside the transaction to avoid holding it open longer than needed.
  return getProductDeep(productId);
}
