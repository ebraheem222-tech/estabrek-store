import { Router } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { getPublicSettings } from "../settings/settings.service.js";
import {
  PageBySlugQuery,
  StorefrontListProductsQuery,
  StorefrontSearchSuggestQuery,
  StorefrontCheckoutCreateBody,
  StorefrontCheckoutVerifyQuery,
} from "./storefront.schemas.js";
import chatbot from "./chatbot.routes.js";
import recommend from "./recommend.routes.js";
import { searchProductsByImageBuffer } from "./imageSearch.service.js";
import { loadImageFromUrl } from "../../lib/imageEmbeddings.js";
import { normalizeSearchText, scoreTextMatch } from "../../lib/searchText.js";
import { cacheGet, cacheSet } from "../../lib/cache.js";
import { createCheckoutSession, verifyCheckoutSession } from "./checkout.service.js";

const r = Router();

const PUBLISHED_PAGES_TTL_MS = 60_000;
const PAGE_BY_SLUG_TTL_MS = 30_000;

function resolveStorefrontBaseUrl(req: any) {
  const envUrl =
    process.env.STOREFRONT_PUBLIC_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return String(envUrl).replace(/\/+$/, "");

  const origin = req?.headers?.origin;
  if (origin) return String(origin).replace(/\/+$/, "");

  const forwardedHost = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const proto = forwardedProto ? String(forwardedProto) : req?.protocol || "https";
  if (forwardedHost) return `${proto}://${forwardedHost}`;

  return "http://localhost:3000";
}

function mergeTranslatedData(base: any, override: any): any {
  if (override === undefined || override === null) return base;
  if (base === undefined || base === null) return override;
  if (Array.isArray(base) || Array.isArray(override)) {
    return Array.isArray(override) ? override : base;
  }
  if (typeof base === "object" && typeof override === "object") {
    const out: any = { ...base };
    for (const [k, v] of Object.entries(override)) {
      if (v === undefined) continue;
      out[k] = mergeTranslatedData((base as any)[k], v);
    }
    return out;
  }
  return override;
}

async function getPublishedPagesCached() {
  const cached = await cacheGet<any[]>("storefront:pages:published");
  if (cached) return cached;
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      canonicalUrl: true,
      seoTitle: true,
      seoDescription: true,
      ogImageUrl: true,
      noIndex: true,
    },
    orderBy: { slug: "asc" },
  });
  await cacheSet("storefront:pages:published", pages, PUBLISHED_PAGES_TTL_MS);
  return pages;
}

async function getPageBySlugCached(slug: string, locale: "ar" | "he" | "en") {
  const key = `storefront:page:${locale}:${slug}`;
  const cached = await cacheGet<any>(key);
  if (cached) return cached;

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
  if (page && page.status === "PUBLISHED") {
    await cacheSet(key, page, PAGE_BY_SLUG_TTL_MS);
  }
  return page;
}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.has((file.mimetype || "").toLowerCase())) return cb(null, true);
    const err = new Error("INVALID_FILE_TYPE") as any;
    err.code = "INVALID_FILE_TYPE";
    return cb(err, false);
  },
});

// public chatbot helper (knowledge-base + optional AI)
r.use("/chatbot", chatbot);
// product recommendations (AI + fallback)
r.use("/recommend", recommend);

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
    getPublishedPagesCached(),
  ]);

  res.json({ ...settings, pages });
}));

r.get("/pages", asyncHandler(async (_req, res) => {
  const pages = await getPublishedPagesCached();
  res.json({ pages });
}));

r.get("/page", validate({ query: PageBySlugQuery }), asyncHandler(async (req, res) => {
  const slug = String((req.query as any).slug);
  const locale = String((req.query as any).locale ?? "ar") as ("ar"|"he"|"en");

  const page = await getPageBySlugCached(slug, locale);

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

  // sections: merge translated data over base to preserve missing fields (e.g., themeId)
  const outSections = (page as any).sections.map((s: any) => {
    const st = s.translations?.[0];
    if (st?.data) return { ...s, data: mergeTranslatedData(s.data, st.data) };
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

  if (!q) return res.json({ products: [], categories: [], didYouMean: null });

  const normalized = normalizeSearchText(q);
  const categoryLimit = Math.min(limit, 8);

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
      take: categoryLimit,
    }),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const needProducts = productById.size < limit;
  const needCategories = categoryById.size < categoryLimit;

  let didYouMean: string | null = null;

  if (normalized) {
    if (needProducts || !productById.size) {
      const fallbackProducts = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, title: true, slug: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const scored = fallbackProducts
        .map((p) => ({ item: p, score: scoreTextMatch(q, p.title) }))
        .filter((row) => row.score >= 0.45)
        .sort((a, b) => b.score - a.score);

      for (const row of scored) {
        if (productById.has(row.item.id)) continue;
        productById.set(row.item.id, row.item);
        if (productById.size >= limit) break;
      }

      if (!didYouMean && scored.length) {
        const best = scored[0]!;
        const bestNorm = normalizeSearchText(best.item.title);
        if (best.score >= 0.88 && bestNorm && bestNorm !== normalized) {
          didYouMean = best.item.title;
        }
      }
    }

    if (needCategories || !categoryById.size) {
      const fallbackCategories = await prisma.category.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });

      const scored = fallbackCategories
        .map((c) => ({ item: c, score: scoreTextMatch(q, c.name) }))
        .filter((row) => row.score >= 0.5)
        .sort((a, b) => b.score - a.score);

      for (const row of scored) {
        if (categoryById.has(row.item.id)) continue;
        categoryById.set(row.item.id, row.item);
        if (categoryById.size >= categoryLimit) break;
      }

      if (!didYouMean && scored.length) {
        const best = scored[0]!;
        const bestNorm = normalizeSearchText(best.item.name);
        if (best.score >= 0.88 && bestNorm && bestNorm !== normalized) {
          didYouMean = best.item.name;
        }
      }
    }
  }

  res.json({
    products: Array.from(productById.values()).slice(0, limit),
    categories: Array.from(categoryById.values()).slice(0, categoryLimit),
    didYouMean,
  });
}));

