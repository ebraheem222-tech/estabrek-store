/**
 * A/B test numbers (admin → تجارب A/B): is B's rate really different from A's,
 * or is it luck? A two-proportion z-test on "visits that added to the bag" and
 * "visits that ordered". A winner is named only with 95% confidence, at least
 * MIN_VISITS visits on each side and MIN_CONVERSIONS between them; before that
 * it's "too early", after that without 95% it's "no clear difference yet".
 */

export const MIN_VISITS = 100;
export const MIN_CONVERSIONS = 10;
export const CONFIDENCE = 0.95;

/** erf, Abramowitz–Stegun 7.1.26 (error under 1.5e-7). */
function erf(x: number) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

export const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

export type Side = { visits: number; conversions: number };
export type Verdict = "early" | "A" | "B" | "same";

export type Comparison = {
  rateA: number;
  rateB: number;
  /** (B − A) / A; null when A is 0. */
  lift: number | null;
  /** 1 − p (two-sided). */
  confidence: number;
  verdict: Verdict;
  /** About how many more visits per side until a difference this size would be clear (null when there's no difference). */
  moreVisits: number | null;
};

export function compare(a: Side, b: Side): Comparison {
  const rateA = a.visits ? a.conversions / a.visits : 0;
  const rateB = b.visits ? b.conversions / b.visits : 0;
  const lift = rateA > 0 ? (rateB - rateA) / rateA : null;
  let confidence = 0;
  if (a.visits && b.visits) {
    const p = (a.conversions + b.conversions) / (a.visits + b.visits);
    const se = Math.sqrt(p * (1 - p) * (1 / a.visits + 1 / b.visits));
    if (se > 0) confidence = 1 - 2 * (1 - normalCdf(Math.abs(rateB - rateA) / se));
  }
  confidence = Math.max(0, Math.min(1, confidence));
  const early = a.visits < MIN_VISITS || b.visits < MIN_VISITS || a.conversions + b.conversions < MIN_CONVERSIONS;
  const verdict: Verdict = early ? "early" : confidence >= CONFIDENCE ? (rateB > rateA ? "B" : "A") : "same";
  // Visits per side for 95% confidence and 80% power at the difference seen now.
  let moreVisits: number | null = null;
  const d = rateB - rateA;
  if (d !== 0) {
    const need = ((1.96 + 0.8416) ** 2 * (rateA * (1 - rateA) + rateB * (1 - rateB))) / (d * d);
    moreVisits = Math.max(0, Math.ceil(need - Math.min(a.visits, b.visits)));
  }
  return { rateA, rateB, lift, confidence, verdict, moreVisits };
}

export type SideTotals = { visits: number; bags: number; orders: number; revenue: number };

/** Both measures for one test, plus revenue per visit. */
export function testResults(a: SideTotals, b: SideTotals) {
  return {
    a,
    b,
    bags: compare({ visits: a.visits, conversions: a.bags }, { visits: b.visits, conversions: b.bags }),
    orders: compare({ visits: a.visits, conversions: a.orders }, { visits: b.visits, conversions: b.orders }),
    revenuePerVisit: { a: a.visits ? a.revenue / a.visits : 0, b: b.visits ? b.revenue / b.visits : 0 },
  };
}
