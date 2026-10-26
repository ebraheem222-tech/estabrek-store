"use client";
/**
 * Razan's settings for the whole shop (admin → «رزان»). The owner can try
 * changes before saving: the admin opens the shop with ?razan-preview=<id>,
 * those settings apply in this tab only, with a small banner to end it.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { RAZAN_DEFAULTS, normalizeRazan, type RazanSettings } from "@/lib/razanSettings";
import { setRazanRuntime } from "@/lib/razanRuntime";

const PREVIEW_KEY = "razan_preview";
const Ctx = createContext<{ settings: RazanSettings; preview: boolean }>({ settings: RAZAN_DEFAULTS, preview: false });

export function RazanProvider({ value, children }: { value?: unknown; children: React.ReactNode }) {
  const saved = useMemo(() => normalizeRazan(value), [value]);
  const [preview, setPreview] = useState<RazanSettings | null>(null);

  useEffect(() => {
    let alive = true;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("razan-preview");
    if (id) {
      // The link is cleaned only once the preview is read (a remount in between reads it again).
      const strip = () => {
        url.searchParams.delete("razan-preview");
        window.history.replaceState(window.history.state, "", url.toString());
      };
      fetch(`${apiBaseClient()}/razan/preview/${encodeURIComponent(id)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return;
          strip();
          if (!d?.razan) return;
          const s = normalizeRazan(d.razan);
          try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(s)); sessionStorage.removeItem("razan_bubbles"); } catch { /* ignore */ }
          setPreview(s);
        })
        .catch(() => alive && strip());
    } else {
      try {
        const kept = sessionStorage.getItem(PREVIEW_KEY);
        if (kept) setPreview(normalizeRazan(JSON.parse(kept)));
      } catch { /* ignore */ }
    }
    return () => { alive = false; };
  }, []);

  const settings = preview ?? saved;
  setRazanRuntime(settings);
  useEffect(() => { setRazanRuntime(settings); }, [settings]);

  const end = () => {
    try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ }
    setPreview(null);
  };

  return (
    <Ctx.Provider value={{ settings, preview: Boolean(preview) }}>
      {children}
      {preview ? (
        <div className="razan-preview-bar" role="status" data-testid="razan-preview">
          <span>👀 معاينة إعدادات رزان — مش محفوظة، بتشوفها إنتَ بس</span>
          <button type="button" onClick={end}>إنهاء المعاينة</button>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useRazan() {
  return useContext(Ctx).settings;
}
