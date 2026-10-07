/**
 * The AI features. Each one gives the model only the data it needs, asks for
 * JSON, and checks the answer against the shop's real data (ids, sizes,
 * colours, options) before anything is shown or saved.
 */
import sharp from "sharp";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { isCloudinaryEnabled, uploadImageToCloudinary } from "../../lib/cloudinary.js";
import { phoneKey } from "../../lib/phoneKey.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { aiEditImage, aiJson, cacheKey, cached, clip } from "./ai.client.js";
import { stylePieces } from "../razan/styleQuiz.service.js";

const money = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

/* ---------------- 1. Product writer (from photos) ---------------- */

export type WriterField = { key: string; label: string; kind?: string; options?: string[] };
export type WriterInput = { images: string[]; title?: string; category?: string; type?: string; fields?: WriterField[]; notes?: string };

const WriterOut = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  colors: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export async function writeProduct(input: WriterInput) {
  const fields = (input.fields ?? []).slice(0, 20);
  const fieldText = fields.length
    ? fields.map((f) => `- ${f.key} (${clip(f.label, 40)})${f.options?.length ? `: one of [${f.options.map((o) => clip(o, 30)).join(", ")}]` : f.kind === "number" ? ": a number" : ""}`).join("\n")
    : "(none)";
  const raw = await aiJson<unknown>("productWriter", {
    system:
      "You write product pages for Estabrek, a modest-fashion shop (abayas, hijabs, dresses) in Palestine/Israel. Write in clear, warm Modern Standard Arabic suitable for women shoppers. Describe only what is visible in the photos or given in the notes: never invent fabric, sizes, measurements or prices you can't see. Reply with JSON only.",
    user: `Write the page for this piece.
Current title: ${clip(input.title, 120) || "(none)"}
Category: ${clip(input.category, 60) || "(unknown)"}; kind: ${clip(input.type, 60) || "(unknown)"}
Owner's notes: ${clip(input.notes, 400) || "(none)"}
Fields to fill when the photos show them (use the exact option text):
${fieldText}
JSON: {"title": short Arabic name (max 60 chars), "description": 2 short paragraphs then up to 4 bullet lines starting with "• " (max 700 chars), "seoTitle": max 60 chars, "seoDescription": max 155 chars, "colors": Arabic colour names you see, "attributes": {fieldKey: value}}`,
    images: input.images.slice(0, 4),
    maxTokens: 1400,
  });
  const out = WriterOut.parse(raw ?? {});
  // Only the type's own fields, and only their real options.
  const attributes: Record<string, unknown> = {};
  for (const f of fields) {
    const v = out.attributes[f.key];
    if (v == null || v === "") continue;
    if (f.options?.length) {
      const list = (Array.isArray(v) ? v : [v]).map(String).filter((x) => f.options!.includes(x));
      if (list.length) attributes[f.key] = f.kind === "multiselect" ? list : list[0];
    } else if (f.kind === "number") {
      const n = Number(v);
      if (Number.isFinite(n)) attributes[f.key] = n;
    } else attributes[f.key] = clip(v, 120);
  }
  return {
    title: clip(out.title, 80),
    description: String(out.description ?? "").trim().slice(0, 1200),
    seoTitle: clip(out.seoTitle, 70),
    seoDescription: clip(out.seoDescription, 170),
    colors: out.colors.map((c) => clip(c, 30)).filter(Boolean).slice(0, 6),
    attributes,
  };
}

/* ---------------- 2. Search in her own words ---------------- */

const SearchOut = z.object({
  keywords: z.string().default(""),
  categoryId: z.string().nullish(),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  minPrice: z.number().nullish(),
  maxPrice: z.number().nullish(),
  summary: z.string().default(""),
});

