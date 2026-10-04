// src/lib/colorDetect.ts
// استخراج ألوان مسيطرة (dominant palette) من ملف صورة داخل المتصفح.
// أول لون = لون القطعة نفسها (نتجاهل لون الخلفية)، ثم بقية الألوان.
import { dominantGarmentColor } from "./productComposer";
// خفيف وسريع: quantization + histogram.

export function normalizeHex(input: string): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const hex = s.startsWith("#") ? s.slice(1) : s;
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9a-f]{3}$/.test(hex)) {
    const r = hex[0];
    const g = hex[1];
    const b = hex[2];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function hexFromRGB(r: number, g: number, b: number) {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function distSq(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function parseHexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex)!.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap أسرع من <img> + onload
  return await createImageBitmap(file);
}

async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(blob);
}

/**
 * يرجّع palette مرتبة من الأكثر ظهورًا للأقل.
 * count: كم لون بدك (افتراضي 5)
 * sample: حجم العيّنة (افتراضي 64) — كل ما كبر أدق بس أبطأ.
 */
export async function extractPaletteFromFile(file: File, count = 5, sample = 64): Promise<string[]> {
  const bmp = await fileToImageBitmap(file);
  return extractPaletteFromBitmap(bmp, count, sample);
}

/**
 * استخراج palette من URL (مفيد عند تعديل منتج موجود).
 * نستخدم fetch(blob) + createImageBitmap عشان ما نعلق بقصّة canvas taint.
 */
export async function extractPaletteFromUrl(url: string, count = 5, sample = 64, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const blob = await res.blob();
  const bmp = await blobToImageBitmap(blob);
  return extractPaletteFromBitmap(bmp, count, sample);
}

function extractPaletteFromBitmap(bmp: ImageBitmap, count = 5, sample = 64): string[] {
  const w = Math.max(1, Math.min(sample, bmp.width));
  const h = Math.max(1, Math.min(sample, bmp.height));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h).data;

  // The garment first: the most common colour is usually the backdrop (white wall, studio paper).
  const garment = dominantGarmentColor(img, w, h);

  // Quantize: 4 bits per channel (0..15)
  const bins = new Map<number, number>();
  for (let i = 0; i < img.length; i += 4) {
    const a = img[i + 3];
    if (a < 128) continue;
    const r = img[i] >> 4;
    const g = img[i + 1] >> 4;
    const b = img[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }

  const top = Array.from(bins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(count * 4, 20));

  const picks: string[] = garment ? [garment] : [];
  const pickedRgb: Array<[number, number, number]> = garment ? [parseHexToRgb(garment)] : [];
  const minDist = 28 * 28; // منع ألوان متشابهة جدًا

  for (const [key] of top) {
    const r4 = (key >> 8) & 0x0f;
    const g4 = (key >> 4) & 0x0f;
    const b4 = key & 0x0f;

    // center of bin
    const r = r4 * 16 + 8;
    const g = g4 * 16 + 8;
    const b = b4 * 16 + 8;
    const rgb: [number, number, number] = [r, g, b];

    // skip near-duplicates
    if (pickedRgb.some((p) => distSq(p, rgb) < minDist)) continue;

    picks.push(hexFromRGB(r, g, b));
    pickedRgb.push(rgb);

    if (picks.length >= count) break;
  }

  return picks;
}

export function pickBestDominant(palette: string[]): string | null {
  if (!palette?.length) return null;
  // عادة أول لون هو الأكثر
  const n = normalizeHex(palette[0]);
  return n;
}
