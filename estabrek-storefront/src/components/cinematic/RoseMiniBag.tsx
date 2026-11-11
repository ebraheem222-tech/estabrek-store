"use client";
import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, BAG_ADDED } from "@/store/cart";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { LqipImage } from "@/components/LqipImage";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { localizeCartLine } from "@/lib/localize";
import { blendColours, glowPools, isHex, meshBackground } from "@/lib/colourMix";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { tr } from "@/lib/words";
import { usePathname } from "@/lib/shopPath";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

type Line = {
  variantId: string;
  quantity: number;
  productTitle?: string;
  productTranslations?: unknown;
  colorLabel?: string;
  colorName?: string | null;
  colorHex?: string | null;
  boxLabel?: string | null;
  sizeName?: string | null;
  imageUrl?: string | null;
  imageBlurDataUrl?: string | null;
  unitPrice?: string | number;
  lineTotal?: string | number;
};
type Quote = { subtotal?: string | number; total?: string | number; currencyCode?: string; lines?: Line[] };

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || process.env.API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:4000/v1";
}

/*
 * The small bag (rose-showcase.css, "the small bag"): adding a piece anywhere (a product page, a card, the
 * quick view) opens it at the side of the page, on a phone from the bottom, instead of a note or the bag
 * page. It shows the bag with the piece just added marked, its count and total, and two ways on: «إتمام
 * الطلب» (the bag page, where the order is sent) and «متابعة التسوق» (closes it). Not on the bag page itself.
 * It wears the colours of what's in it: their blend for its buttons and words, a gradient mesh of them on its
 * head and glass (lib/colourMix.ts), with the piece just added counting most.
 */
