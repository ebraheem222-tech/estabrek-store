import { useEffect, useMemo, useState } from "react";
import { __toastEventName, type ToastPayload } from "@/lib/toast";

type ToastWithMeta = ToastPayload & { createdAt: number };

function cls(type: ToastPayload["type"]) {
  const base =
    "pointer-events-auto w-[360px] max-w-[90vw] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md";
  if (type === "success") return base + " border-emerald-500/30 bg-emerald-500/10";
  if (type === "error") return base + " border-rose-500/30 bg-rose-500/10";
  return base + " border-slate-500/30 bg-slate-500/10";
}

export default function Toasts() {
  const [items, setItems] = useState<ToastWithMeta[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ToastPayload>;
      const p = ce.detail;
      const createdAt = Date.now();
      const next: ToastWithMeta = { ...p, createdAt };
      setItems((prev) => [next, ...prev].slice(0, 4));

      const duration = Math.max(1500, p.durationMs ?? 3500);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== p.id));
      }, duration);
    };

    window.addEventListener(__toastEventName, handler as EventListener);
    return () => window.removeEventListener(__toastEventName, handler as EventListener);
  }, []);

  const sorted = useMemo(() => items.sort((a, b) => b.createdAt - a.createdAt), [items]);

  if (!sorted.length) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-4 z-[9999] flex flex-col gap-2">
      {sorted.map((t) => (
        <div key={t.id} className={cls(t.type)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90">{t.message}</div>
              {t.description ? <div className="mt-0.5 text-xs text-white/60">{t.description}</div> : null}
            </div>
            <button
              className="pointer-events-auto rounded-xl px-2 py-1 text-xs text-white/60 hover:text-white"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
