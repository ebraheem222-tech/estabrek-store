/**
 * The shop's story circles (admin → القصص; the backend's lib/stories.ts) as the story bar draws them: the API's reels
 * with their words in the page's language, each slide's button (its product's page, or the owner's own link) and the
 * products' pictures. Used on the server (TreeNodeView, with the page's links) and in the browser when a bar is drawn
 * where the page didn't fetch them (StoryBar.tsx). No DOM and no "@/" imports, so tests load this file directly.
 */
export type StoryWordsRaw = Partial<Record<"ar" | "en" | "he", string>>;
export type StorySlideRaw = {
  id: string; kind: "image" | "video"; src: string; poster?: string; caption?: StoryWordsRaw; seconds?: number;
  productId?: string; href?: string; label?: StoryWordsRaw;
};
export type StoryReelRaw = { id: string; title: StoryWordsRaw; cover: string | null; slides: StorySlideRaw[]; endsAt: string | null; updatedAt: string | null };
/** A product a slide points at, as the bar shows it. */
export type StoryProduct = { slug: string; title: string; image: string | null };

export type StorySlideView = {
  id: string; kind: "image" | "video"; src: string; poster: string | null; caption: string; seconds: number;
  /** Its button: where it goes, its words, and the product's picture and name when it's one. */
  link: { href: string; label: string; product: { title: string; image: string | null } | null } | null;
};
export type StoryReelView = { id: string; title: string; cover: string | null; slides: StorySlideView[]; endsAt: string | null; version: string };

export const STORY_SECONDS = { image: 5, min: 2, max: 30, video: 60 } as const;
const NO_ODD = /^[^\s<>"'`\\]+$/;
const safeSrc = (v: unknown) => (typeof v === "string" && v.length <= 1000 && NO_ODD.test(v) && /^(\/(?!\/)|https:\/\/)/i.test(v) ? v : null);
const safeHref = (v: unknown) => (typeof v === "string" && v.length <= 500 && NO_ODD.test(v) && /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(v) ? v : null);

/** The API's answer, read with care: unknown or unsafe parts drop out. */
export function storyReelsOf(raw: unknown): StoryReelRaw[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { reels?: unknown }).reels) ? (raw as { reels: unknown[] }).reels : [];
  const out: StoryReelRaw[] = [];
  for (const r of list.slice(0, 40)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || !/^[\w-]{1,64}$/.test(o.id)) continue;
    const slides = (Array.isArray(o.slides) ? o.slides : []).slice(0, 20).flatMap((s): StorySlideRaw[] => {
      if (!s || typeof s !== "object") return [];
      const x = s as Record<string, unknown>;
      const src = safeSrc(x.src);
      if (!src || (x.kind !== "image" && x.kind !== "video") || typeof x.id !== "string") return [];
      return [{
        id: x.id.slice(0, 40), kind: x.kind, src, ...(safeSrc(x.poster) ? { poster: safeSrc(x.poster)! } : {}),
        ...(x.caption && typeof x.caption === "object" ? { caption: x.caption as StoryWordsRaw } : {}),
        ...(typeof x.seconds === "number" ? { seconds: x.seconds } : {}),
        ...(typeof x.productId === "string" && /^[\w-]{1,64}$/.test(x.productId) ? { productId: x.productId } : {}),
        ...(safeHref(x.href) ? { href: safeHref(x.href)! } : {}),
        ...(x.label && typeof x.label === "object" ? { label: x.label as StoryWordsRaw } : {}),
      }];
    });
    if (!slides.length) continue;
    out.push({ id: o.id, title: o.title && typeof o.title === "object" ? (o.title as StoryWordsRaw) : {}, cover: safeSrc(o.cover), slides, endsAt: typeof o.endsAt === "string" ? o.endsAt : null, updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : null });
  }
  return out;
}

/** The products the reels point at, once each. */
export function storyProductIds(reels: StoryReelRaw[]): string[] {
  return [...new Set(reels.flatMap((r) => r.slides.map((s) => s.productId).filter((id): id is string => Boolean(id))))].slice(0, 100);
}

/** Words in the page's language, else its main one, else any. */
export function storyWords(w: StoryWordsRaw | undefined, lang: string, main: string): string {
  if (!w) return "";
  const m = w as Record<string, string | undefined>;
  return (m[lang] || m[main] || w.ar || w.en || w.he || "").trim();
}

/**
 * The reels as the bar draws them: only `only` (their ids, in that order) when given, else all in the owner's order;
 * one ended by `now` left out. `link` makes a shop path the page's own (its language prefix); `shopThis` is the
 * button's words for a product with no words of the owner's.
 */
export function storyViews(
  reels: StoryReelRaw[], products: Record<string, StoryProduct>,
  opts: { lang: string; main: string; link: (path: string) => string | null; shopThis: string; only?: string[]; now?: number },
): StoryReelView[] {
  const now = opts.now ?? Date.now();
  const byId = new Map(reels.map((r) => [r.id, r]));
  const chosen = opts.only?.length ? opts.only.map((id) => byId.get(id)).filter((r): r is StoryReelRaw => Boolean(r)) : reels;
  return chosen
    .filter((r) => !r.endsAt || Date.parse(r.endsAt) > now)
    .map((r) => {
      const slides = r.slides.map((s): StorySlideView => {
        const product = s.productId ? products[s.productId] : undefined;
        const own = s.href ? opts.link(s.href) : null;
        const to = product ? opts.link(`/p/${encodeURIComponent(product.slug)}`) : own;
        const label = storyWords(s.label, opts.lang, opts.main);
        const seconds = typeof s.seconds === "number" ? Math.min(STORY_SECONDS.max, Math.max(STORY_SECONDS.min, Math.round(s.seconds))) : STORY_SECONDS.image;
        return {
          id: s.id, kind: s.kind, src: s.src, poster: s.poster ?? null, caption: storyWords(s.caption, opts.lang, opts.main), seconds,
          link: to ? { href: to, label: label || (product ? opts.shopThis : to), product: product ? { title: product.title, image: product.image } : null } : null,
        };
      });
      const first = slides[0];
      return { id: r.id, title: storyWords(r.title, opts.lang, opts.main), cover: r.cover ?? (first.kind === "image" ? first.src : first.poster), slides, endsAt: r.endsAt, version: r.updatedAt ?? "" };
    })
    .filter((r) => r.slides.length > 0);
}

/** Which reels this browser has seen to their end (id → the version seen): a changed reel counts as new again. */
export function unseenFirst(reels: StoryReelView[], seen: Record<string, string>): StoryReelView[] {
  const isSeen = (r: StoryReelView) => seen[r.id] !== undefined && seen[r.id] === r.version;
  return [...reels.filter((r) => !isSeen(r)), ...reels.filter(isSeen)];
}
