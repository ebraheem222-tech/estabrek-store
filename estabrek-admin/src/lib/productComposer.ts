// src/lib/productComposer.ts
// Helpers for the one-screen "add product" page: Arabic-friendly slugs and
// SKUs, fashion colour names, photo colour detection that ignores the
// backdrop, and size presets built from the store's own sizes.

/* ---------------------------------------------------------------- slugs */

const AR_TO_LATIN: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "a", "ء": "", "ؤ": "o", "ئ": "e",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "th",
  "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
  "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "ة": "a", "و": "w", "ي": "y", "ى": "a", "پ": "p", "چ": "ch", "ڤ": "v", "گ": "g",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** Arabic (or any) text → latin letters/digits/spaces. Diacritics and tatweel are dropped. */
export function transliterate(input: string): string {
  return Array.from(String(input || "").normalize("NFKD").replace(/[ً-ٰٟـ]/g, ""))
    .map((ch) => (ch in AR_TO_LATIN ? AR_TO_LATIN[ch] : ch))
    .join("")
    .replace(/[̀-ͯ]/g, "");
}

/** URL slug that works for Arabic titles: "فستان الورد" → "fstan-alwrd". */
export function makeSlug(input: string, maxLength = 60): string {
  const slug = transliterate(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength)
    .replace(/-$/g, "");
  return slug || `product-${Date.now().toString(36)}`;
}

/** Upper-case SKU part from any text: "مقاس واحد" → "MQAS-WAHD", "One Size" → "ONE-SIZE". */
export function skuPart(input: string, maxLength = 20): string {
  return transliterate(input)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength)
    .replace(/-$/g, "");
}

/** Short random suffix, e.g. for a slug that is already taken. */
export function shortId(length = 4): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

/* ------------------------------------------------------- fashion colours */

export type FashionColor = { name: string; code: string; hex: string };

