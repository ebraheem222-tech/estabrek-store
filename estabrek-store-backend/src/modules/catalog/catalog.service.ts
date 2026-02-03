// src/modules/catalog/catalog.service.ts
import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";
import { annotateLinesWithDiscount } from "../../utils/money.js";
import { openaiEmbedText } from "../../lib/openai.js";
import { scoreTextMatch } from "../../lib/searchText.js";

function parseCsv(v?: string | null): string[] | undefined {
  if (!v) return undefined;
  const arr = String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? Array.from(new Set(arr)) : undefined;
}

function num(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "object") {
    if (typeof v.toNumber === "function") {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v.toString === "function") {
      const n = Number(v.toString());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

type ExpiredSale = { id: string; originalPrice: number };

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSaleActive(now: Date, startsAt: Date | null, endsAt: Date | null): boolean {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function isSaleExpired(now: Date, endsAt: Date | null): boolean {
  return !!(endsAt && now > endsAt);
}

function buildVariantPriceFilter(minPrice?: number, maxPrice?: number, now?: Date): Prisma.ProductVariantWhereInput | null {
  if (minPrice == null && maxPrice == null) return null;
  const priceRange: Prisma.DecimalFilter<"ProductVariant"> = {};
  if (minPrice != null) priceRange.gte = minPrice;
  if (maxPrice != null) priceRange.lte = maxPrice;

  const at = now ?? new Date();
  const saleActive: Prisma.ProductVariantWhereInput = {
    AND: [
      { salePrice: priceRange as any },
      { salePrice: { gt: 0 } },
      { OR: [{ saleStartsAt: null }, { saleStartsAt: { lte: at } }] },
      { OR: [{ saleEndsAt: null }, { saleEndsAt: { gte: at } }] },
    ],
  };
  const saleInactive: Prisma.ProductVariantWhereInput = {
    AND: [
      { price: priceRange as any },
      {
        OR: [
          { salePrice: null },
          { salePrice: { lte: 0 } },
          { saleStartsAt: { gt: at } },
          { saleEndsAt: { lt: at } },
        ],
      },
    ],
  };

  return { OR: [saleActive, saleInactive] };
}

function normalizeVariantPricing<T extends { id?: string; price?: any; compareAt?: any; originalPrice?: any; salePrice?: any; saleStartsAt?: any; saleEndsAt?: any }>(
  v: T,
  now: Date,
  expired: ExpiredSale[]
): T {
  const basePrice = num((v as any).price);
  const compareAt = num((v as any).compareAt);
  const originalPrice = num((v as any).originalPrice) ?? basePrice;
  const salePrice = num((v as any).salePrice);
  const saleStartsAt = toDate((v as any).saleStartsAt);
  const saleEndsAt = toDate((v as any).saleEndsAt);

  const active = salePrice != null && salePrice > 0 && isSaleActive(now, saleStartsAt, saleEndsAt);
  const expiredSale = salePrice != null && salePrice > 0 && isSaleExpired(now, saleEndsAt);

  let effectivePrice = basePrice;
  let effectiveCompareAt = compareAt;

  if (active && salePrice != null) {
    effectivePrice = salePrice;
    if (effectiveCompareAt == null && originalPrice != null && originalPrice > salePrice) {
      effectiveCompareAt = originalPrice;
    }
  }

  if (expiredSale && v.id && originalPrice != null && Number.isFinite(originalPrice)) {
    expired.push({ id: v.id, originalPrice });
  }

  return {
    ...(v as any),
    price: effectivePrice ?? (v as any).price,
    compareAt: effectiveCompareAt ?? null,
    originalPrice: originalPrice ?? null,
  };
}

function applySalePricingToItems(
  items: any[],
  now: Date,
  expired: ExpiredSale[]
): any[] {
  return (items ?? []).map((it: any) => ({
    ...it,
    variants: (it.variants ?? []).map((v: any) => normalizeVariantPricing(v, now, expired)),
  }));
}

function computeMinPriceFromItems(items: Array<{ variants?: Array<{ price?: any }> }>): number | null {
  let minPrice: number | null = null;
  for (const it of items ?? []) {
    for (const v of it.variants ?? []) {
      const price = num((v as any).price);
      if (price == null) continue;
      if (minPrice == null || price < minPrice) minPrice = price;
    }
  }
  return minPrice;
}

async function resetExpiredSales(db: typeof prisma, expired: ExpiredSale[]) {
  if (!expired.length) return;
  const byId = new Map<string, number>();
  for (const v of expired) {
    if (!v?.id) continue;
    if (!Number.isFinite(v.originalPrice)) continue;
    byId.set(v.id, v.originalPrice);
  }
  const updates = Array.from(byId.entries());
  if (!updates.length) return;
  await Promise.all(
    updates.map(([id, originalPrice]) =>
      db.productVariant.update({
        where: { id },
        data: {
          price: originalPrice,
          originalPrice: null,
          salePrice: null,
          saleStartsAt: null,
          saleEndsAt: null,
        },
      })
    )
  );
}

const baseProductSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  isActive: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
};

const categorySelect = {
  select: {
    id: true,
    name: true,
    slug: true,
    parentId: true,
  },
};

function buildItemsSelect(lite: boolean) {
  if (!lite) {
    return {
      where: { isActive: true },
      include: {
        // two images per item (primary first)
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 2,
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
            isPrimary: true,
            view: true,
            dominantColorHex: true,
            palette: true,
            blurDataUrl: true,
          },
        },
        variants: {
          include: { size: true },
          orderBy: { size: { order: "asc" } },
        },
      },
    } as const;
  }
  return {
    where: { isActive: true },
    select: {
      id: true,
      colorName: true,
      boxLabel: true,
      colorHex: true,
      suggestedColors: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 2,
        select: {
          id: true,
          url: true,
          alt: true,
          position: true,
          isPrimary: true,
          view: true,
          dominantColorHex: true,
          palette: true,
          blurDataUrl: true,
        },
      },
      variants: {
        select: {
          id: true,
          sizeId: true,
          price: true,
          compareAt: true,
          originalPrice: true,
          salePrice: true,
          saleStartsAt: true,
          saleEndsAt: true,
          stock: true,
        },
      },
    },
  } as const;
}

