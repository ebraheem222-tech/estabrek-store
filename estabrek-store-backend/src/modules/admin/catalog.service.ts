import { prisma } from "../../lib/prisma.js";
import { AppError, NotFound } from "../../utils/httpError.js";

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
    seoTitle: string | null;
    seoDescription: string | null;
    isActive: boolean;
    categoryId: string;
    typeId: string | null;
    attributes: any;
    eventStartsAt: Date | null;
    eventEndsAt: Date | null;
    eventLocation: string | null;
  }>;
  items?: Array<{
    id?: string;
    colorName: string;
    boxLabel?: string;
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
      originalPrice?: number | null;
      salePrice?: number | null;
      saleStartsAt?: Date | string | null;
      saleEndsAt?: Date | string | null;
      stock?: number;
      lowStockThreshold?: number;
      weightGrams?: number | null;
    }>;
  }>;
  deleteItemIds?: string[];
  deleteImageIds?: string[];
  deleteVariantIds?: string[];
};

export type DeepUpdateResult = NonNullable<Awaited<ReturnType<typeof getProductDeep>>> & {
  /** Sizes/colours that were asked to be removed but have orders: kept (stock 0 / colour hidden). */
  kept: { variants: Array<{ id: string; sku: string }>; items: Array<{ id: string; colorName: string }> };
};

/**
 * Saves the whole product graph (product, colours, photos, sizes) in one transaction.
 *
 * Order matters: removals run first, so a size can be removed and added again
 * (or an SKU reused) in the same save. A size or colour that already has orders
 * can't be deleted (the order keeps pointing at it): its stock goes to 0 and a
 * colour is hidden instead, and the response lists what was kept.
 */
