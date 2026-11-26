/**
 * The product pictures' depth pictures, for the shop's 3D card and product page (Settings: «3D من عمقها»). Each is made
 * here by the depth model on the owner's own device (lib/depth.ts: free, no key; downloaded once), saved in the media
 * library and put on its picture (PUT /admin/catalog/images/:id/depth). One picture at a time, so the device stays
 * usable; a picture that can't be read is passed over, a model that can't run stops them all.
 *
 * After a product is saved while the store shows its pictures in 3D, its new pictures get theirs in the background
 * (`depthsAfterSave`): the owner carries on, and a message says when they are ready.
 */
import { api } from "../api/http";
import { uploadImages } from "../api/uploads.api";
import { getSettings } from "../api/settings.api";
import { getVisualControls } from "../api/visualControls.api";
import { toast } from "./toast";
import { DepthError, depthFile, estimateDepth, type DepthProgress } from "./depth";
import { say } from "../studio/say";

export type DepthImage = { id: string; url: string; depthUrl: string | null; productId: string; title: string };
export type DepthList = { images: DepthImage[]; total: number; done: number };
export type DepthsProgress = { done: number; total: number; current?: DepthImage; model?: DepthProgress };

/** Every product picture (or one product's) and whether it has its depth picture yet. */
export async function listDepthImages(productId?: string): Promise<DepthList> {
  const res = await api.get("/admin/catalog/images/depths", { params: productId ? { productId } : undefined });
  return res.data as DepthList;
}
export async function setImageDepth(id: string, depthUrl: string | null) {
  await api.put(`/admin/catalog/images/${encodeURIComponent(id)}/depth`, { depthUrl });
}

/** Codes that mean no picture can be done on this device now: stop, don't try the next one. */
const FATAL = new Set(["MODEL_DOWNLOAD", "MODEL_CHECK", "NO_WORKER", "ABORTED"]);

/** Makes the depth picture of each picture in turn. */
export async function makeDepths(images: DepthImage[], o: { signal?: AbortSignal; onProgress?: (p: DepthsProgress) => void } = {}) {
  let made = 0, failed = 0;
  for (const [i, im] of images.entries()) {
    if (o.signal?.aborted) throw new DepthError("ABORTED");
    o.onProgress?.({ done: i, total: images.length, current: im });
    try {
      const map = await estimateDepth(im.url, { signal: o.signal, onProgress: (model) => o.onProgress?.({ done: i, total: images.length, current: im, model }) });
      const up = await uploadImages([await depthFile(map, `${im.id}-depth`)], { keepAsNew: true, tags: ["depth"] });
      const url = up.files[0]?.url;
      if (!url) throw new Error("upload");
      await setImageDepth(im.id, url);
      made++;
    } catch (e) {
      if (e instanceof DepthError && FATAL.has(e.code)) throw e;
      failed++;
    }
  }
  o.onProgress?.({ done: images.length, total: images.length });
  return { made, failed };
}

/** Whether the store draws its product pictures in 3D (its product page or its cards). */
export async function store3dOn() {
  const [settings, visual] = await Promise.all([getSettings().catch(() => null), getVisualControls().catch(() => null)]);
  const storefront = ((settings as { header?: { storefront?: { productPictureFx?: unknown } } } | null)?.header?.storefront) ?? {};
  return storefront.productPictureFx === "3d" || visual?.cardDesign?.hover === "3d";
}

// One background run at a time; products saved meanwhile wait their turn.
let queue: Promise<void> = Promise.resolve();
/** After a product is saved: its pictures without a depth picture get one, in the background, when the store uses 3D. */
export function depthsAfterSave(productId: string) {
  queue = queue.then(async () => {
    try {
      if (!(await store3dOn())) return;
      const { images } = await listDepthImages(productId);
      const missing = images.filter((im) => !im.depthUrl);
      if (!missing.length) return;
      const { made } = await makeDepths(missing);
      if (made) toast.success(say(`صار في عمق 3D لـ ${made} من صور المنتج|${made} of the product's pictures are ready in 3D|${made} מתמונות המוצר מוכנות בתלת־ממד`));
    } catch {
      // The shop draws them with a quick depth meanwhile; Settings can make them later.
    }
  });
  return queue;
}
