/**
 * The page tree's content blocks, each a list of items: questions and answers (also the page's
 * FAQ for search engines), testimonials, price plans, a team, logos, a notice and words running
 * along a line. Drawn on the server with no script, except a notice's close button
 * (BlockClose). The words come in the page's language (`say`), links are the page's (`link`).
 */
import type { ReactNode } from "react";
import { BlockClose } from "./BlockClose";
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

const WORDS: Record<TreeLang, { stars: string; close: string; faq: string }> = {
  ar: { stars: "{0} من 5", close: "إغلاق", faq: "أسئلة" },
  en: { stars: "{0} out of 5", close: "Close", faq: "Questions" },
  he: { stars: "{0} מתוך 5", close: "סגירה", faq: "שאלות" },
};

/** Words that run along a line: the list twice, so the loop never shows a gap (the second copy is hidden from screen readers). */
function Running({ items, separator, className, style, mark }: { items: ReactNode[]; separator?: string; className: string; style?: Record<string, string>; mark: Record<string, string> }) {
  const one = (copy: number) =>
    items.map((it, i) => (
      <span key={`${copy}-${i}`} className="pt-mq-item" {...(copy ? { "aria-hidden": true } : {})}>
        {it}
        {separator ? <span className="pt-mq-sep" aria-hidden="true">{separator}</span> : null}
      </span>
    ));
  return (
    <div className={className} style={style} {...mark}>
      <div className="pt-mq-track">
        {one(0)}
        {one(1)}
      </div>
    </div>
  );
}

const ALERT_ICON: Record<string, string> = { info: "ℹ", success: "✓", warning: "!", danger: "✕", promo: "✦" };

export function BlockView({ node, className, mark, say, link, lang }: Helpers): ReactNode {
  const p = node.props ?? {};
  const w = WORDS[lang] ?? WORDS.ar;
  switch (node.type) {
    case "accordion": {
      const items = itemsOf(p.items, 30).filter((i) => say(i.q));
      if (!items.length) return null;
      const look = ["lines", "cards", "plus"].includes(p.look) ? p.look : "lines";
      // The page's questions for search engines (FAQPage).
      const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: say(i.q), acceptedAnswer: { "@type": "Answer", text: say(i.a) } })) };
      return (
        <div className={`${className} pt-acc pt-acc-${look}`} {...mark}>
          {items.map((i, n) => (
            <details key={n} className="pt-acc-item" open={i.open === true} {...(p.single === true ? { name: `acc-${node.id}` } : {})}>
              <summary className="pt-acc-q">{say(i.q)}</summary>
              <div className="pt-acc-a">{say(i.a)}</div>
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
                <blockquote>{say(i.quote)}</blockquote>
                <figcaption className="pt-tst-who">
                  {photo ? <img src={photo} alt="" loading="lazy" width={44} height={44} /> : null}
                  <span>
                    <strong>{say(i.name)}</strong>
                    {say(i.role) ? <span className="pt-tst-role">{say(i.role)}</span> : null}
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
      return (
        <div className={`${className} pt-plans`} {...mark}>
          {items.map((i, n) => {
            const to = link(i.href);
            const features = say(i.features).split("\n").map((f) => f.trim()).filter(Boolean);
            return (
              <div key={n} className={`pt-plan${i.featured === true ? " pt-plan-featured" : ""}`}>
                {say(i.badge) ? <span className="pt-plan-badge">{say(i.badge)}</span> : null}
                <div className="pt-plan-name">{say(i.name)}</div>
                <div>
                  <span className="pt-plan-price">{say(i.price)}</span>
                  {say(i.period) ? <span className="pt-plan-period"> {say(i.period)}</span> : null}
                </div>
                {features.length ? <ul>{features.map((f, k) => <li key={k}>{f}</li>)}</ul> : null}
                {say(i.cta) && to ? <a className={`pt-btn ${i.featured === true ? "pt-btn-solid" : "pt-btn-outline"}`} href={to}>{say(i.cta)}</a> : null}
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
                <div className="pt-member-name">{say(i.name)}</div>
                {say(i.role) ? <div className="pt-member-role">{say(i.role)}</div> : null}
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
            {say(p.title) ? <strong className="pt-alert-title">{say(p.title)}</strong> : null}
            <div>{text}</div>
          </div>
          {p.close === true ? <BlockClose label={w.close} /> : null}
        </div>
      );
    }
    case "marquee": {
      const items = (Array.isArray(p.items) ? p.items : []).slice(0, 20).map((t: unknown) => say(t)).filter(Boolean);
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
    default:
      return null;
  }
}

export const BLOCK_TYPES = new Set(["accordion", "testimonials", "pricing", "team", "logos", "alert", "marquee"]);
