// Saves a composed product with the existing API, in as few requests as possible:
// POST /products (the server needs the product first) → GET /full (to drop the
// placeholder colour the server adds) → PUT /full with every colour, photo and size.
import { isAxiosError } from "axios";
import { createProduct, getProductFull, updateProductFull, type CatalogSize, type ProductDeep, type SaveKept } from "../../../api/catalog.api";
import { backendHasStockTools } from "../../../api/inventory.api";
import { shortId } from "../../../lib/productComposer";
import { buildItems, effectiveSlug, removedIds, type ComposerDraft } from "./composerModel";

export type SaveStep = "create" | "details";

const isConflict = (e: unknown) => isAxiosError(e) && e.response?.status === 409;
const conflictTarget = (e: unknown) => {
  if (!isAxiosError(e)) return "";
  const data = (e.response?.data ?? {}) as { target?: unknown; message?: unknown };
  return JSON.stringify(data.target ?? data.message ?? "");
};

export async function saveComposedProduct(opts: {
  draft: ComposerDraft;
  sizes: CatalogSize[];
  publish: boolean;
  /** Set when an earlier attempt already created the product: never create it twice. */
  existingId?: string | null;
  onStep?: (step: SaveStep) => void;
  onCreated?: (id: string, slug: string) => void;
}): Promise<{ id: string; slug: string }> {
  const { draft, sizes, publish } = opts;
  let id = opts.existingId ?? null;
  let slug = effectiveSlug(draft);

  if (!id) {
    opts.onStep?.("create");
    for (let attempt = 0; ; attempt++) {
      try {
        const created = await createProduct({
          title: draft.title.trim(),
          slug,
          categoryId: draft.categoryId,
          description: draft.description.trim() || null,
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          isActive: false,
        });
        id = created.id;
        slug = created.slug || slug;
        opts.onCreated?.(id, slug);
        break;
      } catch (e) {
        // The link is taken by another product: add a short ending and try again.
        if (isConflict(e) && attempt < 4) { slug = `${effectiveSlug(draft)}-${shortId()}`; continue; }
        throw e;
      }
    }
  }

  opts.onStep?.("details");
  const current = await getProductFull(id!);
  const deleteItemIds = (current.items ?? []).map((it) => it.id);
  let salt: string | undefined;
  for (let attempt = 0; ; attempt++) {
    try {
      await updateProductFull(id!, {
        product: {
          title: draft.title.trim(),
          slug,
          categoryId: draft.categoryId,
          description: draft.description.trim() || null,
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          isActive: publish,
        },
        items: buildItems({ ...draft, slug, slugTouched: true }, sizes, { skuSalt: salt }),
        deleteItemIds,
      });
      return { id: id!, slug };
    } catch (e) {
      // An SKU already exists (e.g. an old product with the same name): make ours unique and retry once.
      if (isConflict(e) && attempt < 2 && /sku/i.test(conflictTarget(e) || "sku")) { salt = shortId(3); continue; }
      throw e;
    }
  }
}

/**
 * Saves changes to an existing product in one request: saved colours, photos and
 * sizes keep their ids; removed ones are deleted (or kept as sold out when they
 * have orders, by the updated backend).
 */
export async function saveEditedProduct(opts: {
  draft: ComposerDraft;
  sizes: CatalogSize[];
  /** Published after the save. */
  publish: boolean;
}): Promise<{ product: ProductDeep; kept: SaveKept | null }> {
  const { draft, sizes, publish } = opts;
  const edit = draft.edit;
  if (!edit) throw new Error("not an existing product");
  // The updated backend keeps stock that isn't sent, so a size sold while this page was
  // open isn't put back. An older backend would reset it to 0, so there we send everything.
  const keepUnchangedStock = await backendHasStockTools();
  const slug = effectiveSlug(draft);
  const res = await updateProductFull(edit.productId, {
    product: {
      title: draft.title.trim(),
      slug,
      categoryId: draft.categoryId,
      description: draft.description.trim() || null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
      isActive: publish,
    },
    items: buildItems(draft, sizes, { keepUnchangedStock }),
    ...removedIds(draft),
  });
  const { kept, ...product } = res;
  return { product: product as ProductDeep, kept: kept ?? null };
}