export async function parseSearch(q: string) {
  const query = clip(q, 200);
  const [cats, colorRows, sizes] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.productItem.findMany({ where: { isActive: true, product: { isActive: true } }, distinct: ["colorName"], select: { colorName: true }, take: 80 }),
    prisma.size.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);
  const colors = colorRows.map((c) => c.colorName).filter(Boolean);
  return cached(cacheKey("search", query.toLowerCase(), cats.length, colors.length), 24, async () => {
    const raw = await aiJson<unknown>("smartSearch", {
      system: "You turn a shopper's sentence into search filters for a modest-fashion shop. Use only the given lists. Prices are in ₪. Reply with JSON only.",
      user: `Sentence: «${query}»
Categories (id: name): ${cats.map((c) => `${c.id}: ${c.name}`).join("; ")}
Colours: ${colors.join(", ")}
Sizes: ${sizes.map((s) => s.name).join(", ")}
JSON: {"keywords": the words to search by (Arabic, short, no colour/size/price words), "categoryId": id or null, "colors": [from the list], "sizes": [from the list], "minPrice": number|null, "maxPrice": number|null, "summary": what you understood, in short Arabic (max 60 chars)}`,
      maxTokens: 400,
    });
    const out = SearchOut.parse(raw ?? {});
    const sizeBy = new Map(sizes.map((s) => [s.name.toUpperCase(), s.id]));
    return {
      q: clip(out.keywords, 80),
      categoryId: cats.some((c) => c.id === out.categoryId) ? out.categoryId! : null,
      colors: out.colors.filter((c) => colors.includes(c)).slice(0, 4),
      sizeIds: out.sizes.map((s) => sizeBy.get(String(s).toUpperCase())).filter((x): x is string => Boolean(x)).slice(0, 4),
      minPrice: out.minPrice != null && out.minPrice > 0 ? Math.round(out.minPrice) : null,
      maxPrice: out.maxPrice != null && out.maxPrice > 0 ? Math.round(out.maxPrice) : null,
      summary: clip(out.summary, 80),
    };
  });
}

/* ---------------- 3. Complete the look ---------------- */

const LookOut = z.object({ picks: z.array(z.object({ id: z.string(), reason: z.string().default("") })).default([]) });

export async function shopTheLook(productId: string) {
  const pieces = await stylePieces();
  const base = pieces.find((p) => p.id === productId);
  if (!base) throw NotFound("Product not found");
  const day = new Date().toISOString().slice(0, 10);
  return cached(cacheKey("look", productId, day, pieces.length), 12, async () => {
    // Candidates: other categories, the other kind (abaya → hijab/accessory), colours that go together.
    const others = pieces.filter((p) => p.id !== base.id && p.categoryId !== base.categoryId && (base.full == null || p.full !== base.full));
    const pool = (others.length >= 3 ? others : pieces.filter((p) => p.id !== base.id)).slice(0, 200);
    const near = (p: (typeof pool)[number]) => {
      let d = 0;
      for (const a of base.colors) for (const b of p.colors) d = Math.max(d, Math.exp(-Math.hypot(a.lab[0] - b.lab[0], a.lab[1] - b.lab[1], a.lab[2] - b.lab[2]) / 40));
      const neutral = p.colors.some((c) => Math.hypot(c.lab[1], c.lab[2]) < 12); // black, white, beige, grey go with anything
      return Math.max(d, neutral ? 0.6 : 0);
    };
    const candidates = pool.map((p) => ({ p, s: near(p) })).sort((a, b) => b.s - a.s).slice(0, 24).map((x) => x.p);
    if (candidates.length < 2) return { products: [] };
    const raw = await aiJson<unknown>("shopTheLook", {
      system: "You are a modest-fashion stylist. Pick pieces that complete an outfit with the given piece (colours that go together, a hijab or accessory for an abaya, etc.). Only use ids from the list. Reply with JSON only.",
      user: `The piece: ${base.title} — colours: ${base.colors.map((c) => c.name).join(", ") || "?"}
Candidates (id | title | colours | price):
${candidates.map((p) => `${p.id} | ${clip(p.title, 60)} | ${p.colors.map((c) => c.name).join("/")} | ${p.price ?? "?"}`).join("\n")}
JSON: {"picks": [{"id": "...", "reason": why it goes with the piece, short Arabic (max 60 chars)}]} — exactly 3 picks.`,
      maxTokens: 500,
    });
    const out = LookOut.parse(raw ?? {});
    const byId = new Map(candidates.map((p) => [p.id, p]));
    const seen = new Set<string>();
    const products = out.picks
      .filter((x) => byId.has(x.id) && !seen.has(x.id) && seen.add(x.id))
      .slice(0, 3)
      .map((x) => {
        const p = byId.get(x.id)!;
        return { id: p.id, title: p.title, slug: p.slug, image: p.image, price: p.price, reason: clip(x.reason, 80) };
      });
    return { products };
  });
}

