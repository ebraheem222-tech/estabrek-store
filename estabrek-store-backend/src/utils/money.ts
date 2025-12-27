// src/utils/money.ts
/**
 * Money helpers for stable, accounting-safe totals.
 *
 * We allocate discounts across multiple lines using integer cents to avoid
 * floating point drift and to guarantee:
 *   sum(lineDiscount) === discountAmount
 *   lineDiscount <= lineSubtotal for every line
 */

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function toCents(n: number) {
  // ensure we only deal with 2 decimals before converting
  return Math.round(round2(n) * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

/**
 * Allocate a discount (in cents) across multiple line subtotals (in cents).
 * Returns an array of allocated cents for each line.
 */
export function allocateDiscountAcrossLines(lineSubtotalsCents: number[], discountCents: number) {
  const total = lineSubtotalsCents.reduce((a, b) => a + b, 0);
  if (discountCents <= 0 || total <= 0) return lineSubtotalsCents.map(() => 0);

  // never allocate more than subtotal total
  const discount = Math.min(discountCents, total);

  const raw = lineSubtotalsCents.map((sub) => (discount * sub) / total);
  const base = raw.map((x) => Math.floor(x));
  const frac = raw.map((x, i) => x - base[i]);

  let used = base.reduce((a, b) => a + b, 0);
  let remaining = discount - used;
  if (remaining <= 0) return base;

  // deterministic tie-breakers: higher fractional part first, then higher subtotal, then index
  const order = lineSubtotalsCents
    .map((sub, i) => ({ i, sub, frac: frac[i] }))
    .sort((a, b) => (b.frac - a.frac) || (b.sub - a.sub) || (a.i - b.i));

  let idx = 0;
  while (remaining > 0 && order.length > 0) {
    const t = order[idx % order.length];
    if (base[t.i] < t.sub) {
      base[t.i] += 1;
      remaining -= 1;
    }
    idx += 1;
    // safety break
    if (idx > 1_000_000) break;
  }

  return base;
}

/**
 * Adds lineDiscount and lineTotal to each line (numbers with 2 decimals).
 */
export function annotateLinesWithDiscount<T extends { lineSubtotal: any }>(
  lines: T[],
  discountAmount: number
) {
  const subs = lines.map((l) => toCents(Number((l as any).lineSubtotal ?? 0)));
  const allocated = allocateDiscountAcrossLines(subs, toCents(discountAmount));

  return lines.map((l, i) => {
    const lineSubtotal = Number((l as any).lineSubtotal ?? 0);
    const lineDiscount = fromCents(allocated[i] ?? 0);
    const lineTotal = round2(lineSubtotal - lineDiscount);
    return {
      ...(l as any),
      lineDiscount,
      lineTotal,
    } as T & { lineDiscount: number; lineTotal: number };
  });
}
