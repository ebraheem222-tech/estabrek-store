import { normalizeHex } from "./colorDetect";

export type NamedColor = {
  englishName: string;
  arabicName: string;
  sku: string;
  hex: string;
};

export const NAMED_COLORS: NamedColor[] = [
  { englishName: "Black", arabicName: "أسود", sku: "BLACK", hex: "#000000" },
  { englishName: "White", arabicName: "أبيض", sku: "WHITE", hex: "#ffffff" },
  { englishName: "Gray", arabicName: "رمادي", sku: "GRAY", hex: "#9ca3af" },
  { englishName: "Red", arabicName: "أحمر", sku: "RED", hex: "#ef4444" },
  { englishName: "Orange", arabicName: "برتقالي", sku: "ORANGE", hex: "#f97316" },
  { englishName: "Yellow", arabicName: "أصفر", sku: "YELLOW", hex: "#eab308" },
  { englishName: "Green", arabicName: "أخضر", sku: "GREEN", hex: "#22c55e" },
  { englishName: "Teal", arabicName: "تركواز", sku: "TEAL", hex: "#06b6d4" },
  { englishName: "Blue", arabicName: "أزرق", sku: "BLUE", hex: "#3b82f6" },
  { englishName: "Indigo", arabicName: "نيلي", sku: "INDIGO", hex: "#6366f1" },
  { englishName: "Purple", arabicName: "بنفسجي", sku: "PURPLE", hex: "#8b5cf6" },
  { englishName: "Pink", arabicName: "وردي", sku: "PINK", hex: "#ec4899" },
  { englishName: "Brown", arabicName: "بني", sku: "BROWN", hex: "#92400e" },
];

function normalizedName(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex);
  if (!n) return [0, 0, 0];
  const v = n.slice(1);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function findKnownColorByName(value: string): NamedColor | null {
  const key = normalizedName(value);
  if (!key) return null;
  const exact = NAMED_COLORS.find((color) => {
    const english = normalizedName(color.englishName);
    const arabic = normalizedName(color.arabicName);
    const sku = normalizedName(color.sku);
    return key === english || key === arabic || key === sku;
  });
  if (exact) return exact;

  return (
    NAMED_COLORS.find((color) => {
      const english = normalizedName(color.englishName);
      const arabic = normalizedName(color.arabicName);
      const sku = normalizedName(color.sku);
      return key.includes(english) || key.includes(arabic) || key.includes(sku);
    }) ?? null
  );
}

export function getNearestNamedColor(hex: string): NamedColor | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const rgb = hexToRgb(n);
  let best: NamedColor | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const color of NAMED_COLORS) {
    const distance = colorDistance(rgb, hexToRgb(color.hex));
    if (distance < bestDist) {
      bestDist = distance;
      best = color;
    }
  }

  return best;
}

export function translateColorNameToArabic(value: string): string {
  const fromHex = normalizeHex(value);
  if (fromHex) return getNearestNamedColor(fromHex)?.arabicName ?? value;
  return findKnownColorByName(value)?.arabicName ?? value;
}

export function skuSegmentFromColorName(value: string): string | null {
  const fromHex = normalizeHex(value);
  if (fromHex) return getNearestNamedColor(fromHex)?.sku ?? null;
  return findKnownColorByName(value)?.sku ?? null;
}
