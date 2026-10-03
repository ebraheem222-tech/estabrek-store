"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ProgressState = {
  value: number;
  active: boolean;
};

export function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<ProgressState>({ value: 0, active: false });
  const stateRef = useRef(state);
  const tickRef = useRef<number | null>(null);
  const doneRef = useRef<number | null>(null);
  const lastStartRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopTimers = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (doneRef.current != null) {
      window.clearTimeout(doneRef.current);
      doneRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    const now = performance.now();
    if (now - lastStartRef.current < 120) return;
    lastStartRef.current = now;
    stopTimers();
    setState({ value: 8, active: true });
    tickRef.current = window.setInterval(() => {
      setState((prev) => {
        if (!prev.active) return prev;
        const next = Math.min(90, prev.value + Math.max(1, (95 - prev.value) * 0.08));
        return next === prev.value ? prev : { ...prev, value: next };
      });
    }, 180);
  }, [stopTimers]);

  const shouldStartForUrl = useCallback((url: unknown) => {
    if (!url) return false;
    const href = String(url);
    if (!href || href.startsWith("#")) return false;
    try {
      const next = new URL(href, window.location.href);
      const current = new URL(window.location.href);
      if (next.origin !== current.origin) return false;
      if (next.pathname === current.pathname && next.search === current.search && next.hash === current.hash) {
        return false;
      }
      if (next.hash && next.pathname === current.pathname && next.search === current.search) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }, []);

  const finish = useCallback(() => {
    if (!stateRef.current.active) return;
    stopTimers();
    setState((prev) => ({ ...prev, value: 100 }));
    doneRef.current = window.setTimeout(() => {
      setState({ value: 0, active: false });
    }, 280);
  }, [stopTimers]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
      if (shouldStartForUrl(args[2])) start();
      return originalPush(...args);
    }) as History["pushState"];

    window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
      if (shouldStartForUrl(args[2])) start();
      return originalReplace(...args);
    }) as History["replaceState"];

    const onPopState = () => start();
    window.addEventListener("popstate", onPopState);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.getAttribute("target") && anchor.getAttribute("target") !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!shouldStartForUrl(href)) return;
      start();
    };

    document.addEventListener("click", onClick, true);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
    };
  }, [start, shouldStartForUrl]);

  useEffect(() => {
    finish();
  }, [pathname, finish]);

  if (!state.active && state.value === 0) return null;

  return (
    <div className="route-progress" data-active={state.active ? "true" : "false"} aria-hidden="true">
      <div className="route-progress__bar" style={{ width: `${state.value}%` }} />
    </div>
  );
}
