import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { listCategories, listProducts, listPages } from "@/lib/api";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";


const getPagesCached = unstable_cache(async () => {
  return await listPages();
}, ["sitemap-pages"], { revalidate: 60 * 60 });

const getCategoriesCached = unstable_cache(async () => {
  return await listCategories();
}, ["sitemap-categories"], { revalidate: 60 * 60 });

function getProductsPageCached(page: number, pageSize: number) {
  return unstable_cache(
    async () => listProducts({ page, pageSize }),
    ["sitemap-products-page", String(page), String(pageSize)],
    { revalidate: 60 * 60 }
  )();
}


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const out: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  // CMS pages
  const pages = await getPagesCached().catch(() => []);
  for (const p of (pages as any[]) || []) {
    if (!p?.slug || p.slug === "/") continue;
    out.push({
      url: `${SITE}${p.slug.startsWith("/") ? p.slug : `/${p.slug}`}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Categories
  const cats = await getCategoriesCached().catch(() => []);
  const walk = (arr: any[]) => {
    for (const c of arr || []) {
      if (c?.slug) {
        out.push({
          url: `${SITE}/c/${encodeURIComponent(String(c.slug))}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (c?.children?.length) walk(c.children);
    }
  };
  walk(cats as any[]);

  // Products (first N pages to avoid huge sitemap)
  const pageSize = 50;
  const maxPages = 25; // up to 1250 urls

  const pushProducts = (items: any[]) => {
    for (const p of items) {
      if (!p?.slug) continue;
      out.push({
        url: `${SITE}/p/${encodeURIComponent(String(p.slug))}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  };

  const first = await getProductsPageCached(1, pageSize).catch(() => null);
  pushProducts((first as any)?.items || []);
  const totalPages = Math.min(maxPages, Number((first as any)?.totalPages || 1));

  if (totalPages > 1) {
    const pages: number[] = [];
    for (let page = 2; page <= totalPages; page++) pages.push(page);

    const batchSize = 4;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((page) => getProductsPageCached(page, pageSize).catch(() => null))
      );
      for (const res of results) {
        pushProducts((res as any)?.items || []);
      }
    }
  }

  return out;
}
