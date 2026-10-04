// Saves a composed product with the existing API, in as few requests as possible:
// POST /products (the server needs the product first) → GET /full (to drop the
// placeholder colour the server adds) → PUT /full with every colour, photo and size.
import { isAxiosError } from "axios";
import { createProduct, getProductFull, updateProductFull, type CatalogSize } from "../../../api/catalog.api";
import { shortId } from "../../../lib/productComposer";
import { buildItems, effectiveSlug, type ComposerDraft } from "./composerModel";

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