const SEMANTIC_MIN_QUERY_LENGTH = 3;
const SEMANTIC_MAX_CANDIDATES = 2000;
const SEMANTIC_MAX_RESULTS = 1200;

const EMBED_CACHE_TTL_MS = 10 * 60_000;
const EMBED_CACHE_MAX = 500;
const EMBED_CACHE = new Map<string, { v: number[]; t: number }>();

function normalizeEmbedKey(query: string) {
  return query.trim().toLowerCase();
}

function getCachedEmbedding(query: string): number[] | null {
  const key = normalizeEmbedKey(query);
  const hit = EMBED_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > EMBED_CACHE_TTL_MS) {
    EMBED_CACHE.delete(key);
    return null;
  }
  return hit.v;
}

function setCachedEmbedding(query: string, embedding: number[]) {
  const key = normalizeEmbedKey(query);
  if (EMBED_CACHE.size >= EMBED_CACHE_MAX && !EMBED_CACHE.has(key)) {
    const oldest = EMBED_CACHE.keys().next().value;
    if (oldest) EMBED_CACHE.delete(oldest);
  }
  EMBED_CACHE.set(key, { v: embedding, t: Date.now() });
}

async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const cached = getCachedEmbedding(query);
  if (cached) return cached;
  const embedded = await openaiEmbedText(query);
  if (!embedded.ok) return null;
  setCachedEmbedding(query, embedded.embedding);
  return embedded.embedding;
}

type SemanticCandidate = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  embedding?: any;
  category?: { name?: string | null } | null;
};

