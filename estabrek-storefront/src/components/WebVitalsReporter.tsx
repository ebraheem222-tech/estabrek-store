"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { apiBaseClient } from "@/lib/apiClient";
import { motionSettings } from "@/lib/motionSettings";
import { motionStats } from "@/lib/motionBudget";
import { createScrollMeter, deviceKind, osKind, pageKind, type RumPage } from "@/lib/rum";

/**
 * Real shoppers' speed: one small report per page, when it's left or hidden
 * (admin → مراقبة السرعة والأولوية → تجربة الزباين). It says only what kind of
 * page, what kind of device and system, and the numbers: load (LCP, FCP, TTFB),
 * taps (INP), jumps (CLS), scrolling frames a second and late frames, and the 3D
 * scenes' frames a second. No address, no browser string, no cookies. The admin
 * sets the share of visits that report (motion settings → rumPercent); browsers
 * asking not to be tracked send nothing.
 */
type Numbers = Partial<Record<"lcp" | "inp" | "cls" | "fcp" | "ttfb" | "scrollFps" | "slowFrames" | "sceneFps", number>>;

const NAMES: Record<Metric["name"], keyof Numbers | null> = { LCP: "lcp", INP: "inp", CLS: "cls", FCP: "fcp", TTFB: "ttfb", FID: null };

function asksNotToTrack() {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1";
}

let unsupported = false;

function send(page: RumPage, m: Numbers) {
  if (unsupported || !Object.keys(m).length) return;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const record = {
    page,
    device: deviceKind(coarse, Math.min(screen.width || innerWidth, screen.height || innerHeight)),
    os: osKind(navigator.userAgent, navigator.maxTouchPoints || 0),
    m,
  };
  try {
    void fetch(`${apiBaseClient()}/storefront/rum`, {
      method: "POST",
      body: JSON.stringify({ r: [record] }),
      headers: { "Content-Type": "text/plain" },
      credentials: "omit",
      keepalive: true,
    })
      .then((res) => {
        if (res.status === 404 || res.status === 405) unsupported = true;
      })
      .catch(() => undefined);
  } catch {
    // measuring must never break the shop
  }
}

export function WebVitalsReporter() {
  const pathname = usePathname() ?? "/";
  const state = useRef<{ on: boolean; page: RumPage; vitals: Numbers; meter: ReturnType<typeof createScrollMeter> | null } | null>(null);

  useEffect(() => {
    let on = false;
    try {
      on = !asksNotToTrack() && Math.random() * 100 < motionSettings().rumPercent;
    } catch {
      on = false;
    }
    if (!on) return;
    const meter = createScrollMeter(() => motionStats.hz);
    // The 3D scenes' frames measured since the last report (none when no scene ran on the page).
    const s = { on, page: pageKind(window.location.pathname), vitals: {} as Numbers, meter, windows: motionStats.windows, frameMsTotal: motionStats.frameMsTotal };
    state.current = s;
    const keep = (metric: Metric) => {
      const key = NAMES[metric.name];
      if (key) s.vitals[key] = Math.round(metric.value * (key === "cls" ? 1000 : 1)) / (key === "cls" ? 1000 : 1);
    };
    onCLS(keep);
    onINP(keep);
    onLCP(keep);
    onFCP(keep);
    onTTFB(keep);
    meter.start();
    /** The page's report: its load numbers (once), and what was measured since the last report. */
    const report = () => {
      const m: Numbers = { ...s.vitals, ...(meter.take() ?? {}) };
      const windows = motionStats.windows - s.windows;
      const frameMs = windows > 0 ? (motionStats.frameMsTotal - s.frameMsTotal) / windows : 0;
      if (frameMs > 0) m.sceneFps = Math.round((1000 / frameMs) * 10) / 10;
      s.vitals = {};
      s.windows = motionStats.windows;
      s.frameMsTotal = motionStats.frameMsTotal;
      send(s.page, m);
    };
    // web-vitals hands over the last numbers in its own listeners for the same events
    // (some added later, after the first paint): send once they've all run. Leaving
    // fires both "pagehide" and "hidden"; a number comes in one of them only, and
    // the other has nothing new and sends nothing.
    let queued = false;
    const soon = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        report();
      });
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") soon();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", soon);
    (s as typeof s & { report?: () => void }).report = report;
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", soon);
      meter.stop();
    };
  }, []);

  // Moving to another page inside the shop: the last page's report goes, the new page starts.
  useEffect(() => {
    const s = state.current as (typeof state.current & { report?: () => void }) | null;
    if (!s?.on) return;
    const next = pageKind(pathname);
    if (next === s.page) return;
    s.report?.();
    s.page = next;
  }, [pathname]);

  return null;
}
