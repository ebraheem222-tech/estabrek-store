/**
 * Real shoppers' speed (the backend's lib/rum.ts adds it up; admin → مراقبة السرعة
 * والأولوية → تجربة الزباين). A page view is described only by its kind (home,
 * product…), the device kind and the system: no address, no browser string, no
 * cookie. Pure helpers plus the scroll meter; WebVitalsReporter sends the report.
 */

export type RumPage = "home" | "shop" | "product" | "category" | "search" | "cart" | "checkout" | "account" | "order" | "page" | "other";
export type RumDevice = "phone" | "tablet" | "desktop";
export type RumOs = "android" | "ios" | "windows" | "mac" | "linux" | "other";

const PAGES: Array<[RegExp, RumPage]> = [
  [/^\/$/, "home"],
  [/^\/shop(\/|$)/, "shop"],
  [/^\/p\//, "product"],
  [/^\/c\//, "category"],
  [/^\/search(\/|$)/, "search"],
  [/^\/cart(\/|$)/, "cart"],
  [/^\/checkout(\/|$)/, "checkout"],
  [/^\/account(\/|$)/, "account"],
  [/^\/order(\/|$)/, "order"],
  [/^\/(about|contact|policies|wishlist|request|stock-alert)(\/|$)/, "page"],
];

export function pageKind(pathname: string): RumPage {
  const p = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  for (const [re, kind] of PAGES) if (re.test(p)) return kind;
  // A page from the admin's page builder (/[...slug]) or anything else on one level.
  return /^\/[^/]+$/.test(p) ? "page" : "other";
}

export function osKind(userAgent: string, touchPoints = 0): RumOs {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && touchPoints > 1)) return "ios";
  if (/windows/i.test(userAgent)) return "windows";
  if (/mac os x|macintosh/i.test(userAgent)) return "mac";
  if (/linux|cros/i.test(userAgent)) return "linux";
  return "other";
}

export function deviceKind(coarse: boolean, shortSide: number): RumDevice {
  if (!coarse) return "desktop";
  return shortSide < 600 ? "phone" : "tablet";
}

/**
 * Frames a second while the shopper scrolls, and how many frames came late
 * (more than 1.65 × the screen's frame time, like the motion budget's "late").
 * Only counts while scrolling (until 300 ms after the last scroll).
 */
export function createScrollMeter(hz: () => number) {
  let frames = 0;
  let time = 0;
  let late = 0;
  let last = 0;
  let lastScroll = 0;
  let raf = 0;
  const tick = (t: number) => {
    if (last) {
      const gap = t - last;
      // A hidden tab or a debugger pause is not a slow frame.
      if (gap > 0 && gap < 250) {
        frames += 1;
        time += gap;
        if (gap > (1000 / Math.max(30, hz() || 60)) * 1.65) late += 1;
      }
    }
    last = t;
    if (t - lastScroll < 300) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      last = 0;
    }
  };
  const onScroll = () => {
    lastScroll = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
  };
  return {
    start() {
      window.addEventListener("scroll", onScroll, { passive: true });
    },
    stop() {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    /** What was measured since the last time (null when the shopper hardly scrolled). */
    take(): { scrollFps: number; slowFrames: number } | null {
      const out = frames >= 30 && time > 0 ? { scrollFps: Math.round((frames * 10_000) / time) / 10, slowFrames: Math.round((late / frames) * 1000) / 10 } : null;
      frames = 0;
      time = 0;
      late = 0;
      return out;
    },
  };
}
