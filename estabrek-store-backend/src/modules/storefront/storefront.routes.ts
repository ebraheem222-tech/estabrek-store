import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { getPublicSettings } from "../settings/settings.service.js";
import { PageBySlugQuery, StorefrontListProductsQuery, StorefrontSearchSuggestQuery } from "./storefront.schemas.js";

const r = Router();

/**
 * Storefront Contract (public, no auth)
 *
 * GET /v1/storefront/bootstrap
 *  - returns site settings + primary/footer menus + list of published pages
 *
 * GET /v1/storefront/pages
 *  - list published pages (id, name, slug, updatedAt, canonicalUrl)
 *
 * GET /v1/storefront/page?slug=/about
 *  - one published page + visible sections ordered (and page scripts/css)
 */
r.get("/bootstrap", asyncHandler(async (_req, res) => {
  const [settings, pages] = await Promise.all([
    getPublicSettings(),
    prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true, slug: true, updatedAt: true, canonicalUrl: true, seoTitle: true, seoDescription: true, ogImageUrl: true, noIndex: true },
      orderBy: { slug: "asc" },
    }),
  ]);

  res.json({ ...settings, pages });
}));

r.get("/pages", asyncHandler(async (_req, res) => {
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, name: true, slug: true, updatedAt: true, canonicalUrl: true, seoTitle: true, seoDescription: true, ogImageUrl: true, noIndex: true },
    orderBy: { slug: "asc" },
  });
  res.json({ pages });
}));

r.get("/page", validate({ query: PageBySlugQuery }), asyncHandler(async (req, res) => {
  const slug = String((req.query as any).slug);
  const locale = String((req.query as any).locale ?? "ar") as ("ar"|"he"|"en");

  const page = await prisma.page.findUnique({
    where: { slug },
    include: {
      translations: { where: { locale } },
      sections: {
        where: { isVisible: true },
        orderBy: { order: "asc" },
        include: { translations: { where: { locale } } },
      },
    },
  });

  if (!page || page.status !== "PUBLISHED") return res.status(404).json({ error: "NOT_FOUND" });

  // i18n (DB): apply per-locale overrides from PageTranslation / PageSectionTranslation
  const pt = (page as any).translations?.[0];
  const outPage: any = { ...page };

  if (pt) {
    outPage.seoTitle = pt.seoTitle ?? outPage.seoTitle;
    outPage.seoDescription = pt.seoDescription ?? outPage.seoDescription;
    outPage.ogImageUrl = pt.ogImageUrl ?? outPage.ogImageUrl;
    outPage.canonicalUrl = pt.canonicalUrl ?? outPage.canonicalUrl;
    outPage.noIndex = (pt.noIndex ?? outPage.noIndex) as any;
    outPage.headScripts = pt.headScripts ?? outPage.headScripts;
    outPage.bodyScripts = pt.bodyScripts ?? outPage.bodyScripts;
    outPage.customCss = pt.customCss ?? outPage.customCss;
  }

  // sections: replace data where translated
  const outSections = (page as any).sections.map((s: any) => {
    const st = s.translations?.[0];
    if (st?.data) return { ...s, data: st.data };
    return s;
  });

res.json({
    id: outPage.id,
    name: outPage.name,
    slug: outPage.slug,
    status: outPage.status,
    sections: outSections,
    headScripts: outPage.headScripts,
    bodyScripts: outPage.bodyScripts,
    customCss: outPage.customCss,
    canonicalUrl: outPage.canonicalUrl,
    seoTitle: outPage.seoTitle,
    seoDescription: outPage.seoDescription,
    ogImageUrl: outPage.ogImageUrl,
    noIndex: outPage.noIndex,
    updatedAt: outPage.updatedAt,
    createdAt: outPage.createdAt,
  });
}));

/**
 * Product discovery helpers for landing pages
 *
 * GET /v1/storefront/products/new-arrivals?limit=12
 * GET /v1/storefront/products/best-sellers?limit=12
 */
r.get("/products/new-arrivals", validate({ query: StorefrontListProductsQuery }), asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number((req.query as any).limit ?? 12)));

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ productIds: products.map((p) => p.id) });
}));

r.get("/products/best-sellers", validate({ query: StorefrontListProductsQuery }), asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number((req.query as any).limit ?? 12)));

  // "Best sellers" heuristic: sum OrderRequestItem quantities per product.
  const top = await prisma.orderRequestItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const ids = top.map((x) => x.productId).filter(Boolean);

  // If there are no orders yet, fallback to newest.
  if (!ids.length) {
    const newest = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json({ productIds: newest.map((p) => p.id) });
  }

  // Keep ordering as returned from groupBy
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true },
  });
  const set = new Set(products.map((p) => p.id));
  const ordered = ids.filter((id) => set.has(id));

  res.json({ productIds: ordered });
}));

/**
 * Search helpers (typeahead)
 *
 * GET /v1/storefront/search/suggest?q=sh&limit=6
 * Returns lightweight suggestions for products + categories.
 */
r.get("/search/suggest", validate({ query: StorefrontSearchSuggestQuery }), asyncHandler(async (req, res) => {
  const q = String((req.query as any).q ?? "").trim();
  const limit = Math.min(20, Math.max(1, Number((req.query as any).limit ?? 6)));

  if (!q) return res.json({ products: [], categories: [] });

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, slug: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: Math.min(limit, 8),
    }),
  ]);

  res.json({ products, categories });
}));

/**
 * Search suggestions (typeahead)
 *
 * GET /v1/storefront/search/suggest?q=shirt&limit=6
 */
r.get("/search/suggest", validate({ query: StorefrontSearchSuggestQuery }), asyncHandler(async (req, res) => {
  const q = String((req.query as any).q).trim();
  const limit = Math.min(20, Math.max(1, Number((req.query as any).limit ?? 6)));

  // Products
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      title: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  // Categories
  const categories = await prisma.category.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(10, limit),
  });

  res.json({
    products,
    categories,
  });
}));

export default r;
