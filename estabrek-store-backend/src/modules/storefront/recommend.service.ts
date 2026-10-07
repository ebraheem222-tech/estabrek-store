import { prisma } from "../../lib/prisma.js";
import { getDefaultOpenAIModel, openaiResponsesJson } from "../../lib/openai.js";

type Locale = "ar" | "he" | "en";

export type RecommendedProduct = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageBlurDataUrl?: string | null;
  minPrice: number | null;
  categoryName?: string | null;
};

export type RecommendResult = {
  ok: true;
  source: "openai" | "fallback";
  products: RecommendedProduct[];
};

const STOP_WORDS = new Set([
  // Arabic common
  "في", "من", "الى", "إلى", "على", "عن", "ما", "ماذا", "هل", "كم", "اي", "أي", "هذا", "هذه", "ذلك", "تلك", "هناك", "هنا", "و", "او", "أو", "ثم",
  "انا", "أريد", "اريد", "ابغى", "أبغى", "عايز", "ممكن", "لو", "عندكم", "عندي", "مع", "بدون",
  // English common
  "the", "and", "or", "to", "a", "an", "of", "in", "on", "for", "with", "is", "are", "i", "want", "need", "please",
]);

function tokenize(input: string): string[] {
  const s = String(input ?? "")
    .toLowerCase()
    .replace(/\u0640/g, "") // tatweel
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (!s) return [];

  return s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2)
    .filter((t) => !STOP_WORDS.has(t))
    .slice(0, 8);
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function computeMinPrice(p: any): number | null {
  let out: number | null = null;
  for (const it of p.items ?? []) {
    for (const v of it.variants ?? []) {
      const n = Number(v.price);
      if (!Number.isFinite(n)) continue;
      if (out == null || n < out) out = n;
    }
  }
  return out;
}

function pickPrimaryImage(p: any): { url: string | null; blurDataUrl: string | null } {
  for (const it of p.items ?? []) {
    const img = (it.images ?? [])[0];
    if (img?.url) return { url: img.url, blurDataUrl: img.blurDataUrl ?? null };
  }
  return { url: null, blurDataUrl: null };
}

function asRecommendedProduct(p: any): RecommendedProduct {
  const image = pickPrimaryImage(p);
  return {
    id: String(p.id),
    slug: String(p.slug),
    title: String(p.title),
    imageUrl: image.url,
    imageBlurDataUrl: image.blurDataUrl,
    minPrice: computeMinPrice(p),
    categoryName: p.category?.name ? String(p.category.name) : null,
  };
}

function clampLimit(n: unknown, def = 8) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.min(12, Math.max(1, Math.trunc(v)));
}

async function fetchCandidates(opts: {
  categoryId?: string | null;
  excludeIds?: string[];
  tokens?: string[];
  take: number;
}): Promise<any[]> {
  const and: any[] = [{ isActive: true }];

  if (opts.categoryId) and.push({ categoryId: opts.categoryId });
  if (opts.excludeIds?.length) and.push({ id: { notIn: opts.excludeIds } });

  // Prefer in-stock products (at least one variant > 0)
  and.push({
    items: {
      some: {
        isActive: true,
        variants: { some: { stock: { gt: 0 } } },
      },
    },
  });

  const tokens = (opts.tokens ?? []).filter(Boolean);
  if (tokens.length) {
    and.push({
      OR: tokens.flatMap((t) => ([
        { title: { contains: t, mode: "insensitive" } },
        { description: { contains: t, mode: "insensitive" } },
      ])),
    });
  }

  const where = and.length ? { AND: and } : { isActive: true };

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.take,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: { select: { id: true, name: true, slug: true } },
      items: {
        where: { isActive: true },
        select: {
          colorName: true,
          colorHex: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: { url: true, blurDataUrl: true },
          },
          variants: {
            where: { stock: { gt: 0 } },
            select: { price: true, stock: true },
            take: 20,
          },
        },
        take: 12,
      },
    },
  });
}

function mergeUniqueById(arrs: any[][]): any[] {
  const map = new Map<string, any>();
  for (const arr of arrs) {
    for (const it of arr) {
      if (!it?.id) continue;
      const id = String(it.id);
      if (!map.has(id)) map.set(id, it);
    }
  }
  return Array.from(map.values());
}

