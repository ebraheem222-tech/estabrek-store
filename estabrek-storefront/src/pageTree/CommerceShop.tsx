"use client";

import { useState, type CSSProperties } from "react";
import ShopBrowseClient from "@/components/ShopBrowseClient";
import type { CatalogFilters } from "@/lib/filtersUrl";
import type { CatalogCategory } from "@/lib/catalog";
import { tr } from "@/lib/words";
import type { TreeLang } from "./tree";
import { ConfiguredProductCard } from "@/components/ConfiguredProductCard";
import { useCardDesign } from "@/components/VisualControlsProvider";

export type CommerceShopData = { initial: any; initialFilters: CatalogFilters; categories: CatalogCategory[]; basePath: string };
export type CommerceShopOptions = { columns?: number; mobileColumns?: number; showFilters?: boolean; showSearch?: boolean; gap?: number; filtersSide?: "start" | "end"; stickyFilters?: boolean };
/** The page's own settings as attributes and a variable on its wrapper (commerce.css). */
function shopLook(o: CommerceShopOptions) {
  const gap = typeof o.gap === "number" && Number.isInteger(o.gap) && o.gap >= 0 && o.gap <= 64 ? o.gap : undefined;
  return { "data-filters-side": o.filtersSide === "end" ? "end" : undefined, "data-sticky-filters": o.stickyFilters === true ? "" : undefined, style: gap !== undefined ? ({ "--cms-gap": `${gap}px` } as CSSProperties) : undefined };
}

export function CommerceShop({ data, options, preview, lang }: { data?: CommerceShopData; options: CommerceShopOptions; preview: boolean; lang: TreeLang }) {
  const [query, setQuery] = useState("");
  const design = useCardDesign();
  if (preview) return <div className="cms-shop" data-commerce-preview="shop" {...shopLook(options)}>
    {options.showSearch !== false ? <label data-cms-part="shop-search-box">{tr(lang, "بحث تجريبي", "Sample search")}<input data-cms-part="shop-search" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label> : null}
    <div className="cms-shop-preview-layout" data-filters={options.showFilters === false ? "off" : "on"}>
    {options.showFilters !== false ? <aside data-cms-part="shop-filters" data-commerce-preview-filters=""><h3 data-cms-part="shop-categories-title">{tr(lang, "التصنيفات", "Categories")}</h3><p data-cms-part="shop-category">{tr(lang, "كل المنتجات", "All products")}</p><label data-cms-part="shop-in-stock"><input type="checkbox" disabled />{tr(lang, "متوفر", "In stock")}</label></aside> : null}
    <div className="cms-product-grid cms-shop-preview-grid" style={{ "--cms-grid-columns": options.columns ?? 3, "--cms-grid-mobile": options.mobileColumns ?? 2 } as CSSProperties}>
      {[1, 2, 3].filter(index => !query || `${tr(lang, "منتج تجريبي", "Sample product")} ${index}`.toLowerCase().includes(query.toLowerCase())).map(index => <ConfiguredProductCard key={index} preview design={design ?? {}} product={{ id: `sample-${index}`, slug: "sample", title: `${tr(lang, "منتج تجريبي", "Sample product")} ${index}`, minPrice: 129, category: { id: "sample", slug: "sample", name: tr(lang, "تصنيف تجريبي", "Sample category") }, items: [{ id: "rose", colorName: "Rose", colorHex: "#bb6688" }, { id: "blue", colorName: "Blue", colorHex: "#3366bb" }] }} />)}
    </div>
    </div>
  </div>;
  if (!data) return null;
  return <div className="cms-shop" {...shopLook(options)}><ShopBrowseClient {...data} commerce={{ columns: options.columns ?? 3, mobileColumns: options.mobileColumns ?? 2, showFilters: options.showFilters !== false, showSearch: options.showSearch !== false }} /></div>;
}
