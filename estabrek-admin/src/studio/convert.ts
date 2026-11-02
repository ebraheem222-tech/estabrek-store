/**
 * Old sections (the old editor's) turned into the new editor's own elements, so a page no
 * longer needs the old editor: their words in every language the section has, their pictures,
 * links and lists (questions, reviews, team, plans, numbers, cards…). What can't come along
 * is said (`dropped`); what can't be turned at all stays an old section (`why`): the rose
 * opening (the new editor sets it already), custom HTML (edited as HTML there), a YouTube or
 * Vimeo clip, a grid holding other sections, and the global header, footer and announcement.
 * In the rose design the shop draws old sections in its own look (the home's first HERO is
 * its opening, others become rose panels, contact and calls to action rose ones): the caller
 * says so (`rose`), and that look is said not to come along.
 * Pure (tested; the backend's test checks every result like a saved page).
 */
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";

type N = PageTreeNode;
type S = Record<string, unknown>;
type Ids = (prefix: string) => string;
type Words = Partial<Record<Lang, string>>;

export type OldSection = { id: string; type: string; data: unknown; isVisible: boolean; tr?: Partial<Record<Lang, unknown>> };
/** What can't come along into the new elements, by name (the admin says it in words). */
export type Dropped = "roseLook" | "look" | "layout" | "description" | "bio" | "socials" | "formFields" | "map" | "icons" | "pictures" | "links" | "extra";
/** How the rose design draws this section: as the home's opening, or in its own look. */
export type RoseRole = "opening" | "look";
export type Converted = { ok: true; node: N; dropped: Dropped[] } | { ok: false; why: "rose" | "html" | "video" | "nested" | "global" | "unknown" };

const LANGS: Lang[] = ["ar", "en", "he"];
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** A translation over the main words, as the shop puts them together (lists come whole). */
function merge(base: unknown, over: unknown): unknown {
  if (over === undefined || over === null) return base;
  if (base === undefined || base === null) return over;
  if (Array.isArray(base) || Array.isArray(over)) return Array.isArray(over) ? over : base;
  if (isObj(base) && isObj(over)) {
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(over)) if (v !== undefined) out[k] = merge(base[k], v);
    return out;
  }
  return over;
}

const NO_ODD = /^[^\s<>"'`\\]+$/;
/** A picture or clip the new elements take: the shop's own path or https. */
export const safeSrc = (v: unknown) => (typeof v === "string" && NO_ODD.test(v.trim()) && /^(\/(?!\/)|https:\/\/)/i.test(v.trim()) ? v.trim().slice(0, 1000) : null);
/** A link the new elements take: a page of the shop, an anchor, http(s), mail or phone. */
export const safeHref = (v: unknown) => (typeof v === "string" && NO_ODD.test(v.trim()) && /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(v.trim()) ? v.trim().slice(0, 500) : null);

/** Old HTML words as the new rich words ([b], [i], [u], [link=…]); every other tag dropped. */
export function htmlToRich(html: string): string {
  const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
  let s = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|ul|ol|blockquote|tr)\s*>/gi, "\n")
    .replace(/<\s*(strong|b)(\s[^>]*)?>/gi, "[b]").replace(/<\s*\/\s*(strong|b)\s*>/gi, "[/b]")
    .replace(/<\s*(em|i)(\s[^>]*)?>/gi, "[i]").replace(/<\s*\/\s*(em|i)\s*>/gi, "[/i]")
    .replace(/<\s*u(\s[^>]*)?>/gi, "[u]").replace(/<\s*\/\s*u\s*>/gi, "[/u]")
    .replace(/<\s*a\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi, (_, href: string) => (safeHref(decode(href)) ? `[link=${safeHref(decode(href))}]` : "[link-off]"))
    .replace(/<\s*\/\s*a\s*>/gi, "[/link]")
    .replace(/<[^>]*>/g, "");
  // A link that couldn't come along keeps its words.
  s = s.replace(/\[link-off\]([\s\S]*?)\[\/link\]/g, "$1").replace(/\[link-off\]/g, "");
  return decode(s).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** A section's words, each in the languages it has (the main one, and translations that differ). */
