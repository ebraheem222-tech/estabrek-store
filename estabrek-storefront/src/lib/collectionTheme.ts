/** Theme seed for a collection card: Admin colour → known collection → its photo → a soft fallback. */

const KNOWN: Array<[RegExp, string]> = [
  [/winter|شتو|شتاء/i, "#7d8ec4"],          // icy periwinkle
  [/spring|ربيع|summer|صيف/i, "#e9a27c"],   // warm apricot
  [/kid|أطفال|اطفال|طفل|جيل/i, "#e59b9b"],   // soft coral
  [/accessor|إكسسوار|اكسسوار|خاتم|ring/i, "#c4a266"], // champagne gold
  [/incense|بخور|مبخر|مباخر|oud|عود/i, "#9b6b4e"], // oud amber
  [/prayer|مصل|سجاد/i, "#8ea58a"],          // sage
  [/hijab|حجاب|شال|طرح|قمط/i, "#a08cbd"],    // lilac
  [/dress|فستان|فساتين|عباي|طقم/i, "#c97794"], // rose
  [/stand|ستاند|wood|خشب/i, "#b58a64"],      // warm wood
];
const FALLBACK = ["#c97794", "#a08cbd", "#e9a27c", "#8ea58a", "#7d8ec4", "#c4a266"];

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("")}`;
}

function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** Average of the photo's colourful pixels, tuned into a calm, readable seed. */
export function sampleImageColor(img: HTMLImageElement | null | undefined): string | null {
  if (!img || !img.complete || !img.naturalWidth) return null;
  try {
    const size = 24;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < data.length; i += 4) {
      const R = data[i], G = data[i + 1], B = data[i + 2];
      const max = Math.max(R, G, B), min = Math.min(R, G, B);
      const light = (max + min) / 510;
      if (light > 0.94 || light < 0.06) continue; // skip blown highlights and deep shadows
      const weight = 0.25 + (max - min) / 255;   // favour the garment's colour over the backdrop
      r += R * weight; g += G * weight; b += B * weight; w += weight;
    }
    if (!w) return null;
    r /= w * 255; g /= w * 255; b /= w * 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return hslToHex(h, Math.min(0.58, Math.max(0.32, s)), Math.min(0.64, Math.max(0.5, l)));
  } catch {
    return null; // cross-origin or decode issue: use the fallback
  }
}

export function collectionSeed(
  item: { themeColor?: string; color?: string; label?: string; title?: string; href?: string },
  index: number,
  img?: HTMLImageElement | null,
): string {
  const authored = item.themeColor || item.color;
  if (authored && /^#[0-9a-f]{6}$/i.test(authored)) return authored;
  let href = item.href ?? "";
  try { href = decodeURIComponent(href); } catch { /* keep the raw href */ }
  const text = `${item.label ?? ""} ${item.title ?? ""} ${href}`;
  for (const [pattern, seed] of KNOWN) if (pattern.test(text)) return seed;
  return sampleImageColor(img) ?? FALLBACK[index % FALLBACK.length];
}
