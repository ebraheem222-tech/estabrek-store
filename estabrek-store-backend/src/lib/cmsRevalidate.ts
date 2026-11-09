import { cacheDel, cacheDelPrefix } from "./cache.js";
import { revalidateStorefront, type RevalidationResult } from "./storefrontRevalidate.js";

/** A published block changes every page referencing it; ordinary pages retain their paths. */
export async function triggerCmsRevalidate(slugs: Array<string | null | undefined> = []): Promise<RevalidationResult> {
  const paths = slugs.some((s) => s?.startsWith("/__block/") || s?.startsWith("/__component/")) ? [] : [...new Set(slugs.filter((s): s is string => Boolean(s)))];
  try {
    await cacheDel("storefront:pages:published");
    if (paths.length) {
      await Promise.all(paths.flatMap((slug) => ["ar", "he", "en"].map((locale) => cacheDel(`storefront:page:${locale}:${slug}`))));
    } else await cacheDelPrefix("storefront:page:");
    return await revalidateStorefront({ tags: ["cms", "cms:pages", "cms:bootstrap"], paths });
  } catch {
    return { state: "failed", targets: [] };
  }
}
