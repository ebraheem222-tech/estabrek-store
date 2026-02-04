import sharp from "sharp";

const NIBBLE_POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

export async function computeDhashHex(filePath: string): Promise<string | null> {
  try {
    const { data, info } = await sharp(filePath, { failOnError: false })
      .rotate()
      .grayscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.width !== 9 || info.height !== 8) return null;

    let hex = "";
    let nibble = 0;
    let bitCount = 0;

    for (let y = 0; y < 8; y++) {
      const row = y * 9;
      for (let x = 0; x < 8; x++) {
        const left = data[row + x] ?? 0;
        const right = data[row + x + 1] ?? 0;
        const bit = left < right ? 1 : 0;
        nibble = (nibble << 1) | bit;
        bitCount++;
        if (bitCount === 4) {
          hex += nibble.toString(16);
          nibble = 0;
          bitCount = 0;
        }
      }
    }

    return hex.length ? hex : null;
  } catch {
    return null;
  }
}

export function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = parseInt(a[i]!, 16);
    const bi = parseInt(b[i]!, 16);
    if (Number.isNaN(ai) || Number.isNaN(bi)) return Number.POSITIVE_INFINITY;
    dist += NIBBLE_POPCOUNT[ai ^ bi] ?? 0;
  }
  return dist;
}
