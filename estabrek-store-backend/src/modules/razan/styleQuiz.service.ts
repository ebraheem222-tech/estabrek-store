/**
 * «رزان بتختارلك»: a short quiz (occasion, season, colours, full look or a
 * piece, size, budget, photos she likes) and the shop's pieces ranked for her.
 *
 * Each piece gets a small feature vector from the catalogue (its colours in
 * Lab, season and occasion signals from its words and fields, full look or
 * not, sizes in stock, price, and the mean CLIP vector of its photos). Her
 * answers make the query; pieces are ranked by weighted similarity to it
 * (nearest neighbours), then picked with MMR so the list isn't six of the same.
 * Every result says why it was chosen. Nothing about her is stored: only
 * anonymous answer totals for the owner's report.
 */
import { prisma } from "../../lib/prisma.js";

/* ---------------- Words → signals ---------------- */

export const OCCASIONS = {
  daily: { ar: "اليوم العادي", words: ["يومي", "يومية", "كاجوال", "عملي", "daily", "casual", "everyday"] },
  work: { ar: "الدوام والجامعة", words: ["دوام", "عمل", "جامعة", "رسمي", "office", "work", "formal"] },
  evening: { ar: "السهرات والمناسبات", words: ["سهرة", "سهرات", "مناسبة", "مناسبات", "حفلة", "evening", "party", "occasion"] },
  wedding: { ar: "الأعراس", words: ["عرس", "أعراس", "اعراس", "فرح", "عروس", "خطوبة", "wedding", "bridal", "engagement"] },
  prayer: { ar: "الصلاة", words: ["صلاة", "اسدال", "إسدال", "حج", "عمرة", "prayer", "isdal"] },
  eid: { ar: "العيد ورمضان", words: ["عيد", "رمضان", "eid", "ramadan"] },
} as const;
export type Occasion = keyof typeof OCCASIONS;

const SEASON_WORDS = {
  summer: ["صيفي", "صيفية", "صيف", "خفيف", "خفيفة", "شيفون", "كتان", "قطن", "لينن", "ساتان", "summer", "linen", "cotton", "chiffon", "light"],
  winter: ["شتوي", "شتوية", "شتا", "شتاء", "صوف", "مخمل", "قطيفة", "فرو", "جوخ", "تريكو", "معطف", "جاكيت", "winter", "wool", "velvet", "coat", "knit", "fleece"],
};

const FULL_WORDS = ["عباية", "عبايه", "فستان", "جلباب", "جلابية", "اسدال", "إسدال", "طقم", "كفتان", "قفطان", "abaya", "dress", "jilbab", "set", "kaftan", "maxi"];
const PIECE_WORDS = ["حجاب", "شال", "طرحة", "خمار", "بونيه", "اكسسوار", "إكسسوار", "بروش", "دبوس", "حقيبة", "شنطة", "بلوزة", "تنورة", "hijab", "scarf", "shawl", "khimar", "accessor", "brooch", "bag", "blouse", "skirt"];

/** The colour choices shown in the quiz (named, in Lab for distances). */
export const PALETTE: Array<{ key: string; ar: string; hex: string }> = [
  { key: "black", ar: "أسود", hex: "#1c1c1e" },
  { key: "white", ar: "أبيض", hex: "#f5f3ee" },
  { key: "beige", ar: "بيج", hex: "#d8c3a5" },
  { key: "brown", ar: "بني", hex: "#7b5137" },
  { key: "grey", ar: "رمادي", hex: "#8e8e93" },
  { key: "navy", ar: "كحلي", hex: "#1f2a4a" },
  { key: "blue", ar: "أزرق", hex: "#4a78b5" },
  { key: "green", ar: "أخضر وزيتي", hex: "#5e6b3d" },
  { key: "pink", ar: "زهري", hex: "#e3a3b8" },
  { key: "wine", ar: "خمري", hex: "#6b2446" },
  { key: "purple", ar: "ليلكي وبنفسجي", hex: "#8d6fa8" },
  { key: "mustard", ar: "خردلي وأصفر", hex: "#c9a23c" },
];

/* ---------------- Colour maths ---------------- */

type Lab = [number, number, number];

export function hexToLab(hex: string): Lab | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const deltaE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const PALETTE_LAB = PALETTE.map((p) => ({ ...p, lab: hexToLab(p.hex)! }));

