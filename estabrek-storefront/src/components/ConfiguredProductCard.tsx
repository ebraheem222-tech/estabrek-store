"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { catalogItemKey, catalogItemLabel, formatMoney, getProductDiscountPercent, getProductMinPrice, getProductPrimaryImage, type CatalogProduct } from "@/lib/catalog";
import type { CardDesign } from "@/lib/visualControls";
import { selectStorefrontColor } from "@/lib/storefrontColor";
import { emitVisualInteraction } from "@/lib/visualInteractions";
import { QuickAddButton } from "./QuickAddButton";
import { useLanguage } from "./cinematic/Language";
import { tr } from "@/lib/words";
import "./configuredProductCard.css";

const RATIO: Record<string, string> = { portrait: "3/4", square: "1", landscape: "4/3", tall: "2/3", wide: "16/9" };
/** Hovers that show the second picture; without one they fall back to a gentle zoom. */
const NEEDS_SECOND = new Set(["swap", "slide", "zoomSwap", "flip", "curtain", "circle"]);
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* Cards come in as they reach the screen; the ones arriving together come one after another. */
let watcher: IntersectionObserver | null = null;
function watch(el: HTMLElement) {
  if (typeof IntersectionObserver !== "function") { el.dataset.cardIn = ""; return () => {}; }
  watcher ??= new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const card = e.target as HTMLElement;
      const delay = Math.min(n++, 8) * 70;
      card.style.setProperty("--card-delay", `${delay}ms`);
      card.dataset.cardIn = "";
      // Once in, hovering answers at once.
      window.setTimeout(() => card.style.setProperty("--card-delay", "0ms"), delay + 800);
      watcher?.unobserve(card);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  watcher.observe(el);
  return () => watcher?.unobserve(el);
}

