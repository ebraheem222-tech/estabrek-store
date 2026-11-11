"use client";
/**
 * The product page's arrival dates by city: the shopper picks her city from the owner's delivery areas
 * (admin → الطلبات → أسعار التوصيل) and sees the days it should arrive and the delivery price there. The
 * days are the area's when the owner set them, else the piece's own; a piece that takes clearly longer
 * (made to order: its fewest days are past the area's most) keeps its own wherever it goes. The city is
 * kept on this device, for the next pieces and the bag.
 */
import { useEffect, useMemo, useState } from "react";
import { deliveryCities, deliveryFor, normalizeDelivery, rememberCity, rememberedCity } from "@/lib/delivery";
import { arrivalDays, arrivalText, type Delivery } from "@/lib/deliveryTime";
import { formatMoney } from "@/lib/catalog";
import { tr } from "@/lib/words";
import { useSiteFeatures } from "@/store/siteFeatures";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

const OTHER = "__other";

export function RoseDeliveryCity({ days, price, currency }: { days: Delivery | null | undefined; price: number | null; currency?: string }) {
  const { language: lang } = useLanguage();
  const { delivery: raw } = useSiteFeatures();
  const delivery = useMemo(() => normalizeDelivery(raw), [raw]);
  const groups = useMemo(() => deliveryCities(delivery).filter((g) => g.cities.length), [delivery]);
  const [city, setCity] = useState("");
  // Her city from before (this device), once the page is on screen.
  useEffect(() => {
    const saved = rememberedCity();
    if (saved) setCity(saved);
  }, []);
  if (!groups.length) return null;

  const known = groups.some((g) => g.cities.includes(city));
  const choice = city === OTHER || (city && !known) ? OTHER : city;
  const pick = (value: string) => {
    setCity(value);
    if (value && value !== OTHER) rememberCity(value);
  };

  let line: string | null = null;
  let fee: string | null = null;
  if (choice) {
    const ship = deliveryFor(choice === OTHER ? "" : choice, price ?? 0, delivery);
    const zone = choice === OTHER ? null : ship.zone;
    const range = arrivalDays(zone, days);
    line = range ? arrivalText(range, lang) : null;
    const base = zone ? zone.fee : delivery.defaultFee;
    if (ship.free) fee = tr(lang, "التوصيل مجاني", "Free delivery");
    else if (base != null) {
      fee = base === 0 ? tr(lang, "التوصيل مجاني", "Free delivery") : tr(lang, `التوصيل ${formatMoney(base, currency)}`, "Delivery {0}", [formatMoney(base, currency)]);
      if (base > 0 && delivery.freeOver != null) fee += tr(lang, ` · مجاني فوق ${formatMoney(delivery.freeOver, currency)}`, " · free over {0}", [formatMoney(delivery.freeOver, currency)]);
    } else fee = tr(lang, "سعر التوصيل منأكده معكِ", "We confirm the delivery price with you");
  }

  return (
    <div className="rose-pdp-city" data-testid="delivery-city">
      <label>
        <Icon name="truck" />
        <span>{tr(lang, "التوصيل لـ", "Deliver to")}</span>
        <select value={choice} onChange={(e) => pick(e.target.value)} aria-label={tr(lang, "مدينة التوصيل", "Delivery city")}>
          <option value="">{tr(lang, "اختيار المدينة", "Pick a city")}</option>
          {groups.map((g) => (
            <optgroup key={g.zone} label={g.zone}>
              {g.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
          <option value={OTHER}>{tr(lang, "مدينة تانية", "Another city")}</option>
        </select>
      </label>
      {choice ? (
        <p aria-live="polite">
          {line ? <b>{line}</b> : null}
          {fee ? <span>{fee}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