/** The palette colour a hex is closest to. */
export function nearestPalette(lab: Lab) {
  let best = PALETTE_LAB[0];
  let d = Infinity;
  for (const p of PALETTE_LAB) {
    const e = deltaE(lab, p.lab);
    if (e < d) { d = e; best = p; }
  }
  return best;
}

/* ---------------- Vectors ---------------- */

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function meanVector(list: number[][]): number[] | null {
  const dims = list[0]?.length ?? 0;
  const ok = list.filter((v) => v.length === dims);
  if (!dims || !ok.length) return null;
  const out = new Array(dims).fill(0);
  for (const v of ok) for (let i = 0; i < dims; i++) out[i] += v[i];
  const norm = Math.hypot(...out) || 1;
  return out.map((x) => x / norm);
}

const asVector = (v: unknown): number[] | null =>
  Array.isArray(v) && v.length > 8 && v.every((x) => typeof x === "number" && Number.isFinite(x)) ? (v as number[]) : null;

/** CLIP photo similarity: shop photos sit between ~0.5 (unrelated) and ~0.95 (same look). */
const photoMatch = (cos: number) => Math.max(0, Math.min(1, (cos - 0.5) / 0.42));

/* ---------------- The catalogue as features (cached) ---------------- */

export type StylePiece = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  categoryId: string;
  price: number | null;
  /** Sizes she can order now (upper case); empty = one size. */
  sizes: Set<string>;
  colors: Array<{ lab: Lab; name: string; palette: string }>;
  season: { summer: number; winter: number };
  occasions: Set<Occasion>;
  /** true = a full look (abaya, dress…), false = a piece that completes one, null = can't tell. */
  full: boolean | null;
  vec: number[] | null;
};

const ONE_SIZE = /^(default|one ?size|free ?size|مقاس واحد|فري ?سايز|standard|os)$/i;
const CACHE_MS = 5 * 60_000;
let cache: { at: number; pieces: StylePiece[] } | null = null;

export function clearStyleCache() {
  cache = null;
}

const textOf = (v: unknown): string =>
  v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(textOf).join(" ") : typeof v === "object" ? Object.values(v as object).map(textOf).join(" ") : String(v);

/** Arabic words carry prefixes (ال، و، ب، لل…): short words match a whole word (after a prefix), longer ones anywhere. */
const PREFIX = /^(و?(ال|لل|بال|كال|فال)|[وبلفك])/;
const tokens = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
function has(text: string, words: readonly string[]) {
  let toks: string[] | null = null;
  return words.some((raw) => {
    const w = raw.toLowerCase();
    if (w.length > 3) return text.includes(w);
    toks ??= tokens(text);
    return toks.some((t) => t === w || t.replace(PREFIX, "") === w);
  });
}

function effectivePrice(v: { price: unknown; salePrice: unknown; saleStartsAt: Date | null; saleEndsAt: Date | null }, now: number) {
  const base = Number(v.price);
  const sale = v.salePrice == null ? null : Number(v.salePrice);
  const live = sale != null && sale > 0 && (!v.saleStartsAt || v.saleStartsAt.getTime() <= now) && (!v.saleEndsAt || v.saleEndsAt.getTime() > now);
  return live ? sale! : Number.isFinite(base) ? base : null;
}

