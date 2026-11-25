"use client";
/**
 * Two page-tree elements that sell one of the store's products with the shopper's own touch (loaded through
 * lazyParts.tsx, only on pages that have them):
 *  - a gift card: the product's sizes are its amounts; she picks one, writes who it's for, from whom and a message,
 *    sees the card drawn as she writes, and puts it in the bag with those words (the order shows them);
 *  - a configurator: the product's own colours and sizes (its picture and price follow) and the owner's extra parts
 *    (a name and its options, a colour or a picture laid over the product's), her choices going with it to the bag.
 * The product is fetched in the browser (its address in the editor); the server draws the frame meanwhile. A line's
 * words or choices make it a line of its own in the bag (store/cart.tsx details).
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { apiBaseClient, getProductBySlugClient } from "@/lib/apiClient";
import { formatMoney, getVariantEffectivePrice, type CatalogItem, type CatalogProduct, type CatalogVariant } from "@/lib/catalog";
import type { Lang } from "@/lib/i18n";
import { useCart, type LineDetail } from "@/store/cart";
import type { BuildWords } from "./proWords";

const inStudio = () => window.parent !== window && /\/studio-frame/.test(window.location.pathname);

/** The product in the page's language, or why there is none (no address, not found). */
function useProduct(slug: string, lang: Lang) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(slug ? "loading" : "missing");
  useEffect(() => {
    if (!slug) { setState("missing"); return; }
    let alive = true;
    getProductBySlugClient(slug, lang)
      .then((p) => { if (!alive) return; setProduct(p); setState(p ? "ready" : "missing"); })
      .catch(() => { if (alive) setState("missing"); });
    return () => { alive = false; };
  }, [slug, lang]);
  return { product, state };
}
const priceOf = (v: CatalogVariant | undefined) => (v ? getVariantEffectivePrice(v) : null);
const currencyOf = (p: CatalogProduct | null) => ((p as { currencyCode?: string } | null)?.currencyCode ?? null);
/** A colour's own picture, else the product's. */
const itemImage = (it: CatalogItem | undefined, p?: CatalogProduct | null) => it?.primaryImageUrl ?? it?.images?.[0]?.url ?? p?.primaryImageUrl ?? null;
const sellable = (v: CatalogVariant) => v.stock == null || v.stock > 0;

/** For the owner in the editor: the element needs a product (shoppers see nothing). */
function Missing({ note }: { note: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(inStudio()), []);
  return shown ? <p className="pt-build-missing">{note}</p> : null;
}

/** "Added to your bag" for a moment after adding. */
function useAdded() {
  const [added, setAdded] = useState(false);
  useEffect(() => { if (!added) return; const t = window.setTimeout(() => setAdded(false), 2600); return () => window.clearTimeout(t); }, [added]);
  return [added, () => setAdded(true)] as const;
}

/* --------------------------------------------------------------------- gift card */

export type GiftCardProps = {
  product: string; lang: Lang; look: "rose" | "night" | "gold" | "brand"; picture?: string; button: string; words: BuildWords;
};

