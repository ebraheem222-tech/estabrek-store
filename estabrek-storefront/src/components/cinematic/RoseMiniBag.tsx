"use client";
import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, BAG_ADDED, BAG_OPEN, lineKey, type LineDetail } from "@/store/cart";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { LqipImage } from "@/components/LqipImage";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { localizeCartLine } from "@/lib/localize";
import { blendColours, glowPools, isHex, meshBackground } from "@/lib/colourMix";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { miniBagAttrs, miniBagById, miniBagHas, type MiniBagDesign } from "@/lib/miniBagDesigns";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { tr } from "@/lib/words";
import { usePathname } from "@/lib/shopPath";
import type { Lang } from "@/lib/i18n";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

type Line = {
  variantId: string;
  /** The shopper's own details for this line (a gift card's name and message…). */
  details?: LineDetail[] | null;
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

const onBagPage = () => /(^|\/)cart$/.test(window.location.pathname);

/*
 * The small bag (rose-showcase.css, "the small bag"): adding a piece anywhere (a product page, a card, the
 * quick view) opens it at the side of the page, on a phone from the bottom, instead of a note or the bag
 * page. It shows the bag with the piece just added marked, its count and total, and two ways on: «إتمام
 * الطلب» (the bag page, where the order is sent) and «متابعة التسوق» (closes it). Not on the bag page itself.
 * It wears the colours of what's in it: their blend for its buttons and words, a gradient mesh of them on its
 * head and glass (lib/colourMix.ts), with the piece just added counting most.
 *
 * The owner can give it one of 100 designs (admin → الإعدادات → السلة والدفع; lib/miniBagDesigns.ts, drawn by
 * app/minibag-designs.css): the same bag, laid out and dressed another way. None picked = the bag as above.
 * The bag icon in the header can open it too (miniBagOnIcon), and ?miniBag=<design> opens it in that design
 * (the admin's «شوفها على متجري»).
 */
export function RoseMiniBag({ freeOver = null }: { freeOver?: number | null }) {
  const { language: lang } = useLanguage();
  const { items, setQty, removeItem, count } = useCart();
  const settings = useStorefrontSettings();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [trial, setTrial] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    const added = (event: Event) => {
      if (onBagPage()) return;
      opener.current = document.activeElement;
      setFresh((event as CustomEvent<{ variantId?: string }>).detail?.variantId ?? null);
      setOpen(true);
    };
    // The header's bag icon (when the owner chose so): the bag as it is, nothing marked as new.
    const shown = () => {
      if (onBagPage()) return;
      opener.current = document.activeElement;
      setFresh(null);
      setOpen(true);
    };
    window.addEventListener(BAG_ADDED, added);
    window.addEventListener(BAG_OPEN, shown);
    return () => {
      window.removeEventListener(BAG_ADDED, added);
      window.removeEventListener(BAG_OPEN, shown);
    };
  }, []);
  // A new page closes it.
  useEffect(() => { setOpen(false); }, [pathname]);
  // ?miniBag=<design>: that design, open at once (after the closing above, which also runs first on a new page).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("miniBag");
    if (!miniBagById(id)) return;
    setTrial(id);
    if (!onBagPage()) setOpen(true);
  }, []);
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

  const payload = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, ...(i.details ? { details: i.details } : {}) })), [items]);
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

  const design = miniBagById(trial ?? settings.miniBagDesign);
  if (design) {
    return (
      <DesignedBag
        design={design}
        lang={lang}
        open={open}
        fresh={fresh}
        lines={shown}
        loading={loading}
        count={count}
        subtotal={subtotal}
        currency={currency}
        colours={colours.map(([hex]) => hex)}
        look={look}
        freeOver={freeOver}
        panel={panel}
        close={() => setOpen(false)}
        less={(line) => (line.quantity > 1 ? setQty(lineKey(line.variantId, line.details), line.quantity - 1) : removeItem(lineKey(line.variantId, line.details)))}
        more={(line) => setQty(lineKey(line.variantId, line.details), line.quantity + 1)}
        remove={(line) => removeItem(lineKey(line.variantId, line.details))}
      />
    );
  }

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
            const detail = [line.colorLabel || line.colorName, line.boxLabel, line.sizeName, ...(line.details ?? []).map((d) => `${d.label}: ${d.value}`)].filter(Boolean).join(" · ");
            const price = Number(line.lineTotal ?? Number(line.unitPrice ?? 0) * line.quantity);
            return (
              <li key={lineKey(line.variantId, line.details)} data-fresh={line.variantId === fresh ? "true" : undefined}>
                <span className="rose-minibag-photo">
                  {line.imageUrl ? <LqipImage src={cldUrl(line.imageUrl, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" fill sizes="72px" className="object-cover" blurDataUrl={line.imageBlurDataUrl ?? undefined} showSkeleton={false} /> : null}
                </span>
                <span className="rose-minibag-words">
                  <strong>{line.productTitle}</strong>
                  {detail ? <small>{detail}</small> : null}
                  <span className="rose-minibag-qty">
                    <button type="button" aria-label={tr(lang, "قطعة أقل", "One less")} onClick={() => (line.quantity > 1 ? setQty(lineKey(line.variantId, line.details), line.quantity - 1) : removeItem(lineKey(line.variantId, line.details)))}>−</button>
                    <output aria-live="polite">{line.quantity}</output>
                    <button type="button" aria-label={tr(lang, "قطعة كمان", "One more")} onClick={() => setQty(lineKey(line.variantId, line.details), line.quantity + 1)}>+</button>
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

type BagLine = ReturnType<typeof localizeCartLine> & Line;

/** Pieces shown large (photo tiles, the strip, the new piece on top) take a larger photo. */
const bigPhotos = (x: MiniBagDesign, first: boolean) => x.lines === "tiles" || x.lines === "strip" || (x.lines === "hero" && first);

/** The small bag in one of its designs (lib/miniBagDesigns.ts, app/minibag-designs.css). */
function DesignedBag({
  design: x, lang, open, fresh, lines, loading, count, subtotal, currency, colours, look, freeOver, panel, close, less, more, remove,
}: {
  design: MiniBagDesign;
  lang: Lang;
  open: boolean;
  fresh: string | null;
  lines: BagLine[];
  loading: boolean;
  count: number;
  subtotal: number | null;
  currency: string | null;
  colours: string[];
  look: React.CSSProperties | undefined;
  freeOver: number | null;
  panel: React.RefObject<HTMLDivElement | null>;
  close: () => void;
  less: (line: BagLine) => void;
  more: (line: BagLine) => void;
  remove: (line: BagLine) => void;
}) {
  // Glass and gradients wear the pieces' colours; the others keep the store's.
  const wear = x.tone === "glass" || x.tone === "mesh";
  const photo = lines.find((l) => l.imageUrl);
  const sum = subtotal != null ? formatMoney(subtotal, currency) : "—";
  const freeLeft = miniBagHas(x, "free") && freeOver != null && freeOver > 0 && subtotal != null && lines.length ? Math.max(0, freeOver - subtotal) : null;
  return (
    <div className="rose-minibag mb" {...miniBagAttrs(x)} data-open={open ? "true" : undefined} aria-hidden={!open}>
      <button type="button" className="mb-scrim" tabIndex={-1} aria-label={tr(lang, "إغلاق الحقيبة", "Close the bag")} onClick={close} />
      <div ref={panel} className="mb-panel" role="dialog" aria-modal="true" aria-label={tr(lang, "حقيبتكِ", "Your bag")} tabIndex={-1} style={wear ? look : undefined} data-mixed={colours.length ? colours.join(" ") : undefined}>
        <header className="mb-head">
          {x.head === "photo" ? (
            <span className="mb-head-pic" aria-hidden="true">
              {photo?.imageUrl ? <LqipImage src={cldUrl(photo.imageUrl, { w: 900, h: 560, c: "fill", g: "auto" })} alt="" fill sizes="(max-width: 760px) 100vw, 900px" className="object-cover" showSkeleton={false} /> : null}
            </span>
          ) : null}
          <span className="mb-mark" aria-hidden="true">
            <svg className="mb-tick" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m7 12.5 3.3 3.3L17.5 8.5" /></svg>
            <b className="mb-count-num">{count}</b>
          </span>
          <span className="mb-title">
            <strong>{fresh ? tr(lang, "انضافت لحقيبتكِ", "Added to your bag") : tr(lang, "حقيبتكِ", "Your bag")}</strong>
            <small className="mb-count">{tr(lang, `${count} قطعة`, "{0} pieces", [count])}</small>
          </span>
          <span className="mb-dots" aria-hidden="true">
            {miniBagHas(x, "colours") && colours.length > 1 ? colours.map((hex) => <i key={hex} style={{ background: hex }} />) : null}
          </span>
          <button type="button" className="mb-close" aria-label={tr(lang, "إغلاق الحقيبة", "Close the bag")} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        {freeLeft != null ? (
          <p className="mb-free" data-done={freeLeft === 0 ? "true" : undefined} data-testid="minibag-free">
            <span>
              {freeLeft > 0
                ? tr(lang, `ضيفي ${formatMoney(freeLeft, currency)} كمان والتوصيل علينا`, "Add {0} more for free delivery", [formatMoney(freeLeft, currency)])
                : tr(lang, "التوصيل علينا لهالطلب", "Delivery is on us for this order")}
            </span>
            <span className="mb-free-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.round(((subtotal ?? 0) / (freeOver || 1)) * 100))}%` }} /></span>
          </p>
        ) : null}
        <ul className="mb-lines" data-loading={loading && !lines.length ? "true" : undefined}>
          {!lines.length && loading ? [0, 1].map((i) => <li key={i} className="mb-ghost" />) : null}
          {lines.map((line, i) => {
            const detail = [line.colorLabel || line.colorName, line.boxLabel, line.sizeName, ...(line.details ?? []).map((d) => `${d.label}: ${d.value}`)].filter(Boolean).join(" · ");
            const price = Number(line.lineTotal ?? Number(line.unitPrice ?? 0) * line.quantity);
            const big = bigPhotos(x, i === 0);
            return (
              <li key={lineKey(line.variantId, line.details)} className="mb-line" data-fresh={line.variantId === fresh ? "true" : undefined} style={{ "--i": i } as React.CSSProperties}>
                <span className="mb-pic">
                  {line.imageUrl && x.lines !== "receipt" ? (
                    <LqipImage
                      src={cldUrl(line.imageUrl, big ? { w: 560, h: 700, c: "fill", g: "auto" } : { w: 160, h: 200, c: "fill", g: "auto" })}
                      alt=""
                      fill
                      sizes={big ? "(max-width: 760px) 50vw, 300px" : "96px"}
                      className="object-cover"
                      blurDataUrl={line.imageBlurDataUrl ?? undefined}
                      showSkeleton={false}
                    />
                  ) : null}
                </span>
                <span className="mb-words">
                  <strong>{line.productTitle}</strong>
                  {detail ? <small>{detail}</small> : null}
                  <span className="mb-actions">
                    <span className="mb-qty">
                      <button type="button" aria-label={tr(lang, "قطعة أقل", "One less")} onClick={() => less(line)}>−</button>
                      <output aria-live="polite">{line.quantity}</output>
                      <button type="button" aria-label={tr(lang, "قطعة كمان", "One more")} onClick={() => more(line)}>+</button>
                    </span>
                    {miniBagHas(x, "remove") ? (
                      <button type="button" className="mb-remove" onClick={() => remove(line)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                        {tr(lang, "إزالة", "Remove")}
                      </button>
                    ) : null}
                  </span>
                </span>
                <span className="mb-price">{formatMoney(price, currency)}</span>
              </li>
            );
          })}
          {!loading && !lines.length ? (
            <li className="mb-empty">
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 16h28l-2 24H12z" /><path d="M17 16v-3a7 7 0 0 1 14 0v3" /></svg>
              <span>{tr(lang, "حقيبتكِ فاضية.", "Your bag is empty.")}</span>
              <Link href="/shop" onClick={close}>{tr(lang, "تسوّقي من المتجر", "Shop the store")}</Link>
            </li>
          ) : null}
        </ul>
        <footer className="mb-foot">
          <span className="mb-total"><span>{tr(lang, "المجموع", "Subtotal")}</span><strong>{sum}</strong></span>
          <Link href="/cart" className="mb-checkout" onClick={close}>
            <span>{tr(lang, "إتمام الطلب", "Checkout")}</span>
            <span className="mb-checkout-sum">{sum}</span>
            <svg className="mb-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <button type="button" className="mb-continue" onClick={close}>{tr(lang, "متابعة التسوق", "Keep shopping")}</button>
          {miniBagHas(x, "secure") ? (
            <small className="mb-secure">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              {tr(lang, "دفع آمن", "Secure checkout")}
            </small>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