export async function stylePieces(): Promise<StylePiece[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.pieces;
  const rows = await prisma.product.findMany({
    where: { isActive: true, OR: [{ typeId: null }, { type: { fulfillment: "SHIPPING" } }] },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      attributes: true,
      categoryId: true,
      category: { select: { name: true, slug: true } },
      items: {
        where: { isActive: true },
        select: {
          colorName: true,
          colorHex: true,
          suggestedColors: true,
          images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 3, select: { url: true, embedding: true, dominantColorHex: true } },
          variants: { select: { price: true, salePrice: true, saleStartsAt: true, saleEndsAt: true, stock: true, size: { select: { name: true } } } },
        },
      },
    },
    take: 2000,
  });
  const now = Date.now();
  const pieces: StylePiece[] = [];
  for (const p of rows) {
    const variants = p.items.flatMap((i) => i.variants);
    const inStock = variants.filter((v) => v.stock > 0);
    if (!inStock.length) continue; // nothing to suggest
    const prices = inStock.map((v) => effectivePrice(v, now)).filter((x): x is number => x != null && x > 0);
    const sizes = new Set(inStock.map((v) => v.size.name.trim().toUpperCase()).filter((s) => !ONE_SIZE.test(s)));
    const colors: StylePiece["colors"] = [];
    for (const it of p.items) {
      if (!it.variants.some((v) => v.stock > 0)) continue;
      const hexes = [it.colorHex, ...(Array.isArray(it.suggestedColors) ? (it.suggestedColors as unknown[]).slice(0, 1) : []), it.images[0]?.dominantColorHex];
      const hex = hexes.find((h) => typeof h === "string" && hexToLab(h)) as string | undefined;
      const lab = hex ? hexToLab(hex) : null;
      if (lab) colors.push({ lab, name: it.colorName, palette: nearestPalette(lab).key });
    }
    const words = `${p.title} ${p.description ?? ""} ${p.category?.name ?? ""} ${p.category?.slug ?? ""} ${textOf(p.attributes)} ${p.items.map((i) => i.colorName).join(" ")}`.toLowerCase();
    const occasions = new Set<Occasion>();
    for (const [k, o] of Object.entries(OCCASIONS) as Array<[Occasion, (typeof OCCASIONS)[Occasion]]>) if (has(words, o.words)) occasions.add(k);
    const summer = has(words, SEASON_WORDS.summer), winter = has(words, SEASON_WORDS.winter);
    const titleCat = `${p.title} ${p.category?.name ?? ""} ${p.category?.slug ?? ""}`.toLowerCase();
    const full = has(titleCat, FULL_WORDS) ? true : has(titleCat, PIECE_WORDS) ? false : null;
    const vecs = p.items.flatMap((i) => i.images.map((im) => asVector(im.embedding))).filter((v): v is number[] => Boolean(v));
    pieces.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      image: p.items.find((i) => i.variants.some((v) => v.stock > 0))?.images[0]?.url ?? p.items[0]?.images[0]?.url ?? null,
      categoryId: p.categoryId,
      price: prices.length ? Math.min(...prices) : null,
      sizes,
      colors,
      // No signal either way: works in both (0.6); one-sided: strong for its season.
      season: summer === winter ? { summer: 0.6, winter: 0.6 } : summer ? { summer: 1, winter: 0.2 } : { summer: 0.2, winter: 1 },
      occasions,
      full,
      vec: vecs.length ? meanVector(vecs) : null,
    });
  }
  cache = { at: Date.now(), pieces };
  return pieces;
}

/* ---------------- The quiz ---------------- */

export type StyleAnswers = {
  occasion?: Occasion | null;
  season?: "summer" | "winter" | null;
  colors?: string[];
  look?: "full" | "piece" | null;
  size?: string | null;
  budgetMax?: number | null;
  liked?: string[];
  disliked?: string[];
  exclude?: string[];
};

type Match = { key: "color" | "occasion" | "season" | "look" | "size" | "budget" | "taste"; weight: number; m: number; colorName?: string };
const WEIGHTS = { color: 3, occasion: 2.5, taste: 3, season: 1.5, look: 1.5, budget: 2 } as const;
const LAMBDA = { low: 0.85, medium: 0.7, high: 0.55 } as const;

