/**
 * Tells a tab left open across a deploy that a new admin is out, and offers to reload
 * (src/lib/appVersion.ts). It looks when the tab comes back into view and every few
 * minutes; a part of the admin the server no longer has (after a deploy) says so too.
 * "Later" waits for the next new version. Not on the dev server.
 */
import { useEffect, useState } from "react";
import { latestScript, loadedScript } from "@/lib/appVersion";
import { tr } from "@/lib/words";

const EVERY_MS = 5 * 60_000;

export default function NewVersionNotice({ enabled = !import.meta.env.DEV, fetcher, reload = () => window.location.reload() }: {
  enabled?: boolean;
  fetcher?: typeof fetch;
  reload?: () => void;
}) {
  const [latest, setLatest] = useState<string | null>(null);
  const [later, setLater] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const mine = loadedScript();
    if (!mine) return;
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const now = await latestScript(fetcher);
        if (now && now !== mine) setLatest(now);
      } finally {
        busy = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    // A part of the admin that's gone from the server: the tab is older than the deploy.
    const onMissing = () => setLatest((was) => was ?? "missing");
    const timer = window.setInterval(() => void check(), EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("vite:preloadError", onMissing);
    void check();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("vite:preloadError", onMissing);
    };
  }, [enabled, fetcher]);

  if (!latest || latest === later) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-[10000] mx-auto flex w-[min(34rem,calc(100vw-2rem))] flex-wrap items-center gap-3 rounded-2xl border border-accent-400/40 bg-surface-950 px-4 py-3 text-sm text-white shadow-2xl"
      data-testid="new-version"
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">{tr("في نسخة جديدة من لوحة الإدارة", "A new version of the admin is out")}</div>
        <div className="text-xs text-white/60">{tr("حدّث الصفحة لتشتغل عليها. خلّص اللي بإيدك أول إذا في إشي مش محفوظ.", "Reload to use it. Finish anything unsaved first.")}</div>
      </div>
      <button type="button" className="rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs hover:bg-white/[0.14]" onClick={() => setLater(latest)} data-testid="new-version-later">
        {tr("بعدين", "Later")}
      </button>
      <button type="button" className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-400" onClick={reload} data-testid="new-version-reload">
        {tr("تحديث الآن", "Reload now")}
      </button>
    </div>
  );
}