export function RoseMiniBag() {
  const { language: lang } = useLanguage();
  const { items, setQty, removeItem, count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    const added = (event: Event) => {
      if (/(^|\/)cart$/.test(window.location.pathname)) return;
      opener.current = document.activeElement;
      setFresh((event as CustomEvent<{ variantId?: string }>).detail?.variantId ?? null);
      setOpen(true);
    };
    window.addEventListener(BAG_ADDED, added);
    return () => window.removeEventListener(BAG_ADDED, added);
  }, []);
  // A new page closes it.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", key);
    window.setTimeout(() => panel.current?.focus(), 40);
    return () => {
      window.removeEventListener("keydown", key);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  const payload = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items]);
  const key = JSON.stringify(payload);
  useEffect(() => {
    if (!open) return;
    if (!payload.length) { setQuote(null); return; }
    let alive = true;
    setLoading(true);
    fetch(`${apiBase()}/catalog/cart-quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: payload }) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (alive) setQuote(data); })
      .catch(() => { if (alive) setQuote(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const currency = quote?.currencyCode ?? null;
  const lines = useMemo(() => (quote?.lines ?? []).map((l) => localizeCartLine(l, lang)), [quote, lang]);
  // The piece just added first.
  const shown = useMemo(() => [...lines].sort((a, b) => Number(b.variantId === fresh) - Number(a.variantId === fresh)), [lines, fresh]);
  const subtotal = quote?.subtotal != null ? Number(quote.subtotal) : null;
  // The bag's colours: each piece's, weighted by how many, the one just added last (it counts most).
  const colours = useMemo(() => {
    const weight = new Map<string, number>();
    const ordered = [...(quote?.lines ?? [])].sort((a, b) => Number(a.variantId === fresh) - Number(b.variantId === fresh));
    for (const line of ordered) {
      if (!isHex(line.colorHex)) continue;
      const hex = `#${line.colorHex.replace("#", "").toLowerCase()}`;
      weight.delete(hex);
      weight.set(hex, (weight.get(hex) ?? 0) + Math.max(1, line.quantity) + (line.variantId === fresh ? 1 : 0));
    }
    return [...weight.entries()].slice(-4);
  }, [quote, fresh]);
  const look = useMemo(() => {
    if (!colours.length) return undefined;
    const hexes = colours.map(([hex]) => hex);
    const blend = blendColours(hexes, colours.map(([, w]) => w));
    return {
      ...storefrontPalette(blend),
      "--minibag-glow": glowPools(hexes),
      "--minibag-mesh": meshBackground(hexes, { light: 0.8 }),
    } as React.CSSProperties;
  }, [colours]);

  return (
    <div className="rose-minibag" data-open={open ? "true" : undefined} aria-hidden={!open}>
      <button type="button" className="rose-minibag-scrim" tabIndex={-1} aria-label={tr(lang, "إغلاق الحقيبة", "Close the bag")} onClick={() => setOpen(false)} />
      <div ref={panel} className="rose-minibag-panel" role="dialog" aria-modal="true" aria-label={tr(lang, "حقيبتكِ", "Your bag")} tabIndex={-1} style={look} data-mixed={colours.length ? colours.map(([hex]) => hex).join(" ") : undefined}>
        <header className="rose-minibag-head">
          {fresh ? (
            <span className="rose-minibag-added">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m7 12.5 3.3 3.3L17.5 8.5" /></svg>
              {tr(lang, "انضافت لحقيبتكِ", "Added to your bag")}
            </span>
          ) : <span className="rose-minibag-added">{tr(lang, "حقيبتكِ", "Your bag")}</span>}
          {colours.length > 1 ? (
            <span className="rose-minibag-colours" aria-hidden="true">
              {colours.map(([hex]) => <i key={hex} style={{ background: hex }} />)}
            </span>
          ) : null}
          <span className="rose-minibag-count">{tr(lang, `${count} قطعة`, "{0} pieces", [count])}</span>
          <button type="button" className="rose-minibag-close" aria-label={tr(lang, "إغلاق الحقيبة", "Close the bag")} onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <ul className="rose-minibag-lines" data-loading={loading && !lines.length ? "true" : undefined}>
          {!lines.length && loading ? [0, 1].map((i) => <li key={i} className="rose-minibag-ghost" />) : null}
          {shown.map((line) => {
            const detail = [line.colorLabel || line.colorName, line.boxLabel, line.sizeName].filter(Boolean).join(" · ");
            const price = Number(line.lineTotal ?? Number(line.unitPrice ?? 0) * line.quantity);
            return (
              <li key={line.variantId} data-fresh={line.variantId === fresh ? "true" : undefined}>
                <span className="rose-minibag-photo">
                  {line.imageUrl ? <LqipImage src={cldUrl(line.imageUrl, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" fill sizes="72px" className="object-cover" blurDataUrl={line.imageBlurDataUrl ?? undefined} showSkeleton={false} /> : null}
                </span>
                <span className="rose-minibag-words">
                  <strong>{line.productTitle}</strong>
                  {detail ? <small>{detail}</small> : null}
                  <span className="rose-minibag-qty">
                    <button type="button" aria-label={tr(lang, "قطعة أقل", "One less")} onClick={() => (line.quantity > 1 ? setQty(line.variantId, line.quantity - 1) : removeItem(line.variantId))}>−</button>
                    <output aria-live="polite">{line.quantity}</output>
                    <button type="button" aria-label={tr(lang, "قطعة كمان", "One more")} onClick={() => setQty(line.variantId, line.quantity + 1)}>+</button>
                  </span>
                </span>
                <span className="rose-minibag-price">{formatMoney(price, currency)}</span>
              </li>
            );
          })}
          {!loading && !lines.length ? <li className="rose-minibag-empty">{tr(lang, "حقيبتكِ فاضية.", "Your bag is empty.")}</li> : null}
        </ul>
        <footer className="rose-minibag-foot">
          <span className="rose-minibag-total"><span>{tr(lang, "المجموع", "Subtotal")}</span><strong>{subtotal != null ? formatMoney(subtotal, currency) : "—"}</strong></span>
          <Link href="/cart" className="atelier-button button-dark rose-minibag-checkout" onClick={() => setOpen(false)}>
            {tr(lang, "إتمام الطلب", "Checkout")}<Icon name="arrow" />
          </Link>
          <button type="button" className="rose-minibag-continue" onClick={() => setOpen(false)}>{tr(lang, "متابعة التسوق", "Keep shopping")}</button>
        </footer>
      </div>
    </div>
  );
}
