"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRecentlyViewed, type RecentlyViewedItem } from "@/store/recentlyViewed";
import { HISTORY_EVENT, clearRazanHistory, readRazanHistory } from "@/lib/razanHistory";
import { cldUrl } from "@/lib/cloudinary";

function ago(ts: number, ar: boolean) {
  const m = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (m < 60) return ar ? (m === 1 ? "قبل دقيقة" : m === 2 ? "قبل دقيقتين" : `قبل ${m} دقيقة`) : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? (h === 1 ? "قبل ساعة" : h === 2 ? "قبل ساعتين" : `قبل ${h} ساعات`) : `${h} h ago`;
  const d = Math.floor(h / 24);
  return ar ? (d === 1 ? "مبارح" : `قبل ${d} أيام`) : `${d} d ago`;
}

/** The piece as she left it: same colour and size. */
export function pieceHref(slug: string, color?: string | null, size?: string | null) {
  const q = new URLSearchParams();
  if (color) q.set("c", color);
  if (size) q.set("s", size);
  const qs = q.toString();
  return `/p/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}

/** «شو كنتِ شايفة»: what she opened, searched and took out of the bag (her device only). */
export function RazanHistory({ ar, onPick }: { ar: boolean; onPick: () => void }) {
  const { items, clearRecentlyViewed } = useRecentlyViewed();
  const [extra, setExtra] = useState(() => readRazanHistory());
  useEffect(() => {
    const refresh = () => setExtra(readRazanHistory());
    refresh();
    window.addEventListener(HISTORY_EVENT, refresh);
    return () => window.removeEventListener(HISTORY_EVENT, refresh);
  }, []);

  const hour = Date.now() - 3600_000;
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const groups: Array<{ title: string; list: RecentlyViewedItem[] }> = [
    { title: ar ? "قبل شوي" : "Just now", list: items.filter((i) => i.viewedAt >= hour) },
    { title: ar ? "اليوم" : "Today", list: items.filter((i) => i.viewedAt < hour && i.viewedAt >= startOfDay) },
    { title: ar ? "قبل" : "Earlier", list: items.filter((i) => i.viewedAt < startOfDay) },
  ].filter((g) => g.list.length);
  const empty = !items.length && !extra.searches.length && !extra.removed.length;

  return (
    <div className="razan-history" data-testid="razan-history">
      {empty ? (
        <p className="razan-history-empty">{ar ? "لسا ما شفتي إشي. لما تفتحي قطع بتلاقيها هون." : "Nothing yet. Pieces you open show up here."}</p>
      ) : null}
      {groups.map((g) => (
        <section key={g.title}>
          <h4>{g.title}</h4>
          <ul>
            {g.list.map((i) => (
              <li key={i.id}>
                <Link href={pieceHref(i.slug, i.color, i.size)} onClick={onPick}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image ? <img src={cldUrl(i.image, { w: 120, h: 150, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="razan-history-noimg" />}
                  <span className="razan-history-info">
                    <b>{i.title}</b>
                    <small>{[i.color, i.size].filter(Boolean).join(" · ")}{i.color || i.size ? " · " : ""}{ago(i.viewedAt, ar)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {extra.removed.length ? (
        <section>
          <h4>{ar ? "شلتيها من الحقيبة" : "Taken out of your bag"}</h4>
          <ul>
            {extra.removed.map((r) => (
              <li key={r.id}>
                {r.slug ? (
                  <Link href={pieceHref(r.slug, r.color, r.size)} onClick={onPick}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image ? <img src={cldUrl(r.image, { w: 120, h: 150, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="razan-history-noimg" />}
                    <span className="razan-history-info">
                      <b>{r.title}</b>
                      <small>{[r.color, r.size].filter((x) => x && x.toLowerCase() !== "default").join(" · ")} · {ago(r.at, ar)}</small>
                    </span>
                  </Link>
                ) : (
                  <span className="razan-history-info"><b>{r.title}</b></span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {extra.searches.length ? (
        <section>
          <h4>{ar ? "دوّرتي على" : "You searched for"}</h4>
          <div className="razan-history-searches">
            {extra.searches.map((s) => (
              <Link key={s.q} href={`/search?q=${encodeURIComponent(s.q)}`} onClick={onPick}>
                🔎 {s.q}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {!empty ? (
        <button type="button" className="razan-history-clear" onClick={() => { clearRecentlyViewed(); clearRazanHistory(); }}>
          {ar ? "امسحي سجلّي" : "Clear my history"}
        </button>
      ) : null}
      <p className="razan-history-note">{ar ? "محفوظ على جهازكِ بس، وبينمسح لحاله." : "Kept on your device only, and it clears itself."}</p>
    </div>
  );
}
