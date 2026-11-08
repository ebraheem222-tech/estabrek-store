/**
 * The page tree's content blocks, each a list of items: questions and answers (also the page's
 * FAQ for search engines), testimonials, price plans, a team, logos, a notice and words running
 * along a line. Drawn on the server with no script, except a notice's close button
 * (BlockClose). The words come in the page's language (`say`), links are the page's (`link`).
 */
import type { ReactNode } from "react";
import { COUNTDOWN_WORD_FIELDS, defaultPartWords } from "../../../shared/partWords";
import { BlockClose } from "./BlockClose";
import { AccordionControls } from "./AccordionControls";
import { PricingView } from "./PricingView";
import { BeforeAfterView, CountdownView, TabsView } from "./Interactive";
import { withDecoration } from "./NodeDecorations";
import { safeSrc, type TreeLang, type TreeNode } from "./tree";

type Helpers = {
  node: TreeNode;
  className: string;
  mark: Record<string, string>;
  say: (t: unknown) => string;
  link: (h: unknown) => string | null;
  lang: TreeLang;
};
type Item = Record<string, unknown>;
const itemsOf = (v: unknown, max: number): Item[] => (Array.isArray(v) ? v.filter((i): i is Item => Boolean(i) && typeof i === "object").slice(0, max) : []);
const cols = (v: unknown, max: number, def: number) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= max ? v : def);

type Said = { stars: string; close: string; units: [string, string, string, string]; handle: string; before: string; after: string; map: string; see: string; find: string; search: string; menu: string };
export const WORDS: Record<TreeLang, Said> = {
  ar: { stars: "{0} من 5", close: "إغلاق", units: ["يوم", "ساعة", "دقيقة", "ثانية"], handle: "حرّكي للمقارنة", before: "قبل", after: "بعد", map: "خريطة", see: "شوفيها", find: "دوّري على قطعتك…", search: "بحث", menu: "القائمة" },
  en: { stars: "{0} out of 5", close: "Close", units: ["Days", "Hours", "Minutes", "Seconds"], handle: "Slide to compare", before: "Before", after: "After", map: "Map", see: "See it", find: "Find your piece…", search: "Search", menu: "Menu" },
  he: { stars: "{0} מתוך 5", close: "סגירה", units: ["ימים", "שעות", "דקות", "שניות"], handle: "הזיזו כדי להשוות", before: "לפני", after: "אחרי", map: "מפה", see: "לצפייה", find: "חפשו את הפריט שלכם…", search: "חיפוש", menu: "תפריט" },
};

/** Words that run along a line: the list twice, so the loop never shows a gap (the second copy is hidden from screen readers). */
function Running({ items, separator, className, style, mark, decoration }: { decoration?: ReactNode; items: ReactNode[]; separator?: string; className: string; style?: Record<string, string>; mark: Record<string, string> }) {
  const one = (copy: number) =>
    items.map((it, i) => (
      <span key={`${copy}-${i}`} className="pt-mq-item" {...(copy ? { "aria-hidden": true } : {})}>
        {it}
        {separator ? <span className="pt-mq-sep" aria-hidden="true">{separator}</span> : null}
      </span>
    ));
  return (
    <div className={className} style={style} {...mark}>
      {decoration}
      <div className="pt-mq-track">
        {one(0)}
        {one(1)}
      </div>
    </div>
  );
}

const ALERT_ICON: Record<string, string> = { info: "ℹ", success: "✓", warning: "!", danger: "✕", promo: "✦" };
const BILLING_WORDS: Record<TreeLang, { monthly: string; yearly: string; unavailable: string; expand: string; collapse: string }> = {
  ar: { monthly: "شهري", yearly: "سنوي", unavailable: "السعر غير محدد", expand: "فتح الكل", collapse: "إغلاق الكل" },
  en: { monthly: "Monthly", yearly: "Yearly", unavailable: "Price not specified", expand: "Expand all", collapse: "Collapse all" },
  he: { monthly: "חודשי", yearly: "שנתי", unavailable: "המחיר לא צוין", expand: "פתיחת הכול", collapse: "סגירת הכול" },
};

export function BlockView({ decoration, ...props }: Helpers & { decoration?: ReactNode }): ReactNode {
  return withDecoration(renderBlock(props), decoration);
}