/**
 * Image search (AI embedding)
 *
 * POST /v1/storefront/search/image?limit=24&locale=ar
 * multipart/form-data:
 *  - file: image (jpeg/png/webp)
 *  - imageUrl: optional URL if no file
 */
r.post("/search/image", (req, res, next) => {
  const handler = imageUpload.single("file");
  handler(req as any, res as any, (err: any) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "FILE_TOO_LARGE", message: "Max file size is 8MB" });
    }
    if (err?.code === "INVALID_FILE_TYPE") {
      return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only PNG, JPG, or WebP images are allowed" });
    }
    if (err) {
      return res.status(400).json({ error: "UPLOAD_FAILED", message: err?.message ?? String(err) });
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  const limitRaw = Number((req.query as any).limit ?? (req.body as any)?.limit ?? 24);
  const limit = Math.min(48, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 24));
  const locale = String((req.query as any).locale ?? (req.body as any)?.locale ?? "ar") as ("ar" | "he" | "en");

  let buffer: Buffer | null = null;
  let mime: string | null = null;

  const file = (req as any).file as { buffer?: Buffer; mimetype?: string } | undefined;
  if (file?.buffer?.length) {
    buffer = file.buffer;
    mime = file.mimetype ?? "image/jpeg";
  } else if ((req.body as any)?.imageUrl) {
    const loaded = await loadImageFromUrl(String((req.body as any).imageUrl));
    if (loaded) {
      buffer = loaded.buffer;
      mime = loaded.mime;
    }
  }

  if (!buffer || !mime) {
    return res.status(400).json({ error: "NO_IMAGE", message: "Provide an image file or imageUrl" });
  }

  const result = await searchProductsByImageBuffer(buffer, mime, { limit, locale });
  if (!result.ok) {
    const err = String(result.error || "IMAGE_SEARCH_FAILED");
    let message = "فشل البحث بالصورة. يرجى المحاولة لاحقاً.";
    if (err.includes("OPENAI_API_KEY")) {
      message = "ميزة البحث بالصورة تحتاج إعداد مفتاح OpenAI في الباك اند (OPENAI_API_KEY).";
    } else if (err.includes("OpenAI error 401")) {
      message = "فشل التحقق من مفتاح OpenAI. تأكد من صحة المفتاح.";
    } else if (err.includes("OpenAI error 429")) {
      message = "تم تجاوز حد OpenAI مؤقتاً. حاول لاحقاً.";
    } else if (err.includes("IMAGE_HASH_FAILED")) {
      message = "تعذر توليد بصمة للصورة. جرب صورة مختلفة.";
    } else if (err.includes("CLIP_")) {
      message = "تعذر تحليل الصورة محلياً. حاول صورة مختلفة أو أعد المحاولة.";
    } else if (err.includes("IMAGE_DESCRIPTION_EMPTY")) {
      message = "تعذر وصف الصورة. جرب صورة أوضح.";
    } else if (err.includes("Model did not return JSON")) {
      message = "فشل تحليل وصف الصورة. حاول مرة أخرى.";
    }
    return res.status(503).json({ error: err, message });
  }

  res.json(result);
}));

/**
 * Checkout (redirect)
 *
 * POST /v1/storefront/checkout/session
 *  - create a Stripe/PayPal checkout session and return redirectUrl
 *
 * GET /v1/storefront/checkout/verify?provider=stripe&sessionId=...
 *  - verify payment and finalize order
 */
r.post("/checkout/session", validate({ body: StorefrontCheckoutCreateBody }), asyncHandler(async (req, res) => {
  const baseUrl = resolveStorefrontBaseUrl(req);
  const out = await createCheckoutSession({
    ...(req.body as any),
    baseUrl,
  });
  res.json(out);
}));

r.get("/checkout/verify", validate({ query: StorefrontCheckoutVerifyQuery }), asyncHandler(async (req, res) => {
  const q = StorefrontCheckoutVerifyQuery.parse(req.query);
  const out = await verifyCheckoutSession({
    provider: q.provider,
    sessionId: q.sessionId,
  });
  res.json(out);
}));

export default r;