/** How close one piece is to her answers (0..1), with what matched; null = ruled out. */
export function scorePiece(p: StylePiece, a: StyleAnswers, taste: { like: number[] | null; dislike: number[] | null }, wanted: Lab[]): { score: number; matches: Match[] } | null {
  const ms: Match[] = [];
  // Hard rules: her size must be there (one-size pieces always fit), and not far over budget.
  if (a.size) {
    const s = a.size.trim().toUpperCase();
    if (p.sizes.size && !p.sizes.has(s)) return null;
    if (p.sizes.has(s)) ms.push({ key: "size", weight: 0, m: 1 });
  }
  if (a.budgetMax && p.price != null) {
    if (p.price > a.budgetMax * 1.5) return null;
    ms.push({ key: "budget", weight: WEIGHTS.budget, m: p.price <= a.budgetMax ? 1 : Math.exp(-(p.price - a.budgetMax) / (0.2 * a.budgetMax)) });
  }
  if (wanted.length) {
    let best = 0, name = "";
    for (const c of p.colors) for (const w of wanted) {
      const m = Math.exp(-deltaE(c.lab, w) / 22);
      if (m > best) { best = m; name = c.name; }
    }
    ms.push({ key: "color", weight: WEIGHTS.color, m: p.colors.length ? best : 0.3, colorName: name });
  }
  if (a.occasion) ms.push({ key: "occasion", weight: WEIGHTS.occasion, m: p.occasions.has(a.occasion) ? 1 : p.occasions.size ? 0.1 : 0.4 });
  if (a.season) ms.push({ key: "season", weight: WEIGHTS.season, m: p.season[a.season] });
  if (a.look) ms.push({ key: "look", weight: WEIGHTS.look, m: p.full == null ? 0.5 : p.full === (a.look === "full") ? 1 : 0 });
  if (p.vec && (taste.like || taste.dislike)) {
    const like = taste.like ? photoMatch(cosine(p.vec, taste.like)) : 0.5;
    const dislike = taste.dislike ? photoMatch(cosine(p.vec, taste.dislike)) : 0;
    ms.push({ key: "taste", weight: WEIGHTS.taste, m: Math.max(0, like - 0.5 * dislike) });
  }
  const weighted = ms.filter((x) => x.weight > 0);
  const total = weighted.reduce((s, x) => s + x.weight, 0);
  const score = total ? weighted.reduce((s, x) => s + x.weight * x.m, 0) / total : 0.5;
  return { score, matches: ms };
}

/** How alike two pieces are (for variety): their photos when both have them, else category + colour. */
function alike(a: StylePiece, b: StylePiece) {
  if (a.vec && b.vec) return photoMatch(cosine(a.vec, b.vec));
  let colour = 0;
  for (const x of a.colors) for (const y of b.colors) colour = Math.max(colour, Math.exp(-deltaE(x.lab, y.lab) / 22));
  return 0.6 * Number(a.categoryId === b.categoryId) + 0.4 * colour;
}

/** Maximal marginal relevance: good for her, and not all the same. */
export function mmr<T extends { piece: StylePiece; score: number }>(ranked: T[], k: number, lambda: number): T[] {
  const pool = ranked.slice(0, Math.max(k * 6, 30));
  const out: T[] = [];
  while (out.length < k && pool.length) {
    let bi = 0, best = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const sim = out.length ? Math.max(...out.map((o) => alike(o.piece, pool[i].piece))) : 0;
      const v = lambda * pool[i].score - (1 - lambda) * sim;
      if (v > best) { best = v; bi = i; }
    }
    out.push(pool.splice(bi, 1)[0]);
  }
  return out;
}

const SEASON_REASON = { summer: "خفيفة للصيف", winter: "دافية للشتا" } as const;

function reasonsFor(matches: Match[], a: StyleAnswers): string[] {
  const lines: Array<{ v: number; text: string }> = [];
  for (const x of matches) {
    if (x.m < 0.7) continue;
    const v = (x.weight || 1) * x.m;
    if (x.key === "color" && x.colorName) lines.push({ v, text: `لونها (${x.colorName}) من الألوان اللي بتحبيها` });
    if (x.key === "occasion" && a.occasion) lines.push({ v, text: `بتنفع لـ${OCCASIONS[a.occasion].ar}` });
    if (x.key === "season" && a.season) lines.push({ v, text: SEASON_REASON[a.season] });
    if (x.key === "look") lines.push({ v, text: a.look === "full" ? "لبسة كاملة لحالها" : "قطعة بتكمّل لبستكِ" });
    if (x.key === "size" && a.size) lines.push({ v: 1.2, text: `مقاسكِ ${a.size} متوفر` });
    if (x.key === "budget") lines.push({ v, text: "ضمن ميزانيتكِ" });
    if (x.key === "taste") lines.push({ v: v + 1, text: "شبه القطع اللي عجبتكِ" });
  }
  return lines.sort((p, q) => q.v - p.v).slice(0, 3).map((l) => l.text);
}

export type StyleResult = { id: string; title: string; slug: string; image: string | null; price: number | null; reasons: string[]; score: number };

