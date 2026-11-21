/**
 * The shop's assistant on the AI door (ai.client.ts aiJson, feature "shopAgent"): gathers the store's
 * facts for one question (agent.ts says what the model sees), asks, and turns the answer into what
 * the chat shows: words, product cards from the shop's own data, follow-up questions and a WhatsApp
 * hand-over with the shopper's question in it.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { aiCompact, aiJson, type AiUse } from "../ai/ai.client.js";
import { identityOf, storeBrief, storeName } from "../identity/identity.js";
import { CategoryTranslations, ProductTranslations, translationsOf } from "../../lib/translations.js";
import type { RecommendedProduct } from "../storefront/recommend.service.js";
import { scoreEntry, tokenize } from "./chatbot.service.js";
import {
  agentPrompt,
  cleanAgentAnswer,
  handoffText,
  slugInView,
  whatsappLink,
  type AgentLocale,
  type AgentProduct,
  type AgentTone,
  type AgentTurn,
} from "./agent.js";

export type AgentReply = {
  answer: string;
  products: RecommendedProduct[];
  suggestions: string[];
  /** wa.me link with the question in it, when a person should take over and the shop has WhatsApp. */
  handoff: string | null;
  /** The facts didn't hold the answer: listed for the owner (admin → مساعد المتجر → ما عرف يجاوب). */
  missed: boolean;
};

export type AgentPersona = { id: string; name: string; role: string; tone: AgentTone };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const money = (v: unknown) => (v == null ? null : Math.round(Number(v) * 100) / 100);

/** The price a variant sells at right now (its sale price inside the sale's window). */
export function priceNow(v: { price: unknown; salePrice?: unknown; saleStartsAt?: Date | null; saleEndsAt?: Date | null }, now = new Date()) {
  const sale = v.salePrice == null ? null : Number(v.salePrice);
  const open = (!v.saleStartsAt || v.saleStartsAt <= now) && (!v.saleEndsAt || v.saleEndsAt > now);
  const usual = Number(v.price);
  return sale != null && Number.isFinite(sale) && open && sale < usual ? { price: sale, was: usual } : { price: usual, was: null };
}

const PRODUCT_SELECT = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  slug: true,
  title: true,
  description: true,
  translations: true,
  deliveryMinDays: true,
  deliveryMaxDays: true,
  type: { select: { deliveryMinDays: true, deliveryMaxDays: true } },
  category: { select: { name: true, translations: true } },
  items: {
    where: { isActive: true },
    take: 12,
    select: {
      colorName: true,
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true, blurDataUrl: true } },
      variants: { take: 30, select: { price: true, salePrice: true, saleStartsAt: true, saleEndsAt: true, stock: true, size: { select: { name: true, order: true } } } },
    },
  },
});

type Row = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  translations: unknown;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  type: { deliveryMinDays: number | null; deliveryMaxDays: number | null } | null;
  category: { name: string; translations: unknown } | null;
  items: Array<{
    colorName: string;
    images: Array<{ url: string; blurDataUrl: string | null }>;
    variants: Array<{ price: unknown; salePrice: unknown; saleStartsAt: Date | null; saleEndsAt: Date | null; stock: number; size: { name: string; order: number } }>;
  }>;
};

function days(min: number | null, max: number | null, locale: AgentLocale) {
  if (min == null && max == null) return null;
  const a = min ?? max!, b = max ?? min!;
  const span = a === b ? `${a}` : `${Math.min(a, b)}–${Math.max(a, b)}`;
  return locale === "en" ? `${span} days` : locale === "he" ? `${span} ימים` : `${span} أيام`;
}

/** A row as the model sees it and as the chat's card shows it (in the shopper's language when translated). */
function shape(p: Row, locale: AgentLocale, now: Date): { fact: AgentProduct; card: RecommendedProduct } {
  const t = locale === "ar" ? undefined : translationsOf(ProductTranslations, p.translations)[locale];
  const cat = locale === "ar" ? p.category?.name : translationsOf(CategoryTranslations, p.category?.translations)[locale]?.name ?? p.category?.name;
  const title = String(t?.title ?? p.title);
  const sizes = new Map<string, { order: number; stock: number }>();
  let low: { price: number; was: number | null } | null = null;
  for (const it of p.items) {
    for (const v of it.variants) {
      const cur = sizes.get(v.size.name);
      sizes.set(v.size.name, { order: v.size.order, stock: (cur?.stock ?? 0) + Math.max(0, v.stock) });
      if (v.stock <= 0) continue;
      const pn = priceNow(v, now);
      if (Number.isFinite(pn.price) && (!low || pn.price < low.price)) low = pn;
    }
  }
  const bySize = [...sizes.entries()].sort((a, b) => a[1].order - b[1].order);
  const image = p.items.find((i) => i.images[0])?.images[0] ?? null;
  const fact: AgentProduct = {
    id: p.id,
    title,
    price: low ? money(low.price) : null,
    was: low?.was != null ? money(low.was) : null,
    category: cat ?? null,
    colors: [...new Set(p.items.map((i) => i.colorName).filter(Boolean))],
    sizes: bySize.filter(([, s]) => s.stock > 0).map(([n]) => n),
    soldOut: bySize.filter(([, s]) => s.stock <= 0).map(([n]) => n),
    delivery: days(p.deliveryMinDays ?? p.type?.deliveryMinDays ?? null, p.deliveryMaxDays ?? p.type?.deliveryMaxDays ?? null, locale),
    about: String(t?.description ?? p.description ?? "").slice(0, 600) || null,
  };
  const card: RecommendedProduct = {
    id: p.id,
    slug: p.slug,
    title,
    imageUrl: image?.url ?? null,
    imageBlurDataUrl: image?.blurDataUrl ?? null,
    minPrice: fact.price,
    categoryName: cat ?? null,
  };
  return { fact, card };
}