/* ---------------- 4. Size advice ---------------- */

const SizeOut = z.object({ size: z.string(), confidence: z.enum(["high", "medium", "low"]).catch("low"), why: z.string().default("") });

export async function sizeAdvice(productId: string, body: { height: number; weight: number; usual?: string | null; fit?: "tight" | "regular" | "loose" | null }) {
  const p = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { title: true, description: true, attributes: true, category: { select: { name: true } }, items: { where: { isActive: true }, select: { variants: { select: { stock: true, size: { select: { name: true, order: true } } } } } } },
  });
  if (!p) throw NotFound("Product not found");
  const all = p.items.flatMap((i) => i.variants);
  const sizes = [...new Map(all.sort((a, b) => a.size.order - b.size.order).map((v) => [v.size.name, v])).values()];
  if (sizes.length < 2) throw new AppError(409, "ONE_SIZE", "This piece comes in one size");
  const raw = await aiJson<unknown>("sizeAdvice", {
    system: "You help a woman choose her size for a modest-fashion piece. Be careful and honest: if unsure, say so and pick the safer (looser) size, since modest pieces are worn loose. Answer in short, warm Arabic. Reply with JSON only.",
    user: `Piece: ${clip(p.title, 100)} (${clip(p.category?.name, 40)})
Details: ${clip(p.description, 500) || "-"}; fields: ${clip(JSON.stringify(p.attributes ?? {}), 300)}
Sizes (in stock?): ${sizes.map((v) => `${v.size.name}${v.stock > 0 ? "" : " (sold out)"}`).join(", ")}
Her height: ${body.height} cm, weight: ${body.weight} kg, usual size: ${clip(body.usual, 10) || "?"}, likes it: ${body.fit ?? "regular"}
JSON: {"size": one of the sizes, "confidence": "high"|"medium"|"low", "why": one or two short sentences}`,
    maxTokens: 300,
  });
  const out = SizeOut.parse(raw ?? {});
  const hit = sizes.find((v) => v.size.name.toUpperCase() === out.size.trim().toUpperCase());
  if (!hit) throw new AppError(502, "AI_FAILED", "No clear size");
  return { size: hit.size.name, inStock: hit.stock > 0, confidence: out.confidence, why: clip(out.why, 220) };
}

/* ---------------- 5. What shoppers say (review summary, both languages) ---------------- */

const ReviewsOut = z.object({ ar: z.string().default(""), en: z.string().default(""), pros: z.array(z.string()).default([]), cons: z.array(z.string()).default([]) });

