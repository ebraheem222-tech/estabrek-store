"use client";

import { useState, type CSSProperties } from "react";
import ShopBrowseClient from "@/components/ShopBrowseClient";
import type { CatalogFilters } from "@/lib/filtersUrl";
import type { CatalogCategory } from "@/lib/catalog";
import { tr } from "@/lib/words";
import type { TreeLang } from "./tree";
import { ConfiguredProductCard } from "@/components/ConfiguredProductCard";
import { useCardDesign } from "@/components/VisualControlsProvider";
import { shopWord, ShopWordsScope, type ShopWords } from "@/components/shopWords";

export type CommerceShopData = { initial: any; initialFilters: CatalogFilters; categories: CatalogCategory[]; basePath: string };
export type CommerceShopOptions = { columns?: number; mobileColumns?: number; showFilters?: boolean; showSearch?: boolean; gap?: number; filtersSide?: "start" | "end"; stickyFilters?: boolean };
/** The page's own settings as attributes and a variable on its wrapper (commerce.css). */
function shopLook(o: CommerceShopOptions) {
  const gap = typeof o.gap === "number" && Number.isInteger(o.gap) && o.gap >= 0 && o.gap <= 64 ? o.gap : undefined;
  return { "data-filters-side": o.filtersSide === "end" ? "end" : undefined, "data-sticky-filters": o.stickyFilters === true ? "" : undefined, style: gap !== undefined ? ({ "--cms-gap": `${gap}px` } as CSSProperties) : undefined };
}

export function CommerceShop({ data, options, preview, lang, words = {} }: { data?: CommerceShopData; options: CommerceShopOptions; preview: boolean; lang: TreeLang; words?: ShopWords }) {
  const [query, setQuery] = useState("");
  const design = useCardDesign();
  // The editor's sample shop shows every word of the shop where it sits, each written in place
  // (data-pt-field: the shop element's own word; its built-in one until it has one).
  const w = (field: Parameters<typeof shopWord>[1]) => shopWord(words, field, lang);
  if (preview) return <div className="cms-shop" data-commerce-preview="shop" {...shopLook(options)}>
    {options.showSearch !== false ? <label data-cms-part="shop-search-box"><span data-cms-part="shop-search-label" data-pt-field="searchLabel">{w("searchLabel")}</span><input data-cms-part="shop-search" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label> : null}
    <div className="cms-shop-preview-layout" data-filters={options.showFilters === false ? "off" : "on"}>
    {options.showFilters !== false ? <aside data-cms-part="shop-filters" data-commerce-preview-filters="">
      <h3 data-cms-part="shop-categories-title" data-pt-field="categoriesLabel">{w("categoriesLabel")}</h3>
      <p data-cms-part="shop-category" data-pt-field="allLabel">{w("allLabel")}</p>
      <h4 data-cms-part="shop-filters-label" data-pt-field="filtersLabel">{w("filtersLabel")}</h4>
      <p data-cms-part="shop-price-label" data-pt-field="priceLabel">{w("priceLabel")}</p>
      <p data-cms-part="shop-colours-label" data-pt-field="coloursLabel">{w("coloursLabel")}</p>
      <p data-cms-part="shop-sizes-label" data-pt-field="sizesLabel">{w("sizesLabel")}</p>
      <label data-cms-part="shop-in-stock"><input type="checkbox" disabled /><span data-cms-part="shop-in-stock-label" data-pt-field="inStockLabel">{w("inStockLabel")}</span></label>
      <p data-cms-part="shop-clear-label" data-pt-field="clearLabel">{w("clearLabel")}</p>
    </aside> : null}
    <div>
    <div className="cms-product-grid cms-shop-preview-grid" style={{ "--cms-grid-columns": options.columns ?? 3, "--cms-grid-mobile": options.mobileColumns ?? 2 } as CSSProperties}>
      {[1, 2, 3].filter(index => !query || `${tr(lang, "منتج تجريبي", "Sample product")} ${index}`.toLowerCase().includes(query.toLowerCase())).map(index => <ConfiguredProductCard key={index} preview design={design ?? {}} product={{ id: `sample-${index}`, slug: "sample", title: `${tr(lang, "منتج تجريبي", "Sample product")} ${index}`, minPrice: 129, category: { id: "sample", slug: "sample", name: tr(lang, "تصنيف تجريبي", "Sample category") }, items: [{ id: "rose", colorName: "Rose", colorHex: "#bb6688" }, { id: "blue", colorName: "Blue", colorHex: "#3366bb" }] }} />)}
    </div>
    {/* Under the cards (the cards keep their place): the count and sorting, then "load more". */}
    <div className="cms-shop-preview-tools"><span><b>3</b> <span data-cms-part="shop-count-label" data-pt-field="countLabel">{w("countLabel")}</span></span><span data-cms-part="shop-sort-label" data-pt-field="sortLabel">{w("sortLabel")}</span></div>
    <p className="cms-shop-preview-more"><span data-cms-part="shop-more-label" data-pt-field="moreLabel">{w("moreLabel")}</span></p>
    </div>
    </div>
  </div>;
  if (!data) return null;
  return <div className="cms-shop" {...shopLook(options)}><ShopWordsScope value={words}><ShopBrowseClient {...data} commerce={{ columns: options.columns ?? 3, mobileColumns: options.mobileColumns ?? 2, showFilters: options.showFilters !== false, showSearch: options.showSearch !== false }} /></ShopWordsScope></div>;
}
