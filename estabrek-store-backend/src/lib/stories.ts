/**
 * Story circles on the shop (admin → القصص, the page editor's «شريط القصص»): each a reel of pictures and clips shown
 * full screen one after another, each slide able to point at a product or a link. What the admin sends is checked here
 * (StoryReelInput), and what the shop gets is the active reels inside their times, in the owner's order (shopReels).
 * No database here: the routes read and write (modules/admin/stories.controller.ts, modules/storefront/stories.routes.ts).
 */
import { z } from "zod";

export const STORY_LIMITS = { reels: 40, slides: 20, seconds: { min: 2, max: 30, image: 5 } } as const;
export const STORY_LANGS = ["ar", "en", "he"] as const;
type Lang = (typeof STORY_LANGS)[number];
export type StoryWords = Partial<Record<Lang, string>>;

const NO_ODD = /^[^\s<>"'`\\]+$/;
/** Words in the three languages; empty ones drop out. */
const words = (max: number) =>
  z.object({ ar: z.string().max(max).optional(), en: z.string().max(max).optional(), he: z.string().max(max).optional() })
    .transform((t) => {
      const out: StoryWords = {};
      for (const l of STORY_LANGS) {
        const v = t[l]?.trim();
        if (v) out[l] = v;
      }
      return out;
    });
/** A picture or a clip: a path on the shop or an https address. */
const src = z.string().trim().max(1000).refine((v) => NO_ODD.test(v) && /^(\/(?!\/)|https:\/\/)/i.test(v), "Not a safe file address");
/** A link: a page of the shop, https/http, mail or phone (never javascript: or data:). */
const href = z.string().trim().max(500).refine((v) => NO_ODD.test(v) && /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(v), "Not a safe link");
const SLIDE_ID = /^[A-Za-z0-9_-]{1,40}$/;

export const StorySlide = z.object({
  id: z.string().regex(SLIDE_ID, "An id is 1–40 letters, digits, - or _"),
  kind: z.enum(["image", "video"]),
  src,
  /** A clip's first picture, shown while it loads. */
  poster: src.optional(),
  caption: words(200).optional(),
  /** How long a picture stays (a clip plays to its end, at most the most seconds). */
  seconds: z.number().int().min(STORY_LIMITS.seconds.min).max(STORY_LIMITS.seconds.max).optional(),
  /** The product its button opens (its own page in the shop). */
  productId: z.string().trim().regex(/^[\w-]{1,64}$/).optional(),
  /** Or a link of the owner's own, with its button's words. */
  href: href.optional(),
  label: words(40).optional(),
});
export type StorySlideT = z.output<typeof StorySlide>;

const moment = z.string().datetime({ offset: true }).nullable().optional();

/** A reel as the admin sends it (a new one, or a whole one changed). */
export const StoryReelInput = z.object({
  title: words(40),
  cover: src.nullable().optional(),
  slides: z.array(StorySlide).max(STORY_LIMITS.slides).refine((list) => new Set(list.map((s) => s.id)).size === list.length, "Two slides with one id"),
  isActive: z.boolean().optional(),
  startsAt: moment,
  endsAt: moment,
}).refine((r) => !r.startsAt || !r.endsAt || Date.parse(r.startsAt) < Date.parse(r.endsAt), { message: "It ends before it starts", path: ["endsAt"] });
export type StoryReelInputT = z.output<typeof StoryReelInput>;

/** The owner's new order: every reel's id once. */
export const StoryOrderInput = z.object({ ids: z.array(z.string().regex(/^[\w-]{1,64}$/)).min(1).max(STORY_LIMITS.reels) })
  .refine((o) => new Set(o.ids).size === o.ids.length, "An id twice");

/** What a shopper's browser may tell about a reel: it was opened, or its product or link was pressed. */
export const STORY_EVENTS = ["view", "tap"] as const;

/** A reel as kept (the database's row, its JSON read as it is). */
export type StoryReelRow = {
  id: string; title: unknown; cover: string | null; slides: unknown; order: number; isActive: boolean;
  startsAt: Date | null; endsAt: Date | null; updatedAt?: Date;
};

/** A kept reel's slides, each checked again (one that no longer passes drops out). */
export function slidesOf(raw: unknown): StorySlideT[] {
  if (!Array.isArray(raw)) return [];
  const out: StorySlideT[] = [];
  for (const s of raw.slice(0, STORY_LIMITS.slides)) {
    const r = StorySlide.safeParse(s);
    if (r.success) out.push(r.data);
  }
  return out;
}
/** Kept words, checked again. */
export function wordsOf(raw: unknown, max = 200): StoryWords {
  const r = words(max).safeParse(raw ?? {});
  return r.success ? r.data : {};
}

/** Whether a reel is shown at `now`: switched on, inside its times, with a slide at least. */
export function reelLive(r: Pick<StoryReelRow, "isActive" | "startsAt" | "endsAt" | "slides">, now = Date.now()): boolean {
  if (!r.isActive) return false;
  if (r.startsAt && r.startsAt.getTime() > now) return false;
  if (r.endsAt && r.endsAt.getTime() <= now) return false;
  return slidesOf(r.slides).length > 0;
}

export type ShopReel = {
  id: string;
  title: StoryWords;
  cover: string | null;
  slides: StorySlideT[];
  /** Until when it shows (the shop leaves it out after, between two refreshes of its cache). */
  endsAt: string | null;
  updatedAt: string | null;
};

/** The reels the shop shows: live ones, in the owner's order (the circle's picture: its own, else the first slide's). */
export function shopReels(rows: StoryReelRow[], now = Date.now()): ShopReel[] {
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .filter((r) => reelLive(r, now))
    .slice(0, STORY_LIMITS.reels)
    .map((r) => {
      const slides = slidesOf(r.slides);
      const first = slides[0];
      return {
        id: r.id,
        title: wordsOf(r.title, 40),
        cover: r.cover ?? (first.kind === "image" ? first.src : first.poster ?? null),
        slides,
        endsAt: r.endsAt ? r.endsAt.toISOString() : null,
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      };
    });
}

/** The products the shop's reels point at (fetched with them). */
export function reelProductIds(reels: Array<{ slides: StorySlideT[] }>): string[] {
  return [...new Set(reels.flatMap((r) => r.slides.map((s) => s.productId).filter((id): id is string => Boolean(id))))].slice(0, 100);
}
