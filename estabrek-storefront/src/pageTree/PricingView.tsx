"use client";
import { useState } from "react";
import { planBilling, type Billing, type PlanAmounts } from "./billing";
import styles from "./PricingView.module.css";

export type PricingPlan = PlanAmounts & { name: string; badge: string; featured: boolean; features: string[]; cta: string; href: string | null };
export function PricingView({ items, initialBilling, monthly, yearly, unavailable, className, mark }: { items: PricingPlan[]; initialBilling: Billing; monthly: string; yearly: string; unavailable: string; className: string; mark: Record<string, string> }) {
  const [billing, setBilling] = useState<Billing>(initialBilling);
  return <div className={`${className} ${styles.pricing}`} {...mark}>
    <div className="pt-billing" role="group" aria-label={`${monthly} / ${yearly}`}>
      <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>{monthly}</button>
      <button type="button" aria-pressed={billing === "yearly"} onClick={() => setBilling("yearly")}>{yearly}</button>
    </div>
    <div className="pt-plans" aria-live="polite" aria-atomic="true">
      {items.map((item, index) => {
        const amount = planBilling(item, billing);
        return <div key={index} className={`pt-plan${item.featured ? " pt-plan-featured" : ""}`}>
          {item.badge ? <span className="pt-plan-badge">{item.badge}</span> : null}
          <div className="pt-plan-name">{item.name}</div>
          <div><span className={`pt-plan-price${!amount.price ? " pt-plan-unspecified" : ""}`}>{amount.price || unavailable}</span>{amount.period ? <span className="pt-plan-period"> {amount.period}</span> : null}</div>
          {item.features.length ? <ul>{item.features.map((feature, i) => <li key={i}>{feature}</li>)}</ul> : null}
          {item.cta && item.href ? <a className={`pt-btn ${item.featured ? "pt-btn-solid" : "pt-btn-outline"}`} href={item.href}>{item.cta}</a> : null}
        </div>;
      })}
    </div>
  </div>;
}
