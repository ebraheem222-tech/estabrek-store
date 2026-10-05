// Code 128 (set B) barcodes as SVG — the kind every handheld scanner reads.
// No library: the 107 patterns below are the standard bar/space widths.

const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const STOP = 106;

/** Can this text be a Code 128-B barcode? (printable ASCII only) */
export function canEncode(text: string) {
  return text.length > 0 && text.length <= 48 && /^[\x20-\x7e]+$/.test(text);
}

/** Symbol values: start, data, checksum, stop. */
export function code128Values(text: string): number[] {
  if (!canEncode(text)) throw new Error("Code 128-B: printable ASCII only");
  const data = [...text].map((ch) => ch.charCodeAt(0) - 32);
  const check = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...data, check, STOP];
}

/** Bars and spaces as module widths, starting with a bar. */
export function code128Widths(text: string): number[] {
  return code128Values(text).flatMap((v) => [...PATTERNS[v]].map(Number));
}

/** The barcode as an SVG string (quiet zone included). `height` and `module` in px. */
export function code128Svg(text: string, opts?: { height?: number; module?: number; color?: string }): string {
  const module = opts?.module ?? 2;
  const height = opts?.height ?? 60;
  const quiet = 10 * module;
  const widths = code128Widths(text);
  let x = quiet;
  const rects: string[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w * module}" height="${height}"/>`);
    x += w * module;
  });
  const total = x + quiet;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" width="${total}" height="${height}" preserveAspectRatio="none" shape-rendering="crispEdges" fill="${opts?.color ?? "#000"}" role="img" aria-label="${text.replace(/"/g, "&quot;")}">${rects.join("")}</svg>`;
}

export const __PATTERNS_FOR_TEST = PATTERNS;