/** Up to `take` pieces that may fit the words (title, description or category), in stock, newest first; topped up with the most popular. */
async function candidatesFor(tokens: string[], excludeId: string | null, take: number): Promise<Row[]> {
  const base = { isActive: true, items: { some: { isActive: true, variants: { some: { stock: { gt: 0 } } } } } };
  const not = excludeId ? { id: { not: excludeId } } : {};
  const words = tokens.slice(0, 6);
  const found = words.length
    ? ((await prisma.product.findMany({
        where: {
          ...base,
          ...not,
          OR: words.flatMap((w) => [
            { title: { contains: w, mode: "insensitive" as const } },
            { description: { contains: w, mode: "insensitive" as const } },
            { category: { name: { contains: w, mode: "insensitive" as const } } },
            { items: { some: { colorName: { contains: w, mode: "insensitive" as const } } } },
          ]),
        },
        orderBy: { createdAt: "desc" },
        take,
        select: PRODUCT_SELECT,
      })) as unknown as Row[])
    : [];
  if (found.length >= Math.min(4, take)) return found;
  const more = (await prisma.product.findMany({
    where: { ...base, ...not, id: { notIn: [...found.map((p) => p.id), ...(excludeId ? [excludeId] : [])] } },
    orderBy: [{ popularity: { score: "desc" } }, { createdAt: "desc" }],
    take: take - found.length,
    select: PRODUCT_SELECT,
  })) as unknown as Row[];
  return [...found, ...more];
}

/** The owner's answers that match the question best (and the top ones when nothing matches). */
async function knowledgeFor(locale: AgentLocale, tokens: string[], most = 8) {
  const all = await prisma.chatbotEntry.findMany({ where: { locale, isEnabled: true }, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }], take: 300 });
  const ranked = all
    .map((e) => ({ e, s: scoreEntry(tokens, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e);
  const picked = ranked.slice(0, most);
  for (const e of all) {
    if (picked.length >= Math.min(5, most)) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked.map((e) => ({ title: e.title, answer: e.answer }));
}

export async function agentReply(opts: {
  locale: AgentLocale;
  message: string;
  history: AgentTurn[];
  pageUrl?: string | null;
  persona?: AgentPersona | null;
  now?: Date;
  /** What the call is counted under (the owner's «جرّب النموذج» runs count apart from shoppers'). */
  use?: AiUse;
}): Promise<AgentReply> {
  const now = opts.now ?? new Date();
  const locale = opts.locale;
  const site = await prisma.siteSettings.findFirst({ select: { siteName: true, header: true, currencyCode: true, contactPhone: true, contactEmail: true } });
  const sf = obj(obj(site?.header).storefront);
  // The personality speaks only when it is the one the owner picked (admin → إعداد المتجر).
  const persona = opts.persona && typeof sf.assistantPersona === "string" && sf.assistantPersona === opts.persona.id ? opts.persona : null;
  const phone = (sf.whatsappEnabled === true && typeof sf.whatsappNumber === "string" && sf.whatsappNumber.trim()) || site?.contactPhone || null;
  const audience = identityOf(site).audience;

  // The talk so far gives the words too ("and in black?" after a question about a dress).
  const lastAsked = [...opts.history].reverse().find((t) => t.role === "user")?.content ?? "";
  const tokens = tokenize(`${opts.message} ${opts.message.length < 30 ? lastAsked : ""}`);
  const slug = slugInView(opts.pageUrl);
  const viewed = slug ? ((await prisma.product.findFirst({ where: { slug, isActive: true }, select: PRODUCT_SELECT })) as unknown as Row | null) : null;
  // A small model (admin → «نموذج صغير»): fewer pieces and answers, a shorter talk, a shorter piece text.
  const compact = await aiCompact();
  const [knowledge, rows] = await Promise.all([knowledgeFor(locale, tokens, compact ? 4 : 8), candidatesFor(tokens, viewed?.id ?? null, compact ? 5 : 10)]);
  const inView = viewed ? shape(viewed, locale, now) : null;
  if (inView && compact && inView.fact.about) inView.fact.about = inView.fact.about.slice(0, 220);
  const shaped = rows.map((r) => shape(r, locale, now));
  if (compact) for (const s of shaped) s.fact.about = null;

  const raw = await aiJson<unknown>(
    opts.use ?? "shopAgent",
    agentPrompt({
      locale,
      message: opts.message,
      history: compact ? opts.history.slice(-4) : opts.history,
      store: {
        brief: storeBrief(site),
        name: storeName(site, locale),
        currency: site?.currencyCode || "ILS",
        whatsapp: Boolean(phone),
        email: Boolean(site?.contactEmail),
      },
      persona,
      addressing: audience === "women" ? ", addressing her in the feminine" : audience === "men" ? ", addressing him in the masculine" : "",
      knowledge,
      inView: inView?.fact ?? null,
      candidates: shaped.map((s) => s.fact),
    }),
  );
  const cards = new Map<string, RecommendedProduct>(shaped.map((s) => [s.card.id, s.card]));
  if (inView) cards.set(inView.card.id, inView.card);
  const out = cleanAgentAnswer(raw, cards.keys());
  if (!out) throw new Error("empty answer");
  return {
    answer: out.answer,
    products: out.productIds.map((id) => cards.get(id)!).filter(Boolean),
    suggestions: out.suggestions,
    handoff: out.handoff ? whatsappLink(phone, handoffText(locale, opts.message, inView?.fact.title)) : null,
    missed: !out.answered,
  };
}
