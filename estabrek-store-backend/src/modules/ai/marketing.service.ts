/**
 * The AI for selling outside the shop: social posts and a week's plan (socialPosts.ts), and the
 * search-engine doctor (seoDoctor.ts). Products are read from the database here; the model only
 * writes words around them, and nothing is saved until the owner says so (seoApply).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { mainLanguage, type ContentLang } from "../../lib/translations.js";
import { AppError } from "../../utils/httpError.js";
import { aiCompact, aiJson, cacheKey, cached } from "./ai.client.js";
import { addressing, shop } from "./ai.service.js";
import { priceNow } from "../chatbot/agent.service.js";
import { cleanPosts, cleanWeek, socialPrompt, weekPrompt, type Platform, type PostProduct, type PostTone } from "./socialPosts.js";
import { altsFor, cleanSeoFix, seoFixPrompt, seoReports, type SeoProduct } from "./seoDoctor.js";
import { keepProductRevision } from "../admin/productRevisions.js";

/** The shop's address for a product: whole when the server knows the shop (STOREFRONT_URL), else null. */
export function productUrl(slug: string): string | null {
  const base = env.STOREFRONT_URL?.replace(/\/+$/, "");
  return base && /^https?:\/\//.test(base) ? `${base}/p/${encodeURIComponent(slug)}` : null;
}

const POST_SELECT = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  slug: true,
  title: true,
  description: true,
  category: { select: { name: true } },
  items: { where: { isActive: true }, take: 8, select: { colorName: true, variants: { where: { stock: { gt: 0 } }, take: 20, select: { price: true, salePrice: true, saleStartsAt: true, saleEndsAt: true } } } },
});

type PostRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: { name: string } | null;
  items: Array<{ colorName: string; variants: Array<{ price: unknown; salePrice: unknown; saleStartsAt: Date | null; saleEndsAt: Date | null }> }>;
};

function postProduct(p: PostRow, now = new Date()): PostProduct {
  let low: { price: number; was: number | null } | null = null;
  for (const v of p.items.flatMap((i) => i.variants)) {
    const pn = priceNow(v, now);
    if (Number.isFinite(pn.price) && (!low || pn.price < low.price)) low = pn;
  }
  return {
    id: p.id,
    title: p.title,
    price: low ? Math.round(low.price * 100) / 100 : null,
    was: low?.was ?? null,
    category: p.category?.name ?? null,
    colors: [...new Set(p.items.map((i) => i.colorName).filter(Boolean))],
    about: (p.description ?? "").slice(0, 400) || null,
    url: productUrl(p.slug),
  };
}

export type SocialBody = { productIds?: string[]; offer?: string; platforms: Platform[]; tone: PostTone; lang?: ContentLang; emojis?: boolean };

async function langOf(lang?: ContentLang) {
  if (lang) return lang;
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  return mainLanguage(s?.header);
}

/** Two posts per platform for one or a few pieces, or for the owner's offer alone. */
export async function socialPosts(body: SocialBody) {
  const ids = [...new Set(body.productIds ?? [])].slice(0, 3);
  if (!ids.length && !body.offer?.trim()) throw new AppError(400, "NOTHING_TO_POST", "Pick a product or write the offer");
  const rows = ids.length ? ((await prisma.product.findMany({ where: { id: { in: ids } }, select: POST_SELECT })) as unknown as PostRow[]) : [];
  if (ids.length && !rows.length) throw new AppError(404, "NOT_FOUND", "Product not found");
  const products = ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is PostRow => Boolean(r)).map((r) => postProduct(r));
  const store = await shop();
  const lang = await langOf(body.lang);
  const input = {
    lang,
    platforms: body.platforms,
    tone: body.tone,
    emojis: body.emojis !== false,
    products,
    offer: body.offer?.trim() || null,
    store: { brief: store.brief, name: store.name, currency: store.currency },
    addressing: addressing(store.audience),
  };
  const raw = await aiJson<unknown>("socialPosts", socialPrompt(input));
  const posts = cleanPosts(raw, input);
  if (!posts.length) throw new AppError(502, "AI_EMPTY", "The AI gave no posts, try again");
  return { posts, products: products.map((p) => ({ id: p.id, title: p.title, url: p.url, slug: rows.find((r) => r.id === p.id)?.slug ?? "" })) };
}

