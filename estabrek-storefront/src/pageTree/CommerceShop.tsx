"use client";

import { useState, type CSSProperties } from "react";
import ShopBrowseClient from "@/components/ShopBrowseClient";
import type { CatalogFilters } from "@/lib/filtersUrl";
import type { CatalogCategory } from "@/lib/catalog";
import { tr } from "@/lib/words";
import type { TreeLang } from "./tree";

export type CommerceShopData = { initial: any; initialFilters: CatalogFilters; categories: CatalogCategory[]; basePath: string };
export type CommerceShopOptions = { columns?: number; mobileColumns?: number; showFilters?: boolean; showSearch?: boolean };

export function CommerceShop({ data, options, preview, lang }: { data?: CommerceShopData; options: CommerceShopOptions; preview: boolean; lang: TreeLang }) {
  const [query, setQuery] = useState("");
  if (preview) return <div className="cms-shop" data-commerce-preview="shop">
    {options.showSearch !== false ? <label>{tr(lang, "بحث تجريبي", "Sample search")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label> : null}
    <div className="cms-shop-preview-layout" data-filters={options.showFilters === false ? "off" : "on"}>
    {options.showFilters !== false ? <aside data-commerce-preview-filters=""><h3>{tr(lang, "التصنيفات", "Categories")}</h3><p>{tr(lang, "كل المنتجات", "All products")}</p><label><input type="checkbox" disabled />{tr(lang, "متوفر", "In stock")}</label></aside> : null}
    <div className="cms-product-grid cms-shop-preview-grid" style={{ "--cms-grid-columns": options.columns ?? 3, "--cms-grid-mobile": options.mobileColumns ?? 2 } as CSSProperties}>
      {[1, 2, 3].filter(index => !query || `${tr(lang, "منتج تجريبي", "Sample product")} ${index}`.toLowerCase().includes(query.toLowerCase())).map(index => <article key={index}><div className="cms-product-placeholder" /><h3>{tr(lang, "منتج تجريبي", "Sample product")} {index}</h3><p>129.00 ₪</p><button type="button" disabled>{tr(lang, "إضافة للسلة", "Add to cart")}</button></article>)}
    </div>
    </div>
  </div>;
  if (!data) return null;
  return <div className="cms-shop"><ShopBrowseClient {...data} commerce={{ columns: options.columns ?? 3, mobileColumns: options.mobileColumns ?? 2, showFilters: options.showFilters !== false, showSearch: options.showSearch !== false }} /></div>;
}
