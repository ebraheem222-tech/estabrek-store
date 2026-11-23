"use client";
// A game server site's packages on its Tebex webstore (sites wave G4; backend lib/tebex.ts): the server fills them as
// the page is served. Each with its picture, price (and the price before a sale), a few words, and a button to it on
// the webstore, where the player signs in, pays and gets it; the site never takes the payment. Its categories as tabs.
// In the editor (no webstore yet) it shows how it will look.
import { useState } from "react";
import type { TreeLang } from "./tree";
import css from "./TebexPackagesView.module.css";

type Pack = { id: number; name: string; price: number; base: number; currency: string; image: string | null; text: string; href: string };
type Store = { name: string; currency: string; url: string; categories: Array<{ id: number; name: string; packages: Pack[] }> };

const WORDS = {
  ar: { buy: "اشتري", all: "المتجر كله", empty: "الباقات بتطلع هون لما يتوصّل متجر Tebex.", sample: "باقة", sampleText: "الباقات بتطلع هون من متجر Tebex تبع السيرفر.", sale: "خصم" },
  en: { buy: "Buy", all: "The whole store", empty: "The packages show here once a Tebex store is connected.", sample: "Package", sampleText: "The packages show here from the server's Tebex store.", sale: "Sale" },
  he: { buy: "לקנות", all: "כל החנות", empty: "החבילות יופיעו כאן אחרי שחנות Tebex תחובר.", sample: "חבילה", sampleText: "החבילות יופיעו כאן מחנות ה-Tebex של השרת.", sale: "מבצע" },
} as const;

/** A price in the store's currency, the way the visitor's language writes it. */
function money(n: number, currency: string, lang: TreeLang) {
  try {
    return new Intl.NumberFormat(lang === "he" ? "he-IL" : lang === "en" ? "en-US" : "ar", { style: "currency", currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}
const isStore = (v: unknown): v is Store => !!v && typeof v === "object" && Array.isArray((v as Store).categories) && typeof (v as Store).url === "string";

export function TebexPackagesView({ store, lang, buy, all, empty, note, columns }: { store: unknown; lang: TreeLang; buy: string; all: string; empty: string; note: string; columns: number }) {
  const w = WORDS[lang] ?? WORDS.ar;
  const [tab, setTab] = useState(0);
  // In the editor's frame, or before a webstore answers: how it will look, or the owner's words.
  if (!isStore(store) || !store.categories.length) {
    const inStudio = typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    if (!inStudio) return <p className={css.empty} data-tebex="empty">{empty || w.empty}</p>;
    return (
      <div className={css.grid} style={{ ["--cols" as string]: String(columns) }} data-tebex="sample">
        {[1, 2, 3].slice(0, columns).map((n) => (
          <article key={n} className={css.card}>
            <div className={css.pic} aria-hidden />
            <h3 className={css.name}>{w.sample} {n}</h3>
            <p className={css.text}>{w.sampleText}</p>
            <span className={css.buy}>{buy || w.buy}</span>
          </article>
        ))}
      </div>
    );
  }
  const cat = store.categories[Math.min(tab, store.categories.length - 1)];
  return (
    <div className={css.wrap} data-tebex="store">
      {store.categories.length > 1 ? (
        <div className={css.tabs} role="tablist" aria-label={store.name}>
          {store.categories.map((c, i) => (
            <button key={c.id} type="button" role="tab" aria-selected={c.id === cat.id} className={css.tab} onClick={() => setTab(i)}>
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className={css.grid} style={{ ["--cols" as string]: String(columns) }} role={store.categories.length > 1 ? "tabpanel" : undefined}>
        {cat.packages.map((p) => (
          <article key={p.id} className={css.card} data-package={p.id}>
            {p.image ? <img className={css.pic} src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
            <h3 className={css.name}>{p.name}</h3>
            <div className={css.price}>
              <b>{money(p.price, p.currency, lang)}</b>
              {p.base > p.price ? (
                <>
                  <s>{money(p.base, p.currency, lang)}</s> <span className={css.sale}>{w.sale}</span>
                </>
              ) : null}
            </div>
            {p.text ? <p className={css.text}>{p.text}</p> : null}
            <a className={css.buy} href={p.href} target="_blank" rel="noopener noreferrer">{buy || w.buy}</a>
          </article>
        ))}
      </div>
      <div className={css.foot}>
        <a className={css.all} href={store.url} target="_blank" rel="noopener noreferrer">{all || w.all}</a>
        {note ? <p className={css.note}>{note}</p> : null}
      </div>
    </div>
  );
}
