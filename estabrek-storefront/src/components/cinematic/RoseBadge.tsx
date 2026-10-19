"use client";

import { visibleBadge, type ProductBadge } from "@/lib/productBadges";
import { useSiteFeatures } from "@/store/siteFeatures";

/** A product's "جديد" / "آخر قطعة" tag on its photo, with the owner's "pieces left" setting (admin → تنبيهات المخزون). */
export function RoseBadge({ badge, ar }: { badge?: ProductBadge | null; ar: boolean }) {
  const { scarcity } = useSiteFeatures();
  const shown = visibleBadge(badge, scarcity);
  if (!shown) return null;
  return <span className={`rose-badge rose-badge-${shown.kind}`}>{ar ? shown.ar : shown.en}</span>;
}
