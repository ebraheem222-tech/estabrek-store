"use client";

import React, { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { ProductGallery } from "@/components/ProductGallery";
import ProductBuyBox from "@/components/ProductBuyBox";

function initialColorKey(product: CatalogProduct): string | undefined {
  const items = (product as any).items ?? [];
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const c = String(items[0]?.colorName ?? "").trim();
  return c || `__item_0`;
}

export default function ProductDetail({ product }: { product: CatalogProduct }) {
  const init = useMemo(() => initialColorKey(product), [product]);
  const [colorKey, setColorKey] = useState<string | undefined>(init);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ProductGallery product={product} selectedColorKey={colorKey} onSelectColorKey={setColorKey} />
      <ProductBuyBox product={product} colorKey={colorKey} onColorChange={setColorKey} />
    </div>
  );
}