function asVector(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.map((x) => Number(x));
  if (arr.some((n) => !Number.isFinite(n))) return null;
  return arr;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

function minScoreForQuery(query: string) {
  const len = query.trim().length;
  if (len < 4) return 0.2;
  if (len < 8) return 0.16;
  return 0.12;
}

function buildCandidateText(c: SemanticCandidate): string {
  return [c.title, c.description, c.slug, c.category?.name].filter(Boolean).join(" ");
}

function rankSemanticCandidates(query: string, queryEmbedding: number[], candidates: SemanticCandidate[]) {
  const ranked: Array<{ id: string; score: number }> = [];
  for (const c of candidates) {
    const text = buildCandidateText(c);
    const lexicalScore = scoreTextMatch(query, text);
    const titleScore = scoreTextMatch(query, c.title);

    let semanticScore = 0;
    let hasEmbedding = false;
    const vec = asVector(c.embedding);
    if (vec && vec.length === queryEmbedding.length) {
      semanticScore = cosineSimilarity(queryEmbedding, vec);
      hasEmbedding = true;
    }

    let score = 0;
    if (hasEmbedding) {
      score = semanticScore * 0.7 + lexicalScore * 0.2 + titleScore * 0.1;
    } else {
      score = Math.max(lexicalScore, titleScore * 0.9);
    }

    if (!Number.isFinite(score) || score <= 0) continue;
    ranked.push({ id: c.id, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

async function buildFacetsForProductIds(args: {
  productIds: string[];
  itemWhereNoColor: Prisma.ProductItemWhereInput;
  itemWhereNoSize: Prisma.ProductItemWhereInput;
  minPrice?: number;
  maxPrice?: number;
  colorsArr?: string[];
  sizeArr?: string[];
  now?: Date;
}) {
  const ids = Array.from(new Set(args.productIds.map((id) => String(id)).filter(Boolean)));
  if (!ids.length) {
    return {
      colors: [],
      sizes: [],
      selected: {
        colors: args.colorsArr ?? [],
        sizeIds: args.sizeArr ?? [],
      },
    };
  }

  const colorRows = await prisma.productItem.groupBy({
    by: ["colorName", "colorHex"],
    where: {
      AND: [
        args.itemWhereNoColor,
        { productId: { in: ids } },
      ],
    },
    _count: { _all: true },
  });

  const priceFilter = buildVariantPriceFilter(args.minPrice, args.maxPrice, args.now);
  const hasPrice = !!priceFilter;

  const sizeRows = await prisma.productVariant.groupBy({
    by: ["sizeId"],
    where: {
      ...(hasPrice ? { AND: [priceFilter as Prisma.ProductVariantWhereInput] } : {}),
      item: { AND: [args.itemWhereNoSize, { productId: { in: ids } }] },
    },
    _count: { _all: true },
  });

  const sizeIds = sizeRows.map((r) => r.sizeId);
  const sizes = sizeIds.length
    ? await prisma.size.findMany({
        where: { id: { in: sizeIds }, active: true },
        select: { id: true, name: true, order: true },
      })
    : [];
  const sizeById = new Map(sizes.map((s) => [s.id, s]));

  return {
    colors: colorRows
      .map((r) => ({
        name: r.colorName,
        colorHex: r.colorHex,
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    sizes: sizeRows
      .map((r) => ({
        id: r.sizeId,
        name: sizeById.get(r.sizeId)?.name ?? r.sizeId,
        order: sizeById.get(r.sizeId)?.order ?? 0,
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count || a.order - b.order || a.name.localeCompare(b.name)),
    selected: {
      colors: args.colorsArr ?? [],
      sizeIds: args.sizeArr ?? [],
    },
  };
}

function buildBaseProductWhere(input: { q?: string; category?: string; categoryId?: string }): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

  if (input.q) {
    and.push({
      OR: [
        { title: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
        { slug: { contains: input.q, mode: "insensitive" } },
      ],
    });
  }

  if (input.categoryId) {
    and.push({ categoryId: input.categoryId });
  } else if (input.category) {
    and.push({ category: { slug: input.category } });
  }

  return and.length ? { AND: and } : {};
}

function buildItemWhere(input: {
  colors?: string[];
  sizeIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  now?: Date;
}): Prisma.ProductItemWhereInput {
  const and: Prisma.ProductItemWhereInput[] = [{ isActive: true }];

  if (input.colors?.length) {
    and.push({
      OR: input.colors.map((c) => ({ colorName: { equals: c, mode: "insensitive" } })),
    });
  }

  // Build a single variants.some filter so one variant satisfies ALL constraints
  const variantSome: Prisma.ProductVariantWhereInput = {};
  const variantAnd: Prisma.ProductVariantWhereInput[] = [];

  if (input.sizeIds?.length) {
    variantAnd.push({ sizeId: { in: input.sizeIds } });
  }

  const priceFilter = buildVariantPriceFilter(input.minPrice, input.maxPrice, input.now);
  if (priceFilter) variantAnd.push(priceFilter);

  if (input.inStock) {
    variantAnd.push({ stock: { gt: 0 } });
  }

  if (variantAnd.length) {
    variantSome.AND = variantAnd;
    and.push({ variants: { some: variantSome } });
  }

  return and.length === 1 ? { isActive: true } : { AND: and };
}

/**
 * Product filters + item-level filters.
 * NOTE: When both color + size are provided, the SAME ProductItem must satisfy them.
 */
function buildProductsWhere(input: {
  q?: string;
  category?: string; // category slug
  categoryId?: string;
  inStock?: boolean;

  // legacy single
  color?: string;
  sizeId?: string;

  // multi-select (comma separated)
  colors?: string;
  sizeIds?: string;

  minPrice?: number;
  maxPrice?: number;
  now?: Date;
}) {
  const baseProductWhere = buildBaseProductWhere({ q: input.q, category: input.category, categoryId: input.categoryId });
  const now = input.now ?? new Date();

  const colorsArr = parseCsv(input.colors ?? input.color);
  const sizeArr = parseCsv(input.sizeIds ?? input.sizeId);

  const itemWhereFull = buildItemWhere({
    colors: colorsArr,
    sizeIds: sizeArr,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    inStock: input.inStock,
    now,
  });

  const hasItemFilters = !!(colorsArr?.length || sizeArr?.length || input.minPrice != null || input.maxPrice != null || input.inStock);

  const productWhere: Prisma.ProductWhereInput = hasItemFilters
    ? { AND: [baseProductWhere, { items: { some: itemWhereFull } }] }
    : baseProductWhere;

  // facets helpers (apply all filters EXCEPT the facet itself)
  const itemWhereNoColor = buildItemWhere({
    colors: undefined,
    sizeIds: sizeArr,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    inStock: input.inStock,
    now,
  });
  const itemWhereNoSize = buildItemWhere({
    colors: colorsArr,
    sizeIds: undefined,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    inStock: input.inStock,
    now,
  });

  return { productWhere, baseProductWhere, itemWhereFull, itemWhereNoColor, itemWhereNoSize, colorsArr, sizeArr };
}

async function listProductsSemantic(params: {
  q?: string;
  category?: string;
  categoryId?: string;
  inStock?: boolean;
  color?: string;
  sizeId?: string;
  colors?: string;
  sizeIds?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  pageSize: number;
  limit?: number;
  lite?: boolean;
  includeFacets?: boolean;
}) {
  const query = params.q?.trim() ?? "";
  const includeFacets = params.includeFacets !== false;
  const lite = !!params.lite;
  if (!query || query.length < SEMANTIC_MIN_QUERY_LENGTH) return null;

  const now = new Date();
  const embedded = await getQueryEmbedding(query);
  if (!embedded) return null;

  const {
    productWhere,
    itemWhereNoColor,
    itemWhereNoSize,
    colorsArr,
    sizeArr,
  } = buildProductsWhere({ ...params, q: undefined, now });

  const candidates = await prisma.product.findMany({
    where: productWhere,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      embedding: true,
      category: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: SEMANTIC_MAX_CANDIDATES,
  });

  if (!candidates.length) return null;

  const ranked = rankSemanticCandidates(query, embedded, candidates);
  if (!ranked.length) return null;

  const minScore = minScoreForQuery(query);
  const filtered = ranked.filter((r) => r.score >= minScore);
  const finalRanked = (filtered.length ? filtered : ranked).slice(0, SEMANTIC_MAX_RESULTS);
  const orderedIds = finalRanked.map((r) => r.id);
  if (!orderedIds.length) return null;

  const pageSize: number = params.limit ?? params.pageSize;
  const skip = (params.page - 1) * pageSize;
  const pageIds = orderedIds.slice(skip, skip + pageSize);

  const facetsPromise = includeFacets
    ? buildFacetsForProductIds({
        productIds: orderedIds,
        itemWhereNoColor,
        itemWhereNoSize,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        colorsArr,
        sizeArr,
        now,
      })
    : Promise.resolve(undefined);

  const [items, facets] = await Promise.all([
    listProductsByIds(pageIds, { lite }),
    facetsPromise,
  ]);

  return {
    items,
    total: orderedIds.length,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(orderedIds.length / pageSize)),
    facets,
  };
}

export async function listProducts(params: {
  q?: string;
  category?: string;
  categoryId?: string;
  inStock?: boolean;
  // legacy
  color?: string;
  sizeId?: string;
  // multi-select
  colors?: string;
  sizeIds?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "latest" | "title_asc" | "title_desc" | "price_asc" | "price_desc";
  page: number;
  pageSize: number;
  limit?: number;
  lite?: boolean;
  includeFacets?: boolean;
}) {
  const sort = params.sort ?? "latest";
  const query = params.q?.trim() ?? "";
  const includeFacets = params.includeFacets !== false;
  const lite = !!params.lite;
  const now = new Date();
  const useSemantic = !!query && sort === "latest";
  if (useSemantic) {
    const semantic = await listProductsSemantic(params);
    if (semantic) return semantic;
  }

  const {
    productWhere,
    baseProductWhere,
    itemWhereNoColor,
    itemWhereNoSize,
    colorsArr,
    sizeArr,
  } = buildProductsWhere({ ...params, now });

  const pageSize: number = params.limit ?? params.pageSize;
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "title_asc"
      ? { title: "asc" }
      : sort === "title_desc"
      ? { title: "desc" }
      : { createdAt: "desc" };

  const skip = (params.page - 1) * pageSize;
  const itemSelect: any = buildItemsSelect(lite);
  const facetsPromise = includeFacets
    ? (async () => {
        // COLORS facets (ignore selected colors, keep size + price)
        const colorRows = await prisma.productItem.groupBy({
          by: ["colorName", "colorHex"],
          where: {
            AND: [
              itemWhereNoColor,
              { product: baseProductWhere },
            ],
          },
          _count: { _all: true },
        });

        // SIZES facets (ignore selected sizes, keep color + price)
        const priceFilter = buildVariantPriceFilter(params.minPrice, params.maxPrice, now);
        const hasPrice = !!priceFilter;

        const sizeRows = await prisma.productVariant.groupBy({
          by: ["sizeId"],
          where: {
            ...(hasPrice ? { AND: [priceFilter as Prisma.ProductVariantWhereInput] } : {}),
            item: {
              AND: [
                itemWhereNoSize,
                { product: baseProductWhere },
              ],
            },
          },
          _count: { _all: true },
        });
        const sizeIds = sizeRows.map((r) => r.sizeId);
        const sizes = sizeIds.length
          ? await prisma.size.findMany({
              where: { id: { in: sizeIds }, active: true },
              select: { id: true, name: true, order: true },
            })
          : [];
        const sizeById = new Map(sizes.map((s) => [s.id, s]));

        return {
          colors: colorRows
            .map((r) => ({
              name: r.colorName,
              colorHex: r.colorHex,
              count: r._count._all,
            }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
          sizes: sizeRows
            .map((r) => ({
              id: r.sizeId,
              name: sizeById.get(r.sizeId)?.name ?? r.sizeId,
              order: sizeById.get(r.sizeId)?.order ?? 0,
              count: r._count._all,
            }))
            .sort((a, b) => b.count - a.count || a.order - b.order || a.name.localeCompare(b.name)),
          selected: {
            colors: colorsArr ?? [],
            sizeIds: sizeArr ?? [],
          },
        };
      })()
    : Promise.resolve(undefined);

  const [total, products, facets] = await Promise.all([
    prisma.product.count({ where: productWhere }),
    prisma.product.findMany({
      where: productWhere,
      orderBy,
      skip,
      take: pageSize,
      select: {
        ...baseProductSelect,
        category: categorySelect,
        items: itemSelect,
      },
    }),
    facetsPromise,
  ]);

  const expiredSales: ExpiredSale[] = [];

  const items = products.map((p) => {
    const pricedItems = applySalePricingToItems((p.items ?? []) as any[], now, expiredSales);
    const minPrice = computeMinPriceFromItems(pricedItems);
    return { ...p, items: pricedItems, minPrice };
  });

  // Optional in-page price sorting (minPrice is computed above)
  const sortedItems =
    sort === "price_asc"
      ? [...items].sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0) || a.title.localeCompare(b.title))
      : sort === "price_desc"
      ? [...items].sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0) || a.title.localeCompare(b.title))
      : items;


  await resetExpiredSales(prisma, expiredSales);
  return {
    items: sortedItems,
    total,
    page: params.page,
    pageSize: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets,
  };
}

export async function getProductById(id: string) {
  // `findUnique` cannot include extra filters; use findFirst for id + isActive.
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    select: {
      ...baseProductSelect,
      category: true,
      items: {
        include: {
          images: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
              isPrimary: true,
              view: true,
              dominantColorHex: true,
              palette: true,
              blurDataUrl: true,
            },
          },
          variants: { include: { size: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      reviews: true,
      comments: true,
    },
  });
  if (!product) return null;
  const now = new Date();
  const expiredSales: ExpiredSale[] = [];
  const pricedItems = applySalePricingToItems(product.items ?? [], now, expiredSales);
  const minPrice = computeMinPriceFromItems(pricedItems);
  await resetExpiredSales(prisma, expiredSales);
  return { ...product, items: pricedItems, minPrice };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      ...baseProductSelect,
      category: true,
      items: {
        include: {
          images: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
              isPrimary: true,
              view: true,
              dominantColorHex: true,
              palette: true,
              blurDataUrl: true,
            },
          },
          variants: { include: { size: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      reviews: true,
      comments: true,
    },
  });
  if (!product) return null;
  const now = new Date();
  const expiredSales: ExpiredSale[] = [];
  const pricedItems = applySalePricingToItems(product.items ?? [], now, expiredSales);
  const minPrice = computeMinPriceFromItems(pricedItems);
  await resetExpiredSales(prisma, expiredSales);
  return { ...product, items: pricedItems, minPrice };
}

export async function getCategoriesTree() {
  const all = await prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }] });
  const byParent = new Map<string | null, typeof all>();
  for (const c of all) {
    const key = c.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  function build(parentId: string | null): any[] {
    return (byParent.get(parentId) ?? []).map((c) => ({
      ...c,
      children: build(c.id),
    }));
  }
  return build(null);
}

export function listSizes() {
  return prisma.size.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }] });
}

