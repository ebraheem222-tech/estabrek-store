"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { LoadingImg } from "@/components/LoadingImg";
import { useLanguage } from "./Language";

const DISMISS_KEY = "estabrek_recent_hidden";
const FIRST_DELAY = 6000; // let the page be seen first
const VISIBLE_FOR = 7000; // then a short reminder…
const GAP = 45000; // …and the next one much later

function ago(ts: number, ar: boolean) {
  const m = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (m < 60) return ar ? (m === 1 ? "منذ دقيقة" : m === 2 ? "منذ دقيقتين" : m <= 10 ? `منذ ${m} دقائق` : `منذ ${m} دقيقة`) : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? (h === 1 ? "منذ ساعة" : h === 2 ? "منذ ساعتين" : h <= 10 ? `منذ ${h} ساعات` : `منذ ${h} ساعة`) : `${h} h ago`;
  return ar ? "منذ أيام" : "days ago";
}

/**
 * A small reminder of a piece she looked at before, in the rose design.
 * It is not a permanent box: it slides in for a few seconds now and then,
 * never on the product page she is already on, and the × hides it for the visit.
 */
export function RoseRecentlyViewed() {
  const ar = useLanguage().language === "ar";
  const pathname = usePathname();
  const { items } = useRecentlyViewed();
  const list = useMemo(() => items.filter((it) => pathname !== `/p/${it.slug}`).slice(0, 5), [items, pathname]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  useEffect(() => {
    if (dismissed || !list.length) return;
    let timer = 0;
    const cycle = (delay: number) => {
      timer = window.setTimeout(() => {
        setShown(true);
        timer = window.setTimeout(() => {
          setShown(false);
          setIndex((i) => (i + 1) % list.length);
          cycle(GAP);
        }, VISIBLE_FOR);
      }, delay);
    };
    setShown(false);
    cycle(FIRST_DELAY);
    return () => window.clearTimeout(timer);
  }, [dismissed, list.length, pathname]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (shown) gsap.fromTo(el, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" });
    else gsap.to(el, { autoAlpha: 0, y: 12, duration: 0.3, ease: "power2.in" });
  }, [shown]);

  if (dismissed || !list.length) return null;
  const item = list[index % list.length];

  const hide = () => {
    setShown(false);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    window.setTimeout(() => setDismissed(true), 320);
  };

  return (
    <div ref={box} className="recent-activity-popup rose-recent" role="status" aria-live="polite" aria-hidden={!shown} style={{ visibility: "hidden", opacity: 0 }}>
      <Link href={`/p/${item.slug}`} className="rose-recent-link" tabIndex={shown ? 0 : -1}>
        <span className="rose-recent-thumb">
          {item.image ? <LoadingImg src={item.image} alt="" blurDataUrl={item.imageBlurDataUrl ?? undefined} className="h-full w-full object-cover" /> : null}
        </span>
        <span className="rose-recent-text">
          <small>{ar ? "شاهدتِها مؤخراً" : "You viewed"} · {ago(item.viewedAt, ar)}</small>
          <b>{item.title}</b>
        </span>
      </Link>
      <button type="button" className="rose-recent-close" onClick={hide} tabIndex={shown ? 0 : -1} aria-label={ar ? "إخفاء" : "Hide"}>×</button>
    </div>
  );
}
