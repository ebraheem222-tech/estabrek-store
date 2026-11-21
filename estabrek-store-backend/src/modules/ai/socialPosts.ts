/**
 * «منشورات السوشال» (the AI switch socialPosts): posts for a product, a few products or an offer, and a
 * week's plan made of the shop's own pieces. Pure: what the model is asked and what is kept of its
 * answer, held to each platform's own limits (length, how many hashtags, whether a link works there).
 */
import type { AiPrompt } from "./ai.client.js";
import type { ContentLang } from "../../lib/translations.js";

export const PLATFORMS = ["instagram", "facebook", "tiktok", "whatsapp", "x"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const POST_TONES = ["friendly", "luxury", "playful", "offer", "informative"] as const;
export type PostTone = (typeof POST_TONES)[number];

/** Each platform's own rules: the longest caption, how many hashtags suit it, and whether a link in the text works. */
export const PLATFORM_RULES: Record<Platform, { chars: number; tags: number; link: boolean; name: string }> = {
  instagram: { chars: 2200, tags: 12, link: false, name: "Instagram (feed post)" },
  facebook: { chars: 1200, tags: 3, link: true, name: "Facebook" },
  tiktok: { chars: 2200, tags: 5, link: false, name: "TikTok (video caption)" },
  whatsapp: { chars: 700, tags: 0, link: true, name: "WhatsApp status / broadcast" },
  x: { chars: 280, tags: 2, link: true, name: "X (Twitter)" },
};
/** X counts any link as 23 characters. */
const X_LINK = 23;

const TONE: Record<PostTone, string> = {
  friendly: "friendly and warm",
  luxury: "refined and elegant, few emojis",
  playful: "playful and fun",
  offer: "an exciting offer with a clear, honest sense of urgency (never invent a deadline or a discount)",
  informative: "clear and informative: what it is, what it's made for, why it's good",
};
const LANG: Record<ContentLang, string> = { ar: "Arabic (warm, natural, the way shops in the region post)", en: "English", he: "Hebrew" };

export type PostProduct = { id: string; title: string; price: number | null; was?: number | null; category?: string | null; colors: string[]; about?: string | null; url: string | null };

export type SocialInput = {
  lang: ContentLang;
  platforms: Platform[];
  tone: PostTone;
  emojis: boolean;
  products: PostProduct[];
  /** The owner's own words about the offer or the occasion ("20% off all abayas till Friday"). */
  offer?: string | null;
  store: { brief: string; name: string; currency: string };
  addressing?: string;
};

export type Post = {
  platform: Platform;
  caption: string;
  hashtags: string[];
  /** What the post asks the reader to do ("order on WhatsApp", "link in bio"). */
  cta: string;
  /** What the picture or video could show. */
  idea: string;
  /** Caption, call, link (where links work) and hashtags, ready to paste, within the platform's limit. */
  text: string;
};

const one = (s: unknown, n: number) => String(s ?? "").replace(/[ \t]+/g, " ").trim().slice(0, n);
const lines = (s: unknown, n: number) =>
  String(s ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, n);

function productLine(p: PostProduct, currency: string) {
  const price = p.price == null ? "" : p.was && p.was > p.price ? `${p.price} ${currency} (was ${p.was})` : `${p.price} ${currency}`;
  return [`id=${p.id}`, one(p.title, 90), price, p.category ? `category: ${one(p.category, 40)}` : "", p.colors.length ? `colours: ${p.colors.slice(0, 6).join("/")}` : "", p.about ? `about: ${one(p.about, 280)}` : ""]
    .filter(Boolean)
    .join(" | ");
}

function systemFor(input: Pick<SocialInput, "lang" | "tone" | "emojis" | "store" | "addressing">) {
  return [
    `You write social media posts for an online shop, «${one(input.store.name, 60)}». ${input.store.brief}`,
    `Write in ${LANG[input.lang]}${input.lang === "en" ? "" : input.addressing ?? ""}. The tone is ${TONE[input.tone]}.`,
    input.emojis ? "Use a few fitting emojis." : "Use no emojis.",
    "Use only the facts given (names, prices, colours, the owner's offer): never invent prices, discounts, deadlines, materials or sizes.",
    "Each platform has its own style: Instagram a hook line then a short story, TikTok a punchy hook for a video, Facebook a friendly paragraph, WhatsApp a short personal message, X one sharp line.",
    "Hashtags: real, relevant ones in the post's language and English, no spaces inside, without the # sign repeated.",
    "Reply with JSON only.",
  ].join(" ");
}

export function socialPrompt(input: SocialInput): AiPrompt {
  const rules = input.platforms.map((p) => `- ${p}: ${PLATFORM_RULES[p].name}; caption at most ${captionRoom(p)} characters; ${PLATFORM_RULES[p].tags ? `up to ${PLATFORM_RULES[p].tags} hashtags` : "no hashtags"}`).join("\n");
  const user = [
    input.products.length ? `The pieces:\n${input.products.map((p) => `- ${productLine(p, input.store.currency)}`).join("\n")}` : "",
    input.offer ? `The owner's offer or occasion: «${one(input.offer, 300)}»` : "",
    `Platforms:\n${rules}`,
    `JSON: {"posts": [{"platform": one of the platforms, "caption": the post's words (no hashtags and no links inside), "hashtags": ["word", ...], "cta": a short call to action, "idea": what the photo or video should show, in one short sentence}]} — exactly 2 different posts for each platform.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system: systemFor(input), user, maxTokens: 400 + 450 * input.platforms.length };
}

/** Room for the caption itself once the call, the link and the hashtags are added. */
function captionRoom(p: Platform) {
  const r = PLATFORM_RULES[p];
  return p === "x" ? r.chars - X_LINK - 2 - 40 : Math.min(r.chars - 200, p === "whatsapp" ? 500 : 900);
}

export function cleanTags(raw: unknown, max: number): string[] {
  const out: string[] = [];
  for (const t of Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\s,]+/) : []) {
    if (out.length >= max) break;
    const tag = String(t ?? "")
      .replace(/^#+/, "")
      .replace(/[^\p{L}\p{N}_]/gu, "")
      .slice(0, 40);
    if (tag.length >= 2 && !out.some((x) => x.toLowerCase() === tag.toLowerCase())) out.push(tag);
  }
  return out.map((t) => `#${t}`);
}

/** The whole post as it is pasted, cut to the platform's limit (X counts a link as 23 characters). */
export function composePost(p: Platform, caption: string, cta: string, hashtags: string[], url: string | null): string {
  const r = PLATFORM_RULES[p];
  const link = r.link && url ? url : "";
  const sep = p === "x" ? " " : "\n\n";
  const tags = hashtags.slice(0, r.tags);
  const tailOf = (t: string[]) => [cta, link, t.join(" ")].filter(Boolean);
  const sizeOf = (parts: string[]) => parts.reduce((n, x) => n + (x === link && p === "x" ? X_LINK : x.length), 0) + sep.length * parts.length;
  // Hashtags go first when even the call and the link don't leave room for words.
  while (tags.length && r.chars - sizeOf(tailOf(tags)) < 40) tags.pop();
  const tail = tailOf(tags);
  const room = Math.max(20, r.chars - sizeOf(tail));
  let body = caption.trim();
  if (body.length > room) {
    body = body.slice(0, room - 1);
    const cut = body.search(/\s\S*$/);
    if (cut > room * 0.6) body = body.slice(0, cut);
    body = body.trimEnd() + "…";
  }
  return [body, ...tail].join(sep);
}

export function cleanPosts(raw: unknown, input: Pick<SocialInput, "platforms" | "products">): Post[] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const url = input.products.length === 1 ? input.products[0].url : null;
  const per = new Map<Platform, number>();
  const out: Post[] = [];
  for (const x of Array.isArray(o.posts) ? o.posts : []) {
    const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    const platform = String(r.platform ?? "").toLowerCase() as Platform;
    if (!input.platforms.includes(platform)) continue;
    if ((per.get(platform) ?? 0) >= 3) continue;
    const caption = lines(r.caption, captionRoom(platform) + 200)
      .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();
    if (caption.length < 8) continue;
    const hashtags = cleanTags(r.hashtags, PLATFORM_RULES[platform].tags);
    const cta = one(r.cta, 80);
    out.push({ platform, caption, hashtags, cta, idea: one(r.idea, 160), text: composePost(platform, caption, cta, hashtags, url) });
    per.set(platform, (per.get(platform) ?? 0) + 1);
  }
  return out;
}

/* ---------------- A week's plan ---------------- */

export type PlanItem = { day: number; time: string; platform: Platform; productId: string | null; idea: string; caption: string; hashtags: string[]; text: string };

export function weekPrompt(input: Omit<SocialInput, "offer">): AiPrompt {
  const user = [
    `The shop's pieces to choose from (most popular and newest):\n${input.products.map((p) => `- ${productLine(p, input.store.currency)}`).join("\n")}`,
    `Platforms to use: ${input.platforms.join(", ")}.`,
    "Plan 7 days of posts, one a day: mix the pieces (no piece twice in a row), the platforms and the kinds of post (a new piece, a styling idea, behind the scenes, a question to the followers, a customer favourite, a gift idea, the week's best).",
    `JSON: {"days": [{"day": 1-7, "time": "HH:MM" a good local hour to post, "platform": one of the platforms, "productId": an id from the list or null, "idea": what to post in one short sentence, "caption": the post's words (no hashtags, no links), "hashtags": ["word", ...]}]}`,
  ].join("\n\n");
  return { system: systemFor(input), user, maxTokens: 2600 };
}

export function cleanWeek(raw: unknown, input: Pick<SocialInput, "platforms" | "products">): PlanItem[] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const byId = new Map(input.products.map((p) => [p.id, p]));
  const seen = new Set<number>();
  const out: PlanItem[] = [];
  for (const x of Array.isArray(o.days) ? o.days : []) {
    const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    const day = Math.round(Number(r.day));
    // A platform that wasn't asked for doesn't lose the day: it goes on the first one asked for.
    const said = String(r.platform ?? "").toLowerCase() as Platform;
    const platform = input.platforms.includes(said) ? said : input.platforms[0];
    if (!(day >= 1 && day <= 7) || seen.has(day) || !platform) continue;
    const caption = lines(r.caption, captionRoom(platform) + 200).replace(/https?:\/\/\S+/g, "").trim();
    if (caption.length < 8) continue;
    const id = typeof r.productId === "string" && byId.has(r.productId) ? r.productId : null;
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(r.time ?? "")) ? String(r.time) : "19:00";
    const hashtags = cleanTags(r.hashtags, PLATFORM_RULES[platform].tags);
    seen.add(day);
    out.push({ day, time, platform, productId: id, idea: one(r.idea, 160), caption, hashtags, text: composePost(platform, caption, "", hashtags, id ? byId.get(id)!.url : null) });
  }
  return out.sort((a, b) => a.day - b.day);
}
