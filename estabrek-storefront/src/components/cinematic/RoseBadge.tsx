"use client";

import { visibleBadge, type ProductBadge } from "@/lib/productBadges";
import { useSiteFeatures } from "@/store/siteFeatures";
import { useLanguage } from "./Language";

/** A product's "جديد" / "آخر قطعة" tag on its photo, with the owner's "pieces left" setting (admin → تنبيهات المخزون). */
export function RoseBadge({ badge }: { badge?: ProductBadge | null; ar?: boolean }) {
  const { scarcity } = useSiteFeatures();
  const { language: lang } = useLanguage();
  const shown = visibleBadge(badge, scarcity);
  if (!shown) return null;
  return <span className={`rose-badge rose-badge-${shown.kind}`}>{lang === "ar" ? shown.ar : lang === "he" ? shown.he ?? shown.en : shown.en}</span>;
}