/** Seven days of posts made of the shop's most popular and newest pieces. */
export async function weekPlan(body: { platforms: Platform[]; tone: PostTone; lang?: ContentLang; emojis?: boolean }) {
  const where = { isActive: true, items: { some: { isActive: true, variants: { some: { stock: { gt: 0 } } } } } };
  const [popular, newest] = await Promise.all([
    prisma.product.findMany({ where, orderBy: [{ popularity: { score: "desc" } }], take: 12, select: POST_SELECT }),
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: 10, select: POST_SELECT }),
  ]);
  // A small model gets fewer pieces to choose from.
  const rows = [...new Map([...popular, ...newest].map((p) => [p.id, p as unknown as PostRow])).values()].slice(0, (await aiCompact()) ? 8 : 18);
  if (rows.length < 2) throw new AppError(409, "FEW_PRODUCTS", "Add a few products in stock first");
  const products = rows.map((r) => postProduct(r));
  const store = await shop();
  const lang = await langOf(body.lang);
  const input = { lang, platforms: body.platforms, tone: body.tone, emojis: body.emojis !== false, products, store: { brief: store.brief, name: store.name, currency: store.currency }, addressing: addressing(store.audience) };
  const raw = await aiJson<unknown>("socialPosts", weekPrompt(input));
  const days = cleanWeek(raw, input);
  if (!days.length) throw new AppError(502, "AI_EMPTY", "The AI gave no plan, try again");
  const byId = new Map(rows.map((r) => [r.id, r]));
  return { days: days.map((d) => ({ ...d, product: d.productId ? { id: d.productId, title: byId.get(d.productId)!.title, slug: byId.get(d.productId)!.slug, url: productUrl(byId.get(d.productId)!.slug) } : null })) };
}

/* ---------------- The search-engine doctor ---------------- */

const SEO_SELECT = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  title: true,
  slug: true,
  seoTitle: true,
  seoDescription: true,
  description: true,
  category: { select: { name: true } },
  items: { select: { colorName: true, images: { orderBy: { position: "asc" }, take: 12, select: { id: true, alt: true, view: true } } } },
});

type SeoRow = {
  id: string; title: string; slug: string; seoTitle: string | null; seoDescription: string | null; description: string | null;
  category: { name: string } | null;
  items: Array<{ colorName: string; images: Array<{ id: string; alt: string | null; view: string | null }> }>;
};

const seoProduct = (p: SeoRow): SeoProduct => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  seoTitle: p.seoTitle,
  seoDescription: p.seoDescription,
  description: p.description,
  category: p.category?.name ?? null,
  colors: [...new Set(p.items.map((i) => i.colorName).filter(Boolean))],
  images: p.items.flatMap((i) => i.images.map((im) => ({ id: im.id, alt: im.alt, color: i.colorName, view: im.view }))),
});

/** Every active product's score and weak points, weakest first (no model: plain rules). */
export async function seoScan() {
  const rows = (await prisma.product.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 2000, select: SEO_SELECT })) as unknown as SeoRow[];
  const reports = seoReports(rows.map(seoProduct));
  const average = reports.length ? Math.round(reports.reduce((n, r) => n + r.score, 0) / reports.length) : 100;
  const counts: Record<string, number> = {};
  for (const r of reports) for (const i of r.issues) counts[i] = (counts[i] ?? 0) + 1;
  return { average, total: reports.length, counts, products: reports.filter((r) => r.issues.length).sort((a, b) => a.score - b.score).slice(0, 300) };
}

/**
 * Better words for one product, drafted (nothing is saved here): title and description by the model, and
 * the pictures' descriptions from the facts. Without the model (the switch off) only the pictures'.
 */
export async function seoFix(productId: string, opts: { model?: boolean } = {}) {
  const row = (await prisma.product.findUnique({ where: { id: productId }, select: SEO_SELECT })) as unknown as SeoRow | null;
  if (!row) throw new AppError(404, "NOT_FOUND", "Product not found");
  const p = seoProduct(row);
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const lang = mainLanguage(s?.header);
  if (opts.model === false) return { productId, seoTitle: null, seoDescription: null, alts: altsFor(p, lang) };
  const others = (await prisma.product.findMany({ where: { isActive: true, id: { not: productId } }, orderBy: { createdAt: "desc" }, take: (await aiCompact()) ? 12 : 40, select: { title: true, seoTitle: true } }))
    .map((o) => o.seoTitle || o.title)
    .filter(Boolean);
  const { brief } = await shop();
  const draft = await cached(cacheKey("seo", productId, p.title, p.description, p.seoTitle, p.seoDescription, lang), 24 * 7, async () =>
    cleanSeoFix(await aiJson<unknown>("seoDoctor", seoFixPrompt(p, lang, brief, others))),
  );
  return { productId, ...draft, alts: altsFor(p, lang) };
}

/** Saves what the owner kept of a draft (a revision is kept first, so it can go back). */
export async function seoApply(productId: string, body: { seoTitle?: string | null; seoDescription?: string | null; alts?: Array<{ id: string; alt: string }> }, adminSub?: string | null) {
  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) throw new AppError(404, "NOT_FOUND", "Product not found");
  await keepProductRevision(productId, "seo", adminSub);
  const data: { seoTitle?: string | null; seoDescription?: string | null } = {};
  if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle?.trim() || null;
  if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription?.trim() || null;
  if (Object.keys(data).length) await prisma.product.update({ where: { id: productId }, data });
  let alts = 0;
  for (const a of (body.alts ?? []).slice(0, 60)) {
    // Only this product's own pictures.
    const r = await prisma.productItemImage.updateMany({ where: { id: a.id, item: { productId } }, data: { alt: a.alt.trim().slice(0, 200) || null } });
    alts += r.count;
  }
  return { ok: true, alts };
}