export async function reviewSummary(productId: string) {
  const reviews = await prisma.review.findMany({ where: { productId, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 60, select: { rating: true, title: true, body: true, updatedAt: true } });
  if (reviews.length < 3) return { summary: null, count: reviews.length };
  const avg = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  const stamp = reviews.reduce((m, r) => Math.max(m, r.updatedAt.getTime()), 0);
  const summary = await cached(cacheKey("reviews", productId, reviews.length, stamp), 24 * 7, async () => {
    const raw = await aiJson<unknown>("reviewSummary", {
      system: "You summarise customer reviews for a modest-fashion shop, fairly (mention real complaints). Never quote names. Reply with JSON only.",
      user: `Reviews (rating | text):
${reviews.map((r) => `${r.rating} | ${clip(`${r.title ?? ""} ${r.body}`, 300)}`).join("\n")}
JSON: {"ar": 2 sentences in Arabic, "en": the same in English, "pros": up to 3 short Arabic points, "cons": up to 2 short Arabic points (empty if none)}`,
      maxTokens: 600,
    });
    const o = ReviewsOut.parse(raw ?? {});
    return { ar: clip(o.ar, 400), en: clip(o.en, 400), pros: o.pros.map((x) => clip(x, 60)).slice(0, 3), cons: o.cons.map((x) => clip(x, 60)).slice(0, 2) };
  });
  return { summary, count: reviews.length, average: avg };
}

/* ---------------- 6. Ask about the shop (owner) ---------------- */

const LIVE: Array<"NEW" | "CONTACTED" | "ACCEPTED" | "SHIPPED" | "CLOSED"> = ["NEW", "CONTACTED", "ACCEPTED", "SHIPPED", "CLOSED"];

/** The numbers the owner can ask about (computed here; the model only explains them). */
export async function shopSnapshot(now = new Date()) {
  const d7 = new Date(now.getTime() - 7 * 864e5), d30 = new Date(now.getTime() - 30 * 864e5), d60 = new Date(now.getTime() - 60 * 864e5);
  const sales = async (from: Date, to: Date = now) => {
    const r = await prisma.orderRequest.aggregate({ where: { createdAt: { gte: from, lt: to }, status: { in: LIVE } }, _count: { _all: true }, _sum: { total: true } });
    return { orders: r._count._all, total: money(r._sum.total) };
  };
  const [week, month, prevMonth, byStatus, items, cities, lowStock, requests, sources] = await Promise.all([
    sales(d7),
    sales(d30),
    sales(d60, d30),
    prisma.orderRequest.groupBy({ by: ["status"], where: { createdAt: { gte: d30 } }, _count: { _all: true } }),
    prisma.orderRequestItem.groupBy({ by: ["productTitle"], where: { orderRequest: { createdAt: { gte: d30 }, status: { in: LIVE } } }, _sum: { quantity: true, lineSubtotal: true }, orderBy: { _sum: { quantity: "desc" } }, take: 10 }),
    prisma.orderRequest.groupBy({ by: ["city"], where: { createdAt: { gte: d30 }, status: { in: LIVE }, city: { not: null } }, _count: { _all: true }, orderBy: { _count: { city: "desc" } }, take: 8 }),
    prisma.productVariant.findMany({ where: { stock: { lte: 2 }, item: { isActive: true, product: { isActive: true } } }, take: 15, orderBy: { stock: "asc" }, select: { stock: true, sku: true, size: { select: { name: true } }, item: { select: { colorName: true, product: { select: { title: true } } } } } }),
    prisma.customerRequest.groupBy({ by: ["kind"], where: { createdAt: { gte: d30 } }, _count: { _all: true } }).catch(() => []),
    prisma.orderRequest.groupBy({ by: ["source"], where: { createdAt: { gte: d30 } }, _count: { _all: true } }),
  ]);
  return {
    today: now.toISOString().slice(0, 10),
    currency: "ILS",
    sales: { last7Days: week, last30Days: month, previous30Days: prevMonth, averageOrder30Days: month.orders ? money(month.total / month.orders) : 0 },
    ordersByStatus30Days: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    topProducts30Days: items.map((i) => ({ title: i.productTitle, quantity: i._sum.quantity ?? 0, sales: money(i._sum.lineSubtotal) })),
    topCities30Days: cities.map((c) => ({ city: c.city, orders: c._count._all })),
    lowStock: lowStock.map((v) => ({ product: v.item.product.title, color: v.item.colorName, size: v.size.name, stock: v.stock })),
    specialRequests30Days: Object.fromEntries((requests as Array<{ kind: string; _count: { _all: number } }>).map((r) => [r.kind, r._count._all])),
    ordersBySource30Days: Object.fromEntries(sources.map((s) => [s.source ?? "unknown", s._count._all])),
  };
}

const AskOut = z.object({ answer: z.string().default(""), figures: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]) })).default([]) });

