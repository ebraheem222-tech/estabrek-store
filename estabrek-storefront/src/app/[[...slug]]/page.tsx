import React from "react";
import { notFound } from "next/navigation";
import {
  getBootstrap,
  getBestSellersIds,
  getNewArrivalsIds,
  getPageBySlug,
  getProductById,
  getProductBySlug,
  getPublicSettings,
  listProducts,
  listProductsByIds,
  listCategories,
} from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { paramsToSlug } from "@/lib/slug";
import { CmsPageRenderer } from "@/cms";
import { ScriptTags } from "@/components/ScriptTags";
import ProductCard from "@/components/ProductCard";
import { QuickAddButton } from "@/components/QuickAddButton";
import FallbackHome from "@/components/FallbackHome";
import FallbackShop from "@/components/FallbackShop";
import FallbackContact from "@/components/FallbackContact";
import CartClient from "@/components/CartClient";
import { normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { ProductMini } from "@/cms/types";


function walkComponents(list: any[] | undefined, visit: (c: any) => void, seen = new Set<any>()) {
  if (!Array.isArray(list)) return;
  for (const c of list) {
    if (!c || typeof c !== "object") continue;
    if (seen.has(c)) continue; // avoid cycles
    seen.add(c);
    visit(c);
    const children = Array.isArray((c as any)?.props?.children)
      ? (c as any).props.children
      : Array.isArray((c as any)?.children)
      ? (c as any).children
      : [];
    if (children.length) walkComponents(children, visit, seen);
  }
}

type SP = Record<string, string | string[] | undefined>;

export async function renderCmsPageBySlug(
  slug: string,
  searchParams?: SP,
  options?: { allowFallback?: boolean; allowNotFound?: boolean }
) {
  const allowFallback = options?.allowFallback !== false;
  const allowNotFound = options?.allowNotFound !== false;

  // URL-driven filters for CMS data components (ProductGrid/ProductSlider + FiltersBar)
  const f = normalizeFiltersFromSearchParams(searchParams ?? {});

  const page = await getPageBySlug(slug);

  // ✅ Fallback pages if CMS page isn't published yet
  if (!page) {
    if (allowFallback) {
      if (slug === "/") return <FallbackHome />;
      if (slug === "/shop") return <FallbackShop />;
      if (slug === "/cart") {
        const settings = await getPublicSettings().catch(() => null);
        const site = settings?.site || {};
        return (
          <CartClient
            checkoutMode={(site as any).checkoutMode ?? "WHATSAPP"}
            whatsappNumber={(site as any).whatsappNumber ?? (site as any).contactPhone ?? null}
            ordersEmail={(site as any).ordersEmail ?? (site as any).contactEmail ?? null}
            stripeEnabled={(site as any).stripeEnabled ?? false}
            paypalEnabled={(site as any).paypalEnabled ?? false}
          />
        );
      }
      if (slug === "/contact") return <FallbackContact />;
      if (allowNotFound) notFound();
      return null;
    }
    if (allowNotFound) notFound();
    return null;
  }

  const bootstrap = await getBootstrap();
  const currencyCode = (bootstrap.site as any)?.currencyCode || "ILS";

  // Prefetch minimal product info for CMS-linked cards (e.g., CARDS linking to /p/:slug)
  const productLookup: Record<string, ProductMini> = {};
  const wantSlugs = new Set<string>();
  const wantIds = new Set<string>();
  const slugToId = new Map<string, string>();
  const queryTasks: Array<{ comp: any; categoryId?: string; limit: number; kind: "grid" | "slider" }> = [];
  let hasFiltersBar = false;
  const autoProductSections: Array<{ sec: any; kind: "new" | "best"; limit: number }> = [];
  const autoProductComponents: Array<{ comp: any; kind: "new" | "best"; limit: number }> = [];
  const slugSections: Array<{ sec: any; slugs: string[] }> = [];

  const sections = ((page as any).sections ?? []) as any[];
  for (const sec of sections) {
    const t = sec?.type;
    const d = sec?.data ?? {};
    if (!t) continue;

    // Auto product sliders (IDs will be fetched from backend, then injected into section.data)
    if (t === "NEW_ARRIVALS_SLIDER" || t === "BEST_SELLERS_SLIDER") {
      const limit = Math.max(1, Math.min(50, Number((d as any)?.limit ?? 12)));
      const ids = Array.isArray((d as any)?.productIds) ? (d as any).productIds : [];
      if (!ids || ids.length === 0) {
        autoProductSections.push({ sec, kind: t === "NEW_ARRIVALS_SLIDER" ? "new" : "best", limit });
      }
    }

    // Featured products style sections
    const ids: any[] = Array.isArray(d.productIds) ? d.productIds : Array.isArray(d.products) ? d.products : [];
    for (const id of ids) {
      if (typeof id === "string" && id.trim()) wantIds.add(id.trim());
    }
    const rawSlugs: any[] = Array.isArray(d.productSlugs) ? d.productSlugs : [];
    const slugs = rawSlugs
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
    if (slugs.length) {
      slugSections.push({ sec, slugs });
      for (const slugVal of slugs) wantSlugs.add(slugVal);
    }

    // Cards with product hrefs
    if (t === "CARDS" && Array.isArray(d.cards)) {
      for (const c of d.cards) {
        const pid = typeof c?.productId === "string" ? c.productId.trim() : "";
        if (pid) wantIds.add(pid);
        const href =
          (typeof c?.buttonHref === "string" ? c.buttonHref : "") ||
          (typeof c?.href === "string" ? c.href : "") ||
          (typeof c?.linkHref === "string" ? c.linkHref : "");
        const m = typeof href === "string" ? href.match(/\/p\/([^/?#]+)/) : null;
        if (m?.[1]) wantSlugs.add(decodeURIComponent(m[1]));
      }
    }
  }

  // Detect CMS components (productGrid/productSlider/filtersBar) inside sections
  for (const sec of sections) {
    const comps = (sec?.data as any)?.components as any[] | undefined;
    walkComponents(comps, (comp) => {
      if (!comp || typeof comp !== "object") return;
      if (comp.kind === "filtersBar") hasFiltersBar = true;

      if (comp.kind === "productGrid" || comp.kind === "productSlider") {
        const source = (comp.props as any)?.source ?? "manual";
        const limit = Math.max(1, Math.min(50, Number((comp.props as any)?.limit ?? 12)));
        const categoryId = typeof (comp.props as any)?.categoryId === "string" ? (comp.props as any).categoryId.trim() : "";
        const existingIds = Array.isArray((comp.props as any)?.productIds) ? (comp.props as any).productIds : [];

        // For queryable sources we resolve IDs via listProducts using URL filters.
        // manual source uses productIds as-is.
        if (source === "category" || source === "all") {
          queryTasks.push({ comp, categoryId: categoryId || undefined, limit, kind: comp.kind === "productGrid" ? "grid" : "slider" });
        } else if ((source === "bestSellers" || source === "newArrivals") && existingIds.length === 0) {
          autoProductComponents.push({ comp, kind: source === "bestSellers" ? "best" : "new", limit });
        }
      }
    });
  }

  // Fetch IDs for auto product sections and inject them into section.data.productIds
  if (autoProductSections.length) {
    await Promise.all(
      autoProductSections.map(async ({ sec, kind, limit }) => {
        try {
          const ids = kind === "new" ? await getNewArrivalsIds(limit) : await getBestSellersIds(limit);
          sec.data = { ...(sec.data ?? {}), productIds: ids };
          if (Array.isArray(ids)) {
            for (const id of ids) {
              if (typeof id === "string" && id.trim()) wantIds.add(id.trim());
            }
          }
        } catch {
          // ignore errors; renderer will show fallback text
        }
      })
    );
  }

  if (autoProductComponents.length) {
    await Promise.all(
      autoProductComponents.map(async ({ comp, kind, limit }) => {
        try {
          const ids = kind === "new" ? await getNewArrivalsIds(limit) : await getBestSellersIds(limit);
          comp.props = { ...(comp.props ?? {}), productIds: ids };
          if (Array.isArray(ids)) {
            for (const id of ids) {
              if (typeof id === "string" && id.trim()) wantIds.add(id.trim());
            }
          }
        } catch {
          // ignore errors; CMS will render empty grid/slider
        }
      })
    );
  }

  // Resolve queryable product components (ProductGrid/ProductSlider) + inject facets for FiltersBar
  // We inject facets/categories into any filtersBar components on the page.
  let injectedFacets: { colors: any[]; sizes: any[]; categories: any[] } | null = null;

  if (queryTasks.length) {
    // Categories are needed for the filters UI (category dropdown)
    const categories = hasFiltersBar ? await listCategories() : [];

    // For now, compute facets from the *first* query target on the page (common case: one grid per page).
    // If you place multiple query grids, they will share the same FiltersBar facets.
    const first = queryTasks[0];

    try {
      const sort = ["latest", "title_asc", "title_desc", "price_asc", "price_desc"].includes(f.sort as string)
        ? (f.sort as any)
        : undefined;

      // ProductGrid supports pagination via URL page.
      const pageNum = Math.max(1, Number(f.page ?? 1));
      const listForFacets = await listProducts({
        page: pageNum,
        pageSize: first.kind === "grid" ? Math.min(24, first.limit) : first.limit,
        take: first.limit,
        cursorMode: false,
        lite: true,
        sort,
        q: f.q,
        inStock: f.inStock,
        categoryId: first.categoryId ?? f.categoryId,
        colors: f.colors.length ? f.colors.join(",") : undefined,
        sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
      });

      injectedFacets = {
        colors: (listForFacets as any)?.facets?.colors ?? [],
        sizes: (listForFacets as any)?.facets?.sizes ?? [],
        categories: categories ?? [],
      };

      const applyProductIds = (
        task: { comp: any; categoryId?: string; limit: number; kind: "grid" | "slider" },
        out: any
      ) => {
        const ids = Array.isArray(out?.items) ? out.items.map((x: any) => x?.id).filter(Boolean) : [];
        const categoryId = task.categoryId ?? f.categoryId;
        task.comp.props = {
          ...(task.comp.props ?? {}),
          productIds: ids,
          pagination:
            task.kind === "grid"
              ? {
                  basePath: slug,
                  page: out?.page ?? pageNum,
                  totalPages: out?.totalPages ?? 1,
                  filters: { ...f, categoryId },
                }
              : undefined,
        };
        for (const id of ids) if (typeof id === "string") wantIds.add(id);
      };

      // Apply resolved IDs to the first query task without refetching.
      applyProductIds(first, listForFacets as any);

      // Apply resolved IDs to remaining query tasks using same filters.
      const remaining = queryTasks.slice(1);
      if (remaining.length) {
        await Promise.all(
          remaining.map(async ({ comp, categoryId, limit, kind }) => {
            const pageForThis = kind === "grid" ? pageNum : 1;
            const out = await listProducts({
              page: pageForThis,
              pageSize: kind === "grid" ? Math.min(24, limit) : limit,
              take: limit,
              cursorMode: false,
              lite: true,
              sort,
              q: f.q,
              inStock: f.inStock,
              categoryId: categoryId ?? f.categoryId,
              colors: f.colors.length ? f.colors.join(",") : undefined,
              sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
              minPrice: f.minPrice,
              maxPrice: f.maxPrice,
            });
            applyProductIds({ comp, categoryId, limit, kind }, out);
          })
        );
      }
    } catch {
      // ignore; CMS will render empty grid
    }
  }

  // Inject facets into any FiltersBar components
  if (injectedFacets) {
    for (const sec of sections) {
      const comps = (sec?.data as any)?.components as any[] | undefined;
      walkComponents(comps, (comp) => {
        if (comp?.kind !== "filtersBar") return;
        comp.props = { ...(comp.props ?? {}), ...injectedFacets };
      });
    }
  }

  const idsList = Array.from(wantIds);
  if (idsList.length) {
    const products = await listProductsByIds(idsList, { lite: true });
    for (const p of products) {
      if (!p) continue;
      const imageUrl = getProductPrimaryImage(p);
      const minPrice = getProductMinPrice(p);
      const priceText = minPrice != null ? formatMoney(minPrice, currencyCode) : null;

      const entry = { id: p.id, slug: p.slug ?? undefined, title: p.title, imageUrl, priceText };
      productLookup[p.id] = entry;
      if (p.slug) {
        productLookup[`slug:${p.slug}`] = entry;
        slugToId.set(p.slug, p.id);
      }
    }
  }

  await Promise.all([
    ...Array.from(wantSlugs).map(async (slug) => {
      const p = await getProductBySlug(slug);
      if (!p) return;
      const imageUrl = getProductPrimaryImage(p);
      const minPrice = getProductMinPrice(p);
      const priceText = minPrice != null ? formatMoney(minPrice, currencyCode) : null;

      slugToId.set(slug, p.id);
      if (p.slug) slugToId.set(p.slug, p.id);
      const entry = { id: p.id, slug: p.slug ?? undefined, title: p.title, imageUrl, priceText };
      productLookup[p.id] = entry;
      if (p.slug) productLookup[`slug:${p.slug}`] = entry;
    }),
  ]);

  if (slugSections.length) {
    for (const { sec, slugs } of slugSections) {
      const resolvedIds = slugs.map((s) => slugToId.get(s)).filter(Boolean) as string[];
      if (!resolvedIds.length) continue;
      const existingIds = Array.isArray(sec?.data?.productIds) ? sec.data.productIds : [];
      const merged = [...existingIds];
      for (const id of resolvedIds) {
        if (!merged.includes(id)) merged.push(id);
      }
      sec.data = { ...(sec.data ?? {}), productIds: merged };
    }
  }


  return (
    <>
      {/* Page-level head scripts are injected in head.tsx */}
      <ScriptTags scripts={(page as any).headScripts} />

      <CmsPageRenderer
        sections={page.sections as any}
        productLookup={productLookup}
        renderProductCard={(id) => <ProductCard productId={id} />}
        renderQuickAdd={(ref) => (
          <QuickAddButton
            productId={ref.productId}
            slug={ref.slug}
            buttonLabel="أضف للسلة"
          />
        )}
      />

      {/* Page-level body scripts */}
      <ScriptTags scripts={(page as any).bodyScripts} />
    </>
  );
}

export default async function CmsPageRoute({
  params,
  searchParams,
}: {
  params?: { slug?: string[] };
  searchParams?: SP;
}) {
  const slug = paramsToSlug(params);
  if (slug === "/") {
    const settings = await getPublicSettings().catch(() => null);
    const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
    if (storefrontCfg.cmsOverrideHome === false) {
      return <FallbackHome />;
    }
  }
  return renderCmsPageBySlug(slug, searchParams, { allowFallback: true, allowNotFound: true });
}
