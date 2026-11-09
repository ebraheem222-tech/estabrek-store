"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { isNearWhite, storefrontPalette } from "@/lib/storefrontPalette";
import { cldUrl } from "@/lib/cloudinary";
import { tr } from "@/lib/words";
import { useNames } from "@/store/storeIdentity";
import { useLanguage } from "./Language";
import { THEME_STORAGE_KEY } from "./RoseThemeProvider";

/*
 * The moment between a tap and the next page: the store's logo fills up, like a glass, in the colour the
 * shopper picked last (or the colour the page shows), with a thin line along the top and the percentage.
 *
 * It starts on a tap on a link to another page (or back/forward) and ends when the browser shows the new
 * address and no loading screen (`[data-route-loading]` on every app/[lang]/…/loading.tsx) is left. A quick
 * page shows only the line; the veil comes after SHOW_AFTER and, once there, stays long enough to finish.
 * A tap that turns out to load nothing (a link whose tap opens a panel, a drag on the 3D ring) is let go after
 * CHECK_AFTER: no new address and no request for that page (Next asks for it with `?_rsc=`) by then.
 */
const HEX = /^#[0-9a-f]{6}$/i;
const SHOW_AFTER = 160;
const MIN_SHOWN = 650;
const GIVE_UP = 12000;
const CHECK_AFTER = 450;

/** The colour picked last: the page's own pick, the saved one, a category's colour, or the store's rose. */
function lastColour(): string {
  const shell = document.querySelector<HTMLElement>(".cinematic-shell");
  const picked = shell?.dataset.storefrontColor;
  if (picked && HEX.test(picked)) return picked;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && HEX.test(saved)) return saved;
  } catch {
    // private mode: no saved colour
  }
  const bar = shell?.dataset.navbarColor;
  return bar && HEX.test(bar) ? bar : "#a43b64";
}

