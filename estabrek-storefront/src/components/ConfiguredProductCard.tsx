"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { catalogItemKey, catalogItemLabel, formatMoney, getProductMinPrice, getProductPrimaryImage, type CatalogProduct } from "@/lib/catalog";
import type { CardDesign } from "@/lib/visualControls";
import { selectStorefrontColor } from "@/lib/storefrontColor";
import { emitVisualInteraction } from "@/lib/visualInteractions";
import { QuickAddButton } from "./QuickAddButton";
import { useLanguage } from "./cinematic/Language";
import { tr } from "@/lib/words";
import "./configuredProductCard.css";

export function ConfiguredProductCard({ product, design: d, preview = false }: { product: CatalogProduct; design: CardDesign; preview?: boolean }) {
  const { language: lang } = useLanguage();
  const [selected, setSelected] = useState(0), [added, setAdded] = useState(false);
  const item = product.items?.[selected];
  const image = (item?.images ?? []).find(im => im.view !== "3d" && !/\.(glb|gltf)(?:[?#]|$)/i.test(im.url))?.url ?? getProductPrimaryImage(product);
  const href = `/p/${encodeURIComponent(product.slug)}`;
  const vars = {
    "--card-bg": d.background ?? "var(--surface,#fff)", "--card-text": d.textColor ?? "var(--text,#222)", "--card-border": d.borderColor ?? "var(--border,#ddd)",
    "--card-radius": `${d.radius ?? 16}px`, "--card-padding": `${d.padding ?? 12}px`, "--card-gap": `${d.gap ?? 12}px`,
    "--card-ratio": d.imageRatio === "landscape" ? "4/3" : d.imageRatio === "square" ? "1" : "3/4", "--card-fit": d.imageFit ?? "cover",
    "--card-title-size": `${d.titleSize ?? 17}px`, "--card-price-size": `${d.priceSize ?? 15}px`,
    "--card-swatch-size": `${d.swatchSize ?? 24}px`, "--card-swatch-radius": d.swatchShape === "square" ? "0px" : d.swatchShape === "rounded" ? "6px" : "50%", "--card-swatch-gap": `${d.swatchGap ?? 8}px`,
    "--card-button": d.buttonColor ?? "var(--accent,#222)", "--card-button-text": d.buttonTextColor ?? "var(--accent-contrast,#fff)",
  } as CSSProperties;
  const pic = image ? <img src={image} alt={product.title} loading="lazy" /> : <div className="configured-product-placeholder" style={{ background: item?.colorHex ?? "#d3bfce" }} />;
  return <article className="configured-product-card" data-cms-part="card" data-card-layout={d.layout ?? "vertical"} data-product-id={product.id} style={vars}>
    {preview ? <div data-cms-part="card-image" data-card-part="image">{pic}</div> : <Link href={href} data-cms-part="card-image" data-card-part="image">{pic}</Link>}
    <div className="configured-product-body" data-cms-part="card-body">
      {d.showCategory !== false && product.category ? <span data-cms-part="card-category" data-card-part="category">{product.category.name}</span> : null}
      {preview ? <h3 data-cms-part="card-name" data-card-part="title">{product.title}</h3> : <Link href={href}><h3 data-cms-part="card-name" data-card-part="title">{product.title}</h3></Link>}
      {d.showPrice !== false ? <span data-cms-part="card-price" data-card-part="price">{formatMoney(getProductMinPrice(product), undefined)}</span> : null}
      {d.showSwatches !== false ? <div data-cms-part="card-swatches" data-card-part="swatches">{(product.items ?? []).slice(0, 16).map((swatch, i) => <button key={swatch.id} data-cms-part="card-swatch" type="button" aria-label={catalogItemLabel(swatch, i)} aria-pressed={selected === i} title={catalogItemLabel(swatch, i)} style={{ backgroundColor: /^#?[0-9a-f]{6}$/i.test(swatch.colorHex ?? "") ? `#${swatch.colorHex!.replace(/^#/, "")}` : "#ccc" }} onClick={event => { setSelected(i); selectStorefrontColor(swatch.colorHex, { source: event.currentTarget }); }} />)}</div> : null}
      {d.showButton !== false ? <div data-cms-part="card-actions" data-card-part="button">{preview ? <button data-cms-part="card-add" type="button" onClick={event => { emitVisualInteraction("cartClick", { source: event.currentTarget }); setAdded(true); emitVisualInteraction("cartAdded", { source: event.currentTarget }); }}>{added ? tr(lang, "محاكاة الإضافة ✓", "Simulated add ✓") : tr(lang, "تجربة الإضافة", "Test add")}</button> : <QuickAddButton product={product} selectedColorKey={item ? catalogItemKey(item, selected) : undefined} />}</div> : null}
    </div>
  </article>;
}