function buildAiCandidates(candidates: any[]) {
  return candidates.slice(0, 60).map((p) => {
    const colors = uniq(
      (p.items ?? [])
        .map((it: any) => String(it.colorName ?? "").trim())
        .filter(Boolean)
    ).slice(0, 6);

    const desc = String(p.description ?? "").trim();
    const snippet = desc.length > 140 ? `${desc.slice(0, 140)}…` : desc;

    return {
      id: String(p.id),
      title: String(p.title),
      category: p.category?.name ? String(p.category.name) : "",
      colors,
      description: snippet,
    };
  });
}

async function rankWithOpenAI(opts: {
  locale: Locale;
  message: string;
  contextProduct?: { id: string; title: string; categoryName?: string | null };
  candidates: any[];
  limit: number;
}): Promise<string[] | null> {
  const ids = new Set(opts.candidates.map((c) => String(c.id)));
  if (!ids.size) return [];

  const model = getDefaultOpenAIModel();
  const sys = `You are a product recommendation engine for an e-commerce store.
Output STRICT JSON only: {"productIds": string[]}.
Rules:
- Return at most ${opts.limit} productIds.
- Choose ONLY from the provided candidates (by id).
- Match the user's request; prefer variety (different colors/categories) when possible.
`;
  const user = {
    task: "recommend_products",
    locale: opts.locale,
    message: opts.message,
    contextProduct: opts.contextProduct ?? null,
    candidates: buildAiCandidates(opts.candidates),
    output: { productIds: `Array<string> (<=${opts.limit})` },
  };

  const result = await openaiResponsesJson<any>({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) },
    ],
    max_output_tokens: 350,
    temperature: 0.4,
  });

  if (!result.ok) return null;
  const arr = Array.isArray(result.data?.productIds) ? result.data.productIds : null;
  if (!arr) return null;

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    if (!ids.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= opts.limit) break;
  }
  return out;
}

export async function recommendProducts(input: {
  locale?: Locale;
  message?: string | null;
  productId?: string | null;
  limit?: number;
  excludeIds?: string[];
}): Promise<RecommendResult> {
  const locale: Locale = (input.locale ?? "ar") as Locale;
  const limit = clampLimit(input.limit, 8);
  const message = String(input.message ?? "").trim();

  const exclude = uniq([...(input.excludeIds ?? []).map((x) => String(x).trim()).filter(Boolean)]);
  const productId = input.productId ? String(input.productId).trim() : null;
  if (productId) exclude.push(productId);

  const tokens = message ? tokenize(message) : [];

  const base = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, title: true, categoryId: true, category: { select: { name: true } } },
      })
    : null;

  const categoryId = base?.categoryId ?? null;

  const primary = await fetchCandidates({ categoryId, excludeIds: exclude, tokens, take: 60 });
  const secondary = primary.length < 24 ? await fetchCandidates({ categoryId, excludeIds: exclude, tokens: [], take: 60 }) : [];
  const fallback = (primary.length + secondary.length) < 24 ? await fetchCandidates({ categoryId: null, excludeIds: exclude, tokens, take: 60 }) : [];

  const candidates = mergeUniqueById([primary, secondary, fallback]).slice(0, 60);

  // Try OpenAI ranking when configured and we have a real query (or a context product).
  const rankedIds = (message || base)
    ? await rankWithOpenAI({
        locale,
        message: message || (base ? `recommend similar to: ${base.title}` : ""),
        contextProduct: base
          ? { id: base.id, title: base.title, categoryName: base.category?.name ?? null }
          : undefined,
        candidates,
        limit,
      })
    : null;

  const byId = new Map<string, any>(candidates.map((c) => [String(c.id), c]));
  const pickedIds =
    rankedIds && rankedIds.length
      ? rankedIds
      : candidates.slice(0, limit).map((c) => String(c.id));

  const usedOpenAi = !!(rankedIds && rankedIds.length);
  const products = pickedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map(asRecommendedProduct)
    .slice(0, limit);

  return {
    ok: true,
    source: usedOpenAi ? "openai" : "fallback",
    products,
  };
}
