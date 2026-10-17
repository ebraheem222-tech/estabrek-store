import { performance } from "node:perf_hooks";
import { prisma } from "../../lib/prisma.js";
import { cacheOn, isFresh, remember, stampOf } from "../../lib/cache.js";
import { registerWarmer } from "../../lib/cacheWarm.js";
import { cacheKeyFor } from "../../middleware/responseCache.js";
import { getProductById, getProductBySlug } from "./catalog.service.js";

/**
 * How the warm-up (lib/cacheWarm.ts) builds a popular product's pages: the same
 * answers GET /v1/catalog/products/slug/:slug and /products/:id give, kept
 * under the same keys, so the next shopper gets them from the cache.
 */
export function registerCatalogWarmers() {
  registerWarmer("products", async (ids) => {
    if (!cacheOn("products") || !ids.length) return { built: 0, skipped: 0 };
    const rows = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, slug: true } });
    let built = 0;
    let skipped = 0;
    for (const row of rows) {
      const jobs = [
        { key: cacheKeyFor(`/v1/catalog/products/slug/${row.slug}`), load: () => getProductBySlug(row.slug) },
        { key: cacheKeyFor(`/v1/catalog/products/${row.id}`), load: () => getProductById(row.id) },
      ];
      for (const job of jobs) {
        if (isFresh("products", job.key)) {
          skipped += 1;
          continue;
        }
        const stamp = stampOf("products");
        const t0 = performance.now();
        const product = await job.load();
        if (!product) continue;
        const text = JSON.stringify(product);
        if (remember("products", job.key, { body: text, status: 200, text, costMs: performance.now() - t0 }, undefined, stamp, row.id)) built += 1;
      }
    }
    return { built, skipped };
  });
}
