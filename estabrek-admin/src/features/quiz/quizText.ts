export const LEVEL_LABELS: Record<number, string> = { 1: "سهل", 2: "متوسط", 3: "صعب" };
export const TOPIC_LABELS: Record<string, string> = { quran: "القرآن", seerah: "السيرة", manners: "الآداب", worship: "العبادات", general: "عام" };

/** "1، 3، 7، 15، 31…" — the visitors who get a chance in counter mode. */
export function scheduleText(base: number, count = 6) {
  const out: number[] = [];
  for (let p = 1; out.length < count; p = base * p + 1) out.push(p);
  return `${out.join("، ")}…`;
}

/** Chance mode: the odds for the 1st, 2nd, 3rd… prize of a period. */
export function chanceSteps(startChance: number, base: number, count = 4) {
  return Array.from({ length: count }, (_, i) => {
    const p = startChance / Math.pow(base, i);
    return Number.isInteger(p) ? `${p}%` : `${Number(p.toFixed(1))}%`;
  });
}