export async function listProductItems(productId: string) {
  const items = await prisma.productItem.findMany({
    where: { productId, isActive: true },
    include: {
      images: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          url: true,
          alt: true,
          position: true,
          isPrimary: true,
          view: true,
          dominantColorHex: true,
          palette: true,
          blurDataUrl: true,
        },
      },
      variants: { include: { size: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const now = new Date();
  const expiredSales: ExpiredSale[] = [];
  const priced = applySalePricingToItems(items ?? [], now, expiredSales);
  await resetExpiredSales(prisma, expiredSales);
  return priced;
}

export async function getVariant(id: string) {
  const v = await prisma.productVariant.findUnique({
    where: { id },
    include: {
      item: {
        include: {
          product: true,
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
              isPrimary: true,
              view: true,
              dominantColorHex: true,
              palette: true,
              blurDataUrl: true,
            },
          },
        },
      },
      size: true,
    },
  });
  if (!v) return v;
  const now = new Date();
  const expiredSales: ExpiredSale[] = [];
  const normalized = normalizeVariantPricing(v as any, now, expiredSales);
  await resetExpiredSales(prisma, expiredSales);
  return normalized as any;
}

export function listProductImages(productId: string) {
  return prisma.productItemImage.findMany({
    where: { item: { productId } },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      productItemId: true,
      url: true,
      alt: true,
      position: true,
      isPrimary: true,
      createdAt: true,
      view: true,
      dominantColorHex: true,
      palette: true,
      blurDataUrl: true,
    },
  });
}

