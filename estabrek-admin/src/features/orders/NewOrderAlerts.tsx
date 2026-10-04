// New-order alerts for the whole admin: the summary is polled every 30 seconds,
// and each order that wasn't seen yet gets a card, a soft chime, a browser
// notification (when allowed) and a count in the tab title and the sidebar.
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrdersSummary } from "../../hooks/useOrders";
import { shekel, sourceLabel, timeAgo } from "../../lib/orders";
import { WhatsAppIcon } from "./orderUi";
import { chime, setSoundEnabled, soundEnabled } from "./orderSound";
import { useNewOrdersCount } from "./useNewOrdersCount";

const SEEN_KEY = "estabrek_admin_seen_new_orders_v1";

type Latest = { id: string; customerName: string; total?: string | number | null; city?: string | null; source?: string | null; createdAt: string };

function readSeen(): Set<string> | null {
  try {
    const v = localStorage.getItem(SEEN_KEY);
    return v ? new Set(JSON.parse(v) as string[]) : null;
  } catch {
    return null;
  }
}
function writeSeen(s: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200))); } catch { /* storage blocked */ }
}

export function NewOrderAlerts() {
  const nav = useNavigate();
  const q = useOrdersSummary();
  const [cards, setCards] = useState<Latest[]>([]);
  const baseTitle = useRef(document.title.replace(/^\(\d+\)\s*/, ""));
  const newCount = q.data?.counts?.NEW ?? 0;

  // Tab title shows how many orders wait.
  useEffect(() => {
    document.title = newCount > 0 ? `(${newCount}) ${baseTitle.current}` : baseTitle.current;
  }, [newCount]);
  useEffect(() => () => { document.title = baseTitle.current; }, []);

  useEffect(() => {
    const latest = (q.data?.latestNew ?? []) as Latest[];
    if (!q.isSuccess) return;
    const seen = readSeen();
    if (!seen) {
      // First visit on this device: what is already there is not "new".
      writeSeen(new Set(latest.map((o) => o.id)));
      return;
    }
    const fresh = latest.filter((o) => !seen.has(o.id));
    if (!fresh.length) return;
    fresh.forEach((o) => seen.add(o.id));
    writeSeen(seen);
    // Data from the poll drives the cards; this is the event, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCards((c) => [...fresh, ...c].slice(0, 4));
    if (soundEnabled()) chime();
    if ("Notification" in window && Notification.permission === "granted") {
      for (const o of fresh.slice(0, 3)) {
        const n = new Notification("طلب جديد 🛍", { body: `${o.customerName}${o.total != null ? ` · ${shekel(o.total)}` : ""}${o.city ? ` · ${o.city}` : ""}`, tag: o.id });
        n.onclick = () => { window.focus(); nav(`/admin/orders/${o.id}`); n.close(); };
      }
    }
  }, [q.data, q.isSuccess, nav]);

  // Cards leave by themselves after a while.
  useEffect(() => {
    if (!cards.length) return;
    const t = window.setTimeout(() => setCards((c) => c.slice(0, -1)), 20000);
    return () => window.clearTimeout(t);
  }, [cards]);

  if (!cards.length) return null;
  return (
    <div dir="rtl" className="fixed bottom-24 left-4 z-[45] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-4" aria-live="polite" data-testid="new-order-alerts">
      {cards.map((o, i) => (
        // On phones only the newest card shows, so the screen stays usable.
        <div key={o.id} className={`glass animate-fade-in-up rounded-2xl border border-sky-400/30 bg-surface-950/95 p-3 shadow-2xl ${i > 0 ? "hidden sm:block" : ""}`}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-lg" aria-hidden>🛍</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">طلب جديد من {o.customerName}</div>
              <div className="mt-0.5 text-xs text-white/60">
                {o.total != null ? shekel(o.total) : ""}{o.city ? ` · ${o.city}` : ""} · {sourceLabel(o.source)} · {timeAgo(o.createdAt)}
              </div>
              <div className="mt-2 flex gap-2">
                <Link to={`/admin/orders/${o.id}`} onClick={() => setCards((c) => c.filter((x) => x.id !== o.id))} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-xs font-semibold text-white hover:bg-sky-400">
                  {o.source === "WHATSAPP_CART" ? <WhatsAppIcon className="h-3.5 w-3.5" /> : null}فتح الطلب
                </Link>
                <button type="button" onClick={() => setCards((c) => c.filter((x) => x.id !== o.id))} className="h-8 rounded-lg px-2 text-xs text-white/55 hover:text-white">إخفاء</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Topbar bell: the waiting count, and a one-time switch for browser notifications. */
export function OrdersBell() {
  const count = useNewOrdersCount();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const [sound, setSound] = useState(soundEnabled());
  return (
    <div className="flex items-center gap-1.5">
      {perm === "default" && (
        <button type="button" onClick={() => void Notification.requestPermission().then(setPerm)} className="hidden h-9 rounded-xl border border-white/10 px-3 text-xs text-white/70 hover:bg-white/[0.06] md:inline-flex md:items-center">
          🔔 تفعيل تنبيه الطلبات
        </button>
      )}
      <button type="button" onClick={() => { const v = !sound; setSound(v); setSoundEnabled(v); if (v) chime(); }} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.06]" title={sound ? "إيقاف صوت الطلبات" : "تشغيل صوت الطلبات"} aria-label={sound ? "إيقاف صوت الطلبات" : "تشغيل صوت الطلبات"}>
        {sound ? "🔊" : "🔈"}
      </button>
      <Link to="/admin/orders?status=NEW" className="relative inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-white/80 hover:bg-white/[0.06]" aria-label={`${count} طلبات جديدة`}>
        🛍 <span className="hidden sm:inline">طلبات جديدة</span>
        <span className={count > 0 ? "min-w-[1.25rem] rounded-full bg-sky-400 px-1.5 text-center text-[11px] font-bold text-sky-950" : "text-white/40"}>{count}</span>
      </Link>
    </div>
  );
}
