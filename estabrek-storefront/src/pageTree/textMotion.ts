/**
 * What words do as they move (pageTree/TreeMotion.tsx): Arabic moves word by word so its
 * letters stay joined, a scramble shows letters of the words' own script, and a number
 * counts up to itself in its own digits. No React here, so the tests load it directly.
 */
/** Arabic letters join: they move word by word, never letter by letter. */
export const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
/** The letters a scramble shows, in the words' own script. */
export const scrambleChars = (text: string) => (ARABIC.test(text) ? "ابتثجحخدذرزسشصضطظعغفقكلمنهوي" : /[\u0590-\u05FF]/.test(text) ? "אבגדהוזחטיכלמנסעפצקרשת" : "upperAndLowerCase");
const DIGITS = "٠١٢٣٤٥٦٧٨٩";
const NUMBER = /[\d٠-٩][\d٠-٩,.\u066B\u066C]*/;

/**
 * The first number in the words, counting up to itself (its own digits, separators and
 * decimals kept): the words before and after it, its value, and how to write any value its way.
 */
export function countUpText(text: string): { before: string; after: string; target: number; format: (v: number) => string } | null {
  const m = NUMBER.exec(text);
  if (!m) return null;
  const raw = m[0].replace(/[,.\u066B\u066C]+$/, "");
  const arabic = /[٠-٩]/.test(raw);
  const latin = raw.replace(/[٠-٩]/g, (d) => String(DIGITS.indexOf(d))).replace(/\u066B/g, ".");
  const grouped = /[,\u066C]/.test(latin); // thousands apart ("1,200"); a point is always the decimals
  const clean = latin.replace(/[,\u066C]/g, "");
  const target = parseFloat(clean);
  if (!Number.isFinite(target)) return null;
  const decimals = (clean.split(".")[1] ?? "").length;
  const format = (v: number) => {
    let s = grouped ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals);
    if (arabic) s = s.replace(/\d/g, (d) => DIGITS[Number(d)]).replace(/,/g, "٬").replace(/\./g, "٫");
    return s;
  };
  return { before: text.slice(0, m.index), after: text.slice(m.index + raw.length), target, format };
}