function reader(s: OldSection, main: Lang) {
  const data = isObj(s.data) ? s.data : {};
  const views: Array<[Lang, unknown]> = [[main, data]];
  for (const l of LANGS) if (l !== main && s.tr?.[l] !== undefined && s.tr?.[l] !== null) views.push([l, merge(data, s.tr[l])]);
  const at = (o: unknown, path: Array<string | number>) => path.reduce<unknown>((x, k) => (Array.isArray(x) ? x[k as number] : isObj(x) ? x[k as string] : undefined), o);
  return {
    data,
    /** The words at `path` in each language (none = null), cut to `max`. */
    words(path: Array<string | number>, max: number, html = false): Words | null {
      const out: Words = {};
      const first = str(at(data, path));
      for (const [l, v] of views) {
        const raw = str(at(v, path));
        const t = (html ? htmlToRich(raw) : raw).slice(0, max);
        if (t && (l === main || raw !== first)) out[l] = t;
      }
      return Object.keys(out).length ? out : null;
    },
    /** How many items a list has (the main language's). */
    count: (path: string[], max: number) => Math.min(max, list(at(data, path)).length),
    value: (path: Array<string | number>) => at(data, path),
  };
}
type Reader = ReturnType<typeof reader>;

/* ---------------------------------------------------------------- makers */

const node = (ids: Ids, prefix: string, type: string, props: S, style?: S, children?: N[]): N => ({ id: ids(prefix), type, props, ...(style ? { style: { base: style } } : {}), ...(children ? { children } : {}) });
const H = (ids: Ids, text: Words, level: number, style?: S) => node(ids, "h", "heading", { text, level }, style);
const P = (ids: Ids, text: Words, rich = false, style?: S) => node(ids, "t", "text", { text, ...(rich && Object.values(text).some((t) => t?.includes("[")) ? { rich: true } : {}) }, style);
const BTN = (ids: Ids, label: Words, href: string, variant: "solid" | "outline" | "link" = "solid") => node(ids, "b", "button", { label, href, variant });
const IMG = (ids: Ids, src: string, alt: Words | null, style: S = {}, href?: string | null) => node(ids, "img", "image", { src, ...(alt ? { alt } : {}), ...(href ? { href } : {}) }, { width: "100%", fit: "cover", radius: 16, ...style });
const STACK = (ids: Ids, children: N[], style: S = {}) => node(ids, "stk", "stack", {}, { direction: "column", gap: 12, ...style }, children);
const GRID = (ids: Ids, columns: number, children: N[]) => node(ids, "grid", "grid", {}, { columns: Math.max(1, Math.min(12, columns)), gap: 24 }, children);
const COLS = (ids: Ids, widths: number[], cells: N[][]) =>
  node(ids, "cols", "columns", { phone: "stack" }, { widths, gap: 40, align: "center" }, cells.map((kids) => node(ids, "cell", "cell", {}, { justify: "center" }, kids)));
const keep = <T,>(xs: Array<T | null | undefined | false | "">) => xs.filter(Boolean) as T[];

/** A title and a line under it, if the section has them. */
const head = (r: Reader, ids: Ids, center = true): N[] => {
  const title = r.words(["title"], 300);
  const sub = r.words(["subtitle"], 5000);
  if (!title && !sub) return [];
  return [STACK(ids, keep([title && H(ids, title, 2), sub && P(ids, sub)]), { gap: 10, margin: [0, 0, 32, 0], ...(center ? { align: "center", textAlign: "center" } : {}) })];
};
/** A button from a label and a link in the section, if both are there. */
const button = (r: Reader, ids: Ids, label: Array<string | number>, href: Array<string | number>, variant: "solid" | "outline" | "link" = "solid") => {
  const l = r.words(label, 120);
  const h = safeHref(r.value(href));
  return l && h ? BTN(ids, l, h, variant) : null;
};
const row = (ids: Ids, kids: N[], center = false) => (kids.length ? STACK(ids, kids, { direction: "row", gap: 12, wrap: true, align: "center", ...(center ? { justify: "center" } : {}) }) : null);
const BUILT_IN = new Set(["heart", "star", "truck", "shield", "gift", "phone", "whatsapp", "mail", "check", "sparkle", "bag", "return"]);
const ALIGN: Record<string, string> = { left: "start", right: "end", center: "center" };