export async function listProductsByIds(ids: string[], opts?: { lite?: boolean }) {
  const clean = ids.map((x) => String(x)).filter(Boolean);
  if (!clean.length) return [];

  const lite = !!opts?.lite;
  const itemSelect: any = buildItemsSelect(lite);

  const products = await prisma.product.findMany({
    where: { id: { in: clean }, isActive: true },
    select: {
      ...baseProductSelect,
      category: categorySelect,
      items: itemSelect,
    },
  });

  const now = new Date();
  const expiredSales: ExpiredSale[] = [];

  const items = products.map((p) => {
    const pricedItems = applySalePricingToItems((p.items ?? []) as any[], now, expiredSales);
    const minPrice = computeMinPriceFromItems(pricedItems);
    return { ...p, items: pricedItems, minPrice };
  });

  const byId = new Map(items.map((p) => [p.id, p]));
  await resetExpiredSales(prisma, expiredSales);
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

export function createReview(productId: string, data: { rating: number; title?: string; body: string; userId?: string }) {
  return prisma.review.create({
    data: {
      productId,
      userId: data.userId ?? null,
      rating: data.rating,
      title: data.title,
      body: data.body,
      // status default PENDING per schema
    },
  });
}

export function createComment(productId: string, data: { body: string; userId?: string }) {
  return prisma.productComment.create({
    data: {
      productId,
      userId: data.userId ?? null,
      body: data.body,
      // status default PENDING per schema
    },
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function httpError(code: string, message?: string, statusCode = 400, meta?: any) {
  const err: any = new Error(message ?? code);
  err.statusCode = statusCode;
  err.code = code;
  if (meta !== undefined) err.meta = meta;
  return err;
}

async function getCurrencyCode() {
  const s = await prisma.siteSettings.findFirst({ select: { currencyCode: true } });
  return s?.currencyCode ?? "ILS";
}

async function computeCouponDiscount(args: { code: string; subtotal: number }) {
  // kept for non-transactional callers (quote endpoints)
  return computeCouponDiscountWithClient(prisma, args);
}

async function computeCouponDiscountWithClient(
  db: typeof prisma,
  args: { code: string; subtotal: number }
) {
  const code = args.code.toUpperCase().trim();
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) {
    throw httpError("COUPON_NOT_FOUND", "Coupon not found", 400);
  }
  if (!coupon.isActive) {
    throw httpError("COUPON_INACTIVE", "Coupon is inactive", 400);
  }
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw httpError("COUPON_NOT_ACTIVE_YET", "Coupon not active yet", 400);
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    throw httpError("COUPON_EXPIRED", "Coupon expired", 400);
  }
  const minCart = coupon.minCart != null ? Number(coupon.minCart) : null;
  if (minCart != null && args.subtotal < minCart) {
    throw httpError("COUPON_MIN_CART", "Minimum cart not met", 400, { minCart });
  }

  // Do NOT check usageLimit here (quote should not fail just because of a race).
  // We check usageLimit during submit inside a transaction.

  let discount = 0;
  const discountValue = Number(coupon.discountValue ?? 0);

  if (coupon.discountType === "PERCENT") {
    discount = round2((args.subtotal * discountValue) / 100);
    const maxDiscount = coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null;
    if (maxDiscount != null) discount = Math.min(discount, maxDiscount);
  } else {
    discount = round2(discountValue);
  }

  if (discount < 0) discount = 0;
  if (discount > args.subtotal) discount = args.subtotal;

  return { coupon, discount };
}

type CartItemInput = { variantId: string; quantity: number };

function normalizeCartItems(items: CartItemInput[]): CartItemInput[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const id = it.variantId;
    const q = Math.max(1, Math.floor(it.quantity || 1));
    map.set(id, (map.get(id) ?? 0) + q);
  }
  return Array.from(map.entries()).map(([variantId, quantity]) => ({ variantId, quantity }));
}

type CartLine = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  productId: string;
  productTitle: string;
  productSlug?: string | null;
  itemId?: string | null;
  colorName?: string | null;
  boxLabel?: string | null;
  colorHex?: string | null;
  sizeId?: string | null;
  sizeName?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  imageBlurDataUrl?: string | null;
};