export async function updateProductDeep(productId: string, input: DeepInput, ctx?: { adminUserId?: string | null; reason?: string }): Promise<DeepUpdateResult> {
  const kept: DeepUpdateResult["kept"] = { variants: [], items: [] };
  await prisma.$transaction(
    async (tx) => {
    let resolvedAdminUserId: string | null = null;
    if (ctx?.adminUserId) {
      const u = await tx.adminUser.findUnique({ where: { id: ctx.adminUserId }, select: { id: true } });
      resolvedAdminUserId = u?.id ?? null;
    }
    const reasonBase = ctx?.reason ?? "Product edit";

    // 0) everything referenced by id must belong to this product
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            colorName: true,
            images: { select: { id: true } },
            variants: { select: { id: true, sku: true, sizeId: true, stock: true, productItemId: true } },
          },
        },
      },
    });
    if (!product) throw NotFound("Product not found");
    const ownItems = new Map(product.items.map((it) => [it.id, it]));
    const ownVariants = new Map(product.items.flatMap((it) => it.variants).map((v) => [v.id, v]));
    const ownImages = new Set(product.items.flatMap((it) => it.images.map((im) => im.id)));
    const foreign: string[] = [];
    for (const it of input.items ?? []) {
      if (it.id && !ownItems.has(it.id)) foreign.push(it.id);
      for (const v of it.variants ?? []) if (v.id && !ownVariants.has(v.id)) foreign.push(v.id);
      for (const im of it.images ?? []) if (im.id && !ownImages.has(im.id)) foreign.push(im.id);
    }
    for (const id of input.deleteItemIds ?? []) if (!ownItems.has(id)) foreign.push(id);
    for (const id of input.deleteVariantIds ?? []) if (!ownVariants.has(id)) foreign.push(id);
    for (const id of input.deleteImageIds ?? []) if (!ownImages.has(id)) foreign.push(id);
    if (foreign.length) throw new AppError(400, "NOT_IN_PRODUCT", "Some colours, sizes or photos belong to another product", { ids: foreign });

    // SKUs must be unique within what was sent.
    const incoming = (input.items ?? []).flatMap((it) => (it.variants ?? []).map((v) => ({ ...v, sku: v.sku.trim() })));
    const seen = new Map<string, number>();
    for (const v of incoming) seen.set(v.sku.toUpperCase(), (seen.get(v.sku.toUpperCase()) ?? 0) + 1);
    const dupes = [...seen].filter(([, n]) => n > 1).map(([sku]) => sku);
    if (dupes.length) throw new AppError(400, "DUPLICATE_SKU", "The same SKU is used twice", { skus: dupes });

    // 1) removals first
    const updatedIds = new Set(incoming.filter((v) => v.id).map((v) => v.id!));
    const itemIdsToDelete = new Set(input.deleteItemIds ?? []);
    const variantIdsToDelete = new Set((input.deleteVariantIds ?? []).filter((id) => !updatedIds.has(id)));
    for (const itemId of itemIdsToDelete) for (const v of ownItems.get(itemId)!.variants) if (!updatedIds.has(v.id)) variantIdsToDelete.add(v.id);
    const ordered = variantIdsToDelete.size
      ? new Set([
          ...(await tx.orderRequest.findMany({ where: { variantId: { in: [...variantIdsToDelete] } }, select: { variantId: true }, distinct: ["variantId"] })).map((o) => o.variantId),
          ...(await tx.orderRequestItem.findMany({ where: { variantId: { in: [...variantIdsToDelete] } }, select: { variantId: true }, distinct: ["variantId"] })).map((o) => o.variantId),
        ])
      : new Set<string>();
    const keptVariantByKey = new Map<string, string>();
    for (const id of variantIdsToDelete) {
      if (!ordered.has(id)) continue;
      const v = ownVariants.get(id)!;
      kept.variants.push({ id, sku: v.sku });
      keptVariantByKey.set(`${v.productItemId}:${v.sizeId}`, id);
      if (v.stock !== 0) {
        await tx.productVariant.update({ where: { id }, data: { stock: 0 } });
        await tx.inventoryAdjustment.create({
          data: { variantId: id, delta: -v.stock, beforeStock: v.stock, afterStock: 0, reason: "Size removed (kept: has orders)", adminUserId: resolvedAdminUserId },
        });
      }
    }
    const deletable = [...variantIdsToDelete].filter((id) => !ordered.has(id));
    if (deletable.length) await tx.productVariant.deleteMany({ where: { id: { in: deletable } } });
    if (input.deleteImageIds?.length) await tx.productItemImage.deleteMany({ where: { id: { in: input.deleteImageIds } } });
    for (const itemId of itemIdsToDelete) {
      const stillUsed = ownItems.get(itemId)!.variants.some((v) => ordered.has(v.id) || updatedIds.has(v.id));
      if (stillUsed) {
        await tx.productItem.update({ where: { id: itemId }, data: { isActive: false } });
        kept.items.push({ id: itemId, colorName: ownItems.get(itemId)!.colorName });
      } else {
        await tx.productItem.delete({ where: { id: itemId } });
      }
    }

    // SKUs taken by any other size (another product, or one of ours that is not being changed)
    if (incoming.length) {
      const taken = await tx.productVariant.findMany({
        where: {
          sku: { in: incoming.map((v) => v.sku), mode: "insensitive" },
          id: { notIn: [...updatedIds, ...deletable] },
        },
        select: { id: true, sku: true, item: { select: { productId: true, product: { select: { title: true } } } } },
      });
      // A re-added size that was kept for its orders takes its old row back (and may keep its SKU).
      const reusable = new Set(keptVariantByKey.values());
      const clash = taken.filter((t) => !reusable.has(t.id));
      if (clash.length) {
        throw new AppError(409, "SKU_TAKEN", "Some SKUs are already used", {
          skus: clash.map((t) => t.sku),
          products: clash.map((t) => ({ sku: t.sku, productId: t.item.productId, title: t.item.product.title })),
        });
      }
    }

    // 2) product fields
    if (input.product && Object.keys(input.product).length) {
      await tx.product.update({ where: { id: productId }, data: input.product });
    }

    // Changed SKUs step aside first, so two sizes can swap codes.
    for (const v of incoming) {
      if (!v.id) continue;
      const cur = ownVariants.get(v.id);
      if (cur && cur.sku !== v.sku) await tx.productVariant.update({ where: { id: v.id }, data: { sku: `~${v.id}` } });
    }

    // 3) items / images / variants
    for (const it of input.items ?? []) {
      let itemId = it.id;

      if (!itemId) {
        const created = await tx.productItem.create({
          data: {
            productId,
            colorName: it.colorName,
            boxLabel: it.boxLabel ?? "",
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
            boxLabel: it.boxLabel ?? "",
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
      for (const raw of it.variants ?? []) {
        const v = { ...raw, sku: raw.sku.trim() };
        // A size removed earlier but kept for its orders comes back as the same row.
        const revivedId = !v.id && it.id ? keptVariantByKey.get(`${it.id}:${v.sizeId}`) : undefined;
        const variantId = v.id ?? revivedId;
        if (variantId) {
          const before = await tx.productVariant.findUnique({
            where: { id: variantId },
            select: { stock: true, price: true, originalPrice: true },
          });
          const shouldResolveOriginal = v.salePrice !== undefined && v.salePrice !== null && v.originalPrice === undefined;
          const baseOriginal =
            v.originalPrice ??
            (typeof v.price === "number" ? v.price : null) ??
            (before?.originalPrice as any)?.toNumber?.() ??
            (before?.price as any)?.toNumber?.() ??
            null;

          const data = {
            sizeId: v.sizeId,
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt ?? null,
            originalPrice:
              v.originalPrice !== undefined
                ? v.originalPrice ?? null
                : shouldResolveOriginal
                ? baseOriginal
                : undefined,
            salePrice: v.salePrice !== undefined ? v.salePrice ?? null : undefined,
            saleStartsAt: v.saleStartsAt !== undefined ? (v.saleStartsAt ?? null) : undefined,
            saleEndsAt: v.saleEndsAt !== undefined ? (v.saleEndsAt ?? null) : undefined,
            stock: typeof v.stock === "number" ? v.stock : undefined,
            lowStockThreshold: typeof v.lowStockThreshold === "number" ? v.lowStockThreshold : undefined,
            weightGrams: v.weightGrams !== undefined ? v.weightGrams ?? null : undefined,
          } as any;

          const updated = await tx.productVariant.update({ where: { id: variantId }, data });
          if (revivedId) kept.variants = kept.variants.filter((k) => k.id !== revivedId);

          if (before && before.stock !== updated.stock) {
            await tx.inventoryAdjustment.create({
              data: {
                variantId,
                delta: updated.stock - before.stock,
                beforeStock: before.stock,
                afterStock: updated.stock,
                reason: reasonBase,
                adminUserId: resolvedAdminUserId,
              },
            });
          }
        } else {
          const baseOriginal = v.originalPrice ?? (typeof v.price === "number" ? v.price : null);
          const created = await tx.productVariant.create({
            data: {
              productItemId: itemId!,
              sizeId: v.sizeId,
              sku: v.sku,
              price: v.price,
              compareAt: v.compareAt ?? null,
              originalPrice: v.originalPrice ?? (v.salePrice != null ? baseOriginal : null),
              salePrice: v.salePrice ?? null,
              saleStartsAt: v.saleStartsAt ?? null,
              saleEndsAt: v.saleEndsAt ?? null,
              stock: typeof v.stock === "number" ? v.stock : undefined,
              lowStockThreshold: typeof v.lowStockThreshold === "number" ? v.lowStockThreshold : undefined,
              weightGrams: v.weightGrams ?? null,
            },
          });
          // Opening stock is part of the history too.
          if (created.stock > 0) {
            await tx.inventoryAdjustment.create({
              data: { variantId: created.id, delta: created.stock, beforeStock: 0, afterStock: created.stock, reason: `${reasonBase} (new size)`, adminUserId: resolvedAdminUserId },
            });
          }
        }
      }
    }
    // A kept colour that came back in this save is visible again.
    kept.items = kept.items.filter((k) => !(input.items ?? []).some((it) => it.id === k.id));
    },
    {
      // This endpoint can touch many rows; give the transaction more time.
      timeout: 20_000,
      maxWait: 5_000,
    }
  );

  // Fetch outside the transaction to avoid holding it open longer than needed.
  const out = await getProductDeep(productId);
  return { ...(out as NonNullable<typeof out>), kept };
}