function renderBlock({ node, className, mark, say, link, lang }: Helpers): ReactNode {
  const p = node.props ?? {};
  const w = WORDS[lang] ?? WORDS.ar;
  const field = (item: Item | null, key: string, line?: number) => ({ "data-pt-field": item ? `items.${Array.isArray(p.items) ? p.items.indexOf(item) : -1}.${key}` : key, ...(line !== undefined ? { "data-pt-field-line": line } : {}) });
  switch (node.type) {
    case "accordion": {
      const items = itemsOf(p.items, 30).filter((i) => say(i.q));
      if (!items.length) return null;
      const look = ["lines", "cards", "plus"].includes(p.look) ? p.look : "lines";
      // The page's questions for search engines (FAQPage).
      const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: say(i.q), acceptedAnswer: { "@type": "Answer", text: say(i.a) } })) };
      return (
        <div className={`${className} pt-acc pt-acc-${look}`} {...mark}>
          {p.controls === true && p.single !== true ? <AccordionControls expand={BILLING_WORDS[lang].expand} collapse={BILLING_WORDS[lang].collapse} /> : null}
          {items.map((i, n) => (
            <details key={n} className="pt-acc-item" open={i.open === true} {...(p.single === true ? { name: `acc-${node.id}` } : {})}>
              <summary {...field(i, "q")} className="pt-acc-q">{say(i.q)}</summary>
              <div {...field(i, "a")} className="pt-acc-a">{say(i.a)}</div>
            </details>
          ))}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, "\\u003c") }} />
        </div>
      );
    }
    case "testimonials": {
      const items = itemsOf(p.items, 24).filter((i) => say(i.quote));
      if (!items.length) return null;
      const layout = ["grid", "row", "single"].includes(p.layout) ? p.layout : "grid";
      return (
        <div className={`${className} pt-tst pt-tst-${layout}`} style={{ "--pt-cols": String(cols(p.columns, 4, 3)) } as Record<string, string>} {...mark}>
          {items.map((i, n) => {
            const stars = typeof i.stars === "number" && i.stars >= 1 && i.stars <= 5 ? Math.round(i.stars) : 0;
            const photo = safeSrc(i.photo);
            return (
              <figure key={n} className="pt-tst-card">
                {stars ? <span className="pt-stars" role="img" aria-label={w.stars.replace("{0}", String(stars))}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span> : null}
                <blockquote {...field(i, "quote")}>{say(i.quote)}</blockquote>
                <figcaption className="pt-tst-who">
                  {photo ? <img src={photo} alt="" loading="lazy" width={44} height={44} /> : null}
                  <span>
                    <strong {...field(i, "name")}>{say(i.name)}</strong>
                    {say(i.role) ? <span {...field(i, "role")} className="pt-tst-role">{say(i.role)}</span> : null}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      );
    }
    case "pricing": {
      const items = itemsOf(p.items, 6).filter((i) => say(i.name));
      if (!items.length) return null;
      if (p.billing === true) return <PricingView className={className} mark={mark} initialBilling={p.initialBilling === "yearly" ? "yearly" : "monthly"} monthly={BILLING_WORDS[lang].monthly} yearly={BILLING_WORDS[lang].yearly} unavailable={BILLING_WORDS[lang].unavailable} items={items.map((item) => ({ sourceIndex: p.items.indexOf(item), name: say(item.name), price: say(item.price), period: say(item.period), yearlyPrice: say(item.yearlyPrice), yearlyPeriod: say(item.yearlyPeriod), badge: say(item.badge), featured: item.featured === true, featureLines: say(item.features).split("\n").map((feature, line) => feature.trim() ? line : -1).filter(line => line >= 0), features: say(item.features).split("\n").map((feature) => feature.trim()).filter(Boolean), cta: say(item.cta), href: link(item.href) }))} />;
      return (
        <div className={`${className} pt-plans`} {...mark}>
          {items.map((i, n) => {
            const to = link(i.href);
            const features = say(i.features).split("\n").map((f, line) => ({ text: f.trim(), line })).filter(f => f.text);
            return (
              <div key={n} className={`pt-plan${i.featured === true ? " pt-plan-featured" : ""}`}>
                {say(i.badge) ? <span {...field(i, "badge")} className="pt-plan-badge">{say(i.badge)}</span> : null}
                <div {...field(i, "name")} className="pt-plan-name">{say(i.name)}</div>
                <div>
                  <span {...field(i, "price")} className="pt-plan-price">{say(i.price)}</span>
                  {say(i.period) ? <span {...field(i, "period")} className="pt-plan-period"> {say(i.period)}</span> : null}
                </div>
                {features.length ? <ul>{features.map((f, k) => <li key={k} {...field(i, "features", f.line)}>{f.text}</li>)}</ul> : null}
                {say(i.cta) && to ? <a {...field(i, "cta")} className={`pt-btn ${i.featured === true ? "pt-btn-solid" : "pt-btn-outline"}`} href={to}>{say(i.cta)}</a> : null}
              </div>
            );
          })}
        </div>
      );
    }
    case "team": {
      const items = itemsOf(p.items, 24).filter((i) => say(i.name));
      if (!items.length) return null;
      return (
        <div className={`${className} pt-team`} style={{ "--pt-cols": String(cols(p.columns, 6, 4)) } as Record<string, string>} {...mark}>
          {items.map((i, n) => {
            const photo = safeSrc(i.photo);
            const to = link(i.href);
            const body = (
              <>
                {photo ? <img src={photo} alt="" loading="lazy" /> : null}
                <div {...field(i, "name")} className="pt-member-name">{say(i.name)}</div>
                {say(i.role) ? <div {...field(i, "role")} className="pt-member-role">{say(i.role)}</div> : null}
              </>
            );
            return to ? <a key={n} className="pt-member" href={to}>{body}</a> : <div key={n} className="pt-member">{body}</div>;
          })}
        </div>
      );
    }
    case "logos": {
      const items = itemsOf(p.items, 40).filter((i) => safeSrc(i.src));
      if (!items.length) return null;
      const logo = (i: Item, n: number) => {
        const img = <img src={safeSrc(i.src)!} alt={say(i.alt)} loading="lazy" />;
        const to = link(i.href);
        return to ? <a key={n} href={to}>{img}</a> : <span key={n}>{img}</span>;
      };
      const gray = p.gray === true ? " pt-logos-gray" : "";
      if (p.moving === true) return <Running className={`${className} pt-mq pt-mq-pause pt-logos${gray}`} items={items.map(logo)} mark={mark} />;
      return <div className={`${className} pt-logos${gray}`} {...mark}>{items.map(logo)}</div>;
    }
    case "alert": {
      const text = say(p.text);
      if (!text) return null;
      const kind = ["info", "success", "warning", "danger", "promo"].includes(p.kind) ? p.kind : "info";
      return (
        <div className={`${className} pt-alert pt-alert-${kind}`} role={kind === "danger" ? "alert" : "status"} {...mark}>
          <span className="pt-alert-icon" aria-hidden="true">{ALERT_ICON[kind]}</span>
          <div>
            {say(p.title) ? <strong {...field(null, "title")} className="pt-alert-title">{say(p.title)}</strong> : null}
            <div {...field(null, "text")}>{text}</div>
          </div>
          {p.close === true ? <BlockClose label={w.close} /> : null}
        </div>
      );
    }
    case "marquee": {
      const items = (Array.isArray(p.items) ? p.items : []).slice(0, 20).map((t: unknown, index: number) => ({ text: say(t), index })).filter((item: { text: string }) => item.text).map((item: { text: string; index: number }) => <span key={item.index} data-pt-field={`items.${item.index}`}>{item.text}</span>);
      if (!items.length) return null;
      const speed = typeof p.speed === "number" && p.speed >= 4 && p.speed <= 120 ? p.speed : 30;
      const sep = typeof p.separator === "string" && p.separator.length <= 4 ? p.separator : "•";
      return (
        <Running
          className={`${className} pt-mq${p.reverse === true ? " pt-mq-rev" : ""}${p.pause === true ? " pt-mq-pause" : ""}`}
          style={{ "--pt-mqs": `${speed}s` }} items={items} separator={sep || undefined} mark={mark}
        />
      );
    }
    case "tabs": {
      const items = itemsOf(p.items, 12).filter((i) => say(i.label));
      if (!items.length) return null;
      const look = ["pills", "underline", "boxed"].includes(p.look) ? p.look : "underline";
      return (
        <div className={className} {...mark}>
          <TabsView items={items.map((i) => ({ sourceIndex: p.items.indexOf(i), label: say(i.label), text: say(i.text), image: safeSrc(i.image) }))} look={look} />
        </div>
      );
    }
    case "countdown": {
      const until = typeof p.until === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(p.until) && !Number.isNaN(Date.parse(p.until)) ? p.until : null;
      if (!until) return null;
      return (
        <div className={className} {...mark}>
          <CountdownView until={until} done={say(p.done)} look={p.look === "plain" ? "plain" : "boxes"} words={COUNTDOWN_WORD_FIELDS.map(key => say(p[key]) || defaultPartWords("countdown", key)![lang]) as [string, string, string, string]} />
        </div>
      );
    }
    case "beforeAfter": {
      const [before, after] = [safeSrc(p.before), safeSrc(p.after)];
      if (!before || !after) return null;
      const start = typeof p.start === "number" && p.start >= 0 && p.start <= 100 ? p.start : 50;
      return (
        <div className={className} {...mark}>
          <BeforeAfterView before={before} after={after} beforeLabel={say(p.beforeLabel) || defaultPartWords("beforeAfter", "beforeLabel")![lang]} afterLabel={say(p.afterLabel) || defaultPartWords("beforeAfter", "afterLabel")![lang]} start={start} handle={w.handle} />
        </div>
      );
    }
    case "hotspots": {
      const src = safeSrc(p.src);
      if (!src) return null;
      const at = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 100 ? v : null);
      const spots = itemsOf(p.items, 20).filter((i) => at(i.x) !== null && at(i.y) !== null && say(i.title));
      return (
        <div className={`${className} pt-hot`} {...mark}>
          <img src={src} alt={say(p.alt)} loading="lazy" />
          {spots.map((i, n) => {
            const to = link(i.href);
            return (
              // Measured on the picture itself (from its left), whatever the page's direction.
              <details key={n} className={`pt-hot-spot${(i.x as number) > 60 ? " pt-hot-end" : ""}`} style={{ left: `${i.x}%`, top: `${i.y}%` }} name={`hot-${node.id}`}>
                <summary aria-label={say(i.title)}><span aria-hidden="true" /></summary>
                <div className="pt-hot-card">
                  <strong {...field(i, "title")}>{say(i.title)}</strong>
                  {say(i.text) ? <p {...field(i, "text")}>{say(i.text)}</p> : null}
                  {to ? <a href={to}>{w.see}</a> : null}
                </div>
              </details>
            );
          })}
        </div>
      );
    }
    case "map": {
      const q = typeof p.query === "string" ? p.query.trim().slice(0, 200) : "";
      if (q.length < 2) return null;
      const zoom = typeof p.zoom === "number" && p.zoom >= 1 && p.zoom <= 20 ? Math.round(p.zoom) : 14;
      return (
        <div className={`${className} pt-map`} {...mark}>
          <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&hl=${lang}&output=embed`} title={say(p.label) || w.map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      );
    }
    case "search": {
      const look = ["rounded", "pill", "underline", "boxed", "glass"].includes(p.look) ? p.look : "pill";
      const label = say(p.placeholder) || w.find;
      return (
        <form className={`${className} pt-search pt-search-${look}`} action={link("/search") ?? "/search"} role="search" {...mark}>
          <svg className="pt-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input type="search" name="q" required placeholder={label} aria-label={label} />
          {say(p.button) ? <button {...field(null, "button")} type="submit" className="pt-btn pt-btn-solid">{say(p.button)}</button> : <button type="submit" className="pt-search-go" aria-label={w.search}>→</button>}
        </form>
      );
    }
    case "menu": {
      const items = itemsOf(p.items, 20).map((i) => ({ sourceIndex: p.items.indexOf(i), label: say(i.label), to: link(i.href) })).filter((i) => i.label && i.to);
      if (!items.length) return null;
      const layout = p.layout === "column" ? "column" : "row";
      const look = ["plain", "pills", "underline", "buttons"].includes(p.look) ? p.look : "plain";
      const name = say(p.label) || w.menu;
      const list = (cls: string) => (
        <ul className={cls}>
          {items.map((i, n) => <li key={n}><a data-pt-field={`items.${i.sourceIndex}.label`} href={i.to!}>{i.label}</a></li>)}
        </ul>
      );
      return (
        <nav className={`${className} pt-menu pt-menu-${layout} pt-menu-${look}${p.phone === "fold" ? " pt-menu-folds" : ""}`} aria-label={name} {...mark}>
          {list("pt-menu-list")}
          {p.phone === "fold" ? (
            // On a phone the links fold under a button (the list above is hidden there).
            <details className="pt-menu-fold">
              <summary aria-label={name}><span aria-hidden="true">☰</span> {name}</summary>
              {list("pt-menu-list")}
            </details>
          ) : null}
        </nav>
      );
    }
    default:
      return null;
  }
}

export const BLOCK_TYPES = new Set(["accordion", "testimonials", "pricing", "team", "logos", "alert", "marquee", "tabs", "countdown", "beforeAfter", "hotspots", "map", "search", "menu"]);