/** A small wave for the top of the fill (an SVG in the fill colour). */
function waveOf(fill: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 10' preserveAspectRatio='none'><path d='M0 6 Q12 0 24 6 T48 6 V10 H0Z' fill='${fill}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

type Phase = "idle" | "loading" | "leaving";

export function RouteLoader({ logoUrl }: { logoUrl?: string | null }) {
  const { language: lang } = useLanguage();
  const names = useNames();
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(false);
  const [progress, setProgress] = useState(0);
  const [colour, setColour] = useState("#a43b64");
  const logo = useMemo(() => (logoUrl ? cldUrl(logoUrl, { w: 320 }) : null), [logoUrl]);

  // Fetch the logo once, as the mask will (cross-origin), so the first wait shows it at once.
  useEffect(() => {
    if (!logo) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logo;
  }, [logo]);

  useEffect(() => {
    let run: null | { from: string; to: string; started: number; p: number; shownAt: number; showTimer: number; tick: number; giveUp: number } = null;
    let later: number[] = [];
    let lastPath = window.location.pathname;
    // When the router last asked for each page, and whether the whole document is being left (a plain link).
    const pageRequests = new Map<string, number>();
    // Requests still on their way (a page fetched ahead, before the tap, that the tap now waits for).
    const inFlight = new Map<string, number>();
    const pathOf = (path: string) => path.replace(/\/+$/, "") || "/";
    let leaving = false;
    const realFetch = window.fetch;
    const watchedFetch: typeof window.fetch = function (input, init) {
      let path: string | null = null;
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (/[?&]_rsc=/.test(url)) {
          path = pathOf(new URL(url, window.location.href).pathname);
          pageRequests.set(path, performance.now());
          inFlight.set(path, (inFlight.get(path) ?? 0) + 1);
        }
      } catch {
        // never stand in the way of a request
      }
      const request = realFetch.call(window, input, init);
      if (path) {
        const done = () => inFlight.set(path!, Math.max(0, (inFlight.get(path!) ?? 1) - 1));
        request.then(done, done);
      }
      return request;
    };
    window.fetch = watchedFetch;
    const onLeave = () => { leaving = true; };
    const clearLater = () => { later.forEach(window.clearTimeout); later = []; };

    // `nothing`: the tap loaded no page; the loader just goes (no fill to the top).
    const finish = (nothing = false) => {
      if (!run) return;
      const r = run;
      run = null;
      window.clearTimeout(r.showTimer);
      window.clearInterval(r.tick);
      window.clearTimeout(r.giveUp);
      lastPath = window.location.pathname;
      if (nothing) {
        setPhase("leaving");
        later.push(window.setTimeout(() => { setPhase("idle"); setShown(false); setProgress(0); }, 260));
        return;
      }
      setProgress(1);
      if (!r.shownAt) {
        later.push(window.setTimeout(() => { setPhase("idle"); setProgress(0); }, 260));
        return;
      }
      // Let the fill reach the top, then fade.
      const stay = Math.max(0, MIN_SHOWN - (performance.now() - r.shownAt)) + 280;
      later.push(window.setTimeout(() => setPhase("leaving"), stay));
      later.push(window.setTimeout(() => { setPhase("idle"); setShown(false); setProgress(0); }, stay + 420));
    };

    const begin = (from: string, to: string) => {
      if (run) return;
      clearLater();
      setColour(lastColour());
      setShown(false);
      setProgress(0.04);
      setPhase("loading");
      const r = { from, to: pathOf(to), started: performance.now(), p: 0.04, shownAt: 0, showTimer: 0, tick: 0, giveUp: 0 };
      run = r;
      r.showTimer = window.setTimeout(() => {
        if (run !== r) return;
        r.shownAt = performance.now();
        setShown(true);
      }, SHOW_AFTER);
      r.tick = window.setInterval(() => {
        if (run !== r) return;
        if (window.location.pathname !== r.from && !document.querySelector("[data-route-loading]")) return finish();
        const loading = (pageRequests.get(r.to) ?? 0) >= r.started || (inFlight.get(r.to) ?? 0) > 0;
        if (!leaving && !loading && window.location.pathname === r.from && performance.now() - r.started > CHECK_AFTER) return finish(true);
        // Up quickly at first, then slower and slower towards 92%.
        r.p += (0.92 - r.p) * 0.06;
        setProgress(r.p);
      }, 90);
      r.giveUp = window.setTimeout(() => finish(true), GIVE_UP);
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download") || "noLoader" in link.dataset) return;
      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (/\.(pdf|png|jpe?g|webp|gif|zip|mp4|webm)$/i.test(url.pathname)) return;
      begin(window.location.pathname, url.pathname);
    };
    const onPop = () => begin(lastPath, window.location.pathname);

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onLeave);
      if (window.fetch === watchedFetch) window.fetch = realFetch;
      clearLater();
      if (run) {
        window.clearTimeout(run.showTimer);
        window.clearInterval(run.tick);
        window.clearTimeout(run.giveUp);
      }
    };
  }, []);

  if (phase === "idle") return null;
  const palette = storefrontPalette(colour);
  const fill = isNearWhite(colour) ? palette["--selection-accent"] : colour;
  const style = {
    "--route-fill": fill,
    "--route-veil": palette["--selection-page"],
    "--route-ink": palette["--selection-ink"],
    "--route-p": progress,
    "--route-wave": waveOf(fill),
    ...(logo ? { "--route-logo": `url("${logo}")` } : {}),
  } as CSSProperties;
  const percent = Math.round(progress * 100);
  return (
    <div className="rose-route-loader" data-phase={phase} data-shown={shown ? "true" : undefined} data-route-colour={colour} style={style} role="status" aria-live="polite">
      <span className="rose-route-line" aria-hidden="true" />
      <div className="rose-route-veil" aria-hidden="true">
        <div className="rose-route-mark">
          <svg className="rose-route-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47" pathLength={100} />
            <circle cx="50" cy="50" r="47" pathLength={100} style={{ strokeDashoffset: 100 - percent }} />
          </svg>
          {logo ? (
            <span className="rose-route-logo-box">
              <span className="rose-route-logo rose-route-logo-base" />
              <span className="rose-route-logo rose-route-logo-fill" />
              <span className="rose-route-logo rose-route-logo-wave" />
            </span>
          ) : null}
        </div>
        <span className="rose-route-name">{names.store}</span>
        <span className="rose-route-percent">{percent}%</span>
      </div>
      <span className="sr-only">{tr(lang, "عم تنفتح الصفحة…", "Opening the page…")}</span>
    </div>
  );
}
