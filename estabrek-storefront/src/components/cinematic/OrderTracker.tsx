"use client";
/**
 * Where an order is: received → being prepared → on its way → delivered, each step with when it happened, and the
 * days it should arrive once it is on its way (from the delivery area of its city, admin → أسعار التوصيل). A
 * cancelled, refused or refunded order says so instead. Shown in her account (RoseAccount) and on «تابعي طلبكِ»
 * (RoseTrack) for an order placed without one.
 */
import { useMemo } from "react";
import type { Lang } from "@/lib/i18n";
import { deliveryFor, normalizeDelivery } from "@/lib/delivery";
import { arrivalDays, arrivalText } from "@/lib/deliveryTime";
import { tr } from "@/lib/words";
import { useSiteFeatures } from "@/store/siteFeatures";
import { useLanguage } from "./Language";

export type OrderStep = { status: string; at: string };

const PATH = ["NEW", "ACCEPTED", "SHIPPED", "CLOSED"] as const;
const STOPPED = ["REJECTED", "CANCELED", "REFUNDED"];

function stepName(status: string, lang: Lang) {
  if (status === "NEW") return tr(lang, "وصلنا طلبكِ", "We have your order");
  if (status === "ACCEPTED") return tr(lang, "قيد التجهيز", "Being prepared");
  if (status === "SHIPPED") return tr(lang, "بالطريق إليكِ", "On its way");
  if (status === "CLOSED") return tr(lang, "وصل", "Delivered");
  if (status === "REJECTED") return tr(lang, "ما تمّ الطلب", "Not completed");
  if (status === "CANCELED") return tr(lang, "انلغى الطلب", "Cancelled");
  if (status === "REFUNDED") return tr(lang, "رجع المبلغ", "Refunded");
  return status;
}

function when(iso: string, lang: Lang) {
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : lang === "he" ? "he-IL" : "en-GB", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function OrderTracker({ status, steps, city }: { status: string; steps: OrderStep[]; city?: string | null }) {
  const { language: lang } = useLanguage();
  const { delivery: raw } = useSiteFeatures();
  const at = (s: string) => steps.find((x) => x.status === s)?.at ?? null;
  // How far along the path: "we contacted you" counts as received.
  const reached = Math.max(PATH.indexOf((status === "CONTACTED" ? "NEW" : status) as (typeof PATH)[number]), 0);
  const arrival = useMemo(() => {
    if (status !== "SHIPPED" || !at("SHIPPED")) return null;
    const zone = deliveryFor(city ?? "", 0, normalizeDelivery(raw)).zone;
    const range = arrivalDays(zone, null);
    return range ? arrivalText(range, lang, new Date(at("SHIPPED")!)) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, city, raw, lang, steps]);

  if (STOPPED.includes(status)) {
    const stopped = at(status);
    return (
      <p className="rose-track-stopped" data-testid="order-tracker" data-status={status}>
        <b>{stepName(status, lang)}</b>
        {stopped ? <span>{when(stopped, lang)}</span> : null}
      </p>
    );
  }

  const contacted = at("CONTACTED");
  return (
    <div className="rose-track" data-testid="order-tracker" data-status={status}>
      <ol aria-label={tr(lang, "مراحل الطلب", "Order progress")} style={{ "--reached": reached } as React.CSSProperties}>
        {PATH.map((s, i) => {
          const time = at(s);
          const state = i < reached ? "done" : i === reached ? "now" : "next";
          return (
            <li key={s} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <i aria-hidden="true" />
              <b>{stepName(s, lang)}</b>
              {time && state !== "next" ? <time dateTime={time}>{when(time, lang)}</time> : null}
              {s === "NEW" && contacted ? <small>{tr(lang, `تواصلنا معكِ ${when(contacted, lang)}`, "We contacted you {0}", [when(contacted, lang)])}</small> : null}
            </li>
          );
        })}
      </ol>
      {arrival ? <p className="rose-track-arrival" data-testid="order-arrival">{arrival}</p> : null}
    </div>
  );
}