export async function askShop(question: string) {
  const data = await shopSnapshot();
  const raw = await aiJson<unknown>("adminAsk", {
    system:
      "You answer a shop owner's question about their own shop, in short Levantine Arabic. Use ONLY the numbers in the data; if the answer isn't in the data, say what you can't see and suggest where in the admin to look. Never make up numbers. Reply with JSON only.",
    user: `Data:\n${JSON.stringify(data)}\n\nQuestion: «${clip(question, 300)}»\nJSON: {"answer": 1-4 short sentences, "figures": [{"label": short Arabic, "value": number or text from the data}] (max 4)}`,
    maxTokens: 700,
  });
  const out = AskOut.parse(raw ?? {});
  return { answer: clip(out.answer, 900), figures: out.figures.slice(0, 4).map((f) => ({ label: clip(f.label, 40), value: typeof f.value === "number" ? f.value : clip(f.value, 40) })) };
}

/* ---------------- 7. WhatsApp reply suggestions ---------------- */

const ReplyOut = z.object({ replies: z.array(z.object({ label: z.string().default(""), text: z.string() })).default([]) });

export async function replySuggestions(orderId: string, message?: string | null) {
  const o = await prisma.orderRequest.findUnique({
    where: { id: orderId },
    select: { customerName: true, status: true, total: true, currencyCode: true, city: true, paymentStatus: true, createdAt: true, items: { select: { productTitle: true, colorName: true, sizeName: true, quantity: true } } },
  });
  if (!o) throw NotFound("Order not found");
  const shop = await prisma.siteSettings.findFirst({ select: { siteName: true } });
  const first = clip(o.customerName, 40).split(" ")[0];
  const raw = await aiJson<unknown>("replySuggest", {
    system:
      "You draft WhatsApp replies for a small modest-fashion shop to a woman customer. Warm, short, polite Levantine Arabic, addressing her in the feminine. Never promise things not in the order data (no delivery dates, no discounts). Reply with JSON only.",
    user: `Shop: ${clip(shop?.siteName || "استبرق", 40)}
Order: status ${o.status}, total ${money(o.total)} ${o.currencyCode}, city ${clip(o.city, 40) || "-"}, payment ${o.paymentStatus ?? "-"}
Items: ${o.items.map((i) => `${clip(i.productTitle, 50)} ${[i.colorName, i.sizeName].filter(Boolean).join(" ")} ×${i.quantity}`).join("; ")}
Her first name: ${first}
Her message: ${clip(message, 500) || "(none — suggest a message for this order's status)"}
JSON: {"replies": [{"label": 2-3 word Arabic label, "text": the message (max 400 chars)}]} — 3 different replies.`,
    maxTokens: 900,
  });
  const out = ReplyOut.parse(raw ?? {});
  return { replies: out.replies.filter((r) => r.text.trim()).slice(0, 3).map((r) => ({ label: clip(r.label, 30), text: String(r.text).trim().slice(0, 600) })) };
}

/* ---------------- 8. Photo studio (clean background) ---------------- */

export type StudioStyle = "white" | "studio" | "soft";
const STUDIO_PROMPT: Record<StudioStyle, string> = {
  white: "Place the garment on a pure white seamless background with a soft natural shadow.",
  studio: "Place the garment in a bright, minimal photo studio with a light warm-grey backdrop and soft daylight.",
  soft: "Place the garment on a soft blush-pink backdrop with gentle diffused light, elegant and calm.",
};

let studioUpload = async (png: Buffer, name: string) => {
  const up = await uploadImageToCloudinary({ filePath: `data:image/png;base64,${png.toString("base64")}`, folder: "estabrek-studio", displayName: name, tags: ["ai-studio"] });
  return up.url;
};
/** Tests: keep the photo in memory instead of Cloudinary. */
export function setStudioUpload(fn: typeof studioUpload) {
  studioUpload = fn;
}
let studioFetch = async (url: string): Promise<Buffer> => Buffer.from(await (await fetch(url)).arrayBuffer());
export function setStudioFetch(fn: typeof studioFetch) {
  studioFetch = fn;
}

/**
 * A new photo of the piece on a clean background. It's returned to the
 * product page, which adds it next to the original (never replaces it) and
 * saves it with the product.
 */