export async function suggest(a: StyleAnswers, opts: { results: number; variety: keyof typeof LAMBDA }) {
  const pieces = await stylePieces();
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const vecs = (ids?: string[]) => meanVector((ids ?? []).map((id) => byId.get(id)?.vec).filter((v): v is number[] => Boolean(v)));
  const taste = { like: vecs(a.liked), dislike: vecs(a.disliked) };
  const wanted = (a.colors ?? []).map((k) => PALETTE_LAB.find((p) => p.key === k)?.lab).filter((x): x is Lab => Boolean(x));
  const skip = new Set([...(a.disliked ?? []), ...(a.exclude ?? [])]);
  const ranked: Array<{ piece: StylePiece; score: number; matches: Match[] }> = [];
  for (const p of pieces) {
    if (skip.has(p.id)) continue;
    const s = scorePiece(p, a, taste, wanted);
    if (s) ranked.push({ piece: p, ...s });
  }
  ranked.sort((x, y) => y.score - x.score);
  // Too far from what she asked: say so rather than show anything.
  const good = ranked.filter((r) => r.score >= 0.35);
  const picked = mmr(good, opts.results, LAMBDA[opts.variety]);
  const products: StyleResult[] = picked.map((r) => ({
    id: r.piece.id,
    title: r.piece.title,
    slug: r.piece.slug,
    image: r.piece.image,
    price: r.piece.price,
    reasons: reasonsFor(r.matches, a),
    score: Math.round(r.score * 100) / 100,
  }));
  return { products, noMatch: products.length === 0 };
}

/** What the quiz offers, from what the shop has now (and a few varied photos to pick from). */
export async function quizStart() {
  const pieces = await stylePieces();
  const occ = new Map<Occasion, number>();
  for (const p of pieces) for (const o of p.occasions) occ.set(o, (occ.get(o) ?? 0) + 1);
  const colorCount = new Map<string, number>();
  for (const p of pieces) for (const k of new Set(p.colors.map((c) => c.palette))) colorCount.set(k, (colorCount.get(k) ?? 0) + 1);
  const sizeNames = new Set(pieces.flatMap((p) => [...p.sizes]));
  const order = await prisma.size.findMany({ select: { name: true, order: true } });
  const rank = new Map(order.map((s) => [s.name.trim().toUpperCase(), s.order]));
  const prices = pieces.map((p) => p.price).filter((x): x is number => x != null).sort((x, y) => x - y);
  const q = (f: number) => prices[Math.min(prices.length - 1, Math.floor(f * prices.length))];
  const round = (n: number) => (n < 100 ? Math.ceil(n / 10) * 10 : Math.ceil(n / 50) * 50);
  const budgets = prices.length >= 4 ? [...new Set([round(q(0.3)), round(q(0.6)), round(q(0.85))])] : [];
  // Photos to pick from: varied (MMR with no preference).
  const withPhoto = pieces.filter((p) => p.image).map((p) => ({ piece: p, score: 0.5 }));
  const photos = mmr(withPhoto, 8, 0.3).map((r) => ({ id: r.piece.id, title: r.piece.title, image: r.piece.image }));
  return {
    occasions: (Object.keys(OCCASIONS) as Occasion[]).filter((k) => (occ.get(k) ?? 0) > 0).map((k) => ({ key: k, label: OCCASIONS[k].ar, count: occ.get(k) ?? 0 })),
    colors: PALETTE.filter((p) => colorCount.has(p.key)).map((p) => ({ key: p.key, label: p.ar, hex: p.hex })),
    sizes: [...sizeNames].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999) || a.localeCompare(b)),
    budgets,
    photos,
    total: pieces.length,
  };
}

/** Anonymous totals of her answers for the owner (no ids, no person). */
export function answerKeys(a: StyleAnswers): string[] {
  const keys: string[] = [];
  if (a.occasion) keys.push(`quiz:o:${a.occasion}`);
  if (a.season) keys.push(`quiz:s:${a.season}`);
  for (const c of (a.colors ?? []).slice(0, 3)) if (PALETTE.some((p) => p.key === c)) keys.push(`quiz:c:${c}`);
  if (a.look) keys.push(`quiz:l:${a.look}`);
  if (a.budgetMax) keys.push(`quiz:b:${a.budgetMax <= 150 ? "150" : a.budgetMax <= 300 ? "300" : a.budgetMax <= 500 ? "500" : "500+"}`);
  return keys;
}