async function loadLinesForItems(
  db: typeof prisma,
  items: CartItemInput[]
): Promise<CartLine[]> {
  const normalized = normalizeCartItems(items);
  const ids = normalized.map((x) => x.variantId);

  const variants = await db.productVariant.findMany({
    where: { id: { in: ids } },
    include: {
      item: {
        include: {
          product: true,
          images: { orderBy: { position: "asc" } },
        },
      },
      size: true,
    },
  });

  const byId = new Map(variants.map((v) => [v.id, v]));
  const out: CartLine[] = [];
  const now = new Date();
  const expiredSales: ExpiredSale[] = [];

  for (const it of normalized) {
    const v = byId.get(it.variantId);
    if (!v || !v.item?.isActive || !v.item?.product?.isActive) {
      throw httpError("VARIANT_NOT_AVAILABLE", "Variant not available", 400, { variantId: it.variantId });
    }

    const pricedVariant = normalizeVariantPricing(v as any, now, expiredSales);
    const unitPrice = Number((pricedVariant as any).price ?? v.price);
    const lineSubtotal = round2(unitPrice * it.quantity);

    const imgs = (v.item as any).images ?? [];
    const primary = imgs.find((x: any) => x.isPrimary) ?? imgs[0];
    const imageUrl = primary?.url ?? null;
    const imageBlurDataUrl = (primary as any)?.blurDataUrl ?? null;

    out.push({
      variantId: v.id,
      quantity: it.quantity,
      unitPrice,
      lineSubtotal,
      productId: v.item.productId,
      productTitle: v.item.product.title,
      productSlug: v.item.product.slug,
      itemId: v.productItemId,
      colorName: v.item.colorName,
      boxLabel: (v.item as any).boxLabel ?? null,
      colorHex: v.item.colorHex,
      sizeId: v.sizeId,
      sizeName: v.size?.name ?? null,
      sku: v.sku,
      imageUrl,
      imageBlurDataUrl,
    });
  }

  await resetExpiredSales(db, expiredSales);
  return out;
}