/** Colour names the shop actually uses for modest fashion (Arabic name, SKU code, reference hex). */
export const FASHION_COLORS: FashionColor[] = [
  { name: "أسود", code: "BLACK", hex: "#151515" },
  { name: "أبيض", code: "WHITE", hex: "#f7f7f5" },
  { name: "أوف وايت", code: "OFFWHITE", hex: "#efe9dc" },
  { name: "كريمي", code: "CREAM", hex: "#f1e3c6" },
  { name: "بيج", code: "BEIGE", hex: "#d9c3a5" },
  { name: "جملي", code: "CAMEL", hex: "#b5895a" },
  { name: "بني", code: "BROWN", hex: "#6e4630" },
  { name: "شوكولا", code: "CHOCO", hex: "#4a2f24" },
  { name: "رمادي", code: "GREY", hex: "#9a9a9a" },
  { name: "سكني", code: "ASH", hex: "#b9b4ad" },
  { name: "فحمي", code: "CHARCOAL", hex: "#3d3f43" },
  { name: "كحلي", code: "NAVY", hex: "#1f2a44" },
  { name: "أزرق", code: "BLUE", hex: "#3c63b0" },
  { name: "سماوي", code: "SKY", hex: "#9cc6e6" },
  { name: "تركوازي", code: "TURQ", hex: "#2fa6a0" },
  { name: "زيتي", code: "OLIVE", hex: "#6b6b3a" },
  { name: "أخضر", code: "GREEN", hex: "#2f7a4b" },
  { name: "نعناعي", code: "MINT", hex: "#a8dcc4" },
  { name: "خمري", code: "WINE", hex: "#6b1f33" },
  { name: "عنابي", code: "MAROON", hex: "#7b2230" },
  { name: "أحمر", code: "RED", hex: "#c62f2f" },
  { name: "وردي", code: "PINK", hex: "#e58fae" },
  { name: "زهري فاتح", code: "BLUSH", hex: "#f2c9cf" },
  { name: "نهدي", code: "NUDE", hex: "#d8a98f" },
  { name: "موف", code: "MAUVE", hex: "#a07c9c" },
  { name: "ليلكي", code: "LILAC", hex: "#c3a6d6" },
  { name: "بنفسجي", code: "PURPLE", hex: "#6d3f8f" },
  { name: "خوخي", code: "PEACH", hex: "#f2b28f" },
  { name: "برتقالي", code: "ORANGE", hex: "#e2793b" },
  { name: "أصفر", code: "YELLOW", hex: "#e9c949" },
  { name: "خردلي", code: "MUSTARD", hex: "#c79a2b" },
  { name: "ذهبي", code: "GOLD", hex: "#c8a24a" },
  { name: "فضي", code: "SILVER", hex: "#c4c7cc" },
];

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB | null {
  const m = String(hex || "").trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** Perceptual-ish distance (CIE76 in Lab). ~0 same, <12 hard to tell apart, >40 clearly different. */
export function colorDistance(a: string | RGB, b: string | RGB): number {
  const ra = typeof a === "string" ? hexToRgb(a) : a;
  const rb = typeof b === "string" ? hexToRgb(b) : b;
  if (!ra || !rb) return Infinity;
  const la = toLab(ra), lb = toLab(rb);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

function toLab([r, g, b]: RGB): [number, number, number] {
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function nearestFashionColor(hex: string): FashionColor {
  let best = FASHION_COLORS[0];
  let bestD = Infinity;
  for (const c of FASHION_COLORS) {
    const d = colorDistance(hex, c.hex);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** Arabic colour name typed by the owner → its SKU code (falls back to transliteration). */
export function colorCode(name: string): string {
  const key = String(name || "").trim();
  const hit = FASHION_COLORS.find((c) => c.name === key);
  return hit ? hit.code : skuPart(key, 12) || "COLOR";
}

/* -------------------------------------------- photo colour (no backdrop) */

/**
 * The garment's colour in a product photo. Pixels that look like the
 * backdrop (sampled from the photo's edges) are ignored, the centre counts
 * more than the corners, and the biggest remaining colour cluster wins.
 */
export function dominantGarmentColor(data: Uint8ClampedArray, width: number, height: number): string | null {
  const px = (x: number, y: number): RGB => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  // Backdrop: the colours along the border.
  const edge: RGB[] = [];
  for (let x = 0; x < width; x += 2) { edge.push(px(x, 0), px(x, height - 1)); }
  for (let y = 0; y < height; y += 2) { edge.push(px(0, y), px(width - 1, y)); }
  const backdrops = topClusters(edge.map((c) => ({ c, w: 1 })), 3).filter((cl) => cl.w / edge.length > 0.12).map((cl) => cl.c);

  const samples: Array<{ c: RGB; w: number }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue; // transparent (cut-out PNGs)
      const c: RGB = [data[i], data[i + 1], data[i + 2]];
      if (backdrops.some((b) => colorDistance(c, b) < 14)) continue;
      const dx = (x - width / 2) / (width / 2), dy = (y - height / 2) / (height / 2);
      const w = Math.max(0.15, 1 - (dx * dx + dy * dy) * 0.6);
      samples.push({ c, w });
    }
  }
  // A plain photo of one colour (or a garment the same colour as the wall): fall back to everything.
  const pool = samples.length > width * height * 0.04 ? samples : Array.from({ length: width * height }, (_, k) => ({ c: [data[k * 4], data[k * 4 + 1], data[k * 4 + 2]] as RGB, w: 1 }));
  const top = topClusters(pool, 1)[0];
  return top ? rgbToHex(top.c) : null;
}

/** Group colours into 4-bit buckets, return the heaviest buckets with their average colour. */
function topClusters(list: Array<{ c: RGB; w: number }>, n: number) {
  const buckets = new Map<number, { r: number; g: number; b: number; w: number }>();
  for (const { c, w } of list) {
    const key = ((c[0] >> 4) << 8) | ((c[1] >> 4) << 4) | (c[2] >> 4);
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
    cur.r += c[0] * w; cur.g += c[1] * w; cur.b += c[2] * w; cur.w += w;
    buckets.set(key, cur);
  }
  // Merge neighbouring buckets so a gradient is one cluster, not many small ones.
  const sorted = [...buckets.values()].sort((a, b) => b.w - a.w);
  const clusters: Array<{ c: RGB; w: number }> = [];
  for (const bk of sorted) {
    const c: RGB = [bk.r / bk.w, bk.g / bk.w, bk.b / bk.w];
    const near = clusters.find((cl) => colorDistance(cl.c, c) < 12);
    if (near) {
      const total = near.w + bk.w;
      near.c = [(near.c[0] * near.w + c[0] * bk.w) / total, (near.c[1] * near.w + c[1] * bk.w) / total, (near.c[2] * near.w + c[2] * bk.w) / total];
      near.w = total;
    } else clusters.push({ c, w: bk.w });
  }
  return clusters.sort((a, b) => b.w - a.w).slice(0, n);
}

/** Reads a photo (File or URL) in the browser and returns its garment colour. */
export async function detectPhotoColor(source: File | string): Promise<string | null> {
  try {
    const img = await loadImage(source);
    const size = 72;
    const ratio = Math.min(1, size / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * ratio)), h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return dominantGarmentColor(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return null;
  }
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    img.onload = () => { if (typeof source !== "string") URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { if (typeof source !== "string") URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

/* ----------------------------------------------------------- sizes */

export type SizeLike = { id: string; name: string; order?: number; active?: boolean };
export type SizePreset = { key: string; label: string; sizeIds: string[] };

const LETTER = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl)$/i;
const ONE = /^(one ?size|os|free ?size|مقاس واحد|فري ?سايز|مقاس موحد|ستاندرد|standard)$/i;
const KIDS = /(سن|سنة|سنوات|شهر|اشهر|أشهر|عمر|y|yrs?|years?|m|months?)\s*$/i;

/** Ready-made size sets from the sizes that exist in the store. */
export function sizePresets(sizes: SizeLike[]): SizePreset[] {
  const active = sizes.filter((s) => s.active !== false);
  const pick = (test: (name: string) => boolean) => active.filter((s) => test(s.name.trim())).map((s) => s.id);
  const presets: SizePreset[] = [
    { key: "one", label: "مقاس واحد", sizeIds: pick((n) => ONE.test(n)).slice(0, 1) },
    { key: "letters", label: "S – XL", sizeIds: pick((n) => LETTER.test(n)) },
    { key: "numbers", label: "مقاسات بالأرقام", sizeIds: pick((n) => /^\d{2}$/.test(n) && +n >= 30 && +n <= 60) },
    { key: "kids", label: "أطفال (بالعمر)", sizeIds: pick((n) => (/^\d{1,2}$/.test(n) && +n <= 16) || (KIDS.test(n) && /\d/.test(n))) },
  ];
  return presets.filter((p) => p.sizeIds.length > 0);
}

export function isOneSizeName(name: string) {
  return ONE.test(String(name || "").trim());
}

/** Which preset fits a category name best (used before the owner has a remembered choice). */
export function presetForCategory(categoryName: string, presets: SizePreset[]): SizePreset | null {
  const n = String(categoryName || "");
  const byKey = (k: string) => presets.find((p) => p.key === k) ?? null;
  if (/(حجاب|شال|طرح|إكسسوار|اكسسوار|مبخر|مباخر|بخور|عطر|توزيع|خاتم|دبوس|سبح|accessor|hijab|scarf|incense)/i.test(n)) return byKey("one");
  if (/(أطفال|اطفال|طفل|بنات|kids|child|girl)/i.test(n)) return byKey("kids") ?? byKey("numbers") ?? byKey("letters");
  if (/(فستان|فساتين|عباي|جلباب|طقم|تنور|بلوز|dress|abaya)/i.test(n)) return byKey("letters") ?? byKey("numbers");
  return null;
}

/* --------------------------------------------------------- money */

export function parsePrice(value: string): number | null {
  const normal = transliterate(String(value || "")).replace(/[٫,]/g, ".").replace(/[^\d.]/g, "");
  if (!normal) return null;
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function formatShekel(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₪${n % 1 === 0 ? n : n.toFixed(2)}`;
}
