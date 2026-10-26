"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { LoadingImg } from "@/components/LoadingImg";

function formatTimeAgo(ts: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.max(1, Math.floor(minutes / 60));
  return `${hours} ساعة`;
}

export function RecentActivityPopup() {
  const settings = useStorefrontSettings();
  const { items } = useRecentlyViewed();
  const list = useMemo(() => items.slice(0, 5), [items]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!settings.recentPurchasesPopup || list.length === 0) return;
    const interval = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [list.length, settings.recentPurchasesPopup]);

  if (!settings.recentPurchasesPopup || list.length === 0) return null;

  const item = list[index] ?? list[0];
  if (!item) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 rounded-2xl border border-white/10 bg-[color:var(--surface)]/95 p-3 shadow-lg backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">نشاط مؤخراً</div>
      <div className="mt-2 flex items-center gap-3">
        {item.image ? (
          <LoadingImg
            src={item.image}
            alt={item.title}
            blurDataUrl={item.imageBlurDataUrl ?? undefined}
            className="h-10 w-10 rounded-xl object-cover border border-white/10"
          />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10" />
        )}
        <div className="min-w-0">
          <Link
            href={`/p/${item.slug}`}
            className="block text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)] truncate"
          >
            {item.title}
          </Link>
          <div className="text-xs text-[var(--muted)]">منذ {formatTimeAgo(item.viewedAt)}</div>
        </div>
      </div>
    </div>
  );
}