export async function quoteCart(data: { items: CartItemInput[]; couponCode?: string }) {
  const lines = await loadLinesForItems(prisma, data.items);
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineSubtotal, 0));

  let discountAmount = 0;
  let applied: any = null;

  if (data.couponCode) {
    const { coupon, discount } = await computeCouponDiscount({ code: data.couponCode, subtotal });
    discountAmount = discount;
    applied = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue ?? 0),
      maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
      minCart: coupon.minCart != null ? Number(coupon.minCart) : null,
    };
  }

  const total = round2(subtotal - discountAmount);
  const currencyCode = await getCurrencyCode();

  return {
    currencyCode,
    subtotal,
    discountAmount,
    total,
    coupon: applied,
    lines: annotateLinesWithDiscount(lines, discountAmount),
  };
}

export async function quoteOrderRequest(data: { variantId: string; quantity: number; couponCode?: string }) {
  const out = await quoteCart({
    items: [{ variantId: data.variantId, quantity: data.quantity }],
    couponCode: data.couponCode,
  });

  const line = out.lines[0];
  return {
    variantId: data.variantId,
    quantity: data.quantity,
    currencyCode: out.currencyCode,
    unitPrice: line.unitPrice,
    subtotal: out.subtotal,
    discountAmount: out.discountAmount,
    total: out.total,
    coupon: out.coupon,
  };
}

