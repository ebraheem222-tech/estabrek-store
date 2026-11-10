"use client";
import { useEffect } from "react";

/**
 * Page states the CSS reads from <html> (cinematic.css, rose-showcase.css, rose-wonders.css): a layer that
 * covers the page is open, the small bag is open, a page with no "you viewed" note, the note showing, the
 * maintenance screen, the shop. They used to be :has() rules on <html>: some phone browsers don't know :has(),
 * so the helpers stayed over open drawers there, and an attribute inside :has() on <html> makes Chrome
 * restyle the whole page whenever anything is added anywhere.
 */
const STATES: Array<[key: string, selector: string]> = [
  ["uiCover", ".quick-add-layer, .size-guide-dialog.is-open, .rose-viewer, .rose-sheet-layer"],
  ["uiBag", ".rose-minibag[data-open]"],
  ["uiNoRecent", ".rose-product-page, .rose-cart-page, .rose-search-page"],
  ["uiRecent", '.rose-recent[aria-hidden="false"]'],
  ["uiMaint", ".rose-maint"],
  ["uiShop", ".rose-shop"],
];

/** The helpers that stand in the bottom row on a phone (Razan, her WhatsApp button, accessibility, chat). */
const ROW = ".rose-companion-figure, .rose-companion-mini, .rose-companion-wa, .whatsapp-floating-btn, .a11y-fab, .chat-widget-root > button";

/*
 * The floating helpers' dock (rose-wonders.css, "the dock"). On a phone the bottom of the screen holds Razan
 * and WhatsApp on one side and the accessibility button on the other; this measures that row and tells the CSS
 * where the free lane between them is (--dock-left, --dock-right) and how tall the row is (--dock-lift), so the
 * story pill stays in the lane, the "you viewed" note shows above the row (and above Razan's speech bubble while
 * she speaks: --dock-clear), and scene controls sit above it:
 * nothing floating covers anything else. It also keeps the page states above up to date.
 */
export function FloatingDock() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const set = (name: string, value: string | null) => {
      if (value === null) { if (root.style.getPropertyValue(name)) root.style.removeProperty(name); }
      else if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    };
    const measure = () => {
      if (window.innerWidth > 760 || root.dataset.uiCover || root.dataset.uiBag) return;
      const w = window.innerWidth, h = window.innerHeight;
      let left = 12, right = 12, top = h;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(ROW))) {
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom < h - 160 || r.top > h) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) continue;
        if (r.left + r.width / 2 < w / 2) left = Math.max(left, r.right + 8);
        else right = Math.max(right, w - r.left + 8);
        top = Math.min(top, r.top);
      }
      set("--dock-left", `${Math.round(left)}px`);
      set("--dock-right", `${Math.round(right)}px`);
      set("--dock-lift", `${Math.round(Math.max(64, h - top))}px`);
      // Above the row and Razan's speech bubble while she speaks: where the "you viewed" note may show.
      const said = document.querySelector<HTMLElement>('.rose-companion .rose-mascot-bubble[data-show="true"]')?.getBoundingClientRect();
      const clear = said && said.width && said.bottom > h - 260 ? Math.min(top, said.top) : top;
      set("--dock-clear", `${Math.round(Math.max(64, h - clear))}px`);
    };
    const check = () => {
      raf = 0;
      for (const [key, selector] of STATES) {
        const on = Boolean(document.querySelector(selector));
        if (on !== (root.dataset[key] === "true")) {
          if (on) root.dataset[key] = "true";
          else delete root.dataset[key];
        }
      }
      measure();
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    // Layers open and close by being added or by a class or attribute; the scroll scenes' style writes don't count.
    const watch = new MutationObserver(schedule);
    watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-open", "data-show", "aria-hidden"] });
    window.addEventListener("resize", schedule);
    // Razan moves now and then (her walks, a scene's own spot for her): measure again from time to time.
    const tick = window.setInterval(schedule, 1500);
    check();
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      window.removeEventListener("resize", schedule);
      window.clearInterval(tick);
      for (const [key] of STATES) delete root.dataset[key];
      ["--dock-left", "--dock-right", "--dock-lift", "--dock-clear"].forEach((name) => root.style.removeProperty(name));
    };
  }, []);
  return null;
}
