const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const ARABIC_NORMALIZE_MAP: Array<[RegExp, string]> = [
  [/[إأآٱ]/g, "ا"],
  [/ى/g, "ي"],
  [/ؤ/g, "و"],
  [/ئ/g, "ي"],
  [/ة/g, "ه"],
  [/گ/g, "ك"],
  [/پ/g, "ب"],
  [/چ/g, "ج"],
  [/ـ/g, ""],
];

export function normalizeSearchText(input: string): string {
  let s = String(input ?? "").toLowerCase();
  for (const [re, rep] of ARABIC_NORMALIZE_MAP) s = s.replace(re, rep);
  s = s.replace(ARABIC_DIACRITICS, "");
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return s.replace(/\s+/g, " ").trim();
}

function tokenizeNormalized(norm: string): string[] {
  return norm ? norm.split(/\s+/g).filter(Boolean) : [];
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const aLen = a.length;
  const bLen = b.length;
  const row = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) row[j] = j;

  for (let i = 1; i <= aLen; i++) {
    let prev = row[0];
    row[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j++) {
      const tmp = row[j];
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }

  return row[bLen] as number;
}

function normalizedSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

export function scoreTextMatch(query: string, target: string): number {
  const qNorm = normalizeSearchText(query);
  const tNorm = normalizeSearchText(target);
  if (!qNorm || !tNorm) return 0;

  if (tNorm.includes(qNorm)) {
    const ratio = Math.min(1, qNorm.length / tNorm.length);
    return 0.9 + 0.1 * ratio;
  }

  const qTokens = tokenizeNormalized(qNorm);
  const tTokens = tokenizeNormalized(tNorm);
  if (!qTokens.length || !tTokens.length) return 0;

  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) {
      if (tt.startsWith(qt)) {
        best = Math.max(best, 0.85 * Math.min(1, qt.length / tt.length));
        continue;
      }
      const sim = normalizedSimilarity(qt, tt);
      if (sim > best) best = sim;
    }
    total += best;
  }

  return total / qTokens.length;
}
