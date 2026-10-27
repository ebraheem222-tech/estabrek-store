import React from "react";
import { notFound } from "next/navigation";
import {
  getBootstrap,
  getBestSellersIds,
  getNewArrivalsIds,
  getPageBySlug,
  getProductById,
  getPublicSettings,
  listProducts,
  listProductsByIds,
  listProductsBySlugs,
  listCategories,
} from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { getProductBadge, getProductSecondaryImage } from "@/lib/productBadges";
import { loadSeasonalEdits } from "@/lib/seasonalEdits";
import { loadCollectionStories } from "@/lib/collectionStories";

import { CmsPageRenderer } from "@/cms";
import { ScriptTags } from "@/components/ScriptTags";
import ProductCard from "@/components/ProductCard";
import { QuickAddButton } from "@/components/QuickAddButton";
import FallbackHome from "@/components/FallbackHome";
import { RoseCmsHome } from "@/components/cinematic/RoseCmsHome";
import { storeThemeOf, themeById } from "@/storeThemes";
import { ThemedHome } from "@/storeThemes/home/ThemedHome";
import { stageOptionsOf } from "@/storeThemes/three/kinds";
import { RoseCmsInterior } from "@/components/cinematic/RoseCmsInterior";
import FallbackShop from "@/components/FallbackShop";
import FallbackContact from "@/components/FallbackContact";
import CartClient from "@/components/CartClient";
import { normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { ProductMini } from "@/cms/types";
import type { StorefrontPage } from "@/lib/types";
import type { CatalogCategory } from "@/lib/catalog";
import { langConfigOf, type Lang } from "@/lib/i18n";
import { localizeCategories } from "@/lib/localize";
import { asTree, treeNeeds } from "@/pageTree/tree";
import { treeCss } from "@/pageTree/css";
import { lookNode, looksOf, motionOf as treeMotionOf } from "@/pageTree/tree";
import type { TreeCtx } from "@/pageTree/TreeNodeView";
import { TreeMotion } from "@/pageTree/TreeMotion";

/** Before the first paint: what comes in waits unseen until the motion engine is ready (2.5 s at most; never inside the editor). */
const TREE_PENDING = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches||window.parent!==window)return;var r=document.documentElement;r.classList.add("pt-pending");setTimeout(function(){r.classList.remove("pt-pending")},2500)}catch(e){}})();`;



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
  options?: {
    allowFallback?: boolean;
    allowNotFound?: boolean;
    lang?: Lang;
    page?: Promise<StorefrontPage | null>;
    /** The admin's theme gallery: a theme id to show instead of the saved one ("rose" = none). */
    storeTheme?: string | null;
    storeThemeMode?: "light" | "dark" | null;
  }
) {
  // The page's language: its CMS words and the store's content in it.
  const lang = options?.lang;
  const allowFallback = options?.allowFallback !== false;
  const allowNotFound = options?.allowNotFound !== false;

  // URL-driven filters for CMS data components (ProductGrid/ProductSlider + FiltersBar)
  const f = normalizeFiltersFromSearchParams(searchParams ?? {});

  // The new editor's frame hands in the draft it opened with its ticket.
  const pagePromise = options?.page ?? getPageBySlug(slug, lang);
  const bootstrapPromise = getBootstrap();
  const settingsPromise = getPublicSettings().catch(() => null);
  // The rose homepage's scenes only need the categories: start them now instead of
  // after every other product request (the catalog API answers in about a second each).
  const roseHome = slug === "/" && process.env.ESTABREK_HOME_MODE !== "cms";
  const homeDataPromise = roseHome
    ? Promise.all([listCategories(), bootstrapPromise])
        .then(async ([cats, boot]) => {
          const list = cats ?? [];
          const currency = (boot.site as any)?.currencyCode || "ILS";
          const [seasons, stories] = await Promise.all([loadSeasonalEdits(list, currency, lang), loadCollectionStories(list, currency, lang)]);
          return { categories: lang ? localizeCategories(list, lang) : list, seasons, stories };
        })
        .catch(() => ({ categories: [] as Awaited<ReturnType<typeof listCategories>>, seasons: [] as Awaited<ReturnType<typeof loadSeasonalEdits>>, stories: [] as Awaited<ReturnType<typeof loadCollectionStories>> }))
    : null;
  const page = await pagePromise;

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

  const bootstrap = await bootstrapPromise;
  const currencyCode = (bootstrap.site as any)?.currencyCode || "ILS";
  // Admin → ثيمات المتجر: a theme draws its own home; none = the rose design.
  const settingsHeader = ((await settingsPromise)?.site as any)?.header ?? (bootstrap.site as any)?.header;
  const storeTheme = options?.storeTheme !== undefined ? (options.storeTheme === "rose" ? null : themeById(options.storeTheme)) : storeThemeOf(settingsHeader)?.theme ?? null;
  const storeThemeMode = options?.storeThemeMode ?? (options?.storeTheme === undefined ? storeThemeOf(settingsHeader)?.mode ?? null : null);

  // The new CMS: a page saved as a tree (format 2). Its old sections keep their place
  // through `legacy` nodes and draw exactly as before; every other page-level node
  // becomes a section of kind TREE_NODE that the renderers hand to pageTree/TreeNodeView.
  const tree = (page as any).format === 2 ? asTree(structuredClone((page as any).tree ?? null)) : null;
  const langCfg = langConfigOf((bootstrap.site as any)?.header);
  const treeCtx: TreeCtx | null = tree ? { lang: lang ?? langCfg.default, main: langCfg.default, cfg: langCfg } : null;
  if (tree) {
    const byId = new Map<string, any>((((page as any).sections ?? []) as any[]).map((s) => [s.id, s]));
    (page as any).sections = (tree.root.children ?? []).flatMap((n, i) => {
      if (n.type === "legacy") {
        const s = byId.get(String(n.props?.sectionId ?? ""));
        // Objects placed over the section in the editor go with it.
        return s ? [{ ...s, order: i, ...(n.children?.length ? { overlay: { nodes: n.children, ctx: treeCtx } } : {}) }] : [];
      }
      return [{ id: `tree-${n.id}`, type: "TREE_NODE", order: i, isVisible: true, data: { node: n, ctx: treeCtx } }];
    });
  }

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

  // The tree's product elements: hand-picked, new, best sellers or a category.
  const treeProducts = tree ? treeNeeds(tree).products : [];
  if (treeProducts.length) {
    await Promise.all(
      treeProducts.map(async (n) => {
        const limit = Math.max(1, Math.min(48, Number(n.props?.limit) || 8));
        try {
          let ids: string[] = [];
          const source = n.props?.source;
          if (source === "picked") ids = (Array.isArray(n.props?.productIds) ? n.props.productIds : []).filter((x: unknown): x is string => typeof x === "string");
          else if (source === "new") ids = await getNewArrivalsIds(limit);
          else if (source === "best") ids = await getBestSellersIds(limit);
          else if (source === "category" && typeof n.props?.categoryId === "string") {
            const out = await listProducts({ page: 1, pageSize: limit, take: limit, cursorMode: false, lite: true, lang, categoryId: n.props.categoryId, includeFacets: false });
            ids = (((out as any)?.items ?? []) as any[]).map((x) => x?.id).filter(Boolean);
          }
          ids = ids.slice(0, limit);
          n.props = { ...n.props, productIds: ids };
          for (const id of ids) wantIds.add(id);
        } catch {
          // ignore; the element shows what it could find
        }
      })
    );
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
    const categories = hasFiltersBar ? await listCategories(lang) : [];

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
        lang,
        sort,
        q: f.q,
        inStock: f.inStock,
        categoryId: first.categoryId ?? f.categoryId,
        colors: f.colors.length ? f.colors.join(",") : undefined,
        sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
        includeFacets: hasFiltersBar,
      });

      if (hasFiltersBar) {
        injectedFacets = {
          colors: (listForFacets as any)?.facets?.colors ?? [],
          sizes: (listForFacets as any)?.facets?.sizes ?? [],
          categories: categories ?? [],
        };
      }

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
              lang,
              sort,
              q: f.q,
              inStock: f.inStock,
              categoryId: categoryId ?? f.categoryId,
              colors: f.colors.length ? f.colors.join(",") : undefined,
              sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
              minPrice: f.minPrice,
              maxPrice: f.maxPrice,
              includeFacets: false,
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
    const products = await listProductsByIds(idsList, { lite: true, lang });
    for (const p of products) {
      if (!p) continue;
      const imageUrl = getProductPrimaryImage(p);
      const minPrice = getProductMinPrice(p);
      const priceText = minPrice != null ? formatMoney(minPrice, currencyCode) : null;

      const entry = { id: p.id, slug: p.slug ?? undefined, title: p.title, imageUrl, secondaryImageUrl: getProductSecondaryImage(p, imageUrl), badge: getProductBadge(p), priceText, category: p.category?.name || "", colors: (p.items || []).map(item => item.colorHex || "").filter(color => /^#[0-9a-f]{3,8}$/i.test(color)) };
      productLookup[p.id] = entry;
      if (p.slug) {
        productLookup[`slug:${p.slug}`] = entry;
        slugToId.set(p.slug, p.id);
      }
    }
  }

  const slugList = Array.from(wantSlugs);
  if (slugList.length) {
    const products = await listProductsBySlugs(slugList, { lite: true, lang });
    for (const p of products) {
      if (!p) continue;
      const imageUrl = getProductPrimaryImage(p);
      const minPrice = getProductMinPrice(p);
      const priceText = minPrice != null ? formatMoney(minPrice, currencyCode) : null;

      const slug = p.slug ?? "";
      if (slug) slugToId.set(slug, p.id);
      if (p.slug) slugToId.set(p.slug, p.id);
      const entry = { id: p.id, slug: p.slug ?? undefined, title: p.title, imageUrl, secondaryImageUrl: getProductSecondaryImage(p, imageUrl), badge: getProductBadge(p), priceText, category: p.category?.name || "", colors: (p.items || []).map(item => item.colorHex || "").filter(color => /^#[0-9a-f]{3,8}$/i.test(color)) };
      productLookup[p.id] = entry;
      if (p.slug) productLookup[`slug:${p.slug}`] = entry;
    }
  }

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


  const homeData = homeDataPromise ? await homeDataPromise : null;
  const homeCategories = homeData?.categories ?? [];
  const seasons = homeData?.seasons ?? [];
  const stories = homeData?.stories ?? [];

  // What the tree's category tiles and rose blocks draw from, and its CSS.
  let treeStyle = "";
  let treeMoves = false;
  // The editor's looks that move (parts of old sections and scenes), for the motion engine.
  let lookMoves = "";
  if (tree && treeCtx) {
    const needs = treeNeeds(tree);
    if (needs.categories || needs.seasons || needs.stories) {
      const fetched: CatalogCategory[] = homeData ? [] : await listCategories(lang).catch((): CatalogCategory[] => []);
      const cats: CatalogCategory[] = homeData?.categories ?? (lang ? localizeCategories(fetched, lang) : fetched);
      treeCtx.categories = cats;
      if (needs.seasons) treeCtx.seasons = homeData ? seasons : await loadSeasonalEdits(cats, currencyCode, lang).catch(() => []);
      if (needs.stories) treeCtx.stories = homeData ? stories : await loadCollectionStories(cats, currencyCode, lang).catch(() => []);
    }
    // 360° elements: their products with their views (the product page's own data).
    if (needs.spinProducts.length) {
      const found = await Promise.all(needs.spinProducts.map((id) => getProductById(id, lang).catch(() => null)));
      treeCtx.spinProducts = Object.fromEntries(needs.spinProducts.map((id, i) => [id, found[i] ? { title: found[i]!.title, spins: found[i]!.spins } : null]));
    }
    if (needs.instagram) {
      treeCtx.instagram = Object.entries(productLookup)
        .filter(([key]) => !key.startsWith("slug:"))
        .map(([, p]) => p.imageUrl)
        .filter((url): url is string => Boolean(url))
        .slice(0, 4);
    }
    treeStyle = treeCss(tree);
    treeMoves = needs.motion;
    const moving = looksOf(tree).map(([t, l]) => [t, treeMotionOf(lookNode(t, l))] as const).filter(([, m]) => m);
    if (moving.length) lookMoves = JSON.stringify(moving).replace(/</g, "\\u003c");
  }

  return (
    <>
      {/* Page-level head scripts are injected in head.tsx */}
      <ScriptTags scripts={(page as any).headScripts} />
      {treeStyle ? <style data-page-tree="" dangerouslySetInnerHTML={{ __html: treeStyle }} /> : null}
      {treeMoves ? <script dangerouslySetInnerHTML={{ __html: TREE_PENDING }} /> : null}
      {lookMoves ? <script type="application/json" id="pt-looks" dangerouslySetInnerHTML={{ __html: lookMoves }} /> : null}
      {treeMoves ? <TreeMotion /> : null}

      {roseHome && storeTheme ? <ThemedHome
        theme={storeTheme}
        mode={storeThemeMode}
        stageOptions={stageOptionsOf(settingsHeader, storeTheme.id)}
        lang={lang ?? langCfg.default}
        sections={page.sections as any}
        productLookup={productLookup}
        categories={homeCategories ?? []}
        renderProductCard={(id) => <ProductCard productId={id} />}
        renderQuickAdd={(ref) => <QuickAddButton productId={ref.productId} slug={ref.slug} buttonLabel="أضف للسلة" />}
      /> : roseHome ? <RoseCmsHome
        sections={page.sections as any}
        productLookup={productLookup}
        categories={homeCategories ?? []}
        seasons={seasons}
        stories={stories}
        logoUrl={bootstrap.site.logoUrl}
        siteName={bootstrap.site.siteName}
        renderProductCard={(id) => <ProductCard productId={id} />}
        renderQuickAdd={(ref) => <QuickAddButton productId={ref.productId} slug={ref.slug} buttonLabel="أضيفي للحقيبة" />}
      /> : ["/contact", "/about", "/shop"].includes(slug) && process.env.ESTABREK_HOME_MODE !== "cms" ? <RoseCmsInterior
        kind={slug.slice(1) as "contact" | "about" | "shop"}
        sections={page.sections as any}
        productLookup={productLookup}
        renderProductCard={(id) => <ProductCard productId={id} />}
        renderQuickAdd={(ref) => <QuickAddButton productId={ref.productId} slug={ref.slug} buttonLabel="أضف للسلة" />}
      /> : <CmsPageRenderer
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
      />}

      {/* Page-level body scripts */}
      <ScriptTags scripts={(page as any).bodyScripts} />
    </>
  );
}