export async function photoStudio(imageUrl: string, style: StudioStyle, opts: { cloudinaryReady?: boolean; title?: string } = {}) {
  if (!(opts.cloudinaryReady ?? isCloudinaryEnabled())) throw new AppError(409, "CLOUDINARY_NOT_CONFIGURED", "Cloudinary is needed to keep the new photo");
  let original: Buffer;
  try {
    original = await studioFetch(imageUrl);
  } catch {
    throw new AppError(400, "BAD_IMAGE", "Couldn't open the photo");
  }
  const png = await sharp(original).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).png().toBuffer().catch(() => {
    throw new AppError(400, "BAD_IMAGE", "Couldn't read the photo");
  });
  const edited = await aiEditImage(
    "photoStudio",
    png,
    `${STUDIO_PROMPT[style]} Keep the garment exactly as it is: same shape, colour, fabric, folds, details and any person wearing it; change only the background and lighting. No text, no logos.`,
  );
  return { url: await studioUpload(edited, `${clip(opts.title, 60) || "piece"} — studio`) };
}

/* ---------------- 9. Orders to look at twice (plain rules, no key needed) ---------------- */

export async function orderFlags(orderId: string) {
  const o = await prisma.orderRequest.findUnique({
    where: { id: orderId },
    select: { id: true, phone: true, customerName: true, total: true, city: true, address: true, createdAt: true, paymentStatus: true, items: { select: { quantity: true, variant: { select: { item: { select: { product: { select: { type: { select: { fulfillment: true } } } } } } } } } } },
  });
  if (!o) throw NotFound("Order not found");
  const reasons: Array<{ text: string; points: number }> = [];
  const key = phoneKey(o.phone);
  const digits = o.phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 13) reasons.push({ text: "رقم الهاتف ناقص أو طويل زيادة", points: 25 });
  if (key) {
    const since = new Date(o.createdAt.getTime() - 24 * 3600_000);
    const recent = await prisma.orderRequest.findMany({ where: { createdAt: { gte: since, lte: new Date(o.createdAt.getTime() + 24 * 3600_000) }, id: { not: o.id } }, select: { phone: true } });
    const same = recent.filter((r) => phoneKey(r.phone) === key).length;
    if (same >= 2) reasons.push({ text: `${same + 1} طلبات من نفس الرقم خلال يوم`, points: 25 });
    const past = await prisma.orderRequest.findMany({ where: { status: { in: ["REJECTED", "CANCELED"] }, id: { not: o.id }, createdAt: { gte: new Date(o.createdAt.getTime() - 180 * 864e5) } }, select: { phone: true }, take: 2000 });
    const refused = past.filter((r) => phoneKey(r.phone) === key).length;
    if (refused >= 2) reasons.push({ text: `نفس الرقم إله ${refused} طلبات انرفضت أو انلغت قبل`, points: 30 });
  }
  const qty = o.items.reduce((s, i) => s + i.quantity, 0);
  if (o.items.some((i) => i.quantity >= 5)) reasons.push({ text: "كمية كبيرة من نفس القطعة", points: 20 });
  else if (qty >= 10) reasons.push({ text: `${qty} قطع بطلب واحد`, points: 15 });
  const avg = await prisma.orderRequest.aggregate({ where: { createdAt: { gte: new Date(Date.now() - 60 * 864e5) }, status: { in: LIVE } }, _avg: { total: true }, _count: { _all: true } });
  const mean = Number(avg._avg.total ?? 0);
  if (avg._count._all >= 5 && mean > 0 && Number(o.total ?? 0) >= mean * 3) reasons.push({ text: "المبلغ أكبر بكثير من العادي", points: 15 });
  const name = o.customerName.trim();
  if (name.length < 3 || /\d/.test(name) || /(.)\1{3,}/.test(name)) reasons.push({ text: "الاسم غريب (قصير أو فيه أرقام)", points: 15 });
  const ships = o.items.some((i) => (i.variant.item.product.type?.fulfillment ?? "SHIPPING") === "SHIPPING");
  if (ships && !o.city?.trim() && !o.address?.trim()) reasons.push({ text: "ما في عنوان للتوصيل", points: 10 });
  const score = Math.min(100, reasons.reduce((s, r) => s + r.points, 0));
  return { level: score >= 45 ? "risky" : score >= 20 ? "check" : "ok", score, reasons: reasons.map((r) => r.text), paid: o.paymentStatus === "PAID" };
}