export function GiftCardView({ product: slug, lang, look, picture, button, words }: GiftCardProps) {
  const { product, state } = useProduct(slug, lang);
  const { addItem } = useCart();
  const [added, markAdded] = useAdded();
  const variants = useMemo(() => (product?.items?.[0]?.variants ?? []).filter(sellable), [product]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (!chosen && variants[0]) setChosen(variants[0].id); }, [variants, chosen]);
  const variant = variants.find((v) => v.id === chosen);
  const currency = currencyOf(product);
  const amount = variant ? (variant.size?.name || formatMoney(priceOf(variant), currency)) : "—";

  if (state === "missing") return <Missing note={words.giftMissing} />;
  const add = () => {
    if (!variant || !to.trim()) return;
    const details: LineDetail[] = [{ label: words.to, value: to }, { label: words.from, value: from }, { label: words.message, value: message }];
    addItem(variant.id, 1, details);
    markAdded();
  };
  return (
    <div className="pt-gift" data-ready={state === "ready" ? "true" : "false"}>
      <div className={`pt-gift-card pt-gift-${look}`} style={picture ? ({ "--pt-gift-pic": `url("${picture}")` } as CSSProperties) : undefined} aria-hidden="true">
        <span className="pt-gift-amount" data-pt-gift-amount="">{amount}</span>
        <span className="pt-gift-to">{to.trim() ? `${words.to}: ${to}` : words.toHint}</span>
        <span className="pt-gift-message">{message.trim() || words.messageHint}</span>
        {from.trim() ? <span className="pt-gift-from">{`${words.from}: ${from}`}</span> : null}
      </div>
      <div className="pt-gift-form">
        <div className="pt-build-label">{words.amount}</div>
        <div className="pt-build-options" role="radiogroup" aria-label={words.amount}>
          {variants.map((v) => (
            <button key={v.id} type="button" role="radio" aria-checked={v.id === chosen} className="pt-build-chip" data-pt-amount={v.id} onClick={() => setChosen(v.id)}>
              {v.size?.name || formatMoney(priceOf(v), currency)}
            </button>
          ))}
          {state === "loading" ? <span className="pt-build-chip pt-build-ghost" /> : null}
        </div>
        <label className="pt-build-field"><span>{words.to}</span><input value={to} maxLength={40} onChange={(e) => setTo(e.target.value)} data-pt-gift="to" /></label>
        <label className="pt-build-field"><span>{words.from}</span><input value={from} maxLength={40} onChange={(e) => setFrom(e.target.value)} data-pt-gift="from" /></label>
        <label className="pt-build-field"><span>{words.message}</span><textarea value={message} maxLength={200} rows={3} onChange={(e) => setMessage(e.target.value)} data-pt-gift="message" /></label>
        <div className="pt-build-foot">
          <strong>{variant ? formatMoney(priceOf(variant), currency) : ""}</strong>
          <button type="button" className="pt-btn pt-btn-solid" disabled={!variant || !to.trim()} onClick={add} data-pt-build-add="">{added ? words.added : button}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ configurator */

export type BuildPart = { name: string; options: Array<{ name: string; color?: string; src?: string }> };
export type ConfiguratorProps = { product: string; lang: Lang; parts: BuildPart[]; button: string; words: BuildWords };

export function ConfiguratorView({ product: slug, lang, parts, button, words }: ConfiguratorProps) {
  const { product, state } = useProduct(slug, lang);
  const { addItem } = useCart();
  const [added, markAdded] = useAdded();
  const items = product?.items ?? [];
  const [itemIdx, setItemIdx] = useState(0);
  const item = items[itemIdx];
  const variants = (item?.variants ?? []).filter(sellable);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [picks, setPicks] = useState<number[]>(() => parts.map(() => 0));
  useEffect(() => { setVariantId(variants[0]?.id ?? null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [itemIdx, product]);
  const variant = variants.find((v) => v.id === variantId);
  const currency = currencyOf(product);
  const layers = parts.map((part, i) => part.options[picks[i] ?? 0]).filter((o) => o?.src);

  if (state === "missing") return <Missing note={words.buildMissing} />;
  const add = () => {
    if (!variant) return;
    addItem(variant.id, 1, parts.map((part, i) => ({ label: part.name, value: part.options[picks[i] ?? 0]?.name ?? "" })));
    markAdded();
  };
  return (
    <div className="pt-cfg" data-ready={state === "ready" ? "true" : "false"}>
      <div className="pt-cfg-stage">
        {itemImage(item, product) ? <img className="pt-cfg-base" src={itemImage(item, product)!} alt={product?.title ?? ""} /> : <span className="pt-cfg-base pt-build-ghost" />}
        {layers.map((o, i) => <img key={`${i}-${o!.src}`} className="pt-cfg-layer" src={o!.src} alt="" aria-hidden="true" />)}
      </div>
      <div className="pt-cfg-panel">
        {product ? <div className="pt-cfg-title">{product.title}</div> : null}
        {items.length > 1 ? (
          <>
            <div className="pt-build-label">{product?.type?.colorLabel || words.colour}</div>
            <div className="pt-build-options" role="radiogroup" aria-label={product?.type?.colorLabel || words.colour}>
              {items.map((it, i) => (
                <button key={it.id} type="button" role="radio" aria-checked={i === itemIdx} className="pt-build-swatch" title={it.colorLabel || it.colorName || ""}
                  style={{ "--pt-sw": it.colorHex || "#ddd" } as CSSProperties} onClick={() => setItemIdx(i)} data-pt-colour={i}>
                  <span className="pt-sr">{it.colorLabel || it.colorName}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
        {variants.length > 1 || variants[0]?.size ? (
          <>
            <div className="pt-build-label">{product?.type?.sizeLabel || words.size}</div>
            <div className="pt-build-options" role="radiogroup" aria-label={product?.type?.sizeLabel || words.size}>
              {variants.map((v) => (
                <button key={v.id} type="button" role="radio" aria-checked={v.id === variantId} className="pt-build-chip" onClick={() => setVariantId(v.id)} data-pt-size={v.id}>
                  {v.size?.name || formatMoney(priceOf(v), currency)}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {parts.map((part, i) => (
          <div key={i}>
            <div className="pt-build-label">{part.name}: <b>{part.options[picks[i] ?? 0]?.name}</b></div>
            <div className="pt-build-options" role="radiogroup" aria-label={part.name}>
              {part.options.map((o, j) => (
                <button key={j} type="button" role="radio" aria-checked={(picks[i] ?? 0) === j} className={o.color ? "pt-build-swatch" : "pt-build-chip"} title={o.name}
                  style={o.color ? ({ "--pt-sw": o.color } as CSSProperties) : undefined} data-pt-part={`${i}-${j}`}
                  onClick={() => setPicks((prev) => parts.map((_, k) => (k === i ? j : prev[k] ?? 0)))}>
                  {o.color ? <span className="pt-sr">{o.name}</span> : o.src ? <img src={o.src} alt="" /> : null}
                  {!o.color ? <span>{o.name}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="pt-build-foot">
          <strong data-pt-build-price="">{variant ? formatMoney(priceOf(variant), currency) : ""}</strong>
          <button type="button" className="pt-btn pt-btn-solid" disabled={!variant} onClick={add} data-pt-build-add="">{added ? words.added : button}</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- booking calendar */

export type BookingProps = {
  product: string; lang: Lang; days: number[]; from: string; to: string; every: number; ahead: number; closed: string[];
  button: string; words: BuildWords;
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutes = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const LOCALE: Record<string, string> = { ar: "ar", en: "en-GB", he: "he" };

/** The day's times, from opening to closing, `every` minutes apart (the last one ends by closing time). */
function timesOf(from: string, to: string, every: number): string[] {
  const out: string[] = [];
  for (let t = minutes(from); t + every <= minutes(to) && out.length < 96; t += every) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

export function BookingView({ product: slug, lang, days, from, to, every, ahead, closed, button, words }: BookingProps) {
  const { product, state } = useProduct(slug, lang);
  const { addItem } = useCart();
  const [added, markAdded] = useAdded();
  // The days are the shopper's own (her clock), worked out once the page wakes (the server doesn't know her day).
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => { const d = new Date(); d.setHours(0, 0, 0, 0); setToday(d); }, []);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [inBag, setInBag] = useState<Set<string>>(new Set());
  const variants = useMemo(() => (product?.items?.[0]?.variants ?? []).filter(sellable), [product]);
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => { if (!chosen && variants[0]) setChosen(variants[0].id); }, [variants, chosen]);
  const variant = variants.find((v) => v.id === chosen);
  const last = useMemo(() => (today ? new Date(today.getTime() + (ahead - 1) * 86_400_000) : null), [today, ahead]);

  // The times other orders hold, for the days on offer (never who holds them).
  useEffect(() => {
    if (!today || !last || !slug) return;
    let alive = true;
    fetch(`${apiBaseClient()}/catalog/booking-slots?product=${encodeURIComponent(slug)}&from=${ymd(today)}&to=${ymd(last)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j && Array.isArray(j.taken)) setTaken(new Set(j.taken.filter((s: unknown) => typeof s === "string"))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [today, last, slug]);

  if (state === "missing") return <Missing note={words.bookMissing} />;
  const locale = LOCALE[lang] ?? lang;
  const open = (d: Date) => !!today && !!last && d >= today && d <= last && days.includes(d.getDay()) && !closed.includes(ymd(d));
  // The month shown, and its weeks (Sunday first).
  const first = today ? new Date(today.getFullYear(), today.getMonth() + month, 1) : null;
  const cells: Array<Date | null> = [];
  if (first) {
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  const canBack = month > 0;
  const canOn = !!first && !!last && new Date(first.getFullYear(), first.getMonth() + 1, 1) <= last;
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 10, 1 + i)));
  const now = new Date();
  const soon = now.getHours() * 60 + now.getMinutes() + 30;
  const times = day ? timesOf(from, to, every).filter((t) => !(today && day === ymd(today) && minutes(t) < soon)) : [];
  const when = day && time ? `${day} ${time}` : null;
  const shown = day ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T00:00`)) : "";
  const add = () => {
    if (!variant || !when) return;
    addItem(variant.id, 1, [{ label: words.when, value: when }]);
    setInBag((prev) => new Set(prev).add(when));
    setTime(null);
    markAdded();
  };
  return (
    <div className="pt-book" data-ready={state === "ready" && today ? "true" : "false"}>
      <div className="pt-book-cal">
        <div className="pt-book-head">
          <button type="button" className="pt-book-nav" disabled={!canBack} onClick={() => setMonth((m) => m - 1)} aria-label={words.prev}>‹</button>
          <strong>{first ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(first) : ""}</strong>
          <button type="button" className="pt-book-nav" disabled={!canOn} onClick={() => setMonth((m) => m + 1)} aria-label={words.next}>›</button>
        </div>
        <div className="pt-book-grid" role="grid" aria-label={words.pickDay}>
          {weekdays.map((w) => <span key={w} className="pt-book-wd" aria-hidden="true">{w}</span>)}
          {cells.map((d, i) => d ? (
            <button key={i} type="button" className="pt-book-day" disabled={!open(d)} aria-pressed={day === ymd(d)} data-pt-day={ymd(d)}
              onClick={() => { setDay(ymd(d)); setTime(null); }}>{d.getDate()}</button>
          ) : <span key={i} />)}
        </div>
      </div>
      <div className="pt-book-side">
        {variants.length > 1 ? (
          <div className="pt-build-options" role="radiogroup">
            {variants.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={v.id === chosen} className="pt-build-chip" onClick={() => setChosen(v.id)}>
                {v.size?.name || formatMoney(priceOf(v), currencyOf(product))}
              </button>
            ))}
          </div>
        ) : null}
        <div className="pt-build-label">{day ? shown : words.pickDay}</div>
        {day ? (
          times.length ? (
            <div className="pt-book-times" role="radiogroup" aria-label={words.pickTime}>
              {times.map((t) => {
                const busy = taken.has(`${day} ${t}`) || inBag.has(`${day} ${t}`);
                return (
                  <button key={t} type="button" role="radio" aria-checked={time === t} className="pt-build-chip" disabled={busy} data-pt-time={t} title={busy ? words.booked : undefined} onClick={() => setTime(t)}>
                    <span dir="ltr">{t}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="pt-book-none">{words.noTimes}</p>
        ) : null}
        <div className="pt-build-foot">
          <strong>{variant ? formatMoney(priceOf(variant), currencyOf(product)) : ""}</strong>
          <button type="button" className="pt-btn pt-btn-solid" disabled={!variant || !when} onClick={add} data-pt-build-add="">{added ? words.added : button}</button>
        </div>
      </div>
    </div>
  );
}
