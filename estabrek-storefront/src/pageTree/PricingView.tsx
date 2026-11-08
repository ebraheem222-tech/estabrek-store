"use client";
import { useState, type ReactNode } from "react";
import { planBilling, type Billing, type PlanAmounts } from "./billing";
import styles from "./PricingView.module.css";

export type PricingPlan = PlanAmounts & { sourceIndex?: number; featureLines?: number[]; name: string; badge: string; featured: boolean; features: string[]; cta: string; href: string | null };
export function PricingView({ items, initialBilling, monthly, yearly, unavailable, className, mark, decoration }: { decoration?: ReactNode; items: PricingPlan[]; initialBilling: Billing; monthly: string; yearly: string; unavailable: string; className: string; mark: Record<string, string> }) {
  const [billing, setBilling] = useState<Billing>(initialBilling);
  return <div className={`${className} ${styles.pricing}`} {...mark}>
    {decoration}
    <div className="pt-billing" role="group" aria-label={`${monthly} / ${yearly}`}>
      <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>{monthly}</button>
      <button type="button" aria-pressed={billing === "yearly"} onClick={() => setBilling("yearly")}>{yearly}</button>
    </div>
    <div className="pt-plans" aria-live="polite" aria-atomic="true">
      {items.map((item, index) => {
        const amount = planBilling(item, billing);
        const source = (key: string) => item.sourceIndex !== undefined ? `items.${item.sourceIndex}.${key}` : undefined;
        return <div key={index} className={`pt-plan${item.featured ? " pt-plan-featured" : ""}`}>
          {item.badge ? <span data-pt-field={source("badge")} className="pt-plan-badge">{item.badge}</span> : null}
          <div data-pt-field={source("name")} className="pt-plan-name">{item.name}</div>
          <div><span data-pt-field={source(billing === "yearly" && item.yearlyPrice ? "yearlyPrice" : "price")} className={`pt-plan-price${!amount.price ? " pt-plan-unspecified" : ""}`}>{amount.price || unavailable}</span>{amount.period ? <span data-pt-field={source(billing === "yearly" && item.yearlyPrice ? "yearlyPeriod" : "period")} className="pt-plan-period"> {amount.period}</span> : null}</div>
          {item.features.length ? <ul>{item.features.map((feature, i) => <li key={i} data-pt-field={source("features")} data-pt-field-line={item.featureLines?.[i] ?? i}>{feature}</li>)}</ul> : null}
          {item.cta && item.href ? <a data-pt-field={source("cta")} className={`pt-btn ${item.featured ? "pt-btn-solid" : "pt-btn-outline"}`} href={item.href}>{item.cta}</a> : null}
        </div>;
      })}
    </div>
  </div>;
}