export async function submitOrderRequest(data: {
  items?: CartItemInput[];
  variantId?: string;
  quantity?: number;
  customerName: string;
  phone: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  address?: string;
  note?: string;
  couponCode?: string;
  source?: string;
}) {
  const now = new Date();

  const items: CartItemInput[] =
    Array.isArray(data.items) && data.items.length
      ? data.items
      : [{ variantId: data.variantId as string, quantity: data.quantity ?? 1 }];

  const normalized = normalizeCartItems(items);

  const req = await prisma.$transaction(async (tx) => {
    const lines = await loadLinesForItems(tx as any, normalized);
    const subtotal = round2(lines.reduce((sum, l) => sum + l.lineSubtotal, 0));
    const currencyCode = (await tx.siteSettings.findFirst({ select: { currencyCode: true } }))?.currencyCode ?? "ILS";

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountAmount = 0;
    let couponRow: any = null;

    if (data.couponCode) {
      const code = data.couponCode.toUpperCase().trim();
      couponRow = await tx.coupon.findUnique({ where: { code } });
      if (!couponRow) throw httpError("COUPON_NOT_FOUND", "Coupon not found", 400);
      if (!couponRow.isActive) throw httpError("COUPON_INACTIVE", "Coupon is inactive", 400);
      if (couponRow.startsAt && now < couponRow.startsAt) throw httpError("COUPON_NOT_ACTIVE_YET", "Coupon not active yet", 400);
      if (couponRow.endsAt && now > couponRow.endsAt) throw httpError("COUPON_EXPIRED", "Coupon expired", 400);

      const minCart = couponRow.minCart != null ? Number(couponRow.minCart) : null;
      if (minCart != null && subtotal < minCart) throw httpError("COUPON_MIN_CART", "Minimum cart not met", 400, { minCart });

      if (couponRow.usageLimit != null && couponRow.usedCount >= couponRow.usageLimit) {
        throw httpError("COUPON_USAGE_LIMIT_REACHED", "Coupon usage limit reached", 400);
      }

      const discountValue = Number(couponRow.discountValue ?? 0);
      if (couponRow.discountType === "PERCENT") {
        discountAmount = round2((subtotal * discountValue) / 100);
        const maxDiscount = couponRow.maxDiscount != null ? Number(couponRow.maxDiscount) : null;
        if (maxDiscount != null) discountAmount = Math.min(discountAmount, maxDiscount);
      } else {
        discountAmount = round2(discountValue);
      }

      if (discountAmount < 0) discountAmount = 0;
      if (discountAmount > subtotal) discountAmount = subtotal;

      couponId = couponRow.id;
      couponCode = couponRow.code;
    }

    const total = round2(subtotal - discountAmount);

    const first = lines[0];

    const created = await tx.orderRequest.create({
      data: {
        // keep legacy fields populated for compatibility
        variantId: first.variantId,
        quantity: first.quantity,

        customerName: data.customerName,
        phone: data.phone,
        whatsapp: data.whatsapp,
        country: data.country,
        city: data.city,
        address: data.address,
        note: data.note,
        source: data.source ?? "storefront",

        currencyCode,

        // pricing snapshot (on the whole request)
        unitPrice: first.unitPrice,
        subtotal,
        discountAmount,
        total,

        couponId,
        couponCode,

        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineSubtotal: l.lineSubtotal,
            productId: l.productId,
            productTitle: l.productTitle,
            productSlug: l.productSlug ?? null,
            itemId: l.itemId ?? null,
            colorName: l.colorName ?? null,
            colorHex: l.colorHex ?? null,
            sizeId: l.sizeId ?? null,
            sizeName: l.sizeName ?? null,
            sku: l.sku ?? null,
            imageUrl: l.imageUrl ?? null,
          })),
        },
      },
    });

    await tx.orderRequestHistory.create({
      data: { orderRequestId: created.id, fromStatus: null, toStatus: "NEW", note: "Submitted from storefront" },
    });

    if (couponRow) {
      if (couponRow.usageLimit != null) {
        const upd = await tx.coupon.updateMany({
          where: { id: couponRow.id, usedCount: { lt: couponRow.usageLimit } },
          data: { usedCount: { increment: 1 } },
        });
        if (upd.count === 0) throw httpError("COUPON_USAGE_LIMIT_REACHED", "Coupon usage limit reached", 400);
      } else {
        await tx.coupon.update({ where: { id: couponRow.id }, data: { usedCount: { increment: 1 } } });
      }

      await tx.couponRedemption.create({
        data: {
          couponId: couponRow.id,
          orderRequestId: created.id,
          phone: data.phone,
        },
      });
    }

    return created;
  });

  return req;
}