const pictureOf = (im: { url?: string | null; view?: string | null } | undefined) => !!im?.url && im.view !== "3d" && !/\.(glb|gltf)(?:[?#]|$)/i.test(im.url);

export function ConfiguredProductCard({ product, design: d, preview = false }: { product: CatalogProduct; design: CardDesign; preview?: boolean }) {
  const { language: lang } = useLanguage();
  const [selected, setSelected] = useState(0), [added, setAdded] = useState(false);
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const item = product.items?.[selected];
  const own = (item?.images ?? []).filter(pictureOf).map((im) => im.url as string);
  const first = own[0] ?? getProductPrimaryImage(product);
  // A second picture: this colour's next one, else another colour's first.
  const second = own[1] ?? (product.items ?? []).flatMap((it, i) => (i === selected ? [] : (it.images ?? []).filter(pictureOf).slice(0, 1).map((im) => im.url as string)))[0];
  const hover = d.hover && d.hover !== "none" ? (NEEDS_SECOND.has(d.hover) && !second ? "zoom" : d.hover) : undefined;
  const cycle = hover === "cycle" ? (own.length > 1 ? own : [first, second].filter(Boolean) as string[]).slice(0, 6) : [];
  const href = `/p/${encodeURIComponent(product.slug)}`;
  const discount = d.showBadge ? (preview ? 20 : getProductDiscountPercent(product)) : null;
  const button = d.buttonStyle ?? "full";
  const vars = {
    "--card-bg": d.background ?? "var(--surface,#fff)", "--card-text": d.textColor ?? "var(--text,#222)", "--card-border": d.borderColor ?? "var(--border,#ddd)",
    "--card-radius": `${d.radius ?? 16}px`, "--card-padding": `${d.padding ?? 12}px`, "--card-gap": `${d.gap ?? 12}px`,
    "--card-ratio": RATIO[d.imageRatio ?? "portrait"] ?? "3/4", "--card-fit": d.imageFit ?? "cover",
    "--card-title-size": `${d.titleSize ?? 17}px`, "--card-price-size": `${d.priceSize ?? 15}px`,
    "--card-swatch-size": `${d.swatchSize ?? 24}px`, "--card-swatch-radius": d.swatchShape === "square" ? "0px" : d.swatchShape === "rounded" ? "6px" : "50%", "--card-swatch-gap": `${d.swatchGap ?? 8}px`,
    "--card-button": d.buttonColor ?? "var(--accent,#222)", "--card-button-text": d.buttonTextColor ?? "var(--accent-contrast,#fff)",
    ...(d.titleLines ? { "--card-lines": String(d.titleLines) } : {}),
  } as CSSProperties;

  // Coming in: armed before the first paint, shown as it reaches the screen.
  useIsoLayout(() => {
    const el = ref.current;
    if (!el || !d.enter || d.enter === "none") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { el.dataset.cardIn = ""; return; }
    delete el.dataset.cardIn;
    return watch(el);
  }, [d.enter]);

  // Pictures in turn while the pointer is on it.
  const timer = useRef(0);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const enter = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || cycle.length < 2) return;
    window.clearInterval(timer.current);
    setShown(1);
    timer.current = window.setInterval(() => setShown((n) => (n + 1) % cycle.length), 900);
  };
  const leave = () => {
    window.clearInterval(timer.current);
    setShown(0);
    ref.current?.style.removeProperty("--card-rx");
    ref.current?.style.removeProperty("--card-ry");
  };
  // Turns a little toward the pointer.
  const tilt = (e: ReactPointerEvent) => {
    if (d.cardHover !== "tilt" || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--card-rx", `${(((e.clientY - r.top) / r.height) - 0.5) * -8}deg`);
    ref.current.style.setProperty("--card-ry", `${(((e.clientX - r.left) / r.width) - 0.5) * 10}deg`);
  };

  const img = (src: string | undefined, cls: string, i?: number) => src ? <img key={`${cls}${i ?? ""}`} className={cls} src={src} alt={cls === "cpc-first" ? product.title : ""} aria-hidden={cls === "cpc-first" ? undefined : true} loading="lazy" decoding="async" draggable={false} data-on={i !== undefined && i === shown ? "" : undefined} /> : null;
  const pics = first
    ? cycle.length > 1
      ? <>{cycle.map((src, i) => img(src, i === 0 ? "cpc-first" : "cpc-cycle", i))}<span className="cpc-bars" aria-hidden="true">{cycle.map((_, i) => <i key={i} data-on={i === shown ? "" : undefined} />)}</span></>
      : <>{img(first, "cpc-first")}{hover && NEEDS_SECOND.has(hover) ? img(second, "cpc-second") : null}</>
    : <div className="configured-product-placeholder" style={{ background: item?.colorHex ?? "#d3bfce" }} />;
  const badge = discount ? <span className="cpc-badge" data-badge={d.badgeStyle ?? "pill"}>-{discount}%</span> : null;
  const actions = d.showButton !== false ? <div data-cms-part="card-actions" data-card-part="button">{preview ? <button data-cms-part="card-add" type="button" onClick={event => { emitVisualInteraction("cartClick", { source: event.currentTarget }); setAdded(true); emitVisualInteraction("cartAdded", { source: event.currentTarget }); }}>{added ? tr(lang, "محاكاة الإضافة ✓", "Simulated add ✓") : tr(lang, "تجربة الإضافة", "Test add")}</button> : <QuickAddButton product={product} selectedColorKey={item ? catalogItemKey(item, selected) : undefined} />}</div> : null;
  const picture = <span className="cpc-pic">{pics}</span>;
  return <article ref={ref} className="configured-product-card" data-cms-part="card" data-card-layout={d.layout ?? "vertical"} data-product-id={product.id}
    data-card-hover={hover} data-card-lift={d.cardHover && d.cardHover !== "none" ? d.cardHover : undefined} data-card-enter={d.enter && d.enter !== "none" ? d.enter : undefined}
    data-card-button={button !== "full" ? button : undefined} data-card-align={d.align === "center" ? "center" : undefined} data-card-shadow={d.shadow && d.shadow !== "none" ? d.shadow : undefined}
    style={vars} onPointerEnter={enter} onPointerLeave={leave} onPointerMove={tilt}>
    <div className="cpc-media">
      {preview ? <div data-cms-part="card-image" data-card-part="image">{picture}</div> : <Link href={href} data-cms-part="card-image" data-card-part="image">{picture}</Link>}
      {badge}
      {button === "hover" ? actions : null}
    </div>
    <div className="configured-product-body" data-cms-part="card-body">
      {d.showCategory !== false && product.category ? <span data-cms-part="card-category" data-card-part="category">{product.category.name}</span> : null}
      {preview ? <h3 data-cms-part="card-name" data-card-part="title">{product.title}</h3> : <Link href={href}><h3 data-cms-part="card-name" data-card-part="title">{product.title}</h3></Link>}
      {d.showPrice !== false ? <span data-cms-part="card-price" data-card-part="price">{formatMoney(getProductMinPrice(product), undefined)}</span> : null}
      {d.showSwatches !== false ? <div data-cms-part="card-swatches" data-card-part="swatches">{(product.items ?? []).slice(0, 16).map((swatch, i) => <button key={swatch.id} data-cms-part="card-swatch" type="button" aria-label={catalogItemLabel(swatch, i)} aria-pressed={selected === i} title={catalogItemLabel(swatch, i)} style={{ backgroundColor: /^#?[0-9a-f]{6}$/i.test(swatch.colorHex ?? "") ? `#${swatch.colorHex!.replace(/^#/, "")}` : "#ccc" }} onClick={event => { setSelected(i); setShown(0); selectStorefrontColor(swatch.colorHex, { source: event.currentTarget }); }} />)}</div> : null}
      {button !== "hover" ? actions : null}
    </div>
  </article>;
}
