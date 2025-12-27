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

const getProductsPageCached = unstable_cache(async (page: number) => {
  return await listProducts({ page, pageSize: 500 });
}, ["sitemap-products-page"], { revalidate: 60 * 60 });


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
  const cats = await listCategories().catch(() => []);
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
  const pageSize = 200;
  const maxPages = 25; // up to 5000 urls
  for (let page = 1; page <= maxPages; page++) {
    const res = await listProducts({ page, pageSize }).catch(() => null);
    const items = (res as any)?.items || [];
    for (const p of items) {
      if (!p?.slug) continue;
      out.push({
        url: `${SITE}/p/${encodeURIComponent(String(p.slug))}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    const totalPages = Number((res as any)?.totalPages || 1);
    if (page >= totalPages) break;
  }

  return out;
}
