export type Billing = "monthly" | "yearly";
export type PlanAmounts = { price: string; period?: string; yearlyPrice?: string; yearlyPeriod?: string };

/** Annual amounts are merchant content; no calculated discounts or monthly fallback. */
export function planBilling(plan: PlanAmounts, billing: Billing): { price: string; period: string } {
  const price = billing === "yearly" ? plan.yearlyPrice ?? "" : plan.price;
  return { price, period: price ? (billing === "yearly" ? plan.yearlyPeriod ?? "" : plan.period ?? "") : "" };
}