/* -------------------------------------------------------------- each type */

function convertData(s: OldSection, r: Reader, ids: Ids, dropped: Set<Dropped>, main: Lang): N[] | Converted {
  const d = r.data;
  // Where a list item has no words of its own (the new element needs some).
  const dash: Words = { [main]: "—" };
  const cols = (fallback: number) => Math.max(1, Math.min(6, typeof d.columns === "number" ? d.columns : fallback));
  switch (s.type) {
    case "HERO": {
      if (Object.keys(d).some((k) => k.startsWith("rose"))) return { ok: false, why: "rose" };
      if (d.splitMode || d.tripleMode || d.themeId) dropped.add("layout");
      const slides = list(d.slides);
      if (slides.length) {
        const shown = slides.map((sl, i) => (isObj(sl) && safeSrc(sl.backgroundImageUrl) ? { i, src: safeSrc(sl.backgroundImageUrl)! } : null)).filter(Boolean) as Array<{ i: number; src: string }>;
        if (shown.length < slides.length) dropped.add("pictures");
        if (shown.length) {
          return [
            node(ids, "sld", "slider", {
              slides: shown.slice(0, 12).map(({ i, src }) => ({ src, kind: "image", ...(r.words(["slides", i, "title"], 200) ? { caption: r.words(["slides", i, "title"], 200) } : {}), ...(safeHref(r.value(["slides", i, "primaryButton", "href"])) ? { href: safeHref(r.value(["slides", i, "primaryButton", "href"])) } : {}) })),
              loop: true, arrows: true, dots: true, autoplay: typeof d.autoplayMs === "number" && d.autoplayMs >= 2000 ? Math.min(30, Math.round(d.autoplayMs / 1000)) : undefined, aspect: "21 / 9",
            }),
          ];
        }
      }
      const title = r.words(["title"], 300);
      const sub = r.words(["subtitle"], 5000);
      const align = ALIGN[str(d.align)] ?? "center";
      const onPicture = safeSrc(d.backgroundImageUrl) ? { color: "white" } : {};
      const words = STACK(ids, keep([title && H(ids, title, 1, onPicture), sub && P(ids, sub, false, onPicture), row(ids, keep([button(r, ids, ["primaryButton", "label"], ["primaryButton", "href"]), button(r, ids, ["secondaryButton", "label"], ["secondaryButton", "href"], "outline")]), align === "center")]), { gap: 16, align, textAlign: align });
      const bg = safeSrc(d.backgroundImageUrl);
      if (!bg) return [words];
      const overlay = typeof d.overlay === "number" ? Math.max(0, Math.min(1, d.overlay)) : 0.35;
      return [
        IMG(ids, bg, title, { height: "80vh", radius: 0, overlay: { color: "#000000", opacity: overlay } }),
        { ...words, style: { base: { ...(words.style?.base as S), width: "90%", maxWidth: "820px", layer: { x: 50, y: 50, anchor: "center" }, z: 2 } } },
      ];
    }
    case "RICH_TEXT": {
      const text = r.words(["html"], 5000, true);
      return keep([...head(r, ids, false), text && P(ids, text, true)]);
    }
    case "CUSTOM_HTML":
      return { ok: false, why: "html" };
    case "GRID":
    case "CARDS": {
      if (list(d.blocks).length) return { ok: false, why: "nested" };
      const key = s.type === "CARDS" ? "cards" : "items";
      const n = r.count([key], 48);
      const cards = Array.from({ length: n }, (_, i) => {
        const img = safeSrc(r.value([key, i, "imageUrl"]));
        if (r.value([key, i, "imageUrl"]) && !img) dropped.add("pictures");
        const badge = r.words([key, i, "badge"], 200);
        const title = r.words([key, i, "title"], 300);
        const text = r.words([key, i, "text"], 5000);
        const go = s.type === "CARDS" ? button(r, ids, [key, i, "buttonLabel"], [key, i, "buttonHref"], "link") : safeHref(r.value([key, i, "href"])) && title ? BTN(ids, { ...title }, safeHref(r.value([key, i, "href"]))!, "link") : null;
        return STACK(ids, keep([img && IMG(ids, img, title, { aspect: "4 / 3" }), badge && P(ids, badge, false, { size: 13, weight: 700, color: "accent" }), title && H(ids, title, 3, { size: 22 }), text && P(ids, text), go]), { gap: 10 });
      });
      return [...head(r, ids), GRID(ids, s.type === "CARDS" ? Math.min(3, Math.max(1, n)) : cols(3), cards)];
    }
    case "FEATURES": {
      const n = r.count(["items"], 48);
      const items = Array.from({ length: n }, (_, i) => {
        const icon = str(r.value(["items", i, "icon"]));
        const iconUrl = safeSrc(r.value(["items", i, "iconUrl"]));
        if (icon && !BUILT_IN.has(icon) && !iconUrl) dropped.add("icons");
        const title = r.words(["items", i, "title"], 300);
        const text = r.words(["items", i, "text"], 5000);
        const href = safeHref(r.value(["items", i, "href"]));
        return STACK(ids, keep([
          BUILT_IN.has(icon) ? node(ids, "ic", "icon", { name: icon }, { iconSize: 36, color: "accent" }) : iconUrl ? IMG(ids, iconUrl, null, { width: "48px", aspect: "1 / 1", fit: "contain", radius: 0 }) : null,
          title && H(ids, title, 4, { size: 20 }), text && P(ids, text), href && title ? BTN(ids, { ...title }, href, "link") : null,
        ]), { gap: 10 });
      });
      return [...head(r, ids), GRID(ids, cols(3), items)];
    }
    case "STATS": {
      const n = r.count(["items"], 24);
      const items = Array.from({ length: n }, (_, i) => {
        const value = r.words(["items", i, "value"], 300);
        const label = r.words(["items", i, "label"], 5000);
        const sub = r.words(["items", i, "subtext"], 5000);
        return STACK(ids, keep([value && H(ids, value, 3, { size: 44, color: "accent" }), label && P(ids, label, false, { weight: 600 }), sub && P(ids, sub, false, { color: "muted", size: 14 })]), { gap: 4, align: "center", textAlign: "center" });
      });
      if (list(d.items).some((it) => isObj(it) && it.icon)) dropped.add("icons");
      return [...head(r, ids), GRID(ids, cols(3), items)];
    }
    case "TEAM": {
      const n = r.count(["members"], 24);
      if (list(d.members).some((m) => isObj(m) && str(m.bio))) dropped.add("bio");
      if (list(d.members).some((m) => isObj(m) && list(m.socials).length > 1)) dropped.add("socials");
      const items = Array.from({ length: n }, (_, i) => {
        const photo = safeSrc(r.value(["members", i, "avatarUrl"]));
        const href = safeHref(r.value(["members", i, "socials", 0, "href"]));
        return { name: r.words(["members", i, "name"], 80) ?? dash, ...(r.words(["members", i, "role"], 80) ? { role: r.words(["members", i, "role"], 80) } : {}), ...(photo ? { photo } : {}), ...(href ? { href } : {}) };
      });
      return [...head(r, ids), node(ids, "team", "team", { items, columns: cols(3) })];
    }
    case "PRICING": {
      const n = r.count(["plans"], 6);
      if (list(d.plans).some((p) => isObj(p) && str(p.description))) dropped.add("description");
      if (list(d.plans).length > 6) dropped.add("extra");
      const items = Array.from({ length: n }, (_, i) => {
        const featureWords: Words = {};
        for (const l of LANGS) {
          const lines = Array.from({ length: 30 }, (_, j) => r.words(["plans", i, "features", j], 300)?.[l] ?? null).filter(Boolean);
          if (lines.length) featureWords[l] = lines.join("\n").slice(0, 1500);
        }
        const href = safeHref(r.value(["plans", i, "ctaHref"]));
        return {
          name: r.words(["plans", i, "name"], 60) ?? dash,
          price: r.words(["plans", i, "price"], 40) ?? dash,
          ...(r.words(["plans", i, "period"], 40) ? { period: r.words(["plans", i, "period"], 40) } : {}),
          ...(Object.keys(featureWords).length ? { features: featureWords } : {}),
          ...(r.words(["plans", i, "badge"], 40) ? { badge: r.words(["plans", i, "badge"], 40) } : {}),
          ...(r.value(["plans", i, "highlight"]) === true ? { featured: true } : {}),
          ...(r.words(["plans", i, "ctaLabel"], 40) ? { cta: r.words(["plans", i, "ctaLabel"], 40) } : {}),
          ...(href ? { href } : {}),
        };
      });
      return [...head(r, ids), node(ids, "pr", "pricing", { items })];
    }
    case "CONTACT": {
      const n = r.count(["items"], 20);
      const lines = Array.from({ length: n }, (_, i) => {
        const label = r.words(["items", i, "label"], 300);
        const value = r.words(["items", i, "value"], 120);
        const href = safeHref(r.value(["items", i, "href"]));
        return STACK(ids, keep([label && P(ids, label, false, { size: 13, color: "muted" }), value && (href ? BTN(ids, value, href, "link") : P(ids, value, false, { weight: 600 }))]), { gap: 2 });
      });
      const form = isObj(d.form);
      if (form && list((d.form as S).fields).length) dropped.add("formFields");
      const embed = str(d.mapEmbedUrl);
      const q = /[?&]q=([^&]+)/.exec(embed)?.[1];
      const query = q ? decodeURIComponent(q.replace(/\+/g, " ")).slice(0, 200) : "";
      if (embed && query.length < 2) dropped.add("map");
      const right = keep([form ? node(ids, "form", "form", { kind: "contact", ...(r.words(["form", "title"], 160) ? { title: r.words(["form", "title"], 160) } : {}) }) : null, query.length >= 2 ? node(ids, "map", "map", { query, zoom: 14 }) : null]);
      return [...head(r, ids), right.length ? COLS(ids, [1, 1], [lines, right]) : STACK(ids, lines, { gap: 16 })];
    }
    case "BANNER": {
      const text = r.words(["text"], 600) ?? dash;
      const kind = ["info", "success", "warning", "danger"].includes(str(d.variant)) ? str(d.variant) : "info";
      return keep([node(ids, "al", "alert", { text, kind }), button(r, ids, ["linkLabel"], ["linkHref"], "link")]);
    }
    case "FEATURED_CATEGORIES":
    case "COLLECTIONS_GRID": {
      const n = r.count(["items"], 24);
      if (!n) return [...head(r, ids), node(ids, "cat", "categories", { limit: 6, ...(s.type === "FEATURED_CATEGORIES" ? { look: "circle" } : {}) })];
      const tiles = Array.from({ length: n }, (_, i) => {
        const href = safeHref(r.value(["items", i, "href"]));
        const img = safeSrc(r.value(["items", i, "imageUrl"]));
        const label = r.words(["items", i, "label"], 120);
        return STACK(ids, keep([img && IMG(ids, img, label, { aspect: s.type === "FEATURED_CATEGORIES" ? "1 / 1" : "3 / 4", ...(s.type === "FEATURED_CATEGORIES" ? { shape: "circle", radius: 0 } : {}) }, href), label && (href ? BTN(ids, label, href, "link") : P(ids, label, false, { weight: 600 }))]), { gap: 8, align: "center", textAlign: "center" });
      });
      return [...head(r, ids), GRID(ids, s.type === "FEATURED_CATEGORIES" ? Math.min(6, n) : cols(4), tiles)];
    }
    case "NEW_ARRIVALS_SLIDER":
    case "BEST_SELLERS_SLIDER": {
      const title = r.words(["title"], 160);
      return [node(ids, "prod", "products", { source: s.type === "NEW_ARRIVALS_SLIDER" ? "new" : "best", limit: Math.max(1, Math.min(48, typeof d.limit === "number" ? d.limit : 12)), layout: "row", ...(title ? { title } : {}) })];
    }
    case "FEATURED_PRODUCTS": {
      const title = r.words(["title"], 160);
      const picked = list(d.productIds).map(str).filter((x) => /^[A-Za-z0-9_-]{1,64}$/.test(x)).slice(0, 48);
      return [node(ids, "prod", "products", picked.length ? { source: "picked", productIds: picked, limit: picked.length, layout: "grid", columns: cols(4), ...(title ? { title } : {}) } : { source: "new", limit: 8, layout: "grid", ...(title ? { title } : {}) })];
    }
    case "BRANDS_SLIDER": {
      const n = r.count(["items"], 40);
      const logos = Array.from({ length: n }, (_, i) => {
        const src = safeSrc(r.value(["items", i, "logoUrl"]));
        const href = safeHref(r.value(["items", i, "href"]));
        const alt = r.words(["items", i, "name"], 80);
        return src ? { src, ...(alt ? { alt } : {}), ...(href ? { href } : {}) } : null;
      }).filter(Boolean);
      if (logos.length) return [...head(r, ids), node(ids, "logo", "logos", { items: logos, gray: true, moving: true })];
      const names = Array.from({ length: Math.min(20, n) }, (_, i) => r.words(["items", i, "name"], 200)).filter(Boolean);
      return names.length ? [...head(r, ids), node(ids, "mq", "marquee", { items: names, speed: 30, pause: true, separator: "✦" })] : head(r, ids);
    }
    case "NEWSLETTER": {
      const title = r.words(["title"], 300);
      const text = r.words(["text"], 5000);
      return [STACK(ids, keep([title && H(ids, title, 2), text && P(ids, text), node(ids, "form", "form", { kind: "newsletter" }), button(r, ids, ["ctaLabel"], ["ctaHref"], "link")]), { gap: 14, align: "center", textAlign: "center" })];
    }
    case "IMAGE_GALLERY": {
      const n = r.count(["images"], 48);
      const imgs = Array.from({ length: n }, (_, i) => {
        const src = safeSrc(r.value(["images", i, "url"]));
        if (!src) dropped.add("pictures");
        return src ? IMG(ids, src, r.words(["images", i, "alt"], 200), { aspect: "1 / 1" }) : null;
      });
      return [...head(r, ids), GRID(ids, Math.max(1, Math.min(12, typeof d.columns === "number" ? d.columns : 3)), keep(imgs))];
    }
    case "FAQ": {
      const n = r.count(["items"], 30);
      const items = Array.from({ length: n }, (_, i) => ({ q: r.words(["items", i, "question"], 200) ?? dash, a: r.words(["items", i, "answer"], 3000, true) ?? dash }));
      return [...head(r, ids), node(ids, "acc", "accordion", { items, look: "lines" })];
    }
    case "TESTIMONIALS": {
      const n = r.count(["items"], 24);
      const items = Array.from({ length: n }, (_, i) => {
        const photo = safeSrc(r.value(["items", i, "avatarUrl"]));
        return { quote: r.words(["items", i, "quote"], 800) ?? dash, name: r.words(["items", i, "name"], 80) ?? dash, ...(r.words(["items", i, "role"], 80) ? { role: r.words(["items", i, "role"], 80) } : {}), ...(photo ? { photo } : {}) };
      });
      return [...head(r, ids), node(ids, "tst", "testimonials", { items, layout: "grid" })];
    }
    case "CTA": {
      const title = r.words(["title"], 300);
      const sub = r.words(["subtitle"], 5000);
      const img = safeSrc(d.imageUrl);
      const align = img ? "start" : ALIGN[str(d.align)] ?? "center";
      const words = STACK(ids, keep([title && H(ids, title, 2), sub && P(ids, sub), row(ids, keep([button(r, ids, ["buttonLabel"], ["buttonHref"])]), align === "center")]), { gap: 14, align, textAlign: align });
      return img ? [COLS(ids, [1, 1], [[words], [IMG(ids, img, title, { aspect: "4 / 3" })]])] : [words];
    }
    case "VIDEO": {
      const url = safeSrc(d.url);
      const provider = str(d.provider);
      const mp4 = url && (provider === "MP4" || (provider !== "YOUTUBE" && provider !== "VIMEO" && provider !== "HLS" && /\.(mp4|webm)([?#]|$)/i.test(url)));
      if (!mp4) return { ok: false, why: "video" };
      const poster = safeSrc(d.posterUrl);
      return [...head(r, ids), node(ids, "vid", "video", { src: url, ...(poster ? { poster } : {}), autoplay: d.autoplay === true, muted: d.muted !== false, loop: d.loop === true, controls: d.controls !== false }, { width: "100%", radius: 16 })];
    }
    case "GLOBAL_ANNOUNCEMENT":
    case "GLOBAL_HEADER":
    case "GLOBAL_FOOTER":
      return { ok: false, why: "global" };
    default:
      return { ok: false, why: "unknown" };
  }
}

/** What each old kind is called, for the new section's name when it has no title. */
const KIND_NAMES: Record<string, [string, string, string]> = {
  HERO: ["افتتاحية", "Opening", "פתיח"], RICH_TEXT: ["نص", "Text", "טקסט"], GRID: ["شبكة", "Grid", "רשת"], CARDS: ["كروت", "Cards", "כרטיסים"],
  FEATURES: ["مميزات", "Perks", "יתרונות"], STATS: ["أرقام", "Numbers", "מספרים"], TEAM: ["الفريق", "Team", "צוות"], PRICING: ["باقات", "Plans", "חבילות"],
  CONTACT: ["تواصل", "Contact", "יצירת קשר"], BANNER: ["شريط", "Banner", "באנר"], FEATURED_CATEGORIES: ["أقسام", "Categories", "קטגוריות"],
  COLLECTIONS_GRID: ["مجموعات", "Collections", "קולקציות"], NEW_ARRIVALS_SLIDER: ["وصل جديد", "New in", "חדש"], BEST_SELLERS_SLIDER: ["الأكثر مبيعاً", "Best sellers", "רבי מכר"],
  FEATURED_PRODUCTS: ["منتجات مختارة", "Picked products", "מוצרים נבחרים"], BRANDS_SLIDER: ["ماركات", "Brands", "מותגים"], NEWSLETTER: ["النشرة", "Newsletter", "ניוזלטר"],
  IMAGE_GALLERY: ["معرض صور", "Gallery", "גלריה"], FAQ: ["أسئلة", "Questions", "שאלות"], TESTIMONIALS: ["آراء", "Reviews", "ביקורות"], CTA: ["دعوة", "Call to action", "קריאה לפעולה"], VIDEO: ["فيديو", "Video", "וידאו"],
};

/** An old section as a new section of its own, or why it stays as it is. */
export function convertSection(s: OldSection, main: Lang, ids: Ids, rose?: RoseRole): Converted {
  if (rose === "opening") return { ok: false, why: "rose" };
  const r = reader(s, main);
  const dropped = new Set<Dropped>(rose === "look" ? ["roseLook"] : []);
  const out = convertData(s, r, ids, dropped, main);
  if (!Array.isArray(out)) return out;
  const ui = isObj(r.data.ui) ? r.data.ui : {};
  if (Object.values(ui).some((v) => typeof v === "string" && v.trim())) dropped.add("look");
  const cover = s.type === "HERO" && out.some((n) => n.type === "image" && (n.style?.base as S | undefined)?.height === "80vh");
  const slider = out.length === 1 && out[0].type === "slider";
  const section: N = {
    id: ids("sec"),
    type: "section",
    name: (str(r.data.title) || (KIND_NAMES[s.type] ?? [s.type, s.type, s.type])[LANGS.indexOf(main)]).slice(0, 80),
    props: { contained: !cover && !slider },
    style: { base: { pad: cover || slider ? [0, 0, 0, 0] : s.type === "BANNER" ? [16, 24, 16, 24] : [72, 24, 72, 24], ...(s.isVisible ? {} : { hidden: true }) }, mobile: { pad: cover || slider ? [0, 0, 0, 0] : [48, 16, 48, 16] } },
    children: out,
  };
  return { ok: true, node: section, dropped: [...dropped] };
}

/** Whether an old section can come along, and what it leaves behind (built with throwaway ids). */
export function convertPreview(s: OldSection, main: Lang, rose?: RoseRole): Converted {
  let n = 0;
  return convertSection(s, main, (p) => `${p}-${n++}`, rose);
}
