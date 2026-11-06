"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { STUDIO_SOURCE, StudioBridge } from "./StudioBridge";

/** Refresh the server-rendered view while keeping its document and client widgets alive. */
export function StudioViewBridge({ origins, pageId, lang, viewVersion, viewRequest }: { origins: string[]; pageId: string; lang: string; viewVersion: string; viewRequest: string | null }) {
  const router = useRouter();
  const originKey = JSON.stringify(origins);
  const trusted = useMemo<string[]>(() => JSON.parse(originKey), [originKey]);
  const version = useRef(viewVersion);
  version.current = viewVersion;
  const pending = useRef<{ requestId: string; before: string; origin: string } | null>(null);
  const refresh = useCallback((requestId: string, origin: string) => {
    pending.current = { requestId, before: version.current, origin };
    const url = new URL(window.location.href);
    url.searchParams.set("__studioView", requestId);
    // A unique, server-echoed request prevents an unrelated/older RSC response
    // from acknowledging a newer edit. Same-route replacement keeps the view alive.
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const request = pending.current;
    if (!request || request.before === viewVersion || request.requestId !== viewRequest) return;
    pending.current = null;
    let second = 0;
    const first = requestAnimationFrame(() => {
      // Measurement runs before acknowledgement on the next frame, after the DOM
      // and styles committed. The admin can then release temporary gesture CSS.
      // Release temporary styles first, then let media inspect the final view.
      window.dispatchEvent(new Event("studio-view-commit"));
      window.dispatchEvent(new Event("studio-view-updated"));
      second = requestAnimationFrame(() => window.parent.postMessage({ source: STUDIO_SOURCE, type: "viewUpdated", requestId: request.requestId, viewVersion, pageId, lang }, request.origin));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [viewVersion, viewRequest, pageId, lang]);

  return <><span hidden data-studio-view-version={viewVersion} /><StudioBridge origins={trusted} pageId={pageId} lang={lang} onRefresh={refresh} /></>;
}
